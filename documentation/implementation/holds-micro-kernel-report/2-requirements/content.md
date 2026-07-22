# 2 Requirements

The architectural selection for the Holds Stage 0 Kernel is governed by a strict set of locked-in requirements. These specifications define the functional capabilities, technical constraints, and performance boundaries that any viable implementation must satisfy.

## 2.1 Functional Requirements (FRs)

The functional requirements mandate the computational and topological capabilities that must be supported natively inside the Stage 0 linear memory.

| Req ID | Title | Description | Verification Metric |
| --- | --- | --- | --- |
| **FR-1** | **Core Primitives Handling** | Allocation, indexing, and traversal of Atoms ($\alpha$), Adjacencies ($\mathcal{E}$), and Membranes ($\mathcal{M}$). | Verified by allocating and traversing a 100-node nested hypergraph. |
| **FR-2** | **Double Pushout (DPO) Engine** | Execution of category-theoretic DPO rewrites ($L \xleftarrow{l} K \xrightarrow{r} R$) with strict identification and dangling edge checks. | Execution of a reductive rewrite must validate that no dangling edges remain. |
| **FR-3** | **Absolute Identity Interning** | Single-point structural interning of identical subgraphs using Weisfeiler-Lehman (WL) canonical color sorting to calculate $H_{id}$. | Duplicate allocations of isomorphic shapes must resolve to the same $I_{arena}$ pointer in $O(1)$. |
| **FR-4** | **Non-Well-Founded Self-Reference** | Processing grouping membranes with `Spin = -1` (non-orientable topology) and coinductive Greatest Fixed Point (GFP) termination. | Self-referential graph loops must hash and evaluate in $O(1)$ space without stack overflow. |
| **FR-5** | **Time-Travel Reversibility** | Automatic capture of eliminated subgraphs during lossy rewrites into `sys::residue` ghost membranes. | Verified by applying the inverse morphism $f^{-1}$ to perfectly reconstruct the prior state. |

## 2.2 Non-Functional Requirements (NFRs)

The non-functional requirements define the performance boundaries, footprint limits, and concurrency constraints of the Stage 0 execution loop.

| Req ID | Title | Constraint Criteria | Target Metric |
| --- | --- | --- | --- |
| **NFR-1** | **Ultra-Low Compaction/Binary Size** | Minimal compiled footprint, zero high-level dependencies, no standard library features (`no_std` in Rust). | **~15 KB** total compiled Wasm module or native binary size. |
| **NFR-2** | **Cache Locality and Memory Efficiency** | Data-oriented design utilizing flat, contiguous byte layouts to maximize cache-line utilization and prevent pointer chasing. | Zero pointer-chasing operations; average allocation latency under **20 ns** per node. |
| **NFR-3** | **Maximized Parallelizability** | High-throughput concurrent operations on the interning table and memory arena without global reader/writer locks. | Linear thread scaling; lock-free atomic root mutations via Compare-And-Swap (CAS). |
| **NFR-4** | **Deterministic Reclamation** | Memory reclamation and arena compaction must execute without non-deterministic stop-the-world pauses. | Compaction pauses bounded under **1 ms** or deferred to background epochs. |

## 2.3 Open-to-Exploration Dimensions

Our architectural investigation explores four key dimensions where multiple engineering pathways exist to fulfill the requirements:

```text
       [ Open Dimensions ]
               |
               +---> Dimension A: Memory Arena Layout (Managed Rust-Wasm vs. Raw Direct-Wasm)
               |
               +---> Dimension B: Identity Hashing (BLAKE3 vs. Murmur3 vs. Multi-Tier Hybrid)
               |
               +---> Dimension C: Memory Reclamation (Epoch-Based Compaction vs. Local Reference Counting)
               |
               +---> Dimension D: Concurrency Models (CAS Global OCC vs. Parallel CRDT Pushouts)
```

Each dimension is analyzed level-by-level in the subsequent exploration chapters.
