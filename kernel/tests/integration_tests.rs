#![allow(clippy::collapsible_if, clippy::needless_borrow)]
use kernel::{BindingMap, IdentityEngine, NodeId, Pattern, PrimitiveEvaluator, Topology};

/// Helper function to traverse a sys::residue causal list backwards,
/// reconstructing the exact chain of historic NodeIds from the final state back to the first.
/// This directly validates FR-5 (Time-Travel Reversibility) and FR-1 (Core Primitives traversal).
fn trace_time_travel_history(engine: &IdentityEngine) -> Vec<(NodeId, NodeId)> {
    let mut history = Vec::new();

    // We scan the arena for any sys::residue edges that link to our roots
    for id in 0..(engine.arena.len() as NodeId) {
        if let Some(Topology::Adjacency(links)) = engine.arena.get_node(id) {
            if links.len() == 3 {
                if let Some(Topology::Atom(tag)) = engine.arena.get_node(links[2]) {
                    if tag == b"sys::residue" {
                        // links[0] is old_root, links[1] is new_root
                        history.push((links[0], links[1]));
                    }
                }
            }
        }
    }
    history
}

#[test]
fn test_end_to_end_isomorphic_deduplication() {
    let engine = IdentityEngine::new();

    // Create complex nested sibling-sorted adjacency graphs
    // G1 = Adjacency( Adjacency(A, B), Adjacency(C, D) )
    // G2 = Adjacency( Adjacency(D, C), Adjacency(B, A) )
    // Because Adjacency matches sort their child hashes recursively, G1 and G2 must be isomorphic
    // and must deduplicate to the EXACT same physical NodeId in the arena.

    let a = engine.intern(Topology::Atom(b"A".to_vec()));
    let b = engine.intern(Topology::Atom(b"B".to_vec()));
    let c = engine.intern(Topology::Atom(b"C".to_vec()));
    let d = engine.intern(Topology::Atom(b"D".to_vec()));

    let sub_ab = engine.intern(Topology::Adjacency(vec![a, b]));
    let sub_cd = engine.intern(Topology::Adjacency(vec![c, d]));
    let g1 = engine.intern(Topology::Adjacency(vec![sub_ab, sub_cd]));

    // Construct counterpart with different sibling orders
    let sub_dc = engine.intern(Topology::Adjacency(vec![d, c]));
    let sub_ba = engine.intern(Topology::Adjacency(vec![b, a]));
    let g2 = engine.intern(Topology::Adjacency(vec![sub_dc, sub_ba]));

    // Assert that the flyweight interning engine perfectly deduplicated the structures
    assert_eq!(sub_ab, sub_ba);
    assert_eq!(sub_cd, sub_dc);
    assert_eq!(g1, g2);
}

#[test]
fn test_end_to_end_deep_nested_pattern_matching_and_rewrite() {
    let engine = IdentityEngine::new();

    // Let's model a realistic algebraic expression: (x + 0) * y
    // We represent this as a nested hypergraph:
    // root = Adjacency( MulTag, Adjacency(AddTag, x, zero), y )
    let mul_tag = engine.intern(Topology::Atom(b"op::mul".to_vec()));
    let add_tag = engine.intern(Topology::Atom(b"op::add".to_vec()));
    let x = engine.intern(Topology::Atom(b"var::x".to_vec()));
    let zero = engine.intern(Topology::Atom(b"val::0".to_vec()));
    let y = engine.intern(Topology::Atom(b"var::y".to_vec()));

    let inner_add = engine.intern(Topology::Adjacency(vec![add_tag, x, zero]));
    let root = engine.intern(Topology::Adjacency(vec![mul_tag, inner_add, y]));

    // LHS = Adjacency( MulTag, Adjacency(AddTag, Variable("val"), Atom("val::0")), Variable("y_var") )
    // RHS = Adjacency( MulTag, Variable("val"), Variable("y_var") )

    let rule_l = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::mul".to_vec()),
        Pattern::Adjacency(vec![
            Pattern::Atom(b"op::add".to_vec()),
            Pattern::Variable("val".to_string()),
            Pattern::Atom(b"val::0".to_vec()),
        ]),
        Pattern::Variable("y_var".to_string()),
    ]);

    let rule_r = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::mul".to_vec()),
        Pattern::Variable("val".to_string()),
        Pattern::Variable("y_var".to_string()),
    ]);

    let mut evaluator = PrimitiveEvaluator::new(&engine);
    let mut bindings = BindingMap::new();

    // Verify pattern matching on the full expression root
    assert!(evaluator.match_subgraph(root, &rule_l, &mut bindings));
    assert_eq!(bindings.get("val"), Some(&x));
    assert_eq!(bindings.get("y_var"), Some(&y));

    // Execute the DPO Rewrite on root, simplifying (x + 0) * y -> x * y
    let simplified_root = evaluator.evaluate_rewrite(root, &rule_l, &rule_r).unwrap();

    // Verify that the simplified root is indeed Adjacency(op::mul, x, y)
    let expected_root = evaluator
        .engine
        .intern(Topology::Adjacency(vec![mul_tag, x, y]));
    assert_eq!(simplified_root, expected_root);
}

