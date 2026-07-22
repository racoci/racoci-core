//! # Holds Micro-Kernel (Stage 0)
//!
//! A high-performance, minimalist topological micro-kernel implementing
//! the core Holds substrate primitives: Atoms, Adjacencies, Membranes,
//! absolute interning identity (H_id), and Double Pushout (DPO) rewriting.

use blake3::Hash;
use std::collections::HashMap;

/// The unique identifier of a node in the Hypergraph Arena.
/// Using a 32-bit index provides a compact, relative pointer representation
/// that is ideal for zero-copy serialization and WebAssembly memory models.
pub type NodeId = u32;

/// Strict topological primitives of the Holds environment.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Topology {
    /// Atoms: Irreducible, dimensionless urelements holding raw byte content.
    Atom(Vec<u8>),

    /// Adjacencies: Directed or undirected hyperedges connecting multiple nodes.
    Adjacency(Vec<NodeId>),

    /// Grouping Membranes: Isolated topological scopes/boundaries enclosing subgraphs.
    Membrane(Vec<NodeId>),
}

/// Contiguous, flat memory arena allocator that packs all nodes
/// sequentially to optimize cache-line locality and eliminate pointer chasing.
pub struct HypergraphArena {
    /// Contiguous storage for all topologies.
    nodes: Vec<Topology>,
}

impl HypergraphArena {
    /// Instantiates a new contiguous Hypergraph Arena with pre-allocated capacity.
    pub fn new() -> Self {
        Self {
            nodes: Vec::with_capacity(1_000_000),
        }
    }

    /// Internal raw allocation method. Bypasses identity pool checks.
    /// Restricted for internal use by the IdentityEngine.
    pub fn allocate_raw(&mut self, topo: Topology) -> NodeId {
        let id = self.nodes.len() as NodeId;
        self.nodes.push(topo);
        id
    }

    /// Retrieves a reference to a topology given its NodeId index.
    pub fn get_node(&self, id: NodeId) -> Option<&Topology> {
        self.nodes.get(id as usize)
    }

    /// Returns the total number of nodes allocated in the arena.
    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    /// Checks if the arena is empty.
    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }
}

impl Default for HypergraphArena {
    fn default() -> Self {
        Self::new()
    }
}

/// Structural identity and interning engine that enforces
/// absolute deduplication (Flyweight pattern) over the Hypergraph Arena.
pub struct IdentityEngine {
    /// Contiguous node storage.
    pub arena: HypergraphArena,

    /// Interning pool mapping exact cryptographic hashes (H_id) to NodeId.
    pub intern_pool: HashMap<Hash, NodeId>,

    /// Parallel index array for constant-time (O(1)) lookup of a node's hash.
    pub id_to_hash: Vec<Hash>,
}

impl IdentityEngine {
    /// Instantiates a new Identity Engine enclosing a new arena.
    pub fn new() -> Self {
        Self {
            arena: HypergraphArena::new(),
            intern_pool: HashMap::new(),
            id_to_hash: Vec::with_capacity(1_000_000),
        }
    }

    /// Interns a topology into the substrate. If an isomorphic topology
    /// with an identical hash already exists, the existing NodeId is returned.
    /// Otherwise, a new node is allocated and its hash is indexed.
    pub fn intern(&mut self, topo: Topology) -> NodeId {
        let hash = self.compute_hash(&topo);

        // O(1) Deduplication: reuse existing node pointer if matching hash exists
        if let Some(&existing_id) = self.intern_pool.get(&hash) {
            return existing_id;
        }

        // Otherwise, allocate a new raw node
        let new_id = self.arena.allocate_raw(topo);
        self.intern_pool.insert(hash, new_id);
        self.id_to_hash.push(hash);

        new_id
    }

    /// Computes the absolute, canonical H_id of a topology.
    /// Relational collections (Adjacencies and Membranes) sort their child
    /// hashes to guarantee structural isomorphism and canonicalization.
    pub fn compute_hash(&self, topo: &Topology) -> Hash {
        let mut hasher = blake3::Hasher::new();
        match topo {
            Topology::Atom(data) => {
                hasher.update(b"ATOM");
                hasher.update(data);
            }
            Topology::Adjacency(children) | Topology::Membrane(children) => {
                let prefix = if matches!(topo, Topology::Adjacency(_)) {
                    b"ADJ"
                } else {
                    b"MEM"
                };
                hasher.update(prefix);

                // Fetch child hashes from our index
                let mut child_hashes: Vec<Hash> =
                    children.iter().map(|&id| self.get_hash_by_id(id)).collect();

                // Sort child hashes unstably to guarantee canonical isomorphism
                child_hashes.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));

                for ch in child_hashes {
                    hasher.update(ch.as_bytes());
                }
            }
        }
        hasher.finalize()
    }

    /// Performs a constant-time lookup of a node's hash given its NodeId.
    pub fn get_hash_by_id(&self, id: NodeId) -> Hash {
        self.id_to_hash[id as usize]
    }
}

