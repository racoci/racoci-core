<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { parseHCypher } from './lib/HCypherParser';
  import { CanvasRenderer } from './lib/CanvasRenderer';

  // 1. Pre-populated H-Cypher code matching the Holds stage-0 kernel
  let hCypherCode = $state(`// Holds Kernel Topology Rules
// MATCH the stage-0 kernel and its dependency structure
MATCH {
  (kernel {role: "kernel", zone: "stage-0"}) -[:DEPENDS_ON]-> (parser),
  (parser {role: "parser"}) -[:DEPENDS_ON]-> (sync),
  (sync) -[:SYNCS_WITH]-> (memory)
}

// Group core components inside a safety membrane
[ KERNEL_SAFETY_ZONE ~ kernel, parser, sync ]

// Active system processes
(task_queue) -[:ROUTES_TO]-> (kernel)
(task_queue) -[:BUFFERED_BY]-> (memory)
`);

  // 2. DOM references
  let canvasElement: HTMLCanvasElement | null = $state(null);
  let containerElement: HTMLElement | null = $state(null);

  // 3. Simulation & state
  let renderer: CanvasRenderer | null = null;
  let selectedNode = $state<any>(null);
  let systemStatus = $state("IDLE (LOCK_FREE_BUS_SYNC)");
  let wasmMemoryUsage = $state(128.4); // KB representation
  let frameRate = $state(60);

  // Stats derived from H-Cypher parser
  let parseResult = $derived(parseHCypher(hCypherCode));
  let atomCount = $derived(parseResult.nodes.length);
  let edgeCount = $derived(parseResult.edges.length);
  let membraneCount = $derived(parseResult.membranes.length);

  // Watch parser results and update topology in CanvasRenderer
  $effect(() => {
    if (renderer && parseResult) {
      renderer.updateTopology(
        parseResult.nodes,
        parseResult.edges,
        parseResult.membranes
      );
    }
  });

  onMount(() => {
    if (canvasElement && containerElement) {
      // Create renderer
      renderer = new CanvasRenderer(canvasElement, (node) => {
        selectedNode = node;
      });

      // Handle resizing
      const handleResize = () => {
        if (containerElement && renderer) {
          renderer.resize(
            containerElement.clientWidth,
            containerElement.clientHeight
          );
        }
      };

      // Set initial size
      handleResize();
      window.addEventListener('resize', handleResize);

      // Simulate minor FPS fluctuation to look alive
      const fpsInterval = setInterval(() => {
        frameRate = Math.floor(58 + Math.random() * 3);
        // Slightly fluctuate simulated shared memory to show activity
        wasmMemoryUsage = parseFloat((128.4 + Math.sin(Date.now() / 1000) * 2).toFixed(2));
      }, 1000);

      return () => {
        window.removeEventListener('resize', handleResize);
        clearInterval(fpsInterval);
        if (renderer) renderer.destroy();
      };
    }
  });

  // Action: Trigger a topological transition animation (L => R rewrite)
  function handleTriggerTransition() {
    systemStatus = "REWRITING... SUBGRAPH L => R";
    if (renderer) {
      renderer.triggerDemoTransition();
    }
    
    // Simulate updating the editor text to show new state
    setTimeout(() => {
      hCypherCode += `\n// Rewritten state applied\n(sync) -[:REWRITES]-> (kernel)\n`;
      systemStatus = "TRANSITION COMPLETED";
    }, 1500);

    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
    }, 4000);
  }

  // Action: Illustrate step-by-step theorem proving evaluation path
  function handleIlluminateProof() {
    systemStatus = "ILLUMINATING ISOMORPHISM EVALUATION PATH";
    if (renderer) {
      renderer.illuminatePath(["kernel", "parser", "sync", "memory"]);
    }

    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (renderer) renderer.illuminatePath([]);
    }, 6000);
  }

  // Action: Append a new node/edge formula to the text
  function handleInjectFormula() {
    hCypherCode += `\n(user_interface) -[:PROJECTS]-> (task_queue)\n`;
  }

  // Action: Reset workspace to raw default
  function handleClearWorkspace() {
    hCypherCode = `(kernel) -> (parser)`;
    selectedNode = null;
  }
</script>

