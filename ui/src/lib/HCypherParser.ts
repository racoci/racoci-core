import { getClosestAllowedColor } from './ColorMath.js';

// Holds Svelte UI Parser Definitions
export interface NodeData {
  id: string;
  label: string;
  type: 'atom' | 'residue';
  properties?: Record<string, string>;
  isNew?: boolean;
  isRemoved?: boolean;
  color?: string;
}

export type NodeId = string;

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
  isNew?: boolean;
  isRemoved?: boolean;
  properties?: Record<string, string>;
  color?: string;
}

export type EdgeId = string;

export interface MembraneData {
  id: string;
  label: string;
  nodeIds: string[];
  isNew?: boolean;
  isRemoved?: boolean;
  properties?: Record<string, string>;
  color?: string;
}

export type MembraneId = string;

export interface ParseResult {
  nodes: NodeData[];
  edges: EdgeData[];
  membranes: MembraneData[];
}

/**
 * A robust regex-based parser for a subset of H-Cypher topology syntax.
 * Matches:
 *  - Nodes: (node_id) or (node_id #ffffff) or (node_id {prop: "val"})
 *  - Edges: (a) -[:REL_TYPE #00d2ff]-> (b) or (a) -> (b)
 *  - Membranes: Parenthetical lists like (a, b, c) with optional prefixed or suffixed names and properties/colors.
 */
