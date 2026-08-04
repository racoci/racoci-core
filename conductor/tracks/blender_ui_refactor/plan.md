# Implementation Plan: Blender-Inspired Flexible Window Layout and 3D Projection

## Architectural Risks & Mitigation Strategy (FinOps & Safety)
- **Risk:** High computational complexity in recursive layout rendering or 3D coordinate projection, causing lag and lowering FPS.
- **Mitigation:** Optimize 3D projection rendering with dirty checking; only recalculate trigonometry when a drag occurs or nodes update. Ensure proper cleanup inside `onDestroy` hooks for all timers, canvas resizing, and event listeners to prevent memory leaks.
- **Cost:** Zero financial cost (local-only WebGL/Canvas rendering; no external AWS or API billable services needed).

---

## Phase 1: Shared State and Layout Tree Core

### - [ ] Task: Define Layout Node Schema
- **Description:** Implement `layout.ts` specifying types for SplitNode, WidgetNode, and layout operations.
- **Target File:** `ui/src/lib/layout.ts`
- **Documentation:** Inline TypeScript interfaces and structure documentation inside `layout.ts`.
- **Test Command:** Run `npm run check` in `ui/` directory.

### - [ ] Task: Implement Centralized Reactive State
- **Description:** Implement `workspaceState.svelte.ts` managing the Svelte 5 layout tree and all actions (splitting, closing, swapping, SSR transitions).
- **Target File:** `ui/src/lib/workspaceState.svelte.ts`
- **Documentation:** API doc block describing state properties and transition methods inside `workspaceState.svelte.ts`.
- **Test Command:** Run `npm run check` in `ui/` directory.

---

## Phase 2: Flexible Tiling & Window Manager

### - [ ] Task: Build Recursive Tiling Renderer
- **Description:** Implement `LayoutNode.svelte` and `PaneNode.svelte` containing vertical and horizontal splitting layout divisions and split resize handles.
- **Target Files:** `ui/src/lib/LayoutNode.svelte`, `ui/src/lib/PaneNode.svelte`
- **Documentation:** Section in `ui/README.md` on Window Manager.
- **Test Command:** Run `npm run check` in `ui/` directory.

### - [ ] Task: Build Draggable Widget Panes
- **Description:** Implement `WidgetNode.svelte` with widget-type selection dropdowns, drag-and-drop handles for layout swapping, and split/close buttons.
- **Target File:** `ui/src/lib/WidgetNode.svelte`
- **Documentation:** Inline Svelte event guidelines describing Drag and Drop protocols.
- **Test Command:** Run `npm run check` in `ui/` directory.

---

## Phase 3: Layout Views Integration

### - [ ] Task: Implement Workspaces Selection View
- **Description:** Create `WorkspacesView.svelte` listing workspaces with Name and Last Updated Date, changing active template states upon clicking.
- **Target File:** `ui/src/lib/WorkspacesView.svelte`
- **Documentation:** Descriptions of default workspaces.
- **Test Command:** Run `npm run check` in `ui/` directory.

### - [ ] Task: Wrap 2D View and Telemetry overlays
- **Description:** Port existing `App.svelte` CanvasRenderer hooks, action buttons, select overlays, and telemetry details into a modular `View2D.svelte` component.
- **Target File:** `ui/src/lib/View2D.svelte`
- **Documentation:** Inline comments explaining layout lifecycle (onMount / onDestroy of canvas listeners).
- **Test Command:** Run `npm run check` in `ui/` directory.

---

## Phase 4: Perspective 3D Viewport

### - [ ] Task: Build Perspective 3D Viewer
- **Description:** Create `View3D.svelte` utilizing HTML5 Canvas 2D context to project 3D force-directed coordinates onto the screen, with mouse drag rotating the topology.
- **Target File:** `ui/src/lib/View3D.svelte`
- **Documentation:** Math specification describing the projection of coordinates inside `View3D.svelte`.
- **Test Command:** Run `npm run check` in `ui/` directory.

---

## Phase 5: Workspace Assembly & Test Suite Verification

### - [ ] Task: Assemble App Workspace
- **Description:** Replace `App.svelte` to bind the new layout tree state to the root `LayoutNode`, and display the global header bar.
- **Target File:** `ui/src/App.svelte`
- **Documentation:** Update `ui/README.md` to reflect the new Blender-inspired UI architecture.
- **Test Command:** Run `npm run check` and `npm run build` in `ui/` directory.

### - [ ] Task: Complete Automated Testing Validation
- **Description:** Run all headless test suites (`npm test`) to guarantee zero regressions.
- **Target File:** `ui/test-dom-render.js`
- **Documentation:** Test logging and execution verification inside the report.
- **Test Command:** Run `npm test` inside `ui/` directory.
