import React from 'react';
import { Bot, Link2 } from 'lucide-react';
import { ResourceList } from '@/components/resources/ResourceList';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Badge } from '@/components/ui/badge';
import type { Agent } from '@/types/kubernetes';

export function AgentList() {
  const { agents, deleteAgent, setSelectedResource, setActiveTab } = useKubernetesStore();

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (item: Agent) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-agent/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-agent" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.metadata.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{item.metadata.namespace}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'modelAPI',
      header: 'Model API',
      render: (item: Agent) => (
        <Badge variant="modelapi">{item.spec.modelAPI}</Badge>
      ),
    },
    {
      key: 'mcpServers',
      header: 'MCP Servers',
      render: (item: Agent) => (
        <div className="flex flex-wrap gap-1">
          {item.spec.mcpServers?.slice(0, 2).map((mcp) => (
            <Badge key={mcp} variant="mcpserver" className="text-[10px]">
              {mcp}
            </Badge>
          ))}
          {(item.spec.mcpServers?.length || 0) > 2 && (
            <Badge variant="secondary" className="text-[10px]">
              +{(item.spec.mcpServers?.length || 0) - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'network',
      header: 'Network',
      render: (item: Agent) => (
        <div className="flex items-center gap-2">
          {item.spec.agentNetwork?.expose ? (
            <Badge variant="success" className="gap-1">
              <Link2 className="h-3 w-3" />
              Exposed
            </Badge>
          ) : (
            <Badge variant="secondary">Private</Badge>
          )}
          {item.spec.agentNetwork?.access && item.spec.agentNetwork.access.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {item.spec.agentNetwork.access.length} peers
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <ResourceList
      title="Agents"
      description="ADK-based agents with multi-agent communication support"
      items={agents}
      columns={columns}
      icon={Bot}
      iconColor="agent-color"
      onAdd={() => setActiveTab('canvas')}
      onView={(item) => setSelectedResource(item)}
      onEdit={(item) => setSelectedResource(item)}
      onDelete={(item) => deleteAgent(item.metadata.name)}
      getStatus={(item) => item.status?.phase || 'Unknown'}
      getItemId={(item) => item.metadata.name}
    />
  );
}
