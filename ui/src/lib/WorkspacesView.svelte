<!-- WorkspacesView.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { workspaceState } from './workspaceState.svelte.js';

  const allPanels = [
    { id: 'workspaces', name: 'Workspaces List', component: 'workspaces' },
    { id: 'editor', name: 'H-Cypher Editor', component: 'editor' },
    { id: 'canvas', name: '2D Hypergraph', component: 'canvas' },
    { id: 'projection3d', name: '3D Projection', component: 'projection3d' },
    { id: 'physics_settings', name: 'Simulation Settings', component: 'physics_settings' },
    { id: 'ssr_simulator', name: 'SSR Timeline', component: 'ssr_simulator' },
    { id: 'dev_tools', name: 'Dev Tools Console', component: 'dev_tools' }
  ];

  // A local reactive variable to force the {#each} loop to re-render when a panel is closed via the X button
  let dockviewTick = $state(0);

  function togglePanel(panelConfig: any) {
    if (!workspaceState.dockviewApi) return;
    
    // Check if the panel is already active in the dockview grid
    const existingPanel = workspaceState.dockviewApi.getPanel(panelConfig.id);
    
    if (existingPanel) {
      // If active, remove it
      workspaceState.dockviewApi.removePanel(existingPanel);
    } else {
      // If missing, re-add it to the grid!
      workspaceState.dockviewApi.addPanel({
        id: panelConfig.id,
        component: panelConfig.component,
        title: panelConfig.name
      });
    }
  }

  // Reactive helper to check if a panel is currently open
  function isPanelActive(id: string) {
    // We read dockviewTick to establish a Svelte 5 dependency, causing this to re-run!
    dockviewTick;
    return workspaceState.dockviewApi?.getPanel(id) !== undefined;
  }

  onMount(() => {
    // Subscribe to Dockview layout events so we know when the user clicks an "X" to close a panel
    let disposable: any = null;
    
    // Use an interval to poll since workspaceState.dockviewApi might be injected slightly after mount
    const checkInterval = setInterval(() => {
      if (workspaceState.dockviewApi && !disposable) {
        disposable = workspaceState.dockviewApi.onDidLayoutChange(() => {
          dockviewTick++; // Trigger Svelte 5 re-render!
        });
        clearInterval(checkInterval);
        dockviewTick++; // Initial sync
      }
    }, 100);

    return () => {
      clearInterval(checkInterval);
      if (disposable) disposable.dispose();
    };
  });
</script>

<div class="workspaces-panel">
  <!-- Active Panels Section -->
  <div class="panel-header">
    <h3>Active Panels</h3>
  </div>
  
  <div class="panels-list">
    {#each allPanels as panel}
      <button 
        class="panel-toggle-btn"
        class:active={isPanelActive(panel.id)}
        onclick={() => togglePanel(panel)}
        title="Toggle Panel"
      >
        <span class="panel-status-icon">{isPanelActive(panel.id) ? '👁' : '✖'}</span>
        <span class="panel-name">{panel.name}</span>
      </button>
    {/each}
  </div>

  <!-- Projections Section -->
  <div class="panel-header mt-4">
    <h3>Projections Registry</h3>
  </div>

  <div class="workspace-list">
    {#each workspaceState.workspaces as workspace}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="workspace-item" 
        class:active={workspaceState.selectedWorkspaceId === workspace.id}
        onclick={() => workspaceState.selectTemplate(workspace.id)}
      >
        <div class="item-icon">
          {#if workspace.id === 'kernel'}
            ⚡
          {:else if workspace.id === 'forth'}
            🧮
          {:else if workspace.id === 'clojure'}
            🥬
          {:else if workspace.id === 'haskell'}
            λ
          {:else if workspace.id === 'prolog'}
            ❓
          {/if}
        </div>
        <div class="item-info">
          <span class="workspace-name">{workspace.name}</span>
          <span class="workspace-date">Updated: {workspace.updated}</span>
        </div>
        <div class="item-status">
          <span class="status-dot"></span>
        </div>
      </div>
    {/each}
  </div>

  <div class="panel-footer">
    <div class="telemetry-compact">
      <span>Nodes: {workspaceState.atomCount}</span>
      <span>Edges: {workspaceState.edgeCount}</span>
    </div>
  </div>
</div>

<style>
  .workspaces-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #0b0f19;
    color: #c5c6c7;
    font-family: inherit;
    box-sizing: border-box;
    overflow-y: auto;
  }

  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid #1f2833;
    background-color: #0d0e15;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .mt-4 {
    margin-top: 8px;
    border-top: 1px solid #1f2833;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 11px;
    color: #66fcf1;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 0 0 6px rgba(102, 252, 241, 0.4);
  }

  .panels-list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .panel-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(10, 14, 26, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 6px 10px;
    color: #94a3b8;
    font-family: "Fira Code", monospace;
    font-size: 9.5px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease-in-out;
  }

  .panel-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .panel-toggle-btn.active {
    background: rgba(102, 252, 241, 0.05);
    border-color: rgba(102, 252, 241, 0.3);
    color: #66fcf1;
  }

  .panel-status-icon {
    font-size: 12px;
    min-width: 14px;
    text-align: center;
  }

  .workspace-list {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .workspace-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background-color: #12131c;
    border: 1px solid rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
  }

  .workspace-item:hover {
    background-color: #1a1c29;
    border-color: rgba(102, 252, 241, 0.2);
    transform: translateX(2px);
  }

  .workspace-item.active {
    background-color: rgba(102, 252, 241, 0.05);
    border-color: #66fcf1;
    box-shadow: 0 0 8px rgba(102, 252, 241, 0.15);
  }

  .item-icon {
    font-size: 16px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: #0d0e15;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .workspace-item.active .item-icon {
    border-color: #66fcf1;
    color: #66fcf1;
  }

  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .workspace-name {
    font-size: 11px;
    font-weight: bold;
    color: #ffffff;
  }

  .workspace-item.active .workspace-name {
    color: #66fcf1;
  }

  .workspace-date {
    font-size: 9px;
    color: #45a29e;
  }

  .item-status {
    width: 8px;
    height: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #334155;
    transition: all 0.2s;
  }

  .workspace-item.active .status-dot {
    background-color: #66fcf1;
    box-shadow: 0 0 6px #66fcf1;
  }

  .panel-footer {
    padding: 10px 16px;
    background-color: #080b12;
    border-top: 1px solid #1f2833;
    font-size: 9px;
    color: #64748b;
  }

  .telemetry-compact {
    display: flex;
    justify-content: space-between;
    font-family: "Fira Code", monospace;
  }
</style>