<div class="workspace">
  <!-- Top Header Bar -->
  <header class="workspace-header">
    <div class="logo-area">
      <span class="pulse-dot"></span>
      <span class="title">RACOCI Holds Substrate</span>
      <span class="sub-title">Topological Dual-Pane Workspace</span>
    </div>
    
    <!-- Real-time Status Telemetry indicators -->
    <div class="telemetry">
      <div class="stat">
        <span class="stat-label">BUS STATE:</span>
        <span class="stat-val status-highlight">{systemStatus}</span>
      </div>
      <div class="stat">
        <span class="stat-label">WASM STATE_MEM:</span>
        <span class="stat-val">{wasmMemoryUsage} KB</span>
      </div>
      <div class="stat">
        <span class="stat-label">RENDERING LOCK:</span>
        <span class="stat-val cyan-highlight">{frameRate} FPS</span>
      </div>
    </div>
  </header>

  <!-- Main Split Layout -->
  <main class="pane-container">
    
    <!-- PANE 1: Textual Projection Editor (Left) -->
    <section class="pane left-pane">
      <div class="pane-header">
        <span class="badge">Projection A</span>
        <h2>H-Cypher Algebraic Spec</h2>
        <span class="extension">.hcypher</span>
      </div>
      
      <div class="editor-container">
        <textarea 
          bind:value={hCypherCode}
          placeholder="// Enter H-Cypher declarations..."
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Quick inject buttons / helpful syntax -->
      <div class="editor-footer">
        <div class="syntax-tips">
          <span><strong>Quick Syntax:</strong> <code>(a) -> (b)</code> Edge | <code>[M ~ a]</code> Membrane</span>
        </div>
      </div>
    </section>

    <!-- PANE 2: Spatial WebGL Hypergraph Projection (Right) -->
    <section class="pane right-pane">
      <div class="pane-header">
        <span class="badge secondary">Projection B</span>
        <h2>Spatial Hypergraph View</h2>
        
        <!-- Live Topology Stats -->
        <div class="topology-stats">
          <span>Atoms: <strong class="cyan-text">{atomCount}</strong></span>
          <span>Edges: <strong class="blue-text">{edgeCount}</strong></span>
          <span>Membranes: <strong class="purple-text">{membraneCount}</strong></span>
        </div>
      </div>

      <!-- Interactive Canvas Area -->
      <div class="canvas-container" bind:this={containerElement}>
        <canvas bind:this={canvasElement}></canvas>

        <!-- Selected Node Inspector overlay on the canvas -->
        {#if selectedNode}
          <div class="inspector-card">
            <div class="card-header">
              <h3>Atom Properties</h3>
              <button class="close-btn" onclick={() => selectedNode = null}>×</button>
            </div>
            <div class="card-body">
              <div class="prop-row">
                <span class="prop-key">ID:</span>
                <span class="prop-val monospace">{selectedNode.id}</span>
              </div>
              <div class="prop-row">
                <span class="prop-key">LABEL:</span>
                <span class="prop-val monospace">{selectedNode.label}</span>
              </div>
              <div class="prop-row">
                <span class="prop-key">TYPE:</span>
                <span class="prop-val badge-type">{selectedNode.type}</span>
              </div>
              <div class="prop-row">
                <span class="prop-key">STATE:</span>
                <span class="prop-val" style="color: {selectedNode.isRemoved ? '#ef4444' : '#22c55e'}">
                  {selectedNode.isRemoved ? 'RESIDUE_GHOST' : 'ACTIVE_ATOM'}
                </span>
              </div>
              
              {#if selectedNode.properties}
                <div class="props-sub-section">
                  <h4>Node Custom Attributes</h4>
                  {#each Object.entries(selectedNode.properties) as [key, val]}
                    <div class="prop-row indent">
                      <span class="prop-key">{key}:</span>
                      <span class="prop-val italic">"{val}"</span>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="props-sub-section">
                  <span class="no-props">No supplementary attributes.</span>
                </div>
              {/if}
              
              <div class="coordinates">
                <span>COORD: X:{Math.round(selectedNode.x)}px Y:{Math.round(selectedNode.y)}px</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Action Controls and Simulation bar -->
      <footer class="canvas-controls">
        <button class="btn btn-primary" onclick={handleTriggerTransition} title="Transition active subgraphs to Residue channels">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Trigger Transition (L ⇒ R)
        </button>
        <button class="btn btn-secondary" onclick={handleIlluminateProof} title="Trace evaluation trails along isomorphic pathways">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Proof Execution Trace
        </button>
        <button class="btn btn-tertiary" onclick={handleInjectFormula}>
          + Inject Atom
        </button>
        <button class="btn btn-icon" onclick={handleClearWorkspace} title="Reset Workspace">
          Clear
        </button>
      </footer>
    </section>

  </main>
</div>

<style>
  /* Local layout styling and futuristic overrides */
  .workspace {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #0b0c10;
    color: #c5c6c7;
    font-family: 'Fira Code', 'Courier New', Courier, monospace;
    overflow: hidden;
  }

  /* Header Telemetry bar */
  .workspace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f1016;
    border-bottom: 1px solid #1f2833;
    padding: 10px 24px;
    height: 38px;
    box-sizing: content-box;
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background-color: #00ffcc;
    border-radius: 50%;
    box-shadow: 0 0 10px #00ffcc;
    animation: pulse 1.8s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.9); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.6; }
  }

  .title {
    font-weight: bold;
    font-size: 14px;
    color: #ffffff;
    letter-spacing: 0.8px;
  }

  .sub-title {
    font-size: 11px;
    color: #45a29e;
    border-left: 1px solid #1f2833;
    padding-left: 12px;
  }

  .telemetry {
    display: flex;
    gap: 24px;
    align-items: center;
  }

  .stat {
    display: flex;
    gap: 8px;
    font-size: 11px;
  }

  .stat-label {
    color: #66fcf1;
    font-weight: bold;
  }

  .stat-val {
    color: #c5c6c7;
  }

  .status-highlight {
    text-shadow: 0 0 6px #00ffcc;
    font-weight: bold;
  }

  .cyan-highlight {
    color: #66fcf1;
    text-shadow: 0 0 4px rgba(102, 252, 241, 0.4);
    font-weight: bold;
  }

  /* Pane split layout */
  .pane-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1;
    height: calc(100vh - 58px);
    overflow: hidden;
  }

  .pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .left-pane {
    border-right: 1px solid #1f2833;
    background-color: #12131c;
  }

  .right-pane {
    background-color: #0b0c10;
  }

  /* Header inside Panes */
  .pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #141620;
    padding: 12px 20px;
    border-bottom: 1px solid #1f2833;
    height: 30px;
    box-sizing: content-box;
  }

  .pane-header h2 {
    font-size: 12px;
    color: #ffffff;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    flex: 1;
    margin-left: 12px;
  }

  .badge {
    background: #1f2833;
    color: #66fcf1;
    font-size: 9px;
    padding: 3px 8px;
    border-radius: 3px;
    font-weight: bold;
    border: 1px solid rgba(102, 252, 241, 0.25);
  }

  .badge.secondary {
    color: #a855f7;
    border-color: rgba(168, 85, 247, 0.25);
  }

  .extension {
    color: #45a29e;
    font-size: 11px;
  }

  /* Textual editor styling */
  .editor-container {
    flex: 1;
    position: relative;
    padding: 0;
    background-color: #0d0e15;
  }

  textarea {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    resize: none;
    outline: none;
    color: #a5f3fc;
    font-family: 'Fira Code', ui-monospace, monospace;
    font-size: 13px;
    line-height: 1.6;
    padding: 24px;
    box-sizing: border-box;
  }

  textarea::placeholder {
    color: #45a29e;
    opacity: 0.5;
  }

  .editor-footer {
    background: #0d0e15;
    border-top: 1px solid #1f2833;
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
  }

  .syntax-tips {
    font-size: 10px;
    color: #45a29e;
  }

  /* Spatial Canvas panel styling */
  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    background-color: #08080c;
  }

  canvas {
    display: block;
    cursor: crosshair;
  }

  .topology-stats {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: #8b9bb4;
  }

  .cyan-text { color: #00d2ff; }
  .blue-text { color: #3b82f6; }
  .purple-text { color: #a855f7; }

  /* Selector Inspector overlay card styling */
  .inspector-card {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 250px;
    background: rgba(15, 17, 26, 0.95);
    border: 1px solid #1f2833;
    border-left: 3px solid #66fcf1;
    border-radius: 4px;
    padding: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 10;
    font-size: 11px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1f2833;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }

  .card-header h3 {
    margin: 0;
    font-size: 11px;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #45a29e;
    cursor: pointer;
    font-size: 16px;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: #ef4444;
  }

  .prop-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    line-height: 1.4;
  }

  .prop-row.indent {
    padding-left: 10px;
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
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 9px;
  }

  .props-sub-section {
    margin-top: 10px;
    border-top: 1px dashed #1f2833;
    padding-top: 8px;
  }

  .props-sub-section h4 {
    margin: 0 0 6px 0;
    font-size: 9px;
    color: #ffffff;
    text-transform: uppercase;
  }

  .no-props {
    color: #4f566b;
    font-style: italic;
  }

  .coordinates {
    margin-top: 10px;
    font-size: 9px;
    color: #4f566b;
    text-align: right;
  }

  /* Control buttons at the bottom of the view */
  .canvas-controls {
    display: flex;
    gap: 12px;
    padding: 12px 20px;
    background: #0f1016;
    border-top: 1px solid #1f2833;
    height: 34px;
    box-sizing: content-box;
    align-items: center;
  }

  .btn {
    font-family: inherit;
    font-size: 11px;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease-in-out;
    border: 1px solid transparent;
  }

  .btn-primary {
    background-color: #22c55e;
    color: #052e16;
  }

  .btn-primary:hover {
    background-color: #4ade80;
    box-shadow: 0 0 10px rgba(34, 197, 150, 0.4);
  }

  .btn-secondary {
    background-color: #eab308;
    color: #422006;
  }

  .btn-secondary:hover {
    background-color: #facc15;
    box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
  }

  .btn-tertiary {
    background-color: transparent;
    border-color: #45a29e;
    color: #66fcf1;
  }

  .btn-tertiary:hover {
    background-color: rgba(102, 252, 241, 0.08);
  }

  .btn-icon {
    background-color: transparent;
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
    margin-left: auto; /* push to far right */
  }

  .btn-icon:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }

  /* Responsive styling for small laptops/tablets */
  @media (max-width: 1024px) {
    .pane-container {
      grid-template-columns: 1fr;
      grid-template-rows: 1.2fr 1.3fr;
      height: calc(100vh - 58px);
    }
    .left-pane {
      border-right: none;
      border-bottom: 1px solid #1f2833;
    }
    .workspace-header {
      padding: 10px 16px;
    }
    .telemetry {
      gap: 12px;
    }
  }
</style>