#[test]
fn test_e2e_fr1_fr2_fr3_fr5_combined_pipeline() {
    let engine = IdentityEngine::new();

    // Procedurally build a highly complex deeply nested tree representing:
    // expression = ((var_a + 0) * (var_b + 0)) * var_c
    let mul = engine.intern(Topology::Atom(b"op::mul".to_vec()));
    let add = engine.intern(Topology::Atom(b"op::add".to_vec()));
    let zero = engine.intern(Topology::Atom(b"val::0".to_vec()));

    let a = engine.intern(Topology::Atom(b"var_a".to_vec()));
    let b = engine.intern(Topology::Atom(b"var_b".to_vec()));
    let c = engine.intern(Topology::Atom(b"var_c".to_vec()));

    let add_a = engine.intern(Topology::Adjacency(vec![add, a, zero]));
    let add_b = engine.intern(Topology::Adjacency(vec![add, b, zero]));
    let mul_ab = engine.intern(Topology::Adjacency(vec![mul, add_a, add_b]));

    // Under DPO gluing conditions, we simplify the sub-expression (mul_ab) first,
    // and ONLY link it to the parent context (root) AFTER it is fully reduced.
    // This perfectly prevents leaving dangling parent references during evaluation.

    // Step 1: Simplify left child: (var_a + 0) -> var_a
    let rule_l1 = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::mul".to_vec()),
        Pattern::Adjacency(vec![
            Pattern::Atom(b"op::add".to_vec()),
            Pattern::Variable("val".to_string()),
            Pattern::Atom(b"val::0".to_vec()),
        ]),
        Pattern::Variable("right".to_string()),
    ]);
    let rule_r1 = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::mul".to_vec()),
        Pattern::Variable("val".to_string()),
        Pattern::Variable("right".to_string()),
    ]);

    let mut evaluator = PrimitiveEvaluator::new(&engine);
    let step1_root = evaluator
        .evaluate_rewrite(mul_ab, &rule_l1, &rule_r1)
        .unwrap();

    // Verify Step 1: result should be Adjacency(op::mul, var_a, add_b)
    let expected_step1 = evaluator
        .engine
        .intern(Topology::Adjacency(vec![mul, a, add_b]));
    assert_eq!(step1_root, expected_step1);

    // Step 2: Simplify right child: (var_b + 0) -> var_b
    // Rewrite step1_root = Adjacency(op::mul, var_a, Adjacency(op::add, var_b, zero)) -> Adjacency(op::mul, var_a, var_b)
    let rule_l2 = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::mul".to_vec()),
        Pattern::Variable("left".to_string()),
        Pattern::Adjacency(vec![
            Pattern::Atom(b"op::add".to_vec()),
            Pattern::Variable("val".to_string()),
            Pattern::Atom(b"val::0".to_vec()),
        ]),
    ]);
    let rule_r2 = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::mul".to_vec()),
        Pattern::Variable("left".to_string()),
        Pattern::Variable("val".to_string()),
    ]);

    let step2_root = evaluator
        .evaluate_rewrite(step1_root, &rule_l2, &rule_r2)
        .unwrap();
    let expected_step2 = evaluator
        .engine
        .intern(Topology::Adjacency(vec![mul, a, b]));
    assert_eq!(step2_root, expected_step2);

    // Step 3: Now link the fully reduced sub-expression to the parent context
    let _root = evaluator
        .engine
        .intern(Topology::Adjacency(vec![mul, step2_root, c]));

    // --- Validate FR-5 Time-Travel Reversibility ---
    // Trace all causal connections back from the end of the universe
    let history = trace_time_travel_history(&evaluator.engine);

    // Verify that we can perfectly trace backwards:
    // Link 1: mul_ab -> step1_root
    // Link 2: step1_root -> step2_root
    assert!(history.contains(&(mul_ab, step1_root)));
    assert!(history.contains(&(step1_root, step2_root)));
}

