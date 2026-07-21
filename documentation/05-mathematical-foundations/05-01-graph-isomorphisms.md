# 5.1: Graph Isomorphisms, Canonization, and Automorphism Groups

At the foundation of the Holds substrate lies the fundamental problem of structural identity: determining whether two arbitrarily complex hypergraphs represent the same underlying logic, regardless of pointer locations, node labeling, or storage offsets. In classical computing, comparing two objects requires serializing them into linear byte arrays or inspecting explicit database keys. In Holds, evaluation and state deduplication rely on resolving **Subgraph Isomorphisms** and computing **Canonical Graph Representations** over directed, nested hypergraphs.

---

## 5.1.1: The Isomorphism Problem in Multi-Dimensional Hypergraphs

In standard graph theory, two simple graphs $G_1 = (V_1, E_1)$ and $G_2 = (V_2, E_2)$ are isomorphic ($G_1 \cong G_2$) if there exists a bijection $\phi: V_1 \to V_2$ such that $(u, v) \in E_1 \iff (\phi(u), \phi(v)) \in E_2$.

In Holds, this definition must be extended to accommodate $n$-ary hyperedges, directional containment membranes, and spin orientation.

### 5.1.1.1 Formal Definition of Nested Hypergraph Isomorphism

Let $\mathcal{H}_1 = (V_1, E_1, M_1, \mu_1, \text{Spin}_1)$ and $\mathcal{H}_2 = (V_2, E_2, M_2, \mu_2, \text{Spin}_2)$ be two hypergraph manifolds, where:

* $V$ is the set of dimensionless atoms.
* $E \subseteq \bigcup_{k=1}^N V^k$ is the set of ordered $n$-ary hyperedges.
* $M$ is the set of grouping membranes.
* $\mu: (V \cup E \cup M) \to M \cup \{\bot\}$ is the containment mapping defining nesting depth.
* $\text{Spin}: M \to \{-1, +1\}$ specifies membrane boundary orientation.

$\mathcal{H}_1$ and $\mathcal{H}_2$ are **Isomorphic** ($\mathcal{H}_1 \cong \mathcal{H}_2$) if and only if there exists a tuple of bijections $(\phi_V, \phi_E, \phi_M)$ such that:

1. **Hyperedge Preservation:** For every ordered hyperedge $e = (v_1, v_2, \dots, v_k) \in E_1$:

$$\phi_E(e) = (\phi_V(v_1), \phi_V(v_2), \dots, \phi_V(v_k)) \in E_2$$


2. **Containment Preservation:** For every structural element $x \in V_1 \cup E_1 \cup M_1$:

$$\phi_M(\mu_1(x)) = \mu_2(\phi(x))$$


3. **Spin Vector Preservation:** For every membrane $m \in M_1$:

$$\text{Spin}_1(m) = \text{Spin}_2(\phi_M(m))$$



```text
    Substrate Region H_1                       Substrate Region H_2
  +-----------------------+                  +-----------------------+
  | Membrane M1 (Spin +1) |                  | Membrane M2 (Spin +1) |
  |   (a) --[e1]--> (b)   |  == phi_V ==>    |   (x) --[e2]--> (y)   |
  +-----------------------+                  +-----------------------+
   Isomorphism Holds: phi_V(a)=x, phi_V(b)=y, phi_E(e1)=e2, phi_M(M1)=M2

```

---

## 5.1.2: Extended Weisfeiler-Lehman (WL) Color Refinement

Determining graph isomorphism general is GI-complete. To avoid exponential time complexity during pattern matching and hash computation, the R.A.C.O.C.I. engine uses an **Extended Weisfeiler-Lehman (1-WL / k-WL) Color Refinement Algorithm** adapted for nested hypergraphs.

The algorithm iteratively computes an invariant coloring (signature) for every node, hyperedge, and membrane, converting topological structure into a canonical multiset hash.

### 5.1.2.1 Iterative Color Refinement Update Equation

Let $c^{(t)}(v)$ denote the color signature of element $v$ at iteration $t$.

1. **Initialization ($t = 0$):**

$$c^{(0)}(v) = \text{Hash}\left( \text{Arity}(v), \text{Spin}(v), \mu(v) \right)$$


2. **Color Refinement Step ($t \to t+1$):** At iteration $t+1$, each node $v$ collects the multiset $\left\{\!\left\{ \dots \right\}\!\right\}$ of signatures from its incident hyperedges and enclosing membranes:

$$c^{(t+1)}(v) = \text{Hash}\Big( c^{(t)}(v), \left\{\!\left\{ \left( \text{pos}(v, e), \text{type}(e), c^{(t)}(e), \left\{\!\left\{ c^{(t)}(u) \mid u \in e \setminus \{v\} \right\}\!\right\} \right) \mid e \in E(v) \right\}\!\right\} \Big)$$

3. **Termination Condition:** The refinement loop terminates when the partition of colors reaches a stable fixed point (no new color splits occur):

$$\text{Partition}(c^{(t+1)}) = \text{Partition}(c^{(t)})$$

### 5.1.2.2 Handling Non-Well-Founded Cycles (Spin -1)

