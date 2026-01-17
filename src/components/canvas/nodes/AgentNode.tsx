import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Bot, Network, Server, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types/kubernetes';

export interface AgentNodeData {
  resource: Agent;
  onEdit?: (resource: Agent) => void;
}

function AgentNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const resource = nodeData.resource;
  const status = resource.status?.phase || 'Unknown';
  const mcpCount = resource.spec.mcpServers?.length || 0;
  const linkedResources = resource.status?.linkedResources || {};
  const isExposed = resource.spec.agentNetwork?.expose || false;

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
      {/* Top handle for agent-to-agent connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="agent-in"
        className="!w-3 !h-3 !bg-agent !border-2 !border-background"
      />
      
      {/* Left handle for receiving from ModelAPI */}
      <Handle
        type="target"
        position={Position.Left}
        id="model-in"
        className="!w-3 !h-3 !bg-modelapi !border-2 !border-background"
        style={{ top: '30%' }}
      />

      {/* Left handle for receiving from MCPServers */}
      <Handle
        type="target"
        position={Position.Left}
        id="mcp-in"
        className="!w-3 !h-3 !bg-mcpserver !border-2 !border-background"
        style={{ top: '70%' }}
      />
      
      <div
        className={cn(
          'min-w-[220px] rounded-lg border-2 bg-card p-4 transition-all duration-200',
          selected 
            ? 'border-agent shadow-lg ring-2 ring-agent/30' 
            : 'border-agent/50 hover:border-agent'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-agent/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-agent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {resource.metadata.name}
            </p>
            <p className="text-xs text-muted-foreground">Agent</p>
          </div>
          <Badge variant={getStatusVariant() as any} className="text-[10px]">
            {status}
          </Badge>
        </div>

        {/* Description */}
        {resource.spec.config.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {resource.spec.config.description}
          </p>
        )}

        {/* Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Box className="h-3.5 w-3.5 text-modelapi" />
            <span className="text-muted-foreground">Model:</span>
            <span className="text-foreground font-medium">{resource.spec.modelAPI}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-mcpserver" />
            <span className="text-muted-foreground">MCPs:</span>
            <span className="text-foreground font-medium">{mcpCount}</span>
            {mcpCount > 0 && (
              <div className="flex gap-1">
                {resource.spec.mcpServers?.slice(0, 2).map((mcp) => (
                  <Badge key={mcp} variant="mcpserver" className="text-[9px] px-1 py-0">
                    {mcp.replace('-mcp', '')}
                  </Badge>
                ))}
                {mcpCount > 2 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    +{mcpCount - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Network */}
        {isExposed && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Network className="h-3 w-3 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">
                Agent Network
              </span>
              <Badge variant="success" className="text-[9px] px-1 py-0 ml-auto">
                Exposed
              </Badge>
            </div>
            {Object.keys(linkedResources).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(linkedResources).map(([key, value]) => (
                  <Badge 
                    key={key} 
                    variant="agent" 
                    className="text-[9px] px-1 py-0"
                  >
                    {value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-agent !border-2 !border-background"
      />

      {/* Bottom handle for agent-to-agent connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="agent-out"
        className="!w-3 !h-3 !bg-agent !border-2 !border-background"
      />
    </>
  );
}

export const AgentNode = memo(AgentNodeComponent);
