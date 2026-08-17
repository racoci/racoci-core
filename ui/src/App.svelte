<script lang="ts">
  import { onMount, mount, unmount } from 'svelte';
  import { workspaceState } from './lib/workspaceState.svelte.js';
  import { DockviewComponent } from 'dockview';

  // Import recommended Dockview CSS styling
  import 'dockview/dist/styles/dockview.css';

  // Import our Svelte views
  import CyberEditor from './lib/CyberEditor.svelte';
  import hcypherGrammar from './lib/hcypher.tmLanguage.json';
  import View2D from './lib/View2D.svelte';
  import View3D from './lib/View3D.svelte';
  import WorkspacesView from './lib/WorkspacesView.svelte';
  import SSRSimulatorView from './lib/SSRSimulatorView.svelte';
  import DevToolsView from './lib/DevToolsView.svelte';
  import PhysicsSettingsView from './lib/PhysicsSettingsView.svelte';

  let dockviewContainer = $state<HTMLDivElement | null>(null);
  let dockviewInstance = $state<DockviewComponent | null>(null);
  let dockviewTick = $state(0);

  const allPanels = [
    { id: 'workspaces', name: 'Workspaces List', component: 'workspaces' },
    { id: 'editor', name: 'H-Cypher Editor', component: 'editor' },
    { id: 'canvas', name: '2D Hypergraph', component: 'canvas' },
    { id: 'projection3d', name: '3D Projection', component: 'projection3d' },
    { id: 'physics_settings', name: 'Simulation Settings', component: 'physics_settings' },
    { id: 'ssr_simulator', name: 'SSR Timeline', component: 'ssr_simulator' },
    { id: 'dev_tools', name: 'Dev Tools Console', component: 'dev_tools' }
  ];

  function togglePanel(panelConfig: any) {
    if (!dockviewInstance) return;
    
    const existingPanel = dockviewInstance.getPanel(panelConfig.id);
    
    if (existingPanel) {
      dockviewInstance.removePanel(existingPanel);
    } else {
      dockviewInstance.addPanel({
        id: panelConfig.id,
        component: panelConfig.component,
        title: panelConfig.name
      });
    }
  }

  function isPanelActive(id: string) {
    dockviewTick; // Svelte 5 reactive trigger
    return dockviewInstance?.getPanel(id) !== undefined;
  }

  onMount(() => {
    let layoutChangeDisposable: any = null;

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
                svelteInstance = mount(CyberEditor, {
                  target: wrapper,
                  props: {
                    get value() { return workspaceState.hCypherCode; },
                    set value(v) { workspaceState.hCypherCode = v; },
                    grammar: hcypherGrammar
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

      // Register the global API for component panel toggling
      workspaceState.dockviewApi = dockviewInstance;

      console.log("INITIALIZING PANEL PANES GRID PERSISTENCE...");

      // Helper to establish standard default layout on fresh visit
      const createDefaultLayout = () => {
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
      };

      // Export the factory reset callback globally so other components can trigger it
      workspaceState.resetLayout = () => {
        if (dockviewInstance) {
          dockviewInstance.clear(); // Wipe the current corrupted/empty grid
          createDefaultLayout(); // Re-instantiate the pristine default grid
          console.log("DOCKVIEW WORKSPACE FACTORY RESET COMPLETED!");
        }
      };

      // Attempt to load previously saved layout from browser preferences
      const savedLayoutStr = localStorage.getItem('holds_dockview_layout_v1');
      let loaded = false;
      if (savedLayoutStr) {
        try {
          const savedLayout = JSON.parse(savedLayoutStr);
          dockviewInstance.fromJSON(savedLayout);
          console.log("DOCKVIEW WORKSPACE RESTORED FROM USER PREFERENCES!");
          loaded = true;
        } catch (e) {
          console.error("Failed to restore saved layout from localStorage, using fallback layout...", e);
        }
      }

      if (!loaded) {
        createDefaultLayout();
      }

      // ONLY subscribe to layout change events after initial layout is established!
      layoutChangeDisposable = dockviewInstance.onDidLayoutChange(() => {
        dockviewTick++; // Update reactive state for header panel buttons
        try {
          const layout = dockviewInstance.toJSON();
          localStorage.setItem('holds_dockview_layout_v1', JSON.stringify(layout));
        } catch (e) {
          console.error("Failed to serialize and persist dockview layout:", e);
        }
      });

      console.log("DOCKVIEW WORKSPACE SECURED!");
      dockviewTick++; // Initial sync tick
    }

    return () => {
      clearInterval(fpsInterval);
      if (layoutChangeDisposable) {
        layoutChangeDisposable.dispose();
      }
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
    </div>

    <!-- Active Panels Toggles -->
    <div class="header-panels">
      {#each allPanels as panel}
        <button 
          class="header-toggle-btn"
          class:active={isPanelActive(panel.id)}
          onclick={() => togglePanel(panel)}
          title="{isPanelActive(panel.id) ? 'Close' : 'Open'} {panel.name}"
        >
          {panel.name}
        </button>
      {/each}
      <button 
        class="header-toggle-btn reset-btn"
        onclick={() => { if (workspaceState.resetLayout) workspaceState.resetLayout(); }}
        title="Factory Reset Layout"
      >
        🔄 Reset
      </button>
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

  .header-panels {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 20px;
    flex: 1;
  }

  .header-toggle-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 4px 8px;
    font-size: 9px;
    font-weight: bold;
    font-family: "Fira Code", monospace;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.1s ease-in-out;
    text-transform: uppercase;
  }

  .header-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .header-toggle-btn.active {
    background: rgba(102, 252, 241, 0.1);
    border-color: #66fcf1;
    color: #66fcf1;
    box-shadow: 0 0 6px rgba(102, 252, 241, 0.2);
  }

  .header-toggle-btn.reset-btn {
    border-color: rgba(244, 63, 94, 0.3);
    color: #f43f5e;
    margin-left: 12px;
  }

  .header-toggle-btn.reset-btn:hover {
    background: rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.6);
    color: #fb7185;
    box-shadow: 0 0 6px rgba(244, 63, 94, 0.3);
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