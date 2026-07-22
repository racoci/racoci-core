# 4 Comparison

To provide a complete engineering synthesis of our findings, we construct a multi-dimensional comparison matrix of the primary architectural configurations and perform a strict code-size/complexity budget audit against our functional and non-functional requirements.

## 4.1 Comprehensive Multi-Dimensional Comparison Matrix

We compare three distinct architectural configurations assembled from our exploration tree:
* **Configuration 1 (Managed High-Safety):** Managed Rust-Wasm + BLAKE3 Hashing + Epoch-Based Compaction + CAS Global OCC.
* **Configuration 2 (Balanced Performance):** Raw Direct-Wasm + Hybrid Multi-Tier Hashing + Epoch-Based Compaction + CAS Global OCC.
* **Configuration 3 (Compact Low-Latency):** Raw Direct-Wasm + Fast Hashing (xxHash) + Localized Reference Counting + Lock-Free Array Sync.

### Requirements Verification Matrix
| Requirement | Configuration 1 | Configuration 2 (Balanced) | Configuration 3 |
| --- | --- | --- | --- |
| **FR-1: Primitives** | Fully Compliant (Safe Vectors) | **Fully Compliant (Contiguous Bytes)** | Fully Compliant (Contiguous Bytes) |
| **FR-2: DPO Engine** | Fully Compliant | **Fully Compliant** | Fully Compliant |
| **FR-3: WL Interning** | Fully Compliant | **Fully Compliant** | Fully Compliant |
| **FR-4: Spin -1 Cycle** | Fully Compliant | **Fully Compliant** | Non-Compliant (RC leaks cycles) |
| **FR-5: Residue Time** | Fully Compliant | **Fully Compliant** | Fully Compliant |
| **NFR-1: Size (~15 KB)** | Poor (typically 50 KB - 120 KB) | **Excellent (~11 KB)** | **Best (~7 KB)** |
| **NFR-2: Locality** | Moderate (Pointer chasing on heap) | **Extreme (Sequential cache lines)** | **Extreme (Sequential cache lines)** |
| **NFR-3: Parallelism** | Moderate (Global OCC retries) | **High (Lock-free bump, fast CAS)** | High (Lock-free bump, immediate RC) |
| **NFR-4: Reclamation** | Good (Deferred epoch compaction) | **Good (Deferred epoch compaction)** | Moderate (Inline RC adds write barrier latency) |

---

## 4.2 Code-Size Budget Audit

To assess the feasibility of hitting our **15 KB compiled size target**, we perform a strict code-size budget audit (predicted footprint in KB) across individual kernel components.

| Component / Runtime Block | Configuration 1 (Managed) | Configuration 2 (Balanced) | Configuration 3 (Compact) |
| --- | --- | --- | --- |
| **Core Rust Runtime / `no_std`** | ~4.0 KB | **~1.5 KB** | ~1.5 KB |
| **Allocator Runtime** | ~2.5 KB (`wee_alloc`) | **0.0 KB (Manual bump-pointer)** | 0.0 KB (Manual bump-pointer) |
| **DPO State Machine & Rewriting** | ~6.5 KB | **~5.5 KB** | ~5.0 KB |
| **Identity Hashing Library** | ~35.0 KB (Rust BLAKE3 crate) | **~3.0 KB (Custom inline xxHash/BLAKE3)** | ~0.5 KB (Custom inline xxHash) |
| **Memory Reclamation / GC** | ~3.0 KB | **~2.0 KB** | ~1.5 KB (Relative atomic counters) |
| **WL Canonizer & Cycle Hashing** | ~5.0 KB | **~4.0 KB** | 0.0 KB (Omitted) |
| **Symbols & Formatting Tables** | ~12.0 KB (Panics stripped) | **0.0 KB (Panics stripped)** | 0.0 KB (Panics stripped) |
| **TOTAL PREDICTED SIZE** | **~68.0 KB** | **~16.0 KB (Near Target)** | **~8.5 KB (Well Under Target)** |

*Audit Finding:* Configuration 3 easily beats the 15 KB target, while Configuration 2 (Balanced) sits right on the edge of the 15 KB target through optimized inline hashing and manual raw-memory bump allocation. Configuration 1 cannot meet the 15 KB constraint due to the compiled dependency sizes of standard Rust crates.

---

## 4.3 Complexity & Engineering Maintenance Audit

* **Configuration 1 (Managed):** Low engineering complexity. Standard Rust type safety guarantees rapid development and continuous compilation safety. Maintenance overhead is minimal.
* **Configuration 2 (Balanced):** Moderate-high complexity. Writing custom byte manipulation, alignment, and inline hashing code requires specialized low-level engineering skills. Extensive test suites, static invariants, and boundary checks are mandatory to prevent silent memory corruption.
* **Configuration 3 (Compact):** Extreme complexity. Managing localized reference counting on raw WebAssembly bytes while avoiding cyclic leaks requires writing manual, error-prone tracing logic. Developer ramp-up time is high.
