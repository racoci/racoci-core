# 3.3: Rewrite Algorithms and Subgraph Isomorphism

The execution engine of Holds treats computation as the continuous, deterministic application of rewrite rules over nested directed hypergraphs. At the core of this transformation engine is a specialized pattern-matching algorithm capable of resolving subgraph isomorphisms across multi-dimensional boundary layers, non-well-founded topologies, and variable Level of Detail (LoD) hash constraints.

---

## 3.3.1: Multi-Layer Subgraph Isomorphism Matching

Pattern matching in H-Cypher (R.A.C.O.C.I.) requires finding a structural monomorphism $m: L \hookrightarrow G$, where $L$ is the pattern hypergraph (Left-Hand Side) and $G$ is the target environment hypergraph. Traditional graph matching algorithms (e.g., standard VF2 or Ullmann) fail on Holds hypergraphs due to nested grouping membranes, $n$-ary hyperedges, and non-well-founded cycles.

The R.A.C.O.C.I. engine uses an extended **VF2-WL Hybrid Algorithm for Nested Hypergraphs**:

### 3.3.1.1 Candidate Filtering via Boundary Hashes ($O(1)$ Pruning)

Before performing fine-grained node-by-node matching, the engine inspects the Level of Detail hash vector ($\mathbf{H}_{id}$) of enclosing membranes:

1. The user query or rewrite rule specifies the required detail dimension (e.g., matching on pure topology $h_{\text{topo}}$ vs. semantic types $h_{\text{type}}$).
2. The engine performs an $O(1)$ hash lookup against the target membrane's pre-computed local boundary hash.
3. If $h_{\text{LHS\_membrane}} \neq h_{\text{target\_membrane}}$ under the specified LoD filter, the entire nested subgraph is pruned immediately without recursive traversal.

### 3.3.1.2 State Space Search with Boundary Traversal

When candidate regions pass hash filtering, the engine constructs a state-space mapping $M(s)$ associating nodes $v \in L$ with nodes $w \in G$:

* **Syntactic Feasibility Rules:** For a candidate pair $(v, w)$, the engine validates structural parity:

$$\text{Arity}(v) = \text{Arity}(w)$$

$$\text{Spin}(v) = \text{Spin}(w)$$

$$\text{InDegree}(v) \le \text{InDegree}(w), \quad \text{OutDegree}(v) \le \text{OutDegree}(w)$$

* **Membrane Boundary Rule:** A node $v$ encapsulated inside a membrane $M_L$ can only be mapped to a node $w$ inside membrane $M_G$ if $M_L$ and $M_G$ are topologically mapped or homomorphically compatible.
* **Non-Well-Founded Cycle Traversal:** If a membrane possesses $\text{Spin} = -1$, the search algorithm maintains a visited boundary stack. Upon detecting a cyclic traversal back to a parent membrane, the matcher validates the non-well-founded invariant using the boundary's canonical cycle signature rather than recursing infinitely.

---

## 3.3.2: LHS Pattern Matching Execution Pipeline

Matching a rule $L \implies R$ follows a five-stage pipeline:

```text
 [ Rule LHS (L) ]
        |
        v
 [ 1. LoD Hash Filter ] ======= (No Match) =======> [ Abort / Next Candidate ]
        | (Pass)
        v
 [ 2. Anchor Binding ]
        |
        v
 [ 3. Structural Traversal & Capture ]
        |
        v
 [ 4. Vacuum & Anti-Graph Verification (~) ]
        |
        v
 [ 5. Match Commitment ] ===> Proceed to RHS Substitution

```

### 3.3.2.1 Anchor Binding

The engine selects the most structurally constrained node in $L$ (highest arity or lowest matching frequency based on local $h_{\text{topo}}$ distribution) as the primary anchor $v_0$. It queries the Stage 0 Arena Index for candidate anchors $w_0 \in G$.

### 3.3.2.2 Spatial Graph Expansion

