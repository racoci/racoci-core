<!-- PhysicsSettingsView.svelte (Svelte 5) -->
<script lang="ts">
  import { workspaceState } from './workspaceState.svelte.js';

  let dragKnobId = $state<string | null>(null);
  let startY = 0;
  let startVal = 0;

  // Symmetrical 3x3 Category Matrix configurations
  // Rows/Cols represent the categories: ATOM, SEGMENT (Non-successive), TENSION (Successive)
  const matrixCells = $derived([
    {
      row: 0, col: 0,
      id: 'atom_atom',
      label: 'Atom-Atom',
      desc: 'Atom separation',
      get value() { return workspaceState.physicsSettings?.forces?.atom_atom ?? 1500; },
      set value(v) { workspaceState.physicsSettings.forces.atom_atom = Math.round(v); },
      min: 0,
      max: 3000,
    },
    {
      row: 0, col: 1,
      id: 'atom_segment',
      label: 'Atom-Segment',
      desc: 'Obstacle avoidance',
      get value() { return workspaceState.physicsSettings?.forces?.atom_nonSuccessive ?? 150; },
      set value(v) { workspaceState.physicsSettings.forces.atom_nonSuccessive = Math.round(v); },
      min: 0,
      max: 1000,
    },
    {
      row: 1, col: 0,
      id: 'segment_atom', // Mirrors row 0, col 1
      label: 'Segment-Atom',
      desc: 'Obstacle avoidance',
      get value() { return workspaceState.physicsSettings?.forces?.atom_nonSuccessive ?? 150; },
      set value(v) { workspaceState.physicsSettings.forces.atom_nonSuccessive = Math.round(v); },
      min: 0,
      max: 1000,
    },
    {
      row: 1, col: 1,
      id: 'segment_segment',
      label: 'Segment-Segment',
      desc: 'Highway separation',
      get value() { return workspaceState.physicsSettings?.forces?.nonSuccessive_nonSuccessive ?? 180; },
      set value(v) { workspaceState.physicsSettings.forces.nonSuccessive_nonSuccessive = Math.round(v); },
      min: 0,
      max: 1000,
    },
    {
      row: 2, col: 2,
      id: 'successive_tension',
      label: 'Tension-Tension',
      desc: 'Successive joint pull',
      get value() { return workspaceState.physicsSettings?.forces?.successive_tension ?? 0.16; },
      set value(v) { workspaceState.physicsSettings.forces.successive_tension = parseFloat(v.toFixed(3)); },
      min: 0.01,
      max: 0.50,
    }
  ]);

  // Click-drag gesture event handlers for the rotatable knobs
  function startDrag(e: MouseEvent, knobId: string, currentVal: number) {
    e.preventDefault();
    dragKnobId = knobId;
    startY = e.clientY;
    startVal = currentVal;
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', stopDrag);
  }

  function handleDrag(e: MouseEvent) {
    if (!dragKnobId) return;
    const cell = matrixCells.find(c => c.id === dragKnobId);
    if (!cell) return;

    const deltaY = startY - e.clientY; // Dragging UP increases value
    const range = cell.max - cell.min;
    
    // Scale drag sensitivity (200px drag for full range)
    let newVal = startVal + (deltaY / 200) * range;
    newVal = Math.max(cell.min, Math.min(cell.max, newVal));
    
    cell.value = newVal;
    
    // Force Svelte 5 global reactivity trigger!
    workspaceState.physicsSettings = { ...workspaceState.physicsSettings };
  }

  function stopDrag() {
    dragKnobId = null;
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', stopDrag);
  }

  // Intense Red (0%) -> Grey (50%) -> Intense Green (100%) linear RGB interpolation
  function getKnobColor(val: number, min: number, max: number): string {
    const pct = (val - min) / (max - min || 1);
    const r = Math.round((1 - pct) * 244 + pct * 0);
    const g = Math.round((1 - pct) * 63 + pct * 255);
    const b = Math.round((1 - pct) * 94 + pct * 204);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Find cell by row/col coordinates
  function getCellAt(row: number, col: number) {
    return matrixCells.find(c => c.row === row && c.col === col) || null;
  }
</script>

<div class="physics-settings-container">
  <div class="settings-header">
    <span class="settings-title">CYBERNETIC SIMULATOR</span>
    <span class="settings-badge">SANDBOX v1.2</span>
  </div>

  <div class="settings-body">
    <!-- Section 1: Vertex Count Constraints -->
    <div class="settings-section">
      <span class="section-heading">Elastic Segments Resolution</span>
      
      <div class="control-group">
        <label for="max-pts-slider" class="control-label">
          <span>Max Intermediates</span>
          <span class="control-val">{workspaceState.physicsSettings?.maxIntermediatePoints ?? 5} nodes</span>
        </label>
        <input 
          id="max-pts-slider"
          type="range" 
          min="1" 
          max="15" 
          step="1" 
          bind:value={workspaceState.physicsSettings.maxIntermediatePoints} 
          oninput={() => workspaceState.physicsSettings = { ...workspaceState.physicsSettings }}
          class="cyber-slider"
        />
        <span class="control-desc">Limits vertices per edge to prevent performance degradation. (Forcing at least 1 point for joints visibility!)</span>
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

    <!-- Section 2: Symmetrical 3x3 Category Force Matrix -->
    <div class="settings-section">
      <span class="section-heading">Symmetrical Force Matrix</span>
      <span class="control-desc header-desc">Click and drag up/down on any knob below to alter the force between categories. Symmetrical coordinates are automatically synchronized!</span>

      <div class="matrix-grid-container">
        <!-- Matrix Header Row -->
        <div class="matrix-row headers-row">
          <div class="matrix-header-cell corner-cell"></div>
          <div class="matrix-header-cell">ATOM</div>
          <div class="matrix-header-cell">SEGMENT</div>
          <div class="matrix-header-cell">TENSION</div>
        </div>

        <!-- 3x3 Symmetrical Matrix Body Rows -->
        {#each ['ATOM', 'SEGMENT', 'TENSION'] as rowLabel, rIdx}
          <div class="matrix-row">
            <div class="matrix-row-header-cell">{rowLabel}</div>
            
            {#each [0, 1, 2] as cIdx}
              {@const cell = getCellAt(rIdx, cIdx)}

              {#if cell}
                {@const pct = (cell.value - cell.min) / (cell.max - cell.min || 1)}
                {@const angle = -140 + pct * 280}
                {@const activeColor = getKnobColor(cell.value, cell.min, cell.max)}

                <!-- Active Knob Cell -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="matrix-cell active-knob-cell"
                  onmousedown={(e) => startDrag(e, cell.id, cell.value)}
                  class:dragging={dragKnobId === cell.id}
                  title="{cell.desc} ({cell.min} to {cell.max})"
                >
                  <div class="mini-knob-container">
                    <svg width="40" height="40" viewBox="0 0 40 40" class="knob-svg">
                      <!-- Circular background -->
                      <circle cx="20" cy="20" r="16" fill="#04060d" stroke="#1f2833" stroke-width="1.5" />
                      
                      <!-- Glowing value arc -->
                      <circle 
                        cx="20" 
                        cy="20" 
                        r="16" 
                        fill="none" 
                        stroke={activeColor} 
                        stroke-width="2.2" 
                        stroke-linecap="round"
                        stroke-dasharray="80"
                        stroke-dashoffset={80 - (80 * pct)}
                        transform="rotate(-230, 20, 20)"
                      />

                      <!-- Needle -->
                      <line 
                        x1="20" 
                        y1="20" 
                        x2="20" 
                        y2="6" 
                        stroke="#ffffff" 
                        stroke-width="2.5" 
                        stroke-linecap="round"
                        transform="rotate({angle}, 20, 20)"
                      />
                    </svg>
                  </div>

                  <div class="knob-value-badge" style="color: {activeColor}; text-shadow: 0 0 6px {activeColor}44">
                    {cell.value.toFixed(cell.id === 'successive_tension' ? 3 : 0)}
                  </div>
                </div>
              {:else}
                <!-- Symmetrically uncoupled / N/A category cell -->
                <div class="matrix-cell na-cell" title="Symmetrically uncoupled categories">
                  <div class="na-ring"></div>
                  <span class="na-text">N/A</span>
                </div>
              {/if}
            {/each}
          </div>
        {/each}
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

  .header-desc {
    margin-bottom: 6px;
  }

  .text-yellow { color: #facc15; }
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
    background: #66fcf1;
    box-shadow: 0 0 6px #66fcf1;
    transition: transform 0.1s ease-in-out;
  }

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

  /* 3x3 Symmetrical Force Matrix Styling */
  .matrix-grid-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background-color: #03050c;
    border: 1px solid rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    padding: 10px;
  }

  .matrix-row {
    display: grid;
    grid-template-columns: 80px repeat(3, 1fr);
    align-items: center;
    gap: 8px;
  }

  .headers-row {
    border-bottom: 1px solid rgba(102, 252, 241, 0.1);
    padding-bottom: 6px;
  }

  .matrix-header-cell {
    font-size: 7.5px;
    font-weight: bold;
    color: #66fcf1;
    text-align: center;
    letter-spacing: 0.5px;
  }

  .matrix-row-header-cell {
    font-size: 7.5px;
    font-weight: bold;
    color: #a855f7;
    letter-spacing: 0.5px;
    text-align: left;
    padding-left: 4px;
  }

  .matrix-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: rgba(10, 14, 26, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    padding: 6px;
    height: 64px;
    box-sizing: border-box;
    transition: background-color 0.1s ease-in-out, border-color 0.1s ease-in-out;
  }

  .active-knob-cell {
    cursor: grab;
  }

  .active-knob-cell:hover {
    background-color: rgba(15, 22, 42, 0.8);
    border-color: rgba(102, 252, 241, 0.15);
  }

  .active-knob-cell.dragging {
    cursor: grabbing;
    background-color: rgba(15, 22, 42, 0.95);
    border-color: #66fcf1;
    box-shadow: 0 0 8px rgba(102, 252, 241, 0.1);
  }

  .mini-knob-container {
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 2px;
  }

  .knob-svg {
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }

  .knob-value-badge {
    font-size: 9px;
    font-weight: bold;
    font-family: inherit;
    text-align: center;
  }

  /* N/A (Symmetrically uncoupled) Cells styling */
  .na-cell {
    opacity: 0.25;
    background-color: rgba(0, 0, 0, 0.2);
    border-style: dashed;
  }

  .na-ring {
    width: 24px;
    height: 24px;
    border: 1px dashed rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    margin-bottom: 4px;
  }

  .na-text {
    font-size: 7.5px;
    color: #45a29e;
    font-weight: bold;
  }
</style>