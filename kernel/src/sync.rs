//! Lock-Free, Wait-Free Single-Producer Multi-Consumer (SPMC) Ring Buffer Queue.
//!
//! This module implements the Universal State Synchronization Bus for the Holds micro-kernel,
//! facilitating multi-core parallel execution inside WebAssembly without standard library locks.

use alloc::vec::Vec;
use core::cell::UnsafeCell;
use core::sync::atomic::{AtomicUsize, Ordering};

/// Compact, fixed-size event representing a differential state change in a Membrane.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct DeltaEvent {
    /// Timestamp of the event, typically in microseconds or logical ticks.
    pub timestamp: u64,
    /// The NodeId of the target membrane undergoing transformation.
    pub target_membrane: u32,
    /// Pre-transformation root hash.
    pub old_hash: [u8; 32],
    /// Post-transformation root hash.
    pub new_hash: [u8; 32],
    /// Size differential or memory offset diff of the membrane's arena segment.
    pub offset_diff: u32,
}

/// A lock-free, wait-free Single-Producer Multi-Consumer (SPMC) Ring Buffer Queue.
///
/// Designed strictly with `core::sync::atomic` primitives for full compatibility with
/// `no_std` environments and WebAssembly's `wasm32-atomic` target feature.
pub struct AtomicRingBuffer {
    /// Fixed-size internal buffer using interior mutability.
    buffer: Vec<UnsafeCell<DeltaEvent>>,
    /// Fixed slot capacity of the buffer.
    capacity: usize,
    /// Monotonically increasing atomic read head pointer.
    head: AtomicUsize,
    /// Monotonically increasing atomic write tail pointer.
    tail: AtomicUsize,
}

// Explicitly implement Send and Sync to allow sharing between worker threads.
unsafe impl Send for AtomicRingBuffer {}
unsafe impl Sync for AtomicRingBuffer {}

impl AtomicRingBuffer {
    /// Instantiates a new lock-free ring buffer with the specified slot capacity.
    ///
    /// # Panics
    ///
    /// Panics if `capacity` is 0.
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "Capacity must be greater than zero");
        let mut buffer = Vec::with_capacity(capacity);
        for _ in 0..capacity {
            buffer.push(UnsafeCell::new(DeltaEvent::default()));
        }
        Self {
            buffer,
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        }
    }

    /// Enqueues a `DeltaEvent` into the ring buffer.
    ///
    /// This method is wait-free and guarantees completion in finite steps.
    /// Returns `Ok(())` on success, or `Err("Queue is full")` if there are no free slots.
    pub fn enqueue(&self, event: DeltaEvent) -> Result<(), &'static str> {
        let tail = self.tail.load(Ordering::Relaxed);
        let head = self.head.load(Ordering::Acquire);

        if tail - head >= self.capacity {
            return Err("Queue is full");
        }

        // Safety: Since this is an SPMC (Single Producer) queue, there is only ever one thread
        // executing `enqueue` at a given time. Thus, the writer thread has exclusive ownership
        // over the slot at `tail`. Any reader/consumer must see `tail` advance past this slot
        // before attempting to access it, ensuring mutual exclusion.
        unsafe {
            let slot = self.buffer[tail % self.capacity].get();
            *slot = event;
        }

        // Increment the tail pointer. `Release` ordering guarantees that the event write
        // happens-before the updated `tail` index is made visible to concurrent readers.
        self.tail.store(tail + 1, Ordering::Release);

        Ok(())
    }

    /// Dequeues a `DeltaEvent` from the head of the ring buffer.
    ///
    /// This method is lock-free, utilizing a CAS (compare-and-swap) retry loop
    /// to resolve contention when multiple consumers attempt to dequeue concurrently.
    /// Returns `Some(DeltaEvent)` if successful, or `None` if the queue is empty.
    pub fn dequeue(&self) -> Option<DeltaEvent> {
        loop {
            let head = self.head.load(Ordering::Acquire);
            let tail = self.tail.load(Ordering::Acquire);

            if head == tail {
                // Buffer is empty.
                return None;
            }

            // Read the event at `head`.
            // Safety: If `head` remains unchanged when we execute `compare_exchange`,
            // then we know that no other thread has dequeued this item, and the producer
            // could not have overwritten it since `tail - head < capacity`.
            let event = unsafe { *self.buffer[head % self.capacity].get() };

            // Attempt to advance the head pointer atomically.
            // `SeqCst` ordering guarantees a total synchronization order, preventing
            // CPU and compiler reordering of the slot read with the pointer modification.
            match self
                .head
                .compare_exchange(head, head + 1, Ordering::SeqCst, Ordering::Acquire)
            {
                Ok(_) => return Some(event),
                Err(_) => continue, // A concurrent reader won the CAS; retry.
            }
        }
    }

    /// Returns the number of elements currently in the queue.
    pub fn len(&self) -> usize {
        let head = self.head.load(Ordering::Acquire);
        let tail = self.tail.load(Ordering::Acquire);
        tail.saturating_sub(head)
    }

    /// Checks if the queue is empty.
    pub fn is_empty(&self) -> bool {
        self.head.load(Ordering::Acquire) == self.tail.load(Ordering::Acquire)
    }

    /// Returns the capacity of the queue.
    pub fn capacity(&self) -> usize {
        self.capacity
    }
}
