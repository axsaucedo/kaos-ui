import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

export interface LayoutOptions {
  direction?: 'LR' | 'TB';
  nodeSep?: number;
  rankSep?: number;
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'LR',
  nodeSep: 80,
  rankSep: 300,
  ranker: 'tight-tree',
};

/**
 * Compute node positions using dagre graph layout.
 * Skips nodes whose IDs are in lockedNodeIds (preserves manual positioning).
 */
export function computeDagreLayout(
  nodes: Node[],
  edges: Edge[],
  lockedNodeIds: Set<string> = new Set(),
  options: LayoutOptions = {},
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSep,
    ranksep: opts.rankSep,
    ranker: opts.ranker,
  });

  // Only layout resource nodes (not headers)
  const resourceNodes = nodes.filter((n) => n.type === 'resourceNode');
  const headerNodes = nodes.filter((n) => n.type === 'columnHeader');

  resourceNodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const layoutedResourceNodes = resourceNodes.map((node) => {
    if (lockedNodeIds.has(node.id)) return node; // Preserve locked position

    const dagreNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
    };
  });

  // Position headers above their column based on the leftmost/topmost nodes per rank
  const rankGroups = new Map<number, number[]>();
  layoutedResourceNodes.forEach((node) => {
    const rank = Math.round(node.position.x / (opts.rankSep || 300));
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(node.position.y);
  });

  // Map resource types to rank order for header positioning
  const kindToRank: Record<string, number> = {};
  layoutedResourceNodes.forEach((node) => {
    const rt = (node.data as any)?.resourceType;
    if (rt) {
      const rank = Math.round(node.position.x / (opts.rankSep || 300));
      kindToRank[rt] = node.position.x;
    }
  });

  const layoutedHeaders = headerNodes.map((header) => {
    const kind = header.id.replace('header-', '');
    const x = kindToRank[kind] ?? header.position.x;
    const minY = rankGroups.size > 0
      ? Math.min(...Array.from(rankGroups.values()).flat())
      : 0;
    return {
      ...header,
      position: { x, y: minY - 60 },
    };
  });

  return [...layoutedHeaders, ...layoutedResourceNodes];
}
