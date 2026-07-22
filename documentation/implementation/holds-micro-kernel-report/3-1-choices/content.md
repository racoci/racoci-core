# 3.1 Choices

At the root of the Stage 0 solution space lies the choice of the primary execution paradigm. We compare two distinct approaches: compiling managed Rust abstractions to WebAssembly (Path A) versus using Rust as a strict byte-level code generator that interacts directly with raw Wasm linear memory slices (Path B).

## 3.1.1 Path A: Managed Rust-Wasm Paradigm

The Managed Rust-Wasm paradigm utilizes Rust's expressive, standard language features to model the hypergraph's topology and manage execution.

### 1. Structural Analysis
In Path A, the four primitives are defined using high-level Rust representations:
```rust
pub type NodeId = u32;

pub enum Topology {
    Atom(Vec<u8>),
    Adjacency(Vec<NodeId>),
    Membrane(Vec<NodeId>),
}
```
The memory arena is managed via a standard Rust vector (`Vec<Topology>`). The allocation of new nodes is handled by Rust's standard allocator interfaces (such as the default `dlmalloc` allocator compiled into the Wasm target, or a custom tiny allocator like `wee_alloc`). The system relies on Rust's compiler-enforced borrowing and lifetime rules to track references, and delegates byte serialization to high-level framework wrappers.

### 2. Advantages & Disadvantages
* **Advantages:** Absolute compile-time memory safety. Developer velocity is high because standard debuggers, logging, and Rust unit-testing tools are fully compatible. Complex features like DPO rewrite validation can be written using idiomatic, readable Rust code.
* **Disadvantages:** The binary size target of ~15 KB is exceptionally difficult to hit. Rust vectors carry metadata overhead (pointer, capacity, length), and the allocator runtime introduces several kilobytes of bloat. Furthermore, representing the graph as an array of enums introduces pointer chasing, as the vectors inside `Topology::Atom` and `Topology::Adjacency` are allocated on separate heap locations, causing CPU cache misses during deep traversals.

---

## 3.1.2 Path B: Raw Direct-Wasm Linear Memory Paradigm

The Raw Direct-Wasm paradigm treats WebAssembly linear memory as a flat, raw byte array. Rust is used purely as a low-level compiler to generate atomic byte operations.

### 1. Structural Analysis
In Path B, standard abstractions are abandoned. The memory arena is mapped as a contiguous raw byte slice inside Wasm memory. All nodes, hyperedges, and membranes are packed and written as raw, variable-length byte streams starting at a base pointer.

Each node is assigned a flat 32-bit offset pointer ($I_{arena}$) representing its relative byte offset from the arena base:
```rust
// Layout of an Atom Node in WebAssembly Linear Memory:
// [ 2 Bits: Entity Type (00 = Atom) ] [ 3 Bits: LoD Slice ] [ 27 Bits: Data Length (L) ]
// [ L Bytes: Raw Byte Payload ]
// [ 4-Byte Boundary Alignment Padding ]
```
Allocation is performed via a custom, monotonic bump-pointer written directly in Rust, bypassing standard allocators completely:
```rust
static mut BUMP_POINTER: u32 = 0;

#[inline(always)]
pub unsafe fn allocate_raw(bytes: u32) -> u32 {
    let aligned_bytes = (bytes + 3) & !3; // Force 4-byte alignment
    let current = BUMP_POINTER;
    BUMP_POINTER += aligned_bytes;
    current
}
```

### 2. Advantages & Disadvantages
* **Advantages:** Maximum execution speed and absolute cache-line locality. Since all data is packed sequentially in a flat byte slice, traversing adjacent nodes utilizes contiguous memory reads, completely eliminating pointer chasing. Hitting the ~15 KB compiled size limit is trivial, as there is zero allocator bloat, zero vector metadata, and no standard library overhead. Serialization is zero-copy—the entire arena can be copied directly via a single `memcpy` system call or transmitted as-is over a network socket.
* **Disadvantages:** High implementation complexity. Standard compiler safety checks are lost. A single off-by-one error in calculating relative byte offsets can result in silent memory corruption, buffer overflows, or alignment faults. Developers must write manual byte-packing, unpacking, and traversal code.

---

## 3.1.3 Comparative Evaluation Matrix

| Dimension | Path A: Managed Rust-Wasm | Path B: Raw Direct-Wasm |
| --- | --- | --- |
| **Compiled Binary Code Size** | High Bloat (typically 40 KB – 150 KB) | Extremely Compact (**~8 KB – 12 KB**) |
| **Cache Miss Frequency** | Moderate to High (vector heap dispersion) | **Strict Zero** (sequential contiguous bytes) |
| **Development Complexity** | Low (idiomatic, safe Rust) | High (manual byte-packing & pointer arithmetic) |
| **Runtime Boundary Safety** | High (compiler-enforced safe borrows) | Unsafe (relies on manual boundary assertions) |
| **Network Serialization Cost** | High (requires serialization pass) | **Zero-Copy** (direct binary copy) |
| **Allocation Complexity** | $O(\log N)$ or variable allocator speed | **Strict $O(1)$ lock-free bump allocation** |
