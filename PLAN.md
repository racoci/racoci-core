# Holds / RACOCI Project Development Plan

This document tracks what has been accomplished in the Holds environment and maps out the next steps for system bootstrapping, performance optimizations, and distributed sharding.

---

## ✅ What Has Been Accomplished (Done)

### 1. Architectural Research & Technical Report
* **Problem Space Mapping:** Detailed the performance challenges of standard graph models (cache misses, pointer-chasing, metadata inflation).
* **7-Level BFS Exploration Tree:** Mapped core memory designs (Managed Rust-Wasm vs. Raw Direct-Wasm), mitigations, orthogonal trade-offs (identity hashing, reclamation, concurrency), and leaf-node specs.
* **Consolidated Report:** Authoring 9 exhaustive, unbiased chapters consolidated into `/documentation/implementation/holds-micro-kernel-report/final_report.md`.

### 2. Environment Setup & Tooling
* **Toolchain Installation:** Set up Rust, Cargo, and rustup in the environment.
* **Project Scaffolding:** Initialized the `/kernel` Rust library project.
* **Dependencies:** Added and locked the high-performance `blake3` cryptographic hashing library.
* **Source Control Guard (.gitignore):** Added a root-level `.gitignore` file configured for Rust builds, Node.js packages, IDE setups, and OS-specific metadata files.

### 3. Kernel Core Primitives & Interning
* **Topology Engine:** Implemented `Topology` enum representing Atoms, Adjacencies ($n$-ary hyperedges), and Membranes.
* **Flat Memory Arena:** Created `HypergraphArena` representing sequential, contiguous node packaging to guarantee cache locality.
* **Flyweight Identity Engine ($H_{id}$):** Implemented `IdentityEngine` performing absolute, constant-time deduplication with stable child hash sorting.
* **Causal Logging (`sys::residue`):** Implemented residue ghost adjacencies to track state history.

### 4. Advanced Category-Theoretic Validations (DPO)
* **Pattern Matching:** Implemented recursive matching and binding maps.
* **Strict Dangling Edge Validation:** Blocked transformations that would leave outside active references with dangling pointers to deleted nodes.
* **Identification Condition Check:** Verified that merging distinct pattern variables is only permitted if the merged elements belong to interface $K$.

### 5. Testing & Guidelines
* **Project Guidelines (`GEMINI.md`):** Mandated that **no task or feature is concluded without unit and E2E automated tests**.
* **Unit Tests:** Built 6 comprehensive tests inside `kernel/src/lib.rs`.
* **E2E Integration Tests:** Created 2 end-to-end integration tests inside `kernel/tests/integration_tests.rs` simulating algebraic simplification and verifying isomorphic deduplication. All tests pass with **100% success**.

---

## 🚀 Future Stages & Atomic Implementations

To ensure high engineering velocity, absolute code quality, and non-breaking changes, all future work is divided into minimal, implementable, and well-documented atomic features.

---

### 📊 Stage 1: `no_std` & WebAssembly Footprint Optimization
* **Goal:** Compile the kernel without the standard library (`std`) to support direct, low-overhead browser loading and hit the **15 KB** footprint target.

#### Task 1.1: Dependency and Attribute Setup
* **Description:** Update `Cargo.toml` dependencies and add `no_std` conditional compiling attributes to the library root.
* **Implementation Plan:**
  - Configure `blake3` dependency with `default-features = false` in `Cargo.toml`.
  - Add `#![cfg_attr(not(test), no_std)]` to the top of `kernel/src/lib.rs`.
* **Verification & Tests:**
  - **Compilation Test:** Verify the library compiles with `cargo check --target wasm32-unknown-unknown` under release.
  - **Unit Tests:** Run `cargo test` to ensure existing standard testing features do not break under the test profile (which still uses `std`).

#### Task 1.2: Refactor to BTreeMap for Zero-Dependency `no_std`
* **Description:** The standard library `HashMap` relies on the system random-number generator, which is unavailable in raw WebAssembly `no_std` without importing heavy external crates (like `hashbrown` or `rand`). We will refactor our indexing maps to use `BTreeMap` from the `alloc` crate for zero external dependency bloat.
* **Implementation Plan:**
  - Replace `std::collections::HashMap` with `alloc::collections::BTreeMap` inside `lib.rs` under non-test profiles.
  - Since `blake3::Hash` does not implement `Ord` (required by `BTreeMap`), map `intern_pool` to use the byte representation `[u8; 32]` as the key: `BTreeMap<[u8; 32], NodeId>`.
  - Map `BindingMap` to `BTreeMap<String, NodeId>`.
  - Import allocator collections using `extern crate alloc;` at the top of the file under `#[cfg(not(test))]`.
