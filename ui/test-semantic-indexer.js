// test-semantic-indexer.js - TDD Unit Tests for Editor Semantic Indexing and Coordinate Math
import test from 'node:test';
import assert from 'node:assert';

test('▶ CyberEditor - Semantic Indexing Tests', async (t) => {
  // Simulate the reactive state derivation from TextMate tokens
  const mockTokens = [
    { content: 'MATCH', scopes: ['keyword.control.hcypher'] },
    { content: ' ', scopes: ['source.hcypher'] },
    { content: 'kernel', scopes: ['entity.name.node.hcypher'] },
    { content: ' ', scopes: ['source.hcypher'] },
    { content: 'parser', scopes: ['entity.name.node.hcypher'] },
    { content: 'KERNEL_SAFETY_ZONE', scopes: ['entity.name.membrane.hcypher'] }
  ];

  await t.test('should extract and deduplicate dynamic suggestions from entity scopes', () => {
    const list = new Set();
    mockTokens.forEach(token => {
      if (token.scopes.includes('entity.name.node.hcypher') || token.scopes.includes('entity.name.membrane.hcypher')) {
        list.add(token.content);
      }
    });

    const dynamicSuggestions = Array.from(list);
    
    assert.strictEqual(dynamicSuggestions.length, 3, 'Must extract exactly 3 entities');
    assert.ok(dynamicSuggestions.includes('kernel'), 'Must extract kernel node');
    assert.ok(dynamicSuggestions.includes('parser'), 'Must extract parser node');
    assert.ok(dynamicSuggestions.includes('KERNEL_SAFETY_ZONE'), 'Must extract KERNEL_SAFETY_ZONE membrane');
    assert.ok(!dynamicSuggestions.includes('MATCH'), 'Must NOT extract control keywords');
  });

  await t.test('should merge dynamic and static suggestions and filter by query', () => {
    const staticSuggestions = ['MATCH', 'DEPENDS_ON'];
    const dynamicSuggestions = ['kernel', 'parser', 'KERNEL_SAFETY_ZONE'];
    
    function filterSuggestions(query) {
      const q = query.toUpperCase();
      const combined = Array.from(new Set([...staticSuggestions, ...dynamicSuggestions]));
      return combined.filter(s => s.toUpperCase().includes(q));
    }

    const res1 = filterSuggestions('ker');
    assert.strictEqual(res1.length, 2, 'Query "ker" should return 2 matches (kernel and KERNEL_SAFETY_ZONE)');
    assert.ok(res1.includes('kernel') && res1.includes('KERNEL_SAFETY_ZONE'), 'Query "ker" should return "kernel" and "KERNEL_SAFETY_ZONE"');

    const res2 = filterSuggestions('e');
    assert.strictEqual(res2.length, 4, 'Query "e" should return 4 matches');
    assert.ok(res2.includes('kernel') && res2.includes('parser') && res2.includes('DEPENDS_ON') && res2.includes('KERNEL_SAFETY_ZONE'));
  });
});
