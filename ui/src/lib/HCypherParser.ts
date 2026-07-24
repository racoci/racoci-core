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
 *  - Membranes: [M ~ (a) -[:INHIBIT]-> (b)] or [MembraneName: a, b, c]
 */
export function parseHCypher(text: string): ParseResult {
  const nodesMap = new Map<string, NodeData>();
  const edges: EdgeData[] = [];
  const membranes: MembraneData[] = [];

  // Split text by lines or semicolons to analyze statements
  const lines = text.split(/[\n;]+/);

  // 1. First, find all explicit node declarations or mentions
  // Matches things like (a) or (node_id {role: "kernel"})
  const nodeRegex = /\((\w+)(?:\s*\{([^}]+)\})?\)/g;
  
  // Find all nodes in the whole text to ensure we define them
  let nodeMatch;
  while ((nodeMatch = nodeRegex.exec(text)) !== null) {
    const id = nodeMatch[1];
    const propsStr = nodeMatch[2];
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

    if (!nodesMap.has(id)) {
      nodesMap.set(id, {
        id,
        label: id.toUpperCase(),
        type: 'atom',
        properties: Object.keys(properties).length ? properties : undefined,
      });
    }
  }

  // 2. Parse edges
  // Matches (a) -[:REL]-> (b) or (a) -> (b)
  // We allow optional whitespace, brackets, colons inside the edge descriptor
  const edgeRegex = /\((\w+)\)\s*(?:-s*\[\s*:?(\w+)\s*\]\s*->|->)\s*\((\w+)\)/g;
  let edgeMatch;
  let edgeIdCounter = 0;
  while ((edgeMatch = edgeRegex.exec(text)) !== null) {
    const source = edgeMatch[1];
    const relLabel = edgeMatch[2] || 'DEPENDS_ON';
    const target = edgeMatch[3];

    // Ensure source and target nodes exist in our map
    if (!nodesMap.has(source)) {
      nodesMap.set(source, { id: source, label: source.toUpperCase(), type: 'atom' });
    }
    if (!nodesMap.has(target)) {
      nodesMap.set(target, { id: target, label: target.toUpperCase(), type: 'atom' });
    }

    edges.push({
      id: `edge_${source}_${target}_${edgeIdCounter++}`,
      source,
      target,
      label: relLabel,
    });
  }

  // 3. Parse membranes
  // Matches [ M ~ (a) -[:INHIBIT]-> (b) ] or [ M: a, b ] or simply [ M ]
  const membraneRegex = /\[\s*(\w+)(?:\s*(?:~|:)\s*([^\]]+))?\s*\]/g;
  let membMatch;
  while ((membMatch = membraneRegex.exec(text)) !== null) {
    const id = membMatch[1];
    const contents = membMatch[2] || '';
    const nodeIds: string[] = [];

    // Extract any node ids inside this membrane
    // E.g., if content has (a), extract 'a'
    const nestedNodeRegex = /\((\w+)\)/g;
    let nestedMatch;
    while ((nestedNodeRegex.exec(contents)) !== null) {
      // nestedNodeRegex.lastIndex is advanced, we reset or use a simpler split
    }

    // Alternatively, match all words that are node IDs in the map
    const words = contents.match(/\w+/g) || [];
    for (const word of words) {
      if (nodesMap.has(word) && !nodeIds.includes(word)) {
        nodeIds.push(word);
      }
    }

    // If no nodes matched directly, check if any nodes exist. If so, and the membrane is named, let's include some nodes
    // Or if the content itself defines nodes/edges, those nodes are already in nodesMap.
    membranes.push({
      id,
      label: id,
      nodeIds,
    });
  }

  // If there's an empty graph, let's provide default nodes so it's not blank initially
  const finalNodes = Array.from(nodesMap.values());
  
  return {
    nodes: finalNodes,
    edges,
    membranes,
  };
}