impl Default for IdentityEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Represents structural layout and matching variables in H-Cypher expressions.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Pattern {
    /// Matches a specific leaf Atom's exact content.
    Atom(Vec<u8>),

    /// Matches any node (Atom, Adjacency, or Membrane) and binds it to a variable string.
    Variable(String),

    /// Matches an Adjacency structure where children are matched by nested sub-patterns.
    Adjacency(Vec<Pattern>),

    /// Matches a Membrane structure where children are matched by nested sub-patterns.
    Membrane(Vec<Pattern>),
}

/// Represents variable bindings captured during the Left-Hand Side (LHS) match phase.
pub type BindingMap = HashMap<String, NodeId>;

/// The execution loop and primitive evaluator of Holds.
/// Performs localized subgraph isomorphism matching and Double Pushout (DPO) substitution.
pub struct PrimitiveEvaluator<'a> {
    /// Mutable reference to the identity interning engine.
    pub engine: &'a mut IdentityEngine,
}

impl<'a> PrimitiveEvaluator<'a> {
    /// Instantiates a new Primitive Evaluator on top of an Identity Engine.
    pub fn new(engine: &'a mut IdentityEngine) -> Self {
        Self { engine }
    }

    /// Evaluates a DPO topological rewrite rule (L => R).
    /// If LHS matches, the RHS is instantiated under captured bindings,
    /// a sys::residue link is formed, and the new root NodeId is returned.
    pub fn evaluate_rewrite(
        &mut self,
        root_id: NodeId,
        rule_l: &Pattern,
        rule_r: &Pattern,
    ) -> Result<NodeId, &'static str> {
        let mut bindings = BindingMap::new();

