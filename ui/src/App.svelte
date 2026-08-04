<script lang="ts">
  import { onMount } from 'svelte';
  import { workspaceState } from './lib/workspaceState.svelte.js';
  import LayoutNode from './lib/LayoutNode.svelte';

  onMount(() => {
    // Simulate minor FPS fluctuation and shared memory state activity
    const fpsInterval = setInterval(() => {
      workspaceState.frameRate = Math.floor(58 + Math.random() * 3);
      workspaceState.wasmMemoryUsage = parseFloat((128.4 + Math.sin(Date.now() / 1000) * 2).toFixed(2));
    }, 1000);

    return () => {
      clearInterval(fpsInterval);
    };
  });
</script>

<div class="workspace">
  <!-- Top Global Cybernetic Header Bar -->
  <header class="workspace-header">
    <div class="logo-area">
      <span class="pulse-dot"></span>
      <span class="title">RACOCI Holds Substrate</span>
      <span class="sub-title">Blender-Inspired Workspace Manager</span>
    </div>
    
    <!-- Real-time Status Telemetry indicators -->
    <div class="telemetry">
      <div class="stat">
        <span class="stat-label">CANVAS BG:</span>
        <select class="bg-select" bind:value={workspaceState.currentBgColor}>
          <option value="#0b0f19">Space Dark</option>
          <option value="#05070a">Deep Black</option>
          <option value="#f8fafc">Clean Light</option>
          <option value="#1e293b">Nebula Grey</option>
          <option value="#fdf6e3">Solarized Cream</option>
        </select>
      </div>
      <div class="stat">
        <span class="stat-label">BUS STATE:</span>
        <span class="stat-val status-highlight">{workspaceState.systemStatus}</span>
      </div>
      <div class="stat">
        <span class="stat-label">WASM STATE_MEM:</span>
        <span class="stat-val">{workspaceState.wasmMemoryUsage} KB</span>
      </div>
      <div class="stat">
        <span class="stat-label">RENDERING LOCK:</span>
        <span class="stat-val cyan-highlight">{workspaceState.frameRate} FPS</span>
      </div>
    </div>
  </header>

  <!-- Root Tiling Container -->
  <main class="pane-container">
    <LayoutNode node={workspaceState.layoutTree} />
  </main>
</div>

<style>
  /* Local layout styling and cybernetic overrides */
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #05070a;
  }

  .workspace {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #0b0c10;
    color: #c5c6c7;
    font-family: 'Fira Code', 'Courier New', Courier, monospace;
    overflow: hidden;
    box-sizing: border-box;
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
    flex-shrink: 0;
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
    font-size: 13px;
    color: #ffffff;
    letter-spacing: 0.8px;
  }

  .sub-title {
    font-size: 10px;
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

  /* Pane Split Tiling container */
  .pane-container {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  /* Background select dropdown */
  .bg-select {
    background-color: #12131c;
    border: 1px solid #1f2833;
    color: #66fcf1;
    font-family: inherit;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    font-weight: bold;
  }

  .bg-select:focus {
    border-color: #66fcf1;
  }
</style>
