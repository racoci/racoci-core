// workspaceState.svelte.ts - Svelte 5 Centralized Workspace State and Actions
import { parseHCypher } from './HCypherParser.js';
import type { LayoutNode, SplitNode, WidgetNode } from './layout.js';

export class WorkspaceState {
  hCypherCode = $state(`// Holds Kernel Topology Rules
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

  selectedTemplate = $state("default");
  systemStatus = $state("IDLE (LOCK_FREE_BUS_SYNC)");
  wasmMemoryUsage = $state(128.4);
  frameRate = $state(60);
  currentBgColor = $state("#0b0f19");
  selectedNode = $state<any>(null);
  renderer: any = null; // CanvasRenderer reference

  // Global Physics Simulation Settings (Customizable via new Simulation Widget)
  physicsSettings = $state({
    maxIntermediatePoints: 5,
    showIntermediatePoints: false,
    masses: {
      atom: 1.0,                     // base mass of standard atoms
      segment: 0.25,                 // base mass of intermediate points
    },
    forces: {
      atom_atom: 1500,               // kRepulsion between standard atoms
      atom_nonSuccessive: 150,       // repulsion between atoms and intermediate points
      nonSuccessive_nonSuccessive: 180, // repulsion between different intermediate points
      successive_tension: 0.16,      // elastic spring tension between consecutive points
      strain_min: 2.0,               // threshold to remove intermediate points (too relaxed)
      strain_max: 10.0,              // threshold to add intermediate points (too stretched)
    }
  });

  // Predefined projections / workspaces list
  workspaces = [
    { id: 'kernel', name: 'Holds Kernel Overview', updated: '2026-03-05' },
    { id: 'forth', name: 'Concatenative Stack', updated: '2026-03-05' },
    { id: 'clojure', name: 'Homoiconic Namespace', updated: '2026-03-05' },
    { id: 'haskell', name: 'Monadic Composition', updated: '2026-03-05' },
    { id: 'prolog', name: 'Logical DCG Database', updated: '2026-03-05' }
  ];
  selectedWorkspaceId = $state('kernel');

  // Blender layout binary partition tree
  layoutTree = $state<LayoutNode>({
    type: 'split',
    split: 'vertical',
    percent: 18,
    children: [
      {
        type: 'widget',
        id: 'widget-workspaces',
        widgetType: 'workspaces'
      },
      {
        type: 'split',
        split: 'vertical',
        percent: 38,
        children: [
          {
            type: 'widget',
            id: 'widget-editor',
            widgetType: 'editor'
          },
          {
            type: 'split',
            split: 'vertical',
            percent: 65,
            children: [
              {
                type: 'split',
                split: 'vertical',
                percent: 50,
                children: [
                  {
                    type: 'widget',
                    id: 'widget-canvas',
                    widgetType: 'canvas'
                  },
                  {
                    type: 'widget',
                    id: 'widget-3d',
                    widgetType: 'projection3d'
                  }
                ]
              },
              {
                type: 'widget',
                id: 'widget-physics-settings',
                widgetType: 'physics_settings'
              }
            ]
          }
        ]
      }
    ]
  });

  // Derived parser results
  parseResult = $derived.by(() => parseHCypher(this.hCypherCode));
  atomCount = $derived(this.parseResult.nodes.length);
  edgeCount = $derived(this.parseResult.edges.length);
  membraneCount = $derived(this.parseResult.membranes.length);

  ssrTemplates = {
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

  selectTemplate(name: string) {
    this.selectedTemplate = name;
    this.selectedWorkspaceId = name;
    const template = this.ssrTemplates[name as keyof typeof this.ssrTemplates];
    if (template) {
      this.hCypherCode = template.code;
      this.systemStatus = `SMART SSR: TEMPLATE '${template.name}' LOADED.`;
      
      if (name === "forth") {
        this.hCypherCode = `[FORTH_STACK #a855f7](mass, acceleration, c_factor, g_factor, scale_10)
(mass) -[:MULT_BY]-> (acceleration)
(c_factor) -[:SCALED_BY]-> (g_factor)
(g_factor) -[:COLLAPSED_BY]-> (scale_10)
`;
      } else if (name === "clojure") {
        this.hCypherCode = `[CLOJURE_NAMESPACE #00ffcc](transform_user, get_user, assoc_active, update_prefs, decrypt_id)
(transform_user) -[:READS_FROM]-> (get_user)
(assoc_active) -[:UPDATES]-> (update_prefs)
(update_prefs) -[:DECRYPTS_WITH]-> (decrypt_id)
`;
      } else if (name === "haskell") {
        this.hCypherCode = `[HASKELL_MONAD #ec4899](validate_token, fetch_roles, guard_token, guard_roles, return_tuple)
(validate_token) -[:BINDS_TO]-> (guard_token)
(fetch_roles) -[:BINDS_TO]-> (guard_roles)
(guard_roles) -[:RETURNS]-> (return_tuple)
`;
      } else if (name === "prolog") {
        this.hCypherCode = `[PROLOG_DATABASE #eab308](sentence_rule, noun_phrase, verb_phrase, unification_expr)
(sentence_rule) -[:PARSES]-> (noun_phrase)
(noun_phrase) -[:CUTS_TO]-> (verb_phrase)
(verb_phrase) -[:UNIFIES]-> (unification_expr)
`;
      }
    }
    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
    }, 3000);
  }

  runSmartRefactor() {
    if (this.selectedTemplate === "default") {
      this.systemStatus = "SMART SSR: CHOOSE AN EXOTIC LANGUAGE TEMPLATE FIRST!";
      return;
    }

    this.systemStatus = "SMART SSR: INITIATING ALGEBRAIC DPO PUSHOUT REWRITE (L => R)...";
    
    setTimeout(() => {
      const template = this.ssrTemplates[this.selectedTemplate as keyof typeof this.ssrTemplates];
      if (template) {
        if (this.renderer) {
          this.renderer.illuminatePath(Array.from(this.renderer.nodes.keys()));
          
          const activeNodes = Array.from(this.renderer.nodes.values()) as any[];
          if (activeNodes.length >= 2) {
            const residueNode = activeNodes[activeNodes.length - 1];
            residueNode.isRemoved = true;
            residueNode.slideProgress = 0;
            residueNode.targetX = this.renderer.canvas.width / window.devicePixelRatio - 120;
            residueNode.targetY = this.renderer.canvas.height / window.devicePixelRatio - 120;
          }
        }

        if (this.selectedTemplate === "forth") {
          this.hCypherCode = `// FORTH REFACTORED VIA SMART SSR (DPO REWRITE)
: energy_calc
  180 ( massa ) ( aceleração ) ( escala_c ) ( fator_g ) *
;`;
        } else if (this.selectedTemplate === "clojure") {
          this.hCypherCode = `// CLOJURE REFACTORED VIA SMART SSR (DPO REWRITE)
(defn transform-user [db user-id]
  (let [prefs (get-user-prefs (get-user db user-id) :preferences)] (assoc (get-user db user-id) :active true :preferences (assoc prefs :theme (invert-theme theme)))))`;
        } else if (this.selectedTemplate === "haskell") {
          this.hCypherCode = `// HASKELL REFACTORED VIA SMART SSR (DPO REWRITE)
do
  tok <- validateToken token
  guard (isValid tok) <|> throwError InvalidToken
  roles <- fetchRoles tok
  guard (not (null roles)) <|> throwError NoRoles
  return (tok, roles)`;
        } else if (this.selectedTemplate === "prolog") {
          this.hCypherCode = `// PROLOG REFACTORED VIA SMART SSR (DPO REWRITE)
sentence(S, S0, S) :- noun_phrase(N, S0, S1), !, verb_phrase(V, S1, S), S = sentence(N, V).`;
        }

        this.systemStatus = "SMART SSR: DPO REWRITE COMMITTED successfully! ENTROPY REDUCED.";
      }
    }, 1800);

    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (this.renderer) this.renderer.illuminatePath([]);
    }, 5000);
  }

  ssrReorder() {
    this.systemStatus = "SMART SSR: DETECTING COMMUTATIVE PATTERNS...";
    
    if (this.hCypherCode.includes("(task_queue) -[:ROUTES_TO]-> (kernel)")) {
      this.systemStatus = "SMART SSR: COMMUTATIVE TERM SWAP APPLIED (ROUTES_TO)";
      this.hCypherCode = this.hCypherCode.replace(
        "(task_queue) -[:ROUTES_TO]-> (kernel)",
        "(kernel) -[:ROUTES_TO]-> (task_queue)"
      );
      if (this.renderer) {
        this.renderer.illuminatePath(["task_queue", "kernel"]);
      }
    } else if (this.hCypherCode.includes("(kernel) -[:ROUTES_TO]-> (task_queue)")) {
      this.systemStatus = "SMART SSR: COMMUTATIVE TERM SWAP REVERSED (ROUTES_TO)";
      this.hCypherCode = this.hCypherCode.replace(
        "(kernel) -[:ROUTES_TO]-> (task_queue)",
        "(task_queue) -[:ROUTES_TO]-> (kernel)"
      );
      if (this.renderer) {
        this.renderer.illuminatePath(["kernel", "task_queue"]);
      }
    } else {
      this.systemStatus = "SMART SSR: TERM INJECTED & REORDERED";
      this.hCypherCode += `\n(kernel) -[:ROUTES_TO]-> (task_queue)\n`;
    }

    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (this.renderer) this.renderer.illuminatePath([]);
    }, 4000);
  }

  ssrFlatten() {
    this.systemStatus = "SMART SSR: SCANNING NESTED CONDITIONAL MEMBRANES...";
    
    if (!this.hCypherCode.includes("nested_if")) {
      this.hCypherCode += `\n// Nested conditionals prior to Smart SSR\n(if_block) -[:COND]-> (A)\n(if_block) -[:BODY]-> (nested_if)\n(nested_if) -[:COND]-> (B)\n(nested_if) -[:BODY]-> (body_block)\n`;
      this.systemStatus = "SMART SSR: NESTED CONDITIONALS INJECTED";
    } else {
      this.systemStatus = "SMART SSR: FLATTENING CONDITIONALS... DPO SUBSTITUTION";
      
      this.hCypherCode = this.hCypherCode.replace(
        `\n// Nested conditionals prior to Smart SSR\n(if_block) -[:COND]-> (A)\n(if_block) -[:BODY]-> (nested_if)\n(nested_if) -[:COND]-> (B)\n(nested_if) -[:BODY]-> (body_block)\n`,
        `\n// Flattened conditional applied via Smart SSR\n(if_block) -[:COND]-> (A_AND_B)\n(if_block) -[:BODY]-> (body_block)\n`
      );

      if (this.renderer) {
        const nestedIfNode = Array.from(this.renderer.nodes.values()).find((n: any) => n.id === "nested_if") as any;
        if (nestedIfNode) {
          nestedIfNode.isRemoved = true;
          nestedIfNode.slideProgress = 0;
          nestedIfNode.targetX = this.renderer.canvas.width / window.devicePixelRatio - 120;
          nestedIfNode.targetY = this.renderer.canvas.height / window.devicePixelRatio - 120;
        }
      }
    }

    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
    }, 4000);
  }

  ssrSafeSwap() {
    this.systemStatus = "SMART SSR: RUNNING VACUUM ASSERTER (~ MUTATION)...";
    
    if (!this.hCypherCode.includes("[IF_A]")) {
      this.hCypherCode += `\n// Safe nested scopes prior to Smart SSR\n[IF_A](kernel, parser)\n[IF_B](sync, memory)\n`;
      this.systemStatus = "SMART SSR: NESTED SCOPES INJECTED";
    } else {
      if (this.hCypherCode.includes("[IF_A](kernel, parser)\n[IF_B](sync, memory)")) {
        this.systemStatus = "SMART SSR: INVERTING NESTED SCOPES SAFELY";
        this.hCypherCode = this.hCypherCode.replace(
          "[IF_A](kernel, parser)\n[IF_B](sync, memory)",
          "[IF_B](sync, memory)\n[IF_A](kernel, parser)"
        );
        if (this.renderer) {
          this.renderer.illuminatePath(["kernel", "parser", "sync", "memory"]);
        }
      } else {
        this.systemStatus = "SMART SSR: REVERSING NESTED SCOPES SWAP";
        this.hCypherCode = this.hCypherCode.replace(
          "[IF_B](sync, memory)\n[IF_A](kernel, parser)",
          "[IF_A](kernel, parser)\n[IF_B](sync, memory)"
        );
        if (this.renderer) {
          this.renderer.illuminatePath(["sync", "memory", "kernel", "parser"]);
        }
      }
    }

    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (this.renderer) this.renderer.illuminatePath([]);
    }, 4000);
  }

  triggerTransition() {
    this.systemStatus = "REWRITING... SUBGRAPH L => R";
    if (this.renderer) {
      this.renderer.triggerDemoTransition();
    }
    
    setTimeout(() => {
      this.hCypherCode += `\n// Rewritten state applied\n(sync) -[:REWRITES]-> (kernel)\n`;
      this.systemStatus = "TRANSITION COMPLETED";
    }, 1500);

    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
    }, 4000);
  }

  illuminateProof() {
    this.systemStatus = "ILLUMINATING ISOMORPHISM EVALUATION PATH";
    if (this.renderer) {
      this.renderer.illuminatePath(["kernel", "parser", "sync", "memory"]);
    }

    setTimeout(() => {
      this.systemStatus = "IDLE (LOCK_FREE_BUS_SYNC)";
      if (this.renderer) this.renderer.illuminatePath([]);
    }, 6000);
  }

  injectFormula() {
    this.hCypherCode += `\n(user_interface) -[:PROJECTS]-> (task_queue)\n`;
  }

  clearWorkspace() {
    this.hCypherCode = `(kernel) -> (parser)`;
    this.selectedNode = null;
  }

  updateColor(color: string) {
    if (this.selectedNode) {
      this.selectedNode.color = color;
      this.updateElementColorInText(this.selectedNode.id, this.selectedNode.elementType || 'node', color);
    }
  }

  updateElementColorInText(id: string, elementType: 'node' | 'edge', newColor: string) {
    if (elementType === 'node') {
      const propsRegex = new RegExp(`\\(${id}\\s*\\{([^}]+)\\}\\)`);
      if (propsRegex.test(this.hCypherCode)) {
        this.hCypherCode = this.hCypherCode.replace(propsRegex, (match, props) => {
          if (props.includes('color:')) {
            return `(${id} {${props.replace(/color:\s*["']#[0-9a-fA-F]{6}["']|color:\s*["']\w+["']/, `color: "${newColor}"`)}})`;
          } else {
            return `(${id} {${props.trim()}, color: "${newColor}"})`;
          }
        });
        return;
      }
      const nodeRegex = new RegExp(`\\(${id}\\)`);
      if (nodeRegex.test(this.hCypherCode)) {
        this.hCypherCode = this.hCypherCode.replace(nodeRegex, `(${id} {color: "${newColor}"})`);
        return;
      }
      this.hCypherCode += `\n(${id} {color: "${newColor}"})`;
    } else if (elementType === 'edge') {
      const source = this.selectedNode.source;
      const target = this.selectedNode.target;
      const label = this.selectedNode.label;

      const edgeRelRegex = new RegExp(`\\(${source}\\)\\s*-\\s*\\[\\s*:?${label}(?:\\s*\\{([^}]+)\\})?\\s*\\]\\s*->\\s*\\(${target}\\)`);
      if (edgeRelRegex.test(this.hCypherCode)) {
        this.hCypherCode = this.hCypherCode.replace(edgeRelRegex, (match, props) => {
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
      if (simpleEdgeRegex.test(this.hCypherCode)) {
        this.hCypherCode = this.hCypherCode.replace(simpleEdgeRegex, `(${source}) -[:${label} {color: "${newColor}"}]-> (${target})`);
        return;
      }
    }
  }

  // Split Widget Node into SplitNode with 2 children
  splitPane(widgetId: string, direction: 'vertical' | 'horizontal') {
    this.layoutTree = this.splitInTree(this.layoutTree, widgetId, direction);
  }

  private splitInTree(node: LayoutNode, targetId: string, direction: 'vertical' | 'horizontal'): LayoutNode {
    if (node.type === 'widget') {
      if (node.id === targetId) {
        const clonedWidget: WidgetNode = {
          type: 'widget',
          id: `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          widgetType: node.widgetType
        };
        return {
          type: 'split',
          split: direction,
          percent: 50,
          children: [node, clonedWidget]
        };
      }
      return node;
    }
    const left = this.splitInTree(node.children[0], targetId, direction);
    const right = this.splitInTree(node.children[1], targetId, direction);
    node.children = [left, right];
    return node;
  }

  // Close Pane and merge its sibling up
  closePane(widgetId: string) {
    if (this.layoutTree.type === 'widget') {
      return;
    }
    const newTree = this.removeFromTree(this.layoutTree, widgetId);
    if (newTree) {
      this.layoutTree = newTree;
    }
  }

  private removeFromTree(node: LayoutNode, targetId: string): LayoutNode | null {
    if (node.type === 'widget') {
      if (node.id === targetId) {
        return null;
      }
      return node;
    }
    const left = this.removeFromTree(node.children[0], targetId);
    const right = this.removeFromTree(node.children[1], targetId);
    if (left === null) return right;
    if (right === null) return left;
    node.children = [left, right];
    return node;
  }

  // Swap Widget Types inside Layout Tree
  swapWidgets(idA: string, idB: string) {
    const nodeA = this.findWidgetNode(this.layoutTree, idA);
    const nodeB = this.findWidgetNode(this.layoutTree, idB);
    if (nodeA && nodeB) {
      const temp = nodeA.widgetType;
      nodeA.widgetType = nodeB.widgetType;
      nodeB.widgetType = temp;
      
      // Force top-level re-assignment to trigger Svelte 5 reactivity instantly!
      this.layoutTree = { ...this.layoutTree };
    }
  }

  // Trigger Svelte 5 reactivity update on the entire layout tree
  updateLayout() {
    this.layoutTree = JSON.parse(JSON.stringify(this.layoutTree));
  }

  // Find widget leaf node by ID
  private findWidgetNode(node: LayoutNode, id: string): WidgetNode | null {
    if (node.type === 'widget') {
      return node.id === id ? node : null;
    }
    return this.findWidgetNode(node.children[0], id) || this.findWidgetNode(node.children[1], id);
  }
}

export const workspaceState = new WorkspaceState();
