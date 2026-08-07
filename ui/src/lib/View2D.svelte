<!-- View2D.svelte (Svelte 5) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CanvasRenderer } from './CanvasRenderer.js';
  import { workspaceState } from './workspaceState.svelte.js';

  let canvasElement = $state<HTMLCanvasElement | null>(null);
  let containerElement = $state<HTMLDivElement | null>(null);

  // Watch parsing result to update the canvas topology
  $effect(() => {
    const renderer = workspaceState.renderer;
    const parseResult = workspaceState.parseResult;
    if (renderer && parseResult) {
      renderer.updateTopology(
        parseResult.nodes,
        parseResult.edges,
        parseResult.membranes
      );
    }
  });

  // Watch background color change
  $effect(() => {
    const renderer = workspaceState.renderer;
    const bgColor = workspaceState.currentBgColor;
    if (renderer && bgColor) {
      renderer.setBackgroundColor(bgColor);
    }
  });

  // Watch selectedNode changes and sync down to the 2D renderer in real-time
  $effect(() => {
    const renderer = workspaceState.renderer;
    const activeNodeId = workspaceState.selectedNode?.id ?? null;
    if (renderer) {
      renderer.setSelectedNodeId(activeNodeId);
    }
  });

  // Watch physicsSettings changes and sync them
  $effect(() => {
    const renderer = workspaceState.renderer;
    const settings = workspaceState.physicsSettings;
    if (renderer && settings) {
      renderer.physicsSettings = settings;
    }
  });

  onMount(() => {
    if (canvasElement && containerElement) {
      // Instantiate 2D CanvasRenderer
      workspaceState.renderer = new CanvasRenderer(canvasElement, (node) => {
        workspaceState.selectedNode = node;
      });
      workspaceState.renderer.physicsSettings = workspaceState.physicsSettings; // bind physicsSettings!

      // Handle dynamic resizing
      const handleResize = () => {
        if (containerElement && workspaceState.renderer) {
          workspaceState.renderer.resize(
            containerElement.clientWidth,
            containerElement.clientHeight
          );
        }
      };

      // Set initial dimensions
      handleResize();

      // Load initial parsed state
      workspaceState.renderer.updateTopology(
        workspaceState.parseResult.nodes,
        workspaceState.parseResult.edges,
        workspaceState.parseResult.membranes
      );

      // Listen for window resize
      window.addEventListener('resize', handleResize);

      // Create a MutationObserver or ResizeObserver to support sub-panel resizing!
      // This is a brilliant Blender-specific addition! When split panels resize, 
      // the container element's width changes. We want the canvas to adapt instantly!
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerElement);

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        if (workspaceState.renderer) {
          workspaceState.renderer.destroy();
          workspaceState.renderer = null;
        }
      };
    }
  });
</script>

