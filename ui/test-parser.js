import { test } from 'node:test';
import assert from 'node:assert';
import { parseHCypher } from './src/lib/HCypherParser.js';
import { getClosestAllowedColor, applyContrastProtection, hexToRgb, getRelativeLuminance, rgbToHsl } from './src/lib/ColorMath.js';

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

  await t.test('should parse membranes with prefixed parenthetical scope', () => {
    const input = `
      (kernel) -> (parser)
      [KERNEL_SAFETY_ZONE](kernel, parser)
    `;
    const result = parseHCypher(input);

    assert.strictEqual(result.membranes.length, 1);
    const memb = result.membranes[0];
    assert.strictEqual(memb.id, 'KERNEL_SAFETY_ZONE');
    assert.strictEqual(memb.label, 'KERNEL_SAFETY_ZONE');
    assert.deepStrictEqual(memb.nodeIds, ['kernel', 'parser']);
  });

  await t.test('should parse membranes with suffixed parenthetical scope', () => {
    const input = `
      (kernel) -> (parser)
      (kernel, parser)[KERNEL_SAFETY_ZONE]
    `;
    const result = parseHCypher(input);

    assert.strictEqual(result.membranes.length, 1);
    const memb = result.membranes[0];
    assert.strictEqual(memb.id, 'KERNEL_SAFETY_ZONE');
    assert.strictEqual(memb.label, 'KERNEL_SAFETY_ZONE');
    assert.deepStrictEqual(memb.nodeIds, ['kernel', 'parser']);
  });

  await t.test('should parse membranes with unnamed parenthetical scope', () => {
    const input = `
      (kernel) -> (parser)
      (kernel, parser)
    `;
    const result = parseHCypher(input);

    assert.strictEqual(result.membranes.length, 1);
    const memb = result.membranes[0];
    assert.ok(memb.id.startsWith('membrane_'));
    assert.deepStrictEqual(memb.nodeIds, ['kernel', 'parser']);
  });

  await t.test('should parse colors and custom properties for nodes, edges, and membranes', () => {
    const input = `
      (kernel {color: "#00d2ff", role: "core"})
      (kernel) -[:DEPENDS_ON {color: "#a855f7"}]-> (parser)
      [KERNEL_SAFETY_ZONE {color: "#22c55e"}](kernel, parser)
    `;
    const result = parseHCypher(input);

    // Node property & color extraction
    const kernelNode = result.nodes.find(n => n.id === 'kernel');
    assert.ok(kernelNode);
    assert.strictEqual(kernelNode.color, '#00d2ff');
    assert.strictEqual(kernelNode.properties?.role, 'core');

    // Edge property & color extraction
    assert.strictEqual(result.edges.length, 1);
    const edge = result.edges[0];
    assert.strictEqual(edge.color, '#a855f7');
    assert.strictEqual(edge.properties?.color, '#a855f7');

    // Membrane property & color extraction
    assert.strictEqual(result.membranes.length, 1);
    const memb = result.membranes[0];
    assert.strictEqual(memb.color, '#22c55e');
    assert.strictEqual(memb.properties?.color, '#22c55e');
  });
});

test('ColorMath Utilities - Unit Tests', async (t) => {
  await t.test('should parse hex to RGB correctly', () => {
    const white = hexToRgb('#ffffff');
    assert.deepStrictEqual(white, { r: 255, g: 255, b: 255 });

    const black = hexToRgb('#000000');
    assert.deepStrictEqual(black, { r: 0, g: 0, b: 0 });

    const cyan = hexToRgb('#00d2ff');
    assert.deepStrictEqual(cyan, { r: 0, g: 210, b: 255 });
  });

  await t.test('should match closest allowed palette color', () => {
    // Exact matches
    assert.strictEqual(getClosestAllowedColor('#ffffff'), '#ffffff');
    assert.strictEqual(getClosestAllowedColor('#00d2ff'), '#00d2ff');

    // Named colors
    assert.strictEqual(getClosestAllowedColor('cyan'), '#00d2ff');
    assert.strictEqual(getClosestAllowedColor('purple'), '#a855f7');

    // Custom colors mapped via Euclidean distance
    assert.strictEqual(getClosestAllowedColor('#00ffff'), '#00d2ff'); // Cyan-ish to Neon Cyan
    assert.strictEqual(getClosestAllowedColor('#a040f0'), '#a855f7'); // Violet-ish to Neon Violet
    assert.strictEqual(getClosestAllowedColor('#10b981'), '#22c55e'); // Emerald green to Neon Green
  });

  await t.test('should compute relative luminance', () => {
    const whiteL = getRelativeLuminance(255, 255, 255);
    assert.strictEqual(whiteL, 1.0);

    const blackL = getRelativeLuminance(0, 0, 0);
    assert.strictEqual(blackL, 0.0);
  });

  await t.test('should apply contrast protection filters', () => {
    const darkBg = '#0b0f19'; // Deep Slate
    const lightBg = '#ffffff'; // Pure White

    // Dark background + Dark candidate (poor contrast)
    const correctedForDark = applyContrastProtection(darkBg, '#111111');
    const rgbForDark = hexToRgb(correctedForDark);
    const hslForDark = rgbToHsl(rgbForDark.r, rgbForDark.g, rgbForDark.b);
    assert.ok(hslForDark.l >= 0.8, 'Corrected color on dark background must have high lightness (>= 0.8)');

    // Light background + Light candidate (poor contrast)
    const correctedForLight = applyContrastProtection(lightBg, '#eeeeee');
    const rgbForLight = hexToRgb(correctedForLight);
    const hslForLight = rgbToHsl(rgbForLight.r, rgbForLight.g, rgbForLight.b);
    assert.ok(hslForLight.l <= 0.2, 'Corrected color on light background must have low lightness (<= 0.2)');
  });
});
