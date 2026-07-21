# 03-02: Spatial Semantics and Adjacency Operators

In the H-Cypher language (also known as R.A.C.O.C.I.), syntax is not treated as a linear ASCII character stream that is discarded after parsing. Syntax is a continuous, multi-dimensional topological manifold where spatial positioning, white space, nesting, and physical adjacency act as explicit semantic operators.

---

## 1. Spatial Positioning as Syntactic Primitives

Unlike traditional languages where white space is trivia ignored by the lexer, spatial placement in Holds directly constructs the topological graph.

### 1.1 White Space as Structural Composition (`l a b c`)

* 
**Non-Concatenative Juxtaposition:** Juxtaposing symbols with white space does not represent token separation; it instantiates an active juxtaposition operator $\cdot$.


* 
**Application and Composition:** An expression such as `l a b c` represents nested application or structural composition $(((l \cdot a) \cdot b) \cdot c)$, or alternatively a single quaternary hyperedge linking the four nodes in spatial order.


* 
**Compact Compositionality:** Because white space is an operator, complex compositions can be written compactly without cluttering syntax with redundant parentheses or commas.



### 1.2 Boundary Encapsulation and Scope Membranes

Spatial enclosure defines scope boundaries (membranes) directly on the substrate:

* 
**Curly Braces (`{ ... }`):** Isolate local scope manifolds and property subgraphs. Properties and values are not JSON-formatted key-value pairs; they are topological adjacencies anchored inside the `{}` membrane.


* 
**Square Brackets (`[ ... ]`):** Define structural grouping boundaries and hyperedge membranes.


* **Parentheses (`( ... )`):** Establish local evaluation ordering and node boundary anchors without creating isolated sub-membranes.

---

## 2. N-Ary Hyperedge Spatial Syntax

Standard graph query languages (such as Cypher) force all relationships into binary directed edges `(A) -[R]-> (B)`. R.A.C.O.C.I. elevates spatial layout to represent arbitrary $n$-ary hyperedges natively.

### 2.1 Positional Role Mapping in $N$-Ary Hyperedges

In an $n$-ary hyperedge connecting $N$ entities, positional ordering within the syntactic boundary determines semantic roles without requiring named argument parameters:

```text
(employee, project, skill) : ASSIGNMENT_EVENT

```

* **Spatial Role Inference:** The engine infers that the first position is the actor (`employee`), the second position is the target domain (`project`), and the third position is the capability constraint (`s`).
* 
**Relational Renormalization:** This allows collapsing 3-way binary join cycles (e.g., `(e)-[ASSIGNED]->(p)`, `(e)-[HAS]->(s)`, `(p)-[REQUIRES]->(s)`) into a single atomic ternary hyperedge via a single spatial rewrite.



### 2.2 Inline Hyperedge Composition and Deep Nesting

H-Cypher supports nesting hyperedges inside other hyperedges directly without assigning intermediate temporary variables:

```text
(statement_A) -[:proven_by]-> ((proof_step_1) -[:derived_from]-> (axiom_X))

```

The engine reads the spatial embedding and automatically links the parent hyperedge `:proven_by` to the internal boundary of the nested `:derived_from` hyperedge.

---

## 3. Structural Semantics vs. Nominal JSON Attributes

In conventional systems, metadata is attached to nodes as key-value JSON objects. In Holds, attributes are structural adjacencies.

### 3.1 Property Adjacency Nodes

To attach a property to a node, H-Cypher constructs an adjacency edge pointing from the node to a value atom:

```text
{ (node_raw) -[:has_name]-> ("Babosa") }

```

When a rewrite mutates an attribute, it does not modify a record in place; it removes the binary adjacency and instantiates a higher-arity hyperedge (e.g., converting a binary `uses` link into a quaternary `extracts` hyperedge).

### 3.2 Spatial Propagation of Tags

Tags attached to a grouping boundary propagate spatially inward to all enclosed atoms unless blocked by an opaque membrane (`meta::opaque`).

---

## 4. Suggested Sub-Modules for Extended Documentation

To maintain granular depth as the DSL specification grows, the following breakdown into specialized sub-files is recommended for future context loading:

* 
`03-03a-subgraph-isomorphism-matching.md` (Detailed algorithmic spec for VF2/WL pattern matching over nested hypergraphs) 


* 
`03-03b-rewrite-execution-and-residues.md` (Step-by-step state transition and `sys::residue` generation logic) 


* 
`03-04a-negative-constraints-and-antigraphs.md` (Vacuum checking via `~` operator) 


* 
`03-04b-superposition-and-quantum-collapsing.md` (Superposition matching via `|` operator for non-deterministic AI inputs)