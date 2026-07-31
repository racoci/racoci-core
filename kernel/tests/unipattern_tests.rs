use kernel::apply_unipattern;

#[test]
fn test_commutative_term_swapping() {
    let input = "x + y";
    let rule = r#"MATCH {
  :[x] + :[y]
}
TRANSITION => {
  :[y] + :[x]
}"#;
    let expected = "y + x";
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_nested_if_flattening() {
    let input = r#"if cond_a:
    if cond_b:
        do_something()"#;
    let rule = r#"MATCH {
  if :[a]:
      if :[b]:
          :[body]
}
TRANSITION => {
  if :[a] and :[b]:
      :[body]
}"#;
    let expected = r#"if cond_a and cond_b:
    do_something()"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_forth_constant_folding_preserving_comments() {
    let input = r#"\ Definição da física de partículas
2 ( massa ) * 3 ( aceleração ) *"#;
    let rule = r#"MATCH {
  :[a:literal] (:[comment_a]) * :[b:literal] (:[comment_b]) *
}
TRANSITION => {
  :[calc(a * b)] (:[comment_a]) (:[comment_b]) *
}"#;
    let expected = r#"\ Definição da física de partículas
6 ( massa ) ( aceleração ) *"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_clojure_thread_first_macro() {
    let input = r#"(defn process-order [order]
  (-> order
      (assoc :timestamp (now))
      (update-in [:user :id] (fn [id] (decrypt-id id)))
      (calculate-tax 0.08)))"#;
    let rule = r#"MATCH {
  (-> :[x] 
      (assoc :[k] :[v]) 
      (update-in :[path] (fn [:[arg]] (:[func] :[arg]))) 
      (:[last_func] :[last_arg]))
}
TRANSITION => {
  (:[last_func] 
    (update-in 
      (assoc :[x] :[k] :[v]) 
      :[path] 
      #(:[func] %)) 
    :[last_arg])
}"#;
    let expected = r#"(defn process-order [order]
  (calculate-tax 
    (update-in 
      (assoc order :timestamp (now)) 
      [:user :id] 
      #(decrypt-id %)) 
    0.08))"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_haskell_monadic_to_do_notation() {
    let input = "fetchUser userId >>= \\user -> logDebug \"User loaded\" >> fetchPreferences user >>= \\prefs -> return (user, prefs)";
    let rule = r#"MATCH {
  :[action1] >>= \:[x] -> :[logger] >> :[action2] >>= \:[y] -> return (:[x], :[y])
}
TRANSITION => {
  do {
    :[x] <- :[action1];
    :[logger];
    :[y] <- :[action2];
    return (:[x], :[y])
  }
}"#;
    let expected = r#"do
  user <- fetchUser userId
  logDebug "User loaded"
  prefs <- fetchPreferences user
  return (user, prefs)"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_prolog_tail_recursion_optimization() {
    let input = r#"sum_list([], 0).
sum_list([H|T], Sum) :- 
    sum_list(T, Rest), 
    !, 
    Sum is H + Rest, 
    asserta(cache_sum([H|T], Sum))."#;
    let rule = r#"MATCH {
  :[pred]([], 0).
  :[pred]([H|T], Sum) :- :[pred](T, Rest), !, Sum is H + Rest, :[side_effect].
}
TRANSITION => {
  :[pred](L, Sum) :- :[pred]_acc(L, 0, Sum).
  :[pred]_acc([], Acc, Acc).
  :[pred]_acc([H|T], Acc, Sum) :- NewAcc is Acc + H, :[pred]_acc(T, NewAcc, Sum), !, :[side_effect].
}"#;
    let expected = r#"sum_list(L, Sum) :- sum_acc(L, 0, Sum).
sum_acc([], Acc, Acc).
sum_acc([H|T], Acc, Sum) :- 
    NewAcc is Acc + H, 
    sum_acc(T, NewAcc, Sum), 
    !, 
    asserta(cache_sum([H|T], Sum))."#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}
