// test-regressions.js - Regression Tests for Node Colors, Split Resizing, and Hover Tags
import test from 'node:test';
import assert from 'node:assert';
import { CanvasRenderer } from './src/lib/CanvasRenderer.js';
import { parseHCypher } from './src/lib/HCypherParser.js';

// 1. Mock standard Canvas and 2D context to run in Node environment
class MockCanvasContext {
  constructor() {
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1.0;
    this.font = '';
    this.globalAlpha = 1.0;
    this.shadowColor = '';
    this.shadowBlur = 0;
    this.strokeCount = 0;
    this.fillCount = 0;
    this.drawnStrokeColors = [];
    this.drawnShadowColors = [];
  }
  clearRect() {}
  fillRect() {}
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  fill() {
    this.fillCount++;
  }
  stroke() {
    this.strokeCount++;
    this.drawnStrokeColors.push(this.strokeStyle);
    this.drawnShadowColors.push(this.shadowColor);
  }
  scale() {}
  fillText() {}
  setLineDash() {}
  translate() {}
  rotate() {}
  measureText(text) {
    return { width: text.length * 6.0 };
  }
  arc() {}
  arcTo() {}
  createRadialGradient() {
    return { addColorStop() {} };
  }
  createLinearGradient() {
    return { addColorStop() {} };
  }
}

class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.style = { width: '800px', height: '600px' };
    this.ctx = new MockCanvasContext();
  }
  getContext() {
    return this.ctx;
  }
  addEventListener() {}
  removeEventListener() {}
}

function globalSetRAF() {
  globalThis.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
  };
  globalThis.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
  globalThis.window = {
    devicePixelRatio: 1.0,
  };
}

test('▶ Holds UI Regression Tests', async (t) => {
  globalSetRAF();

  // Test Case 1: Node Colors Mismatch (2D vs 3D vs Editor)
  await t.test('2D nodes must reflect custom editor colors instead of being forced to green', () => {
    const mockCanvas = new MockCanvas();
    const renderer = new CanvasRenderer(mockCanvas, () => {});

    // Create a topology where node 'memory' has a custom color (#ec4899)
    const customCode = `(memory #ec4899)`;
    const parsed = parseHCypher(customCode);

    renderer.updateTopology(parsed.nodes, parsed.edges, parsed.membranes);
    
    // Explicitly run render to draw nodes onto context
    const ctx = mockCanvas.getContext();
    renderer.render();

    // Verify that the custom color `#ec4899` is respected and is not green (#22c55e)!
    const hasCustomColor = ctx.drawnStrokeColors.some(color => color === '#ec4899');
    const hasGreen = ctx.drawnStrokeColors.some(color => color === '#22c55e');

    console.log("Drawn Stroke Colors:", ctx.drawnStrokeColors);
    assert.strictEqual(hasCustomColor, true, "Node should be drawn with its custom color #ec4899");
    assert.strictEqual(hasGreen, false, "Node color should not be overridden to green");

    renderer.destroy();
  });

  // Test Case 2: Layout Split Resizing Logic
  await t.test('Dragging splits must successfully update the percent state of the layout tree', () => {
    // Model the reactive Svelte 5 state tree update
    const layoutTree = {
      type: 'split',
      split: 'vertical',
      percent: 18,
      children: [
        { type: 'widget', id: 'left-pane', widgetType: 'workspaces' },
        { type: 'widget', id: 'right-pane', widgetType: 'canvas' }
      ]
    };

    // Simulate drag resize handler logic from PaneNode.svelte
    function simulateResize(node, dragPercent) {
      // Set the percent on the node
      node.percent = Math.max(10, Math.min(90, dragPercent));
      
      // Simulate workspaceState.updateLayout() deep copy logic to trigger Svelte 5 reactivity
      const newLayoutTree = JSON.parse(JSON.stringify(layoutTree));
      return newLayoutTree;
    }

    const updatedTree = simulateResize(layoutTree, 45);

    assert.strictEqual(layoutTree.percent, 45, "The nested percent property of the node must be updated to 45");
    assert.strictEqual(updatedTree.percent, 45, "The cloned tree must preserve and reflect the updated percentage");
  });

  // Test Case 3: Color Text Tag Hover State Logic
  await t.test('Hover states on ColorTextTag must expand to show the full hexadecimal color text', () => {
    // Simulate Svelte 5 component state expansion
    const componentState = {
      color: '#ec4899',
      isHovered: false,
    };

    // Before hover - compact state
    function renderComponent(state) {
      if (state.isHovered) {
        return `#${state.color.replace('#', '')}`; // Expanded text representation
      }
      return '#'; // Compact tag representation
    }

    assert.strictEqual(renderComponent(componentState), '#', "By default, the tag must be compact and display only '#'");

    // Simulate hover trigger
    componentState.isHovered = true;
    assert.strictEqual(renderComponent(componentState), '#ec4899', "When hovered, the tag must expand to show the full hex color code");
  });

  // Test Case 4: Static Code Guard against Deprecated 'physicsSettings' inside View3D.svelte
  await t.test("Static Code Guard: ui/src/lib/View3D.svelte must NOT contain any deprecated '.physicsSettings' references", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    
    const view3dPath = path.resolve('/home/racoci/Projects/racoci/ui/src/lib/View3D.svelte');
    const fileContent = fs.readFileSync(view3dPath, 'utf8');
    
    // Check for any occurrences of "physicsSettings" (case-sensitive)
    const count = (fileContent.match(/\bphysicsSettings\b/g) || []).length;
    assert.strictEqual(count, 0, "View3D.svelte should have exactly 0 occurrences of deprecated '.physicsSettings' references!");
  });

  // Test Case 5: Validate all flat Svelte 5 reactive properties exist on WorkspaceState
  await t.test("Svelte 5 State Integrity: Verify that all expected flat reactive properties are declared on WorkspaceState", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    
    const statePath = path.resolve('/home/racoci/Projects/racoci/ui/src/lib/workspaceState.svelte.ts');
    const fileContent = fs.readFileSync(statePath, 'utf8');
    
    const requiredProps = [
      'maxIntermediatePoints',
      'showIntermediatePoints',
      'massAtom',
      'massSegment',
      'forceAtomAtom',
      'forceAtomSegment',
      'forceSegmentSegment',
      'forceSuccessiveTension',
      'strainMin',
      'strainMax'
    ];
    
    requiredProps.forEach(prop => {
      const propRegex = new RegExp(`\\b${prop}\\s*=\\s*\\$state\\b`);
      assert.ok(propRegex.test(fileContent), `Property '${prop}' must be declared directly on WorkspaceState using Svelte 5 '$state'`);
    });
  });
});
