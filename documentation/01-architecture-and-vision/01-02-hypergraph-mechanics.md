# 1.2: Hypergraph Mechanics

Holds abandons flat, simple graph and strictly bipartite topologies in favor of directed, nested hypergraphs defined within the adhesive category $\mathbf{Hyper}$. This manifold structure is essential for modeling higher-dimensional relational systems, enabling multi-scale abstraction, and preserving referential integrity during algebraic transformations.

---

## 1.2.1: Nested Boundaries and Hierarchical Abstraction

Every vertex (atom or grouping membrane) in Holds can internally contain an entire localized hypergraph manifold, and every hyperedge (adjacency) can itself act as a vertex to receive incident hyperedges. This recursive nesting supports infinite levels of structural abstraction without modifying the underlying ontology.

Containment is formally defined by the nesting mapping $\mu$:

$$\mu: (V \cup E \cup M) \longrightarrow M \cup \{\bot\}$$

To maintain performance across internet-scale hypergraphs, the evaluation of nested boundaries is strictly lazy:

* **Boundary Encapsulation:** The internal complexity of an enclosed subgraph $G_{\text{int}}$ within a membrane $M$ is masked by $M$'s canonical perimeter hash ($h_{\text{topo}}$).
* **Conditional Traversal:** Pattern-matching algorithms inspect interior nodes only when a rewrite rule explicitly breaches $M$'s perimeter or when a projection's semantic viewport threshold ($S_{\text{viewport}}$) demands expansion.

---

## 1.2.2: Directed Flow and Morphism Vectors

Adjacencies within the hypergraph are strictly directed $n$-ary hyperedges, defined as ordered tuples of incident vertices:

$$e_k = (\alpha_1, \alpha_2, \dots, \alpha_n)$$

This structural directionality establishes the orientation of morphisms and defines valid application vectors for Double Pushout (DPO) rewrite rules ($L \xleftarrow{l} K \xrightarrow{r} R$):

* **Vector Consistency:** Directionality enforces unambiguous, deterministic execution paths during pattern substitution.
* **Manifold Integrity:** Directed linkages prevent topological degeneracies, ensuring that state transitions $A \Rightarrow B$ maintain vector field consistency across adjacent memory arenas without collapsing into undefined structural states.

---

## 1.2.3: Topological Equivalence and Isomorphic Identity

Holds eliminates scalar variable evaluation and nominal pointer tracking in favor of **Structural Isomorphism Matching**. Two nested subgraphs $G_1$ and $G_2$ are treated as computationally identical if and only if there exists a structural bijection $\phi$ establishing a graph isomorphism:

$$G_1 \cong G_2 \iff \phi(G_1) = G_2$$

Topological equivalence is operationalized using an extended Weisfeiler-Lehman (WL) canonical coloring algorithm:

1. **Canonical Color Refinement:** Structural configurations are refined into deterministic multi-dimensional hash vectors ($\mathbf{H}_{id}$).
2. **Zero-Allocation Deduplication:** Because identity is purely structural, the Stage 0 Arena Allocator intercepts identical hash vectors using a global Merkle-DAG lookup table, mapping topologically equivalent structures to the exact same flat index pointer ($I_{\text{arena}}$) in $O(1)$ time.