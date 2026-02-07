import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Server, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import type { ModelAPI, MCPServer, Agent } from '@/types/kubernetes';

// ─── Custom Node Component ───────────────────────────────────────────────────

interface ResourceNodeData {
  label: string;
  namespace: string;
  status: string;
  resourceType: 'ModelAPI' | 'MCPServer' | 'Agent';
  resource: ModelAPI | MCPServer | Agent;
}

function ResourceNode({ data }: { data: ResourceNodeData }) {
  const navigate = useNavigate();

  const config = {
    ModelAPI: { icon: Box, colorClass: 'border-l-[hsl(var(--modelapi-color))]', badgeVariant: 'modelapi' as const, route: 'modelapis' },
    MCPServer: { icon: Server, colorClass: 'border-l-[hsl(var(--mcpserver-color))]', badgeVariant: 'mcpserver' as const, route: 'mcpservers' },
    Agent: { icon: Bot, colorClass: 'border-l-[hsl(var(--agent-color))]', badgeVariant: 'agent' as const, route: 'agents' },
  }[data.resourceType];

  const Icon = config.icon;

  const statusVariant = (() => {
    switch (data.status?.toLowerCase()) {
      case 'ready':
      case 'running': return 'success' as const;
      case 'pending':
      case 'waiting': return 'warning' as const;
      case 'failed':
      case 'error': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  })();

  const handleClick = () => {
    const { namespace, name } = data.resource.metadata;
    navigate(`/${config.route}/${namespace}/${name}`);
  };

  return (
    <>
      {/* Input handle */}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />

      <div
        onClick={handleClick}
        className={`
          bg-card border border-border rounded-xl px-4 py-3 min-w-[200px] max-w-[240px]
          border-l-4 ${config.colorClass}
          shadow-sm hover:shadow-md hover:border-primary/30
          transition-all duration-200 cursor-pointer
          group
        `}
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-sm font-semibold text-foreground truncate">{data.label}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground font-mono truncate">{data.namespace}</span>
          <Badge variant={statusVariant} className="text-[9px] px-1.5 py-0 h-4">
            {data.status || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* Output handle */}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  resourceNode: ResourceNode,
};

// ─── Column Header Node ─────────────────────────────────────────────────────

function ColumnHeaderNode({ data }: { data: { label: string; count: number } }) {
  return (
    <div className="text-center pointer-events-none select-none">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
        {data.label}
      </span>
      <span className="ml-2 text-[10px] text-muted-foreground/40">({data.count})</span>
    </div>
  );
}

const allNodeTypes: NodeTypes = {
  resourceNode: ResourceNode,
  columnHeader: ColumnHeaderNode,
};

// ─── Layout & Edge Derivation ────────────────────────────────────────────────

const COL_X = { ModelAPI: 0, MCPServer: 450, Agent: 900 };
const ROW_SPACING = 140;
const HEADER_Y = -60;

function buildNodesAndEdges(
  modelAPIs: ModelAPI[],
  mcpServers: MCPServer[],
  agents: Agent[],
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Column headers
  const headers = [
    { key: 'ModelAPI', label: 'Model APIs', count: modelAPIs.length },
    { key: 'MCPServer', label: 'MCP Servers', count: mcpServers.length },
    { key: 'Agent', label: 'Agents', count: agents.length },
  ] as const;

  headers.forEach((h) => {
    nodes.push({
      id: `header-${h.key}`,
      type: 'columnHeader',
      position: { x: COL_X[h.key], y: HEADER_Y },
      data: { label: h.label, count: h.count },
      draggable: false,
      selectable: false,
    });
  });

  // Helper to create a node ID
  const nodeId = (kind: string, ns: string, name: string) => `${kind}/${ns}/${name}`;

  // ModelAPI nodes
  modelAPIs.forEach((r, i) => {
    nodes.push({
      id: nodeId('ModelAPI', r.metadata.namespace, r.metadata.name),
      type: 'resourceNode',
      position: { x: COL_X.ModelAPI, y: i * ROW_SPACING },
      data: {
        label: r.metadata.name,
        namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown',
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
      position: { x: COL_X.MCPServer, y: i * ROW_SPACING },
      data: {
        label: r.metadata.name,
        namespace: r.metadata.namespace,
        status: r.status?.phase || 'Unknown',
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
      position: { x: COL_X.Agent, y: i * ROW_SPACING },
      data: {
        label: agent.metadata.name,
        namespace: agent.metadata.namespace,
        status: agent.status?.phase || 'Unknown',
        resourceType: 'Agent',
        resource: agent,
      } satisfies ResourceNodeData,
    });

    // Edge: ModelAPI → Agent
    if (agent.spec.modelAPI) {
      const sourceId = nodeId('ModelAPI', agent.metadata.namespace, agent.spec.modelAPI);
      edges.push({
        id: `edge-modelapi-${agent.metadata.name}`,
        source: sourceId,
        target: agentId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--modelapi-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--modelapi-color))' },
      });
    }

    // Edges: MCPServer → Agent
    agent.spec.mcpServers?.forEach((mcpName) => {
      const sourceId = nodeId('MCPServer', agent.metadata.namespace, mcpName);
      edges.push({
        id: `edge-mcp-${mcpName}-${agent.metadata.name}`,
        source: sourceId,
        target: agentId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: 'hsl(var(--mcpserver-color))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--mcpserver-color))' },
      });
    });
  });

  return { nodes, edges };
}

// ─── VisualMap Component ─────────────────────────────────────────────────────

export function VisualMap() {
  const { modelAPIs, mcpServers, agents } = useKubernetesStore();

  const { nodes, edges } = useMemo(
    () => buildNodesAndEdges(modelAPIs, mcpServers, agents),
    [modelAPIs, mcpServers, agents],
  );

  const isEmpty = modelAPIs.length === 0 && mcpServers.length === 0 && agents.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-muted-foreground gap-3">
        <Bot className="h-12 w-12 opacity-30" />
        <p className="text-sm">No resources found. Create ModelAPIs, MCPServers, or Agents to see them here.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] w-full rounded-xl border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={allNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background gap={20} size={1} className="!bg-background" />
        <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          nodeColor={(node) => {
            const rt = (node.data as unknown as ResourceNodeData)?.resourceType;
            if (rt === 'ModelAPI') return 'hsl(var(--modelapi-color))';
            if (rt === 'MCPServer') return 'hsl(var(--mcpserver-color))';
            if (rt === 'Agent') return 'hsl(var(--agent-color))';
            return 'hsl(var(--muted-foreground))';
          }}
          className="!bg-card !border-border"
          maskColor="hsl(var(--background) / 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