* **Verification & Tests:**
  - **Compilation Test:** Run `cargo check --target wasm32-unknown-unknown`.
  - **Unit Tests:** Run `cargo test` to verify that all 6 existing unit tests pass flawlessly with the new `BTreeMap` backing.
  - **E2E Integration Tests:** Run `cargo test --test integration_tests` to verify end-to-end rewrite matches.

---

### 🧬 Stage 2: Weisfeiler-Lehman (WL) Canonizer (Stage 2)
* **Goal:** Enable global topological isomorphism matching across nested groupings and membranes.

#### Task 2.1: $k$-Hop Color Refinement Loop
* **Description:** Implement an iterative color refinement loop in the `IdentityEngine` to assign stable topological signatures to every node based on its neighbors.
* **Verification & Tests:**
  - **Unit Test:** Create `test_wl_color_refinement_isomorphism` verifying that isomorphic but structurally rotated graphs receive identical signatures.

#### Task 2.2: Coinductive Greatest Fixed Point (GFP) Cycle Termination
* **Description:** Enforce strict Greatest Fixed Point (GFP) termination when the color refinement engine encounters a grouping boundary with `Spin = -1` (Klein Bottle topology), avoiding infinite recursions.
* **Verification & Tests:**
  - **Unit Test:** Create `test_gfp_cycle_termination` asserting that circular and self-referential graph loops hash and terminate in $O(1)$ space without stack overflow.
  - **E2E Integration Test:** Verify that quines and self-containing compiler scopes compile and run deterministically.

---

### 🔤 Stage 3: AST-Free H-Cypher Parser (Stage 4)
* **Goal:** Direct text-to-graph parsing.

#### Task 3.1: Syntax-to-Topology Layout Mapping
* **Description:** Design parsing rules converting text syntax into raw topological structures (whitespace juxtaposition, scoping boundaries).
* **Verification & Tests:**
  - **Unit Test:** Verify text input like `"a b c"` parses into a quaternary `Adjacency`.

#### Task 3.2: Parsing via Recursive DPO Rewriting
* **Description:** Implement the parsing engine as a sequence of DPO rewrite rules that progressively simplify character token arrays.
* **Verification & Tests:**
  - **E2E Integration Test:** Parse a complex H-Cypher script directly into the memory arena and verify isomorphic equivalence with a pre-built reference graph.

---

### 🔒 Stage 4: High-Performance Concurrent Interning
* **Goal:** Lock-free concurrent interning writes.

#### Task 4.1: Lock-Free Hash Table
* **Description:** Implement a Lock-Free Concurrent Robin Hood Hash Table utilizing atomic CAS pointer increments.
* **Verification & Tests:**
  - **Unit Test:** Spawn 100 concurrent threads executing parallel writes to the interning pool and assert no duplicate NodeIds are created.

---

### 🧵 Stage 5: WebAssembly Atomics and Worker Scaling
* **Goal:** Multi-core parallel execution inside WebAssembly.

#### Task 5.1: `wasm32-atomic` Synchronization
* **Description:** Leverage `wasm32-atomic` instruction sets over SharedArrayBuffers to synchronize parallel worker threads.
* **Verification & Tests:**
  - **Compilation Test:** Verify compilation under the WebAssembly target with atomic features enabled.
  - **E2E Integration Test:** Assert non-blocking operations on parallel thread pools with zero lock contention.

---

### 🌐 Stage 6: P2P Membrane Partitioning & Sync
* **Goal:** Decentralized, internet-scale replication.

#### Task 6.1: Membrane Sharding & MMR delta-sync
* **Description:** Implement boundary sharding along membranes and MMR delta search transport.
* **Verification & Tests:**
  - **E2E Integration Test:** Sync two distributed peer instances, verifying that only the differential subgraph ($\Delta H$) is streamed and ingested.
