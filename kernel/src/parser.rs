//! # Holds H-Cypher Parser
//!
//! Implements Stage 3: AST-Free H-Cypher Parser.
//! Provides direct text-to-graph parsing rules converting spatial syntax
//! (whitespace juxtaposition, scoping boundaries) into raw topological structures,
//! as well as a DPO-based parsing workflow that progressively simplifies token chains.

use crate::{IdentityEngine, NodeId, Pattern, Topology};
use alloc::string::{String, ToString};
use alloc::vec;
use alloc::vec::Vec;

/// Lexes a raw H-Cypher script string into a vector of tokens.
pub fn tokenize(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];
        if c.is_whitespace() {
            if !current.is_empty() {
                tokens.push(current);
                current = String::new();
            }
        } else if c == '(' || c == ')' || c == '[' || c == ']' || c == '{' || c == '}' || c == '~' || c == ',' {
            if !current.is_empty() {
                tokens.push(current);
                current = String::new();
            }
            tokens.push(c.to_string());
        } else {
            current.push(c);
        }
        i += 1;
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

/// Helper structure for recursive-descent parsing.
pub struct Parser<'a> {
    tokens: Vec<String>,
    index: usize,
    engine: &'a IdentityEngine,
}

impl<'a> Parser<'a> {
    /// Instantiates a new Parser over a token stream and Identity Engine.
    pub fn new(tokens: Vec<String>, engine: &'a IdentityEngine) -> Self {
        Self {
            tokens,
            index: 0,
            engine,
        }
    }

    fn peek(&self) -> Option<&String> {
        self.tokens.get(self.index)
    }

    fn next(&mut self) -> Option<String> {
        if self.index < self.tokens.len() {
            let t = self.tokens[self.index].clone();
            self.index += 1;
            Some(t)
        } else {
            None
        }
    }

    /// Parses the entire token stream into a single Holds topological structure.
    pub fn parse(&mut self) -> Result<NodeId, &'static str> {
        self.parse_expression()
    }

    fn parse_expression(&mut self) -> Result<NodeId, &'static str> {
        let mut items = Vec::new();

        while let Some(token) = self.peek() {
            if token == ")" || token == "]" || token == "}" {
                break;
            }
            let item = self.parse_primary()?;
            items.push(item);
        }

        if items.is_empty() {
            return Err("Empty expression");
        }

        if items.len() == 1 {
            Ok(items[0])
        } else {
            // Whitespace juxtaposition -> Quaternary Adjacency or higher-order Adjacency.
            // By prepending `op::juxtapose` as the operator tag, we map 3-symbol streams (like "a b c")
            // into a quaternary Adjacency: Adjacency(vec![juxtapose_tag, a, b, c]).
            let juxtapose_tag = self
                .engine
                .intern(Topology::Atom(b"op::juxtapose".to_vec()));
            let mut children = vec![juxtapose_tag];
            children.extend(items);
            Ok(self.engine.intern(Topology::Adjacency(children)))
        }
    }

    fn parse_primary(&mut self) -> Result<NodeId, &'static str> {
        let token = self.next().ok_or("Unexpected end of input")?;

        if token == "(" {
            let mut children = Vec::new();
            let mut has_commas = false;
            while let Some(t) = self.peek() {
                if t == ")" {
                    self.next(); // consume ")"
                    break;
                }
                if t == "," {
                    self.next(); // consume ","
                    has_commas = true;
                    continue;
                }
                // Elements inside parenthesis represent direct list / hyperedge adjacency
                children.push(self.parse_primary()?);
            }

            // Check if there is a suffixed named bracket following ")"
            let mut is_named_suffix = false;
            if let Some(t) = self.peek() {
                if t == "[" {
                    self.next(); // consume "["
                    // Read everything inside "[...]"
                    while let Some(t) = self.next() {
                        if t == "]" {
                            break;
                        }
                    }
                    is_named_suffix = true;
                }
            }

            if has_commas || is_named_suffix {
                Ok(self.engine.intern(Topology::Membrane { children, spin: 1 }))
            } else {
                Ok(self.engine.intern(Topology::Adjacency(children)))
            }
        } else if token == "[" {
            // It could be a prefixed membrane name!
            // Let's find the closing "]" index
            let mut depth = 1;
            let mut end_idx = self.index;
            while end_idx < self.tokens.len() {
                if self.tokens[end_idx] == "[" {
                    depth += 1;
                } else if self.tokens[end_idx] == "]" {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                }
                end_idx += 1;
            }
            if end_idx < self.tokens.len() && self.tokens[end_idx] == "]" {
                // We found the closing "]"!
                // Is the token immediately after "]" a "("?
                if end_idx + 1 < self.tokens.len() && self.tokens[end_idx + 1] == "(" {
                    // YES! This is a prefixed named membrane!
                    // Let's consume the name of the membrane (all tokens between self.index and end_idx)
                    for _ in self.index..end_idx {
                        self.next(); // consume name tokens
                    }
                    self.next(); // consume "]"
                    self.next(); // consume "("

                    // Now parse the inner elements of the parenthetical list
                    let mut children = Vec::new();
                    while let Some(t) = self.peek() {
                        if t == ")" {
                            self.next(); // consume ")"
                            break;
                        }
                        if t == "," {
                            self.next(); // consume ","
                            continue;
                        }
                        children.push(self.parse_primary()?);
                    }
                    return Ok(self.engine.intern(Topology::Membrane { children, spin: 1 }));
                }
            }

            // Otherwise, it's a standard square-bracket membrane with spin -1 (the original behavior)
            let mut children = Vec::new();
            while let Some(t) = self.peek() {
                if t == "]" {
                    self.next(); // consume "]"
                    break;
                }
                children.push(self.parse_primary()?);
            }
            Ok(self
                .engine
                .intern(Topology::Membrane { children, spin: -1 }))
        } else if token == "{" {
            let mut children = Vec::new();
            while let Some(t) = self.peek() {
                if t == "}" {
                    self.next(); // consume "}"
                    break;
                }
                children.push(self.parse_primary()?);
            }
            // Curly braces represent Membranes with spin 1 (standard isolated topology)
            Ok(self.engine.intern(Topology::Membrane { children, spin: 1 }))
        } else {
            // Raw word -> Atom
            Ok(self.engine.intern(Topology::Atom(token.into_bytes())))
        }
    }
}

