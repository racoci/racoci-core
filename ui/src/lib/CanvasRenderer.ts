import type { NodeData, EdgeData, MembraneData } from './HCypherParser.js';
import { applyContrastProtection, getClosestAllowedColor, getRelativeLuminance, hexToRgb } from './ColorMath.js';

interface VisualNode {
  id: string;
  label: string;
  type: 'atom' | 'residue';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  alpha: number;
  isNew: boolean;
  isRemoved: boolean;
  slideProgress: number; // for transition animations
  targetX?: number;
  targetY?: number;
  properties?: Record<string, string>;
}

interface VisualEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  alpha: number;
  isNew: boolean;
  isRemoved: boolean;
  pulseOffset: number; // for flow animation
  color?: string;
}

interface VisualMembrane {
  id: string;
  label: string;
  nodeIds: string[];
  alpha: number;
  isNew: boolean;
  isRemoved: boolean;
  spin?: number;
  color?: string;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;

  // Active elements
  private nodes: Map<string, VisualNode> = new Map();
  private edges: VisualEdge[] = [];
  private membranes: VisualMembrane[] = [];

  // Dragging state
  private draggedNodeId: string | null = null;
  private selectedNodeId: string | null = null;
  private selectedEdgeId: string | null = null;

  // Visual/Grid parameters
  private gridOffset = { x: 0, y: 0 };
  private zoom = 1.0;
  private frameCount = 0;
  private executionIllumination = false;
  private illuminatedPath: string[] = []; // node IDs
  private backgroundColor = '#0b0f19'; // Default background color

  // Callbacks
  private onSelectNode: (node: VisualNode | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onSelectNode: (node: VisualNode | null) => void
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.onSelectNode = onSelectNode;

    this.setupListeners();
    this.startLoop();
  }

