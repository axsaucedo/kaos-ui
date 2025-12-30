import React from 'react';
import { Box } from 'lucide-react';
import { ResourceList } from '@/components/resources/ResourceList';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Badge } from '@/components/ui/badge';
import type { ModelAPI } from '@/types/kubernetes';

export function ModelAPIList() {
  const { modelAPIs, deleteModelAPI, setSelectedResource, setActiveTab } = useKubernetesStore();

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (item: ModelAPI) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-modelapi/20 flex items-center justify-center">
            <Box className="h-4 w-4 text-modelapi" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.metadata.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{item.metadata.namespace}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (item: ModelAPI) => (
        <Badge variant={item.spec.mode === 'Proxy' ? 'secondary' : 'outline'}>
          {item.spec.mode}
        </Badge>
      ),
    },
    {
      key: 'endpoint',
      header: 'Endpoint',
      render: (item: ModelAPI) => (
        <span className="text-sm text-muted-foreground font-mono">
          {item.status?.endpoint || '-'}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (item: ModelAPI) => (
        <span className="text-sm text-muted-foreground">
          {item.metadata.creationTimestamp
            ? new Date(item.metadata.creationTimestamp).toLocaleDateString()
            : '-'}
        </span>
      ),
    },
  ];

  return (
    <ResourceList
      title="Model APIs"
      description="Manage LiteLLM proxy and vLLM hosted model endpoints"
      items={modelAPIs}
      columns={columns}
      icon={Box}
      iconColor="modelapi-color"
      onAdd={() => setActiveTab('canvas')}
      onView={(item) => setSelectedResource(item)}
      onEdit={(item) => setSelectedResource(item)}
      onDelete={(item) => deleteModelAPI(item.metadata.name)}
      getStatus={(item) => item.status?.phase || 'Unknown'}
      getItemId={(item) => item.metadata.name}
    />
  );
}