When color refinement encounters a Spin `-1` membrane, standard iterative descent would loop infinitely. The extended algorithm intercepts cycle steps by binding the color update to the membrane's **Homological Cycle Signature**:

$$c^{(t+1)}(m_{\text{spin -1}}) = \text{Hash}\left( c^{(t)}(m), \text{CycleLength}, \pi_1(\text{MembraneTopology}) \right)$$

This guarantees that color refinement over non-well-founded self-referential structures stabilizes in $O(\vert{}V\vert{} + \vert{}E\vert{})$ iterations.

---

## 5.1.3: Automorphism Groups and Symmetric Quotient Spaces

An **Automorphism** is an isomorphism from a hypergraph to itself ($\phi: \mathcal{H} \cong \mathcal{H}$). The set of all automorphisms forms the **Automorphism Group** $\text{Aut}(\mathcal{H})$ under function composition.

$$\text{Aut}(\mathcal{H}) = \{ \phi \in \text{Sym}(V) \mid \phi(\mathcal{H}) = \mathcal{H} \}$$

```text
       Symmetric Hypergraph H                      Automorphism Mapping phi
            (a) ---- (b)                              a ----> b
             |        |                               b ----> a
            (c) ---- (d)                              c ----> d, d ----> c
  Aut(H) contains 4 symmetry operations (Reflection, Rotation, Identity)

```

### 5.1.3.1 Symmetry-Induced Match Explosion

When a pattern $L$ in a rewrite rule $L \implies R$ exhibits high structural symmetry ($\vert{}\text{Aut}(L)\vert{} > 1$), standard graph search algorithms find $\vert{}\text{Aut}(L)\vert{}$ redundant, isomorphic matches for the exact same target subgraph in memory. Executing rewrites across all symmetric variations wastes computational resources and risks state corruption.

### 5.1.3.2 Pruning Symmetric Orbits in VF2 Search

To eliminate redundant pattern-matching trajectories, the R.A.C.O.C.I. engine computes the **Node Orbits** induced by $\text{Aut}(L)$. The orbit $\mathcal{O}(v)$ of a node $v$ is the set of nodes to which $v$ can be mapped by symmetries in $\text{Aut}(L)$:

$$\mathcal{O}(v) = \{ \phi(v) \mid \phi \in \text{Aut}(L) \}$$

During search-space traversal in the VF2 matcher:

1. The engine selects one canonical representative $v^* \in \mathcal{O}(v)$ for pattern matching.
2. Search paths mapping candidate target nodes to non-representative members of the same orbit are pruned immediately.
3. This reduces the search tree depth from $O(\vert{}\text{Aut}(L)\vert{} \cdot \vert{}V\vert{}!)$ to $O(\vert{}V\vert{}! / \vert{}\text{Aut}(L)\vert{})$, guaranteeing that each distinct structural match is processed exactly once.

---

## 5.1.4: Polynomial-Time Canonization Invariants for Memory Arenas

To achieve $O(1)$ structural lookup and global deduplication within the Stage 0 Arena Allocator, every hypergraph state $\mathcal{H}$ must map to a unique, immutable **Canonical Form** $\mathcal{C}(\mathcal{H})$.

A canonization function $\mathcal{C}$ satisfies:

$$\mathcal{H}_1 \cong \mathcal{H}_2 \iff \mathcal{C}(\mathcal{H}_1) = \mathcal{C}(\mathcal{H}_2)$$

### 5.1.4.1 Canonical String Linearization Algorithm

The R.A.C.O.C.I. engine constructs $\mathcal{C}(\mathcal{H})$ by generating an invariant adjacency matrix ordered by stable Weisfeiler-Lehman color signatures:

1. **Color Sorting:** Nodes and hyperedges are sorted into an ordered sequence based on their terminal color codes $c^{(\text{final})}(v)$.
2. **Lexicographical Tie-Breaking:** If nodes share identical color codes (due to automorphism symmetries), ties are broken deterministically by evaluating node orbit indices.
3. **Adjacency Matrix Serialization:** The ordered elements are written into a byte buffer representing the canonical lower-triangular adjacency matrix.
4. **Hashing to $H_{id}$:** The resulting byte stream is hashed using BLAKE3 / SHA3-256 to produce the pure topological hash component $h_{\text{topo}}$:

$$h_{\text{topo}}(\mathcal{H}) = \text{BLAKE3}\left( \text{Serialized}\left( \mathcal{C}(\mathcal{H}) \right) \right)$$

### 5.1.4.2 Zero-Allocation Merkle-DAG Insertion

Because $\mathcal{C}(\mathcal{H})$ is completely invariant under graph isomorphism:

* Any two operations independently creating identical hypergraph structures in separate memory scopes produce identical $h_{\text{topo}}$ hash values.
* When inserting a new subgraph into the Stage 0 Memory Arena, the allocator queries its global Merkle-DAG lookup table using $h_{\text{topo}}$.
* If $h_{\text{topo}}$ exists, the allocator discards the newly created buffer and returns an existing arena index pointer, providing absolute, continuous, system-wide structural deduplication in $O(1)$ time.