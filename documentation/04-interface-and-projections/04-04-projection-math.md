# 4.4: Projection Framework and Projection Mathematics

In the Holds operating substrate, user interface components, text views, interactive WebGL graphs, and relational tabular projections are not separate software applications or static documents. They are mathematical projections derived directly from the global hypergraph manifold $\mathcal{H}$.

To guarantee that editing a view (whether typing text in an IDE, moving a visual node on a canvas, or modifying a table cell) safely mutates the underlying substrate without state corruption or desynchronization, Holds formalizes views as composable, functorial **Projections**.

---

## 4.4.1: Mathematical Formalization of the Projection Pipeline

A Projection $\Pi$ is defined as a composite, lossy or lossless transformation pipeline mapping the global hypergraph substrate $\mathcal{H}$ to a specific visual or textual representation space $\mathcal{V}$:

$$\Pi: \mathcal{H} \longrightarrow \mathcal{V}$$

The complete projection pipeline is mathematically decomposed into a sequence of five pure, composable operators:

$$\Pi = \iota \circ \gamma \circ \lambda \circ \rho \circ \sigma$$

```text
 [ Substrate Graph H ]
          |
          v
    ( 1. Selection: sigma )  ---> Filters subgraphs based on predicate constraints
          |
          v
    ( 2. Reduction: rho )   ---> Constructs quotient topologies and abstraction levels
          |
          v
    ( 3. Layout: lambda )    ---> Embeds topology into metric space R^n
          |
          v
    ( 4. Render: gamma )    ---> Rasterizes geometry and styles visual glyphs
          |
          v
 [ Viewport Render V ]
          |
          v
   ( 5. Interaction: i )    ---> Maps user events inversely into rewrites L => R

```

---

## 4.4.2: Selection ($\sigma$) and Reduction ($\rho$) Algebraic Operators

The first two stages of the projection pipeline extract and abstract structural data from the hypergraph before layout or rendering occurs.

### 4.4.2.1 The Selection Operator ($\sigma_P$)

The Selection operator filters the global hypergraph $\mathcal{H} = (V, E)$ based on a set of topological or metadata predicates $P$, returning an induced sub-hypergraph $\mathcal{H}' = \sigma_P(\mathcal{H})$:

$$\sigma_P(\mathcal{H}) = \{ (v, e) \in \mathcal{H} \mid P(v, e) = \text{true} \}$$

Selection constraints evaluate multi-dimensional hash slices ($H_{id}$):

* **Topological Filtering ($\sigma_{h_{\text{topo}}}$):** Selects structures matching specific geometric connectivity patterns regardless of labels or property values.
* **Semantic Filtering ($\sigma_{h_{\text{type}}}$):** Selects subgraphs matching specific structural type signatures.
* **Temporal / Audit Filtering ($\sigma_{\text{time}}$):** Selects historic subgraphs and `sys::residue` branches within a defined time window $[t_{\text{start}}, t_{\text{end}}]$.

### 4.4.2.2 The Reduction Operator ($\rho_R$)

The Reduction operator maps the filtered hypergraph $\mathcal{H}'$ onto a homomorphic quotient space $\mathcal{S} = \mathcal{H}' / \sim_R$ using an equivalence relation $R$, collapsing complex sub-structures into simplified abstract nodes:

$$\rho_R: \mathcal{H}' \longrightarrow \mathcal{S}$$

For a grouping membrane $M$ enclosing internal subgraph $G_{\text{int}}$, the reduction operator evaluates:

$$\rho_R(G_{\text{int}}) = \begin{cases}  G_{\text{int}}, & \text{if } S_{\text{viewport}}(M) \ge \theta_{\text{expanded}} \quad (\text{Identity / Uncollapsed}) \\ v_{\text{summary}}(H_{id}(M)), & \text{if } S_{\text{viewport}}(M) < \theta_{\text{expanded}} \quad (\text{Quotient Collapse}) \end{cases}$$

When producing a textual view (such as the H-Cypher Text Projection), $\rho_R$ operates as an Abstract Syntax Tree (AST) linearizer, converting 2D/3D hypergraph adjacencies into a 1D token stream via canonical depth-first traversal.

---

## 4.4.3: Layout ($\lambda$), Rendering ($\gamma$), and Inverse Interaction ($\iota$)

Once reduction produces the abstract target topology $\mathcal{S}$, the remaining operators map the structure to screen space and establish the inverse editing loop.

### 4.4.3.1 Metric Space Layout Mapping ($\lambda$)

The Layout operator assigns spatial geometric coordinates to abstract nodes and hyperedges by embedding $\mathcal{S}$ into a $d$-dimensional metric space $\mathcal{M} = \mathbb{R}^d$ (typically $d = 2$ or $d = 3$):

$$\lambda: \mathcal{S} \longrightarrow \mathbb{R}^{d \times \vert{}V_\mathcal{S}\vert{}}$$

The layout function minimizes an energy functional $E(\lambda)$ constrained by membrane containment potential fields $U_{\text{membrane}}$:

$$E(\lambda) = \sum_{(u, v) \in E} k_{\text{spring}} \Vert{}\lambda(u) - \lambda(v)\Vert{}^2 + \sum_{u \neq v} \frac{k_{\text{repel}}}{\Vert{}\lambda(u) - \lambda(v)\Vert{}^2} + \sum_{v \in V} U_{\text{membrane}}(\lambda(v))$$

