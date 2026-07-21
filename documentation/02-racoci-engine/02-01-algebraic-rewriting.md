# 2.1: Algebraic Rewriting

The fundamental computational mechanism of the R.A.C.O.C.I. engine is algebraic rewriting, formally defined by the transition operation $A \Rightarrow B$. In this paradigm, computation is not the imperative, sequential mutation of memory addresses, but the continuous topological transformation of hypergraph manifolds defined over adhesive categories ($\mathbf{Hyper}$).

---

## 2.1.1: The Transition Equation ($A \Rightarrow B$)

Every computational step in Holds is an algebraic rewrite rule mapping a Left-Hand Side (LHS) pattern to a Right-Hand Side (RHS) replacement topology. Formalized using the Double Pushout (DPO) category framework, a rule is specified as a span of monomorphisms:

$$r = (A \xleftarrow{\quad l \quad} K \xrightarrow{\quad r \quad} B)$$

```text
       Left Pattern (A) <------- Interface (K) -------> Right Pattern (B)
              |                     |                          |
       m (Match)                    | k                        | n
              v                     v                          v
       Substrate (G)   <------- Context (D)   -------> Resulting State (H)

```

* **LHS ($A$):** Represents a target topological pattern or subgraph configuration. The engine locates an exact structural match via a monomorphism $m: A \hookrightarrow G$ into the current substrate state $G$.
* **Interface ($K$):** Represents the invariant structural boundary retained across the transition, preserving context and edge attachments.
* **RHS ($B$):** Specifies the new topological configuration glued onto the context manifold to yield the updated state $H$.

Upon validation, the Stage 0 Arena Allocator executes $B$'s allocation at the bump pointer $P_{\text{bump}}$, producing an atomic state transition without in-place memory mutation.

---

## 2.1.2: Structural Pattern Matching

The R.A.C.O.C.I. engine does not evaluate scalar values; it evaluates spatial logic, geometric arity, and topological connectivity. Pattern matching converts searching into a **Subgraph Isomorphism Problem** over nested hypergraphs.

To evaluate a rule match $m: A \hookrightarrow G$, the engine executes a multi-stage search pass:

1. **Perimeter Hash Interception ($O(1)$ Fast-Fail):** Before traversing nested boundaries, the engine compares $A$'s topological type signature $h_{\text{topo}}(A)$ against the target membrane's perimeter hash. If the hashes mismatch, the match candidate is rejected instantly.
2. **Extended Weisfeiler-Lehman (WL) Verification:** The engine refines candidate node color codes $c^{(t)}(v)$ to verify local arity, $n$-ary hyperedge alignments, and membrane nesting depths ($\mu$).
3. **Orbit-Pruned VF2 Traversal:** For non-symmetric subgraphs, the engine executes an unrolled VF2 graph search. Candidate search paths corresponding to symmetric node orbits $\mathcal{O}(v) \subseteq \text{Aut}(A)$ are pruned automatically, eliminating match explosion.

---

## 2.1.3: Contextual Preservation

Algebraic rewriting in Holds is strictly boundary-aware. When a target subgraph $m(A)$ is embedded within an enclosing substrate manifold $G$, the transition to $B$ must mathematically preserve external boundary conditions and incident hyperedges.

### 2.1.3.1 DPO Gluing Conditions

For Pushout Square 1 to exist and construct the context graph $D = G \setminus m(A \setminus l(K))$, match $m$ must satisfy two fundamental constraints:

1. **Identification Condition:** Distinct elements $u, v \in A$ merged by match $m$ ($m(u) = m(v)$) must belong to interface $K$.
2. **Dangling Edge Condition:** Removing non-interface nodes $(A \setminus l(K))$ must not leave orphan hyperedges in $G$. Every incident hyperedge connected to a deleted node must be explicitly matched and consumed by $A$.

### 2.1.3.2 Atomic Integrity and Information Conservation

The rewrite operation is strictly atomic—either the entire DPO pushout diagram commutes, preserving manifold continuity, or the transition fails with zero side effects.

If rule $A \Rightarrow B$ is lossy ($A \setminus l(K) \neq \emptyset$), the R.A.C.O.C.I. engine automatically intercepts deleted subgraphs and routes them into an attached `sys::residue` ghost membrane, guaranteeing total information conservation ($\Delta S = 0$) and preserving groupoid reversibility ($B \Rightarrow A$).