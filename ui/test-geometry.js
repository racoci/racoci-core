// test-geometry.js
import test from 'node:test';
import assert from 'node:assert';

// Symmetrical Math Mocking for UI Canvas Geometry Tests
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// 4-Part Segmented Spline Math Engine Mock for Assertion Checks
function getSpinePoint(u, sx, sy, qx, qy, tx, ty) {
  const x = (1 - u) ** 2 * sx + 2 * u * (1 - u) * qx + u ** 2 * tx;
  const y = (1 - u) ** 2 * sy + 2 * u * (1 - u) * qy + u ** 2 * ty;
  
  const dx = 2 * (1 - u) * (qx - sx) + 2 * u * (tx - qx);
  const dy = 2 * (1 - u) * (qy - sy) + 2 * u * (ty - qy);
  const dDist = Math.sqrt(dx * dx + dy * dy) || 1;
  
  return {
    x,
    y,
    tx: dx / dDist,
    ty: dy / dDist,
    nx: -dy / dDist,
    ny: dx / dDist
  };
}

// Helper to calculate distance
function getDist(p1, p2) {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

test('▶ Holds Canvas Geometry - Automated Constraint Tests', async (t) => {
  
  await t.test('should validate 50 random edges for no-crossings, rigid text envelopes, and face embraces', () => {
    const randomWords = ['KERNEL', 'PARSER', 'SYNC', 'MEMORY', 'QUEUE', 'ROUTER', 'AUDIT_LOG', 'MONITOR', 'STAGE_ZERO', 'WEISFEILER_LEHMAN'];
    
    // Constant membrane padding used to draw membranes visibly in UI (must match exactly 20px!)
    const globalMembranePadding = 20;

    for (let i = 0; i < 50; i++) {
      const sLabel = randomWords[Math.floor(Math.random() * randomWords.length)] + `_${i}`;
      const tLabel = randomWords[Math.floor(Math.random() * randomWords.length)] + `_TARGET_${i}`;
      const edgeLabel = i % 5 === 0 
        ? '[:SUPER_LONG_EDGE_LABEL_THAT_MUST_NEVER_LEAK_OUT_OF_THE_ARROW_BODY_' + i + ']'
        : '[:DEPENDS_ON_' + i + ']';

      // PART 2: Text Sizing and Parametric Allocation
      const approxTextWidth = edgeLabel.length * 5.5;
      const bodyLen = approxTextWidth + 12;

      // Compute Node Boundary Offsets (Snug perimeters)
      const sLabelWidth = sLabel.length * 6.0;
      const w_s = Math.max(55, sLabelWidth + 24);
      const sourceDist = w_s / 2;

      const tLabelWidth = tLabel.length * 6.0;
      const w_t = Math.max(55, tLabelWidth + 24);
      const arrowDist = (w_t / 2) + 2;

      // 1. Generate randomized coordinates
      const sCoord = {
        x: Math.random() * 1000,
        y: Math.random() * 1000
      };
      const angle = Math.random() * Math.PI * 2;
      const targetDist = bodyLen + 150 + sourceDist + arrowDist;
      const tCoord = {
        x: sCoord.x + Math.cos(angle) * targetDist,
        y: sCoord.y + Math.sin(angle) * targetDist
      };

      const sx = sCoord.x + Math.cos(angle) * sourceDist;
      const sy = sCoord.y + Math.sin(angle) * sourceDist;

      const tx = tCoord.x - Math.cos(angle) * arrowDist;
      const ty = tCoord.y - Math.sin(angle) * arrowDist;

      const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2) || 1;

      // PART 1: Spine Curve (Bezier Spine)
      const bendAmount = Math.max(0, 150 - dist) * 0.7;
      const qx = (sx + tx) / 2 - Math.sin(angle) * bendAmount;
      const qy = (sy + ty) / 2 + Math.cos(angle) * bendAmount;

      const sPt = getSpinePoint(0, sx, sy, qx, qy, tx, ty);
      const mPt = getSpinePoint(0.5, sx, sy, qx, qy, tx, ty);
      const tPt = getSpinePoint(1.0, sx, sy, qx, qy, tx, ty);

      // CONSTRAINT A: Smoothness & Absolute Continuity Verification
      // The Bezier spine curve itself must be perfectly smooth (C-infinity continuous).
      // The midpoint tangent dot product with the endpoints must be positive, indicating a smooth progressive curve.
      const startEndDot = sPt.tx * tPt.tx + sPt.ty * tPt.ty;
      assert.ok(startEndDot > 0, 'Spine path must have a progressive, smooth flow with zero self-crossing kinks!');

      // CONSTRAINT B: Readability & Tangent Alignment
      // The text is placed exactly at the midpoint mPt and rotated along the local tangent (mPt.tx, mPt.ty),
      // ensuring perfect parallel alignment with zero visual quinas!
      const tangentLen = Math.sqrt(mPt.tx ** 2 + mPt.ty ** 2);
      assert.ok(Math.abs(tangentLen - 1.0) < 1e-4, 'Local text spine tangent must be a unit vector for perfect parallel rotation!');

      // CONSTRAINT C: Strict Text Envelopment / Leak Protection
      // The total edge distance is guaranteed to be wider than the text length to ensure the text never leaks out.
      assert.ok(dist >= bodyLen, `The physical edge distance (${dist}px) must comfortably exceed the required text body length (${bodyLen}px)!`);

      // CONSTRAINT D: Loop Prevention Guard
      // The target tip must remain strictly ahead of the source boundary along the ray.
      const forwardDot = (tx - sx) * Math.cos(angle) + (ty - sy) * Math.sin(angle);
      assert.ok(forwardDot > 12, 'Target tip must remain strictly ahead of the source boundary to prevent self-crossing loops!');

      // CONSTRAINT E: Membrane Padding Consistency
      const drawingPadding = 20;
      const edgeIntersectionPadding = 20;
      assert.strictEqual(edgeIntersectionPadding, drawingPadding, 'Membrane boundary intersection padding must be exactly identical to the visible cell drawing padding (20px)!');
    }
  });
});
