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

#[test]
fn test_ultra_complex_forth_nested_folding() {
    let input = r#": energy_calc
  2 ( massa ) 3 ( aceleração ) * 3 ( escala_c ) * ( fator_g ) 10 *
;"#;
    let rule = r#"MATCH {
  :[a:literal] (:[comment_a]) * :[b:literal] (:[comment_b]) * :[c:literal] (:[comment_c]) * (:[comment_d]) :[scale:literal] *
}
TRANSITION => {
  :[calc(a * b * c * scale)] (:[comment_a]) (:[comment_b]) (:[comment_c]) (:[comment_d]) *
}"#;
    let expected = r#": energy_calc
  180 ( massa ) ( aceleração ) ( escala_c ) ( fator_g ) *
;"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_ultra_complex_clojure_destructuring() {
    let input = r#"(defn transform-user [db user-id]
  (->> (get-user db user-id)
       (assoc :active true)
       (update :preferences (fn [{:keys [theme lang] :as prefs}] (assoc prefs :theme (invert-theme theme))))))"#;
    let rule = r#"MATCH {
  (->> :[input] (assoc :[k] :[v]) (update :[field] (fn [{:keys [:[theme_var] :[lang_var]] :as :[prefs_var]}] (assoc :[prefs_var] :[theme_var] (invert-theme :[theme_var])))))
}
TRANSITION => {
  (let [:[prefs_var] (get-user-prefs :[input] :[field])] (assoc :[input] :[k] :[v] :[field] (assoc :[prefs_var] :[theme_var] (invert-theme :[theme_var]))))
}"#;
    let expected = r#"(defn transform-user [db user-id]
  (let [prefs (get-user-prefs (get-user db user-id) :preferences)] (assoc (get-user db user-id) :active true :preferences (assoc prefs :theme (invert-theme theme)))))"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_ultra_complex_haskell_transformer_unroll() {
    let input = "validateToken token >>= \\tok -> if not (isValid tok) then throwError InvalidToken else fetchRoles tok >>= \\roles -> if null roles then throwError NoRoles else return (tok, roles)";
    let rule = r#"MATCH {
  :[action1] >>= \:[tok] -> if not (isValid :[tok]) then throwError :[err1] else :[action2] :[tok] >>= \:[roles] -> if null :[roles] then throwError :[err2] else return (:[tok], :[roles])
}
TRANSITION => {
  do {
    :[tok] <- :[action1];
    guard (isValid :[tok]) <|> throwError :[err1];
    :[roles] <- :[action2] :[tok];
    guard (not (null :[roles])) <|> throwError :[err2];
    return (:[tok], :[roles])
  }
}"#;
    let expected = r#"do
  tok <- validateToken token
  guard (isValid tok) <|> throwError InvalidToken
  roles <- fetchRoles tok
  guard (not (null roles)) <|> throwError NoRoles
  return (tok, roles)"#;
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}

#[test]
fn test_ultra_complex_prolog_dcg_expansion() {
    let input = "sentence(S) --> noun_phrase(N), !, verb_phrase(V), { S = sentence(N, V) }.";
    let rule = r#"MATCH {
  :[rule_name](:[args]) --> :[part1](:[arg1]), !, :[part2](:[arg2]), { :[arg3] = :[result] }.
}
TRANSITION => {
  :[rule_name](:[args], S0, S) :- :[part1](:[arg1], S0, S1), !, :[part2](:[arg2], S1, S), :[arg3] = :[result].
}"#;
    let expected = "sentence(S, S0, S) :- noun_phrase(N, S0, S1), !, verb_phrase(V, S1, S), S = sentence(N, V).";
    let output = apply_unipattern(input, rule);
    assert_eq!(output, expected);
}