/// Parses an H-Cypher script directly into the contiguous Holds memory arena.
pub fn parse_h_cypher(input: &str, engine: &IdentityEngine) -> Result<NodeId, &'static str> {
    let tokens = tokenize(input);
    if tokens.is_empty() {
        return Err("Empty input script");
    }
    let mut parser = Parser::new(tokens, engine);
    parser.parse()
}

/// Builds a linear linked token-chain adjacency in the arena representing a sequence of character tokens.
/// For tokens ["a", "b", "c"], produces:
/// Adjacency([ Atom("a"), Adjacency([ Atom("b"), Adjacency([ Atom("c"), Atom("sys::eos") ]) ]) ])
pub fn build_token_chain(tokens: &[String], engine: &IdentityEngine) -> NodeId {
    let mut current = engine.intern(Topology::Atom(b"sys::eos".to_vec()));
    for token in tokens.iter().rev() {
        let token_node = engine.intern(Topology::Atom(token.clone().into_bytes()));
        current = engine.intern(Topology::Adjacency(vec![token_node, current]));
    }
    current
}

/// Demonstrates parsing an H-Cypher token chain recursively using a sequence of DPO rewrite rules.
/// For a 3-word token chain, this evaluates a DPO rule transforming it into a quaternary Adjacency.
pub fn parse_via_dpo(input: &str, engine: &IdentityEngine) -> Result<NodeId, &'static str> {
    let tokens = tokenize(input);
    if tokens.len() != 3 {
        return Err(
            "DPO parser demo currently configured for exactly 3 whitespace-juxtaposed tokens.",
        );
    }

    // 1. Build the token chain representing the input stream in the arena
    let chain_root = build_token_chain(&tokens, engine);

    // 2. Define the DPO rewrite rule (LHS => RHS)
    // LHS matches a 3-element token chain
    let rule_l = Pattern::Adjacency(vec![
        Pattern::Variable("x".to_string()),
        Pattern::Adjacency(vec![
            Pattern::Variable("y".to_string()),
            Pattern::Adjacency(vec![
                Pattern::Variable("z".to_string()),
                Pattern::Atom(b"sys::eos".to_vec()),
            ]),
        ]),
    ]);

    // RHS simplifies it into a quaternary Adjacency with an op::juxtapose tag
    let rule_r = Pattern::Adjacency(vec![
        Pattern::Atom(b"op::juxtapose".to_vec()),
        Pattern::Variable("x".to_string()),
        Pattern::Variable("y".to_string()),
        Pattern::Variable("z".to_string()),
    ]);

    // 3. Evaluate the DPO rewrite rule using our Evaluator
    let mut evaluator = crate::PrimitiveEvaluator::new(engine);
    let parsed_root = evaluator.evaluate_rewrite(chain_root, &rule_l, &rule_r)?;

    Ok(parsed_root)
}
