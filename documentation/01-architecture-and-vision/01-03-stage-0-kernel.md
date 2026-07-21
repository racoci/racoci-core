# 1.3: Stage 0 Kernel

The Stage 0 Kernel is the irreducible bootstrapping engine and axiomatic seed of the Holds computational substrate. Operating as a hypervisor-less, zero-dependency runtime kernel (~15 KB compiled WebAssembly module or native binary), Stage 0 provides the foundational execution loop required to evaluate state transformations without relying on external operating system services, language runtimes, or hardware abstractions.

---

## 1.3.1: Minimal Surface Area and Execution Scope

The functional surface area of the Stage 0 Kernel is strictly constrained to managing the four core primitives: Atom ($\alpha$), Adjacency ($\mathcal{E}$), Grouping ($\mathcal{M}$), and Rewriting ($\Rightarrow$). At Stage 0, the substrate contains zero high-level software abstractions—there is no standard library, no traditional type system, no text parsing engine, and no native OS system call interface.

The kernel implements only three low-level primitives:

1. **Monotonic Bump-Pointer Allocation:** Manages contiguous linear memory within the Stage 0 Arena using 32-bit relative index pointers ($I_{\text{arena}}$).
2. **Localized Pattern Matching:** Performs minimal subgraph isomorphism checks over $k$-hop topological neighborhoods.
3. **Atomic DPO Pushout Substitution:** Executes Double Pushout graph substitutions $L \xleftarrow{l} K \xrightarrow{r} R$ directly over Arena memory cells.

All high-level execution behavior is deferred to hypergraph transformations running on top of this minimal foundation.

---

## 1.3.2: The Bootstrapping Sequence and Axiomatic Ladder

The initialization of the Holds substrate follows an automated, deterministic three-phase bootstrapping protocol that elevates the system across the Axiomatic Ladder:

```text
 +-------------------------------------------------------------------------------+
 | Phase 1: Axiom Injection                                                      |
 | Hardcoded base rules (R_axiom) loaded into Stage 0 Arena linear memory.       |
 +-------------------------------------------------------------------------------+
                                         |
                                         v
 +-------------------------------------------------------------------------------+
 | Phase 2: Engine Ignition                                                      |
 | R.A.C.O.C.I. groupoid transformation loop starts evaluating pattern pressure.  |
 +-------------------------------------------------------------------------------+
                                         |
                                         v
 +-------------------------------------------------------------------------------+
 | Phase 3: Self-Construction                                                    |
 | Higher-order layers (H-Cypher, WL Canonizer, UI) generated via rewrites.      |
 +-------------------------------------------------------------------------------+

```

### 1.3.2.1 Phase 1: Axiom Injection

Upon boot, the kernel reads a static, hardcoded byte array representing the foundational topological rewrite rules ($R_{\text{axiom}} = \{r_1, r_2, \dots, r_k\}$) and writes them into the Stage 0 Arena as immutable base hypergraphs.

### 1.3.2.2 Phase 2: Engine Ignition

The kernel instantiates the R.A.C.O.C.I. groupoid transformation engine over $R_{\text{axiom}}$. The engine scans the Arena for matching Left-Hand Side (LHS) patterns, triggering the initial algebraic DPO pushout transitions:

$$\text{DPO}(G, r_i) \implies H_1$$

### 1.3.2.3 Phase 3: Self-Construction

Using $R_{\text{axiom}}$, the substrate dynamically synthesizes all remaining system components through pure structural rewrites. Advanced capabilities—including Weisfeiler-Lehman canonical hashing (Stage 2), AST-free H-Cypher parsing (Stage 4), WebGL layout physics (Stage 5), and reflective non-well-founded quine execution (Stage 6)—are constructed entirely as hypergraph structures inside the Arena.

---

## 1.3.3: Invariant Static Execution Loop

Unlike higher-level software components that mutate their topologies over time, the Stage 0 Kernel is completely static and immutable. It functions as an invariant state-transition operator $T$:

$$T: \mathcal{H} \times \mathcal{R}_{\text{active}} \longrightarrow \mathcal{H}'$$

$$\text{where } T(\mathcal{H}, \mathcal{R}_{\text{active}}) = \text{DPO}(\mathcal{H}, \mathcal{R}_{\text{active}})$$

By remaining strictly invariant, the Stage 0 Kernel guarantees that the fundamental physical laws of the substrate—total information conservation ($\Delta S = 0$), groupoid reversibility via `sys::residue` ghost membranes, and adhesive category constraints—are enforced continuously at the hardware layer.