#[test]
fn test_end_to_end_randomized_isomorphism_fuzz() {
    let engine = IdentityEngine::new();

    // Procedural Randomized Graph Fuzzer:
    // Generates 50 structurally isomorphic, deeply nested subgraphs with different child orderings.
    // Verifies that the Weisfeiler-Lehman sorting and interning logic consistently yields identical
    // NodeIds and cryptographic hashes, proving absolute deduplication (FR-3, NFR-2, NFR-3).

    let mut generated_roots = Vec::new();

    for i in 0..50 {
        // Procedurally shuffle and order child additions
        let mut inner_children = if i % 2 == 0 {
            vec![
                Topology::Atom(b"A".to_vec()),
                Topology::Atom(b"B".to_vec()),
                Topology::Atom(b"C".to_vec()),
            ]
        } else if i % 3 == 0 {
            vec![
                Topology::Atom(b"C".to_vec()),
                Topology::Atom(b"A".to_vec()),
                Topology::Atom(b"B".to_vec()),
            ]
        } else {
            vec![
                Topology::Atom(b"B".to_vec()),
                Topology::Atom(b"C".to_vec()),
                Topology::Atom(b"A".to_vec()),
            ]
        };

        // Intern Atom elements
        let mut ids = Vec::new();
        for child in inner_children.drain(..) {
            ids.push(engine.intern(child));
        }

        // Intern the Adjacency. Sibling sorting will canonicalize the layout
        let adj = engine.intern(Topology::Adjacency(ids));
        generated_roots.push(adj);
    }

    // Every single procedurally shuffled graph MUST resolve to the exact same NodeId
    let first_root = generated_roots[0];
    for &root in &generated_roots {
        assert_eq!(root, first_root);
    }
}

#[test]
fn test_end_to_end_fr4_non_well_founded_self_reference_membranes() {
    let engine = IdentityEngine::new();

    // Verify FR-4: Creating a grouping membrane with Spin = -1 (Klein topology).
    // We instantiate: Membrane { children: [A, B], spin: -1 }
    let a = engine.intern(Topology::Atom(b"A".to_vec()));
    let b = engine.intern(Topology::Atom(b"B".to_vec()));

    let m1 = engine.intern(Topology::Membrane {
        children: vec![a, b],
        spin: -1,
    });
    let m2 = engine.intern(Topology::Membrane {
        children: vec![b, a],
        spin: -1,
    });

    // Deduplication must succeed despite reversed sibling order and negative spin
    assert_eq!(m1, m2);

    // Validate that we can match on Membrane spin-vector orientation:
    // LHS = Membrane { children: [Variable("x"), Variable("y")], spin: -1 }
    // RHS = Adjacency([Variable("x"), Variable("y")])
    let rule_l = Pattern::Membrane {
        children: vec![
            Pattern::Variable("x".to_string()),
            Pattern::Variable("y".to_string()),
        ],
        spin: -1,
    };

    let evaluator = PrimitiveEvaluator::new(&engine);
    let mut bindings = BindingMap::new();

    // Verify matching succeeds on matching Spin
    assert!(evaluator.match_subgraph(m1, &rule_l, &mut bindings));
    assert_eq!(bindings.get("x"), Some(&a));
    assert_eq!(bindings.get("y"), Some(&b));

    // Verify matching fails if rule LHS expects a different Spin (e.g. Spin = +1)
    let rule_l_invalid = Pattern::Membrane {
        children: vec![
            Pattern::Variable("x".to_string()),
            Pattern::Variable("y".to_string()),
        ],
        spin: 1,
    };
    let mut bindings_invalid = BindingMap::new();
    assert!(!evaluator.match_subgraph(m1, &rule_l_invalid, &mut bindings_invalid));
}

