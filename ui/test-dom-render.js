// test-dom-render.js
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
  fill() {}
  stroke() {}
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
  }
  getContext() {
    return new MockCanvasContext();
  }
  addEventListener() {}
  removeEventListener() {}
}

const defaultCode = `// Holds Kernel Topology Rules
// MATCH the stage-0 kernel and its dependency structure
MATCH {
  (kernel {role: "kernel", zone: "stage-0"}) -[:DEPENDS_ON]-> (parser),
  (parser {role: "parser"}) -[:DEPENDS_ON]-> (sync),
  (sync) -[:SYNCS_WITH]-> (memory #ec4899)
}

// Group core components inside a safety membrane with new syntax
[KERNEL_SAFETY_ZONE #a855f7](kernel, parser, sync)

// Active system processes (Multi-Dimensional directed edges!)
(task_queue) -[:ROUTES_TO]-> (kernel)
(task_queue) -[:BUFFERED_BY]-> (memory)

// Directed edge from an external atom to a membrane!
(monitor) -[:MONITORS]-> (KERNEL_SAFETY_ZONE)

// Directed edge pointing directly to a relationship (edge-to-edge)!
(audit_log) -[:LOGS]-> (ROUTES_TO)
`;

test('▶ Holds Canvas Render Loop - Headless Integration Tests', async (t) => {
  await t.test('should instantiate CanvasRenderer and run the render loop without throwing exceptions', () => {
    const mockCanvas = new MockCanvas();
    const parsed = parseHCypher(defaultCode);

    // Disable requestAnimationFrame inside startLoop by mocking it globally or inside class
    const originalRAF = globalThis.requestAnimationFrame;
    globalSetRAF();

    try {
      console.log("INSTANTIATING CANVAS RENDERER...");
      const renderer = new CanvasRenderer(mockCanvas, () => {});
      
      console.log("INJECTING PARSED TOPOLOGY...");
      renderer.updateTopology(parsed.nodes, parsed.edges, parsed.membranes);
      
      console.log("RUNNING PHYSICS AND RENDER LOOP...");
      // Explicitly trigger physics and drawing manually to intercept crashes
      renderer.updatePhysics();
      renderer.render();
      
      console.log("HEADLESS RENDER COMPLETED PERFECTLY WITH 0 ERRORS!");
      renderer.destroy();
      assert.ok(true);
    } catch (e) {
      console.error("HEADLESS RENDER LOOP CRASHED:", e);
      assert.fail(e);
    } finally {
      restoreRAF(originalRAF);
    }
  });
});

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

function restoreRAF(original) {
  globalThis.requestAnimationFrame = original;
}
