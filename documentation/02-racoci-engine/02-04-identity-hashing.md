# 2.4: Identity Hashing and Multi-Dimensional Isomorphism

Identity in the Holds environment is not defined by transient physical memory pointers or arbitrary sequential database identifiers, but by cryptographic and topological invariants. Every entity in the substrate possesses dual identity mechanisms: **Referential Identity** (its relative index offset location $I_{\text{arena}}$ within the Stage 0 Memory Arena for constant-time traversal) and **Isomorphic Identity** (its structural equivalence across quotient spaces).

To resolve graph isomorphisms and structural equivalences efficiently, Holds canonizes hypergraph topologies using an extended Weisfeiler-Lehman (WL) canonical labeling algorithm adapted for nested $n$-ary hypergraph manifolds.

---

## 2.4.1: The Multi-Dimensional Hash Vector ($\mathbf{H}_{id}$)

A structure in Holds does not possess a single static scalar hash. Instead, it evaluates a canonized **Multi-Dimensional Hash Vector** $\mathbf{H}_{id}(S)$ representing its structural features across five orthogonal levels of detail (LoD):

$$\mathbf{H}_{id}(S) = \begin{bmatrix} h_{\text{topo}} \\ h_{\text{type}} \\ h_{\text{usr}} \\ h_{\text{sys}} \\ h_{\text{full}} \end{bmatrix}$$

```text
  Multi-Dimensional Hash Vector Architecture:
  +---------------------------------------------------------------------------------+
  | h_topo : Pure Topology (Nodes, Hyperedges, Nesting Boundaries, Arity)           |
  +---------------------------------------------------------------------------------+
  | h_type : Semantic Types (h_topo + Type Annotations & Signature Contracts)       |
  +---------------------------------------------------------------------------------+
  | h_usr  : User Domain Metadata (h_type + User-Defined usr:: Tags & Attributes)   |
  +---------------------------------------------------------------------------------+
  | h_sys  : Computational State (h_usr + Evaluation Thunks & Active Flags)         |
  +---------------------------------------------------------------------------------+
  | h_full : Absolute Cryptographic Identity (All Properties, Values, Provenance)   |
  +---------------------------------------------------------------------------------+

```

### 2.4.1.1 Dimensions of the Hash Vector

* **$h_{\text{topo}}$ (Pure Topology):** Evaluates strictly nodes, hyperedges, boundaries, and nesting configurations ($\mu$). It ignores all values, properties, types, and tags. $h_{\text{topo}}$ identifies identical structural shapes and homomorphisms regardless of domain interpretation.
* **$h_{\text{type}}$ (Semantic / Type Equivalence):** Evaluates $h_{\text{topo}}$ plus type annotations and signature constraints. Two distinct logical expressions or formal proofs with identical structural logic and typing constraints hash to the exact same $h_{\text{type}}$ digest.
* **$h_{\text{usr}}$ (User Domain Equivalence):** Evaluates $h_{\text{type}}$ plus user-defined metadata tags scoped under the `usr::` namespace.
* **$h_{\text{sys}}$ (Computational Equivalence):** Evaluates topology, types, user metadata, and active execution state (e.g., whether an embedded thunk or expression node is evaluated or lazy).
* **$h_{\text{full}}$ (Absolute Identity):** The complete 256-bit BLAKE3 cryptographic digest incorporating all literal values, attributes, timestamps, and `sys::provenance` derivation paths, guaranteeing absolute global uniqueness.

---

## 2.4.2: Homomorphic Multiset Hashing for Dynamic Filter Projections

Pre-calculating static hashes for all possible combinations of metadata attributes would trigger a combinatorial explosion ($2^N$ hashes for $N$ metadata tags per node). To allow queries to filter arbitrary topological cutouts on the fly (e.g., matching subgraphs considering only tags created within a specific timeframe), Holds employs **Homomorphic Multiset Hashing**.

```text
 Dynamic Filter Assembly Pipeline:
 [ Inviolable h_topo Backbone ] ---> Establishes Canonical WL Traversal Order
                                                 |
 [ Selected Tags: t_1, t_2, ... ] -> [ Atomic Hashes: h(t_1), h(t_2), ... ]
                                                 |
                                                 v
                                 H_dynamic = h(t_1) (+) h(t_2) (+) ...
                                                 |
                                                 v
                                 Propagate up Merkle-DAG Tree

```

1. **Topological Backbone Anchor:** The engine first computes the inviolable $h_{\text{topo}}$ backbone via Weisfeiler-Lehman color refinement, establishing a deterministic canonical ordering for node traversal.
2. **Atomic Property Hashes:** Instead of storing pre-aggregated tag combinations, each tag or attribute $t_i$ attached to a node is assigned an independent atomic hash $h(t_i)$.
3. **Dynamic Algebraic Aggregation:** When a query specifies an arbitrary predicate filter $S = \{t_1, t_2, \dots, t_k\}$, the engine aggregates the remaining atomic hashes using a commutative, associative groupoid operator (such as bitwise XOR $\bigoplus$ or modular addition):

$$H_{\text{dynamic}}(v) = \bigoplus_{i=1}^{k} h(t_i)$$


4. **Backbone Propagation:** $H_{\text{dynamic}}$ is propagated upward through the Merkle tree following the pre-established $h_{\text{topo}}$ traversal order. Comparing two arbitrary subgraphs under dynamic metadata constraints reduces to an $O(1)$ root vector comparison.

---

## 2.4.3: Local Membrane Hashes and Merkle-DAG Deduplication

Grouping boundaries (membranes $M$) act as spatial isolators. A membrane boundary stores the canonical topological hash ($h_{\text{topo}}$) of its enclosed interior directly on its perimeter.

* **$O(1)$ Structural Comparison:** Checking whether two subgraphs containing thousands of nested nodes are topologically isomorphic requires only an $O(1)$ hash comparison between their respective outer membrane perimeters, without traversing their interior structures.
* **Automatic Systemic Deduplication:** Because all allocations in the Stage 0 Memory Arena are immutable, the allocator maintains a lock-free Robin Hood Hash Table indexing active allocations by their $H_{id}$ digests. If a new rewrite produces a subgraph whose structural hash vector matches an existing allocation, the engine returns the existing relative index pointer $I_{\text{arena}}$, achieving zero-copy $O(1)$ deduplication without byte replication.

---

## 2.4.4: Incremental Hash Recalculation and Merkle Tree Traversal

When a localized rewrite $A \Rightarrow B$ modifies a deeply nested subgraph:

```text
 Root Membrane M_root  [ Hash Recalculated ]  <-- (Step 3: Update Complete)
        ^
        |
 Parent Membrane M_p   [ Hash Recalculated ]  <-- (Step 2: Propagate Upward)
        ^
        |
 Mutated Leaf / Edge   [ Assigned New h_atom ] <-- (Step 1: Local Rewrite A => B)

```

1. The affected leaf vertex or $n$-ary hyperedge is assigned a new atomic hash value.
2. The engine recalculates parent hashes via Merkle-tree dynamics upward through enclosing membrane boundaries to the global root pointer $R_{\text{root}}$.
3. The computational complexity of the hash update is strictly bounded by:

$$\text{Complexity} = O(d)$$



where $d$ is the nesting depth of the modified boundary within the membrane hierarchy, rather than the total size $N$ of the global hypergraph manifold.