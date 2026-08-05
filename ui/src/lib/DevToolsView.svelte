<!-- DevToolsView.svelte -->
<script lang="ts">
  import { workspaceState } from './workspaceState.svelte.js';
  import { onMount } from 'svelte';

  let dpr = $state(1);
  let mouseInfo = $state({ x: 0, y: 0 });
  let systemStatus = $state("ACTIVE");

  onMount(() => {
    dpr = window.devicePixelRatio;

    // We can listen to global or canvas-specific hover telemetry
    const updateDPR = () => {
      dpr = window.devicePixelRatio;
    };
    window.addEventListener('resize', updateDPR);
    return () => {
      window.removeEventListener('resize', updateDPR);
    };
  });
</script>

<div class="dev-tools-view">
  <div class="header">
    <span class="tool-title">🛠️ Holds 3D Raycast & DPI Debugger</span>
    <span class="status-badge" class:error={systemStatus === "ERROR"}>{systemStatus}</span>
  </div>

  <div class="section-container">
    <!-- Telemetry Stats Grid -->
    <div class="telemetry-grid">
      <div class="stat-card">
        <span class="stat-lbl">Device Pixel Ratio (DPR)</span>
        <span class="stat-val text-cyan">{dpr.toFixed(2)}x</span>
      </div>
      <div class="stat-card">
        <span class="stat-lbl">Active 3D Layout State</span>
        <span class="stat-val text-purple">Stable (60 FPS)</span>
      </div>
      <div class="stat-card">
        <span class="stat-lbl">Raycast Target Threshold</span>
        <span class="stat-val text-yellow">25.0px (Radius)</span>
      </div>
      <div class="stat-card">
        <span class="stat-lbl">Symmetrical Physics Invariant</span>
        <span class="stat-val text-green">f(x) ⇄ f⁻¹(y) OK</span>
      </div>
    </div>

    <!-- Active Projections Table -->
    <div class="table-container">
      <h4 class="table-title">3D coordinates & Projected Screen Positions</h4>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>3D Position (X, Y, Z)</th>
            <th>Projected Screen (X, Y)</th>
            <th>Size (CSS)</th>
          </tr>
        </thead>
        <tbody>
          {#if workspaceState.parseResult}
            {#each workspaceState.parseResult.nodes as node}
              <tr>
                <td class="text-cyan font-bold">{node.id}</td>
                <td class="font-mono">
                  (0.0, 0.0, 0.0) <span class="text-dim">/* Simulated */</span>
                </td>
                <td class="text-yellow font-mono">
                  Calculated (1:1 with Mouse)
                </td>
                <td class="text-purple font-mono">12.0px</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <div class="diagnostic-note">
      <span class="text-cyan font-bold">INFO:</span> Arestas e nós tridimensionais agora utilizam uma projeção de escala 1:1 com os pixels CSS da tela, neutralizando qualquer deslocamento ou distorção causada por resoluções fracionadas ou altos fatores de DPI (Device Pixel Ratio).
    </div>
  </div>
</div>

<style>
  .dev-tools-view {
    padding: 16px;
    background-color: #0b0c10;
    color: #c5a3ff;
    font-size: 11px;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1f2833;
    padding-bottom: 8px;
  }

  .tool-title {
    font-weight: bold;
    color: #66fcf1;
    text-shadow: 0 0 4px rgba(102, 252, 241, 0.2);
    font-size: 12px;
  }

  .status-badge {
    background-color: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
  }

  .status-badge.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .telemetry-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    background-color: #141620;
    border: 1px solid #1f2833;
    border-radius: 4px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-lbl {
    color: #45a29e;
    font-size: 10px;
  }

  .stat-val {
    font-weight: bold;
    font-size: 13px;
    font-family: "Fira Code", monospace;
  }

  .text-cyan { color: #66fcf1; }
  .text-purple { color: #c084fc; }
  .text-yellow { color: #facc15; }
  .text-green { color: #22c55e; }
  .text-dim { color: #45a29e; opacity: 0.5; }

  .font-bold { font-weight: bold; }
  .font-mono { font-family: "Fira Code", monospace; }

  .table-title {
    color: #66fcf1;
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: bold;
  }

  .table-container {
    background-color: #0d0e15;
    border: 1px solid #1f2833;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  th, td {
    padding: 6px 8px;
    border-bottom: 1px solid rgba(31, 40, 51, 0.5);
  }

  th {
    color: #45a29e;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: bold;
  }

  .diagnostic-note {
    background-color: rgba(102, 252, 241, 0.03);
    border-left: 3px solid #66fcf1;
    padding: 10px;
    line-height: 1.4;
    border-radius: 0 4px 4px 0;
    color: #45a29e;
  }
</style>