        // 1. MATCH: Resolve structural isomorphism over k-hop boundary
        if self.match_subgraph(root_id, rule_l, &mut bindings) {
            // 2. TRANSFORM: Inject RHS pattern using bound variables
            let new_root = self.inject_subgraph(rule_r, &bindings)?;

            // 3. INJECT RESIDUE: Anchors causal history via sys::residue ghost edge
            self.create_residue_edge(root_id, new_root);

            Ok(new_root)
        } else {
            Err("Pattern matching failed: Divergence detected.")
        }
    }

    /// Recursively matches the current node against the LHS pattern.
    /// Captures structural binders into the BindingMap.
    pub fn match_subgraph(
        &self,
        current: NodeId,
        pattern: &Pattern,
        bindings: &mut BindingMap,
    ) -> bool {
        match pattern {
            Pattern::Variable(name) => {
                if let Some(&bound_id) = bindings.get(name) {
                    // Variable consistency check
                    bound_id == current
                } else {
                    bindings.insert(name.clone(), current);
                    true
                }
            }
            Pattern::Atom(pattern_data) => {
                if let Some(Topology::Atom(node_data)) = self.engine.arena.get_node(current) {
                    node_data == pattern_data
                } else {
                    false
                }
            }
            Pattern::Adjacency(pattern_children) => {
                if let Some(Topology::Adjacency(node_children)) =
                    self.engine.arena.get_node(current)
                {
                    if node_children.len() == pattern_children.len() {
                        node_children
                            .iter()
                            .zip(pattern_children.iter())
                            .all(|(&nc, pc)| self.match_subgraph(nc, pc, bindings))
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
            Pattern::Membrane(pattern_children) => {
                if let Some(Topology::Membrane(node_children)) = self.engine.arena.get_node(current)
                {
                    if node_children.len() == pattern_children.len() {
                        node_children
                            .iter()
                            .zip(pattern_children.iter())
                            .all(|(&nc, pc)| self.match_subgraph(nc, pc, bindings))
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
        }
    }

    /// Instantiates the RHS pattern using captured LHS bindings.
    pub fn inject_subgraph(
        &mut self,
        pattern: &Pattern,
        bindings: &BindingMap,
    ) -> Result<NodeId, &'static str> {
        match pattern {
            Pattern::Variable(name) => {
                if let Some(&node_id) = bindings.get(name) {
                    Ok(node_id)
                } else {
                    Err("Free variable detected on Right-Hand Side (RHS) of rewrite rule.")
                }
            }
            Pattern::Atom(data) => Ok(self.engine.intern(Topology::Atom(data.clone()))),
            Pattern::Adjacency(pattern_children) => {
                let mut children = Vec::with_capacity(pattern_children.len());
                for pc in pattern_children {
                    children.push(self.inject_subgraph(pc, bindings)?);
                }
                Ok(self.engine.intern(Topology::Adjacency(children)))
            }
            Pattern::Membrane(pattern_children) => {
                let mut children = Vec::with_capacity(pattern_children.len());
                for pc in pattern_children {
                    children.push(self.inject_subgraph(pc, bindings)?);
                }
                Ok(self.engine.intern(Topology::Membrane(children)))
            }
        }
    }

    /// Instantiates a sys::residue causal ghost edge linking the prior
    /// un-mutated topology directly to the new transformed root.
    pub fn create_residue_edge(&mut self, old_root: NodeId, new_root: NodeId) -> NodeId {
        let tag_id = self.engine.intern(Topology::Atom(b"sys::residue".to_vec()));
        self.engine
            .intern(Topology::Adjacency(vec![old_root, new_root, tag_id]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_primitives_and_interning() {
        let mut engine = IdentityEngine::new();

        // Allocate Atoms
        let a1 = engine.intern(Topology::Atom(b"alpha".to_vec()));
        let a2 = engine.intern(Topology::Atom(b"beta".to_vec()));
        let a3 = engine.intern(Topology::Atom(b"alpha".to_vec()));

        // Confirm deduplication (Flyweight) of Atoms
        assert_eq!(a1, a3);
        assert_ne!(a1, a2);

        // Allocate Adjacencies
        let adj1 = engine.intern(Topology::Adjacency(vec![a1, a2]));
        // Sibling sorting ensures [a2, a1] has the same identity signature as [a1, a2]
        let adj2 = engine.intern(Topology::Adjacency(vec![a2, a1]));

        assert_eq!(adj1, adj2);
    }

    #[test]
    fn test_localized_pattern_matching() {
        let mut engine = IdentityEngine::new();

        // Prepare raw graph structure: Adjacency ( Atom("x"), Atom("y") )
        let x = engine.intern(Topology::Atom(b"x".to_vec()));
        let y = engine.intern(Topology::Atom(b"y".to_vec()));
        let root = engine.intern(Topology::Adjacency(vec![x, y]));

        // Match with pattern: Adjacency ( Variable("a"), Atom("y") )
        let pattern = Pattern::Adjacency(vec![
            Pattern::Variable("a".to_string()),
            Pattern::Atom(b"y".to_vec()),
        ]);

        let evaluator = PrimitiveEvaluator::new(&mut engine);
        let mut bindings = BindingMap::new();

        assert!(evaluator.match_subgraph(root, &pattern, &mut bindings));
        assert_eq!(bindings.get("a"), Some(&x));
    }

    #[test]
    fn test_algebraic_rewriting_and_residue() {
        let mut engine = IdentityEngine::new();

        // Setup base graph: Adjacency( Atom("expr"), Atom("0") )
        let expr = engine.intern(Topology::Atom(b"expr_val".to_vec()));
        let zero = engine.intern(Topology::Atom(b"0".to_vec()));
        let root = engine.intern(Topology::Adjacency(vec![expr, zero]));

        // Rewrite rule L => R:
        // L = Adjacency( Variable("val"), Atom("0") )
        // R = Variable("val")
        let rule_l = Pattern::Adjacency(vec![
            Pattern::Variable("val".to_string()),
            Pattern::Atom(b"0".to_vec()),
        ]);
        let rule_r = Pattern::Variable("val".to_string());

        let mut evaluator = PrimitiveEvaluator::new(&mut engine);

        // Execute the DPO Rewrite
        let new_root = evaluator.evaluate_rewrite(root, &rule_l, &rule_r).unwrap();

        // Confirm new root matches the bound variable "val" (which was `expr`)
        assert_eq!(new_root, expr);

        // Validate the causal link (sys::residue) exists linking old to new
        // We find the latest node in the arena (which should be the residue adjacency)
        let last_node_id = (evaluator.engine.arena.len() - 1) as u32;
        let last_node = evaluator.engine.arena.get_node(last_node_id).unwrap();

        if let Topology::Adjacency(links) = last_node {
            assert_eq!(links[0], root); // Links from old root
            assert_eq!(links[1], new_root); // Links to new root

            // Third link must be the "sys::residue" tag
            let tag = evaluator.engine.arena.get_node(links[2]).unwrap();
            assert_eq!(tag, &Topology::Atom(b"sys::residue".to_vec()));
        } else {
            panic!("Residue causal link not found!");
        }
    }
}
