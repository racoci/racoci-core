# 2.3: System Residue and Information Preservation

In the Holds computational environment, information is never destructively overwritten or permanently purged. To satisfy the fundamental groupoid axiom—which requires every state transition $L \implies R$ to possess a mathematically computable inverse $R \implies L$—the R.A.C.O.C.I. engine employs an inline structural isolation mechanism known as **System Residue** (`sys::residue`).

---

## 2.3.1: Information-Preserving vs. Lossy Rewrites

When executing a structural rewrite $L \implies R$ over a hypergraph manifold, the R.A.C.O.C.I. engine classifies the rule into one of two operational categories based on its monomorphism span:

* **Information-Preserving Rules ($L \subset R$):** The right-hand side strictly expands or retains the topological components of the left-hand side ($l(K) = L$). The inverse operation $R \implies L$ requires no auxiliary structural data to execute, as zero vertices or hyperedges were excised from the substrate.
* **Lossy / Reductive Rules ($L \not\subset R$):** The rule collapses, simplifies, or eliminates existing subgraphs ($L \setminus l(K) \neq \emptyset$), such as evaluating an algebraic expression ($x + 0 \implies x$) or normalizing redundant database schemas.

---

## 2.3.2: Automatic Injection of `sys::residue` Ghost Membranes

When a lossy rewrite is committed, the engine intercepts the DPO deletion phase before memory offsets are altered. Instead of purging the discarded nodes, adjacencies, or properties from the Stage 0 Memory Arena, the engine wraps the eliminated sub-hypergraph $G_{\text{elim}} = m(L \setminus l(K))$ inside a specialized grouping boundary tagged with `sys::residue`.

This `sys::residue` ghost membrane is anchored directly to the newly produced output node $R$ via an auxiliary metadata adjacency:

```text
  Left-Hand Side Pattern (L)                     Right-Hand Side Topology (R)
 +--------------------------+                   +----------------------------+
 | (add) ----> (x)          |                   | (x)                        |
 |   |                      |  == (Rewrite) =>  |  |                         |
 |   v                      |                   |  +-- [sys::residue]        |
 |  (0)                     |                   |        |                   |
 +--------------------------+                   |        v                   |
                                                |     { (add) ----> (0) }    |
                                                +----------------------------+

```

---

## 2.3.3: Deterministic Inversion and Structural Time-Travel

Because the eliminated sub-hypergraph remains physically anchored to output $R$ via the `sys::residue` link, the inverse transformation $R \implies L$ is strictly deterministic:

1. **Residue Detection:** The engine inspects target node $R$ and reads the attached `sys::residue` adjacency index pointer ($I_{\text{arena}}$).
2. **Ghost Subgraph Expansion:** It unwraps the isolated ghost sub-hypergraph $G_{\text{elim}}$ stored within the residue membrane.
3. **Topology Re-Soldering:** It reconnects incident adjacencies along the interface boundary $K$, restoring prior topology $L$ with zero information loss ($\Delta S_{\text{substrate}} = 0$).

This mechanism provides native, infinite time-travel traversal and time-series auditing across all hypergraph transformations without requiring application-level event sourcing or external undo logs.

---

## 2.3.4: Lazy Evaluation, Projectional Masking, and Storage Economy

To prevent system residues from inflating memory footprints during high-frequency execution, Holds enforces strict storage economy:

* **Phantom Relative Indexing:** Residues are persisted in the Stage 0 Arena using relative index pointers ($I_{\text{arena}}$), reusing unchanged sub-nodes via $O(1)$ Merkle-DAG structural deduplication.
* **Projectional Masking:** The `sys::residue` perimeter hash is masked by default in standard view projections (such as the Structure Projection $\Pi_{\text{struct}}$). It remains completely invisible to standard runtime queries and is materialized only under the Temporal Projection ($\Pi_{\text{time}}$) or Audit Projection ($\Pi_{\text{audit}}$).
* **Deferred Residue Resolution:** The engine computes differential residue trees lazily at the exact instant a lossy rewrite is executed, avoiding pre-allocation penalties during read-heavy operations.