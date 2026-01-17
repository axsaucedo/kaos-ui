import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Panel,
  Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Server, Bot, Save, Download, Plus, X, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ModelAPI, MCPServer, Agent, MCPServerType } from '@/types/kubernetes';

// Custom Node Components
interface NodeData {
  [key: string]: unknown;
  label: string;
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  status?: string;
  mode?: string;
  mcpType?: string;
  mcpServers?: string[];
  modelAPI?: string;
  tools?: string[];
  resource: ModelAPI | MCPServer | Agent;
  isNew?: boolean;
}

function ModelAPINode({ data, selected }: { data: NodeData; selected: boolean }) {
  const resource = data.resource as ModelAPI;
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[200px] bg-card transition-all',
      selected ? 'border-primary shadow-glow-primary' : 'border-border hover:border-primary/50',
      data.isNew && 'border-dashed'
    )}>
      <Handle type="source" position={Position.Right} className="!bg-modelapi !w-3 !h-3" />
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-modelapi/20 flex items-center justify-center">
          <Box className="h-4 w-4 text-modelapi" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground">ModelAPI</p>
        </div>
        <Badge variant={data.status === 'Running' ? 'success' : data.status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {data.status}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Mode: <span className="text-foreground">{resource.spec.mode}</span></p>
        {resource.status?.endpoint && (
          <p className="font-mono truncate">{resource.status.endpoint}</p>
        )}
      </div>
    </div>
  );
}