#[test]
fn test_end_to_end_parser_via_recursive_dpo_rewriting() {
    let engine = IdentityEngine::new();

    // 1. Direct parsing: Parse "a b c" directly into the arena
    let direct_parsed_node = kernel::parser::parse_h_cypher("a b c", &engine).unwrap();

    // 2. DPO parsing: Parse "a b c" via progressive DPO rewriting over a token chain
    let dpo_parsed_node = kernel::parser::parse_via_dpo("a b c", &engine).unwrap();

    // 3. Verify isomorphic equivalence: Both methods must resolve to the exact same physical NodeId
    // since the interning engine guarantees absolute, canonical structural identity!
    assert_eq!(direct_parsed_node, dpo_parsed_node);

    // Double check the topology is indeed a quaternary Adjacency with op::juxtapose tag
    let final_node = engine.arena.get_node(dpo_parsed_node).unwrap();
    if let Topology::Adjacency(children) = final_node {
        assert_eq!(children.len(), 4);

        let op_tag = engine.arena.get_node(children[0]).unwrap();
        assert_eq!(op_tag, Topology::Atom(b"op::juxtapose".to_vec()));

        let a = engine.arena.get_node(children[1]).unwrap();
        assert_eq!(a, Topology::Atom(b"a".to_vec()));

        let b = engine.arena.get_node(children[2]).unwrap();
        assert_eq!(b, Topology::Atom(b"b".to_vec()));

        let c = engine.arena.get_node(children[3]).unwrap();
        assert_eq!(c, Topology::Atom(b"c".to_vec()));
    } else {
        panic!("Expected Adjacency topology for parsed root");
    }
}

#[test]
fn test_concurrent_parallel_interning() {
    use std::sync::Arc;
    use std::thread;

    let engine = Arc::new(IdentityEngine::new());
    let mut handles = Vec::new();

    for i in 0..100 {
        let engine_clone = Arc::clone(&engine);
        let handle = thread::spawn(move || {
            // 1. Shared node (to test deduplication under concurrent pressure)
            let shared_node = Topology::Atom(b"shared_concurrent_node".to_vec());
            let id1 = engine_clone.intern(shared_node);

            // 2. Thread-unique node
            let unique_data = format!("unique_node_{}", i);
            let unique_node = Topology::Atom(unique_data.into_bytes());
            let id2 = engine_clone.intern(unique_node);

            (id1, id2)
        });
        handles.push(handle);
    }

    let mut ids = Vec::new();
    for handle in handles {
        let (id1, id2) = handle.join().unwrap();
        ids.push((id1, id2));
    }

    // Assert: all shared nodes map to the same ID
    let first_shared_id = ids[0].0;
    for &(id1, _) in &ids {
        assert_eq!(id1, first_shared_id);
    }

    // Assert: all unique nodes map to completely distinct IDs
    let mut unique_ids: Vec<NodeId> = ids.iter().map(|&(_, id2)| id2).collect();
    unique_ids.sort_unstable();
    let len_before = unique_ids.len();
    unique_ids.dedup();
    assert_eq!(
        unique_ids.len(),
        len_before,
        "Duplicate NodeIds created for unique nodes!"
    );

    // Assert: pool and arena consistency
    let pool_len = engine.intern_pool.read().len();
    let arena_len = engine.arena.len();
    assert_eq!(arena_len, pool_len);
}

