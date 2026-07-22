use kernel::{BindingMap, IdentityEngine, Pattern, PrimitiveEvaluator, Topology};

#[test]
fn test_end_to_end_isomorphic_deduplication() {
    let mut engine = IdentityEngine::new();

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
    println!("Deduplicated Isomorphic Node ID: {}", g1);
}

#[test]
fn test_end_to_end_deep_nested_pattern_matching_and_rewrite() {
    let mut engine = IdentityEngine::new();

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

    // Under category-theoretic DPO rewriting rules, rewriting `inner_add` in isolation
    // while leaving its parent `root` untouched would violate the dangling edge condition.
    // Therefore, we must match and rewrite the expression at the top-level `root`:
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

    let mut evaluator = PrimitiveEvaluator::new(&mut engine);
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
