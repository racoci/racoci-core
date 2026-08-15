// test-textmate-parser.js - TDD Unit Tests for TextMate-based Syntax Highlighting
import test from 'node:test';
import assert from 'node:assert';
import { TextMateLexer } from './src/lib/TextMateLexer.js';

test('▶ TextMate Lexer - Unit Tests', async (t) => {
  // Define a compact, compatible mock TextMate Grammar for H-Cypher
  const mockGrammar = {
    scopeName: 'source.hcypher',
    patterns: [
      {
        name: 'comment.line.double-slash.hcypher',
        match: '//.*$'
      },
      {
        name: 'keyword.control.hcypher',
        match: '\\b(MATCH)\\b'
      },
      {
        name: 'entity.name.node.hcypher',
        match: '\\b(kernel|parser|sync|memory)\\b'
      },
      {
        name: 'constant.numeric.color.hcypher',
        match: '#[0-9a-fA-F]{6}'
      }
    ]
  };

  const lexer = new TextMateLexer(mockGrammar);

  await t.test('should correctly tokenize plain text and apply fallback scopes', () => {
    const text = 'hello world';
    const tokens = lexer.tokenize(text);
    
    assert.strictEqual(tokens.length, 1, 'Plain text should produce exactly 1 token');
    assert.strictEqual(tokens[0].content, 'hello world', 'Plain text token content matches');
    assert.deepStrictEqual(tokens[0].scopes, ['source.hcypher'], 'Plain text token should inherit the base grammar scope');
  });

  await t.test('should identify comments and separate them into unique scopes', () => {
    const text = 'kernel // this is a comment';
    const tokens = lexer.tokenize(text);

    // Expected tokens: 
    // 1) "kernel" (entity.name.node.hcypher)
    // 2) " " (source.hcypher)
    // 3) "// this is a comment" (comment.line.double-slash.hcypher)
    assert.ok(tokens.length >= 3, 'Comment line should yield at least 3 distinct tokens');
    
    const commentToken = tokens.find(t => t.scopes.includes('comment.line.double-slash.hcypher'));
    assert.ok(commentToken, 'Must find a token matching the comment scope');
    assert.strictEqual(commentToken.content, '// this is a comment', 'Comment content matches');
  });

  await t.test('should match multiple consecutive rules on the same line', () => {
    const text = 'MATCH (kernel #ec4899)';
    const tokens = lexer.tokenize(text);

    // Find and check MATCH keyword
    const matchToken = tokens.find(t => t.content === 'MATCH');
    assert.ok(matchToken, 'Must find MATCH keyword token');
    assert.deepStrictEqual(matchToken.scopes, ['keyword.control.hcypher'], 'MATCH should have keyword scope');

    // Find and check kernel node
    const kernelToken = tokens.find(t => t.content === 'kernel');
    assert.ok(kernelToken, 'Must find kernel node token');
    assert.deepStrictEqual(kernelToken.scopes, ['entity.name.node.hcypher'], 'kernel should have node entity scope');

    // Find and check hex color
    const colorToken = tokens.find(t => t.content === '#ec4899');
    assert.ok(colorToken, 'Must find hexadecimal color token');
    assert.deepStrictEqual(colorToken.scopes, ['constant.numeric.color.hcypher'], '#ec4899 should have color constant scope');
  });
});
