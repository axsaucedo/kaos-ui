import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ModelAPI } from '@/types/kubernetes';

export interface ModelAPINodeData {
  resource: ModelAPI;
  onEdit?: (resource: ModelAPI) => void;
}

function ModelAPINodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ModelAPINodeData;
  const resource = nodeData.resource;
  const status = resource.status?.phase || 'Unknown';

  const getStatusVariant = () => {
    switch (status) {
      case 'Running': return 'success';
      case 'Error': return 'error';
      case 'Pending': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-modelapi !border-2 !border-background"
      />
      
      <div
        className={cn(
          'min-w-[200px] rounded-lg border-2 bg-card p-4 transition-all duration-200',
          selected 
            ? 'border-modelapi shadow-lg ring-2 ring-modelapi/30' 
            : 'border-modelapi/50 hover:border-modelapi'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-modelapi/20 flex items-center justify-center">
            <Box className="h-5 w-5 text-modelapi" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {resource.metadata.name}
            </p>
            <p className="text-xs text-muted-foreground">ModelAPI</p>
          </div>
          <Badge variant={getStatusVariant() as any} className="text-[10px]">
            {status}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Mode:</span>
            <span className="text-foreground font-medium">{resource.spec.mode}</span>
          </div>
          {resource.spec.mode === 'Hosted' && resource.spec.serverConfig?.model && (
            <div className="flex items-center justify-between">
              <span>Model:</span>
              <span className="text-foreground font-medium truncate max-w-[100px]">
                {resource.spec.serverConfig.model.split('/').pop()}
              </span>
            </div>
          )}
          {resource.status?.endpoint && (
            <div className="flex items-center justify-between">
              <span>Endpoint:</span>
              <span className="text-primary font-mono text-[10px] truncate max-w-[100px]">
                {resource.status.endpoint.replace('http://', '')}
              </span>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-modelapi !border-2 !border-background"
      />
    </>
  );
}

export const ModelAPINode = memo(ModelAPINodeComponent);
