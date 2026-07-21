# RACOCI Core

**Rewrite Architecture for Compositional Operations in Categorical Isomorphisms**

Welcome to the core implementation repository for **RACOCI**, the native structural rewrite language of the Holds computing environment.

## What is RACOCI?

RACOCI is a purely structural Domain-Specific Language (DSL) where the primitive operation is a **topological rewrite** ($A \implies B$).

In the Holds ecosystem, everything is a nested hypergraph. RACOCI provides the mathematical and programmatic interface to mutate, query, and reason about these structures by manipulating adjacencies, boundaries (membranes), and isomorphic contexts.

## Core Principles

* **Rewrite-First Computation:** Every operation—whether it is database renormalization, theorem proving, semantic zooming, or logic simplification—is expressed as a structural rewrite rule ($L \implies R$).
* **Categorical Isomorphisms:** The language relies on strict structural hashing ($h_{topo}$). If two topologies share the exact same shape and context, they share the same hash, allowing $O(1)$ structural comparisons without deep traversals.
* **Structural Uniformity:** There are no privileged, hardcoded domain concepts. Types, functions, and logic emerge natively from the topological arrangement of the data.
* **Topological Diffing:** Rewrites do not produce traditional text diffs; they produce spatial, topological diffs where nodes and subgraphs can be mapped visually as additions, removals, or static elements.

## Example: Collapsing a Cycle (Database Renormalization)

RACOCI maps a left-hand topology (e.g., an unoptimized 3-way cycle of independent relations) and collapses it into a single, indivisible $N$-way hyperedge on the right.

> (e: Employee) -[r1]-> (p: Project)
> (p) -[r2]-> (s: Skill)
> (e) -[r3]-> (s)
> =>
> (e) -[WorksOnWithSkill]-> (p, s)

## Repository Architecture

This repository contains the core Rust implementation of the RACOCI engine (designed to compile to WebAssembly for browser-side execution):

* **src/parser/**: Translates textual RACOCI syntax into the internal hypergraph representation.
* **src/matcher/**: The pattern-matching engine for identifying subgraphs and resolving non-well-founded topologies (handling infinite recursion and Klein bottle/Möbius strip topologies via Spin -1 membranes).
* **src/engine/**: The core rewrite execution kernel ($L \implies R$).
* **src/hash/**: The $h_{topo}$ structural identity calculation module.
* **src/wasm/**: WebAssembly bindings for running the rewrite engine directly in the browser, transferring compute costs to the client and enabling FinOps through immutability.

## Getting Started

To build the core engine locally, you will need the latest stable version of Rust.

**Clone the repository:**

> git clone [https://github.com/racoci/racoci-core.git](https://www.google.com/search?q=https://github.com/racoci/racoci-core.git)
> cd racoci-core

**Build the project:**

> cargo build --release

**Run the test suite:**

> cargo test

*(The test suite includes structural verification, $O(1)$ isomorphism hash checks, and non-well-founded cycle handling).*

## Contributing

RACOCI is part of the Holds universal substrate for structural computation. We welcome contributions in topological logic, performance optimizations (especially regarding subgraph isomorphism algorithms), and WASM interoperability.

## License

This project is licensed under the MIT License.