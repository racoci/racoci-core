# 01-01: Core Primitives

The Holds environment operates on a strict minimalist ontology. It rejects complex built-in data types in favor of four foundational primitives that serve as the axiomatic base of the entire system.

## 1. The Atom
The atom is the irreducible, dimensionless unit of the Holds substrate, functioning similarly to an urelement in set theory. An atom possesses no intrinsic properties, schemas, or primitive values (like integers or strings). Its sole defining characteristic is its absolute topological identity, represented by its multi-layered hash vector (`Hid`). Atoms are the anchoring vertices for all structural computation.

## 2. Adjacency
Adjacency defines the spatial and semantic linkage between atoms. In Holds, adjacency is not a passive edge in a standard graph, but an active topological boundary. Because the system infers logic strictly through position, adjacency dictates the rules of engagement and structural inference between any two components.

## 3. Grouping (Nesting/Clustering)
Grouping allows atoms and their adjacencies to be strictly encapsulated within a distinct boundary, creating a single higher-order entity. This enables the hypergraph architecture. A bounded group is topologically equivalent to a single atom when interacting with external structures. This clustering allows the system to scale from micro-operations to macro-systems without introducing new fundamental types.

## 4. Rewriting
Rewriting is the sole mechanism of state change and computation in the environment. Defined by the fundamental transition algebraic operation `A => B`, rewriting maps a specific topological configuration (the left-hand side pattern) to a new configuration (the right-hand side). All logic, from basic arithmetic to complex user interfaces, is executed as a sequence of these structural rewrites.