<!-- PhysicsSettingsView.svelte (Svelte 5) -->
<script lang="ts">
  import { workspaceState } from './workspaceState.svelte.js';
</script>

<div class="physics-settings-container">
  <div class="settings-header">
    <span class="settings-title">CYBERNETIC SIMULATOR</span>
    <span class="settings-badge">SANDBOX v1.0</span>
  </div>

  <div class="settings-body">
    <!-- Section 1: Vertex Count Constraints -->
    <div class="settings-section">
      <span class="section-heading">Elastic Segments</span>
      
      <div class="control-group">
        <label for="max-pts-slider" class="control-label">
          <span>Max Intermediates</span>
          <span class="control-val">{workspaceState.physicsSettings.maxIntermediatePoints} nodes</span>
        </label>
        <input 
          id="max-pts-slider"
          type="range" 
          min="0" 
          max="10" 
          step="1" 
          bind:value={workspaceState.physicsSettings.maxIntermediatePoints} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider"
        />
        <span class="control-desc">Limits vertices per edge to prevent performance degradation on large files.</span>
      </div>

      <div class="control-group checkbox-group">
        <label for="show-pts-checkbox" class="control-label checkbox-label">
          <input 
            id="show-pts-checkbox"
            type="checkbox" 
            bind:checked={workspaceState.physicsSettings.showIntermediatePoints} 
            onchange={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
            class="cyber-checkbox"
          />
          <span class="checkbox-custom"></span>
          <span>Show Joint Coordinates</span>
        </label>
        <span class="control-desc">Draw neon yellow physical joints directly on edge paths (2D/3D).</span>
      </div>
    </div>

    <!-- Section 1.5: Object Inertia / Masses -->
    <div class="settings-section">
      <span class="section-heading">Inertial Mass Matrix</span>

      <!-- Mass 1: Atoms Mass -->
      <div class="control-group">
        <label for="atom-mass-slider" class="control-label">
          <span>Atom Inertia (M_atom)</span>
          <span class="control-val text-yellow">{(workspaceState.physicsSettings?.masses?.atom ?? 1.0).toFixed(1)} kg</span>
        </label>
        <input 
          id="atom-mass-slider"
          type="range" 
          min="0.1" 
          max="5.0" 
          step="0.1" 
          bind:value={workspaceState.physicsSettings.masses.atom} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-yellow"
        />
        <span class="control-desc">Base mass of standard graph nodes. Higher mass dampens acceleration, making nodes heavier and more stable.</span>
      </div>

      <!-- Mass 2: Segment Mass -->
      <div class="control-group">
        <label for="seg-mass-slider" class="control-label">
          <span>Segment Inertia (M_segment)</span>
          <span class="control-val text-pink">{(workspaceState.physicsSettings?.masses?.segment ?? 0.25).toFixed(2)} kg</span>
        </label>
        <input 
          id="seg-mass-slider"
          type="range" 
          min="0.05" 
          max="2.0" 
          step="0.05" 
          bind:value={workspaceState.physicsSettings.masses.segment} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-pink"
        />
        <span class="control-desc">Base mass of intermediate spline nodes. Lower mass makes edge strings extremely agile and responsive to obstacle repulsion.</span>
      </div>
    </div>

    <!-- Section 2: Force-Directed Matrix Configuration -->
    <div class="settings-section">
      <span class="section-heading">Interaction Matrix</span>

      <!-- Force 1: Atoms Repulsion -->
      <div class="control-group">
        <label for="atom-atom-slider" class="control-label">
          <span>Atom-to-Atom Separation</span>
          <span class="control-val text-yellow">{workspaceState.physicsSettings?.forces?.atom_atom ?? 1500}</span>
        </label>
        <input 
          id="atom-atom-slider"
          type="range" 
          min="200" 
          max="3000" 
          step="50" 
          bind:value={workspaceState.physicsSettings.forces.atom_atom} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-yellow"
        />
        <span class="control-desc">Repulsion force separating parsed graph atoms. Higher values space out clusters.</span>
      </div>

      <!-- Force 2: Atom-to-Segment Repulsion -->
      <div class="control-group">
        <label for="atom-seg-slider" class="control-label">
          <span>Atom-to-Segment Repulsion</span>
          <span class="control-val text-cyan">{workspaceState.physicsSettings?.forces?.atom_nonSuccessive ?? 150}</span>
        </label>
        <input 
          id="atom-seg-slider"
          type="range" 
          min="20" 
          max="1000" 
          step="10" 
          bind:value={workspaceState.physicsSettings.forces.atom_nonSuccessive} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-cyan"
        />
        <span class="control-desc">Mass-adjusted repulsion force pushing edge segments away from node borders.</span>
      </div>

      <!-- Force 3: Segment-to-Segment Repulsion -->
      <div class="control-group">
        <label for="seg-seg-slider" class="control-label">
          <span>Highway Separation</span>
          <span class="control-val text-purple">{workspaceState.physicsSettings?.forces?.nonSuccessive_nonSuccessive ?? 180}</span>
        </label>
        <input 
          id="seg-seg-slider"
          type="range" 
          min="20" 
          max="1000" 
          step="10" 
          bind:value={workspaceState.physicsSettings.forces.nonSuccessive_nonSuccessive} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-purple"
        />
        <span class="control-desc">Repulsion between non-successive intermediate points. Promotes parallel edge routing.</span>
      </div>

      <!-- Force 4: Elastic Spring Tension -->
      <div class="control-group">
        <label for="tension-slider" class="control-label">
          <span>String Elastic Tension</span>
          <span class="control-val text-pink">{(workspaceState.physicsSettings?.forces?.successive_tension ?? 0.16).toFixed(2)}</span>
        </label>
        <input 
          id="tension-slider"
          type="range" 
          min="0.01" 
          max="0.50" 
          step="0.01" 
          bind:value={workspaceState.physicsSettings.forces.successive_tension} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-pink"
        />
        <span class="control-desc">Elastic tension between consecutive segments. High values pull strings straight.</span>
      </div>

      <!-- Threshold 1: Strain Max (Spawn Nodes) -->
      <div class="control-group">
        <label for="strain-max-slider" class="control-label">
          <span>Strain Max (Spawn Segments)</span>
          <span class="control-val text-cyan">{(workspaceState.physicsSettings?.forces?.strain_max ?? 10.0).toFixed(1)}</span>
        </label>
        <input 
          id="strain-max-slider"
          type="range" 
          min="5.0" 
          max="40.0" 
          step="1.0" 
          bind:value={workspaceState.physicsSettings.forces.strain_max} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-cyan"
        />
        <span class="control-desc">If average segment force exceeds this limit, new intermediate segments spawn to relieve tension.</span>
      </div>

      <!-- Threshold 2: Strain Min (Prune Nodes) -->
      <div class="control-group">
        <label for="strain-min-slider" class="control-label">
          <span>Strain Min (Prune Segments)</span>
          <span class="control-val text-yellow">{(workspaceState.physicsSettings?.forces?.strain_min ?? 2.0).toFixed(1)}</span>
        </label>
        <input 
          id="strain-min-slider"
          type="range" 
          min="0.5" 
          max="15.0" 
          step="0.5" 
          bind:value={workspaceState.physicsSettings.forces.strain_min} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider slider-yellow"
        />
        <span class="control-desc">If average segment force drops below this limit (too relaxed), extra segments are deleted to prevent curling.</span>
      </div>
    </div>
  </div>
</div>

<style>
  .physics-settings-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #060913;
    font-family: "Fira Code", monospace;
    overflow-y: auto;
    border: 1px solid rgba(102, 252, 241, 0.1);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background-color: rgba(20, 24, 38, 0.6);
    border-bottom: 1px solid rgba(102, 252, 241, 0.15);
  }

  .settings-title {
    font-size: 10px;
    font-weight: bold;
    color: #66fcf1;
    text-shadow: 0 0 6px rgba(102, 252, 241, 0.3);
    letter-spacing: 0.5px;
  }

  .settings-badge {
    font-size: 8px;
    background-color: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.4);
    color: #c084fc;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
  }

  .settings-body {
    flex: 1;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: rgba(10, 14, 26, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 12px;
  }

  .section-heading {
    font-size: 9px;
    font-weight: bold;
    color: #a855f7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(168, 85, 247, 0.2);
    padding-bottom: 4px;
    margin-bottom: 4px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #c5c6c7;
  }

  .control-val {
    font-weight: bold;
    color: #ffffff;
  }

  .control-desc {
    font-size: 7.5px;
    color: #45a29e;
    line-height: 1.2;
  }

  .text-yellow { color: #facc15; }
  .text-cyan { color: #66fcf1; }
  .text-purple { color: #c084fc; }
  .text-pink { color: #f43f5e; }

  /* Cyber Sliders styling */
  .cyber-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    outline: none;
  }

  .cyber-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.1s ease-in-out;
  }

  /* Slider colors thumb */
  .slider-yellow::-webkit-slider-thumb { background: #facc15; box-shadow: 0 0 6px #facc15; }
  .slider-cyan::-webkit-slider-thumb { background: #66fcf1; box-shadow: 0 0 6px #66fcf1; }
  .slider-purple::-webkit-slider-thumb { background: #a855f7; box-shadow: 0 0 6px #a855f7; }
  .slider-pink::-webkit-slider-thumb { background: #f43f5e; box-shadow: 0 0 6px #f43f5e; }
  .cyber-slider::-webkit-slider-thumb { background: #66fcf1; box-shadow: 0 0 6px #66fcf1; }

  /* Checkbox styling */
  .checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding-top: 4px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    font-size: 9px;
  }

  .cyber-checkbox {
    display: none;
  }

  .checkbox-custom {
    width: 12px;
    height: 12px;
    border: 1px solid rgba(102, 252, 241, 0.4);
    border-radius: 2px;
    display: inline-block;
    position: relative;
    background-color: rgba(20, 24, 38, 0.6);
  }

  .cyber-checkbox:checked + .checkbox-custom {
    background-color: rgba(102, 252, 241, 0.15);
    border-color: #66fcf1;
  }

  .cyber-checkbox:checked + .checkbox-custom::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 4px;
    width: 3px;
    height: 6px;
    border: solid #66fcf1;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
</style>