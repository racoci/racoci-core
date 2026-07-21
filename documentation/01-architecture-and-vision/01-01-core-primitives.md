# 1.1: Core Primitives

The Holds operating substrate operates on a strict minimalist ontology. It rejects built-in scalar data types, fixed schemas, or explicit type declarations in favor of four foundational primitives that serve as the axiomatic base of the entire environment: **The Atom**, **Adjacency**, **Grouping**, and **Rewriting**.

---

## 1.1.1: The Atom

The atom ($\alpha$) is the irreducible, dimensionless unit of the substrate, functioning as an urelement in set theory. An atom possesses no intrinsic properties, schemas, or primitive values (like integers or strings).

Its sole defining characteristic is its absolute topological identity, represented by a multi-layered hash vector:

$$\mathbf{H}_{id}(\alpha) = \begin{bmatrix} h_{\text{topo}} \\ h_{\text{type}} \\ h_{\text{usr}} \\ h_{\text{sys}} \\ h_{\text{full}} \end{bmatrix}$$

In the Stage 0 Arena, an atom is allocated as an immutable memory cell addressed via a 32-bit relative index pointer ($I_{\text{arena}}$). Structural identity is derived through Weisfeiler-Lehman (WL) canonical color refinement rather than physical memory location, allowing atoms to act as invariant anchoring vertices for all higher-order hypergraph structures.

---

## 1.1.2: Adjacency

Adjacency defines the active spatial and directed linkage between atoms. In Holds, adjacency is not a passive binary edge $(u, v)$ in a standard graph, but an $n$-ary hyperedge boundary $e = (\alpha_1, \alpha_2, \dots, \alpha_n)$ that establishes flow vectors, positional roles, and structural type signatures.

Because the system infers logic strictly through position rather than nominal tags, spatial juxtaposition operates as a functional operator:

$$(l \cdot a \cdot b \cdot c)$$

Adjacency directionality establishes the valid application vectors for rewrite morphisms, ensuring that transitions maintain spatial consistency without collapsing into undefined topological states.

---

## 1.1.3: Grouping (Nesting/Clustering)

Grouping allows atoms, adjacencies, and child boundaries to be encapsulated within an isolated topological membrane ($M$), creating a single higher-order entity. A bounded group is topologically equivalent to a single atom when interacting with external structures, enabling scale-invariant traversal from micro-operations to internet-scale systems.

Formally, containment is governed by a mapping function $\mu$:

$$\mu: (V \cup E \cup M) \longrightarrow M \cup \{\bot\}$$

Membranes carry an explicit **Spin Vector** ($\text{Spin} \in \{-1, +1\}$):

* **Spin $+1$ (Euclidean):** Enforces strict closed containment.
* **Spin $-1$ (Non-Orientable):** Inverts boundary orientation (Klein Bottle topology) to support non-well-founded self-reference and quine execution in finite memory without stack overflows.

Outer membrane perimeters cache local $h_{\text{topo}}$ hashes directly, enabling $O(1)$ boundary pruning during subgraph isomorphism searches.

---

## 1.1.4: Rewriting

Rewriting is the sole mechanism of state change, logic evaluation, and computation in the environment. Defined by the fundamental transition operation $A \Rightarrow B$, rewriting maps a Left-Hand Side pattern ($A$) to a Right-Hand Side configuration ($B$).

Rewriting is category-theoretically formalized as a **Double Pushout (DPO)** transformation over an adhesive hypergraph category ($\mathbf{Hyper}$), operating via a span of monomorphisms:

$$L \xleftarrow{\quad l \quad} K \xrightarrow{\quad r \quad} R$$

Computation forms an algebraic **groupoid**, guaranteeing that every transition $A \Rightarrow B$ possesses a mathematically computable inverse $B \Rightarrow A$. If a rewrite is lossy ($L \not\subset R$), the engine automatically intercepts the eliminated subgraph and wraps it inside an attached `sys::residue` ghost membrane, preserving total system information ($\Delta S = 0$).