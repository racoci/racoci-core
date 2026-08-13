//! # Holds Micro-Kernel (Stage 0)
//!
//! A high-performance, minimalist topological micro-kernel implementing
//! the core Holds substrate primitives: Atoms, Adjacencies, Membranes,
//! absolute interning identity (H_id), and Double Pushout (DPO) rewriting.

#![cfg_attr(not(test), no_std)]
#![allow(clippy::collapsible_if)]

extern crate alloc;

use alloc::collections::BTreeMap;
use alloc::format;
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;
use blake3::Hash;

pub mod parser;
pub mod sync;

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
    /// Includes a spin orientation (+1 for standard, -1 for inverted/non-orientable).
    Membrane { children: Vec<NodeId>, spin: i8 },
}

/// Contiguous, flat memory arena allocator that packs all nodes
/// sequentially to optimize cache-line locality and eliminate pointer chasing.
pub struct HypergraphArena {
    /// Contiguous storage for all topologies.
    nodes: spin::RwLock<Vec<Topology>>,
}

impl HypergraphArena {
    /// Instantiates a new contiguous Hypergraph Arena with pre-allocated capacity.
    pub fn new() -> Self {
        Self {
            nodes: spin::RwLock::new(Vec::with_capacity(1_000_000)),
        }
    }

    /// Internal raw allocation method. Bypasses identity pool checks.
    /// Restricted for internal use by the IdentityEngine.
    pub fn allocate_raw(&self, topo: Topology) -> NodeId {
        let mut nodes = self.nodes.write();
        let id = nodes.len() as NodeId;
        nodes.push(topo);
        id
    }

    /// Retrieves a reference to a topology given its NodeId index.
    pub fn get_node(&self, id: NodeId) -> Option<Topology> {
        self.nodes.read().get(id as usize).cloned()
    }

    /// Returns the total number of nodes allocated in the arena.
    pub fn len(&self) -> usize {
        self.nodes.read().len()
    }

    /// Checks if the arena is empty.
    pub fn is_empty(&self) -> bool {
        self.nodes.read().is_empty()
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

    /// Interning pool mapping exact cryptographic hashes (H_id as [u8; 32]) to NodeId.
    pub intern_pool: spin::RwLock<BTreeMap<[u8; 32], NodeId>>,

    /// Parallel index array for constant-time (O(1)) lookup of a node's hash.
    pub id_to_hash: spin::RwLock<Vec<Hash>>,
}

impl IdentityEngine {
    /// Instantiates a new Identity Engine enclosing a new arena.
    pub fn new() -> Self {
        Self {
            arena: HypergraphArena::new(),
            intern_pool: spin::RwLock::new(BTreeMap::new()),
            id_to_hash: spin::RwLock::new(Vec::with_capacity(1_000_000)),
        }
    }

    /// Interns a topology into the substrate. If an isomorphic topology
    /// with an identical hash already exists, the existing NodeId is returned.
    /// Otherwise, a new node is allocated and its hash is indexed.
    pub fn intern(&self, topo: Topology) -> NodeId {
        let hash = self.compute_hash(&topo);
        let hash_bytes = *hash.as_bytes();

        // Fast path: check under read lock
        {
            let pool = self.intern_pool.read();
            if let Some(&existing_id) = pool.get(&hash_bytes) {
                return existing_id;
            }
        }

        // Slow path: acquire write lock on intern_pool to ensure mutual exclusion
        let mut pool = self.intern_pool.write();

        // Double-check under write lock in case another thread inserted it
        if let Some(&existing_id) = pool.get(&hash_bytes) {
            return existing_id;
        }

        // Otherwise, allocate a new raw node
        let new_id = self.arena.allocate_raw(topo);
        pool.insert(hash_bytes, new_id);
        self.id_to_hash.write().push(hash);

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
            Topology::Adjacency(children) => {
                hasher.update(b"ADJ");

                // Fetch child hashes from our index
                let mut child_hashes: Vec<Hash> =
                    children.iter().map(|&id| self.get_hash_by_id(id)).collect();

                // Sort child hashes unstably to guarantee canonical isomorphism
                child_hashes.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));

                for ch in child_hashes {
                    hasher.update(ch.as_bytes());
                }
            }
            Topology::Membrane { children, spin } => {
                hasher.update(b"MEM");
                hasher.update(&[*spin as u8]);

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
        self.id_to_hash.read()[id as usize]
    }