  // Update canvas size
  public resize(width: number, height: number) {
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  public setBackgroundColor(color: string) {
    this.backgroundColor = color;
  }

  public getBackgroundColor(): string {
    return this.backgroundColor;
  }

  /**
   * Set the active path illumination for proof tracing (animating flow)
   */
  public illuminatePath(nodeIds: string[]) {
    this.executionIllumination = nodeIds.length > 0;
    this.illuminatedPath = nodeIds;
  }

  /**
   * Trigger a topological diff transition simulation
   */
  public triggerDemoTransition() {
    // We add some simulated additions and removals
    for (const [id, node] of this.nodes.entries()) {
      if (Math.random() > 0.6) {
        node.isRemoved = true;
        node.slideProgress = 0;
        node.targetX = this.canvas.width / window.devicePixelRatio - 120;
        node.targetY = this.canvas.height / window.devicePixelRatio - 120;
      }
    }
    this.edges.forEach(e => {
      if (Math.random() > 0.6) {
        e.isRemoved = true;
      }
    });

    // Illuminate a path
    const nodeKeys = Array.from(this.nodes.keys());
    if (nodeKeys.length >= 2) {
      this.illuminatePath(nodeKeys.slice(0, 3));
    }
  }

  /**
   * Synchronize the core parser results with the visual simulation
   */
  public updateTopology(
    parsedNodes: NodeData[],
    parsedEdges: EdgeData[],
    parsedMembranes: MembraneData[]
  ) {
    const nextNodesMap = new Map<string, VisualNode>();
    const currentWidth = this.canvas.width / window.devicePixelRatio || 600;
    const currentHeight = this.canvas.height / window.devicePixelRatio || 500;

    // 1. Synchronize Nodes
    parsedNodes.forEach(pn => {
      const existing = this.nodes.get(pn.id);

      if (existing) {
        // Keep existing positions, but update info
        nextNodesMap.set(pn.id, {
          ...existing,
          label: pn.label,
          properties: pn.properties,
          color: pn.color ? getClosestAllowedColor(pn.color) : existing.color,
          isNew: pn.isNew || false,
        });
      } else {
        // Create new node with nice starting coordinate
        const x = 100 + Math.random() * (currentWidth - 300);
        const y = 100 + Math.random() * (currentHeight - 200);
        
        nextNodesMap.set(pn.id, {
          id: pn.id,
          label: pn.label,
          type: pn.type || 'atom',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 24,
          color: pn.color ? getClosestAllowedColor(pn.color) : '#ffffff', // Default to white
          glowColor: 'rgba(255, 255, 255, 0.6)',
          alpha: 1.0,
          isNew: true, // will trigger fade-in glow
          isRemoved: false,
          slideProgress: 0,
          properties: pn.properties,
        });
      }
    });

    // Keep any nodes that are currently animating transition to "removed"
    for (const [id, vn] of this.nodes.entries()) {
      if (vn.isRemoved && vn.alpha > 0.05) {
        // If it was removed, keep it in the rendering list to animate its glide
        nextNodesMap.set(id, vn);
      }
    }

    this.nodes = nextNodesMap;

    // 2. Synchronize Edges
    this.edges = parsedEdges.map(pe => {
      const existing = this.edges.find(e => e.source === pe.source && e.target === pe.target);
      return {
        id: pe.id,
        source: pe.source,
        target: pe.target,
        label: pe.label,
        alpha: 1.0,
        isNew: pe.isNew || false,
        isRemoved: pe.isRemoved || false,
        pulseOffset: existing ? existing.pulseOffset : Math.random(),
        color: pe.color ? getClosestAllowedColor(pe.color) : '#ffffff', // Default to white
      };
    });

    // 3. Synchronize Membranes
    this.membranes = parsedMembranes.map(pm => {
      return {
        id: pm.id,
        label: pm.label,
        nodeIds: pm.nodeIds,
        alpha: 1.0,
        isNew: pm.isNew || false,
        isRemoved: pm.isRemoved || false,
        color: pm.color ? getClosestAllowedColor(pm.color) : '#ffffff', // Default to white
      };
    });
  }

  /**
   * Main Physics & Render Loop
   */
  private startLoop() {
    const loop = () => {
      this.frameCount++;
      this.updatePhysics();
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Basic Force-Directed Physics Simulation
   */
  private updatePhysics() {
    const nodesArr = Array.from(this.nodes.values());
    const kRepulsion = 1400; // force of node separation
    const kGravity = 0.015;  // gentle pull toward center
    const kDamping = 0.65;   // higher friction (lower value dampens speed faster)
    const kSpring = 0.015;   // gentle spring force

    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Node-to-Node Repulsion
    for (let i = 0; i < nodesArr.length; i++) {
      const n1 = nodesArr[i];
      if (n1.isRemoved) continue; // removed nodes glide to residue, ignore normal physics

      for (let j = i + 1; j < nodesArr.length; j++) {
        const n2 = nodesArr[j];
        if (n2.isRemoved) continue;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 350) {
          const force = kRepulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1.id !== this.draggedNodeId) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2.id !== this.draggedNodeId) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }
    }

    // 2. Multi-Dimensional Edge Attractions (Springs for Nodes, Membranes, and Edges!)
    this.edges.forEach(edge => {
      const sCoord = this.resolveCoordinate(edge.source);
      const tCoord = this.resolveCoordinate(edge.target);

      if (sCoord && tCoord) {
        const dx = tCoord.x - sCoord.x;
        const dy = tCoord.y - sCoord.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Calculate exact node widths and label width for the spring resting length
        this.ctx.font = 'bold 9px monospace';
        const labelWidth = this.ctx.measureText(edge.label).width;

        let sourceRadius = 12;
        const sNode = this.nodes.get(edge.source);
        if (sNode) {
          this.ctx.font = 'bold 10px monospace';
          sourceRadius = Math.max(55, this.ctx.measureText(sNode.label).width + 24) / 2;
        }

        let targetRadius = 12;
        const tNode = this.nodes.get(edge.target);
        if (tNode) {
          this.ctx.font = 'bold 10px monospace';
          targetRadius = Math.max(55, this.ctx.measureText(tNode.label).width + 24) / 2;
        }

        // Enforce exact resting length: text width + 140px buffer + radii
        const springLen = labelWidth + 140 + sourceRadius + targetRadius;
        const force = (dist - springLen) * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // Propagate spring forces recursively to active nodes
        const applyForceToEntity = (id: string, forceX: number, forceY: number) => {
          const node = this.nodes.get(id);
          if (node) {
            if (id !== this.draggedNodeId) {
              node.vx += forceX;
              node.vy += forceY;
            }
            return;
          }

          const memb = this.membranes.find(m => m.id === id || m.label === id);
          if (memb) {
            const activeNodes = memb.nodeIds
              .map(nodeId => this.nodes.get(nodeId))
              .filter((n): n is VisualNode => !!n && !n.isRemoved);
            if (activeNodes.length > 0) {
              // Distribute force evenly among membrane's nodes
              activeNodes.forEach(n => {
                if (n.id !== this.draggedNodeId) {
                  n.vx += forceX / activeNodes.length;
                  n.vy += forceY / activeNodes.length;
                }
              });
            }
            return;
          }

          const edgeVal = this.edges.find(e => e.id === id || e.label === id);
          if (edgeVal) {
            // Distribute force evenly between edge's endpoints
            applyForceToEntity(edgeVal.source, forceX * 0.5, forceY * 0.5);
            applyForceToEntity(edgeVal.target, forceX * 0.5, forceY * 0.5);
          }
        };

        applyForceToEntity(edge.source, fx, fy);
        applyForceToEntity(edge.target, -fx, -fy);
      }
    });

    // 2.5 Membrane Exclusion Force for External Atoms
    // Finds any active atoms that are not inside a given membrane, and applies
    // a smooth outward repulsive push if they drift too close to the membrane centroid.
    this.membranes.forEach(m => {
      const activeMembraneNodes = m.nodeIds
        .map(id => this.nodes.get(id))
        .filter((n): n is VisualNode => !!n && !n.isRemoved);

      if (activeMembraneNodes.length === 0) return;

      // Find centroid of the membrane
      let sumX = 0, sumY = 0;
      activeMembraneNodes.forEach(n => {
        sumX += n.x;
        sumY += n.y;
      });
      const cx = sumX / activeMembraneNodes.length;
      const cy = sumY / activeMembraneNodes.length;

      // Find maximum distance from centroid to any node inside this membrane
      let maxDist = 50;
      activeMembraneNodes.forEach(n => {
        const d = Math.sqrt((n.x - cx) * (n.x - cx) + (n.y - cy) * (n.y - cy));
        if (d > maxDist) maxDist = d;
      });
      const exclusionRadius = maxDist + 50; // boundary + padding margin

      // Push any node NOT inside this membrane outside the boundary
      nodesArr.forEach(node => {
        if (node.isRemoved) return;
        if (!m.nodeIds.includes(node.id)) {
          const dx = node.x - cx;
          const dy = node.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < exclusionRadius) {
            const force = (exclusionRadius - dist) * 0.15; // smooth outward push
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (node.id !== this.draggedNodeId) {
              node.vx += fx;
              node.vy += fy;
            }
          }
        }
      });
    });

    // 3. Center Gravity & Apply Velocities
    nodesArr.forEach(node => {
      if (node.isRemoved) {
        // Glide into sys::residue section (bottom-right)
        const targetX = node.targetX || (width - 120);
        const targetY = node.targetY || (height - 120);

        const dx = targetX - node.x;
        const dy = targetY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
          node.x += dx * 0.08;
          node.y += dy * 0.08;
          node.radius = Math.max(10, node.radius * 0.96);
        } else {
          // Fade out completely
          node.alpha -= 0.02;
          if (node.alpha < 0) node.alpha = 0;
        }
        return;
      }

      // Center gravity
      if (node.id !== this.draggedNodeId) {
        const gx = (centerX - node.x) * kGravity;
        const gy = (centerY - node.y) * kGravity;
        node.vx += gx;
        node.vy += gy;

        // Apply velocity with damping
        node.vx *= kDamping;
        node.vy *= kDamping;
        node.x += node.vx;
        node.y += node.vy;

        // Bounds clamping
        node.x = Math.max(node.radius + 20, Math.min(width - node.radius - 20, node.x));
        node.y = Math.max(node.radius + 20, Math.min(height - node.radius - 20, node.y));
      }
    });

