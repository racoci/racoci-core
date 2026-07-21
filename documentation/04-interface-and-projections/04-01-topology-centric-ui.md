# 4.1: Topology-Centric User Interface and Dual-Pane Tiling Workspace

Traditional computing environments structure user interfaces around the document paradigm—files, lines of ASCII text, directories, and flat windows. The Holds operating substrate repudiates document-centric UI models in favor of a **Topology-Centric UI Architecture**. In Holds, there are no static files, text buffers, or canonical files on disk; all data, programs, execution states, UI layouts, and grammars exist as continuous, versioned, nested hypergraphs explored through programmable projections.

---

## 4.1.1: Rejection of Document-Centric Computing

In standard software engineering, the source code text is treated as the primary "truth," while ASTs (Abstract Syntax Trees), debuggers, and visual graphs are secondary, ephemeral artifacts. Holds reverses this relationship completely.

* **Hypergraph as Single Source of Truth:** Text, visual diagrams, relational tables, and timeline trees are merely ephemeral, user-selectable views (Projections) projected from the underlying hypergraph substrate.
* **Elimination of Buffer Desynchronization:** Because there are no text buffers stored independently from the execution memory, parsing errors caused by out-of-sync text files are structurally impossible. Editing a character in a text projection mutates the hypergraph instantly via localized AST rewrites.
* **Spatial Memory and Non-Linear Code Layouts:** Code and data are organized spatially using topological nesting and proximity rather than arbitrary file paths. Modules are defined by grouping membranes (`[ M ]`), allowing developers to navigate codebases via spatial traversal rather than scrolling through thousands of lines of text.

---

## 4.1.2: Dual-Pane Tiling Workspace Architecture

The primary workspace interface in Holds is a synchronized **Dual-Pane Tiling Environment** designed for real-time bidirectional editing between textual representations and graphical topological structures.

```text
+------------------------------------------+------------------------------------------+
|  Pane 1: Textual Projection (H-Cypher)   |   Pane 2: Spatial WebGL Hypergraph View  |
|------------------------------------------|------------------------------------------|
| MATCH {                                  |                 (A)                      |
|   (a) -[:DEPENDS_ON]-> (b),              |                /   \                     |
|   [ M ~ (a) -[:INHIBIT]-> (b) ]          |               v     v                    |
| }                                        |             [ M ]---(B)                  |
| TRANSITION => {                          |               |                          |
|   (a) -[:VALIDATED]-> (b)                |               v                          |
| }                                        |          {sys::residue}                  |
+------------------------------------------+------------------------------------------+
|            Universal State Synchronization Bus (WASM / SharedArrayBuffer)          |
+-------------------------------------------------------------------------------------+

```

### 4.1.1.1 Bidirectional Real-Time Synchronization

* **Text-to-Graph Mutation:** As the user types H-Cypher code in Pane 1, incremental parser rules ($L \implies R$) parse the AST directly into arena hypergraph nodes. Pane 2 immediately re-layouts and animates the modified subgraphs without full-page re-renders.
* **Graph-to-Text Generation:** Manipulating nodes visually in Pane 2 (e.g., dragging an edge between two components or nesting a cluster inside a membrane) generates the corresponding H-Cypher rewrite rule in Pane 1 in real time.

### 4.1.1.2 High-Frequency Event Loop

The dual-pane architecture operates over a shared WebAssembly (`src/wasm/`) memory space. State mutations emit delta events over a high-frequency `SharedArrayBuffer` event channel, maintaining 60 FPS rendering performance even during heavy graph transformations.

---

## 4.1.3: Multi-Projection Workspace and Projection Composition

Because no single representation can convey all aspects of a complex hypergraph, Holds provides a **Multi-Projection Workspace** where users can instantiate and compose orthogonal views into the same underlying structure.

### 4.1.3.1 Canonical Projection Types

1. **Structure Projection:** Displays pure node-edge-membrane topology ($h_{topo}$ view), isolating spatial relationships from semantic attributes.
2. **Properties & Metadata Projection:** Displays key-value property adjacencies and attribute subgraphs attached to selected nodes.
3. **Relations & Homology Projection:** Highlights higher-order topological features, such as $n$-ary hyperedges, Betti numbers, boundary cycles, and connected components.
4. **Time & Audit Projection:** Displays the historical trajectory of the hypergraph, exposing `sys::residue` branches, version timestamps, and provenance vectors.

### 4.1.3.2 Projection Composition Mechanics

Users can stack or composite multiple projection layers onto a single viewport using algebraic projection operators:

$$\text{ComposedView} = \text{Projection}_{\text{Structure}} \oplus \text{Projection}_{\text{Time}} \oplus \text{Projection}_{\text{Properties}}$$

For example, compositing *Structure + Time* renders the active hypergraph overlaid with ghosted historical pathways, allowing developers to see where nodes existed prior to historical rewrites.

---

## 4.1.4: Topological Diff and Proof Tracing Mechanics

When observing state changes or debug traces, Holds replaces line-based text diffs (`git diff`) with **Topological Diffs** and **Proof Tracing Illuminations**.

### 4.1.4.1 Topological Diff Visualizations

When a rewrite rule $L \implies R$ modifies a subgraph, the visual projection renders a continuous spatial differential:

* **Added Subgraphs ($R - L$):** Newly created atoms, adjacencies, or membranes illuminate in high-contrast green glow.
* **Removed Subgraphs ($L - R$):** Eliminated subgraphs do not disappear instantly; they turn translucent red, shrink, and visually glide into an attached `sys::residue` ghost membrane.
* **Unmodified Subgraphs ($L \cap R$):** Remain completely static, anchoring the spatial orientation of the user's viewport.

### 4.1.4.2 Proof Tracing and Execution Path Illumination

When the engine executes complex theorem proving, logic evaluation, or deep pattern matching across nested hypergraphs:

1. **Path Illumination:** The UI draws an illuminated, animated vector trail directly along the hypergraph edges and membranes evaluated during rule matching.
2. **Success/Failure Visual State:** Successfully evaluated match paths pulse blue/gold, while failed match branches flash red at the exact node or vacuum constraint (`~`) where isomorphism failed.
3. **Inspectable Step-by-Step Step-Over:** Developers can step forward and backward through individual $L \implies R$ execution steps using timeline controls, watching the topological diff evolve dynamically across the spatial canvas.