<div class="view2d-container">
  <!-- Interactive Canvas Area -->
  <div 
    class="canvas-container" 
    bind:this={containerElement} 
    style="background-color: {workspaceState.currentBgColor}"
  >
    <canvas bind:this={canvasElement}></canvas>

    <!-- Selected Element Inspector overlay -->
    {#if workspaceState.selectedNode}
      <div class="inspector-card">
        <div class="card-header">
          <h3>{workspaceState.selectedNode.elementType === 'edge' ? 'Edge' : 'Atom'} Properties</h3>
          <button class="close-btn" onclick={() => workspaceState.selectedNode = null}>×</button>
        </div>
        <div class="card-body">
          <div class="prop-row">
            <span class="prop-key">ID:</span>
            <span class="prop-val monospace">{workspaceState.selectedNode.id}</span>
          </div>
          <div class="prop-row">
            <span class="prop-key">LABEL:</span>
            <span class="prop-val monospace">{workspaceState.selectedNode.label}</span>
          </div>
          {#if workspaceState.selectedNode.elementType === 'edge'}
            <div class="prop-row">
              <span class="prop-key">SOURCE:</span>
              <span class="prop-val monospace">{workspaceState.selectedNode.source}</span>
            </div>
            <div class="prop-row">
              <span class="prop-key">TARGET:</span>
              <span class="prop-val monospace">{workspaceState.selectedNode.target}</span>
            </div>
          {:else}
            <div class="prop-row">
              <span class="prop-key">TYPE:</span>
              <span class="prop-val badge-type">{workspaceState.selectedNode.type}</span>
            </div>
          {/if}
          <div class="prop-row">
            <span class="prop-key">STATE:</span>
            <span class="prop-val" style="color: {workspaceState.selectedNode.isRemoved ? '#ef4444' : '#22c55e'}">
              {workspaceState.selectedNode.isRemoved ? 'RESIDUE_GHOST' : 'ACTIVE_ELEMENT'}
            </span>
          </div>
          
          {#if workspaceState.selectedNode.properties}
            <div class="props-sub-section">
              <h4>Custom Attributes</h4>
              {#each Object.entries(workspaceState.selectedNode.properties) as [key, val]}
                {#if key !== 'color'}
                  <div class="prop-row indent">
                    <span class="prop-key">{key}:</span>
                    <span class="prop-val italic">"{val}"</span>
                  </div>
                {/if}
              {/each}
            </div>
          {:else}
            <div class="props-sub-section">
              <span class="no-props">No supplementary attributes.</span>
            </div>
          {/if}

          <!-- Color palette picker -->
          <div class="props-sub-section">
            <h4>Color Palette Picker</h4>
            <div class="color-palette">
              {#each ['#ffffff', '#00d2ff', '#a855f7', '#22c55e', '#eab308', '#f97316', '#ec4899'] as color}
                <button 
                  class="color-dot {workspaceState.selectedNode.color === color || (!workspaceState.selectedNode.color && color === '#ffffff') ? 'active' : ''}" 
                  style="background-color: {color};"
                  title={color}
                  onclick={() => workspaceState.updateColor(color)}
                ></button>
              {/each}
            </div>
          </div>
          
          {#if workspaceState.selectedNode.x !== undefined && workspaceState.selectedNode.y !== undefined}
            <div class="coordinates">
              <span>COORD: X:{Math.round(workspaceState.selectedNode.x)}px Y:{Math.round(workspaceState.selectedNode.y)}px</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .view2d-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  canvas {
    display: block;
    cursor: crosshair;
  }

  /* Overlay Inspector Card */
  .inspector-card {
    position: absolute;
    top: 12px;
    left: 12px;
    width: 220px;
    background: rgba(15, 17, 26, 0.95);
    border: 1px solid #1f2833;
    border-left: 3px solid #66fcf1;
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 10;
    font-size: 10px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1f2833;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }

  .card-header h3 {
    margin: 0;
    font-size: 10px;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #45a29e;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: #ef4444;
  }

  .prop-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    line-height: 1.3;
  }

  .prop-row.indent {
    padding-left: 8px;
    border-left: 1px solid #1f2833;
  }

  .prop-key {
    color: #45a29e;
  }

  .prop-val {
    color: #c5c6c7;
  }

  .monospace {
    font-family: monospace;
  }

  .italic {
    font-style: italic;
    color: #00ffcc;
  }

  .badge-type {
    background: rgba(102, 252, 241, 0.15);
    color: #66fcf1;
    padding: 1px 3px;
    border-radius: 2px;
    font-size: 8px;
  }

  .props-sub-section {
    margin-top: 8px;
    border-top: 1px dashed #1f2833;
    padding-top: 6px;
  }

  .props-sub-section h4 {
    margin: 0 0 4px 0;
    font-size: 8px;
    color: #ffffff;
    text-transform: uppercase;
  }

  .no-props {
    color: #4f566b;
    font-style: italic;
  }

  .coordinates {
    margin-top: 8px;
    font-size: 8px;
    color: #4f566b;
    text-align: right;
  }

  /* Color Palette Dots */
  .color-palette {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    padding: 0;
    transition: all 0.1s ease-in-out;
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.4);
  }

  .color-dot:hover {
    transform: scale(1.15);
    border-color: #ffffff;
  }

  .color-dot.active {
    transform: scale(1.1);
    border-color: #66fcf1;
    box-shadow: 0 0 6px rgba(102, 252, 241, 0.5), inset 0 0 3px rgba(0, 0, 0, 0.4);
  }
</style>