### 4.4.3.2 Graphical Rasterization and Stylization ($\gamma$)

The Render operator maps spatial coordinates and node identities into visual pixels or textual glyphs on the viewport canvas $\mathcal{V}$:

$$\gamma: \mathcal{M} \longrightarrow \mathcal{V}$$

* **Visual Canvas:** Translates positions $\lambda(v)$ and boundary types into WebGL instanced VBO draw calls, SDF shader shapes, and color-coded hyperedge ribbon meshes.
* **Text Canvas:** Translates token positions into formatted ASCII/UTF-8 strings with syntax highlighting driven by $h_{\text{type}}$ signatures.

### 4.4.3.3 Inverse Interaction Morphisms ($\iota$)

The Interaction operator establishes bidirectional round-tripping. When a user performs an interaction event $e \in \mathcal{E}$ (such as typing text, moving a node, or deleting a hyperedge) within viewport $\mathcal{V}$, $\iota$ translates $e$ into an exact structural rewrite rule $L \implies R$ applied directly back to the substrate $\mathcal{H}$:

$$\iota: \mathcal{V} \times \mathcal{E} \longrightarrow (L \implies R)$$

```text
  User Input Event e in Viewport V
                 |
                 v
   [ Inverse Operator i(e) ]
                 |
                 v
  Construct Structural Rewrite (L => R)
                 |
                 v
  Execute Atomic State Transition on H

```

---

## 4.4.4: Projection Composition Algebra ($\oplus$) and Functorial Round-Tripping

Multiple projections can be combined algebraically, forming a **Projection Algebra** that allows developers to compose custom dashboards and multi-view development environments.

### 4.4.4.1 Direct Sum and Composition of Projections ($\Pi_1 \oplus \Pi_2$)

When two projections $\Pi_1$ and $\Pi_2$ operate simultaneously on the same substrate region $\mathcal{H}$, their combination is defined by the direct sum operator $\oplus$:

$$(\Pi_1 \oplus \Pi_2)(\mathcal{H}) = \left\langle \Pi_1(\mathcal{H}), \Pi_2(\mathcal{H}) \right\rangle$$

The composition algebra satisfies the following properties:

* **Associativity:** $(\Pi_1 \oplus \Pi_2) \oplus \Pi_3 = \Pi_1 \oplus (\Pi_2 \oplus \Pi_3)$
* **Identity Projection ($\Pi_{\text{id}}$):** The identity projection returns the raw, un-filtered hypergraph without visual transformation ($\Pi \oplus \Pi_{\text{id}} = \Pi$).
* **Commutativity of Independent Viewports:** Modifications executed via $\iota_1$ in viewport $\mathcal{V}_1$ update substrate $\mathcal{H}$, which automatically propagates to $\mathcal{V}_2$ via $\Pi_2$:

$$\Pi_2\left( \mathcal{H} \underset{\iota_1(e_1)}{\xrightarrow{\hspace*{1.2cm}}} \mathcal{H}' \right) = \mathcal{V}_2'$$

### 4.4.4.2 Category Theory Interpretation: Projections as Functors

In category theory terms, a projection acts as a **Functor** $F_\Pi$ from the Category of Hypergraphs $\mathbf{Hyper}$ to the Category of Viewports $\mathbf{View}$:

$$F_\Pi: \mathbf{Hyper} \longrightarrow \mathbf{View}$$

1. **Object Mapping:** Every hypergraph state $\mathcal{H} \in \mathbf{Hyper}$ maps to a valid viewport frame $\mathcal{V} \in \mathbf{View}$.
2. **Morphism Preservation:** Every structural rewrite transition $f: \mathcal{H}_1 \to \mathcal{H}_2$ in the substrate maps to a continuous view transition $F_\Pi(f): \mathcal{V}_1 \to \mathcal{V}_2$ (such as an animated WebGL layout relaxation or a text delta update).

$$F_\Pi(f \circ g) = F_\Pi(f) \circ F_\Pi(g)$$

### 4.4.4.3 Commutative Round-Tripping Diagram and Consistency Guarantees

To guarantee that editing a projection never corrupts the underlying hypergraph or causes desynchronization between different views, every valid projection in Holds must satisfy the **Commutative Round-Tripping Property**:

$$\begin{array}{ccc} \mathcal{H}_1 & \xrightarrow{\quad L \implies R \quad} & \mathcal{H}_2 \\ \Big\downarrow \Pi & & \Big\downarrow \Pi \\ \mathcal{V}_1 & \xrightarrow{\quad \Delta \text{Edit} \quad} & \mathcal{V}_2 \end{array}$$

For any edit $\Delta \text{Edit}$ performed in viewport $\mathcal{V}_1$, executing the inverse interaction $\iota(\Delta \text{Edit})$ to yield state $\mathcal{H}_2$ and subsequently re-projecting via $\Pi(\mathcal{H}_2)$ must produce the exact target viewport state $\mathcal{V}_2$. If a projection cannot satisfy commutativity due to lossy reduction, the interface flags the edit mode as read-only, preventing invalid state injections.