export function parseHCypher(text: string): ParseResult {
  const nodesMap = new Map<string, NodeData>();
  const edges: EdgeData[] = [];
  const membranes: MembraneData[] = [];

  // Pre-scan to find all membrane names and edge labels to avoid treating them as atom nodes
  const membraneNames = new Set<string>();
  const edgeLabels = new Set<string>();

  // Matches membrane syntax with possible names and optional properties/minimalist colors:
  // e.g. [NAME #a855f7](a, b, c) or (a, b)[NAME #a855f7] or (a, b, c) #a855f7
  const refinedMembraneRegex = /(?:\[([a-zA-Z0-9_ \t]+)(?:\s*(?:\{([^}]+)\}|(#[0-9a-fA-F]{6})))?\][ \t]*)?\(([^)]+)\)(?:[ \t]*\[([a-zA-Z0-9_ \t]+)(?:\s*(?:\{([^}]+)\}|(#[0-9a-fA-F]{6})))?\])?(?:\s*(?:\{([^}]+)\}|(#[0-9a-fA-F]{6})))?/g;
  let unnamedCounter = 0;
  let preMembMatch;
  while ((preMembMatch = refinedMembraneRegex.exec(text)) !== null) {
    const prefix = preMembMatch[1];
    const list = preMembMatch[4];
    const suffix = preMembMatch[5];
    
    // Ignore braces inside parentheses (these are node/edge properties)
    if (list && (list.includes('{') || list.includes('}'))) continue;
    // Commas are required to promote unnamed parentheticals to membranes, avoiding normal parenthesis collision
    if (!prefix && !suffix && (!list || !list.includes(','))) continue;

    const name = (prefix || suffix || `membrane_${unnamedCounter++}`).trim();
    membraneNames.add(name);
  }

  // Refined edge regex that supports optional properties/colors on nodes, and label, properties, or minimalist colors inside brackets:
  // e.g. -[:DEPENDS_ON #00d2ff]-> or -[:DEPENDS_ON {color: "cyan"}]->
  const edgeRegex = /\((\w+)(?:\s*\{[^}]*\})?\s*(?:#[0-9a-fA-F]{6})?\)\s*(?:-\s*\[\s*:?(\w+)(?:\s*(?:\{([^}]+)\}|(#[0-9a-fA-F]{6})))?\s*\]\s*->|->)\s*\((\w+)(?:\s*\{[^}]*\})?\s*(?:#[0-9a-fA-F]{6})?\)/g;
  let preEdgeMatch;
  while ((preEdgeMatch = edgeRegex.exec(text)) !== null) {
    const relLabel = preEdgeMatch[2];
    if (relLabel) {
      edgeLabels.add(relLabel);
    }
  }

  const isMembraneOrEdge = (name: string) => {
    return membraneNames.has(name) || edgeLabels.has(name);
  };

  // 1. Parse membranes using refined parenthetical membrane syntax
  refinedMembraneRegex.lastIndex = 0;
  let unnamedActualCounter = 0;
  let membMatch;
  while ((membMatch = refinedMembraneRegex.exec(text)) !== null) {
    const prefix = membMatch[1];
    const prefixProps = membMatch[2];
    const prefixColor = membMatch[3];
    const list = membMatch[4];
    const suffix = membMatch[5];
    const suffixProps = membMatch[6];
    const suffixColor = membMatch[7];
    const generalProps = membMatch[8];
    const generalColor = membMatch[9];
    
    if (list && (list.includes('{') || list.includes('}'))) continue;
    if (!prefix && !suffix && (!list || !list.includes(','))) continue;

    const id = (prefix || suffix || `membrane_${unnamedActualCounter++}`).trim();
    const label = id;
    const nodeIds: string[] = [];

    const atoms = list.split(',').map(s => s.trim()).filter(Boolean);
    for (const atom of atoms) {
      if (/^\w+$/.test(atom)) {
        if (!isMembraneOrEdge(atom) && !nodesMap.has(atom)) {
          nodesMap.set(atom, {
            id: atom,
            label: atom.toUpperCase(),
            type: 'atom',
          });
        }
        nodeIds.push(atom);
      }
    }

    const propsStr = prefixProps || suffixProps || generalProps;
    const properties: Record<string, string> = {};
    if (propsStr) {
      const propPairs = propsStr.split(',');
      for (const pair of propPairs) {
        const [k, v] = pair.split(':').map(s => s.trim());
        if (k && v) {
          properties[k] = v.replace(/['"]/g, ''); // remove quotes
        }
      }
    }

    // Extract color: prefers minimalist #hex token, falls back to property, defaults to undefined (white)
    const rawColor = prefixColor || suffixColor || generalColor || properties.color;
    const color = rawColor ? getClosestAllowedColor(rawColor) : undefined;

    membranes.push({
      id,
      label,
      nodeIds,
      properties: Object.keys(properties).length ? properties : undefined,
      color,
    });
  }

  // 2. Parse edges
  edgeRegex.lastIndex = 0;
  let edgeMatch;
  let edgeIdCounter = 0;
  while ((edgeMatch = edgeRegex.exec(text)) !== null) {
    const source = edgeMatch[1];
    const relLabel = edgeMatch[2] || 'DEPENDS_ON';
    const propsStr = edgeMatch[3];
    const rawColor = edgeMatch[4];
    const target = edgeMatch[5];

    if (!isMembraneOrEdge(source) && !nodesMap.has(source)) {
      nodesMap.set(source, { id: source, label: source.toUpperCase(), type: 'atom' });
    }
    if (!isMembraneOrEdge(target) && !nodesMap.has(target)) {
      nodesMap.set(target, { id: target, label: target.toUpperCase(), type: 'atom' });
    }

    const properties: Record<string, string> = {};
    if (propsStr) {
      const propPairs = propsStr.split(',');
      for (const pair of propPairs) {
        const [k, v] = pair.split(':').map(s => s.trim());
        if (k && v) {
          properties[k] = v.replace(/['"]/g, ''); // remove quotes
        }
      }
    }

    const color = rawColor ? getClosestAllowedColor(rawColor) : (properties.color ? getClosestAllowedColor(properties.color) : undefined);

    edges.push({
      id: `edge_${source}_${target}_${edgeIdCounter++}`,
      source,
      target,
      label: relLabel,
      properties: Object.keys(properties).length ? properties : undefined,
      color,
    });
  }

  // 3. Parse explicit node declarations: (id #color) or (id {color: "..."})
  const nodeRegex = /\((\w+)(?:\s*(?:\{([^}]+)\}|(#[0-9a-fA-F]{6})))?\)/g;
  let nodeMatch;
  while ((nodeMatch = nodeRegex.exec(text)) !== null) {
    const id = nodeMatch[1];
    const propsStr = nodeMatch[2];
    const rawColor = nodeMatch[3];

    if (isMembraneOrEdge(id)) continue;

    const properties: Record<string, string> = {};
    if (propsStr) {
      const propPairs = propsStr.split(',');
      for (const pair of propPairs) {
        const [k, v] = pair.split(':').map(s => s.trim());
        if (k && v) {
          properties[k] = v.replace(/['"]/g, ''); // remove quotes
        }
      }
    }

    const color = rawColor ? getClosestAllowedColor(rawColor) : (properties.color ? getClosestAllowedColor(properties.color) : undefined);

    const existing = nodesMap.get(id);
    if (existing) {
      if (color) {
        existing.color = color;
      }
      if (Object.keys(properties).length) {
        existing.properties = properties;
      }
    } else {
      nodesMap.set(id, {
        id,
        label: id.toUpperCase(),
        type: 'atom',
        properties: Object.keys(properties).length ? properties : undefined,
        color,
      });
    }
  }

  const finalNodes = Array.from(nodesMap.values());
  return {
    nodes: finalNodes,
    edges,
    membranes,
  };
}
