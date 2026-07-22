# 2 Requirements

## References
* `/home/racoci/Projects/racoci/documentation/01-architecture-and-vision/01-03-stage-0-kernel.md`
* `/home/racoci/Projects/racoci/documentation/implementation/0-Micro-Kernel.md`

## Instructions
Formally detail and document the locked requirements of the Stage 0 Kernel. Present this information objectively, using clear headers and structured tables.

Your writing must include:
1. **Functional Requirements (FRs):** Include a comprehensive table or bulleted specification detailing the core functional capabilities of Stage 0:
   - **FR-1: Core Primitives Management:** Allocation, indexing, and traversal of Atoms, Adjacencies, and Membranes.
   - **FR-2: Double Pushout (DPO) Rewrite Engine:** Implementing Category-Theoretic DPO algebraic rewriting ($L \xleftarrow{l} K \xrightarrow{r} R$) with identification and dangling edge validation.
   - **FR-3: Absolute Identity Interning ($H_{id}$):** Multi-dimensional hash vector calculation with Weisfeiler-Lehman (WL) canonical labeling and child hash sorting to achieve $O(1)$ interning and deduplication.
   - **FR-4: Non-Well-Founded Self-Reference (Spin -1):** Processing membranes with non-orientable topological spin and coinductive Greatest Fixed Point (GFP) termination to handle cyclic structures in finite memory.
   - **FR-5: Time-Travel Reversibility (`sys::residue`):** Automatic capture of eliminated subgraphs in attached ghost residue membranes for zero-entropy reversibility.
2. **Non-Functional Requirements (NFRs):** Include a formal specification of the technical constraints and performance criteria:
   - **NFR-1: Ultra-Low Compaction/Binary Size:** Absolute target compiled size of ~15 KB, requiring zero standard library dependency (`no_std` in Rust) and minimal surface area.
   - **NFR-2: Cache Locality and Memory Efficiency:** Minimizing pointer-chasing and cache misses via flat, contiguous memory layout (Arena Allocator).
   - **NFR-3: Maximized Parallelizability and Concurrency:** State transformations and interning tables must support high-throughput concurrent operations without global read/write locks.
   - **NFR-4: Deterministic Reclamation:** Memory reclamation must run without non-deterministic stop-the-world pauses.
3. **Open-to-Exploration Dimensions:** List and define the 4 critical design dimensions under investigation in the exploration tree (Arena Layout, Identity Hashing, Memory Reclamation, and Concurrency Models).
