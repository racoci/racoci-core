<script lang="ts">
  import { onMount, mount, unmount } from 'svelte';
  import { workspaceState } from './lib/workspaceState.svelte.js';
  import { DockviewComponent } from 'dockview';

  // Import recommended Dockview CSS styling
  import 'dockview/dist/styles/dockview.css';

  // Import our Svelte views
  import HCypherEditor from './lib/HCypherEditor.svelte';
  import View2D from './lib/View2D.svelte';
  import View3D from './lib/View3D.svelte';
  import WorkspacesView from './lib/WorkspacesView.svelte';
  import SSRSimulatorView from './lib/SSRSimulatorView.svelte';
  import DevToolsView from './lib/DevToolsView.svelte';
  import PhysicsSettingsView from './lib/PhysicsSettingsView.svelte';

  let dockviewContainer = $state<HTMLDivElement | null>(null);
  let dockviewInstance: DockviewComponent | null = null;

  onMount(() => {
    // Simulate minor FPS fluctuation and shared memory state activity
    const fpsInterval = setInterval(() => {
      workspaceState.frameRate = Math.floor(58 + Math.random() * 3);
      workspaceState.wasmMemoryUsage = parseFloat((128.4 + Math.sin(Date.now() / 1000) * 2).toFixed(2));
    }, 1000);

    if (dockviewContainer) {
      console.log("INITIALIZING DOCKVIEW COMPONENT...");
      
      // Instantiate high-performance vanilla Dockview engine
      // Constructor signature: new DockviewComponent(element, options)
      dockviewInstance = new DockviewComponent(dockviewContainer, {
        createComponent: (options) => {
          const wrapper = document.createElement('div');
          wrapper.style.width = '100%';
          wrapper.style.height = '100%';
          wrapper.style.overflow = 'hidden';
          wrapper.style.boxSizing = 'border-box';
          
          let svelteInstance: any = null;
          
          // Return a fully compliant IContentRenderer object to satisfy Dockview's lifecycle contract!
          return {
            element: wrapper,
            init: (params) => {
              // Dynamically mount the Svelte 5 component inside init once the container is fully ready!
              if (options.name === 'editor') {
                svelteInstance = mount(HCypherEditor, {
                  target: wrapper,
                  props: {
                    get value() { return workspaceState.hCypherCode; },
                    set value(v) { workspaceState.hCypherCode = v; },
                    get bgColor() { return workspaceState.currentBgColor; }
                  }
                });
              } else if (options.name === 'canvas') {
                svelteInstance = mount(View2D, { target: wrapper });
              } else if (options.name === 'projection3d') {
                svelteInstance = mount(View3D, { target: wrapper });
              } else if (options.name === 'workspaces') {
                svelteInstance = mount(WorkspacesView, { target: wrapper });
              } else if (options.name === 'physics_settings') {
                svelteInstance = mount(PhysicsSettingsView, { target: wrapper });
              } else if (options.name === 'ssr_simulator') {
                svelteInstance = mount(SSRSimulatorView, { target: wrapper });
              } else if (options.name === 'dev_tools') {
                svelteInstance = mount(DevToolsView, { target: wrapper });
              }
            },
            update: (params) => {
              // Handle reactive parameter updates if needed
            },
            layout: (width, height) => {
              // Handle container resizes
            },
            focus: () => {
              wrapper.focus();
            },
            dispose: () => {
              if (svelteInstance) {
                unmount(svelteInstance);
              }
            },
            toJSON: () => {
              return {};
            }
          };
        }
      });

      console.log("CONSTRUCTING PANEL PANES GRID...");

      // Construct the absolute best grid layout using Dockview splits!
      const workspacesPanel = dockviewInstance.addPanel({
        id: 'workspaces',
        component: 'workspaces',
        title: 'Workspaces List'
      });

      const editorPanel = dockviewInstance.addPanel({
        id: 'editor',
        component: 'editor',
        title: 'H-Cypher Editor',
        position: { referencePanel: workspacesPanel, direction: 'right' }
      });

      const canvasPanel = dockviewInstance.addPanel({
        id: 'canvas',
        component: 'canvas',
        title: '2D Hypergraph',
        position: { referencePanel: editorPanel, direction: 'below' }
      });

      const view3dPanel = dockviewInstance.addPanel({
        id: 'projection3d',
        component: 'projection3d',
        title: '3D Projection',
        position: { referencePanel: canvasPanel, direction: 'right' }
      });

      const settingsPanel = dockviewInstance.addPanel({
        id: 'physics_settings',
        component: 'physics_settings',
        title: 'Simulation Settings',
        position: { referencePanel: view3dPanel, direction: 'right' }
      });

      // Set initial panel sizing (Left workspaces: 18%, Settings: 24%)
      workspacesPanel.group.api.setSize(220);
      settingsPanel.group.api.setSize(340);

      console.log("DOCKVIEW WORKSPACE SECURED!");
    }

    return () => {
      clearInterval(fpsInterval);
      if (dockviewInstance) {
        dockviewInstance.dispose();
      }
    };
  });
</script>

<div class="workspace">
  <!-- Top Global Cybernetic Header Bar -->
  <header class="workspace-header">
    <div class="logo-area">
      <span class="pulse-dot"></span>
      <span class="title">RACOCI Holds Substrate</span>
      <span class="sub-title">VSCode-Grade Docking Workspace Manager</span>
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

  <!-- Root Tiling Container (with Dockview Dark Theme Class) -->
  <main class="pane-container dockview-theme-dark" bind:this={dockviewContainer}></main>
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

  /* Robust, non-collapsing Pane Split Container for Dockview */
  .pane-container {
    position: relative;
    width: 100%;
    height: calc(100vh - 58px); /* explicit height avoids flexbox collapses */
    overflow: hidden;
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

  /* Core Dockview Cyber Dark Custom Theme Variables Overrides */
  :global(.dockview) {
    --dv-active-tab-background-color: #121420 !important;
    --dv-active-tab-color: #66fcf1 !important;
    --dv-inactive-tab-background-color: #0a0b12 !important;
    --dv-inactive-tab-color: #45a29e !important;
    --dv-separator-color: #1f2833 !important;
    --dv-tabs-and-actions-container-background-color: #07080d !important;
    --dv-active-group-visible-tab-border-color: #66fcf1 !important;
    font-family: "Fira Code", monospace !important;
  }

  :global(.dv-tab) {
    border-top: 2px solid transparent;
    transition: all 0.15s ease-in-out;
  }

  :global(.dv-tab.active) {
    border-top: 2px solid #66fcf1 !important;
    background-color: #141829 !important;
    text-shadow: 0 0 4px rgba(102, 252, 241, 0.5);
  }

  :global(.dv-tab:hover) {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.02) !important;
  }

  :global(.dv-group) {
    border: 1px solid rgba(255, 255, 255, 0.01) !important;
  }
</style>