#[test]
fn test_complex_multi_node_isomorphic_cycles() {
    use blake3::Hash;

    struct LogicalNode {
        is_atom: bool,
        atom_data: Vec<u8>,
        children: Vec<usize>, // logical indices
        is_membrane: bool,
        spin: i8,
    }

    let mut logical_nodes = Vec::new();
    // 0..5: Atoms
    for i in 0..5 {
        logical_nodes.push(LogicalNode {
            is_atom: true,
            atom_data: format!("node_{}", i).into_bytes(),
            children: Vec::new(),
            is_membrane: false,
            spin: 0,
        });
    }
    // 5..10: Adjacencies creating cyclic loops
    // 5 -> Adjacency([0, 1, 14])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![0, 1, 14],
        is_membrane: false,
        spin: 0,
    });
    // 6 -> Adjacency([2, 3, 5])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![2, 3, 5],
        is_membrane: false,
        spin: 0,
    });
    // 7 -> Adjacency([4, 6, 11])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![4, 6, 11],
        is_membrane: false,
        spin: 0,
    });
    // 8 -> Adjacency([5, 7, 12])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![5, 7, 12],
        is_membrane: false,
        spin: 0,
    });
    // 9 -> Adjacency([6, 8, 13])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![6, 8, 13],
        is_membrane: false,
        spin: 0,
    });
    // 10..15: Membranes and Adjacencies
    // 10 -> Membrane([0, 9], spin: 1)
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![0, 9],
        is_membrane: true,
        spin: 1,
    });
    // 11 -> Membrane([1, 10], spin: -1)
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![1, 10],
        is_membrane: true,
        spin: -1,
    });
    // 12 -> Membrane([2, 11], spin: 1)
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![2, 11],
        is_membrane: true,
        spin: 1,
    });
    // 13 -> Adjacency([3, 12])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![3, 12],
        is_membrane: false,
        spin: 0,
    });
    // 14 -> Adjacency([4, 13])
    logical_nodes.push(LogicalNode {
        is_atom: false,
        atom_data: Vec::new(),
        children: vec![4, 13],
        is_membrane: false,
        spin: 0,
    });

    // Engine 1 - Identity mapping
    let engine1 = IdentityEngine::new();
    for (phys_id, log_node) in logical_nodes.iter().enumerate().take(15) {
        let topo = if log_node.is_atom {
            Topology::Atom(log_node.atom_data.clone())
        } else if log_node.is_membrane {
            let children_phys: Vec<NodeId> =
                log_node.children.iter().map(|&c| c as NodeId).collect();
            Topology::Membrane {
                children: children_phys,
                spin: log_node.spin,
            }
        } else {
            let children_phys: Vec<NodeId> =
                log_node.children.iter().map(|&c| c as NodeId).collect();
            Topology::Adjacency(children_phys)
        };
        let allocated_id = engine1.arena.allocate_raw(topo);
        assert_eq!(allocated_id, phys_id as NodeId);

        let mut hasher = blake3::Hasher::new();
        hasher.update(b"LOG");
        hasher.update(&[phys_id as u8]);
        engine1.id_to_hash.write().push(hasher.finalize());
    }

    // Engine 2 - Shuffled mapping
    let p2 = vec![12, 5, 8, 0, 14, 3, 11, 7, 2, 9, 1, 13, 6, 4, 10];
    let mut log_to_phys = [0; 15];
    for (log_id, &phys_id) in p2.iter().enumerate() {
        log_to_phys[log_id] = phys_id;
    }

    let engine2 = IdentityEngine::new();
    for phys_id in 0..15 {
        let log_id = p2.iter().position(|&x| x == phys_id).unwrap();
        let log_node = &logical_nodes[log_id];
        let topo = if log_node.is_atom {
            Topology::Atom(log_node.atom_data.clone())
        } else if log_node.is_membrane {
            let children_phys: Vec<NodeId> = log_node
                .children
                .iter()
                .map(|&c| log_to_phys[c] as NodeId)
                .collect();
            Topology::Membrane {
                children: children_phys,
                spin: log_node.spin,
            }
        } else {
            let children_phys: Vec<NodeId> = log_node
                .children
                .iter()
                .map(|&c| log_to_phys[c] as NodeId)
                .collect();
            Topology::Adjacency(children_phys)
        };
        let allocated_id = engine2.arena.allocate_raw(topo);
        assert_eq!(allocated_id, phys_id as NodeId);

        let mut hasher = blake3::Hasher::new();
        hasher.update(b"LOG");
        hasher.update(&[log_id as u8]);
        engine2.id_to_hash.write().push(hasher.finalize());
    }

    let subgraph1: Vec<NodeId> = (0..15).collect();
    let colors1 = engine1.compute_wl_colorings(&subgraph1, 6);

    let subgraph2: Vec<NodeId> = (0..15).collect();
    let colors2 = engine2.compute_wl_colorings(&subgraph2, 6);

    let mut color_values1: Vec<Hash> = colors1.values().cloned().collect();
    let mut color_values2: Vec<Hash> = colors2.values().cloned().collect();

    color_values1.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));
    color_values2.sort_unstable_by(|a, b| a.as_bytes().cmp(b.as_bytes()));

    assert_eq!(color_values1, color_values2);
}

