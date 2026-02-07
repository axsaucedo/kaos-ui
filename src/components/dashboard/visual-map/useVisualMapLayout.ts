import { useCallback, useRef, useState, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { computeLayout } from './layout-engine';
import type { ResourceNodeData } from './types';
import type { ModelAPI, MCPServer, Agent } from '@/types/kubernetes';
import { MarkerType } from '@xyflow/react';

const ROW_SPACING = 140;

/**
 * Column order: ModelAPI (0), Agent (1), MCPServer (2)
 * Agents in the middle since they reference both ModelAPIs and MCPServers.
 */
const COLUMN_X: Record<string, number> = { ModelAPI: 0, Agent: 450, MCPServer: 900 };
const COLUMN_ORDER = ['ModelAPI', 'MCPServer', 'Agent'] as const;

function buildGraph(modelAPIs: ModelAPI[], mcpServers: MCPServer[], agents: Agent[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeId = (kind: string, ns: string, name: string) => `${kind}/${ns}/${name}`;

  // Column headers
  (['ModelAPI', 'Agent', 'MCPServer'] as const).forEach((key, i) => {
    const list = key === 'ModelAPI' ? modelAPIs : key === 'MCPServer' ? mcpServers : agents;
    const labels: Record<string, string> = { ModelAPI: 'Model APIs', Agent: 'Agents', MCPServer: 'MCP Servers' };
    nodes.push({
      id: `header-${key}`,
      type: 'columnHeader',
      position: { x: i * 450, y: -60 },
      data: { label: labels[key], count: list.length },
      draggable: false,
      selectable: false,
    });
  });

  modelAPIs.forEach((r, i) => {
    nodes.push({
      id: nodeId('ModelAPI', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: COLUMN_X.ModelAPI, y: i * ROW_SPACING },
      data: {
        label: r.metadata.name, namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown', statusMessage: r.status?.message,
        resourceType: 'ModelAPI', resource: r,
      } satisfies ResourceNodeData,
    });
  });

  mcpServers.forEach((r, i) => {
    nodes.push({
      id: nodeId('MCPServer', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: COLUMN_X.MCPServer, y: i * ROW_SPACING },
      data: {
        label: r.metadata.name, namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown', statusMessage: r.status?.message,
        resourceType: 'MCPServer', resource: r,
      } satisfies ResourceNodeData,
    });
  });

  agents.forEach((agent, i) => {
    const agentId = nodeId('Agent', agent.metadata.namespace, agent.metadata.name);
    nodes.push({
      id: agentId,
      type: 'resourceNode',
      position: { x: COLUMN_X.Agent, y: i * ROW_SPACING },
      data: {
        label: agent.metadata.name, namespace: agent.metadata.namespace,
        status: agent.status?.phase || 'Unknown', statusMessage: agent.status?.message,
        resourceType: 'Agent', resource: agent,
      } satisfies ResourceNodeData,
    });

    if (agent.spec.modelAPI) {
      const sourceId = nodeId('ModelAPI', agent.metadata.namespace, agent.spec.modelAPI);
      const sourceReady = modelAPIs.find(m => m.metadata.name === agent.spec.modelAPI && m.metadata.namespace === agent.metadata.namespace)?.status?.phase?.toLowerCase() === 'ready';
      edges.push({
        id: `edge-modelapi-${agent.metadata.name}`,
        source: sourceId, target: agentId, type: 'dynamic',
        animated: sourceReady !== false, label: 'model',
        style: { stroke: 'hsl(var(--modelapi-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--modelapi-color))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
      });
    }

    agent.spec.mcpServers?.forEach((mcpName) => {
      const sourceId = nodeId('MCPServer', agent.metadata.namespace, mcpName);
      const sourceReady = mcpServers.find(m => m.metadata.name === mcpName && m.metadata.namespace === agent.metadata.namespace)?.status?.phase?.toLowerCase() === 'ready';
      edges.push({
        id: `edge-mcp-${mcpName}-${agent.metadata.name}`,
        source: sourceId, target: agentId, type: 'dynamic',
        animated: sourceReady !== false, label: 'tools',
        style: { stroke: 'hsl(var(--mcpserver-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--mcpserver-color))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
      });
    });
  });

  return { nodes, edges };
}

function resourceFingerprint(modelAPIs: ModelAPI[], mcpServers: MCPServer[], agents: Agent[]): string {
  const m = modelAPIs.map(r => `${r.metadata.namespace}/${r.metadata.name}:${r.status?.phase}`).sort().join(',');
  const s = mcpServers.map(r => `${r.metadata.namespace}/${r.metadata.name}:${r.status?.phase}`).sort().join(',');
  const a = agents.map(r => `${r.metadata.namespace}/${r.metadata.name}:${r.status?.phase}:${r.spec.modelAPI}:${r.spec.mcpServers?.sort().join('+')}`).sort().join(',');
  return `${m}|${s}|${a}`;
}

export function useVisualMapLayout(
  modelAPIs: ModelAPI[],
  mcpServers: MCPServer[],
  agents: Agent[],
) {
  const lockedPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const prevFingerprint = useRef<string>('');
  const hasInitialized = useRef(false);

  const { initialNodes, initialEdges, changed } = useMemo(() => {
    const fp = resourceFingerprint(modelAPIs, mcpServers, agents);
    const structurallyChanged = fp !== prevFingerprint.current;
    prevFingerprint.current = fp;

    if (!structurallyChanged && hasInitialized.current) {
      return { initialNodes: [] as Node[], initialEdges: [] as Edge[], changed: false };
    }

    hasInitialized.current = true;
    const { nodes, edges } = buildGraph(modelAPIs, mcpServers, agents);
    const layouted = computeLayout(nodes, edges, new Set(lockedPositions.current.keys()));
    return { initialNodes: layouted, initialEdges: edges, changed: true };
  }, [modelAPIs, mcpServers, agents]);

  const handleNodeDragStop = useCallback((_: any, node: Node) => {
    lockedPositions.current.set(node.id, { ...node.position });
  }, []);

  const reLayout = useCallback((currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    lockedPositions.current.clear();
    return computeLayout(currentNodes, currentEdges, new Set());
  }, []);

  const toggleLock = useCallback(() => setIsLocked((prev) => !prev), []);

  return {
    initialNodes,
    initialEdges,
    changed,
    isLocked,
    toggleLock,
    handleNodeDragStop,
    reLayout,
  };
}
