import type { NodeData, EdgeData, MembraneData } from './HCypherParser';

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
}

interface VisualMembrane {
  id: string;
  label: string;
  nodeIds: string[];
  alpha: number;
  isNew: boolean;
  isRemoved: boolean;
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

  // Visual/Grid parameters
  private gridOffset = { x: 0, y: 0 };
  private zoom = 1.0;
  private frameCount = 0;
  private executionIllumination = false;
  private illuminatedPath: string[] = []; // node IDs

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
          color: '#00d2ff', // Cyan
          glowColor: 'rgba(0, 210, 255, 0.6)',
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
    const kRepulsion = 1200; // force of node separation
    const kGravity = 0.03;   // pull toward center
    const kDamping = 0.85;   // friction
    const kSpring = 0.04;    // edge attraction force
    const minSeparation = 100;

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

        if (dist < 300) {
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

    // 2. Edge Attractions (Springs)
    this.edges.forEach(edge => {
      const sNode = this.nodes.get(edge.source);
      const tNode = this.nodes.get(edge.target);

      if (sNode && tNode && !sNode.isRemoved && !tNode.isRemoved) {
        const dx = tNode.x - sNode.x;
        const dy = tNode.y - sNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Desired spring length
        const springLen = 150;
        const force = (dist - springLen) * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (sNode.id !== this.draggedNodeId) {
          sNode.vx += fx;
          sNode.vy += fy;
        }
        if (tNode.id !== this.draggedNodeId) {
          tNode.vx -= fx;
          tNode.vy -= fy;
        }
      }
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
  }

  /**
   * Render Canvas
   */
  private render() {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;

    this.ctx.clearRect(0, 0, width, height);

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
    this.ctx.strokeStyle = '#1e202c';
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
    this.ctx.strokeStyle = '#2d3142';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(width / 2, 0);
    this.ctx.lineTo(width / 2, height);
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Draw little tick indices on center lines
    this.ctx.fillStyle = '#4f566b';
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

    // Outer glow membrane
    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'; // Translucent Neon Red
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
    this.ctx.shadowBlur = 10;
    
    // Draw rounded rectangle
    this.ctx.beginPath();
    this.roundRect(rx, ry, rSize, rSize, 12);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.setLineDash([]); // Reset line dash

    // Labels
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    this.ctx.font = 'bold 11px monospace';
    this.ctx.fillText('sys::residue', rx + 12, ry + 22);
    this.ctx.font = '9px monospace';
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
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

      // Calculate Bounding box with padding
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      activeNodes.forEach(n => {
        minX = Math.min(minX, n.x - n.radius);
        minY = Math.min(minY, n.y - n.radius);
        maxX = Math.max(maxX, n.x + n.radius);
        maxY = Math.max(maxY, n.y + n.radius);
      });

      const padding = 25;
      const x = minX - padding;
      const y = minY - padding;
      const w = (maxX - minX) + padding * 2;
      const h = (maxY - minY) + padding * 2;

      // Glow style
      this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)'; // Violet
      this.ctx.lineWidth = 1.5;
      this.ctx.fillStyle = 'rgba(168, 85, 247, 0.03)';

      this.ctx.save();
      this.ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
      this.ctx.shadowBlur = 12;

      this.ctx.beginPath();
      this.roundRect(x, y, w, h, 16);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      // Title tag tab
      this.ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
      this.ctx.font = 'bold 10px monospace';
      this.ctx.fillText(`MEMBRANE [ ${m.label} ]`, x + 12, y + 18);
    });
  }

  /**
   * Draw hyperedges and standard relationships
   */
  private drawEdges() {
    this.edges.forEach(edge => {
      const s = this.nodes.get(edge.source);
      const t = this.nodes.get(edge.target);

      if (!s || !t) return;

      // Animate edge alpha
      const alpha = Math.min(s.alpha, t.alpha);
      if (alpha <= 0.05) return;

      const isRemovedEdge = edge.isRemoved || s.isRemoved || t.isRemoved;

      // Styles
      this.ctx.lineWidth = 2.0;
      if (isRemovedEdge) {
        this.ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.45})`; // Translucent Red
      } else if (edge.isNew) {
        this.ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.8})`; // Green glow for new
      } else {
        this.ctx.strokeStyle = `rgba(45, 49, 66, ${alpha * 0.85})`; // Dark metallic border
      }

      // Draw standard curved ribbon / edge line
      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.lineTo(t.x, t.y);
      this.ctx.stroke();

      // Draw dynamic glowing flow particles moving along edges to represent state changes
      if (!isRemovedEdge) {
        edge.pulseOffset = (edge.pulseOffset + 0.006) % 1.0;
        const px = s.x + (t.x - s.x) * edge.pulseOffset;
        const py = s.y + (t.y - s.y) * edge.pulseOffset;

        this.ctx.fillStyle = '#00f6ff'; // Neon blue pulse
        this.ctx.save();
        this.ctx.shadowColor = '#00f6ff';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Draw direction arrow head
      const angle = Math.atan2(t.y - s.y, t.x - s.x);
      const arrowDist = t.radius + 6; // stop right before node circumference
      const ax = t.x - Math.cos(angle) * arrowDist;
      const ay = t.y - Math.sin(angle) * arrowDist;

      this.ctx.fillStyle = isRemovedEdge ? 'rgba(239, 68, 68, 0.7)' : '#3b82f6';
      this.ctx.beginPath();
      this.ctx.moveTo(ax, ay);
      this.ctx.lineTo(ax - 10 * Math.cos(angle - Math.PI/8), ay - 10 * Math.sin(angle - Math.PI/8));
      this.ctx.lineTo(ax - 10 * Math.cos(angle + Math.PI/8), ay - 10 * Math.sin(angle + Math.PI/8));
      this.ctx.closePath();
      this.ctx.fill();

      // Label
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      this.ctx.fillStyle = isRemovedEdge ? 'rgba(239, 68, 68, 0.5)' : '#94a3b8';
      this.ctx.font = '9px monospace';
      
      this.ctx.save();
      this.ctx.translate(midX, midY);
      this.ctx.rotate(angle);
      this.ctx.fillText(edge.label, -this.ctx.measureText(edge.label).width / 2, -6);
      this.ctx.restore();
    });
  }

  /**
   * Draw atoms/nodes
   */
  private drawNodes() {
    this.nodes.forEach(node => {
      if (node.alpha <= 0.05) return;

      this.ctx.save();
      this.ctx.globalAlpha = node.alpha;

      // Base Node Color mapping based on states
      let borderCol = '#00d2ff'; // Cyan default
      let bgGradStart = '#0f172a'; // Deep slate
      let bgGradEnd = '#1e293b';

      if (node.isRemoved) {
        borderCol = '#ef4444'; // Neon Red
        bgGradStart = '#1a0505';
        bgGradEnd = '#2e0a0a';
      } else if (node.id === this.selectedNodeId) {
        borderCol = '#e0f2fe'; // Super electric light blue-white
        bgGradStart = '#1e3a8a'; // Deep blue
        bgGradEnd = '#1e40af';
      } else if (node.isNew) {
        borderCol = '#22c55e'; // Bright Green for additions
        bgGradStart = '#052e16';
        bgGradEnd = '#14532d';
      }

      // Node shadow/glow
      this.ctx.shadowColor = borderCol;
      this.ctx.shadowBlur = this.draggedNodeId === node.id ? 22 : 10;

      // Draw background circle
      const grad = this.ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius);
      grad.addColorStop(0, bgGradStart);
      grad.addColorStop(1, bgGradEnd);
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Border outline
      this.ctx.strokeStyle = borderCol;
      this.ctx.lineWidth = node.id === this.selectedNodeId ? 3.0 : 2.0;
      this.ctx.stroke();

      // Turn off shadow glow for text rendering to keep it sharp
      this.ctx.shadowBlur = 0;

      // Label text
      this.ctx.fillStyle = node.isRemoved ? '#fca5a5' : '#f8fafc';
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(node.label, node.x, node.y - 2);

      // Subtitle or type index
      this.ctx.fillStyle = node.isRemoved ? '#ef4444' : '#64748b';
      this.ctx.font = '7px monospace';
      this.ctx.fillText(node.type === 'residue' ? 'residue' : 'atom', node.x, node.y + 8);

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

    // Find if clicked on any node
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
      foundNode.vx = 0;
      foundNode.vy = 0;
      this.onSelectNode(foundNode);
    } else {
      this.selectedNodeId = null;
      this.onSelectNode(null);
    }
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
