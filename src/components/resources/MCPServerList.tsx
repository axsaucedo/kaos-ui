import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server } from 'lucide-react';
import { ResourceList } from '@/components/resources/ResourceList';
import { MCPServerCreateDialog } from '@/components/resources/MCPServerCreateDialog';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { Badge } from '@/components/ui/badge';
import type { MCPServer } from '@/types/kubernetes';

export function MCPServerList() {
  const navigate = useNavigate();
  const { mcpServers, setSelectedResource, setSelectedResourceMode } = useKubernetesStore();
  const { deleteMCPServer } = useKubernetesConnection();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (item: MCPServer) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-mcpserver/20 flex items-center justify-center">
            <Server className="h-4 w-4 text-mcpserver" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.metadata.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{item.metadata.namespace}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: MCPServer) => (
        <Badge variant="secondary">{item.spec.type}</Badge>
      ),
    },
    {
      key: 'toolsSource',
      header: 'Tools Source',
      render: (item: MCPServer) => (
        <span className="text-sm text-muted-foreground font-mono">
          {item.spec.config.tools?.fromPackage || item.spec.config.tools?.fromString?.slice(0, 30) || '-'}
        </span>
      ),
    },
    {
      key: 'availableTools',
      header: 'Tools',
      render: (item: MCPServer) => (
        <div className="flex flex-wrap gap-1">
          {item.status?.availableTools?.slice(0, 3).map((tool) => (
            <Badge key={tool} variant="outline" className="text-[10px]">
              {tool}
            </Badge>
          ))}
          {(item.status?.availableTools?.length || 0) > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{(item.status?.availableTools?.length || 0) - 3}
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const handleView = (item: MCPServer) => {
    const ns = item.metadata.namespace || 'default';
    navigate(`/mcpservers/${ns}/${item.metadata.name}`);
  };

  const handleEdit = (item: MCPServer) => {
    setSelectedResource(item);
    setSelectedResourceMode('edit');
  };

  return (
    <>
      <ResourceList
        title="MCP Servers"
        description="Model Context Protocol servers for tool integration"
        items={mcpServers}
        columns={columns}
        icon={Server}
        iconColor="mcpserver-color"
        onAdd={() => setCreateDialogOpen(true)}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(item) => deleteMCPServer(item.metadata.name)}
        getStatus={(item) => item.status?.phase || 'Unknown'}
        getItemId={(item) => item.metadata.name}
      />
      <MCPServerCreateDialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
      />
    </>
  );
}
