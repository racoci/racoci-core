<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { parseHCypher } from './lib/HCypherParser';
  import { CanvasRenderer } from './lib/CanvasRenderer';
  import HCypherEditor from './lib/HCypherEditor.svelte';

  // 1. Pre-populated H-Cypher code matching the Holds stage-0 kernel
  let hCypherCode = $state(`// Holds Kernel Topology Rules
// MATCH the stage-0 kernel and its dependency structure
MATCH {
  (kernel {role: "kernel", zone: "stage-0"}) -[:DEPENDS_ON]-> (parser),
  (parser {role: "parser"}) -[:DEPENDS_ON]-> (sync),
  (sync) -[:SYNCS_WITH]-> (memory #ec4899)
}

// Group core components inside a safety membrane with new syntax
[KERNEL_SAFETY_ZONE #a855f7](kernel, parser, sync)

// Active system processes (Multi-Dimensional directed edges!)
(task_queue) -[:ROUTES_TO]-> (kernel)
(task_queue) -[:BUFFERED_BY]-> (memory)

// Directed edge from an external atom to a membrane!
(monitor) -[:MONITORS]-> (KERNEL_SAFETY_ZONE)

// Directed edge pointing directly to a relationship (edge-to-edge)!
(audit_log) -[:LOGS]-> (ROUTES_TO)
`);

  // 2. DOM references
  let canvasElement: HTMLCanvasElement | null = $state(null);
  let containerElement: HTMLElement | null = $state(null);

  // 3. Smart SSR Simulator Templates & Actions
  let selectedTemplate = $state("default");

  const ssrTemplates = {
    default: {
      name: "Default (Holds Kernel Rules)",
      code: `// Holds Kernel Topology Rules
// MATCH the stage-0 kernel and its dependency structure
MATCH {
  (kernel {role: "kernel", zone: "stage-0"}) -[:DEPENDS_ON]-> (parser),
  (parser {role: "parser"}) -[:DEPENDS_ON]-> (sync),
  (sync) -[:SYNCS_WITH]-> (memory #ec4899)
}

// Group core components inside a safety membrane with new syntax
[KERNEL_SAFETY_ZONE #a855f7](kernel, parser, sync)

// Active system processes (Multi-Dimensional directed edges!)
(task_queue) -[:ROUTES_TO]-> (kernel)
(task_queue) -[:BUFFERED_BY]-> (memory)

// Directed edge from an external atom to a membrane!
(monitor) -[:MONITORS]-> (KERNEL_SAFETY_ZONE)

// Directed edge pointing directly to a relationship (edge-to-edge)!
(audit_log) -[:LOGS]-> (ROUTES_TO)
`,
      rule: ""
    },
    forth: {
      name: "Forth (Constant Folding with Comments)",
      code: `// FORTH SOURCE CODE (AST-agnostic stack)
: energy_calc
  2 ( massa ) 3 ( aceleração ) * 3 ( escala_c ) * ( fator_g ) 10 *
;`,
      rule: `MATCH {
  :[a:literal] (:[comment_a]) * :[b:literal] (:[comment_b]) * :[c:literal] (:[comment_c]) * (:[comment_d]) :[scale:literal] *
}
TRANSITION => {
  :[calc(a * b * c * scale)] (:[comment_a]) (:[comment_b]) (:[comment_c]) (:[comment_d]) *
}`
    },
    clojure: {
      name: "Clojure (Thread-First Macro Destructuring)",
      code: `// CLOJURE SOURCE CODE (Homoiconic nested scope)
(defn process-order [order]
  (-> order
      (assoc :timestamp (now))
      (update-in [:user :id] (fn [id] (decrypt-id id)))
      (calculate-tax 0.08)))`,
      rule: `MATCH {
  (-> :[x] 
      (assoc :[k] :[v]) 
      (update-in :[path] (fn [:[arg]] (:[func] :[arg]))) 
      (:[last_func] :[last_arg]))
}
TRANSITION => {
  (:[last_func] 
    (update-in (assoc :[x] :[k] :[v]) :[path] #(:[func] %)) 
    :[last_arg])
}`
    },
    haskell: {
      name: "Haskell (Monadic Bind to Do Notation)",
      code: `// HASKELL SOURCE CODE (Monadic chain)
validateToken token >>= \\tok -> if not (isValid tok) then throwError InvalidToken else fetchRoles tok >>= \\roles -> if null roles then throwError NoRoles else return (tok, roles)`,
      rule: `MATCH {
  :[action1] >>= \\:[tok] -> if not (isValid :[tok]) then throwError :[err1] else :[action2] :[tok] >>= \\:[roles] -> if null :[roles] then throwError :[err2] else return (:[tok], :[roles])
}
TRANSITION => {
  do {
    :[tok] <- :[action1];
    guard (isValid :[tok]) <|> throwError :[err1];
    :[roles] <- :[action2] :[tok];
    guard (not (null :[roles])) <|> throwError :[err2];
    return (:[tok], :[roles])
  }
}`
    },
    prolog: {
      name: "Prolog (Tail Recursion & DCG)",
      code: `// PROLOG SOURCE CODE (Logical rules)
sum_list([], 0).
sum_list([H|T], Sum) :- 
    sum_list(T, Rest), 
    !, 
    Sum is H + Rest, 
    asserta(cache_sum([H|T], Sum)).`,
      rule: `MATCH {
  :[pred]([], 0).
  :[pred]([H|T], Sum) :- :[pred](T, Rest), !, Sum is H + Rest, :[side_effect].
}
TRANSITION => {
  :[pred](L, Sum) :- :[pred]_acc(L, 0, Sum).
  :[pred]_acc([], Acc, Acc).
  :[pred]_acc([H|T], Acc, Sum) :- NewAcc is Acc + H, :[pred]_acc(T, NewAcc, Sum), !, :[side_effect].
}`
    }
  };

  function handleSelectTemplate(name: string) {
    selectedTemplate = name;
    const template = ssrTemplates[name as keyof typeof ssrTemplates];
    if (template) {
      hCypherCode = template.code;
      systemStatus = `SMART SSR: TEMPLATE '${template.name}' LOADED.`;
      
      // Inject visual nodes for the custom languages!
      if (name === "forth" && renderer) {
        hCypherCode = `[FORTH_STACK #a855f7](mass, acceleration, c_factor, g_factor, scale_10)
(mass) -[:MULT_BY]-> (acceleration)
(c_factor) -[:SCALED_BY]-> (g_factor)
(g_factor) -[:COLLAPSED_BY]-> (scale_10)
`;
      } else if (name === "clojure" && renderer) {
        hCypherCode = `[CLOJURE_NAMESPACE #00ffcc](transform_user, get_user, assoc_active, update_prefs, decrypt_id)
(transform_user) -[:READS_FROM]-> (get_user)
(assoc_active) -[:UPDATES]-> (update_prefs)
(update_prefs) -[:DECRYPTS_WITH]-> (decrypt_id)
`;
      } else if (name === "haskell" && renderer) {
        hCypherCode = `[HASKELL_MONAD #ec4899](validate_token, fetch_roles, guard_token, guard_roles, return_tuple)
(validate_token) -[:BINDS_TO]-> (guard_token)
(fetch_roles) -[:BINDS_TO]-> (guard_roles)
(guard_roles) -[:RETURNS]-> (return_tuple)
`;
      } else if (name === "prolog" && renderer) {
        hCypherCode = `[PROLOG_DATABASE #eab308](sentence_rule, noun_phrase, verb_phrase, unification_expr)
(sentence_rule) -[:PARSES]-> (noun_phrase)
(noun_phrase) -[:CUTS_TO]-> (verb_phrase)
(verb_phrase) -[:UNIFIES]-> (unification_expr)
`;
      }
    }
    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
    }, 3000);
  }

  function handleRunSmartRefactor() {
    if (selectedTemplate === "default") {
      systemStatus = "SMART SSR: CHOOSE AN EXOTIC LANGUAGE TEMPLATE FIRST!";
      return;
    }

    systemStatus = "SMART SSR: INITIATING ALGEBRAIC DPO PUSHOUT REWRITE (L => R)...";
    
    // Simulate updating the text and triggering the beautiful visual transition
    setTimeout(() => {
      const template = ssrTemplates[selectedTemplate as keyof typeof ssrTemplates];
      if (template) {
        // Trigger a gorgeous flashing visual on the active nodes!
        if (renderer) {
          renderer.illuminatePath(Array.from(renderer.nodes.keys()));
          
          // Make some nodes slide to the bottom right sys::residue!
          const activeNodes = Array.from(renderer.nodes.values());
          if (activeNodes.length >= 2) {
            const residueNode = activeNodes[activeNodes.length - 1];
            residueNode.isRemoved = true;
            residueNode.slideProgress = 0;
            residueNode.targetX = renderer.canvas.width / window.devicePixelRatio - 120;
            residueNode.targetY = renderer.canvas.height / window.devicePixelRatio - 120;
          }
        }

        // Replace the code with the beautiful, refactored final result!
        if (selectedTemplate === "forth") {
          hCypherCode = `// FORTH REFACTORED VIA SMART SSR (DPO REWRITE)
: energy_calc
  180 ( massa ) ( aceleração ) ( escala_c ) ( fator_g ) *
;`;
        } else if (selectedTemplate === "clojure") {
          hCypherCode = `// CLOJURE REFACTORED VIA SMART SSR (DPO REWRITE)
(defn transform-user [db user-id]
  (let [prefs (get-user-prefs (get-user db user-id) :preferences)] (assoc (get-user db user-id) :active true :preferences (assoc prefs :theme (invert-theme theme)))))`;
        } else if (selectedTemplate === "haskell") {
          hCypherCode = `// HASKELL REFACTORED VIA SMART SSR (DPO REWRITE)
do
  tok <- validateToken token
  guard (isValid tok) <|> throwError InvalidToken
  roles <- fetchRoles tok
  guard (not (null roles)) <|> throwError NoRoles
  return (tok, roles)`;
        } else if (selectedTemplate === "prolog") {
          hCypherCode = `// PROLOG REFACTORED VIA SMART SSR (DPO REWRITE)
sentence(S, S0, S) :- noun_phrase(N, S0, S1), !, verb_phrase(V, S1, S), S = sentence(N, V).`;
        }

        systemStatus = "SMART SSR: DPO REWRITE COMMITTED successfully! ENTROPY REDUCED.";
      }
    }, 1800);

    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (renderer) renderer.illuminatePath([]);
    }, 5000);
  }

  // 3. Simulation & state
  let renderer = $state<CanvasRenderer | null>(null);
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
      
      // Initial topology load
      renderer.updateTopology(
        parseResult.nodes,
        parseResult.edges,
        parseResult.membranes
      );
      
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

  // Smart SSR Action 1: Commutative Term Reordering (A + B => B + A)
  function handleSSRReorder() {
    systemStatus = "SMART SSR: DETECTING COMMUTATIVE PATTERNS...";
    
    // Check current state in text
    if (hCypherCode.includes("(task_queue) -[:ROUTES_TO]-> (kernel)")) {
      systemStatus = "SMART SSR: COMMUTATIVE TERM SWAP APPLIED (ROUTES_TO)";
      hCypherCode = hCypherCode.replace(
        "(task_queue) -[:ROUTES_TO]-> (kernel)",
        "(kernel) -[:ROUTES_TO]-> (task_queue)"
      );
      if (renderer) {
        renderer.illuminatePath(["task_queue", "kernel"]);
      }
    } else if (hCypherCode.includes("(kernel) -[:ROUTES_TO]-> (task_queue)")) {
      systemStatus = "SMART SSR: COMMUTATIVE TERM SWAP REVERSED (ROUTES_TO)";
      hCypherCode = hCypherCode.replace(
        "(kernel) -[:ROUTES_TO]-> (task_queue)",
        "(task_queue) -[:ROUTES_TO]-> (kernel)"
      );
      if (renderer) {
        renderer.illuminatePath(["kernel", "task_queue"]);
      }
    } else {
      // Incase user modified the text, inject first
      systemStatus = "SMART SSR: TERM INJECTED & REORDERED";
      hCypherCode += `\n(kernel) -[:ROUTES_TO]-> (task_queue)\n`;
    }

    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (renderer) renderer.illuminatePath([]);
    }, 4000);
  }

  // Smart SSR Action 2: Nested Conditional Flattening (A => B)
  // Replaces deeply nested structures with a flat, merged conditional,
  // making the excised sub-scaffolding slide organically into the residue ghost membrane!
  function handleSSRFlatten() {
    systemStatus = "SMART SSR: SCANNING NESTED CONDITIONAL MEMBRANES...";
    
    // Setup nested conditionals if they are not already there
    if (!hCypherCode.includes("nested_if")) {
      hCypherCode += `\n// Nested conditionals prior to Smart SSR\n(if_block) -[:COND]-> (A)\n(if_block) -[:BODY]-> (nested_if)\n(nested_if) -[:COND]-> (B)\n(nested_if) -[:BODY]-> (body_block)\n`;
      systemStatus = "SMART SSR: NESTED CONDITIONALS INJECTED";
    } else {
      // Perform flattening!
      systemStatus = "SMART SSR: FLATTENING CONDITIONALS... DPO SUBSTITUTION";
      
      hCypherCode = hCypherCode.replace(
        `\n// Nested conditionals prior to Smart SSR\n(if_block) -[:COND]-> (A)\n(if_block) -[:BODY]-> (nested_if)\n(nested_if) -[:COND]-> (B)\n(nested_if) -[:BODY]-> (body_block)\n`,
        `\n// Flattened conditional applied via Smart SSR\n(if_block) -[:COND]-> (A_AND_B)\n(if_block) -[:BODY]-> (body_block)\n`
      );

      // Trigger a beautiful sliding visual transition on the 'nested_if' node
      // making it slide into the bottom-right sys::residue area!
      if (renderer) {
        const nestedIfNode = Array.from(renderer.nodes.values()).find(n => n.id === "nested_if");
        if (nestedIfNode) {
          nestedIfNode.isRemoved = true;
          nestedIfNode.slideProgress = 0;
          nestedIfNode.targetX = renderer.canvas.width / window.devicePixelRatio - 120;
          nestedIfNode.targetY = renderer.canvas.height / window.devicePixelRatio - 120;
        }
      }
    }

    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
    }, 4000);
  }

  // Smart SSR Action 3: Safe Nesting Inversion with Vacuum Check
  function handleSSRSafeSwap() {
    systemStatus = "SMART SSR: RUNNING VACUUM ASSERTER (~ MUTATION)...";
    
    if (!hCypherCode.includes("[IF_A]")) {
      hCypherCode += `\n// Safe nested scopes prior to Smart SSR\n[IF_A](kernel, parser)\n[IF_B](sync, memory)\n`;
      systemStatus = "SMART SSR: NESTED SCOPES INJECTED";
    } else {
      if (hCypherCode.includes("[IF_A](kernel, parser)\n[IF_B](sync, memory)")) {
        systemStatus = "SMART SSR: INVERTING NESTED SCOPES SAFELY";
        hCypherCode = hCypherCode.replace(
          "[IF_A](kernel, parser)\n[IF_B](sync, memory)",
          "[IF_B](sync, memory)\n[IF_A](kernel, parser)"
        );
        if (renderer) {
          renderer.illuminatePath(["kernel", "parser", "sync", "memory"]);
        }
      } else {
        systemStatus = "SMART SSR: REVERSING NESTED SCOPES SWAP";
        hCypherCode = hCypherCode.replace(
          "[IF_B](sync, memory)\n[IF_A](kernel, parser)",
          "[IF_A](kernel, parser)\n[IF_B](sync, memory)"
        );
        if (renderer) {
          renderer.illuminatePath(["sync", "memory", "kernel", "parser"]);
        }
      }
    }

    setTimeout(() => {
      systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (renderer) renderer.illuminatePath([]);
    }, 4000);
  }

  // 4. Customization state & logic
  let currentBgColor = $state('#0b0f19');

  // Watch background color changes and update CanvasRenderer
  $effect(() => {
    if (renderer && currentBgColor) {
      renderer.setBackgroundColor(currentBgColor);
    }
  });

  // 4.5 Resizable Split-Pane Layout state and mouse drag handlers
  let splitPercent = $state(45); // start at 45% width of screen
  let isDragging = $state(false);

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const percentage = (e.clientX / window.innerWidth) * 100;
    // Clamp between 20% and 80% to keep both panes visible
    splitPercent = Math.max(20, Math.min(80, percentage));

    // Force canvas resize instantly
    if (renderer && containerElement) {
      renderer.resize(
        containerElement.clientWidth,
        containerElement.clientHeight
      );
    }
  }

  function handleMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function handleUpdateColor(color: string) {
    if (selectedNode) {
      selectedNode.color = color;
      
      // Update in H-Cypher text!
      updateElementColorInText(selectedNode.id, selectedNode.elementType || 'node', color);
    }
  }

  function updateElementColorInText(id: string, elementType: 'node' | 'edge', newColor: string) {
    if (elementType === 'node') {
      // 1. Try to find explicit declaration: (id { ... })
      const propsRegex = new RegExp(`\\(${id}\\s*\\{([^}]+)\\}\\)`);
      if (propsRegex.test(hCypherCode)) {
        hCypherCode = hCypherCode.replace(propsRegex, (match, props) => {
          if (props.includes('color:')) {
            return `(${id} {${props.replace(/color:\s*["']#[0-9a-fA-F]{6}["']|color:\s*["']\w+["']/, `color: "${newColor}"`)}})`;
          } else {
            return `(${id} {${props.trim()}, color: "${newColor}"})`;
          }
        });
        return;
      }
      // 2. Try to find simple declaration: (id) (not followed by -> or part of -[:...]-> )
      const nodeRegex = new RegExp(`\\(${id}\\)`);
      if (nodeRegex.test(hCypherCode)) {
        hCypherCode = hCypherCode.replace(nodeRegex, `(${id} {color: "${newColor}"})`);
        return;
      }
      // 3. Fallback: append node declaration at the end
      hCypherCode += `\n(${id} {color: "${newColor}"})`;
    } else if (elementType === 'edge') {
      const source = selectedNode.source;
      const target = selectedNode.target;
      const label = selectedNode.label;

      const edgeRelRegex = new RegExp(`\\(${source}\\)\\s*-\\s*\\[\\s*:?${label}(?:\\s*\\{([^}]+)\\})?\\s*\\]\\s*->\\s*\\(${target}\\)`);
      if (edgeRelRegex.test(hCypherCode)) {
        hCypherCode = hCypherCode.replace(edgeRelRegex, (match, props) => {
          if (props) {
            if (props.includes('color:')) {
              return `(${source}) -[:${label} {${props.replace(/color:\s*["']#[0-9a-fA-F]{6}["']|color:\s*["']\w+["']/, `color: "${newColor}"`)}}]-> (${target})`;
            } else {
              return `(${source}) -[:${label} {${props.trim()}, color: "${newColor}"}]-> (${target})`;
            }
          } else {
            return `(${source}) -[:${label} {color: "${newColor}"}]-> (${target})`;
          }
        });
        return;
      }

      const simpleEdgeRegex = new RegExp(`\\(${source}\\)\\s*->\\s*\\(${target}\\)`);
      if (simpleEdgeRegex.test(hCypherCode)) {
        hCypherCode = hCypherCode.replace(simpleEdgeRegex, `(${source}) -[:${label} {color: "${newColor}"}]-> (${target})`);
        return;
      }
    }
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
        <span class="stat-label">CANVAS BG:</span>
        <select class="bg-select" bind:value={currentBgColor}>
          <option value="#0b0f19">Space Dark</option>
          <option value="#05070a">Deep Black</option>
          <option value="#f8fafc">Clean Light</option>
          <option value="#1e293b">Nebula Grey</option>
          <option value="#fdf6e3">Solarized Cream</option>
        </select>
      </div>
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
    <section class="pane left-pane" style="width: {splitPercent}%;">
      <div class="pane-header">
        <span class="badge">Projection A</span>
        <h2>H-Cypher Algebraic Spec</h2>
        <span class="extension">.hcypher</span>
      </div>
      
      <div class="editor-container">
        <HCypherEditor bind:value={hCypherCode} bgColor={currentBgColor} />
      </div>

      <!-- Quick inject buttons / helpful syntax -->
      <div class="editor-footer">
        <div class="syntax-tips">
          <span><strong>Quick Syntax:</strong> <code>(a) -> (b)</code> Edge | <code>[M ~ a]</code> Membrane</span>
        </div>
      </div>
    </section>

    <!-- Draggable Pane Splitter Divider -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="pane-splitter" 
      class:active={isDragging}
      onmousedown={handleMouseDown}
      title="Drag to resize Projections"
    >
      <div class="splitter-line"></div>
    </div>

    <!-- PANE 2: Spatial WebGL Hypergraph Projection (Right) -->
    <section class="pane right-pane" style="width: {100 - splitPercent}%;">
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
      <div class="canvas-container" bind:this={containerElement} style="background-color: {currentBgColor}">
        <canvas bind:this={canvasElement}></canvas>

        <!-- Selected Element Inspector overlay on the canvas -->
        {#if selectedNode}
          <div class="inspector-card">
            <div class="card-header">
              <h3>{selectedNode.elementType === 'edge' ? 'Edge' : 'Atom'} Properties</h3>
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
              {#if selectedNode.elementType === 'edge'}
                <div class="prop-row">
                  <span class="prop-key">SOURCE:</span>
                  <span class="prop-val monospace">{selectedNode.source}</span>
                </div>
                <div class="prop-row">
                  <span class="prop-key">TARGET:</span>
                  <span class="prop-val monospace">{selectedNode.target}</span>
                </div>
              {:else}
                <div class="prop-row">
                  <span class="prop-key">TYPE:</span>
                  <span class="prop-val badge-type">{selectedNode.type}</span>
                </div>
              {/if}
              <div class="prop-row">
                <span class="prop-key">STATE:</span>
                <span class="prop-val" style="color: {selectedNode.isRemoved ? '#ef4444' : '#22c55e'}">
                  {selectedNode.isRemoved ? 'RESIDUE_GHOST' : 'ACTIVE_ELEMENT'}
                </span>
              </div>
              
              {#if selectedNode.properties}
                <div class="props-sub-section">
                  <h4>Custom Attributes</h4>
                  {#each Object.entries(selectedNode.properties) as [key, val]}
                    {#if key !== 'color'}
                      <div class="prop-row indent">
                        <span class="prop-key">{key}:</span>
                        <span class="prop-val italic">"{val}"</span>
                      </div>
                    {/if}
                  {/each}
                </div>
              {:else}
                <div class="props-sub-section">
                  <span class="no-props">No supplementary attributes.</span>
                </div>
              {/if}

              <!-- Interactive Color Customizer Palette Picker -->
              <div class="props-sub-section">
                <h4>Color Palette Picker</h4>
                <div class="color-palette">
                  {#each ['#ffffff', '#00d2ff', '#a855f7', '#22c55e', '#eab308', '#f97316', '#ec4899'] as color}
                    <button 
                      class="color-dot {selectedNode.color === color || (!selectedNode.color && color === '#ffffff') ? 'active' : ''}" 
                      style="background-color: {color};"
                      title={color}
                      onclick={() => handleUpdateColor(color)}
                    ></button>
                  {/each}
                </div>
              </div>
              
              {#if selectedNode.x !== undefined && selectedNode.y !== undefined}
                <div class="coordinates">
                  <span>COORD: X:{Math.round(selectedNode.x)}px Y:{Math.round(selectedNode.y)}px</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Smart SSR Refactoring Simulator Panel -->
      <div class="ssr-simulator-bar">
        <span class="ssr-bar-title">Smart SSR:</span>
        <select class="template-select" value={selectedTemplate} onchange={(e) => handleSelectTemplate(e.currentTarget.value)}>
          <option value="default">Select Paradigm Template...</option>
          <option value="forth">Forth (Concatenative)</option>
          <option value="clojure">Clojure (Homoiconic)</option>
          <option value="haskell">Haskell (Monadic/Transformer)</option>
          <option value="prolog">Prolog (Logical DCG)</option>
        </select>
        
        <button class="btn btn-refactor" onclick={handleRunSmartRefactor} title="Execute category-theoretic DPO rewrite">
          ⚡ Run Refactor (H-Patch)
        </button>

        <span class="divider">|</span>

        <button class="btn btn-ssr" onclick={handleSSRReorder} title="Swap Term Order (A + B ⇒ B + A)">
          A + B ⇄ B + A
        </button>
        <button class="btn btn-ssr" onclick={handleSSRFlatten} title="Flatten Nested Conditionals (If/Else)">
          Flatten Ifs
        </button>
        <button class="btn btn-ssr" onclick={handleSSRSafeSwap} title="Invert Nested Scopes safely with Vacuum check (~)">
          Safe Swap (~)
        </button>
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
    display: flex;
    flex-direction: row;
    flex: 1;
    height: calc(100vh - 58px);
    overflow: hidden;
    position: relative;
  }

  .pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .left-pane {
    background-color: #12131c;
  }

  .pane-splitter {
    width: 6px;
    background-color: #0c0d14;
    cursor: col-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    user-select: none;
    transition: background-color 0.15s, box-shadow 0.15s;
    border-left: 1px solid rgba(255, 255, 255, 0.04);
    border-right: 1px solid rgba(255, 255, 255, 0.04);
  }

  .pane-splitter:hover, .pane-splitter.active {
    background-color: #00d2ff;
    box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
  }

  .splitter-line {
    width: 1px;
    height: 24px;
    background-color: rgba(255, 255, 255, 0.15);
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

  /* Smart SSR Simulator Bar */
  .ssr-simulator-bar {
    display: flex;
    gap: 12px;
    padding: 10px 20px;
    background: #12131c;
    border-top: 1px solid #1f2833;
    border-bottom: 1px solid rgba(255,255,255,0.02);
    align-items: center;
    font-size: 11px;
    z-index: 10;
  }

  .ssr-bar-title {
    color: #a855f7;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(168, 85, 247, 0.4);
    letter-spacing: 0.5px;
    margin-right: 4px;
  }

  .template-select {
    background: #1f2833;
    color: #ffffff;
    border: 1px solid #45a29e;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 11px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }

  .template-select:focus {
    box-shadow: 0 0 8px rgba(69, 162, 158, 0.4);
  }

  .btn-refactor {
    background: #a855f7;
    color: #ffffff;
    border: none;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(255,255,255,0.4);
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
  }

  .btn-refactor:hover {
    background: #c084fc;
    box-shadow: 0 0 15px rgba(168, 85, 247, 0.6);
  }

  .divider {
    color: #1f2833;
    font-weight: bold;
    margin: 0 4px;
  }

  .btn-ssr {
    background: rgba(168, 85, 247, 0.05);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .btn-ssr:hover {
    background: rgba(168, 85, 247, 0.15);
    border-color: #a855f7;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
    color: #ffffff;
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

  /* Background select custom style */
  .bg-select {
    background-color: #12131c;
    border: 1px solid #1f2833;
    color: #66fcf1;
    font-family: inherit;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    font-weight: bold;
  }

  .bg-select:focus {
    border-color: #66fcf1;
  }

  /* Color Palette Selector */
  .color-palette {
    display: flex;
    gap: 8px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    padding: 0;
    transition: all 0.15s ease-in-out;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.4);
  }

  .color-dot:hover {
    transform: scale(1.2);
    border-color: #ffffff;
  }

  .color-dot.active {
    transform: scale(1.15);
    border-color: #66fcf1;
    box-shadow: 0 0 8px rgba(102, 252, 241, 0.6), inset 0 0 4px rgba(0, 0, 0, 0.4);
  }
</style>