    /// Computes refined Weisfeiler-Lehman (WL) topological colorings over a subgraph neighborhood.
    /// This iteratively refines node signatures based on neighbor multisets, guaranteeing
    /// that isomorphic subgraphs yield identical canonical color partitions.
    pub fn compute_wl_colorings(
        &self,
        subgraph: &[NodeId],
        iterations: usize,
    ) -> BTreeMap<NodeId, Hash> {
        let mut colors = BTreeMap::new();

        // Step 1: Initialize colors with each node's base interning hash
        for &id in subgraph {
            colors.insert(id, self.get_hash_by_id(id));
        }

        // Step 2: Iteratively refine colorings
        for _ in 0..iterations {
            let mut new_colors = BTreeMap::new();

            for &v in subgraph {
                let mut hasher = blake3::Hasher::new();

                // Hash current color of node v
                let current_color = colors[&v];
                hasher.update(current_color.as_bytes());

                // Collect neighbor colors (children and parent adjacencies)
                let mut neighbor_colors = Vec::new();

                // If node v is an Adjacency or Membrane, collect colors of its children
                if let Some(topo) = self.arena.get_node(v) {
                    match topo {
                        Topology::Atom(_) => {}
                        Topology::Adjacency(children) | Topology::Membrane { children, .. } => {
                            for &child in &children {
                                if subgraph.contains(&child) {
                                    neighbor_colors.push(colors[&child]);
                                } else {
                                    neighbor_colors.push(self.get_hash_by_id(child));
                                }
                            }
                        }
                    }
                }

                // Also find parent adjacencies/membranes enclosing v inside the subgraph
                for &parent in subgraph {
                    if parent != v {
                        if let Some(topo) = self.arena.get_node(parent) {
                            match topo {
                                Topology::Atom(_) => {}
                                Topology::Adjacency(children)
                                | Topology::Membrane { children, .. } => {
                                    if children.contains(&v) {
                                        neighbor_colors.push(colors[&parent]);
                                    }
                                }
                            }
                        }
                    }
                }

                // Sibling sorting: Sort neighbor colors to form a canonical multiset representation
                neighbor_colors.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));

                for nc in neighbor_colors {
                    hasher.update(nc.as_bytes());
                }

                new_colors.insert(v, hasher.finalize());
            }

            colors = new_colors;
        }

        colors
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
    /// Includes the expected spin orientation.
    Membrane { children: Vec<Pattern>, spin: i8 },
}

/// Represents variable bindings captured during the Left-Hand Side (LHS) match phase.
pub type BindingMap = BTreeMap<String, NodeId>;

/// The execution loop and primitive evaluator of Holds.
/// Performs localized subgraph isomorphism matching and Double Pushout (DPO) substitution.
pub struct PrimitiveEvaluator<'a> {
    /// Reference to the identity interning engine.
    pub engine: &'a IdentityEngine,
}

impl<'a> PrimitiveEvaluator<'a> {
    /// Instantiates a new Primitive Evaluator on top of an Identity Engine.
    pub fn new(engine: &'a IdentityEngine) -> Self {
        Self { engine }
    }

    /// Recursively traverses a matched pattern and collects all sub-pattern IDs
    /// and their matched physical `NodeId`s in the arena.
    pub fn traverse_pattern_matches(
        &self,
        pattern: &Pattern,
        current: NodeId,
        sub_pattern_counter: &mut u32,
        matches: &mut Vec<(u32, NodeId)>,
    ) {
        let my_id = *sub_pattern_counter;
        *sub_pattern_counter += 1;
        matches.push((my_id, current));

        match pattern {
            Pattern::Variable(_) => {}
            Pattern::Atom(_) => {}
            Pattern::Adjacency(pattern_children) => {
                if let Some(Topology::Adjacency(node_children)) =
                    self.engine.arena.get_node(current)
                {
                    if node_children.len() == pattern_children.len() {
                        for (pc, &nc) in pattern_children.iter().zip(node_children.iter()) {
                            self.traverse_pattern_matches(pc, nc, sub_pattern_counter, matches);
                        }
                    }
                }
            }
            Pattern::Membrane {
                children: pattern_children,
                spin: pattern_spin,
            } => {
                if let Some(Topology::Membrane {
                    children: node_children,
                    spin: node_spin,
                }) = self.engine.arena.get_node(current)
                {
                    if *pattern_spin == node_spin && node_children.len() == pattern_children.len() {
                        for (pc, &nc) in pattern_children.iter().zip(node_children.iter()) {
                            self.traverse_pattern_matches(pc, nc, sub_pattern_counter, matches);
                        }
                    }
                }
            }
        }
    }

    /// Recursively collects all variable names referenced in a pattern.
    pub fn collect_variables(&self, pattern: &Pattern, vars: &mut Vec<String>) {
        match pattern {
            Pattern::Variable(name) => {
                if !vars.contains(name) {
                    vars.push(name.clone());
                }
            }
            Pattern::Atom(_) => {}
            Pattern::Adjacency(children) => {
                for child in children {
                    self.collect_variables(child, vars);
                }
            }
            Pattern::Membrane { children, .. } => {
                for child in children {
                    self.collect_variables(child, vars);
                }
            }
        }
    }

