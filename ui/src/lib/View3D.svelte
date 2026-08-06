<!-- View3D.svelte (Svelte 5) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { workspaceState } from './workspaceState.svelte.js';

  let canvasElement = $state<HTMLCanvasElement | null>(null);
  let containerElement = $state<HTMLDivElement | null>(null);

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

    // Use unscaled e.offsetX and offsetY for 100% zoom and scroll-independent picking!
    const clickX = e.offsetX;
    const clickY = e.offsetY;

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
    } else if (draggedNodeId) {
      const node = nodes3D.get(draggedNodeId);
      if (node) {
        // Project 2D screen dragging delta (dx, dy) back into 3D relative to camera rotation angles!
        // We use the exact perspective projection scale formula to map screen pixels to 3D units 1:1!
        const factor = (300 + node.z) / 260;
        const shiftX = dx * factor;
        const shiftY = dy * factor;

        node.x += Math.cos(angleY) * shiftX;
        node.z -= Math.sin(angleY) * shiftX;
        node.y += Math.cos(angleX) * shiftY;
        node.z += Math.sin(angleX) * shiftY;

        // Reset velocity so it follows mouse exactly
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
    const clickX = e.offsetX;
    const clickY = e.offsetY;

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

    const scale = 260; // Perspective scaling factor
    const distance = 300; // Camera distance from origin

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

    // 2. Draw Edges
    if (workspaceState.parseResult) {
      ctx.save();
      workspaceState.parseResult.edges.forEach(edge => {
        const sourceProj = projMap.get(edge.source);
        const targetProj = projMap.get(edge.target);

        if (sourceProj && targetProj) {
          // Calculate edge average depth for depth fade
          const avgDepth = (sourceProj.rotZ + targetProj.rotZ) / 2;
          const alpha = Math.max(0.1, Math.min(1.0, 1 - (avgDepth + 150) / 300));

          ctx.beginPath();
          ctx.moveTo(sourceProj.projX, sourceProj.projY);
          ctx.lineTo(targetProj.projX, targetProj.projY);

          ctx.strokeStyle = edge.color || '#3b82f6';
          ctx.globalAlpha = alpha * 0.7;
          ctx.lineWidth = Math.max(0.5, 3 * (distance / (distance + avgDepth)));
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 3. Draw Nodes (spherical shading based on painter sorting)
    projectedNodes.forEach(pn => {
      const isHovered = pn.id === hoveredNodeId;
      const isDragged = pn.id === draggedNodeId;
      const alpha = Math.max(0.15, Math.min(1.0, 1 - (pn.rotZ + 150) / 300));
      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw a glowing halo aura if hovered or dragged
      if (isHovered || isDragged) {
        ctx.save();
        ctx.shadowColor = '#66fcf1';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#66fcf1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pn.projX, pn.projY, pn.projRadius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3D Spherical Shading with radial gradient
      const gradient = ctx.createRadialGradient(
        pn.projX - pn.projRadius * 0.3,
        pn.projY - pn.projRadius * 0.3,
        pn.projRadius * 0.1,
        pn.projX,
        pn.projY,
        pn.projRadius
      );

      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.2, pn.color);
      gradient.addColorStop(1, '#05070a');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pn.projX, pn.projY, pn.projRadius, 0, Math.PI * 2);
      ctx.fill();

      // Thin outer outline
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px "Fira Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pn.label, pn.projX, pn.projY + pn.projRadius + 10);
      ctx.restore();
    });

    // 4. Draw Membranes as rotating circular orbit rings/halos
    if (workspaceState.parseResult) {
      workspaceState.parseResult.membranes.forEach(mem => {
        // Find center of membrane in 3D by averaging coordinates
        let cx = 0, cy = 0, cz = 0;
        let count = 0;
        mem.nodeIds.forEach(id => {
          const n = nodes3D.get(id);
          if (n) {
            cx += n.x; cy += n.y; cz += n.z;
            count++;
          }
        });

        if (count > 0) {
          cx /= count; cy /= count; cz /= count;

          // Rotate center
          let x1 = cx * Math.cos(angleY) - cz * Math.sin(angleY);
          let z1 = cx * Math.sin(angleY) + cz * Math.cos(angleY);
          let y2 = cy * Math.cos(angleX) - z1 * Math.sin(angleX);
          let z2 = cy * Math.sin(angleX) + z1 * Math.cos(angleX);

          const depth = 1 / (distance + z2);
          const projCX = x1 * scale * depth + width / 2;
          const projCY = y2 * scale * depth + height / 2;
          const radius = 60 * scale * depth; // standard membrane size

          // Draw membrane orbit ring
          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(1.0, 1 - (z2 + 100) / 250)) * 0.25;
          ctx.strokeStyle = mem.color || '#a855f7';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          
          // Draw dashed rotating oval membrane
          ctx.beginPath();
          ctx.ellipse(projCX, projCY, radius * 1.3, radius * 0.7, angleY * 0.5, 0, Math.PI * 2);
          ctx.stroke();

          // Render central translucent halo
          ctx.fillStyle = mem.color || '#a855f7';
          ctx.globalAlpha *= 0.12;
          ctx.beginPath();
          ctx.ellipse(projCX, projCY, radius * 1.3, radius * 0.7, angleY * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // 5. Draw Debug Raycast Pointer Beam & Crosshair
    if (mouseCSSX !== null && mouseCSSY !== null) {
      ctx.save();
      // Draw concentric circular target crosshair at mouse pointer
      ctx.strokeStyle = '#ff007f'; // neon pink
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mouseCSSX, mouseCSSY, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mouseCSSX, mouseCSSY, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(mouseCSSX - 16, mouseCSSY); ctx.lineTo(mouseCSSX + 16, mouseCSSY);
      ctx.moveTo(mouseCSSX, mouseCSSY - 16); ctx.lineTo(mouseCSSX, mouseCSSY + 16);
      ctx.stroke();

      // Find closest projected node to mouse
      let closestNodeId: string | null = null;
      let closestDist = Infinity;
      let targetX = 0, targetY = 0;

      for (const [id, coord] of latestProjCoords.entries()) {
        const dx = mouseCSSX - coord.x;
        const dy = mouseCSSY - coord.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestNodeId = id;
          closestDist = dist;
          targetX = coord.x;
          targetY = coord.y;
        }
      }

      if (closestNodeId) {
        // Draw a dashed vector ray line from mouse to target node's projected center!
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(mouseCSSX, mouseCSSY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Print distance label
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`RAY TO [${closestNodeId}]: ${closestDist.toFixed(1)}px`, mouseCSSX + 20, mouseCSSY + 4);
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
    title="Drag mouse to rotate 3D topology"
  ></canvas>
  <div class="view3d-overlay">
    <span class="overlay-badge">Perspective 3D</span>
    <span class="overlay-text">Mouse Drag to Rotate</span>
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
</style>
