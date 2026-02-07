import { useCallback, useRef, useState, useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { computeLayout } from './layout-engine';
import type { ResourceNodeData } from './types';
import type { ModelAPI, MCPServer, Agent } from '@/types/kubernetes';
import { MarkerType } from '@xyflow/react';

const COLUMN_ORDER = ['ModelAPI', 'MCPServer', 'Agent'] as const;

function buildGraph(
  modelAPIs: ModelAPI[],
  mcpServers: MCPServer[],
  agents: Agent[],
  dimModelAPIEdges: boolean,
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeId = (kind: string, ns: string, name: string) => `${kind}/${ns}/${name}`;

  // Column headers
  (['ModelAPI', 'Agent', 'MCPServer'] as const).forEach((key) => {
    const list = key === 'ModelAPI' ? modelAPIs : key === 'MCPServer' ? mcpServers : agents;
    const labels: Record<string, string> = { ModelAPI: 'Model APIs', Agent: 'Agents', MCPServer: 'MCP Servers' };
    nodes.push({
      id: `header-${key}`,
      type: 'columnHeader',
      position: { x: 0, y: -60 },
      data: { label: labels[key], count: list.length },
      draggable: false,
      selectable: false,
    });
  });

  modelAPIs.forEach((r) => {
    nodes.push({
      id: nodeId('ModelAPI', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: 0, y: 0 },
      data: {
        label: r.metadata.name, namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown', statusMessage: r.status?.message,
        resourceType: 'ModelAPI', resource: r,
      } satisfies ResourceNodeData,
    });
  });

  mcpServers.forEach((r) => {
    nodes.push({
      id: nodeId('MCPServer', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: 0, y: 0 },
      data: {
        label: r.metadata.name, namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown', statusMessage: r.status?.message,
        resourceType: 'MCPServer', resource: r,
      } satisfies ResourceNodeData,
    });
  });

  agents.forEach((agent) => {
    const agentId = nodeId('Agent', agent.metadata.namespace, agent.metadata.name);
    nodes.push({
      id: agentId,
      type: 'resourceNode',
      position: { x: 0, y: 0 },
      data: {
        label: agent.metadata.name, namespace: agent.metadata.namespace,
        status: agent.status?.phase || 'Unknown', statusMessage: agent.status?.message,
        resourceType: 'Agent', resource: agent,
      } satisfies ResourceNodeData,
    });

    // ModelAPI edge — gray, toggleable visibility
    if (agent.spec.modelAPI) {
      const sourceId = nodeId('ModelAPI', agent.metadata.namespace, agent.spec.modelAPI);
      const dimmed = dimModelAPIEdges;
      edges.push({
        id: `edge-modelapi-${agent.metadata.name}`,
        source: sourceId, target: agentId, type: 'dynamic',
        animated: !dimmed, label: 'model',
        style: {
          stroke: dimmed ? 'hsl(var(--muted-foreground) / 0.08)' : 'hsl(var(--modelapi-color))',
          strokeWidth: dimmed ? 1 : 2,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: dimmed ? 'hsl(var(--muted-foreground) / 0.08)' : 'hsl(var(--modelapi-color))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10, opacity: dimmed ? 0.05 : 1 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
      });
    }

    // MCPServer edges
    agent.spec.mcpServers?.forEach((mcpName) => {
      const sourceId = nodeId('MCPServer', agent.metadata.namespace, mcpName);
      edges.push({
        id: `edge-mcp-${mcpName}-${agent.metadata.name}`,
        source: sourceId, target: agentId, type: 'dynamic',
        animated: true, label: 'tools',
        style: { stroke: 'hsl(var(--mcpserver-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--mcpserver-color))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
      });
    });

    // Agent-to-agent edges (from agentNetwork.access) — purple
    agent.spec.agentNetwork?.access?.forEach((targetAgentName: string) => {
      const targetId = nodeId('Agent', agent.metadata.namespace, targetAgentName);
      edges.push({
        id: `edge-a2a-${agent.metadata.name}-${targetAgentName}`,
        source: agentId, target: targetId, type: 'dynamic',
        animated: true, label: 'a2a',
        style: { stroke: 'hsl(var(--agent-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--agent-color))' },
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
  const a = agents.map(r => `${r.metadata.namespace}/${r.metadata.name}:${r.status?.phase}:${r.spec.modelAPI}:${r.spec.mcpServers?.sort().join('+')}:${(r.spec as any).agentNetwork?.access?.sort().join('+') ?? ''}`).sort().join(',');
  return `${m}|${s}|${a}`;
}

export function useVisualMapLayout(
  modelAPIs: ModelAPI[],
  mcpServers: MCPServer[],
  agents: Agent[],
  dimModelAPIEdges: boolean = false,
) {
  const lockedPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const prevFingerprint = useRef<string>('');
  const hasInitialized = useRef(false);

  const prevLayoutNodes = useRef<Node[]>([]);

  // Structural fingerprint — does NOT include dimModelAPIEdges
  const structuralFP = useMemo(
    () => resourceFingerprint(modelAPIs, mcpServers, agents),
    [modelAPIs, mcpServers, agents],
  );

  // Layout nodes only when structure changes
  const { initialNodes, changed } = useMemo(() => {
    const structurallyChanged = structuralFP !== prevFingerprint.current;
    const { nodes: graphNodes, edges } = buildGraph(modelAPIs, mcpServers, agents, false);

    let layoutedNodes: Node[];
    if (structurallyChanged || !hasInitialized.current) {
      prevFingerprint.current = structuralFP;
      hasInitialized.current = true;
      layoutedNodes = computeLayout(graphNodes, edges, new Set(lockedPositions.current.keys()));
      prevLayoutNodes.current = layoutedNodes;
    } else {
      layoutedNodes = prevLayoutNodes.current;
    }

    return { initialNodes: layoutedNodes, changed: structurallyChanged };
  }, [modelAPIs, mcpServers, agents, structuralFP]);

  // Always rebuild edges (they depend on dimModelAPIEdges which changes independently)
  const initialEdges = useMemo(() => {
    const { edges } = buildGraph(modelAPIs, mcpServers, agents, dimModelAPIEdges);
    return edges;
  }, [modelAPIs, mcpServers, agents, dimModelAPIEdges]);

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