function MCPServerNode({ data, selected }: { data: NodeData; selected: boolean }) {
  const resource = data.resource as MCPServer;
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[200px] bg-card transition-all',
      selected ? 'border-primary shadow-glow-primary' : 'border-border hover:border-mcpserver/50',
      data.isNew && 'border-dashed'
    )}>
      <Handle type="source" position={Position.Right} className="!bg-mcpserver !w-3 !h-3" />
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-mcpserver/20 flex items-center justify-center">
          <Server className="h-4 w-4 text-mcpserver" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground">MCPServer</p>
        </div>
        <Badge variant={data.status === 'Running' ? 'success' : data.status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {data.status}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {resource.spec.type && <p>Type: <span className="text-foreground">{resource.spec.type}</span></p>}
        <p>Tools: <span className="text-foreground font-mono">
          {resource.spec.config?.tools?.fromPackage || resource.spec.config?.tools?.fromString?.slice(0, 20) || 'N/A'}
        </span></p>
        {resource.status?.availableTools && resource.status.availableTools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {resource.status.availableTools.slice(0, 3).map(tool => (
              <Badge key={tool} variant="outline" className="text-[9px]">{tool}</Badge>
            ))}
            {resource.status.availableTools.length > 3 && (
              <Badge variant="outline" className="text-[9px]">+{resource.status.availableTools.length - 3}</Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentNode({ data, selected }: { data: NodeData; selected: boolean }) {
  const resource = data.resource as Agent;
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border-2 min-w-[220px] bg-card transition-all',
      selected ? 'border-primary shadow-glow-primary' : 'border-border hover:border-agent/50',
      data.isNew && 'border-dashed'
    )}>
      <Handle type="target" position={Position.Left} id="modelapi" className="!bg-modelapi !w-3 !h-3 !top-[30%]" />
      <Handle type="target" position={Position.Left} id="mcpserver" className="!bg-mcpserver !w-3 !h-3 !top-[70%]" />
      <Handle type="source" position={Position.Right} id="agent-out" className="!bg-agent !w-3 !h-3" />
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-agent/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-agent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground">Agent</p>
        </div>
        <Badge variant={data.status === 'Running' ? 'success' : data.status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {data.status}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {resource.spec.modelAPI && (
          <p>Model: <Badge variant="modelapi" className="text-[9px]">{resource.spec.modelAPI}</Badge></p>
        )}
        {resource.spec.mcpServers && resource.spec.mcpServers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {resource.spec.mcpServers.map(mcp => (
              <Badge key={mcp} variant="mcpserver" className="text-[9px]">{mcp}</Badge>
            ))}
          </div>
        )}
        {resource.spec.config?.description && (
          <p className="text-muted-foreground mt-1 truncate" title={resource.spec.config.description}>
            {resource.spec.config.description}
          </p>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  modelapi: ModelAPINode,
  mcpserver: MCPServerNode,
  agent: AgentNode,
};

interface PaletteItemProps {
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  icon: React.ElementType;
  color: string;
  onDragStart: (event: React.DragEvent, type: string) => void;
}

function PaletteItem({ type, icon: Icon, color, onDragStart }: PaletteItemProps) {
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all"
      draggable
      onDragStart={(e) => onDragStart(e, type)}
    >
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-${color}/20`}
        style={{ backgroundColor: `hsl(var(--${color}-color) / 0.2)` }}>
        <Icon className="h-4 w-4" style={{ color: `hsl(var(--${color}-color))` }} />
      </div>
      <span className="text-sm font-medium">{type}</span>
    </div>
  );
}

// Configuration Panel Component
interface ConfigPanelProps {
  node: Node<NodeData> | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onDelete: (nodeId: string) => void;
  modelAPIs: ModelAPI[];
  mcpServers: MCPServer[];
}

function ConfigPanel({ node, onClose, onUpdate, onDelete, modelAPIs, mcpServers }: ConfigPanelProps) {
  if (!node) return null;

  const resource = node.data.resource;
  const nodeType = node.data.type;

  const handleNameChange = (name: string) => {
    const updatedResource = {
      ...resource,
      metadata: { ...resource.metadata, name },
    };
    onUpdate(node.id, { label: name, resource: updatedResource });
  };

  const renderModelAPIConfig = () => {
    const api = resource as ModelAPI;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select
            value={api.spec.mode}
            onValueChange={(mode) => {
              const updatedResource = {
                ...api,
                spec: {
                  ...api.spec,
                  mode: mode as 'Proxy' | 'Hosted',
                },
              };
              onUpdate(node.id, { resource: updatedResource, mode });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Proxy">Proxy</SelectItem>
              <SelectItem value="Hosted">Hosted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {api.spec.mode === 'Hosted' && (
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={api.spec.hostedConfig?.model || ''}
              onChange={(e) => {
                const updatedResource = {
                  ...api,
                  spec: {
                    ...api.spec,
                    hostedConfig: {
                      ...api.spec.hostedConfig,
                      model: e.target.value,
                    },
                  },
                };
                onUpdate(node.id, { resource: updatedResource });
              }}
              placeholder="e.g., smollm"
            />
          </div>
        )}
      </div>
    );
  };

  const renderMCPServerConfig = () => {
    const server = resource as MCPServer;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={server.spec.type || 'python-runtime'}
            onValueChange={(type) => {
              const updatedResource = {
                ...server,
                spec: { ...server.spec, type: type as MCPServerType },
              };
              onUpdate(node.id, { resource: updatedResource, mcpType: type });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="python-runtime">Python Runtime</SelectItem>
              <SelectItem value="node-runtime">Node Runtime</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tools Package</Label>
          <Input
            value={server.spec.config?.tools?.fromPackage || ''}
            onChange={(e) => {
              const updatedResource = {
                ...server,
                spec: {
                  ...server.spec,
                  config: { 
                    ...server.spec.config, 
                    tools: { ...server.spec.config?.tools, fromPackage: e.target.value } 
                  },
                },
              };
              onUpdate(node.id, { resource: updatedResource });
            }}
            placeholder="e.g., mcp-server-calculator"
            className="font-mono"
          />
        </div>
      </div>
    );
  };

  const renderAgentConfig = () => {
    const agent = resource as Agent;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={agent.spec.config?.description || ''}
            onChange={(e) => {
              const updatedResource = {
                ...agent,
                spec: {
                  ...agent.spec,
                  config: { ...agent.spec.config, description: e.target.value },
                },
              };
              onUpdate(node.id, { resource: updatedResource });
            }}
            placeholder="Agent description"
          />
        </div>
        <div className="space-y-2">
          <Label>Instructions</Label>
          <Textarea
            value={agent.spec.config?.instructions || ''}
            onChange={(e) => {
              const updatedResource = {
                ...agent,
                spec: {
                  ...agent.spec,
                  config: { ...agent.spec.config, instructions: e.target.value },
                },
              };
              onUpdate(node.id, { resource: updatedResource });
            }}
            placeholder="Agent instructions"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Model API</Label>
          <Select
            value={agent.spec.modelAPI || ''}
            onValueChange={(modelAPI) => {
              const updatedResource = {
                ...agent,
                spec: { ...agent.spec, modelAPI },
              };
              onUpdate(node.id, { resource: updatedResource, modelAPI });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Model API" />
            </SelectTrigger>
            <SelectContent>
              {modelAPIs.map((api) => (
                <SelectItem key={api.metadata.name} value={api.metadata.name}>
                  {api.metadata.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>MCP Servers</Label>
          <div className="flex flex-wrap gap-2">
            {mcpServers.map((server) => {
              const isSelected = agent.spec.mcpServers?.includes(server.metadata.name);
              return (
                <Button
                  key={server.metadata.name}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const currentServers = agent.spec.mcpServers || [];
                    const newServers = isSelected
                      ? currentServers.filter((s) => s !== server.metadata.name)
                      : [...currentServers, server.metadata.name];
                    const updatedResource = {
                      ...agent,
                      spec: { ...agent.spec, mcpServers: newServers },
                    };
                    onUpdate(node.id, { resource: updatedResource, mcpServers: newServers });
                  }}
                >
                  {server.metadata.name}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Expose Agent</Label>
            <Switch
              checked={agent.spec.agentNetwork?.expose || false}
              onCheckedChange={(expose) => {
                const updatedResource = {
                  ...agent,
                  spec: {
                    ...agent.spec,
                    agentNetwork: { ...agent.spec.agentNetwork, expose },
                  },
                };
                onUpdate(node.id, { resource: updatedResource });
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Configure {nodeType}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={node.data.label}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Resource name"
              className="font-mono"
            />
          </div>

          {nodeType === 'ModelAPI' && renderModelAPIConfig()}
          {nodeType === 'MCPServer' && renderMCPServerConfig()}
          {nodeType === 'Agent' && renderAgentConfig()}

          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Canvas
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function VisualCanvas() {
  const { toast } = useToast();
  const { modelAPIs, mcpServers, agents } = useKubernetesStore();
  const { namespace, createModelAPI, createMCPServer, createAgent } = useKubernetesConnection();
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [pendingNodes, setPendingNodes] = useState<Set<string>>(new Set());
  
  // Convert resources to React Flow nodes
  const initialNodes = useMemo(() => {
    const nodes: Node<NodeData>[] = [];
    
    // ModelAPIs - left column
    modelAPIs.forEach((api, index) => {
      nodes.push({
        id: `modelapi-${api.metadata.name}`,
        type: 'modelapi',
        position: { x: 50, y: 50 + index * 180 },
        data: {
          label: api.metadata.name,
          type: 'ModelAPI',
          status: api.status?.phase || 'Unknown',
          mode: api.spec.mode,
          resource: api,
          isNew: false,
        },
      });
    });
    
    // MCPServers - middle column
    mcpServers.forEach((server, index) => {
      nodes.push({
        id: `mcpserver-${server.metadata.name}`,
        type: 'mcpserver',
        position: { x: 350, y: 50 + index * 180 },
        data: {
          label: server.metadata.name,
          type: 'MCPServer',
          status: server.status?.phase || 'Unknown',
          mcpType: server.spec.type,
          tools: server.status?.availableTools,
          resource: server,
          isNew: false,
        },
      });
    });
    
    // Agents - right column
    agents.forEach((agent, index) => {
      nodes.push({
        id: `agent-${agent.metadata.name}`,
        type: 'agent',
        position: { x: 700, y: 50 + index * 200 },
        data: {
          label: agent.metadata.name,
          type: 'Agent',
          status: agent.status?.phase || 'Unknown',
          mcpServers: agent.spec.mcpServers,
          modelAPI: agent.spec.modelAPI,
          resource: agent,
          isNew: false,
        },
      });
    });
    
    return nodes;
  }, [modelAPIs, mcpServers, agents]);
  
  // Create edges based on agent connections
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    agents.forEach(agent => {
      // Connect agent to ModelAPI
      if (agent.spec.modelAPI) {
        const modelAPIId = `modelapi-${agent.spec.modelAPI}`;
        edges.push({
          id: `edge-${modelAPIId}-agent-${agent.metadata.name}`,
          source: modelAPIId,
          target: `agent-${agent.metadata.name}`,
          targetHandle: 'modelapi',
          animated: true,
          style: { stroke: 'hsl(var(--modelapi-color))', strokeWidth: 2 },
        });
      }
      
      // Connect agent to MCP Servers
      agent.spec.mcpServers?.forEach(mcpName => {
        const mcpId = `mcpserver-${mcpName}`;
        edges.push({
          id: `edge-${mcpId}-agent-${agent.metadata.name}`,
          source: mcpId,
          target: `agent-${agent.metadata.name}`,
          targetHandle: 'mcpserver',
          animated: true,
          style: { stroke: 'hsl(var(--mcpserver-color))', strokeWidth: 2 },
        });
      });
    });
    
    return edges;
  }, [agents]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when resources change
  useEffect(() => {
    // Keep pending nodes and update existing ones
    setNodes((currentNodes) => {
      const pendingNodesData = currentNodes.filter(n => pendingNodes.has(n.id));
      const merged = [...initialNodes];
      
      pendingNodesData.forEach(pendingNode => {
        if (!merged.find(n => n.id === pendingNode.id)) {
          merged.push(pendingNode);
        }
      });
      
      return merged;
    });
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, pendingNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Determine edge style based on source node type
      const sourceNode = nodes.find(n => n.id === params.source);
      let strokeColor = 'hsl(var(--border))';
      
      if (sourceNode?.type === 'modelapi') {
        strokeColor = 'hsl(var(--modelapi-color))';
      } else if (sourceNode?.type === 'mcpserver') {
        strokeColor = 'hsl(var(--mcpserver-color))';
      } else if (sourceNode?.type === 'agent') {
        strokeColor = 'hsl(var(--agent-color))';
      }

      setEdges((eds) => addEdge({ 
        ...params, 
        animated: true,
        style: { stroke: strokeColor, strokeWidth: 2 },
      }, eds));

      // Update agent's connections if target is an agent
      const targetNode = nodes.find(n => n.id === params.target);
      if (targetNode?.data.type === 'Agent' && sourceNode) {
        const agent = targetNode.data.resource as Agent;
        let updatedAgent = { ...agent };

        if (sourceNode.data.type === 'ModelAPI') {
          updatedAgent = {
            ...agent,
            spec: { ...agent.spec, modelAPI: sourceNode.data.label },
          };
        } else if (sourceNode.data.type === 'MCPServer') {
          const currentMcpServers = agent.spec.mcpServers || [];
          if (!currentMcpServers.includes(sourceNode.data.label)) {
            updatedAgent = {
              ...agent,
              spec: { ...agent.spec, mcpServers: [...currentMcpServers, sourceNode.data.label] },
            };
          }
        }

        setNodes((nds) =>
          nds.map((n) =>
            n.id === params.target
              ? { ...n, data: { ...n.data, resource: updatedAgent, modelAPI: updatedAgent.spec.modelAPI, mcpServers: updatedAgent.spec.mcpServers } }
              : n
          )
        );
      }
    },
    [setEdges, nodes, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 350,
        y: event.clientY - 100,
      };

      const timestamp = Date.now();
      const newName = `new-${type.toLowerCase()}-${timestamp}`;
      const nodeId = `${type.toLowerCase()}-${newName}`;
      
      const newNode: Node<NodeData> = {
        id: nodeId,
        type: type.toLowerCase(),
        position,
        data: {
          label: newName,
          type: type as 'ModelAPI' | 'MCPServer' | 'Agent',
          status: 'Pending',
          resource: createNewResource(type, newName, namespace || 'default'),
          isNew: true,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setPendingNodes((prev) => new Set(prev).add(nodeId));
      setSelectedNode(newNode);
    },
    [setNodes, namespace]
  );

  const createNewResource = (type: string, name: string, ns: string): ModelAPI | MCPServer | Agent => {
    const baseMeta = {
      name,
      namespace: ns,
    };

    switch (type) {
      case 'ModelAPI':
        return {
          apiVersion: 'kaos.tools/v1alpha1',
          kind: 'ModelAPI',
          metadata: baseMeta,
          spec: { mode: 'Proxy', proxyConfig: { env: [] } },
          status: { phase: 'Pending' },
        };
      case 'MCPServer':
        return {
          apiVersion: 'kaos.tools/v1alpha1',
          kind: 'MCPServer',
          metadata: baseMeta,
          spec: { type: 'python-runtime' as const, config: { tools: { fromPackage: 'mcp-server-calculator' } } },
          status: { phase: 'Pending' },
        };
      default:
        return {
          apiVersion: 'kaos.tools/v1alpha1',
          kind: 'Agent',
          metadata: baseMeta,
          spec: {
            modelAPI: '',
            mcpServers: [],
            config: { description: 'New agent', instructions: '' },
          },
          status: { phase: 'Pending' },
        };
    }
  };

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      )
    );
    
    // Update selected node if it's the one being updated
    setSelectedNode((prev) => {
      if (prev?.id === nodeId) {
        return { ...prev, data: { ...prev.data, ...data } };
      }
      return prev;
    });
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setPendingNodes((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleApplyToCluster = async () => {
    const pendingNodesList = nodes.filter((n) => pendingNodes.has(n.id));
    
    if (pendingNodesList.length === 0) {
      toast({
        title: 'Nothing to apply',
        description: 'No new resources to create',
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const node of pendingNodesList) {
      try {
        const resource = node.data.resource;
        
        if (node.data.type === 'ModelAPI') {
          await createModelAPI(resource as ModelAPI);
        } else if (node.data.type === 'MCPServer') {
          await createMCPServer(resource as MCPServer);
        } else if (node.data.type === 'Agent') {
          await createAgent(resource as Agent);
        }
        
        // Remove from pending
        setPendingNodes((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
        
        successCount++;
      } catch (error) {
        console.error(`Failed to create ${node.data.type}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: 'Resources created',
        description: `Successfully created ${successCount} resource(s)`,
      });
    }
    
    if (errorCount > 0) {
      toast({
        title: 'Some resources failed',
        description: `Failed to create ${errorCount} resource(s)`,
        variant: 'destructive',
      });
    }
  };

  const handleExportYAML = () => {
    const resources = nodes.map((n) => n.data.resource);
    const yaml = resources.map((r) => JSON.stringify(r, null, 2)).join('\n---\n');
    
    const blob = new Blob([yaml], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resources.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Resources exported to resources.json',
    });
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Resource Palette */}
      <div className="w-64 bg-card border-r border-border p-4 space-y-4 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
          <p className="text-xs text-muted-foreground mb-4">Drag to add to canvas</p>
          <div className="space-y-2">
            <PaletteItem type="ModelAPI" icon={Box} color="modelapi" onDragStart={onDragStart} />
            <PaletteItem type="MCPServer" icon={Server} color="mcpserver" onDragStart={onDragStart} />
            <PaletteItem type="Agent" icon={Bot} color="agent" onDragStart={onDragStart} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Actions</h3>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={handleApplyToCluster}
              disabled={pendingNodes.size === 0}
            >
              <Save className="h-4 w-4" />
              Apply to Cluster
              {pendingNodes.size > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {pendingNodes.size}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={handleExportYAML}
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Error</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-3 w-6 border-2 border-dashed border-border rounded" />
              <span className="text-muted-foreground">New (unsaved)</span>
            </div>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-canvas-bg"
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2 },
          }}
        >
          <Controls className="bg-card border border-border rounded-lg" />
          <MiniMap 
            className="bg-card border border-border rounded-lg"
            nodeColor={(node) => {
              switch (node.type) {
                case 'modelapi': return 'hsl(var(--modelapi-color))';
                case 'mcpserver': return 'hsl(var(--mcpserver-color))';
                case 'agent': return 'hsl(var(--agent-color))';
                default: return 'hsl(var(--muted))';
              }
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
          
          <Panel position="top-right" className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              {nodes.length} nodes • {edges.length} connections
            </Badge>
            {pendingNodes.size > 0 && (
              <Badge variant="warning" className="text-xs ml-2">
                {pendingNodes.size} unsaved
              </Badge>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {/* Configuration Panel */}
      {selectedNode && (
        <ConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          modelAPIs={modelAPIs}
          mcpServers={mcpServers}
        />
      )}
    </div>
  );
}
