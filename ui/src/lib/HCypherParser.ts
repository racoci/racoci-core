export interface NodeData {
  id: string;
  label: string;
  type: 'atom' | 'residue';
  properties?: Record<string, string>;
  isNew?: boolean;
  isRemoved?: boolean;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
  isNew?: boolean;
  isRemoved?: boolean;
}

export interface MembraneData {
  id: string;
  label: string;
  nodeIds: string[];
  isNew?: boolean;
  isRemoved?: boolean;
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
 *  - Edges: (a) -[:REL_TYPE]-> (b) or (a) -> (b)
 *  - Membranes: Parenthetical lists like (a, b, c) with optional prefixed or suffixed names in brackets.
 */
export function parseHCypher(text: string): ParseResult {
  const nodesMap = new Map<string, NodeData>();
  const edges: EdgeData[] = [];
  const membranes: MembraneData[] = [];

  // Pre-scan to find all membrane names and edge labels to avoid treating them as atom nodes
  const membraneNames = new Set<string>();
  const edgeLabels = new Set<string>();

  // Use horizontal whitespace matching [ \t]* instead of \s* to prevent matching across newlines
  const refinedMembraneRegex = /(?:\[([a-zA-Z0-9_ \t]+)\][ \t]*)?\(([^)]+)\)(?:[ \t]*\[([a-zA-Z0-9_ \t]+)\])?/g;
  let unnamedCounter = 0;
  let preMembMatch;
  while ((preMembMatch = refinedMembraneRegex.exec(text)) !== null) {
    const prefix = preMembMatch[1];
    const list = preMembMatch[2];
    const suffix = preMembMatch[3];
    if (!prefix && !suffix && !list.includes(',')) continue;
    const name = (prefix || suffix || `membrane_${unnamedCounter++}`).trim();
    membraneNames.add(name);
  }

  const edgeRegex = /\((\w+)\)\s*(?:-\s*\[\s*:?(\w+)\s*\]\s*->|->)\s*\((\w+)\)/g;
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
    const list = membMatch[2];
    const suffix = membMatch[3];
    if (!prefix && !suffix && !list.includes(',')) continue;

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

    membranes.push({
      id,
      label,
      nodeIds,
    });
  }

  // 2. Parse edges
  edgeRegex.lastIndex = 0;
  let edgeMatch;
  let edgeIdCounter = 0;
  while ((edgeMatch = edgeRegex.exec(text)) !== null) {
    const source = edgeMatch[1];
    const relLabel = edgeMatch[2] || 'DEPENDS_ON';
    const target = edgeMatch[3];

    if (!isMembraneOrEdge(source) && !nodesMap.has(source)) {
      nodesMap.set(source, { id: source, label: source.toUpperCase(), type: 'atom' });
    }
    if (!isMembraneOrEdge(target) && !nodesMap.has(target)) {
      nodesMap.set(target, { id: target, label: target.toUpperCase(), type: 'atom' });
    }

    edges.push({
      id: `edge_${source}_${target}_${edgeIdCounter++}`,
      source,
      target,
      label: relLabel,
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

    const existing = nodesMap.get(id);
    if (existing) {
      if (Object.keys(properties).length) {
        existing.properties = properties;
      }
    } else {
      nodesMap.set(id, {
        id,
        label: id.toUpperCase(),
        type: 'atom',
        properties: Object.keys(properties).length ? properties : undefined,
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
