# 3.3 Tradeoffs

Once the core memory layout is established, the Stage 0 architecture must address three independent, orthogonal trade-off dimensions: identity hashing, memory reclamation, and concurrency synchronization. These trade-offs operate orthogonally and can be integrated into either Path A or Path B.

## 3.3.1 Dimension 1: Identity Hashing (Performance vs. Distributed Integrity)

Deduplication requires hashing every allocated primitive. We compare three distinct algorithms:

### 1. Option 1.1: Cryptographic BLAKE3 Hashing
BLAKE3 is an ultra-fast, tree-structured cryptographic hash function.
* **Analysis:** Provides absolute security against collision attacks and guarantees a 256-bit globally unique identity ($h_{full}$) for every node and subgraph. This is ideal for decentralized peer-to-peer (P2P) synchronization, as any remote node can verify a subgraph's integrity by re-hashing it.
* **Trade-off:** High CPU overhead. Calculating a BLAKE3 hash on every single node allocation or mutation adds several nanoseconds of latency and requires compiled SIMD assembly, slightly inflating code size.

### 2. Option 1.2: Fast Non-Cryptographic Hashing (xxHash / aHash / Murmur3)
xxHash and aHash are extremely fast, non-cryptographic hash functions optimized for hardware-speed lookup.
* **Analysis:** Latency is sub-nanosecond, and compiled size is negligible (typically under 100 bytes). This maximizes local interning speed, achieving millions of deduplicated allocations per second.
* **Trade-off:** Vulnerable to hash collision attacks (which can be exploited to cause denial-of-service in memory lookups) and lacks the mathematical global uniqueness required for distributed networks.

### 3. Option 1.3: Multi-Tier Hybrid Hashing
A hybrid pipeline that combines local speed with global security.
* **Analysis:** Local in-memory interning and de-duplication are driven by a fast, cheap 64-bit non-cryptographic hash (e.g., xxHash). Cryptographic BLAKE3 hashes are calculated and signed **lazily** only when a sub-hypergraph crosses machine boundaries or is committed to a persistent network shard.
* **Trade-off:** Slightly increases implementation complexity but achieves optimal local throughput and global network compatibility.

---

## 3.3.2 Dimension 2: Memory Reclamation (Compaction vs. Reference Counting)

Because the linear memory arena is immutable, orphaning occurs during state mutations. We evaluate two strategies:

### 1. Option 2.1: Epoch-Based Generational Compaction
Memory is partitioned into generational segments ($E_0, E_1, \dots$). Live nodes are traced and copied (slid) to a new active segment, and the entire old segment is freed in a single system operation.
* **Analysis:** Zero stop-the-world pauses. Concurrency is high as threads pin epochs without lock contention. It guarantees zero memory fragmentation and preserves strict cache-line sequentiality.
* **Trade-off:** Temporarily spikes memory consumption during the copying phase (momentarily doubling the footprint of live nodes).

### 2. Option 2.2: Membrane-Localized Reference Counting
Every membrane and hyperedge maintains a local reference counter. When a counter reaches zero, its bytes are immediately reclaimed.
* **Analysis:** Immediate reclamation, preventing memory spikes. Highly deterministic and uses a minimal, predictable memory footprint.
* **Trade-off:** Introduces atomic reference counting (`Arc`/`atomic.add`) overhead on every single read and write, dragging down multi-threaded performance. Additionally, reference counting fails to resolve circular references in non-well-founded topologies (`Spin = -1` membranes), leading to silent memory leaks unless complex cycle-detection rules are added.

---

## 3.3.3 Dimension 3: Concurrency and Synchronization (Contention vs. Complexity)

We compare optimistic global coordination against parallelized structural domain merges:

### 1. Option 3.1: Atomic Compare-And-Swap (CAS) on Global Root Pointer (OCC)
All state in Holds descends from a single global root pointer.
* **Analysis:** Simple and mathematically elegant. Threads read the state, calculate a rewrite locally, allocate the new nodes at their own bump offsets, and commit by atomically swapping the global root pointer from the old index to the new index using a single CAS CPU instruction.
* **Trade-off:** Prone to high contention and frequent transaction retries under heavy parallel write-heavy workloads.

### 2. Option 3.2: Parallel CRDT-Driven Pushout Merging
Spatially disjoint subgraphs are partitioned and modified in parallel.
* **Analysis:** If two concurrent rewrites target separate membranes, their structural changes are treated as commutative, parallel independent pushouts. The synchronization bus executes a categorical pushout union ($G_1 \sqcup_G G_2$) directly in linear memory, completely avoiding lock contention or retries.
* **Trade-off:** Massive mathematical and implementation complexity, demanding complex boundary-intersection tracing.

---

## 3.3.4 Isolated Trade-Off Comparison Tables

### Hashing Dimension
| Dimension | Option 1.1: BLAKE3 | Option 1.2: xxHash / aHash | Option 1.3: Hybrid |
| --- | --- | --- | --- |
| **Local Write Latency** | Slow (20-50 ns/node) | **Fastest (<1 ns/node)** | Fast (2-3 ns/node) |
| **P2P Collision Safety** | **Absolute (Cryptographic)** | Low (Collision risk) | **Absolute (Lazy Cryptographic)** |
| **Code Size Overhead** | ~4 KB | **<200 Bytes** | ~1 KB |

### Memory Reclamation Dimension
| Dimension | Option 2.1: Epoch Compaction | Option 2.2: Reference Counting |
| --- | --- | --- |
| **Execution Latency** | **Fastest (Lock-free bump, zero inline overhead)** | Slow (Atomic write barrier overhead) |
| **Peak Memory Spike** | High (Spikes during sliding copy) | **Minimal (Immediate release)** |
| **Self-Referential Safety** | **Absolute (Traces clean loops)** | Vulnerable (Cyclic reference leaks) |

### Concurrency Sync Dimension
| Dimension | Option 3.1: CAS OCC | Option 3.2: CRDT Pushout Merge |
| --- | --- | --- |
| **Write Contention** | High (retries under heavy parallel load) | **Strict Zero** (non-blocking parallel execution) |
| **Implementation Size** | **<500 Bytes** | ~8 KB (extremely heavy) |
