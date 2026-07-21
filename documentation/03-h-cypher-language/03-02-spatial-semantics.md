# 3.2: Spatial Semantics and Adjacency Operators

In the H-Cypher domain-specific language (DSL), syntax is not treated as a transient 1D ASCII character stream that is discarded after tokenization and lexical analysis. Syntax is a continuous, multi-dimensional topological manifold where spatial positioning, whitespace juxtaposition, nesting boundaries, and physical adjacencies act as explicit semantic operators within the adhesive hypergraph category $\mathbf{Hyper}$.

---

## 3.2.1: Spatial Positioning as Syntactic Primitives

Unlike traditional programming languages where whitespace is classified as trivia ignored by the lexer, spatial placement in Holds directly constructs the topological graph manifold inside the Stage 0 Memory Arena.

```text
 Syntactic Juxtaposition Operator (Whitespace Composition):
 Symbol "l"  [Space]  Symbol "a"  [Space]  Symbol "b"  [Space]  Symbol "c"
      |                   |                   |                   |
      v                   v                   v                   v
 +-------------------------------------------------------------------------+
 | Quaternary Hyperedge / Nested Application: (((l . a) . b) . c)          |
 +-------------------------------------------------------------------------+

```

### 3.2.1.1 Non-Concatenative Whitespace Juxtaposition

* **Active Juxtaposition Operator ($\cdot$):** Juxtaposing symbols with whitespace does not represent token separation; it instantiates an active juxtaposition operator $\cdot$ in $O(1)$ allocation time.
* **Algebraic Application and Composition:** An expression such as `l a b c` represents nested application or structural composition $(((l \cdot a) \cdot b) \cdot c)$, or alternatively a single quaternary hyperedge linking the four atoms in spatial order.
* **Compact Compositionality:** Because whitespace is an operator, complex compositions can be written compactly without cluttering syntax with redundant parenthetical noise or comma separators.

### 3.2.1.2 Scope Boundaries and Encapsulation Operators

Spatial enclosure defines scope boundaries and membrane isolation directly on the substrate:

* **Curly Braces (`{ ... }`):** Isolate local scope manifolds and property subgraphs. Properties and values are not JSON-formatted key-value pairs; they are topological adjacencies anchored inside the `{}` membrane.
* **Square Brackets (`[ ... ]`):** Define structural grouping boundaries (membranes $M$) and $n$-ary hyperedge perimeters.
* **Parentheses (`( ... )`):** Establish local evaluation ordering and node boundary anchors without creating isolated sub-membranes.

---

## 3.2.2: N-Ary Hyperedge Spatial Syntax

Standard graph query languages force all relationships into binary directed edges `(A) -[R]-> (B)`. H-Cypher elevates spatial layout to represent arbitrary $n$-ary hyperedges natively.

```text
 Positional Role Mapping in Ternary Hyperedge:
 
             (employee, project, skill) : ASSIGNMENT_EVENT
                 |          |       |
                 v          v       v
               Actor     Target  Capability

```

### 3.2.2.1 Positional Role Mapping in $N$-Ary Hyperedges

In an $n$-ary hyperedge connecting $N$ entities, positional ordering within the syntactic boundary determines semantic roles without requiring named argument parameters:

```text
(employee, project, skill) : ASSIGNMENT_EVENT

```

* **Spatial Role Inference:** The engine infers that the first position is the actor (`employee`), the second position is the target domain (`project`), and the third position is the capability constraint (`skill`).
* **Relational Renormalization:** This allows collapsing 3-way binary join cycles (e.g., `(e)-[:ASSIGNED]->(p)`, `(e)-[:HAS]->(s)`, `(p)-[:REQUIRES]->(s)`) into a single atomic ternary hyperedge via a single spatial DPO rewrite.

### 3.2.2.2 Inline Hyperedge Composition and Deep Nesting

H-Cypher supports nesting hyperedges inside other hyperedges directly without assigning intermediate temporary variables:

```text
(statement_A) -[:proven_by]-> ((proof_step_1) -[:derived_from]-> (axiom_X))

```

The engine reads the spatial embedding and automatically links the parent hyperedge `:proven_by` to the internal boundary of the nested `:derived_from` hyperedge.

---

## 3.2.3: Structural Semantics vs. Nominal JSON Attributes

In conventional systems, metadata is attached to nodes as key-value JSON objects. In Holds, attributes are structural adjacencies.

```text
 Structural Property Adjacency:
 [ Node Atom: node_raw ] ====( -[:has_name]-> )====> [ Literal Atom: "Babosa" ]

```

### 3.2.3.1 Property Adjacency Nodes

To attach a property to a node, H-Cypher constructs an adjacency edge pointing from the node to a literal value atom:

```text
{ (node_raw) -[:has_name]-> ("Babosa") }

```

When a rewrite mutates an attribute, it does not modify a record in place; it removes the binary adjacency and instantiates a higher-arity hyperedge (e.g., converting a binary `uses` link into a quaternary `extracts` hyperedge).

### 3.2.3.2 Spatial Propagation of Tags

Tags attached to a grouping boundary propagate spatially inward to all enclosed atoms unless blocked by an opaque membrane (`meta::opaque`).

---

## 3.2.4: Modular Architecture for Extended Specification Files

To maintain granular depth as the DSL specification grows, the following breakdown into specialized sub-modules governs the extended language specification:

```text
 Extended Documentation Sub-Modules:
 +---------------------------------------------------------------------------------+
 | 03-03a-subgraph-isomorphism-matching.md (VF2/WL over nested hypergraphs)        |
 +---------------------------------------------------------------------------------+
 | 03-03b-rewrite-execution-and-residues.md (DPO pushouts and sys::residue logic)  |
 +---------------------------------------------------------------------------------+
 | 03-04a-negative-constraints-and-antigraphs.md (Vacuum checking via ~ operator)  |
 +---------------------------------------------------------------------------------+
 | 03-04b-superposition-and-quantum-collapsing.md (Superposition via | operator)   |
 +---------------------------------------------------------------------------------+

```