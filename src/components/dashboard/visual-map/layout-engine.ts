import type { Node, Edge } from '@xyflow/react';
import type { LayoutDirection } from './types';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSep?: number;
  rankSep?: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'LR',
  nodeSep: 80,
  rankSep: 300,
};

/**
 * Compute layout positions for nodes based on direction.
 * Supports LR, RL, TB, BT layouts.
 */
export function computeLayout(
  nodes: Node[],
  edges: Edge[],
  lockedNodeIds: Set<string> = new Set(),
  options: LayoutOptions = {},
): Node[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dir = opts.direction!;
  const rankSep = opts.rankSep!;
  const nodeSep = opts.nodeSep!;
  const isHorizontal = dir === 'LR' || dir === 'RL';
  const isReversed = dir === 'RL' || dir === 'BT';

  const resourceNodes = nodes.filter((n) => n.type === 'resourceNode');
  const headerNodes = nodes.filter((n) => n.type === 'columnHeader');

  // BFS to assign ranks based on edge direction
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

  const rank = new Map<string, number>();
  const queue: string[] = [];
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
        if (existingRank === undefined) queue.push(e.target);
      }
    });
  }
  resourceNodes.forEach((n) => { if (!rank.has(n.id)) rank.set(n.id, 0); });

  // Group by rank
  const rankGroups = new Map<number, Node[]>();
  resourceNodes.forEach((n) => {
    const r = rank.get(n.id) || 0;
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(n);
  });

  const maxRank = Math.max(0, ...Array.from(rank.values()));

  // Position nodes
  const layoutedResourceNodes = resourceNodes.map((node) => {
    if (lockedNodeIds.has(node.id)) return node;

    let r = rank.get(node.id) || 0;
    if (isReversed) r = maxRank - r;

    const group = rankGroups.get(rank.get(node.id) || 0) || [];
    const indexInGroup = group.indexOf(node);
    const totalInGroup = group.length;

    if (isHorizontal) {
      const totalHeight = totalInGroup * (NODE_HEIGHT + nodeSep) - nodeSep;
      const startY = -totalHeight / 2;
      return { ...node, position: { x: r * rankSep, y: startY + indexInGroup * (NODE_HEIGHT + nodeSep) } };
    } else {
      const totalWidth = totalInGroup * (NODE_WIDTH + nodeSep) - nodeSep;
      const startX = -totalWidth / 2;
      return { ...node, position: { x: startX + indexInGroup * (NODE_WIDTH + nodeSep), y: r * (NODE_HEIGHT + nodeSep) } };
    }
  });

  // Position headers
  const kindToPos: Record<string, { primary: number }> = {};
  layoutedResourceNodes.forEach((node) => {
    const rt = (node.data as any)?.resourceType;
    if (rt && !lockedNodeIds.has(node.id)) {
      kindToPos[rt] = { primary: isHorizontal ? node.position.x : node.position.y };
    }
  });

  const allCross = layoutedResourceNodes
    .filter((n) => !lockedNodeIds.has(n.id))
    .map((n) => isHorizontal ? n.position.y : n.position.x);
  const minCross = allCross.length > 0 ? Math.min(...allCross) : 0;

  const layoutedHeaders = headerNodes.map((header) => {
    const kind = header.id.replace('header-', '');
    const pos = kindToPos[kind];
    if (isHorizontal) {
      return { ...header, position: { x: pos?.primary ?? header.position.x, y: minCross - 60 } };
    } else {
      return { ...header, position: { x: pos?.primary ?? header.position.x, y: (allCross.length > 0 ? Math.min(...layoutedResourceNodes.filter(n => (n.data as any)?.resourceType === kind).map(n => n.position.y)) : 0) - 60 } };
    }
  });

  return [...layoutedHeaders, ...layoutedResourceNodes];
}
