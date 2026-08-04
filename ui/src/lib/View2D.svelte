<!-- View2D.svelte (Svelte 5) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CanvasRenderer } from './CanvasRenderer.js';
  import { workspaceState } from './workspaceState.svelte.js';

  let canvasElement = $state<HTMLCanvasElement | null>(null);
  let containerElement = $state<HTMLDivElement | null>(null);

  // Watch parsing result to update the canvas topology
  $effect(() => {
    if (workspaceState.renderer && workspaceState.parseResult) {
      workspaceState.renderer.updateTopology(
        workspaceState.parseResult.nodes,
        workspaceState.parseResult.edges,
        workspaceState.parseResult.membranes
      );
    }
  });

  // Watch background color change
  $effect(() => {
    if (workspaceState.renderer && workspaceState.currentBgColor) {
      workspaceState.renderer.setBackgroundColor(workspaceState.currentBgColor);
    }
  });

  onMount(() => {
    if (canvasElement && containerElement) {
      // Instantiate 2D CanvasRenderer
      workspaceState.renderer = new CanvasRenderer(canvasElement, (node) => {
        workspaceState.selectedNode = node;
      });

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

  <!-- Smart SSR Refactoring Simulator Controls -->
  <div class="ssr-simulator-bar">
    <span class="ssr-bar-title">Smart SSR:</span>
    <select 
      class="template-select" 
      value={workspaceState.selectedTemplate} 
      onchange={(e) => workspaceState.selectTemplate(e.currentTarget.value)}
    >
      <option value="default">Select Paradigm Template...</option>
      <option value="forth">Forth (Concatenative)</option>
      <option value="clojure">Clojure (Homoiconic)</option>
      <option value="haskell">Haskell (Monadic/Transformer)</option>
      <option value="prolog">Prolog (Logical DCG)</option>
    </select>
    
    <button class="btn btn-refactor" onclick={() => workspaceState.runSmartRefactor()} title="Execute category-theoretic DPO rewrite">
      ⚡ Run Refactor
    </button>

    <span class="divider">|</span>

    <button class="btn btn-ssr" onclick={() => workspaceState.ssrReorder()} title="Swap Term Order">
      Swap A+B
    </button>
    <button class="btn btn-ssr" onclick={() => workspaceState.ssrFlatten()} title="Flatten Nested Conditionals">
      Flatten Ifs
    </button>
    <button class="btn btn-ssr" onclick={() => workspaceState.ssrSafeSwap()} title="Invert Nested Scopes Safely">
      Safe Swap (~)
    </button>
  </div>

  <!-- General Viewport actions -->
  <footer class="canvas-controls">
    <button class="btn btn-primary" onclick={() => workspaceState.triggerTransition()} title="Transition active subgraphs to Residue channels">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Trigger Transition (L ⇒ R)
    </button>
    <button class="btn btn-secondary" onclick={() => workspaceState.illuminateProof()} title="Trace evaluation trails along isomorphic pathways">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      Isomorphism Proof Trace
    </button>
    <button class="btn btn-tertiary" onclick={() => workspaceState.injectFormula()}>
      + Atom
    </button>
    <button class="btn btn-icon" onclick={() => workspaceState.clearWorkspace()} title="Reset Workspace">
      Reset
    </button>
  </footer>
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

  /* Smart SSR Simulator Bar */
  .ssr-simulator-bar {
    display: flex;
    gap: 8px;
    padding: 6px 12px;
    background: #12131c;
    border-top: 1px solid #1f2833;
    align-items: center;
    font-size: 10px;
    z-index: 10;
    flex-wrap: wrap;
    box-sizing: border-box;
  }

  .ssr-bar-title {
    color: #a855f7;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(168, 85, 247, 0.4);
    letter-spacing: 0.5px;
    margin-right: 2px;
  }

  .template-select {
    background: #1f2833;
    color: #ffffff;
    border: 1px solid #45a29e;
    border-radius: 3px;
    padding: 4px 8px;
    font-size: 10px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }

  .btn-refactor {
    background: #a855f7;
    color: #ffffff;
    border: none;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(168, 85, 247, 0.2);
    font-size: 10px;
  }

  .btn-refactor:hover {
    background: #c084fc;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
  }

  .divider {
    color: #1f2833;
    font-weight: bold;
    margin: 0 2px;
  }

  .btn-ssr {
    background: rgba(168, 85, 247, 0.05);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.25);
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
  }

  .btn-ssr:hover {
    background: rgba(168, 85, 247, 0.12);
    border-color: #a855f7;
    color: #ffffff;
  }

  /* Controls Bar at bottom */
  .canvas-controls {
    display: flex;
    gap: 8px;
    padding: 6px 12px;
    background: #0f1016;
    border-top: 1px solid #1f2833;
    height: 32px;
    box-sizing: border-box;
    align-items: center;
  }

  .btn {
    font-family: inherit;
    font-size: 10px;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease-in-out;
    border: 1px solid transparent;
  }

  .btn-primary {
    background-color: #22c55e;
    color: #052e16;
  }

  .btn-primary:hover {
    background-color: #4ade80;
  }

  .btn-secondary {
    background-color: #eab308;
    color: #422006;
  }

  .btn-secondary:hover {
    background-color: #facc15;
  }

  .btn-tertiary {
    background-color: transparent;
    border-color: #45a29e;
    color: #66fcf1;
  }

  .btn-tertiary:hover {
    background-color: rgba(102, 252, 241, 0.05);
  }

  .btn-icon {
    background-color: transparent;
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.2);
    margin-left: auto;
  }

  .btn-icon:hover {
    background-color: rgba(239, 68, 68, 0.08);
  }
</style>
