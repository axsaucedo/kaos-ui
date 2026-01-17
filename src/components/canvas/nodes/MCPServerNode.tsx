import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Server, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MCPServer } from '@/types/kubernetes';

export interface MCPServerNodeData {
  resource: MCPServer;
  onEdit?: (resource: MCPServer) => void;
}

function MCPServerNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as MCPServerNodeData;
  const resource = nodeData.resource;
  const status = resource.status?.phase || 'Unknown';
  const tools = resource.status?.availableTools || [];

  const getStatusVariant = () => {
    switch (status) {
      case 'Running': return 'success';
      case 'Error': return 'error';
      case 'Pending': return 'warning';
      default: return 'secondary';
    }
  };

  const getTypeLabel = () => {
    switch (resource.spec.type) {
      case 'python-runtime': return 'Python';
      case 'node-runtime': return 'Node.js';
      default: return resource.spec.type;
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-mcpserver !border-2 !border-background"
      />
      
      <div
        className={cn(
          'min-w-[200px] rounded-lg border-2 bg-card p-4 transition-all duration-200',
          selected 
            ? 'border-mcpserver shadow-lg ring-2 ring-mcpserver/30' 
            : 'border-mcpserver/50 hover:border-mcpserver'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-mcpserver/20 flex items-center justify-center">
            <Server className="h-5 w-5 text-mcpserver" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {resource.metadata.name}
            </p>
            <p className="text-xs text-muted-foreground">MCPServer</p>
          </div>
          <Badge variant={getStatusVariant() as any} className="text-[10px]">
            {status}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Type:</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {getTypeLabel()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Tools:</span>
            <span className="text-foreground font-medium truncate max-w-[100px]">
              {resource.spec.config.tools?.fromPackage || 'Custom'}
            </span>
          </div>
        </div>

        {/* Tools */}
        {tools.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {tools.length} Tools
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tools.slice(0, 4).map((tool) => (
                <Badge 
                  key={tool} 
                  variant="secondary" 
                  className="text-[9px] px-1 py-0"
                >
                  {tool}
                </Badge>
              ))}
              {tools.length > 4 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  +{tools.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-mcpserver !border-2 !border-background"
      />
    </>
  );
}

export const MCPServerNode = memo(MCPServerNodeComponent);
