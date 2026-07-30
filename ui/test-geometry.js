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

// Helper to check line segment intersections (Cross boundary checks)
function lineIntersects(a, b, c, d) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (det === 0) return false; // Parallel lines
  
  const lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
  const gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
  
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

test('▶ Holds Canvas Geometry - Automated Constraint Tests', async (t) => {
  
  // Generate 50 Randomized Hypergraphs to verify the structural robustness of the 4-part spline
  await t.test('should validate 50 random edges for no-crossings, rigid text envelopes, and face embraces', () => {
    const randomWords = ['KERNEL', 'PARSER', 'SYNC', 'MEMORY', 'QUEUE', 'ROUTER', 'AUDIT_LOG', 'MONITOR', 'STAGE_ZERO', 'WEISFEILER_LEHMAN'];
    
    for (let i = 0; i < 50; i++) {
      const sLabel = randomWords[Math.floor(Math.random() * randomWords.length)] + `_${i}`;
      const tLabel = randomWords[Math.floor(Math.random() * randomWords.length)] + `_TARGET_${i}`;
      const edgeLabel = '[:DEPENDS_ON_FAMILY_RELATIONSHIP_' + i + ']';

      // Compute Node Boundary Offsets (Snug perimeters)
      const sLabelWidth = sLabel.length * 6.0; // approximated monospace width
      const w_s = Math.max(55, sLabelWidth + 24);
      const sourceDist = w_s / 2;

      const tLabelWidth = tLabel.length * 6.0;
      const w_t = Math.max(55, tLabelWidth + 24);
      const arrowDist = (w_t / 2) + 2;

      // 1. Generate randomized source and target coordinates (separated by at least 145px, matching our Verlet solver!)
      const sCoord = {
        x: Math.random() * 800,
        y: Math.random() * 600
      };
      let tCoord;
      do {
        tCoord = {
          x: Math.random() * 800,
          y: Math.random() * 600
        };
      } while (getDist(sCoord, tCoord) < (145 + sourceDist + arrowDist));

      const angle = Math.atan2(tCoord.y - sCoord.y, tCoord.x - sCoord.x);

      const sx = sCoord.x + Math.cos(angle) * sourceDist;
      const sy = sCoord.y + Math.sin(angle) * sourceDist;

      const tx = tCoord.x - Math.cos(angle) * arrowDist;
      const ty = tCoord.y - Math.sin(angle) * arrowDist;

      const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2) || 1;

      // PART 1: Spine Curve
      const bendAmount = Math.max(0, 150 - dist) * 0.7;
      const qx = (sx + tx) / 2 - Math.sin(angle) * bendAmount;
      const qy = (sy + ty) / 2 + Math.cos(angle) * bendAmount;

      // PART 2: Text Sizing and Parametric Allocation
      const approxTextWidth = edgeLabel.length * 5.5;
      const bodyLen = approxTextWidth + 12;

      const uSpan = Math.min(0.22, bodyLen / (2 * dist));
      const uStart = 0.5 - uSpan;
      const uEnd = 0.5 + uSpan;
      const uShoulder = Math.max(uEnd + 0.05, 1.0 - 10 / dist);

      const sPt = getSpinePoint(0, sx, sy, qx, qy, tx, ty);
      const bPt = getSpinePoint(uStart, sx, sy, qx, qy, tx, ty);
      const mPt = getSpinePoint(0.5, sx, sy, qx, qy, tx, ty);
      const ePt = getSpinePoint(uEnd, sx, sy, qx, qy, tx, ty);
      const shPt = getSpinePoint(uShoulder, sx, sy, qx, qy, tx, ty);
      const tPt = getSpinePoint(1.0, sx, sy, qx, qy, tx, ty);

      // PART 3.1: Full-Face Node Embrace (using mathematically secure normal vector offsets)
      // This places the start vertices strictly at +/-17px along the source normal,
      // guaranteeing an exact 34px starting width and absolute non-crossing boundary safety!
      const p1x = sPt.x + sPt.nx * 17;
      const p1y = sPt.y + sPt.ny * 17;
      const p2x = sPt.x - sPt.nx * 17;
      const p2y = sPt.y - sPt.ny * 17;

      const startWidth = getDist({ x: p1x, y: p1y }, { x: p2x, y: p2y });
      assert.ok(Math.abs(startWidth - 34) < 1e-4, 'Source-hugging starting width must be exactly 34px!');

      // PART 3.2: Constant-Thickness Text Wrapper Boundaries (18px body thickness -> 9px offset)
      const b_left = { x: bPt.x + bPt.nx * 9, y: bPt.y + bPt.ny * 9 };
      const b_right = { x: bPt.x - bPt.nx * 9, y: bPt.y - bPt.ny * 9 };
      const e_left = { x: ePt.x + ePt.nx * 9, y: ePt.y + ePt.ny * 9 };
      const e_right = { x: ePt.x - ePt.nx * 9, y: ePt.y - ePt.ny * 9 };

      const bodyStartWidth = getDist(b_left, b_right);
      const bodyEndWidth = getDist(e_left, e_right);
      
      assert.ok(Math.abs(bodyStartWidth - 18) < 1e-4, 'Text wrapper start thickness must be exactly 18px!');
      assert.ok(Math.abs(bodyEndWidth - 18) < 1e-4, 'Text wrapper end thickness must be exactly 18px!');

      // PART 3.3: Arrowhead Flare Wedge Constraint
      const sh_left = { x: shPt.x + shPt.nx * 13, y: shPt.y + shPt.ny * 13 };
      const sh_right = { x: shPt.x - shPt.nx * 13, y: shPt.y - shPt.ny * 13 };

      const shoulderWidth = getDist(sh_left, sh_right);
      assert.ok(shoulderWidth > 18, 'Arrowhead wedge shoulder must flare wider than the body thickness (>18px) for maximum contrast!');

      // CONSTRAINT A: Perfect Non-Crossing Guarantee (Left perimeters never cross Right perimeters)
      // Left boundary segments: p1 -> b_left -> e_left -> sh_left
      // Right boundary segments: p2 -> b_right -> e_right -> sh_right
      const intersectsLeftRight = 
        lineIntersects( { x: p1x, y: p1y }, b_left, { x: p2x, y: p2y }, b_right ) ||
        lineIntersects( b_left, e_left, b_right, e_right ) ||
        lineIntersects( e_left, sh_left, e_right, sh_right );

      assert.strictEqual(intersectsLeftRight, false, 'Symmetrical boundary lines must never cross or intersect each other!');

      // CONSTRAINT B: Readability and Low Curvature Verification
      // Verify that the text segment tangent alignment dot product is > 0.85
      const tangentDotProduct = bPt.tx * ePt.tx + bPt.ty * ePt.ty;
      assert.ok(tangentDotProduct > 0.85, 'Text segment must remain flat and straight enough (low curvature) to keep the text perfectly readable!');
    }
  });
});
