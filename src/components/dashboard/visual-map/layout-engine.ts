import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeSep?: number;
  rankSep?: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'LR',
  nodeSep: 80,
  rankSep: 300,
};

/**
 * Simple 3-column layout engine that positions nodes by resource type rank.
 * No external dependencies — replaces dagre with a straightforward approach
 * that groups nodes into columns (ranks) based on edge relationships.
 */
export function computeDagreLayout(
  nodes: Node[],
  edges: Edge[],
  lockedNodeIds: Set<string> = new Set(),
  options: LayoutOptions = {},
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rankSep = opts.rankSep!;
  const nodeSep = opts.nodeSep!;

  const resourceNodes = nodes.filter((n) => n.type === 'resourceNode');
  const headerNodes = nodes.filter((n) => n.type === 'columnHeader');

  // Build adjacency: determine rank (column) for each node
  // Nodes with no incoming edges = rank 0, targets of those = rank 1, etc.
  const incomingCount = new Map<string, number>();
  const nodeById = new Map<string, Node>();
  resourceNodes.forEach((n) => {
    nodeById.set(n.id, n);
    incomingCount.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (incomingCount.has(e.target)) {
      incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    }
  });

  // BFS to assign ranks
  const rank = new Map<string, number>();
  const queue: string[] = [];

  // Start with nodes that have no incoming edges
  resourceNodes.forEach((n) => {
    if ((incomingCount.get(n.id) || 0) === 0) {
      rank.set(n.id, 0);
      queue.push(n.id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentRank = rank.get(current) || 0;
    edges.forEach((e) => {
      if (e.source === current && nodeById.has(e.target)) {
        const existingRank = rank.get(e.target);
        const newRank = currentRank + 1;
        if (existingRank === undefined || newRank > existingRank) {
          rank.set(e.target, newRank);
        }
        if (existingRank === undefined) {
          queue.push(e.target);
        }
      }
    });
  }

  // Assign rank 0 to any unranked nodes (disconnected)
  resourceNodes.forEach((n) => {
    if (!rank.has(n.id)) rank.set(n.id, 0);
  });

  // Group nodes by rank
  const rankGroups = new Map<number, Node[]>();
  resourceNodes.forEach((n) => {
    const r = rank.get(n.id) || 0;
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(n);
  });

  // Position nodes
  const layoutedResourceNodes = resourceNodes.map((node) => {
    if (lockedNodeIds.has(node.id)) return node;

    const r = rank.get(node.id) || 0;
    const group = rankGroups.get(r) || [];
    const indexInGroup = group.indexOf(node);
    const totalInGroup = group.length;

    // Center the column vertically
    const totalHeight = totalInGroup * (NODE_HEIGHT + nodeSep) - nodeSep;
    const startY = -totalHeight / 2;

    return {
      ...node,
      position: {
        x: r * rankSep,
        y: startY + indexInGroup * (NODE_HEIGHT + nodeSep),
      },
    };
  });

  // Position headers above their column
  const kindToRank: Record<string, number> = {};
  layoutedResourceNodes.forEach((node) => {
    const rt = (node.data as any)?.resourceType;
    if (rt && !lockedNodeIds.has(node.id)) {
      kindToRank[rt] = node.position.x;
    }
  });

  const allYs = layoutedResourceNodes
    .filter((n) => !lockedNodeIds.has(n.id))
    .map((n) => n.position.y);
  const minY = allYs.length > 0 ? Math.min(...allYs) : 0;

  const layoutedHeaders = headerNodes.map((header) => {
    const kind = header.id.replace('header-', '');
    const x = kindToRank[kind] ?? header.position.x;
    return {
      ...header,
      position: { x, y: minY - 60 },
    };
  });

  return [...layoutedHeaders, ...layoutedResourceNodes];
}
