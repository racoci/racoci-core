# 01-02: Hypergraph Mechanics

Holds abandons flat, strictly bipartite graph topologies in favor of directed, nested hypergraphs. This structure is essential for modeling highly dimensional systems and preserving referential integrity during isomorphic transformations.

## Nested Boundaries and Abstraction
Every node (atom or group) in Holds can internally contain an entire localized graph, and every edge (adjacency) can act as a node to receive other edges. This recursive nesting supports infinite levels of abstraction. Computations and queries can traverse these boundaries, but the internal complexity of a nested structure is only evaluated when the topological context strictly requires it.

## Directed Flow
Adjacencies within the hypergraph are strictly directed. This directionality establishes the flow of morphisms and the valid application vectors for rewrite rules. In a continuous structural environment, directionality ensures that transitions `A => B` maintain vector consistency and do not collapse into undefined states.

## Topological Equivalence
Because the system relies on graph isomorphisms rather than standard variable evaluation, the mechanics of the hypergraph guarantee that if two nested structures share the exact same topology and adjacency mapping, they are treated as computationally identical by the rewrite engine.