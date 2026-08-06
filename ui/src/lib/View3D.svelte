<!-- View3D.svelte (Svelte 5) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { workspaceState } from './workspaceState.svelte.js';
  import { applyContrastProtection, hexToRgb, rgbToHsl, hslToRgb, rgbToHex } from './ColorMath.js';

  let canvasElement = $state<HTMLCanvasElement | null>(null);
  let containerElement = $state<HTMLDivElement | null>(null);

  // Math Helper: Get Gradient Shades
  function getGradientShades(baseColor: string, bgL: number): { start: string; end: string } {
    const rgb = hexToRgb(baseColor);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    if (bgL >= 0.5) {
      const startRgb = hslToRgb(hsl.h, Math.min(hsl.s, 0.55), 0.95);
      const endRgb = hslToRgb(hsl.h, Math.min(hsl.s, 0.55), 0.88);
      return {
        start: rgbToHex(startRgb.r, startRgb.g, startRgb.b),
        end: rgbToHex(endRgb.r, endRgb.g, endRgb.b)
      };
    } else {
      const startRgb = hslToRgb(hsl.h, Math.min(hsl.s, 0.65), 0.32); // vibrant emissive top
      const endRgb = hslToRgb(hsl.h, Math.min(hsl.s, 0.65), 0.08);  // deep colorful bottom
      return {
        start: rgbToHex(startRgb.r, startRgb.g, startRgb.b),
        end: rgbToHex(endRgb.r, endRgb.g, endRgb.b)
      };
    }
  }

  // Math Helper: Andrew's Monotone Chain Convex Hull Algorithm for 3D Membrane Shapes
  interface Point { x: number; y: number }

  function getConvexHull(points: Point[]): Point[] {
    if (points.length <= 3) return points;
    const sorted = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);

    const lower: Point[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function crossProduct(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  // 3D coordinate state for parsed nodes
  interface Node3D {
    id: string;
    label: string;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    color: string;
    radius: number;
    isRemoved: boolean;
  }

  let nodes3D = $state<Map<string, Node3D>>(new Map());
  let angleX = $state(0.5); // Initial rotation around X axis
  let angleY = $state(0.5); // Initial rotation around Y axis

  let isDragging = $state(false);
  let isDraggingCamera = $state(false);
  let draggedNodeId = $state<string | null>(null);
  let hoveredNodeId = $state<string | null>(null);
  let mouseCSSX = $state<number | null>(null);
  let mouseCSSY = $state<number | null>(null);
  let scale = $state(260); // Perspective scaling factor / zoom
  let distance = $state(300); // Camera distance from origin
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Holds latest projected coordinates mapping for mouse picking/raycasting
  const latestProjCoords = new Map<string, { x: number; y: number; r: number }>();

  // Sync 3D nodes when parseResult changes
  $effect(() => {
    if (workspaceState.parseResult) {
      const nextMap = new Map<string, Node3D>();
      workspaceState.parseResult.nodes.forEach(pn => {
        const existing = nodes3D.get(pn.id);
        if (existing) {
          nextMap.set(pn.id, {
            ...existing,
            label: pn.label,
            color: pn.color || '#ffffff'
          });
        } else {
          // Spawn in a sphere around center
          const angle = Math.random() * Math.PI * 2;
          const u = Math.random() * 2 - 1;
          const r = 80 + Math.random() * 80;
          
          nextMap.set(pn.id, {
            id: pn.id,
            label: pn.label,
            x: r * Math.sqrt(1 - u * u) * Math.cos(angle),
            y: r * Math.sqrt(1 - u * u) * Math.sin(angle),
            z: r * u,
            vx: 0,
            vy: 0,
            vz: 0,
            color: pn.color || '#ffffff',
            radius: 12,
            isRemoved: false
          });
        }
      });

      // Keep removed ones animating
      for (const [id, vn] of nodes3D.entries()) {
        if (vn.isRemoved && vn.radius > 1) {
          nextMap.set(id, vn);
        }
      }

      nodes3D = nextMap;
    }
  });

  // Mouse interaction for rotation & 3D node dragging
  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    if (!canvasElement) return;

    // Use highly precise proportional coordinate mapping (neutralizes browser zoom, borders, and flexbox stretches)
    const rect = canvasElement.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvasElement.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvasElement.height;

    // Pick 3D node closest to screen click coordinate
    let clickedNodeId: string | null = null;
    let closestDist = Infinity;

    console.log("3D PICKING START:", { clickX, clickY, numNodes: latestProjCoords.size });

    for (const [id, coord] of latestProjCoords.entries()) {
      const dx = clickX - coord.x;
      const dy = clickY - coord.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      console.log(`Checking Node [${id}]: dist=${dist.toFixed(1)}px, activeThreshold=${(coord.r + 25).toFixed(1)}px, pos=(${coord.x.toFixed(1)}, ${coord.y.toFixed(1)})`);

      if (dist < coord.r + 25 && dist < closestDist) {
        clickedNodeId = id;
        closestDist = dist;
      }
    }

    if (clickedNodeId) {
      console.log("3D NODE MATCHED AND DRAGGED:", clickedNodeId);
      draggedNodeId = clickedNodeId;
      isDragging = true;
      isDraggingCamera = false;
      canvasElement.style.cursor = 'grabbing';
    } else {
      console.log("3D CLICKS MISSED - ORBITING CAMERA...");
      draggedNodeId = null;
      isDragging = true;
      isDraggingCamera = true;
      canvasElement.style.cursor = 'grabbing';
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;

    if (isDraggingCamera) {
      angleY += dx * 0.007; // adjust rotation sensitivity
      angleX += dy * 0.007;
    } else if (draggedNodeId && canvasElement) {
      const node = nodes3D.get(draggedNodeId);
      if (node) {
        // Calculate exact proportional mouse coordinates inside the canvas
        const rect = canvasElement.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * canvasElement.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * canvasElement.height;

        // 1. Get the current rotated Z coordinate (z2) of the node to maintain dragging depth
        const x1_old = node.x * Math.cos(angleY) - node.z * Math.sin(angleY);
        const z1_old = node.x * Math.sin(angleY) + node.z * Math.cos(angleY);
        const z2 = node.y * Math.sin(angleX) + z1_old * Math.cos(angleX);

        // 2. Solve the perspective projection equations for the desired rotated x1 and y2
        const depth = 1 / (distance + z2);

        const x1 = (clickX - canvasElement.width / 2) / (scale * depth);
        const y2 = (clickY - canvasElement.height / 2) / (scale * depth);

        // 3. Apply the exact mathematical inverse rotations to retrieve unscaled 3D coordinates!
        // Un-rotate around X axis (Y-Z plane) by angleX
        const y_new = y2 * Math.cos(angleX) + z2 * Math.sin(angleX);
        const z1 = -y2 * Math.sin(angleX) + z2 * Math.cos(angleX);

        // Un-rotate around Y axis (X-Z plane) by angleY
        const x_new = x1 * Math.cos(angleY) + z1 * Math.sin(angleY);
        const z_new = -x1 * Math.sin(angleY) + z1 * Math.cos(angleY);

        node.x = x_new;
        node.y = y_new;
        node.z = z_new;

        // Reset velocity so it stays perfectly static when mouse stops
        node.vx = 0;
        node.vy = 0;
        node.vz = 0;
      }
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }

  function handleMouseUp() {
    isDragging = false;
    isDraggingCamera = false;
    draggedNodeId = null;
    if (canvasElement) {
      canvasElement.style.cursor = hoveredNodeId ? 'pointer' : 'grab';
    }
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // Hover detection and cursor updates when NOT dragging
  function handleCanvasMouseMove(e: MouseEvent) {
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvasElement.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvasElement.height;

    // Track mouse CSS positions for debug raycasting
    mouseCSSX = clickX;
    mouseCSSY = clickY;

    if (isDragging) return;

    let matchedId: string | null = null;
    let closestDist = Infinity;

    for (const [id, coord] of latestProjCoords.entries()) {
      const dx = clickX - coord.x;
      const dy = clickY - coord.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < coord.r + 25 && dist < closestDist) {
        matchedId = id;
        closestDist = dist;
      }
    }

    hoveredNodeId = matchedId;

    if (canvasElement) {
      if (matchedId) {
        canvasElement.style.cursor = 'pointer';
      } else {
        canvasElement.style.cursor = 'grab';
      }
    }
  }

  // Mouse leave reset
  function handleCanvasMouseLeave() {
    hoveredNodeId = null;
    mouseCSSX = null;
    mouseCSSY = null;
    if (canvasElement) {
      canvasElement.style.cursor = 'default';
    }
  }

  // Linear focal zoom handler via mouse wheel scrolling!
  function handleWheel(e: WheelEvent) {
    e.preventDefault(); // prevent scrolling the parent HTML page
    if (e.deltaY < 0) {
      // Zoom-in: increase lens focal scale length
      scale = Math.min(1000, scale + 25);
    } else {
      // Zoom-out: decrease lens focal scale length
      scale = Math.max(100, scale - 25);
    }
  }

  onMount(() => {
    if (!canvasElement || !containerElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (canvasElement && containerElement) {
        const w = containerElement.clientWidth;
        const h = containerElement.clientHeight;
        
        // Enforce 1:1 CSS pixel resolution to completely eliminate any high-DPI scaling offsets!
        canvasElement.width = w;
        canvasElement.height = h;
        canvasElement.style.width = `${w}px`;
        canvasElement.style.height = `${h}px`;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(containerElement);

    // Register native non-passive scroll wheel listener for absolute zoom reliability!
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    // 3D physics update and Painter's render loop
    const loop = () => {
      update3DPhysics();
      render3D(ctx);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (canvasElement) {
        canvasElement.removeEventListener('wheel', handleWheel);
      }
      resizeObserver.disconnect();
    };
  });

  function update3DPhysics() {
    const nodes = Array.from(nodes3D.values());
    const kRepulsion = 1500;
    const kGravity = 0.02;
    const kSpring = 0.02;
    const kDamping = 0.85;

    // 1. Repulsion between nodes
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dz = n2.z - n1.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

        if (dist < 200) {
          const force = kRepulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          if (n1.id !== draggedNodeId) {
            n1.vx -= fx;
            n1.vy -= fy;
            n1.vz -= fz;
          }
          if (n2.id !== draggedNodeId) {
            n2.vx += fx;
            n2.vy += fy;
            n2.vz += fz;
          }
        }
      }
    }

    // 2. Edge Spring forces
    if (workspaceState.parseResult) {
      workspaceState.parseResult.edges.forEach(edge => {
        const n1 = nodes3D.get(edge.source);
        const n2 = nodes3D.get(edge.target);

        if (n1 && n2) {
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dz = n2.z - n1.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

          // Target rest distance = 100
          const force = (dist - 100) * kSpring;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          if (n1.id !== draggedNodeId) {
            n1.vx += fx;
            n1.vy += fy;
            n1.vz += fz;
          }
          if (n2.id !== draggedNodeId) {
            n2.vx -= fx;
            n2.vy -= fy;
            n2.vz -= fz;
          }
        }
      });

      // 2.5 3D Edge-to-Node Repulsion Force
      workspaceState.parseResult.edges.forEach(edge => {
        const n1 = nodes3D.get(edge.source);
        const n2 = nodes3D.get(edge.target);

        if (n1 && n2) {
          const abx = n2.x - n1.x;
          const aby = n2.y - n1.y;
          const abz = n2.z - n1.z;
          const segmentLenSq = abx * abx + aby * aby + abz * abz;
          if (segmentLenSq === 0) return;

          nodes.forEach(node => {
            if (node.id === edge.source || node.id === edge.target) return;

            // Find projection of node N onto segment AB in 3D
            const anx = node.x - n1.x;
            const any = node.y - n1.y;
            const anz = node.z - n1.z;
            const t = Math.max(0, Math.min(1, (anx * abx + any * aby + anz * abz) / segmentLenSq));

            // Closest point P on 3D segment
            const px = n1.x + t * abx;
            const py = n1.y + t * aby;
            const pz = n1.z + t * abz;

            const dx = node.x - px;
            const dy = node.y - py;
            const dz = node.z - pz;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

            const threshold = 70; // 3D distance margin
            if (dist < threshold) {
              const force = 800 / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              const fz = (dz / dist) * force;

              if (node.id !== draggedNodeId) {
                node.vx += fx;
                node.vy += fy;
                node.vz += fz;
              }

              // Symmetrically push the edge endpoints away from the node!
              if (n1.id !== draggedNodeId) {
                n1.vx -= fx * (1 - t) * 0.5;
                n1.vy -= fy * (1 - t) * 0.5;
                n1.vz -= fz * (1 - t) * 0.5;
              }

              if (n2.id !== draggedNodeId) {
                n2.vx -= fx * t * 0.5;
                n2.vy -= fy * t * 0.5;
                n2.vz -= fz * t * 0.5;
              }
            }
          });
        }
      });

      // 2.7 Coplanar Membrane Force (makes hyper-edges / membranes settle onto flat parallel planes)
      workspaceState.parseResult.membranes.forEach(mem => {
        // Find centroid of the membrane
        let cz = 0;
        let count = 0;
        const memNodes: Node3D[] = [];
        mem.nodeIds.forEach(id => {
          const n = nodes3D.get(id);
          if (n) {
            cz += n.z;
            memNodes.push(n);
            count++;
          }
        });

        if (count > 0) {
          cz /= count;
          // Apply a gentle force pulling nodes to have the same Z coordinate (flattening onto their centroid plane)
          memNodes.forEach(n => {
            if (n.id !== draggedNodeId) {
              n.vz += (cz - n.z) * 0.05; // gentle coplanar flattening pull
            }
          });
        }
      });
    }

    // 3. Central gravity and integration
    nodes.forEach(n => {
      if (n.id !== draggedNodeId) {
        // Gravity pulls to center (0,0,0)
        n.vx -= n.x * kGravity;
        n.vy -= n.y * kGravity;
        n.vz -= n.z * kGravity;

        // Integrate
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;

        // Dampen velocity
        n.vx *= kDamping;
        n.vy *= kDamping;
        n.vz *= kDamping;
      }
    });
  }

  function render3D(ctx: CanvasRenderingContext2D) {
    if (!canvasElement) return;

    const width = canvasElement.width;
    const height = canvasElement.height;

    // Clear coordinates mapping for mouse picking
    latestProjCoords.clear();

    // Clear background
    ctx.fillStyle = workspaceState.currentBgColor;
    ctx.fillRect(0, 0, width, height);

    // Render cybernetic background starfield grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(102, 252, 241, 0.025)';
    ctx.lineWidth = 0.5;
    const gridSize = 80;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Rotate and project nodes
    interface ProjectedNode {
      id: string;
      label: string;
      projX: number;
      projY: number;
      projRadius: number;
      rotZ: number; // depth
      color: string;
      origNode: Node3D;
    }

    const projectedNodes: ProjectedNode[] = [];

    nodes3D.forEach(node => {
      // 3D rotations based on drag angles
      // Rotate around Y axis
      let x1 = node.x * Math.cos(angleY) - node.z * Math.sin(angleY);
      let z1 = node.x * Math.sin(angleY) + node.z * Math.cos(angleY);

      // Rotate around X axis
      let y2 = node.y * Math.cos(angleX) - z1 * Math.sin(angleX);
      let z2 = node.y * Math.sin(angleX) + z1 * Math.cos(angleX);

      // Perspective divide
      const depth = 1 / (distance + z2);
      const projX = x1 * scale * depth + width / 2;
      const projY = y2 * scale * depth + height / 2;
      const projRadius = node.radius * scale * depth;

      projectedNodes.push({
        id: node.id,
        label: node.label,
        projX,
        projY,
        projRadius,
        rotZ: z2, // keep depth for sorting
        color: node.color,
        origNode: node
      });

      // Record projected coordinates for mouse-click picking
      latestProjCoords.set(node.id, { x: projX, y: projY, r: projRadius });
    });

    // Sort by depth (Painter's Algorithm: further z is drawn first)
    projectedNodes.sort((a, b) => b.rotZ - a.rotZ);

    const projMap = new Map<string, ProjectedNode>();
    projectedNodes.forEach(pn => projMap.set(pn.id, pn));

    // 1. Draw 3D coordinate indicator in bottom left corner
    ctx.save();
    const axisLen = 30;
    const axX = 40, axY = height - 40;
    // Project small axes
    const rotateAxes = (x: number, y: number, z: number) => {
      let x1 = x * Math.cos(angleY) - z * Math.sin(angleY);
      let z1 = x * Math.sin(angleY) + z * Math.cos(angleY);
      let y2 = y * Math.cos(angleX) - z1 * Math.sin(angleX);
      return { rx: x1, ry: y2 };
    };
    const xAx = rotateAxes(axisLen, 0, 0);
    const yAx = rotateAxes(0, axisLen, 0);
    const zAx = rotateAxes(0, 0, axisLen);

    // X axis (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX + xAx.rx, axY + xAx.ry); ctx.stroke();
    // Y axis (Green)
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX + yAx.rx, axY + yAx.ry); ctx.stroke();
    // Z axis (Blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX + zAx.rx, axY + zAx.ry); ctx.stroke();
    ctx.restore();

    // 2. Draw Edges (3D Perspective Bezier Curves with Direction-Sensitive Ellipse Clipping)
    if (workspaceState.parseResult) {
      ctx.save();
      workspaceState.parseResult.edges.forEach(edge => {
        const sourceProj = projMap.get(edge.source);
        const targetProj = projMap.get(edge.target);

        if (sourceProj && targetProj) {
          // Calculate edge average depth for depth fade
          const avgDepth = (sourceProj.rotZ + targetProj.rotZ) / 2;
          const alpha = Math.max(0.1, Math.min(1.0, 1 - (avgDepth + 150) / 300));

          // Calculate dynamic bounds of source node scaled with depth
          const depthScaleS = distance / (distance + sourceProj.rotZ);
          ctx.font = 'bold 9px monospace';
          const textWidthS = ctx.measureText(sourceProj.label).width;
          const wS = Math.max(50, textWidthS + 16) * depthScaleS;
          const hS = 22 * depthScaleS;

          // Calculate dynamic bounds of target node scaled with depth
          const depthScaleT = distance / (distance + targetProj.rotZ);
          const textWidthT = ctx.measureText(targetProj.label).width;
          const wT = Math.max(50, textWidthT + 16) * depthScaleT;
          const hT = 22 * depthScaleT;

          // Center-to-center vector on the screen
          const dx_cc = targetProj.projX - sourceProj.projX;
          const dy_cc = targetProj.projY - sourceProj.projY;
          const dist_cc = Math.sqrt(dx_cc * dx_cc + dy_cc * dy_cc) || 1;
          const angle = Math.atan2(dy_cc, dx_cc);

          // Calculate direction-sensitive ellipse intersection distances!
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          const rwS = wS / 2;
          const rhS = hS / 2;
          const clipDistS = 1 / Math.sqrt((cosA / rwS) ** 2 + (sinA / rhS) ** 2) + 2; // +2px buffer

          const rwT = wT / 2;
          const rhT = hT / 2;
          // Add extra buffer of 7px on target to perfectly clear the wedge arrowhead!
          const clipDistT = 1 / Math.sqrt((cosA / rwT) ** 2 + (sinA / rhT) ** 2) + 7;

          // Clip edge endpoints precisely at the node boundaries!
          const sx = sourceProj.projX + cosA * clipDistS;
          const sy = sourceProj.projY + sinA * clipDistS;
          const tx = targetProj.projX - cosA * clipDistT;
          const ty = targetProj.projY - sinA * clipDistT;

          const dx = tx - sx;
          const dy = ty - sy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Quadratic Bezier control point for 3D curved line
          const bendAmount = Math.max(0, 120 - dist) * 0.4;
          const qx = (sx + tx) / 2 - Math.sin(angle) * bendAmount;
          const qy = (sy + ty) / 2 + Math.cos(angle) * bendAmount;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          if (bendAmount > 0) {
            ctx.quadraticCurveTo(qx, qy, tx, ty);
          } else {
            ctx.lineTo(tx, ty);
          }

          ctx.strokeStyle = edge.color || '#3b82f6';
          ctx.globalAlpha = alpha * 0.65;
          ctx.lineWidth = Math.max(1.0, 2.5 * (distance / (distance + avgDepth)));
          ctx.stroke();

          // Draw wedge arrowhead precisely at the clipped target tip
          ctx.save();
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = edge.color || '#3b82f6';
          
          // Arrowhead trigonometry
          const arrowSize = 8 * (distance / (distance + avgDepth));
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-arrowSize * 1.5, -arrowSize * 0.5);
          ctx.lineTo(-arrowSize * 1.5, arrowSize * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
      ctx.restore();
    }

    // 3. Draw Nodes (Rounded Rectangular Billboards with Emissive Glow)
    projectedNodes.forEach(pn => {
      const isHovered = pn.id === hoveredNodeId;
      const isDragged = pn.id === draggedNodeId;
      const alpha = Math.max(0.15, Math.min(1.0, 1 - (pn.rotZ + 150) / 300));
      
      ctx.save();
      ctx.globalAlpha = alpha;

      const baseColor = pn.color || '#ffffff';
      const borderCol = applyContrastProtection(workspaceState.currentBgColor, baseColor);
      
      // Calculate background gradient shades for 3D boxes
      const shades = getGradientShades(baseColor, 0.1); // assume dark background
      const bgGradStart = shades.start;
      const bgGradEnd = shades.end;

      // Calculate dynamic rounded-square bounds scaled with depth!
      const depthScale = distance / (distance + pn.rotZ);
      
      ctx.font = 'bold 9px monospace';
      const textWidth = ctx.measureText(pn.label).width;
      
      const w = Math.max(50, textWidth + 16) * depthScale;
      const h = 22 * depthScale;

      // Draw shadow glow matching the node's color!
      ctx.shadowColor = borderCol;
      ctx.shadowBlur = (isHovered || isDragged) ? 22 : 10;

      // Draw background rounded rect
      const grad = ctx.createLinearGradient(pn.projX, pn.projY - h / 2, pn.projX, pn.projY + h / 2);
      grad.addColorStop(0, bgGradStart);
      grad.addColorStop(1, bgGradEnd);
      ctx.fillStyle = grad;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = isHovered ? 2.0 : 1.0;

      ctx.beginPath();
      // Custom rounded rect implementation inside render3D
      const rx = pn.projX - w / 2;
      const ry = pn.projY - h / 2;
      const radius = Math.min(6, w / 4);
      
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + w - radius, ry);
      ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + radius);
      ctx.lineTo(rx + w, ry + h - radius);
      ctx.quadraticCurveTo(rx + w, ry + h, rx + w - radius, ry + h);
      ctx.lineTo(rx + radius, ry + h);
      ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();

      // Reset shadows before drawing text to keep text extremely sharp!
      ctx.shadowBlur = 0;

      // Draw text nicely inside the box
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.max(7, Math.round(9 * depthScale))}px monospace`;
      ctx.fillText(pn.label, pn.projX, pn.projY);

      ctx.restore();
    });

    // 4. Draw Membranes as Thick Rounded 3D Polygons (Convex Hull)
    if (workspaceState.parseResult) {
      workspaceState.parseResult.membranes.forEach(mem => {
        // Find projected coordinates of all active nodes in this membrane
        const activeProjNodes = mem.nodeIds
          .map(id => projMap.get(id))
          .filter((pn): pn is ProjectedNode => !!pn);

        if (activeProjNodes.length === 0) return;

        // Collect node centers
        const points = activeProjNodes.map(pn => ({ x: pn.projX, y: pn.projY }));

        // Add padding boundaries around each node to make the hull smooth and generous!
        let boundaryPoints: Point[] = [];
        activeProjNodes.forEach(pn => {
          const padding = 12 * (distance / (distance + pn.rotZ));
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            boundaryPoints.push({
              x: pn.projX + Math.cos(angle) * padding,
              y: pn.projY + Math.sin(angle) * padding,
            });
          }
        });

        const hull = getConvexHull(boundaryPoints);
        if (hull.length < 3) return;

        // Calculate average depth for depth-fade
        let sumZ = 0;
        activeProjNodes.forEach(pn => sumZ += pn.rotZ);
        const avgZ = sumZ / activeProjNodes.length;
        const alpha = Math.max(0.1, Math.min(1.0, 1 - (avgZ + 150) / 250));

        // Get membrane custom/assigned color (defaulting to white)
        const baseMembColor = mem.color || '#ffffff';
        const finalMembColor = applyContrastProtection(workspaceState.currentBgColor, baseMembColor);
        const rgb = hexToRgb(finalMembColor);

        ctx.save();
        ctx.globalAlpha = alpha * 0.45;

        // Draw Thick Extruded 3D Depth Layer (Offset shadow)
        ctx.strokeStyle = `rgba(${Math.round(rgb.r * 0.4)}, ${Math.round(rgb.g * 0.4)}, ${Math.round(rgb.b * 0.4)}, 0.4)`;
        ctx.lineWidth = 14 * (distance / (distance + avgZ));
        ctx.lineJoin = 'round';
        ctx.beginPath();
        // Shift offset slightly downward to simulate extrusion depth
        const offsetShift = 4 * (distance / (distance + avgZ));
        ctx.moveTo(hull[0].x, hull[0].y + offsetShift);
        for (let k = 1; k < hull.length; k++) {
          ctx.lineTo(hull[k].x, hull[k].y + offsetShift);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw Main Top Layer with thick rounded contour
        ctx.strokeStyle = finalMembColor;
        ctx.lineWidth = 10 * (distance / (distance + avgZ));
        ctx.lineJoin = 'round';
        ctx.shadowColor = finalMembColor;
        ctx.shadowBlur = 15;

        const gradColorStart = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`;
        const gradColorEnd = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02)`;

        // Calculate centroid of the hull for radial gradient
        let hSumX = 0, hSumY = 0;
        hull.forEach(p => { hSumX += p.x; hSumY += p.y; });
        const hcx = hSumX / hull.length;
        const hcy = hSumY / hull.length;

        let hMaxDist = 1;
        hull.forEach(p => {
          const d = Math.sqrt((p.x - hcx) * (p.x - hcx) + (p.y - hcy) * (p.y - hcy));
          if (d > hMaxDist) hMaxDist = d;
        });

        const grad = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, hMaxDist);
        grad.addColorStop(0, gradColorStart);
        grad.addColorStop(1, gradColorEnd);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let k = 1; k < hull.length; k++) {
          ctx.lineTo(hull[k].x, hull[k].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      });
    }

    // 5. Draw Debug Raycast Pointer Beam (uncluttered semi-reta / segment)
    if (mouseCSSX !== null && mouseCSSY !== null) {
      ctx.save();

      const Mx = mouseCSSX - width / 2;
      const My = mouseCSSY - height / 2;
      const D_lenSq = Mx * Mx + My * My + scale * scale;

      // Find first node sphere intersection in 3D
      let intersectedNodeId: string | null = null;
      let firstIntersectionT = Infinity;

      nodes3D.forEach(node => {
        if (node.isRemoved) return;

        // Get rotated coordinates
        const x1 = node.x * Math.cos(angleY) - node.z * Math.sin(angleY);
        const z1 = node.x * Math.sin(angleY) + node.z * Math.cos(angleY);
        const y2 = node.y * Math.cos(angleX) - z1 * Math.sin(angleX);
        const z2 = node.y * Math.sin(angleX) + z1 * Math.cos(angleX);

        // Ray-Sphere intersection calculation relative to camera at (0, 0, -300)
        const Wx = x1;
        const Wy = y2;
        const Wz = z2 + 300; 

        const t_closest = (Wx * Mx + Wy * My + Wz * scale) / D_lenSq;

        if (t_closest > 0) {
          const px = t_closest * Mx;
          const py = t_closest * My;
          const pz = -300 + t_closest * scale;

          const dx = px - x1;
          const dy = py - y2;
          const dz = pz - z2;
          const distSq = dx * dx + dy * dy + dz * dz;

          // Sphere radius is node.radius (12px unscaled), with generous margin
          const radiusSq = 18 * 18; 
          if (distSq < radiusSq) {
            if (t_closest < firstIntersectionT) {
              firstIntersectionT = t_closest;
              intersectedNodeId = node.id;
            }
          }
        }
      });

      if (intersectedNodeId) {
        const pNode = projMap.get(intersectedNodeId);
        if (pNode) {
          // Draw a solid, clean neon-pink segment from the cursor directly to the target node
          ctx.strokeStyle = '#ff007f'; 
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mouseCSSX, mouseCSSY);
          ctx.lineTo(pNode.projX, pNode.projY);
          ctx.stroke();

          // Green ring to indicate hit
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pNode.projX, pNode.projY, pNode.projRadius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="view3d-container" bind:this={containerElement}>
  <canvas 
    bind:this={canvasElement} 
    onmousedown={handleMouseDown}
    onmousemove={handleCanvasMouseMove}
    onmouseleave={handleCanvasMouseLeave}
    onwheel={handleWheel}
    title="Drag mouse to rotate 3D topology"
  ></canvas>
  
  <!-- Floating Cybernetic Zoom Buttons in the Viewport -->
  <div class="zoom-controls">
    <button class="zoom-btn" onclick={() => scale = Math.min(1000, scale + 25)} title="Zoom In">
      ＋
    </button>
    <button class="zoom-btn" onclick={() => scale = Math.max(100, scale - 25)} title="Zoom Out">
      －
    </button>
  </div>

  <div class="view3d-overlay">
    <span class="overlay-badge">Perspective 3D</span>
    {#if workspaceState.parseResult}
      <span class="overlay-text text-yellow">NODES: {nodes3D.size}</span>
      <span class="overlay-text text-cyan">EDGES: {workspaceState.parseResult.edges.length}</span>
      <span class="overlay-text text-purple">MEMBRANES: {workspaceState.parseResult.membranes.length}</span>
    {/if}
    <span class="overlay-text">Drag mouse to rotate</span>
  </div>
</div>

<style>
  .view3d-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background-color: #08080c;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  .view3d-overlay {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    pointer-events: none;
    font-family: inherit;
  }

  .overlay-badge {
    background-color: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.4);
    color: #c084fc;
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .overlay-text {
    font-size: 8px;
    color: #45a29e;
  }

  .overlay-text.text-yellow { color: #facc15; font-weight: bold; }
  .overlay-text.text-cyan { color: #66fcf1; font-weight: bold; }
  .overlay-text.text-purple { color: #c084fc; font-weight: bold; }

  /* Cybernetic Floating Zoom Controls */
  .zoom-controls {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10;
  }

  .zoom-btn {
    width: 28px;
    height: 28px;
    background-color: rgba(20, 22, 32, 0.85);
    border: 1px solid rgba(168, 85, 247, 0.4);
    border-radius: 4px;
    color: #c084fc;
    font-size: 14px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    box-shadow: 0 0 6px rgba(168, 85, 247, 0.2);
    user-select: none;
  }

  .zoom-btn:hover {
    background-color: rgba(168, 85, 247, 0.15);
    border-color: #a855f7;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
  }

  .zoom-btn:active {
    transform: scale(0.95);
  }
</style>
