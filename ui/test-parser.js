import { test } from 'node:test';
import assert from 'node:assert';
import { parseHCypher } from './src/lib/HCypherParser.js';

test('H-Cypher Parser - Unit Tests', async (t) => {
  await t.test('should parse simple nodes', () => {
    const input = '(kernel)';
    const result = parseHCypher(input);

    assert.strictEqual(result.nodes.length, 1);
    assert.strictEqual(result.nodes[0].id, 'kernel');
    assert.strictEqual(result.nodes[0].label, 'KERNEL');
    assert.strictEqual(result.nodes[0].type, 'atom');
  });

  await t.test('should parse nodes with properties', () => {
    const input = '(kernel {role: "kernel", zone: "stage-0"})';
    const result = parseHCypher(input);

    assert.strictEqual(result.nodes.length, 1);
    const node = result.nodes[0];
    assert.strictEqual(node.id, 'kernel');
    assert.ok(node.properties);
    assert.strictEqual(node.properties.role, 'kernel');
    assert.strictEqual(node.properties.zone, 'stage-0');
  });

  await t.test('should parse direct arrow relationships', () => {
    const input = '(sync) -> (memory)';
    const result = parseHCypher(input);

    assert.strictEqual(result.nodes.length, 2);
    assert.strictEqual(result.edges.length, 1);
    assert.strictEqual(result.edges[0].source, 'sync');
    assert.strictEqual(result.edges[0].target, 'memory');
    assert.strictEqual(result.edges[0].label, 'DEPENDS_ON');
  });

  await t.test('should parse typed edge relationships', () => {
    const input = '(kernel) -[:DEPENDS_ON]-> (parser)';
    const result = parseHCypher(input);

    assert.strictEqual(result.nodes.length, 2);
    assert.strictEqual(result.edges.length, 1);
    assert.strictEqual(result.edges[0].source, 'kernel');
    assert.strictEqual(result.edges[0].target, 'parser');
    assert.strictEqual(result.edges[0].label, 'DEPENDS_ON');
  });

  await t.test('should parse membranes with nested scope', () => {
    const input = `
      (kernel) -> (parser)
      [ KERNEL_SAFETY_ZONE ~ kernel, parser ]
    `;
    const result = parseHCypher(input);

    assert.strictEqual(result.membranes.length, 1);
    const memb = result.membranes[0];
    assert.strictEqual(memb.id, 'KERNEL_SAFETY_ZONE');
    assert.strictEqual(memb.label, 'KERNEL_SAFETY_ZONE');
    assert.deepStrictEqual(memb.nodeIds, ['kernel', 'parser']);
  });
});
