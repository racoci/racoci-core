# 3 Exploration

To systematically evaluate the architectural solution space of the Holds Stage 0 Kernel without premature optimization bias, we model our analysis as a level-by-level Breadth-First Search (BFS) exploration tree. This method maps high-level paradigms at the root, descending through mitigations, trade-offs, and granular leaf-node implementation details.

## 3.1 The Visual BFS Tree

The following ASCII diagram maps the multi-dimensional solution space across 7 hierarchical levels:

```text
Level 1: Core Decisions
=======================
                              [ Stage 0 Kernel Paradigm ]
                                     /             \
                                    /               \
                       [ Path A: Managed Rust-Wasm ]  [ Path B: Raw Direct-Wasm ]

Level 2: Risk/Cost Mitigations
==============================
                       [ Path A Bloat & Latency ]    [ Path B Complexity & Safety ]
                                   |                             |
                       +-- no_std Compilation            +-- Safe Encapsulated Wrappers
                       +-- LTO, lol_alloc                +-- Rust Compile-Time Invariants
                       +-- Contiguous Index Flattening   +-- Fuzz-Testing Assertions

Level 3: Trade-Off Isolation
=============================
                [ Identity Hashing ]     [ Memory Reclamation ]     [ Concurrency Sync ]
                    /    |     \               /        \                /         \
              BLAKE3  Murmur3  Hybrid    Epoch Comp.  Ref. Counting    CAS OCC    CRDT Merge

Levels 4-7: Leaf-Node Details
==============================
               Level 4: Lock-Free Interning (Robin Hood Table, CAS-Array Index Table)
               Level 5: WebAssembly Atomic Instruction Scaling (wasm32-atomics, shared memory)
               Level 6: Non-Well-Founded Hashing (Coinductive GFP on Spin -1 boundaries)
               Level 7: P2P Partitioning (Merkle Mountain Range delta-sync, provenance)
```

## 3.2 BFS Logical Flow Explanation

The hierarchy of the exploration tree isolates distinct engineering choices, ensuring independent trade-offs are not conflated:

* **Level 1 (Core Decisions):** Establishes the foundational execution paradigm. We compare high-level Rust abstractions (Path A) against low-level, direct WebAssembly linear memory manipulation (Path B).
* **Level 2 (Risk/Cost Mitigations):** Identifies the risks inherent in the Level 1 choices (e.g., binary bloat in Path A, memory unsafety in Path B) and maps concrete, orthogonal mitigation techniques to address them.
* **Level 3 (Trade-off Isolation):** Compares independent, architectural choices that can be plugged into either Path A or Path B. This decouples the hashing algorithm, garbage collection strategy, and concurrency synchronization models from the core memory layout.
* **Levels 4 to 7 (Leaf-Node Details):** Deep-dives into the specific low-level data structures, CPU/Wasm assembly-level instructions, mathematical fixed-point limits, and networking protocols required to fulfill the edge constraints of the substrate.

By navigating this tree layer-by-layer, the reader can evaluate the impact of combining different structural strategies on code size, performance, and complexity.