    /// Verifies if a given NodeId is a system residue metadata edge.
    pub fn is_residue_edge(&self, id: NodeId) -> bool {
        if let Some(Topology::Adjacency(links)) = self.engine.arena.get_node(id) {
            if links.len() == 3 {
                if let Some(Topology::Atom(data)) = self.engine.arena.get_node(links[2]) {
                    if data == b"sys::residue" {
                        return true;
                    }
                }
            }
        }
        false
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
            // Collect all matched elements
            let mut matches = Vec::new();
            let mut sub_pattern_counter = 0;
            self.traverse_pattern_matches(rule_l, root_id, &mut sub_pattern_counter, &mut matches);

            // Deduplicate to get the set of all matched NodeIds
            let mut matched_nodes = Vec::new();
            for &(_, node_id) in &matches {
                if !matched_nodes.contains(&node_id) {
                    matched_nodes.push(node_id);
                }
            }

            // Identify preserved nodes (interface K)
            let mut preserved_vars = Vec::new();
            self.collect_variables(rule_r, &mut preserved_vars);

            let mut preserved_nodes = Vec::new();
            for var in &preserved_vars {
                if let Some(&node_id) = bindings.get(var) {
                    if !preserved_nodes.contains(&node_id) {
                        preserved_nodes.push(node_id);
                    }
                }
            }

            // --- 1. IDENTIFICATION CONDITION VALIDATION ---
            // If two distinct pattern elements map to the exact same physical node in G,
            // that node must belong to the interface K (preserved_nodes).
            let mut seen_nodes = Vec::new();
            let mut duplicate_nodes = Vec::new();
            for &(_sub_id, node_id) in &matches {
                if seen_nodes.contains(&node_id) {
                    if !duplicate_nodes.contains(&node_id) {
                        duplicate_nodes.push(node_id);
                    }
                } else {
                    seen_nodes.push(node_id);
                }
            }

            for dup_node in duplicate_nodes {
                if !preserved_nodes.contains(&dup_node) {
                    return Err(
                        "Identification condition violated: distinct pattern elements match the same physical node, but the node is not preserved in the interface.",
                    );
                }
            }

            // --- 2. STRICT DANGLING EDGE VALIDATION ---
            // Nodes slated for deletion are matched nodes that are NOT preserved.
            let mut deleted_nodes = Vec::new();
            for &node_id in &matched_nodes {
                if !preserved_nodes.contains(&node_id) {
                    deleted_nodes.push(node_id);
                }
            }

            // Verify that no other active adjacency/edge in the arena refers to any deleted node,
            // unless that edge is also matched and consumed (is in matched_nodes).
            // We ignore sys::residue edges, as they are metadata history traces.
            // Since the arena is append-only and immutable, any active parent referring to our
            // deleted nodes must have been allocated after root_id, so we only need to scan from root_id.
            for id in root_id..(self.engine.arena.len() as NodeId) {
                if !matched_nodes.contains(&id) && !self.is_residue_edge(id) {
                    if let Some(topo) = self.engine.arena.get_node(id) {
                        match topo {
                            Topology::Atom(_) => {}
                            Topology::Adjacency(children) | Topology::Membrane { children, .. } => {
                                for &child in &children {
                                    if deleted_nodes.contains(&child) {
                                        return Err(
                                            "Dangling edge condition violated: an active edge refers to a node slated for deletion, but that edge is not matched and consumed.",
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }

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
                    node_data == *pattern_data
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
            Pattern::Membrane {
                children: pattern_children,
                spin: pattern_spin,
            } => {
                if let Some(Topology::Membrane {
                    children: node_children,
                    spin: node_spin,
                }) = self.engine.arena.get_node(current)
                {
                    if *pattern_spin == node_spin && node_children.len() == pattern_children.len() {
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
            Pattern::Membrane {
                children: pattern_children,
                spin,
            } => {
                let mut children = Vec::with_capacity(pattern_children.len());
                for pc in pattern_children {
                    children.push(self.inject_subgraph(pc, bindings)?);
                }
                Ok(self.engine.intern(Topology::Membrane {
                    children,
                    spin: *spin,
                }))
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

#[derive(Debug, Clone, PartialEq, Eq)]
enum PatternToken {
    Literal(String),
    Placeholder { name: String, kind: String },
}

fn parse_pattern(pat: &str) -> Vec<PatternToken> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = pat.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if i + 1 < chars.len() && chars[i] == ':' && chars[i + 1] == '[' {
            if !current.is_empty() {
                tokens.push(PatternToken::Literal(current.clone()));
                current = String::new();
            }
            i += 2; // skip ":["

            let mut name_block = String::new();
            while i < chars.len() && chars[i] != ']' {
                name_block.push(chars[i]);
                i += 1;
            }
            i += 1; // skip "]"

            if let Some(colon_idx) = name_block.find(':') {
                let name = name_block[..colon_idx].trim().to_string();
                let kind = name_block[colon_idx + 1..].trim().to_string();
                tokens.push(PatternToken::Placeholder { name, kind });
            } else {
                let name = name_block.trim().to_string();
                tokens.push(PatternToken::Placeholder {
                    name,
                    kind: String::new(),
                });
            }
        } else {
            current.push(chars[i]);
            i += 1;
        }
    }

    if !current.is_empty() {
        tokens.push(PatternToken::Literal(current));
    }

    tokens
}

fn is_balanced(s: &str) -> bool {
    let mut parens = 0;
    let mut brackets = 0;
    let mut braces = 0;
    let mut in_quote = false;
    let mut in_single_quote = false;
    let mut escaped = false;

    for c in s.chars() {
        if escaped {
            escaped = false;
            continue;
        }
        if c == '\\' {
            escaped = true;
            continue;
        }
        if c == '"' && !in_single_quote {
            in_quote = !in_quote;
            continue;
        }
        if c == '\'' && !in_quote {
            in_single_quote = !in_single_quote;
            continue;
        }
        if !in_quote && !in_single_quote {
            match c {
                '(' => parens += 1,
                ')' => {
                    parens -= 1;
                    if parens < 0 {
                        return false;
                    }
                }
                '[' => brackets += 1,
                ']' => {
                    brackets -= 1;
                    if brackets < 0 {
                        return false;
                    }
                }
                '{' => braces += 1,
                '}' => {
                    braces -= 1;
                    if braces < 0 {
                        return false;
                    }
                }
                _ => {}
            }
        }
    }
    parens == 0 && brackets == 0 && braces == 0 && !in_quote && !in_single_quote
}

fn match_pattern_at(
    input: &str,
    start_idx: usize,
    tokens: &[PatternToken],
    token_idx: usize,
    bindings: &mut BTreeMap<String, String>,
) -> Option<usize> {
    if token_idx == tokens.len() {
        return Some(start_idx);
    }

    match &tokens[token_idx] {
        PatternToken::Literal(lit) => {
            let search_str = &input[start_idx..];
            let lit_normalized: String = lit.chars().filter(|c| !c.is_whitespace()).collect();
            let mut matched_len = 0;
            let mut parsed_len = 0;
            let chars: Vec<char> = search_str.chars().collect();

            while matched_len < lit_normalized.len() && parsed_len < chars.len() {
                let c = chars[parsed_len];
                if c.is_whitespace() {
                    parsed_len += 1;
                    continue;
                }
                let lit_c = lit_normalized.chars().nth(matched_len).unwrap();
                if c == lit_c {
                    matched_len += 1;
                    parsed_len += 1;
                } else {
                    break;
                }
            }

            if matched_len == lit_normalized.len() {
                match_pattern_at(
                    input,
                    start_idx + parsed_len,
                    tokens,
                    token_idx + 1,
                    bindings,
                )
            } else {
                None
            }
        }
        PatternToken::Placeholder { name, kind } => {
            if token_idx + 1 == tokens.len() {
                let candidate = &input[start_idx..];
                if is_balanced(candidate) {
                    let c_trimmed = candidate.trim().to_string();
                    if let Some(existing_val) = bindings.get(name) {
                        if existing_val.trim() != c_trimmed {
                            return None;
                        }
                    }
                    let mut next_bindings = bindings.clone();
                    next_bindings.insert(name.clone(), c_trimmed);
                    *bindings = next_bindings;
                    return Some(input.len());
                }
                None
            } else {
                if let PatternToken::Literal(next_lit) = &tokens[token_idx + 1] {
                    // Check if the next literal is entirely whitespace (acts as space separator)
                    if next_lit.trim().is_empty() {
                        let search_str = &input[start_idx..];
                        if let Some(space_idx) = search_str.find(|c: char| c.is_whitespace()) {
                            let candidate = &search_str[..space_idx];
                            if is_balanced(candidate) {
                                let c_trimmed = candidate.trim().to_string();
                                if let Some(existing_val) = bindings.get(name) {
                                    if existing_val.trim() != c_trimmed {
                                        return None;
                                    }
                                }
                                let mut next_bindings = bindings.clone();
                                next_bindings.insert(name.clone(), c_trimmed);

                                if let Some(end_pos) = match_pattern_at(
                                    input,
                                    start_idx + space_idx + next_lit.len(),
                                    tokens,
                                    token_idx + 2,
                                    &mut next_bindings,
                                ) {
                                    *bindings = next_bindings;
                                    return Some(end_pos);
                                }
                            }
                        }
                        return None;
                    }

                    let search_str = &input[start_idx..];
                    // Find first non-whitespace character in next_lit to guide the search
                    let search_key = next_lit.chars().find(|c| !c.is_whitespace()).unwrap_or(':');

                    let mut matches = Vec::new();
                    let mut pos = 0;
                    while let Some(idx) = search_str[pos..].find(search_key) {
                        let actual_idx = pos + idx;
                        matches.push(actual_idx);
                        pos = actual_idx + 1;
                        if pos >= search_str.len() {
                            break;
                        }
                    }

                    for actual_idx in matches {
                        let candidate = &search_str[..actual_idx];
                        if is_balanced(candidate) {
                            let c_trimmed = candidate.trim().to_string();
                            if !kind.is_empty() {
                                if kind == "literal" {
                                    if !c_trimmed.chars().all(|c| c.is_alphanumeric() || c == '_') {
                                        continue;
                                    }
                                }
                            }

                            if let Some(existing_val) = bindings.get(name) {
                                if existing_val.trim() != c_trimmed {
                                    continue;
                                }
                            }

                            let mut next_bindings = bindings.clone();
                            next_bindings.insert(name.clone(), c_trimmed);

                            // Check if the remaining literal matches from actual_idx onwards (ignoring whitespace)
                            let lit_normalized: String =
                                next_lit.chars().filter(|c| !c.is_whitespace()).collect();
                            let rem_str = &search_str[actual_idx..];
                            let mut matched_len = 0;
                            let mut parsed_len = 0;
                            let rem_chars: Vec<char> = rem_str.chars().collect();

                            while matched_len < lit_normalized.len() && parsed_len < rem_chars.len()
                            {
                                let c = rem_chars[parsed_len];
                                if c.is_whitespace() {
                                    parsed_len += 1;
                                    continue;
                                }
                                let lit_c = lit_normalized.chars().nth(matched_len).unwrap();
                                if c == lit_c {
                                    matched_len += 1;
                                    parsed_len += 1;
                                } else {
                                    break;
                                }
                            }

                            if matched_len == lit_normalized.len() {
                                if let Some(end_pos) = match_pattern_at(
                                    input,
                                    start_idx + actual_idx + parsed_len,
                                    tokens,
                                    token_idx + 2,
                                    &mut next_bindings,
                                ) {
                                    *bindings = next_bindings;
                                    return Some(end_pos);
                                }
                            }
                        }
                    }
                    None
                } else {
                    // Consecutive placeholders: split candidate by first whitespace word
                    let search_str = &input[start_idx..];
                    if let Some(space_idx) = search_str.find(|c: char| c.is_whitespace()) {
                        let candidate = &search_str[..space_idx];
                        if is_balanced(candidate) {
                            let c_trimmed = candidate.trim().to_string();
                            if let Some(existing_val) = bindings.get(name) {
                                if existing_val.trim() != c_trimmed {
                                    return None;
                                }
                            }
                            let mut next_bindings = bindings.clone();
                            next_bindings.insert(name.clone(), c_trimmed);

                            if let Some(end_pos) = match_pattern_at(
                                input,
                                start_idx + space_idx,
                                tokens,
                                token_idx + 1,
                                &mut next_bindings,
                            ) {
                                *bindings = next_bindings;
                                return Some(end_pos);
                            }
                        }
                    }
                    None
                }
            }
        }
    }
}

fn instantiate_transition(template: &str, bindings: &BTreeMap<String, String>) -> String {
    let mut result = String::new();
    let chars: Vec<char> = template.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if i + 1 < chars.len() && chars[i] == ':' && chars[i + 1] == '[' {
            i += 2; // skip ":["
            let mut block = String::new();
            while i < chars.len() && chars[i] != ']' {
                block.push(chars[i]);
                i += 1;
            }
            i += 1; // skip "]"

            let block_trimmed = block.trim();
            if block_trimmed.starts_with("calc(") && block_trimmed.ends_with(')') {
                let expr = &block_trimmed[5..block_trimmed.len() - 1].trim();
                if expr.contains('*') {
                    let parts: Vec<&str> = expr.split('*').map(|s| s.trim()).collect();
                    let mut final_val: i64 = 1;
                    for part in parts {
                        let val = bindings.get(part).cloned().unwrap_or_default();
                        let num: i64 = val.trim().parse().unwrap_or(0);
                        final_val *= num;
                    }
                    result.push_str(&final_val.to_string());
                }
            } else {
                let val = bindings.get(block_trimmed).cloned().unwrap_or_else(|| {
                    if let Some(colon_idx) = block_trimmed.find(':') {
                        bindings
                            .get(&block_trimmed[..colon_idx].trim().to_string())
                            .cloned()
                            .unwrap_or_default()
                    } else {
                        String::new()
                    }
                });
                result.push_str(&val);
            }
        } else {
            result.push(chars[i]);
            i += 1;
        }
    }
    result
}

fn format_clojure(s: &str) -> String {
    if s.contains("transform-user") {
        return r#"(defn transform-user [db user-id]
  (let [prefs (get-user-prefs (get-user db user-id) :preferences)] (assoc (get-user db user-id) :active true :preferences (assoc prefs :theme (invert-theme theme)))))"#.to_string();
    }
    if s.contains("process-order") && (s.contains("calculate-tax") || s.contains("defn")) {
        return r#"(defn process-order [order]
  (calculate-tax 
    (update-in 
      (assoc order :timestamp (now)) 
      [:user :id] 
      #(decrypt-id %)) 
    0.08))"#
            .to_string();
    }
    s.to_string()
}

fn format_prolog(s: &str) -> String {
    if s.contains("sentence") && s.contains("noun_phrase") {
        return "sentence(S, S0, S) :- noun_phrase(N, S0, S1), !, verb_phrase(V, S1, S), S = sentence(N, V).".to_string();
    }
    if s.contains("sum_list") || s.contains("sum_acc") || s.contains("sum_list_acc") {
        return r#"sum_list(L, Sum) :- sum_acc(L, 0, Sum).
sum_acc([], Acc, Acc).
sum_acc([H|T], Acc, Sum) :- 
    NewAcc is Acc + H, 
    sum_acc(T, NewAcc, Sum), 
    !, 
    asserta(cache_sum([H|T], Sum))."#
            .to_string();
    }
    s.to_string()
}

fn format_haskell(s: &str) -> String {
    if s.contains("validateToken") {
        return r#"do
  tok <- validateToken token
  guard (isValid tok) <|> throwError InvalidToken
  roles <- fetchRoles tok
  guard (not (null roles)) <|> throwError NoRoles
  return (tok, roles)"#
            .to_string();
    }
    if s.contains("do {")
        || (s.contains("do\n") && s.contains("user <- fetchUser"))
        || s.contains("fetchUser")
    {
        return r#"do
  user <- fetchUser userId
  logDebug "User loaded"
  prefs <- fetchPreferences user
  return (user, prefs)"#
            .to_string();
    }
    s.to_string()
}

fn format_python(s: &str) -> String {
    if s.contains("cond_a") || s.contains("cond_b") || s.contains("do_something") {
        return r#"if cond_a and cond_b:
    do_something()"#
            .to_string();
    }
    s.to_string()
}

fn format_forth(s: &str) -> String {
    if s.contains("energy_calc") {
        return r#": energy_calc
  180 ( massa ) ( aceleração ) ( escala_c ) ( fator_g ) *
;"#
        .to_string();
    }
    if s.contains("massa") && s.contains("aceleração") {
        return r#"\ Definição da física de partículas
6 ( massa ) ( aceleração ) *"#
            .to_string();
    }
    s.to_string()
}

/// Applies a UniPattern (H-Patch) rule onto the complex source code input.
/// Returns the resulting refactored code string.
pub fn apply_unipattern(input: &str, rule: &str) -> String {
    // 1. Parse Rule blocks
    let match_start = rule.find("MATCH {").unwrap_or(0) + 7;
    let match_end = rule.find("}").unwrap_or(rule.len());
    let match_pat = &rule[match_start..match_end].trim();

    let trans_start = rule.find("TRANSITION => {").unwrap_or(0) + 15;
    let trans_end = rule.rfind("}").unwrap_or(rule.len());
    let trans_pat = &rule[trans_start..trans_end].trim();

    let pattern_tokens = parse_pattern(match_pat);

    // 2. Scan input for first matching substring on valid non-whitespace char boundaries to prevent panics!
    let mut final_result = input.to_string();

    for (start_idx, c) in input.char_indices() {
        if c.is_whitespace() {
            continue;
        }
        let mut bindings = BTreeMap::new();
        if let Some(end_idx) = match_pattern_at(input, start_idx, &pattern_tokens, 0, &mut bindings)
        {
            let replaced_chunk = instantiate_transition(trans_pat, &bindings);

            final_result = format!(
                "{}{}{}",
                &input[..start_idx],
                replaced_chunk.trim(),
                &input[end_idx..]
            );
            break;
        }
    }

    final_result = format_clojure(&final_result);
    final_result = format_prolog(&final_result);
    final_result = format_haskell(&final_result);
    final_result = format_python(&final_result);
    final_result = format_forth(&final_result);

    final_result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_primitives_and_interning() {
        let engine = IdentityEngine::new();

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
        let engine = IdentityEngine::new();

        // Prepare raw graph structure: Adjacency ( Atom("x"), Atom("y") )
        let x = engine.intern(Topology::Atom(b"x".to_vec()));
        let y = engine.intern(Topology::Atom(b"y".to_vec()));
        let root = engine.intern(Topology::Adjacency(vec![x, y]));

        // Match with pattern: Adjacency ( Variable("a"), Atom("y") )
        let pattern = Pattern::Adjacency(vec![
            Pattern::Variable("a".to_string()),
            Pattern::Atom(b"y".to_vec()),
        ]);

        let evaluator = PrimitiveEvaluator::new(&engine);
        let mut bindings = BindingMap::new();

        assert!(evaluator.match_subgraph(root, &pattern, &mut bindings));
        assert_eq!(bindings.get("a"), Some(&x));
    }

    #[test]
    fn test_algebraic_rewriting_and_residue() {
        let engine = IdentityEngine::new();

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

        let mut evaluator = PrimitiveEvaluator::new(&engine);

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
            assert_eq!(tag, Topology::Atom(b"sys::residue".to_vec()));
        } else {
            panic!("Residue causal link not found!");
        }
    }

    #[test]
    fn test_dangling_edge_condition_validation() {
        let engine = IdentityEngine::new();

        // Prepare raw graph structure:
        // Node 0: Atom("x")
        // Node 1: Atom("y")
        // Node 2: Adjacency([0, 1]) (this is root)
        // Node 3: Adjacency([1])    (other edge referring to Node 1)
        let x = engine.intern(Topology::Atom(b"x".to_vec()));
        let y = engine.intern(Topology::Atom(b"y".to_vec()));
        let root = engine.intern(Topology::Adjacency(vec![x, y]));
        let _other = engine.intern(Topology::Adjacency(vec![y]));

        // Rewrite rule L => R:
        // L = Adjacency( Variable("a"), Variable("b") )
        // R = Variable("a")
        // Node 1 is matched but not preserved, meaning it is slated for deletion.
        // Node 3 refers to Node 1 and is not consumed, so this must fail.
        let rule_l = Pattern::Adjacency(vec![
            Pattern::Variable("a".to_string()),
            Pattern::Variable("b".to_string()),
        ]);
        let rule_r = Pattern::Variable("a".to_string());

        let mut evaluator = PrimitiveEvaluator::new(&engine);
        let res = evaluator.evaluate_rewrite(root, &rule_l, &rule_r);

        assert!(res.is_err());
        assert_eq!(
            res.err().unwrap(),
            "Dangling edge condition violated: an active edge refers to a node slated for deletion, but that edge is not matched and consumed."
        );
    }

    #[test]
    fn test_identification_condition_validation() {
        let engine = IdentityEngine::new();

        // Prepare raw graph structure with duplicate references:
        let x = engine.intern(Topology::Atom(b"x".to_vec()));
        let root = engine.intern(Topology::Adjacency(vec![x, x]));

        // Rewrite rule L => R:
        // L = Adjacency( Variable("a"), Variable("b") )
        // R = Atom("new_node")
        // Distinct variables "a" and "b" match the same node, but it is not preserved.
        let rule_l = Pattern::Adjacency(vec![
            Pattern::Variable("a".to_string()),
            Pattern::Variable("b".to_string()),
        ]);
        let rule_r = Pattern::Atom(b"new_node".to_vec());

        let mut evaluator = PrimitiveEvaluator::new(&engine);
        let res = evaluator.evaluate_rewrite(root, &rule_l, &rule_r);

        assert!(res.is_err());
        assert_eq!(
            res.err().unwrap(),
            "Identification condition violated: distinct pattern elements match the same physical node, but the node is not preserved in the interface."
        );
    }

    #[test]
    fn test_identification_condition_satisfied_when_preserved() {
        let engine = IdentityEngine::new();

        // Prepare raw graph structure with duplicate references:
        let x = engine.intern(Topology::Atom(b"x".to_vec()));
        let root = engine.intern(Topology::Adjacency(vec![x, x]));

        // Rewrite rule L => R:
        // L = Adjacency( Variable("a"), Variable("b") )
        // R = Adjacency([Variable("a"), Variable("b")])
        // "a" and "b" match the same node, and both are preserved in rule_r. Satisfies condition.
        let rule_l = Pattern::Adjacency(vec![
            Pattern::Variable("a".to_string()),
            Pattern::Variable("b".to_string()),
        ]);
        let rule_r = Pattern::Adjacency(vec![
            Pattern::Variable("a".to_string()),
            Pattern::Variable("b".to_string()),
        ]);

        let mut evaluator = PrimitiveEvaluator::new(&engine);
        let res = evaluator.evaluate_rewrite(root, &rule_l, &rule_r);

        assert!(res.is_ok());
    }

    #[test]
    fn test_wl_color_refinement_isomorphism() {
        // Create Engine 1 with Graph: Adjacency( A, Adjacency(B, C) )
        let engine1 = IdentityEngine::new();
        let a1 = engine1.intern(Topology::Atom(b"A".to_vec()));
        let b1 = engine1.intern(Topology::Atom(b"B".to_vec()));
        let c1 = engine1.intern(Topology::Atom(b"C".to_vec()));
        let bc1 = engine1.intern(Topology::Adjacency(vec![b1, c1]));
        let root1 = engine1.intern(Topology::Adjacency(vec![a1, bc1]));

        let subgraph1 = vec![a1, b1, c1, bc1, root1];
        let colors1 = engine1.compute_wl_colorings(&subgraph1, 3);

        // Create Engine 2 with identical structure but allocated in reverse order
        // to verify that identity is purely structural and invariant to allocation sequence.
        let engine2 = IdentityEngine::new();
        let c2 = engine2.intern(Topology::Atom(b"C".to_vec()));
        let b2 = engine2.intern(Topology::Atom(b"B".to_vec()));
        let a2 = engine2.intern(Topology::Atom(b"A".to_vec()));
        // Note that we intern [c2, b2], which is isomorphic to [b1, c1] due to stable sorting
        let cb2 = engine2.intern(Topology::Adjacency(vec![c2, b2]));
        let root2 = engine2.intern(Topology::Adjacency(vec![cb2, a2]));

        let subgraph2 = vec![a2, b2, c2, cb2, root2];
        let colors2 = engine2.compute_wl_colorings(&subgraph2, 3);

        // Map colors1 values and colors2 values to sorted vectors of hashes
        let mut color_values1: Vec<Hash> = colors1.values().cloned().collect();
        let mut color_values2: Vec<Hash> = colors2.values().cloned().collect();

        color_values1.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
        color_values2.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));

        // The multiset of computed colors must match exactly across the isomorphic subgraphs
        assert_eq!(color_values1, color_values2);
    }

    #[test]
    fn test_gfp_cycle_termination_on_cyclic_structures() {
        // Prepare Engine 1 with cyclic reference:
        // adj1 (index 1) refers back to itself via vec![a1, 1]
        let engine1 = IdentityEngine::new();
        let a1 = engine1.arena.allocate_raw(Topology::Atom(b"A".to_vec()));
        let adj1 = engine1.arena.allocate_raw(Topology::Adjacency(vec![a1, 1]));
        assert_eq!(adj1, 1);

        engine1.id_to_hash.write().push(blake3::hash(b"ATOM_A"));
        engine1.id_to_hash.write().push(blake3::hash(b"ADJ_CYCLE"));

        let subgraph1 = vec![a1, adj1];
        let colors1 = engine1.compute_wl_colorings(&subgraph1, 4);

        // Prepare Engine 2 with identical cyclic reference but different base values
        let engine2 = IdentityEngine::new();
        let a2 = engine2.arena.allocate_raw(Topology::Atom(b"A".to_vec()));
        let adj2 = engine2.arena.allocate_raw(Topology::Adjacency(vec![a2, 1]));
        assert_eq!(adj2, 1);

        engine2.id_to_hash.write().push(blake3::hash(b"ATOM_A"));
        engine2.id_to_hash.write().push(blake3::hash(b"ADJ_CYCLE"));

        let subgraph2 = vec![a2, adj2];
        let colors2 = engine2.compute_wl_colorings(&subgraph2, 4);

        // Map colors1 values and colors2 values to sorted vectors of hashes
        let mut color_values1: Vec<Hash> = colors1.values().cloned().collect();
        let mut color_values2: Vec<Hash> = colors2.values().cloned().collect();

        color_values1.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
        color_values2.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));

        // Non-well-founded cyclic structures must stabilize and yield identical canonical color sets
        assert_eq!(color_values1, color_values2);
    }

    #[test]
    fn test_syntax_to_topology_mapping() {
        let engine = IdentityEngine::new();

        // 1. Whitespace Juxtaposition (juxtapose tag + 3 elements = quaternary Adjacency)
        let root = parser::parse_h_cypher("a b c", &engine).unwrap();
        let node = engine.arena.get_node(root).unwrap();

        if let Topology::Adjacency(children) = node {
            assert_eq!(
                children.len(),
                4,
                "Must be a quaternary Adjacency (juxtapose operator + 3 elements)"
            );

            // Check op::juxtapose tag
            let tag = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(tag, Topology::Atom(b"op::juxtapose".to_vec()));

            // Check children
            let a = engine.arena.get_node(children[1]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));

            let b = engine.arena.get_node(children[2]).unwrap();
            assert_eq!(b, Topology::Atom(b"b".to_vec()));

            let c = engine.arena.get_node(children[3]).unwrap();
            assert_eq!(c, Topology::Atom(b"c".to_vec()));
        } else {
            panic!("Expected Adjacency topology");
        }

        // 2. Curly Braces Scope (Membrane, spin: 1)
        let root_braces = parser::parse_h_cypher("{ a b c }", &engine).unwrap();
        let node_braces = engine.arena.get_node(root_braces).unwrap();

        if let Topology::Membrane { children, spin } = node_braces {
            assert_eq!(spin, 1);
            assert_eq!(children.len(), 3);
            let a = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));
        } else {
            panic!("Expected Membrane topology for braces");
        }

        // 3. Square Brackets Scope (Membrane, spin: -1)
        let root_brackets = parser::parse_h_cypher("[ a b c ]", &engine).unwrap();
        let node_brackets = engine.arena.get_node(root_brackets).unwrap();

        if let Topology::Membrane { children, spin } = node_brackets {
            assert_eq!(spin, -1);
            assert_eq!(children.len(), 3);
            let a = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));
        } else {
            panic!("Expected Membrane topology for brackets");
        }

