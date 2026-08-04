<!-- SSRSimulatorView.svelte (Svelte 5) -->
<script lang="ts">
  import { workspaceState } from './workspaceState.svelte.js';
</script>

<div class="ssr-simulator-container">
  <div class="simulator-header">
    <h3>Smart SSR Refactoring Engine</h3>
    <p class="subtitle">Category-theoretic Double Pushout (DPO) Graph Rewriting & Algebraic Invariant Symmetrization</p>
  </div>

  <div class="section">
    <h4>1. Active Language Paradigm Select</h4>
    <div class="control-row">
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
    </div>
  </div>

  <div class="section">
    <h4>2. Commutative Graph Rewrites (L ⇒ R)</h4>
    <div class="button-grid">
      <button class="btn btn-ssr" onclick={() => workspaceState.ssrReorder()} title="Swap Term Order">
        Swap A+B (Commutative)
      </button>
      <button class="btn btn-ssr" onclick={() => workspaceState.ssrFlatten()} title="Flatten Nested Conditionals">
        Flatten Ifs
      </button>
      <button class="btn btn-ssr" onclick={() => workspaceState.ssrSafeSwap()} title="Invert Nested Scopes Safely">
        Safe Swap (~)
      </button>
    </div>
  </div>

  <div class="section">
    <h4>3. Algebraic Transition & Proofs</h4>
    <div class="button-grid">
      <button class="btn btn-primary" onclick={() => workspaceState.runSmartRefactor()} title="Execute category-theoretic DPO rewrite">
        ⚡ Run Smart Refactor
      </button>
      <button class="btn btn-secondary" onclick={() => workspaceState.triggerTransition()} title="Transition active subgraphs to Residue channels">
        Trigger Transition (L ⇒ R)
      </button>
      <button class="btn btn-info" onclick={() => workspaceState.illuminateProof()} title="Trace evaluation trails along isomorphic pathways">
        Isomorphism Proof Trace
      </button>
    </div>
  </div>

  <div class="section">
    <h4>4. Workspace Operations</h4>
    <div class="button-grid">
      <button class="btn btn-tertiary" onclick={() => workspaceState.injectFormula()}>
        + Inject Atom
      </button>
      <button class="btn btn-danger" onclick={() => workspaceState.clearWorkspace()} title="Reset Workspace">
        Reset Canvas
      </button>
    </div>
  </div>

  <div class="status-box">
    <span class="status-label">STATUS:</span>
    <span class="status-value monospace">{workspaceState.systemStatus}</span>
  </div>
</div>

<style>
  .ssr-simulator-container {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: #0b0f19;
    color: #c5c6c7;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    font-family: inherit;
  }

  .simulator-header {
    border-bottom: 1px solid #1f2833;
    padding-bottom: 8px;
  }

  .simulator-header h3 {
    margin: 0;
    color: #66fcf1;
    font-size: 14px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .subtitle {
    margin: 4px 0 0 0;
    font-size: 9px;
    color: #45a29e;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section h4 {
    margin: 0;
    font-size: 9px;
    color: #8b9bb4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: bold;
  }

  .control-row {
    display: flex;
  }

  .template-select {
    flex: 1;
    background: #1f2833;
    color: #ffffff;
    border: 1px solid #45a29e;
    border-radius: 3px;
    padding: 6px 10px;
    font-size: 11px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s ease-in-out;
  }

  .template-select:focus {
    border-color: #66fcf1;
  }

  .button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 8px;
  }

  .btn {
    font-family: inherit;
    font-size: 10px;
    padding: 6px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 4px;
    transition: all 0.15s ease-in-out;
    border: 1px solid transparent;
  }

  .btn-ssr {
    background: rgba(168, 85, 247, 0.05);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.25);
  }

  .btn-ssr:hover {
    background: rgba(168, 85, 247, 0.12);
    border-color: #a855f7;
    color: #ffffff;
  }

  .btn-primary {
    background-color: #a855f7;
    color: #ffffff;
    box-shadow: 0 0 6px rgba(168, 85, 247, 0.2);
  }

  .btn-primary:hover {
    background-color: #c084fc;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
  }

  .btn-secondary {
    background-color: #22c55e;
    color: #052e16;
  }

  .btn-secondary:hover {
    background-color: #4ade80;
  }

  .btn-info {
    background-color: #eab308;
    color: #422006;
  }

  .btn-info:hover {
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

  .btn-danger {
    background-color: transparent;
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.2);
  }

  .btn-danger:hover {
    background-color: rgba(239, 68, 68, 0.08);
  }

  .status-box {
    margin-top: auto;
    background: rgba(15, 17, 26, 0.95);
    border: 1px solid #1f2833;
    border-left: 3px solid #a855f7;
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
  }

  .status-label {
    font-size: 8px;
    color: #8b9bb4;
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .status-value {
    font-size: 10px;
    color: #c084fc;
    font-weight: bold;
  }

  .monospace {
    font-family: monospace;
  }
</style>