    // 4. Strict Geometric Collision prevention (Verlet-style position projection)
    // Ensures a minimum separation distance of 140px between any two active nodes,
    // completely eliminating text, node circle, and edge-overlap collisions.
    const safetyDistance = 145;
    for (let i = 0; i < nodesArr.length; i++) {
      const n1 = nodesArr[i];
      if (n1.isRemoved) continue;

      for (let j = i + 1; j < nodesArr.length; j++) {
        const n2 = nodesArr[j];
        if (n2.isRemoved) continue;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < safetyDistance) {
          const overlap = safetyDistance - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;

          if (n1.id !== this.draggedNodeId) {
            n1.x -= pushX;
            n1.y -= pushY;
          }
          if (n2.id !== this.draggedNodeId) {
            n2.x += pushX;
            n2.y += pushY;
          }
        }
      }
    }
  }

  /**
   * Render Canvas
   */
  private render() {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;

    this.ctx.clearRect(0, 0, width, height);

    // Draw background color
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Save context for transform/zoom
    this.ctx.save();

    // 1. Draw Space Coordinate Grid (Topological Aesthetic)
    this.drawGrid(width, height);

    // 2. Draw sys::residue Membrane Container (bottom right ghost region)
    this.drawResidueMembrane(width, height);

    // 3. Draw Membranes
    this.drawMembranes();

    // 4. Draw Edges
    this.drawEdges();

    // 5. Draw Nodes
    this.drawNodes();

    // 6. Draw Proof Path Illumination overlays
    if (this.executionIllumination) {
      this.drawExecutionPathIllumination();
    }

    this.ctx.restore();
  }

  /**
   * Draw the scrolling futuristic spatial coordinate grid
   */
  private drawGrid(width: number, height: number) {
    const bgRgb = hexToRgb(this.backgroundColor);
    const bgL = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

    const gridLineColor = bgL >= 0.5 ? 'rgba(0, 0, 0, 0.08)' : '#1e202c';
    const axisLineColor = bgL >= 0.5 ? 'rgba(0, 0, 0, 0.16)' : '#2d3142';
    const tickTextColor = bgL >= 0.5 ? 'rgba(0, 0, 0, 0.45)' : '#4f566b';

    this.ctx.strokeStyle = gridLineColor;
    this.ctx.lineWidth = 1.0;

    const gridSize = 40;
    const scrollSpeed = 0.15;
    
    // Animate grid coordinates floating slightly
    const offsetX = (this.frameCount * scrollSpeed) % gridSize;
    const offsetY = (this.frameCount * scrollSpeed * 0.5) % gridSize;

    this.ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
    }
    this.ctx.stroke();

    // Add subtle matrix-like crosshairs or center lines
    this.ctx.strokeStyle = axisLineColor;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(width / 2, 0);
    this.ctx.lineTo(width / 2, height);
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Draw little tick indices on center lines
    this.ctx.fillStyle = tickTextColor;
    this.ctx.font = '9px monospace';
    for (let x = 0; x < width; x += 120) {
      this.ctx.fillText(`${x}λ`, x + 5, height / 2 - 5);
    }
    for (let y = 0; y < height; y += 120) {
      this.ctx.fillText(`${y}η`, width / 2 + 5, y - 5);
    }
  }

  /**
   * Draw the dedicated sys::residue membrane container
   */
  private drawResidueMembrane(width: number, height: number) {
    const rx = width - 180;
    const ry = height - 180;
    const rSize = 160;

    const bgL = getRelativeLuminance(hexToRgb(this.backgroundColor).r, hexToRgb(this.backgroundColor).g, hexToRgb(this.backgroundColor).b);
    const borderCol = bgL >= 0.5 ? 'rgba(220, 38, 38, 0.75)' : 'rgba(239, 68, 68, 0.45)';
    const fillCol = bgL >= 0.5 ? 'rgba(220, 38, 38, 0.03)' : 'rgba(239, 68, 68, 0.05)';
    const textCol = bgL >= 0.5 ? 'rgba(220, 38, 38, 0.9)' : 'rgba(239, 68, 68, 0.8)';

    // Outer glow membrane
    this.ctx.strokeStyle = borderCol; // Translucent Neon Red
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = fillCol;

    this.ctx.save();
    this.ctx.shadowColor = borderCol;
    this.ctx.shadowBlur = 10;
    
    // Draw rounded rectangle
    this.ctx.beginPath();
    this.roundRect(rx, ry, rSize, rSize, 12);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.setLineDash([]); // Reset line dash

    // Labels
    this.ctx.fillStyle = textCol;
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillText('sys::residue', rx + 12, ry + 22);
    this.ctx.font = '9px monospace';
    this.ctx.fillStyle = bgL >= 0.5 ? 'rgba(220, 38, 38, 0.6)' : 'rgba(239, 68, 68, 0.5)';
    this.ctx.fillText('TOPOLOGICAL GHOST CHANNELS', rx + 12, ry + 36);
  }

  /**
   * Draw structural membranes (containers) around node groupings
   */
  private drawMembranes() {
    this.membranes.forEach(m => {
      // Find coordinates of all active non-removed nodes in this membrane
      const activeNodes = m.nodeIds
        .map(id => this.nodes.get(id))
        .filter((n): n is VisualNode => !!n && !n.isRemoved);

      if (activeNodes.length === 0) return;

      // Generate a set of 8 circular boundary points around each node
      // to create a smooth, rounded padding boundary around the nodes.
      let boundaryPoints: { x: number; y: number }[] = [];
      const padding = 20; // perimeter distance from nodes
      activeNodes.forEach(n => {
        const r = n.radius + padding;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          boundaryPoints.push({
            x: n.x + Math.cos(angle) * r,
            y: n.y + Math.sin(angle) * r,
          });
        }
      });

      // Compute the tightest enclosing Convex Hull of the boundary points
      const hull = this.getConvexHull(boundaryPoints);
      if (hull.length < 3) return;

      // Calculate centroid (center of mass) of active nodes for the radial gradient center
      let sumX = 0, sumY = 0;
      activeNodes.forEach(n => {
        sumX += n.x;
        sumY += n.y;
      });
      const cx = sumX / activeNodes.length;
      const cy = sumY / activeNodes.length;

      // Find maximum distance from centroid to any hull point to size the gradient radius
      let maxDist = 1;
      hull.forEach(p => {
        const d = Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
        if (d > maxDist) maxDist = d;
      });

      // Get membrane custom/assigned color (defaulting to white)
      const baseMembColor = m.color || '#ffffff';
      const finalMembColor = applyContrastProtection(this.backgroundColor, baseMembColor);
      const rgb = hexToRgb(finalMembColor);

      // Create rich organic radial gradient dynamically!
      const gradColorStart = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`;
      const gradColorMid = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
      const strokeColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.75)`;
      const shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`;

      // Create the organic radial gradient: dense at centroid, radially fading close to the nodes/borders
      const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);
      grad.addColorStop(0, gradColorStart);
      grad.addColorStop(0.5, gradColorMid);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.01)`); // fades to transparent at perimeters

      this.ctx.save();
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = strokeColor;
      this.ctx.fillStyle = grad;
      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = 15;

      // Draw the closed polygon path
      this.ctx.beginPath();
      this.ctx.moveTo(hull[0].x, hull[0].y);
      for (let k = 1; k < hull.length; k++) {
        this.ctx.lineTo(hull[k].x, hull[k].y);
      }
      this.ctx.closePath();
      
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      // Title tag positioning (slightly above the highest point of the hull)
      let topY = Infinity;
      let topX = 0;
      hull.forEach(p => {
        if (p.y < topY) {
          topY = p.y;
          topX = p.x;
        }
      });

      this.ctx.fillStyle = finalMembColor;
      this.ctx.font = 'bold 9px monospace';
      this.ctx.fillText(`MEMBRANE [ ${m.label} ]`, topX - 45, topY - 12);
    });
  }

  /**
   * Draw hyperedges and standard relationships with multi-dimensional routing support.
   */
  private drawEdges() {
    this.edges.forEach(edge => {
      const sCoord = this.resolveCoordinate(edge.source);
      const tCoord = this.resolveCoordinate(edge.target);

      if (!sCoord || !tCoord) return;

      // Animate edge alpha (defended against NaN/undefined leaks)
      const srcAlpha = this.getEntityAlpha(edge.source);
      const tgtAlpha = this.getEntityAlpha(edge.target);
      const alphaVal = Math.min(srcAlpha, tgtAlpha);
      const alpha = isNaN(alphaVal) ? 1.0 : alphaVal;
      if (alpha <= 0.05) return;

      const isRemovedEdge = edge.isRemoved || this.isEntityRemoved(edge.source) || this.isEntityRemoved(edge.target);

      // Get edge custom/assigned color (defaulting to white)
      const baseEdgeColor = edge.color || '#ffffff';
      const finalEdgeColor = applyContrastProtection(this.backgroundColor, baseEdgeColor);
      const bgL = getRelativeLuminance(hexToRgb(this.backgroundColor).r, hexToRgb(this.backgroundColor).g, hexToRgb(this.backgroundColor).b);

      const angle = Math.atan2(tCoord.y - sCoord.y, tCoord.x - sCoord.x);

      // 1. Determine Source Boundary Offset (sourceDist) so edge wraps/hugs the origin snugly
      let sourceDist = 0;
      const sNode = this.nodes.get(edge.source);

      if (sNode) {
        this.ctx.font = 'bold 10px monospace';
        const sLabelWidth = this.ctx.measureText(sNode.label).width;
        const w_s = Math.max(55, sLabelWidth + 24);
        sourceDist = (w_s / 2); // wrap right at border
      } else {
        const sEdge = this.edges.find(e => e.id === edge.source || e.label === edge.source);
        if (sEdge) {
          sourceDist = 12;
        } else {
          const sMemb = this.membranes.find(m => m.id === edge.source || m.label === edge.source);
          if (sMemb) {
            // Find intersection with source membrane's convex hull
            const activeNodes = sMemb.nodeIds
              .map(id => this.nodes.get(id))
              .filter((n): n is VisualNode => !!n && !n.isRemoved);

            if (activeNodes.length > 0) {
              const boundaryPoints: { x: number; y: number }[] = [];
              const padding = 20; // perimeter distance from nodes (tight, sleek 20px padding!)
              activeNodes.forEach(n => {
                const r = n.radius + padding;
                for (let angleVal = 0; angleVal < Math.PI * 2; angleVal += Math.PI / 4) {
                  boundaryPoints.push({
                    x: n.x + Math.cos(angleVal) * r,
                    y: n.y + Math.sin(angleVal) * r,
                  });
                }
              });
              const hull = this.getConvexHull(boundaryPoints);
              if (hull.length >= 3) {
                let closestIntersect: { x: number; y: number } | null = null;
                let minDist = Infinity;
                for (let i = 0; i < hull.length; i++) {
                  const p2 = hull[i];
                  const p3 = hull[(i + 1) % hull.length];
                  const ip = this.getLineIntersection(
                    tCoord.x, tCoord.y, sCoord.x, sCoord.y, // from target center to source center
                    p2.x, p2.y, p3.x, p3.y
                  );
                  if (ip) {
                    const distVal = Math.sqrt((ip.x - sCoord.x) ** 2 + (ip.y - sCoord.y) ** 2);
                    if (distVal < minDist) {
                      minDist = distVal;
                      closestIntersect = ip;
                    }
                  }
                }
                if (closestIntersect) {
                  sourceDist = Math.sqrt((closestIntersect.x - sCoord.x) ** 2 + (closestIntersect.y - sCoord.y) ** 2);
                } else {
                  sourceDist = 30;
                }
              } else {
                sourceDist = 30;
              }
            }
          }
        }
      }

      // 2. Determine Target Boundary Offset (arrowDist)
      let arrowDist = 0;
      const targetId = edge.target;
      const tNode = this.nodes.get(targetId);

      if (tNode) {
        this.ctx.font = 'bold 10px monospace';
        const tLabelWidth = this.ctx.measureText(tNode.label).width;
        const w_t = Math.max(55, tLabelWidth + 24);
        arrowDist = (w_t / 2) + 2;
      } else {
        const targetEdge = this.edges.find(e => e.id === targetId || e.label === targetId);
        if (targetEdge) {
          arrowDist = 12;
        } else {
          const targetMemb = this.membranes.find(m => m.id === targetId || m.label === targetId);
          if (targetMemb) {
            // If target is a membrane: stop at the edge of its convex hull
            const activeNodes = targetMemb.nodeIds
              .map(id => this.nodes.get(id))
              .filter((n): n is VisualNode => !!n && !n.isRemoved);

            if (activeNodes.length > 0) {
              const boundaryPoints: { x: number; y: number }[] = [];
              const padding = 20; // perimeter distance from nodes (tight, sleek 20px padding!)
              activeNodes.forEach(n => {
                const r = n.radius + padding;
                for (let angleVal = 0; angleVal < Math.PI * 2; angleVal += Math.PI / 4) {
                  boundaryPoints.push({
                    x: n.x + Math.cos(angleVal) * r,
                    y: n.y + Math.sin(angleVal) * r,
                  });
                }
              });
              const hull = this.getConvexHull(boundaryPoints);
              if (hull.length >= 3) {
                let closestIntersect: { x: number; y: number } | null = null;
                let minDist = Infinity;
                for (let i = 0; i < hull.length; i++) {
                  const p2 = hull[i];
                  const p3 = hull[(i + 1) % hull.length];
                  const ip = this.getLineIntersection(
                    sCoord.x, sCoord.y, tCoord.x, tCoord.y,
                    p2.x, p2.y, p3.x, p3.y
                  );
                  if (ip) {
                    const distVal = Math.sqrt((ip.x - sCoord.x) ** 2 + (ip.y - sCoord.y) ** 2);
                    if (distVal < minDist) {
                      minDist = distVal;
                      closestIntersect = ip;
                    }
                  }
                }
                if (closestIntersect) {
                  arrowDist = Math.sqrt((closestIntersect.x - tCoord.x) ** 2 + (closestIntersect.y - tCoord.y) ** 2) + 2;
                } else {
                  arrowDist = 30; // default fallback
                }
              } else {
                arrowDist = 30;
              }
            } else {
              arrowDist = 0;
            }
          }
        }
      }

      // Exact boundaries
      const sx = sCoord.x + Math.cos(angle) * sourceDist;
      const sy = sCoord.y + Math.sin(angle) * sourceDist;

      const tx = tCoord.x - Math.cos(angle) * arrowDist;
      const ty = tCoord.y - Math.sin(angle) * arrowDist;

      // CRITICAL DEFENSIVE GUARD: If the target tip ends up behind or too close to the source boundary
      // (e.g. on compressed lines or inside membranes), bypass drawing this edge on this frame
      // to prevent self-crossing loops, reversing, or NaN coordinates that crash the canvas.
      const dot = (tx - sx) * Math.cos(angle) + (ty - sy) * Math.sin(angle);
      if (isNaN(dot) || dot <= 12) return;

      const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2) || 1;

      // PART 1: The Backbone Curve (Bezier Spine)
      // Controls the bend amount when forced close to prevent overlaps or tip reversing.
      const bendAmount = Math.max(0, 150 - dist) * 0.7;
      const qx = (sx + tx) / 2 - Math.sin(angle) * bendAmount;
      const qy = (sy + ty) / 2 + Math.cos(angle) * bendAmount;

      // Helper to retrieve coordinate, tangent, and normal vectors along the Bezier spine
      const getSpinePoint = (u: number) => {
        // Clamp parametric value strictly to [0, 1]
        const clampedU = Math.max(0, Math.min(1, u));
        const x = (1 - clampedU) ** 2 * sx + 2 * clampedU * (1 - clampedU) * qx + clampedU ** 2 * tx;
        const y = (1 - clampedU) ** 2 * sy + 2 * clampedU * (1 - clampedU) * qy + clampedU ** 2 * ty;
        
        const dx = 2 * (1 - clampedU) * (qx - sx) + 2 * clampedU * (tx - qx);
        const dy = 2 * (1 - clampedU) * (qy - sy) + 2 * clampedU * (ty - qy);
        const dDist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        return {
          x,
          y,
          tx: dx / dDist,
          ty: dy / dDist,
          nx: -dy / dDist,
          ny: dx / dDist
        };
      };

      const sPt = getSpinePoint(0);
      const mPt = getSpinePoint(0.5);
      const tPt = getSpinePoint(1.0);

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      // Prepare stroke color
      let strokeColor = finalEdgeColor;
      if (isRemovedEdge) {
        strokeColor = applyContrastProtection(this.backgroundColor, '#ef4444');
      } else if (edge.isNew) {
        strokeColor = applyContrastProtection(this.backgroundColor, '#22c55e');
      }

      // 1. Draw the high-contrast sleek Bezier spine line
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      if (bendAmount > 0) {
        this.ctx.quadraticCurveTo(qx, qy, tx, ty);
      } else {
        this.ctx.lineTo(tx, ty);
      }
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = isRemovedEdge ? 1.25 : 1.75;
      if (isRemovedEdge) {
        this.ctx.setLineDash([4, 4]);
      } else {
        this.ctx.setLineDash([]);
      }
      this.ctx.stroke();

      // 2. Draw the elegant, sharp filled wedge arrowhead at the tip
      const base_x = tx - tPt.tx * 11;
      const base_y = ty - tPt.ty * 11;
      const corner_left_x = base_x + tPt.nx * 5.0;
      const corner_left_y = base_y + tPt.ny * 5.0;
      const corner_right_x = base_x - tPt.nx * 5.0;
      const corner_right_y = base_y - tPt.ny * 5.0;

      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty);
      this.ctx.lineTo(corner_left_x, corner_left_y);
      this.ctx.lineTo(corner_right_x, corner_right_y);
      this.ctx.closePath();
      this.ctx.fillStyle = strokeColor;
      this.ctx.fill();

      this.ctx.restore();

      // 3. Draw dynamic glowing flow pulse particles moving along the exact center line
      if (!isRemovedEdge) {
        edge.pulseOffset = (edge.pulseOffset + 0.006) % 1.0;
        const u = edge.pulseOffset;
        const pPt = getSpinePoint(u);

        const pulseColor = strokeColor === '#ffffff' ? '#00f6ff' : strokeColor;
        this.ctx.fillStyle = pulseColor;
        this.ctx.save();
        this.ctx.shadowColor = pulseColor;
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(pPt.x, pPt.y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // 4. Draw the Text Name centered inside a clean background mask capsule
      let textAngle = Math.atan2(mPt.ty, mPt.tx);
      if (textAngle < -Math.PI) textAngle += Math.PI * 2;
      if (textAngle > Math.PI) textAngle -= Math.PI * 2;
      if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
        textAngle += Math.PI;
      }

      this.ctx.save();
      this.ctx.translate(mPt.x, mPt.y);
      this.ctx.rotate(textAngle);

      this.ctx.font = 'bold 9px monospace';
      const labelWidth = this.ctx.measureText(edge.label).width;

      // Draw background mask capsule matching the workspace background color
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.beginPath();
      this.roundRect(-(labelWidth + 12) / 2, -7.5, labelWidth + 12, 15, 4);
      this.ctx.fill();

      // Draw text nicely in front of the mask
      this.ctx.fillStyle = isRemovedEdge ? applyContrastProtection(this.backgroundColor, '#ef4444') : (bgL >= 0.5 ? '#334155' : '#cbd5e1');
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(edge.label, 0, 0);

      this.ctx.restore();
    });
  }
  private drawNodes() {
    this.nodes.forEach(node => {
      if (node.alpha <= 0.05) return;

      this.ctx.save();
      this.ctx.globalAlpha = node.alpha;

      const baseColor = node.color || '#ffffff';
      const borderCol = applyContrastProtection(this.backgroundColor, baseColor);
      const bgL = getRelativeLuminance(hexToRgb(this.backgroundColor).r, hexToRgb(this.backgroundColor).g, hexToRgb(this.backgroundColor).b);

      // Base Node Color mapping based on states
      let bgGradStart = '#0f172a'; // Deep slate
      let bgGradEnd = '#1e293b';

      if (node.isRemoved) {
        const finalRemovedColor = applyContrastProtection(this.backgroundColor, '#ef4444');
        bgGradStart = bgL >= 0.5 ? '#fee2e2' : '#1a0505';
        bgGradEnd = bgL >= 0.5 ? '#fca5a5' : '#2e0a0a';
        this.ctx.strokeStyle = finalRemovedColor;
        this.ctx.shadowColor = finalRemovedColor;
      } else {
        if (node.id === this.selectedNodeId) {
          const activeColor = borderCol === '#ffffff' ? '#e0f2fe' : borderCol;
          bgGradStart = bgL >= 0.5 ? '#e0f2fe' : '#1e3a8a';
          bgGradEnd = bgL >= 0.5 ? '#bae6fd' : '#1e40af';
          this.ctx.strokeStyle = activeColor;
          this.ctx.shadowColor = activeColor;
        } else if (node.isNew) {
          const finalNewColor = applyContrastProtection(this.backgroundColor, '#22c55e');
          bgGradStart = bgL >= 0.5 ? '#dcfce7' : '#052e16';
          bgGradEnd = bgL >= 0.5 ? '#bbf7d0' : '#14532d';
          this.ctx.strokeStyle = finalNewColor;
          this.ctx.shadowColor = finalNewColor;
        } else {
          bgGradStart = bgL >= 0.5 ? '#f1f5f9' : '#0f172a';
          bgGradEnd = bgL >= 0.5 ? '#cbd5e1' : '#1e293b';
          this.ctx.strokeStyle = borderCol;
          this.ctx.shadowColor = borderCol;
        }
      }

      // Calculate dynamic rounded-square bounds based on the text width
      this.ctx.font = 'bold 10px monospace';
      const textWidth = this.ctx.measureText(node.label).width;
      const w = Math.max(55, textWidth + 24);
      const h = 36; // perfect height for title + subtitle

      // Node shadow/glow
      this.ctx.shadowBlur = this.draggedNodeId === node.id ? 22 : 10;

      // Draw background rounded square
      const grad = this.ctx.createLinearGradient(node.x, node.y - h / 2, node.x, node.y + h / 2);
      grad.addColorStop(0, bgGradStart);
      grad.addColorStop(1, bgGradEnd);
      this.ctx.fillStyle = grad;
      
      this.ctx.beginPath();
      this.roundRect(node.x - w / 2, node.y - h / 2, w, h, 8);
      this.ctx.fill();

      // Border outline
      this.ctx.lineWidth = node.id === this.selectedNodeId ? 3.0 : 2.0;
      this.ctx.stroke();

      // Turn off shadow glow for text rendering to keep it sharp
      this.ctx.shadowBlur = 0;

      // Label text centered
      this.ctx.fillStyle = node.isRemoved ? (bgL >= 0.5 ? '#991b1b' : '#fca5a5') : (bgL >= 0.5 ? '#0f172a' : '#f8fafc');
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(node.label, node.x, node.y - 4);

      // Subtitle or type index centered
      this.ctx.fillStyle = node.isRemoved ? '#ef4444' : (bgL >= 0.5 ? '#475569' : '#64748b');
      this.ctx.font = '7px monospace';
      this.ctx.fillText(node.type === 'residue' ? 'residue' : 'atom', node.x, node.y + 6);

      this.ctx.restore();
    });
  }

  /**
   * Draw proof tracing illumination (animated golden glowing trail)
   */
  private drawExecutionPathIllumination() {
    const pulseWidth = 8 + Math.abs(Math.sin(this.frameCount * 0.08)) * 8;
    this.ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)'; // Golden glow
    this.ctx.lineWidth = pulseWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.save();
    this.ctx.shadowColor = '#eab308';
    this.ctx.shadowBlur = 15;

    // Draw continuous path
    this.ctx.beginPath();
    let isFirst = true;
    this.illuminatedPath.forEach(id => {
      const node = this.nodes.get(id);
      if (node && !node.isRemoved) {
        if (isFirst) {
          this.ctx.moveTo(node.x, node.y);
          isFirst = false;
        } else {
          this.ctx.lineTo(node.x, node.y);
        }
      }
    });

    if (!isFirst) {
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  /**
   * Interactive Event Listeners
   */
  private setupListeners() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 1. Find if clicked on any node
    let foundNode: VisualNode | null = null;
    for (const node of this.nodes.values()) {
      if (node.isRemoved) continue;
      const dx = node.x - mx;
      const dy = node.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < node.radius + 5) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      this.draggedNodeId = foundNode.id;
      this.selectedNodeId = foundNode.id;
      this.selectedEdgeId = null;
      foundNode.vx = 0;
      foundNode.vy = 0;
      this.onSelectNode({ ...foundNode, elementType: 'node' } as any);
      return;
    }

    // 2. Find if clicked on any edge capsule
    let foundEdge: VisualEdge | null = null;
    for (const edge of this.edges) {
      const sCoord = this.resolveCoordinate(edge.source);
      const tCoord = this.resolveCoordinate(edge.target);
      if (sCoord && tCoord) {
        const midX = (sCoord.x + tCoord.x) / 2;
        const midY = (sCoord.y + tCoord.y) / 2;
        const dx = midX - mx;
        const dy = midY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If click is within 15px of edge capsule center
        if (dist < 15) {
          foundEdge = edge;
          break;
        }
      }
    }

    if (foundEdge) {
      this.selectedNodeId = null;
      this.selectedEdgeId = foundEdge.id;
      this.onSelectNode({ ...foundEdge, elementType: 'edge' } as any);
      return;
    }

    // 3. Clear selection
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.onSelectNode(null);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.draggedNodeId) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const node = this.nodes.get(this.draggedNodeId);
    if (node) {
      node.x = mx;
      node.y = my;
      node.vx = 0;
      node.vy = 0;
    }
  };

  private onMouseUp = () => {
    this.draggedNodeId = null;
  };

  // Helper to compute Convex Hull using Jarvis March (Gift Wrapping) algorithm
  private getConvexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length <= 2) return points;

    // Find the point with the lowest y-coordinate (and lowest x to break ties)
    let startPoint = points[0];
    for (const p of points) {
      if (p.y < startPoint.y || (p.y === startPoint.y && p.x < startPoint.x)) {
        startPoint = p;
      }
    }

    const hull = [];
    let currentPoint = startPoint;

    loop: while (true) {
      hull.push(currentPoint);
      let nextPoint = points[0];

      for (const p of points) {
        if (p === currentPoint) continue;
        // Cross product of vectors (current -> next) and (current -> p) to check orientation
        const val =
          (nextPoint.y - currentPoint.y) * (p.x - nextPoint.x) -
          (nextPoint.x - currentPoint.x) * (p.y - nextPoint.y);

        if (
          nextPoint === currentPoint ||
          val > 0 ||
          (val === 0 &&
            (p.x - currentPoint.x) * (p.x - currentPoint.x) +
              (p.y - currentPoint.y) * (p.y - currentPoint.y) >
              (nextPoint.x - currentPoint.x) * (nextPoint.x - currentPoint.x) +
                (nextPoint.y - currentPoint.y) * (nextPoint.y - currentPoint.y))
        ) {
          nextPoint = p;
        }
      }

      currentPoint = nextPoint;
      if (currentPoint === startPoint || hull.length > points.length) {
        break;
      }
    }

    return hull;
  }

  private resolveCoordinate(id: string): { x: number; y: number } | null {
    const node = this.nodes.get(id);
    if (node) {
      return { x: node.x, y: node.y };
    }

    const memb = this.membranes.find(m => m.id === id || m.label === id);
    if (memb) {
      const activeNodes = memb.nodeIds
        .map(nodeId => this.nodes.get(nodeId))
        .filter((n): n is VisualNode => !!n && !n.isRemoved);
      if (activeNodes.length > 0) {
        let sumX = 0, sumY = 0;
        activeNodes.forEach(n => {
          sumX += n.x;
          sumY += n.y;
        });
        return { x: sumX / activeNodes.length, y: sumY / activeNodes.length };
      }
    }

    const edge = this.edges.find(e => e.id === id || e.label === id);
    if (edge) {
      const srcCoord = this.resolveCoordinate(edge.source);
      const tgtCoord = this.resolveCoordinate(edge.target);
      if (srcCoord && tgtCoord) {
        return {
          x: (srcCoord.x + tgtCoord.x) / 2,
          y: (srcCoord.y + tgtCoord.y) / 2,
        };
      }
    }

    return null;
  }

  private getEntityAlpha(id: string): number {
    const node = this.nodes.get(id);
    if (node && typeof node.alpha === 'number' && !isNaN(node.alpha)) return node.alpha;
    const memb = this.membranes.find(m => m.id === id || m.label === id);
    if (memb && typeof memb.alpha === 'number' && !isNaN(memb.alpha)) return memb.alpha;
    const edge = this.edges.find(e => e.id === id || e.label === id);
    if (edge && typeof edge.alpha === 'number' && !isNaN(edge.alpha)) return edge.alpha;
    return 1.0;
  }

  private isEntityRemoved(id: string): boolean {
    const node = this.nodes.get(id);
    if (node) return node.isRemoved;
    const memb = this.membranes.find(m => m.id === id || m.label === id);
    if (memb) return memb.isRemoved;
    const edge = this.edges.find(e => e.id === id || e.label === id);
    if (edge) return edge.isRemoved;
    return false;
  }

  private getLineIntersection(
    p0_x: number, p0_y: number, p1_x: number, p1_y: number,
    p2_x: number, p2_y: number, p3_x: number, p3_y: number
  ): { x: number; y: number } | null {
    const s1_x = p1_x - p0_x;
    const s1_y = p1_y - p0_y;
    const s2_x = p3_x - p2_x;
    const s2_y = p3_y - p2_y;

    const denom = -s2_x * s1_y + s1_x * s2_y;
    if (denom === 0) return null;

    const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / denom;
    const t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / denom;

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      return {
        x: p0_x + (t * s1_x),
        y: p0_y + (t * s1_y)
      };
    }
    return null;
  }

  // Helper rounded rectangle drawer
  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }
}