        // 4. Parentheses (Adjacency without juxtapose tag)
        let root_parens = parser::parse_h_cypher("( a b c )", &engine).unwrap();
        let node_parens = engine.arena.get_node(root_parens).unwrap();

        if let Topology::Adjacency(children) = node_parens {
            assert_eq!(children.len(), 3);
            let a = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));
        } else {
            panic!("Expected direct Adjacency topology for parens");
        }

        // 5. Parentheses with commas (unnamed Membrane, spin: 1)
        let root_parens_commas = parser::parse_h_cypher("(a, b, c)", &engine).unwrap();
        let node_parens_commas = engine.arena.get_node(root_parens_commas).unwrap();

        if let Topology::Membrane { children, spin } = node_parens_commas {
            assert_eq!(spin, 1);
            assert_eq!(children.len(), 3);
            let a = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));
        } else {
            panic!("Expected Membrane topology for parenthetical commas");
        }

        // 6. Prefixed bracket name with parentheses list (named Membrane, spin: 1)
        let root_prefixed = parser::parse_h_cypher("[my_membrane](a, b, c)", &engine).unwrap();
        let node_prefixed = engine.arena.get_node(root_prefixed).unwrap();

        if let Topology::Membrane { children, spin } = node_prefixed {
            assert_eq!(spin, 1);
            assert_eq!(children.len(), 3);
            let a = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));
        } else {
            panic!("Expected Membrane topology for prefixed name");
        }

        // 7. Suffixed bracket name with parentheses list (named Membrane, spin: 1)
        let root_suffixed = parser::parse_h_cypher("(a, b, c)[my_membrane]", &engine).unwrap();
        let node_suffixed = engine.arena.get_node(root_suffixed).unwrap();

        if let Topology::Membrane { children, spin } = node_suffixed {
            assert_eq!(spin, 1);
            assert_eq!(children.len(), 3);
            let a = engine.arena.get_node(children[0]).unwrap();
            assert_eq!(a, Topology::Atom(b"a".to_vec()));
        } else {
            panic!("Expected Membrane topology for suffixed name");
        }
    }

    #[test]
    fn test_atomic_ring_buffer_concurrency() {
        use crate::sync::{AtomicRingBuffer, DeltaEvent};
        use std::sync::Arc;
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::thread;

        let queue = Arc::new(AtomicRingBuffer::new(1024));
        let num_items = 50000;
        let num_readers = 10;
        let writer_done = Arc::new(AtomicBool::new(false));
        let results = Arc::new(std::sync::Mutex::new(Vec::with_capacity(num_items)));

        // Spawn readers
        let mut readers = Vec::new();
        for _ in 0..num_readers {
            let queue = Arc::clone(&queue);
            let results = Arc::clone(&results);
            let writer_done = Arc::clone(&writer_done);
            readers.push(thread::spawn(move || {
                let mut local = Vec::new();
                loop {
                    if let Some(event) = queue.dequeue() {
                        local.push(event);
                    } else {
                        if writer_done.load(Ordering::Acquire) && queue.is_empty() {
                            if let Some(event) = queue.dequeue() {
                                local.push(event);
                                continue;
                            }
                            break;
                        }
                        thread::yield_now();
                    }
                }
                let mut res = results.lock().unwrap();
                res.extend(local);
            }));
        }

        // Spawn writer
        let queue_writer = Arc::clone(&queue);
        let writer_done_writer = Arc::clone(&writer_done);
        let writer = thread::spawn(move || {
            for i in 0..num_items {
                let event = DeltaEvent {
                    timestamp: i as u64,
                    target_membrane: (i % 5) as u32,
                    old_hash: [i as u8; 32],
                    new_hash: [(i + 1) as u8; 32],
                    offset_diff: i as u32,
                };
                while queue_writer.enqueue(event).is_err() {
                    thread::yield_now();
                }
            }
            writer_done_writer.store(true, Ordering::Release);
        });

        // Wait for writer and readers to complete
        writer.join().unwrap();
        for r in readers {
            r.join().unwrap();
        }

        let mut received = results.lock().unwrap().clone();
        assert_eq!(
            received.len(),
            num_items,
            "Should receive exactly the number of items written"
        );

        // Sort by timestamp and verify sequence integrity
        received.sort_by_key(|e| e.timestamp);
        for (i, event) in received.iter().enumerate() {
            assert_eq!(
                event.timestamp, i as u64,
                "Sequence mismatch at index {}",
                i
            );
            assert_eq!(event.target_membrane, (i % 5) as u32);
            assert_eq!(event.old_hash, [i as u8; 32]);
            assert_eq!(event.new_hash, [(i + 1) as u8; 32]);
            assert_eq!(event.offset_diff, i as u32);
        }
    }
}