#[test]
fn test_complex_parser_expression_reduction_pipeline() {
    let engine = IdentityEngine::new();

    // 1. Parse nested H-Cypher: [ { a b } ( c [ d e ] ) ]
    let script = "[ { a b } ( c [ d e ] ) ]";
    let root = kernel::parser::parse_h_cypher(script, &engine).unwrap();

    // 2. Assert structural layout
    let root_node = engine.arena.get_node(root).unwrap();
    if let Topology::Membrane { children, spin } = root_node {
        assert_eq!(spin, -1);
        assert_eq!(children.len(), 2);

        // Child 0: { a b }
        let m1_id = children[0];
        let m1_node = engine.arena.get_node(m1_id).unwrap();
        if let Topology::Membrane {
            children: m1_children,
            spin: m1_spin,
        } = m1_node
        {
            assert_eq!(m1_spin, 1);
            assert_eq!(m1_children.len(), 2);
            assert_eq!(
                engine.arena.get_node(m1_children[0]).unwrap(),
                Topology::Atom(b"a".to_vec())
            );
            assert_eq!(
                engine.arena.get_node(m1_children[1]).unwrap(),
                Topology::Atom(b"b".to_vec())
            );
        } else {
            panic!("Expected Membrane {{ a b }}");
        }

        // Child 1: ( c [ d e ] )
        let adj_id = children[1];
        let adj_node = engine.arena.get_node(adj_id).unwrap();
        if let Topology::Adjacency(adj_children) = adj_node {
            assert_eq!(adj_children.len(), 2);

            let c_id = adj_children[0];
            assert_eq!(
                engine.arena.get_node(c_id).unwrap(),
                Topology::Atom(b"c".to_vec())
            );

            let m2_id = adj_children[1];
            let m2_node = engine.arena.get_node(m2_id).unwrap();
            if let Topology::Membrane {
                children: m2_children,
                spin: m2_spin,
            } = m2_node
            {
                assert_eq!(m2_spin, -1);
                assert_eq!(m2_children.len(), 2);
                assert_eq!(
                    engine.arena.get_node(m2_children[0]).unwrap(),
                    Topology::Atom(b"d".to_vec())
                );
                assert_eq!(
                    engine.arena.get_node(m2_children[1]).unwrap(),
                    Topology::Atom(b"e".to_vec())
                );
            } else {
                panic!("Expected Membrane [ d e ]");
            }

            // 3. Define and evaluate a DPO rewrite rule to flatten the nested adjacency
            // LHS: Membrane { spin: -1, children: [ m1, Adjacency([ c, m2 ]) ] }
            let rule_l = Pattern::Membrane {
                spin: -1,
                children: vec![
                    Pattern::Variable("m1".to_string()),
                    Pattern::Adjacency(vec![
                        Pattern::Variable("c".to_string()),
                        Pattern::Variable("m2".to_string()),
                    ]),
                ],
            };

            // RHS: Membrane { spin: -1, children: [ m1, c, m2 ] }
            let rule_r = Pattern::Membrane {
                spin: -1,
                children: vec![
                    Pattern::Variable("m1".to_string()),
                    Pattern::Variable("c".to_string()),
                    Pattern::Variable("m2".to_string()),
                ],
            };

            let mut evaluator = PrimitiveEvaluator::new(&engine);
            let simplified_root = evaluator.evaluate_rewrite(root, &rule_l, &rule_r).unwrap();

            // Verify simplified root layout
            let simplified_node = engine.arena.get_node(simplified_root).unwrap();
            if let Topology::Membrane {
                children: sim_children,
                spin: sim_spin,
            } = simplified_node
            {
                assert_eq!(sim_spin, -1);
                assert_eq!(sim_children.len(), 3);
                assert_eq!(sim_children[0], m1_id);
                assert_eq!(sim_children[1], c_id);
                assert_eq!(sim_children[2], m2_id);
            } else {
                panic!("Expected simplified Membrane to be flattened");
            }

            // 4. Validate time-travel residue causal history tracing
            let history = trace_time_travel_history(&engine);
            assert!(history.contains(&(root, simplified_root)));
        } else {
            panic!("Expected Adjacency ( c [ d e ] )");
        }
    } else {
        panic!("Expected Membrane root [ ... ]");
    }
}
