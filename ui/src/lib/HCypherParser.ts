export interface NodeData {
  id: string;
  label: string;
  type: 'atom' | 'residue';
  properties?: Record<string, string>;
  isNew?: boolean;
  isRemoved?: boolean;
  color?: string;
}

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

export interface MembraneData {
  id: string;
  label: string;
  nodeIds: string[];
  isNew?: boolean;
  isRemoved?: boolean;
  properties?: Record<string, string>;
  color?: string;
}

export interface ParseResult {
  nodes: NodeData[];
  edges: EdgeData[];
  membranes: MembraneData[];
}

/**
 * A robust regex-based parser for a subset of H-Cypher topology syntax.
 * Matches:
 *  - Nodes: (node_id) or (node_id {prop: "val"})
 *  - Edges: (a) -[:REL_TYPE {prop: "val"}]-> (b) or (a) -> (b)
 *  - Membranes: Parenthetical lists like (a, b, c) with optional prefixed or suffixed names and properties in brackets/braces.
 */
export function parseHCypher(text: string): ParseResult {
  const nodesMap = new Map<string, NodeData>();
  const edges: EdgeData[] = [];
  const membranes: MembraneData[] = [];

  // Pre-scan to find all membrane names and edge labels to avoid treating them as atom nodes
  const membraneNames = new Set<string>();
  const edgeLabels = new Set<string>();

  // Matches membrane syntax with possible names and optional properties inside or outside brackets:
  // e.g. [NAME {color: "blue"}](a, b, c) or (a, b)[NAME] {color: "blue"}
  const refinedMembraneRegex = /(?:\[([a-zA-Z0-9_ \t]+)(?:\s*\{([^}]+)\})?\][ \t]*)?\(([^)]+)\)(?:[ \t]*\[([a-zA-Z0-9_ \t]+)(?:\s*\{([^}]+)\})?\])?(?:\s*\{([^}]+)\})?/g;
  let unnamedCounter = 0;
  let preMembMatch;
  while ((preMembMatch = refinedMembraneRegex.exec(text)) !== null) {
    const prefix = preMembMatch[1];
    const list = preMembMatch[3];
    const suffix = preMembMatch[4];
    if (list && (list.includes('{') || list.includes('}'))) continue;
    if (!prefix && !suffix && (!list || !list.includes(','))) continue;
    const name = (prefix || suffix || `membrane_${unnamedCounter++}`).trim();
    membraneNames.add(name);
  }

  // Refined edge regex that supports label and properties in brackets, e.g. -[:DEPENDS_ON {color: "cyan"}]->
  const edgeRegex = /\((\w+)\)\s*(?:-\s*\[\s*:?(\w+)(?:\s*\{([^}]+)\})?\s*\]\s*->|->)\s*\((\w+)\)/g;
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
    const list = membMatch[3];
    const suffix = membMatch[4];
    const suffixProps = membMatch[5];
    const generalProps = membMatch[6];
    
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
    const color = properties.color;

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
    const target = edgeMatch[4];

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
    const color = properties.color;

    edges.push({
      id: `edge_${source}_${target}_${edgeIdCounter++}`,
      source,
      target,
      label: relLabel,
      properties: Object.keys(properties).length ? properties : undefined,
      color,
    });
  }

  // 3. Parse explicit node declarations
  const nodeRegex = /\((\w+)(?:\s*\{([^}]+)\})?\)/g;
  let nodeMatch;
  while ((nodeMatch = nodeRegex.exec(text)) !== null) {
    const id = nodeMatch[1];
    const propsStr = nodeMatch[2];

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

    const color = properties.color;

    const existing = nodesMap.get(id);
    if (existing) {
      if (Object.keys(properties).length) {
        existing.properties = properties;
        existing.color = color;
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