Starting from $(v_0, w_0)$, the engine expands the candidate mapping along incident hyperedges and adjacencies. Whitespace characters and spatial juxtapositions (`l a b c`) are resolved as ordered $n$-ary hyperedges, matching argument positions strictly by index.

### 3.3.2.3 Capture Variable Binding

Variable handles in $L$ (e.g., `x`, `y`) store pointers to matched subgraphs in $G$. If a variable symbol appears multiple times in $L$, the matcher enforces that all corresponding instances in $G$ share exact isomorphic equivalence under the active LoD dimension.

### 3.3.2.4 Negative Constraint Evaluation

If $L$ contains negative constraints or anti-graphs (prefixed with `~`), the matcher executes a localized vacuum check. The match is invalidated if the prohibited subgraphs exist within the target scope.

---

## 3.3.3: RHS Substitution Mechanics and Atomic State Transitions

Once a valid mapping $m: L \hookrightarrow G$ is established, the engine executes the substitution phase $L \implies R$ atomically, preserving graph manifold integrity.

```text
  LHS Matched Region m(L)                  RHS Target Structure R
  +----------------------+                  +----------------------+
  | Retained: Subgraph K | ===============> | Retained: Subgraph K | (Reused Index)
  | Removed:  Subgraph D |                  | Added:    Subgraph N | (New Arena Alloc)
  +----------------------+                  +----------------------+
                                                       |
                                            [ Injected sys::residue ]
                                                       |
                                                       v
                                              (Anchored Subgraph D)

```

### 3.3.3.1 Structural Diff and Arena Allocation

The engine does not destroy $m(L)$ in place. It evaluates the topological differential $\Delta = R - L$:

1. **Unmodified Subgraphs ($L \cap R$):** Subgraphs common to both LHS and RHS (the interface $K$) are retained without re-allocation. Their relative index pointers ($I_{\text{arena}}$) are copied directly to $R$.
2. **New Subgraphs ($R - L$):** Newly declared atoms, hyperedges, or grouping membranes are allocated within the Stage 0 Memory Arena. $O(1)$ structural deduplication ensures that if $R - L$ contains a shape already present in memory, existing pointers are reused.
3. **Removed Subgraphs ($L - R$):** Subgraphs present in $L$ but absent in $R$ are detached from the active root membrane.

### 3.3.3.2 Pointer Root Mutation

The state change is finalized by updating the parent membrane's root index pointer from $m(L)$'s outer boundary to $R$'s outer boundary. Because all memory allocations in the arena are append-only and immutable, the state transition is atomic and thread-safe.

---

## 3.3.4: Differential Residue Calculation and Invalidation Hooks

To enforce the mathematical groupoid axiom ($R \implies L$ must exist for every $L \implies R$), lossy rewrites automatically generate and inject system residues.

### 3.3.4.1 Lossy Rewrite Interception

During differential calculation, if $L - R \neq \emptyset$ (meaning nodes or adjacencies were eliminated):

1. The engine constructs a ghost membrane tagged with `sys::residue`.
2. The eliminated subgraph $L - R$ is moved inside this ghost membrane, preserving its exact internal adjacencies and $h_{\text{full}}$ cryptographic identity.
3. A special `sys::residue` adjacency edge is instantiated, linking the newly inserted root of $R$ directly to the ghost membrane.

### 3.3.4.2 Incremental Index and Hash Invalidation

Following the pointer root mutation:

1. **Merkle-DAG Upward Propagation:** The engine updates the $\mathbf{H}_{id}$ hash vectors of all parent membranes enclosing the modified region up to the global root.
2. **Spatial Index Eviction:** Any pre-calculated spatial query buckets (`sys::index_bucket`) invalidated by the change are flagged for lazy background re-indexing.
3. **Reactive UI Notification:** The mutation triggers a lightweight delta event over the universal synchronization bus, prompting connected UI projections (Text IDE, WebGL Canvas, Timeline) to update only the modified spatial bounding boxes.