import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

export interface LayoutOptions {
  nodeSep?: number;
  rankSep?: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  nodeSep: 80,
  rankSep: 300,
};

/**
 * Compute layout positions for nodes in a fixed LR 3-column layout.
 * Columns: ModelAPI (left), Agent (middle), MCPServer (right).
 */
export function computeLayout(
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

  // Fixed column positions: ModelAPI=0, Agent=1, MCPServer=2
  const COLUMN_RANK: Record<string, number> = { ModelAPI: 0, Agent: 1, MCPServer: 2 };

  // Group by resource type (column)
  const columnGroups = new Map<string, Node[]>();
  resourceNodes.forEach((n) => {
    const rt = (n.data as any)?.resourceType as string;
    if (!columnGroups.has(rt)) columnGroups.set(rt, []);
    columnGroups.get(rt)!.push(n);
  });

  // Position resource nodes
  const layoutedResourceNodes = resourceNodes.map((node) => {
    if (lockedNodeIds.has(node.id)) return node;

    const rt = (node.data as any)?.resourceType as string;
    const col = COLUMN_RANK[rt] ?? 0;
    const group = columnGroups.get(rt) || [];
    const indexInGroup = group.indexOf(node);
    const totalInGroup = group.length;
    const totalHeight = totalInGroup * (NODE_HEIGHT + nodeSep) - nodeSep;
    const startY = -totalHeight / 2;

    return {
      ...node,
      position: { x: col * rankSep, y: startY + indexInGroup * (NODE_HEIGHT + nodeSep) },
    };
  });

  // Position headers above each column
  const COLUMN_LABELS = ['ModelAPI', 'Agent', 'MCPServer'];
  const layoutedHeaders = headerNodes.map((header) => {
    const kind = header.id.replace('header-', '');
    const colIndex = COLUMN_LABELS.indexOf(kind);
    if (colIndex === -1) return header;

    const colNodes = layoutedResourceNodes.filter(
      (n) => !lockedNodeIds.has(n.id) && (n.data as any)?.resourceType === kind
    );
    const minY = colNodes.length > 0 ? Math.min(...colNodes.map(n => n.position.y)) : 0;

    return {
      ...header,
      position: { x: colIndex * rankSep, y: minY - 60 },
    };
  });

  return [...layoutedHeaders, ...layoutedResourceNodes];
}
