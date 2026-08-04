<!-- WorkspacesView.svelte -->
<script lang="ts">
  import { workspaceState } from './workspaceState.svelte.js';
</script>

<div class="workspaces-panel">
  <div class="panel-header">
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
  }

  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid #1f2833;
    background-color: #0d0e15;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 11px;
    color: #66fcf1;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-shadow: 0 0 6px rgba(102, 252, 241, 0.4);
  }

  .workspace-list {
    flex: 1;
    overflow-y: auto;
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
    margin-left: 8px;
  }

  .status-dot {
    display: block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #3b4252;
  }

  .workspace-item.active .status-dot {
    background-color: #00ffcc;
    box-shadow: 0 0 6px #00ffcc;
  }

  .panel-footer {
    padding: 10px 16px;
    border-top: 1px solid #1f2833;
    background-color: #0d0e15;
    font-size: 10px;
    color: #45a29e;
  }

  .telemetry-compact {
    display: flex;
    justify-content: space-between;
  }
</style>
