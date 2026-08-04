<!-- WidgetNode.svelte -->
<script lang="ts">
  import type { WidgetNode as WidgetNodeType } from './layout.js';
  import { workspaceState } from './workspaceState.svelte.js';
  import HCypherEditor from './HCypherEditor.svelte';
  import View2D from './View2D.svelte';
  import View3D from './View3D.svelte';
  import WorkspacesView from './WorkspacesView.svelte';
  import SSRSimulatorView from './SSRSimulatorView.svelte';

  // Props using Svelte 5 runes
  let { node }: { node: WidgetNodeType } = $props();

  let isDraggingHeader = $state(false);
  let isDragOver = $state(false);

  const widgetTypes = [
    { value: 'editor', label: 'Editor (H-Cypher)', icon: '✏️' },
    { value: 'canvas', label: '2D View (Hypergraph)', icon: '👁️' },
    { value: 'projection3d', label: '3D View (Projection)', icon: '🌐' },
    { value: 'workspaces', label: 'Workspaces List', icon: '🗂️' },
    { value: 'ssr_simulator', label: 'Smart SSR Simulator', icon: '⚡' }
  ];

  function handleDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
      isDraggingHeader = true;
    }
  }

  function handleDragEnd() {
    isDraggingHeader = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    if (e.dataTransfer) {
      const sourceId = e.dataTransfer.getData('text/plain');
      if (sourceId && sourceId !== node.id) {
        workspaceState.swapWidgets(sourceId, node.id);
      }
    }
  }

  function handleSplit(direction: 'vertical' | 'horizontal') {
    workspaceState.splitPane(node.id, direction);
  }

  function handleClose() {
    workspaceState.closePane(node.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="widget-pane" 
  class:drag-over={isDragOver}
  ondragover={handleDragOver} 
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <!-- Window/Widget Header Bar -->
  <header 
    class="widget-header" 
    draggable="true" 
    class:dragging={isDraggingHeader}
    ondragstart={handleDragStart} 
    ondragend={handleDragEnd}
  >
    <div class="header-left">
      <!-- Blender-style drop-down type selector -->
      <select class="widget-type-select" bind:value={node.widgetType}>
        {#each widgetTypes as type}
          <option value={type.value}>{type.icon} {type.label}</option>
        {/each}
      </select>
    </div>

    <!-- Drag area handle -->
    <div class="header-center drag-handle">
      <span class="drag-dots">⋮:::</span>
      <span class="header-title">{widgetTypes.find(t => t.value === node.widgetType)?.label}</span>
    </div>

    <div class="header-right">
      <!-- Blender splitting actions -->
      <button class="header-btn" onclick={() => handleSplit('vertical')} title="Split Vertically (Columns)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/></svg>
      </button>
      <button class="header-btn" onclick={() => handleSplit('horizontal')} title="Split Horizontally (Rows)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/></svg>
      </button>
      <button class="header-btn close" onclick={handleClose} title="Close Pane">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  </header>

  <!-- Widget main body viewport -->
  <div class="widget-content">
    {#if node.widgetType === 'editor'}
      <div class="editor-viewport">
        <HCypherEditor bind:value={workspaceState.hCypherCode} bgColor={workspaceState.currentBgColor} />
      </div>
    {:else}
      {#if node.widgetType === 'canvas'}
        <View2D />
      {:else if node.widgetType === 'projection3d'}
        <View3D />
      {:else if node.widgetType === 'workspaces'}
        <WorkspacesView />
      {:else if node.widgetType === 'ssr_simulator'}
        <SSRSimulatorView />
      {/if}
    {/if}
  </div>
</div>

<style>
  .widget-pane {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #0b0c10;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.015);
    transition: all 0.15s ease-in-out;
  }

  .widget-pane.drag-over {
    border: 1px dashed #a855f7;
    background-color: rgba(168, 85, 247, 0.04);
    box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.15);
  }

  .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #141620;
    border-bottom: 1px solid #1f2833;
    padding: 4px 12px;
    height: 30px;
    user-select: none;
    box-sizing: border-box;
  }

  .widget-header:hover {
    background-color: #171926;
  }

  .widget-header.dragging {
    opacity: 0.5;
    background-color: #2b3040;
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .widget-type-select {
    background-color: #0d0e15;
    color: #45a29e;
    border: 1px solid rgba(69, 162, 158, 0.3);
    border-radius: 3px;
    font-size: 10px;
    font-family: inherit;
    padding: 2px 6px;
    outline: none;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.15s ease-in-out;
  }

  .widget-type-select:focus, .widget-type-select:hover {
    border-color: #66fcf1;
    color: #ffffff;
    box-shadow: 0 0 5px rgba(102, 252, 241, 0.2);
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    cursor: grab;
    height: 100%;
  }

  .drag-dots {
    color: #3b4252;
    font-weight: bold;
    letter-spacing: -1px;
    font-size: 10px;
  }

  .header-title {
    font-size: 10px;
    color: #8b9bb4;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .header-btn {
    background: transparent;
    border: none;
    color: #45a29e;
    cursor: pointer;
    padding: 3px;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease-in-out;
  }

  .header-btn:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: #66fcf1;
  }

  .header-btn.close:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }

  .widget-content {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: #08080c;
    width: 100%;
    height: 100%;
  }

  .editor-viewport {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
