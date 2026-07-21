# 02-04: Identity Hashing and Multi-Dimensional Isomorphism

Identity in the Holds environment is not defined by a transient memory pointer or an arbitrary sequential database ID, but by cryptographic and topological invariants. Every entity possesses dual identity mechanisms: **Referential Identity** (its index location within the memory arena for constant-time traversal) and **Isomorphic Identity** (its structural equivalence across quotient spaces).

To resolve graph isomorphisms efficiently, Holds canonizes hypergraph topologies using an extended Weisfeiler-Lehman (WL) canonical labeling algorithm adapted for nested hypergraphs.

---

## 1. The Multi-Dimensional Hash Vector ($H_{id}$)

A structure does not possess a single static hash. Instead, it evaluates a canonized Hash Vector representing its Level of Detail (LoD) across orthogonal dimensions of the hypergraph:

$$\mathbf{H}_{id}(S) = \begin{bmatrix} h_{topo} \\ h_{type} \\ h_{usr} \\ h_{sys} \\ h_{full} \end{bmatrix}$$

* 
**$h_{topo}$ (Pure Topology):** Evaluates strictly nodes, hyperedges, boundaries, and nesting configurations. It ignores all values, properties, types, and tags. It identifies identical structural shapes and homomorphisms regardless of domain interpretation.


* 
**$h_{type}$ (Semantic Equivalence):** Evaluates $h_{topo}$ plus type annotations and type signatures. Two distinct logical expressions or proofs with the exact same structural logic and typing hash to identical $h_{type}$ values.


* 
**$h_{usr}$ (User Domain Equivalence):** Evaluates $h_{topo} + h_{type}$ plus user-defined metadata tags (scoped under the `usr::` namespace).


* 
**$h_{sys}$ (Computational Equivalence):** Evaluates topology, types, and execution state (e.g., whether an embedded thunk or expression node is actively evaluated or lazy).


* 
**$h_{full}$ (Absolute Identity):** The complete cryptographic digest incorporating all properties, literal values, timestamps, and `sys::provenance` derivation paths. It guarantees absolute global uniqueness.



---

## 2. Homomorphic Multiset Hashing for Dynamic Filters

Pre-calculating static hashes for all possible sub-combinations of metadata tags would lead to a combinatorial explosion ($2^N$ hashes for $N$ tags per node). To allow users to query arbitrary topological cutouts on the fly (e.g., matching structures considering only tags created within a specific timeframe), Holds employs **Homomorphic Multiset Hashing**.

1. 
**Topological Backbone Anchor:** The engine first computes the inviolable $h_{topo}$ backbone, establishing a deterministic canonical ordering for node traversal.


2. 
**Atomic Property Hashes:** Instead of storing pre-aggregated tag combinations, each tag or attribute attached to a node is assigned an independent atomic hash $h(t_i)$.


3. 
**Dynamic Algebraic Aggregation:** When a query specifies an arbitrary predicate filter $S = \{t_1, t_2, \dots, t_k\}$, the engine aggregates the remaining atomic hashes using a commutative, associative groupoid operation (such as XOR or modular addition):



$$H_{\text{dynamic}}(v) = \bigoplus_{i=1}^{k} h(t_i)$$

4. 
**Backbone Propagation:** $H_{\text{dynamic}}$ is propagated upward through the Merkle tree following the $h_{topo}$ traversal order. Comparing two arbitrary subgraphs under dynamic metadata constraints reduces to an $O(1)$ root vector comparison.



---

## 3. Local Membrane Hashes and Memory Deduplication

Grouping boundaries (membranes) act as spatial isolators. The membrane node stores the local topological hash ($h_{topo}$) of its interior directly on the boundary.

* 
**$O(1)$ Structural Comparison:** Comparing whether two subgraphs containing thousands of nested nodes are topologically identical requires only a $O(1)$ hash comparison between their respective outer membranes, without traversing their interiors.


* 
**Automatic Systemic Deduplication:** Because all nodes in the Stage 0 Arena Allocator are immutable, the memory system maintains a Merkle-DAG lookup table. If a new rewrite produces a subgraph whose structural hash vector matches an existing allocation, the engine points to the existing arena index rather than duplicating bytes.



---

## 4. Incremental Hash Recalculation

When a local rewrite $A \Rightarrow B$ modifies a deeply nested subgraph:

1. The affected leaf or hyperedge is assigned a new atomic hash.


2. The engine recalculates parent hashes via Merkle-tree dynamics up through enclosing membranes to the root.


3. Hash update complexity is bounded by $O(d)$, where $d$ is the nesting depth of the modified boundary, rather than the total size of the internet-scale hypergraph.