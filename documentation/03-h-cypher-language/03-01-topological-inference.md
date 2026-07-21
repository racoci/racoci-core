# 03-01: Positional Type Inference and Structural Typing

In the H-Cypher domain-specific language (DSL), typing is not nominal, explicit, or scalar-bound. There are no language keywords like `int`, `string`, `class`, or `interface`, nor are variables explicitly annotated with type declarations. Instead, type signatures in Holds are purely structural and positionally inferred from hypergraph topology.

---

## 1. Topological Position as Type Signature

An entity’s "type" in Holds is defined as the equivalence class of its topological position within a nested hypergraph pattern. When a node or hyperedge appears in a rewrite expression, the engine determines its operational type $\tau(v)$ by evaluating its local adjacency manifold:

$$\tau(v) = \left\langle \text{deg}_{in}(v), \text{deg}_{out}(v), \text{Arity}(e_i), \text{MembraneDepth}(v), H_{topo}(N(v)) \right\rangle$$

Where:

* $\text{deg}_{in}, \text{deg}_{out}$ represent directed edge counts.
* $\text{Arity}(e_i)$ represents the dimensional arity of hyperedges incident to $v$.
* $\text{MembraneDepth}(v)$ specifies the nesting level within enclosing grouping boundaries.
* $H_{topo}(N(v))$ is the topological hash of $v$'s immediate neighborhood $N(v)$.

If two distinct nodes across different parts of a global hypergraph occupy identical positions within isomorphic subgraphs, they are structurally typed as identical by the matcher.

---

## 2. Implicit Positional Typing in Rewrite Rules

When defining a structural rewrite rule $L \implies R$, variable names used within $L$ are merely temporary topological handles. Repeating a symbol across hyperedges does not denote a nominal variable binding; it instructs the engine to enforce structural identity across those positions.

Consider a database renormalization rule collapsing a relational cycle:

```text
MATCH {
  (e) -[:ASSIGNED_TO]-> (p),
  (e) -[:HAS_SKILL]-> (s),
  (p) -[:REQUIRES_SKILL]-> (s)
}

```

The symbols `e`, `p`, and `s` have no explicit types declared. The engine infers:

* `e` is of type $\tau(e)$: an entity acting as a dual source for `ASSIGNED_TO` and `HAS_SKILL`.
* `p` is of type $\tau(p)$: an entity acting as a target for `ASSIGNED_TO` and a source for `REQUIRES_SKILL`.
* `s` is of type $\tau(s)$: a sink node receiving adjacencies from both `e` and `p`.

Type unification occurs automatically during pattern matching through subgraph isomorphism verification.

---

## 3. Structural Type Checking as Isomorphism Matching

In traditional computing, type checking happens prior to execution via static analysis. In Holds, type checking **is** pattern matching.

A rewrite rule $L \implies R$ is well-typed over a target hypergraph $G$ if and only if there exists a valid monomorphism $f: L \to G$. If $f$ cannot be established because a node in $G$ lacks the required incident hyperedges or boundary encapsulation demanded by $L$, a structural type mismatch is raised.

Because type checking operates via $O(1)$ membrane hash comparisons ($h_{type}$) and localized graph traversals, structural type validation requires no central type-registry lookups.

---

## 4. Higher-Order Structural Types and Polymorphism

Polymorphism in H-Cypher arises naturally through subgraph subsumption:

* **Morphic Subtyping:** If pattern $A$ is a subgraph of pattern $B$ ($A \subset B$), then any concrete hypergraph that satisfies type $\tau(B)$ automatically satisfies type $\tau(A)$. This yields structural subtyping without class inheritance hierarchies.
* **Parametric Topology:** Patterns containing unconstrained grouping boundaries act as parametric or generic types. A rule defined over an arbitrary membrane `[ M ]` can match any nested hypergraph regardless of its internal complexity, operating as a universally quantified higher-order structural type.