<!-- PaneNode.svelte -->
<script lang="ts">
  import type { SplitNode } from './layout.js';
  import LayoutNode from './LayoutNode.svelte';

  // Props using Svelte 5 runes
  let { node }: { node: SplitNode } = $props();

  let containerElement = $state<HTMLDivElement | null>(null);
  let isResizing = $state(false);

  function startResize(e: MouseEvent) {
    e.preventDefault();
    isResizing = true;
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing || !containerElement) return;
    const rect = containerElement.getBoundingClientRect();
    let percentage = 50;

    if (node.split === 'vertical') {
      const clientX = e.clientX;
      percentage = ((clientX - rect.left) / rect.width) * 100;
    } else {
      const clientY = e.clientY;
      percentage = ((clientY - rect.top) / rect.height) * 100;
    }

    // Clamp partition between 10% and 90% for layout sanity
    node.percent = Math.max(10, Math.min(90, percentage));
  }

  function stopResize() {
    isResizing = false;
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
  }
</script>

<div 
  bind:this={containerElement} 
  class="pane-split {node.split}" 
  style="flex-direction: {node.split === 'vertical' ? 'row' : 'column'};"
>
  <!-- First partition child -->
  <div 
    class="split-child first" 
    style="{node.split === 'vertical' ? `width: ${node.percent}%;` : `height: ${node.percent}%;`}"
  >
    <LayoutNode node={node.children[0]} />
  </div>
  
  <!-- Resize slider bar handle -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="split-handle" 
    class:active={isResizing} 
    onmousedown={startResize}
    title="Drag border to resize"
  >
    <div class="split-knob"></div>
  </div>
  
  <!-- Second partition child -->
  <div 
    class="split-child second" 
    style="{node.split === 'vertical' ? `width: ${100 - node.percent}%;` : `height: ${100 - node.percent}%;`}"
  >
    <LayoutNode node={node.children[1]} />
  </div>
</div>

<style>
  .pane-split {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
    background-color: #0c0d14;
  }

  .split-child {
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: none; /* overrides default flex grow/shrink */
  }

  .split-handle {
    background-color: #0c0d14;
    position: relative;
    z-index: 5;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.1s ease-in-out, box-shadow 0.1s ease-in-out;
  }

  .pane-split.vertical > .split-handle {
    width: 4px;
    height: 100%;
    cursor: col-resize;
    border-left: 1px solid rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(255, 255, 255, 0.03);
  }

  .pane-split.horizontal > .split-handle {
    height: 4px;
    width: 100%;
    cursor: row-resize;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .split-handle:hover, .split-handle.active {
    background-color: #00ffcc;
    box-shadow: 0 0 8px #00ffcc;
  }

  .split-knob {
    width: 2px;
    height: 2px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
</style>
