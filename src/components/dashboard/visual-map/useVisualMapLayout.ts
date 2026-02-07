import { useCallback, useRef, useState, useMemo } from 'react';
import type { Node, Edge, NodeChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import { computeDagreLayout } from './layout-engine';
import type { ResourceNodeData } from './types';
import type { ModelAPI, MCPServer, Agent } from '@/types/kubernetes';
import { MarkerType } from '@xyflow/react';

const ROW_SPACING = 140;

function buildInitialGraph(modelAPIs: ModelAPI[], mcpServers: MCPServer[], agents: Agent[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeId = (kind: string, ns: string, name: string) => `${kind}/${ns}/${name}`;

  // Column headers
  (['ModelAPI', 'MCPServer', 'Agent'] as const).forEach((key, i) => {
    const list = key === 'ModelAPI' ? modelAPIs : key === 'MCPServer' ? mcpServers : agents;
    nodes.push({
      id: `header-${key}`,
      type: 'columnHeader',
      position: { x: i * 450, y: -60 },
      data: { label: key === 'ModelAPI' ? 'Model APIs' : key === 'MCPServer' ? 'MCP Servers' : 'Agents', count: list.length },
      draggable: false,
      selectable: false,
    });
  });

  // ModelAPI nodes
  modelAPIs.forEach((r, i) => {
    nodes.push({
      id: nodeId('ModelAPI', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: 0, y: i * ROW_SPACING },
      data: {
        label: r.metadata.name,
        namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown',
        statusMessage: r.status?.message,
        resourceType: 'ModelAPI',
        resource: r,
      } satisfies ResourceNodeData,
    });
  });

  // MCPServer nodes
  mcpServers.forEach((r, i) => {
    nodes.push({
      id: nodeId('MCPServer', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: 450, y: i * ROW_SPACING },
      data: {
        label: r.metadata.name,
        namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown',
        statusMessage: r.status?.message,
        resourceType: 'MCPServer',
        resource: r,
      } satisfies ResourceNodeData,
    });
  });

  // Agent nodes + edges
  agents.forEach((agent, i) => {
    const agentId = nodeId('Agent', agent.metadata.namespace, agent.metadata.name);
    nodes.push({
      id: agentId,
      type: 'resourceNode',
      position: { x: 900, y: i * ROW_SPACING },
      data: {
        label: agent.metadata.name,
        namespace: agent.metadata.namespace,
        status: agent.status?.phase || 'Unknown',
        statusMessage: agent.status?.message,
        resourceType: 'Agent',
        resource: agent,
      } satisfies ResourceNodeData,
    });

    // Edge: ModelAPI → Agent
    if (agent.spec.modelAPI) {
      const sourceId = nodeId('ModelAPI', agent.metadata.namespace, agent.spec.modelAPI);
      const sourceReady = modelAPIs.find(m => m.metadata.name === agent.spec.modelAPI && m.metadata.namespace === agent.metadata.namespace)?.status?.phase?.toLowerCase() === 'ready';
      edges.push({
        id: `edge-modelapi-${agent.metadata.name}`,
        source: sourceId,
        target: agentId,
        type: 'smoothstep',
        animated: sourceReady !== false,
        label: 'model',
        style: { stroke: 'hsl(var(--modelapi-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--modelapi-color))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
      });
    }

    // Edges: MCPServer → Agent
    agent.spec.mcpServers?.forEach((mcpName) => {
      const sourceId = nodeId('MCPServer', agent.metadata.namespace, mcpName);
      const sourceReady = mcpServers.find(m => m.metadata.name === mcpName && m.metadata.namespace === agent.metadata.namespace)?.status?.phase?.toLowerCase() === 'ready';
      edges.push({
        id: `edge-mcp-${mcpName}-${agent.metadata.name}`,
        source: sourceId,
        target: agentId,
        type: 'smoothstep',
        animated: sourceReady !== false,
        label: 'tools',
        style: { stroke: 'hsl(var(--mcpserver-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--mcpserver-color))' },
        labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
      });
    });
  });

  return { nodes, edges };
}

export function useVisualMapLayout(
  modelAPIs: ModelAPI[],
  mcpServers: MCPServer[],
  agents: Agent[],
) {
  const lockedPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [isLocked, setIsLocked] = useState(false);

  // Build initial nodes/edges from store data
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildInitialGraph(modelAPIs, mcpServers, agents);
    // Apply dagre layout on initial build
    const layouted = computeDagreLayout(nodes, edges, new Set(lockedPositions.current.keys()));
    return { initialNodes: layouted, initialEdges: edges };
  }, [modelAPIs, mcpServers, agents]);

  // Track dragged nodes → lock their positions
  const handleNodeDragStop = useCallback((_: any, node: Node) => {
    lockedPositions.current.set(node.id, { ...node.position });
  }, []);

  // Re-layout: clear all locks and re-run dagre
  const reLayout = useCallback((currentNodes: Node[], currentEdges: Edge[]): Node[] => {
    lockedPositions.current.clear();
    return computeDagreLayout(currentNodes, currentEdges);
  }, []);

  const toggleLock = useCallback(() => setIsLocked((prev) => !prev), []);

  return {
    initialNodes,
    initialEdges,
    isLocked,
    toggleLock,
    handleNodeDragStop,
    reLayout,
  };
}
