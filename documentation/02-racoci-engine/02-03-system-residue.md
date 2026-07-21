# 02-03: System Residue and Information Preservation

[cite_start]In the Holds computational environment, information is never destructively overwritten or permanently deleted[cite: 2557, 2848]. [cite_start]To satisfy the groupoid axiom—which requires every state transition $L \implies R$ to possess a computable inverse $R \implies L$—the engine employs a mechanism known as **System Residue** (`sys::residue`)[cite: 2521, 2523, 2621].

## 1. Information-Preserving vs. Lossy Rewrites

When executing a structural rewrite $L \implies R$ over a hypergraph, the R.A.C.O.C.I. engine classifies the rule into one of two operational categories:

* **Information-Preserving Rules ($L \subset R$):** The right-hand side strictly expands or retains the topological components of the left-hand side. The inverse operation requires no extra structural data to execute, as no subgraphs were removed.
* [cite_start]**Lossy Rules ($L \not\subset R$):** The rule collapses, reduces, or eliminates existing subgraphs (e.g., evaluating an algebraic expression like `add x 0 => x` or collapsing redundant database schemas)[cite: 2525, 2686].

## 2. Automatic Injection of `sys::residue`

[cite_start]When a lossy rewrite is committed, the engine intercepts the deletion phase[cite: 2525, 2560]. [cite_start]Instead of purging the discarded nodes or adjacencies from the memory arena, the engine wraps the eliminated subgraph inside a specialized structural boundary tagged with `sys::residue`[cite: 2526, 2560].

[cite_start]This `sys::residue` node is attached directly to the newly produced output node $R$[cite: 2526, 2560].

```text
  [ Left-Hand Side (L) ]                      [ Right-Hand Side (R) ]
 (add) --- (x)                                          (x)
   |                                                     |
  (0)   ================ ( Rewrite ) ===============>    | [sys::residue]
                                                         +--> { (add) --- ([]) }
                                                                             |
                                                                            (0)

```

## 3. Structural Reversibility and Time-Travel

Because the eliminated subgraph remains physically anchored to the output via the `sys::residue` link, the inverse transformation $R \implies L$ is always deterministic:

1. The engine reads the target node $R$ and detects the attached `sys::residue` adjacency.


2. It expands the ghost subgraph stored within `sys::residue`.


3. It reconnects the original adjacencies and restores the prior topology $L$ without relying on state snapshots or external undo logs.



This provides native, infinite time-travel and time-series auditing across all hypergraph transformations.

## 4. Lazy Evaluation and Memory Economy

To prevent system residues from inflating memory footprints, Holds enforces strict storage economy:

* 
**Phantom References:** Residues are stored in the memory arena using flat index pointers, reusing unchanged sub-nodes via $O(1)$ structural deduplication.


* 
**Projectional Masking:** The `sys::residue` metadata is completely filtered out of standard views (such as the `Structure Projection`). It remains invisible to standard runtime queries and is only materialized when navigating via the `Temporal Projection` or `Audit Projection`.


* 
**Deferred Resolution:** The engine computes differential residue trees lazily at the exact instant a lossy rewrite is executed.



```