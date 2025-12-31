import React from 'react';
import { Bot, Server, Network, Clock, Tag, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Agent } from '@/types/kubernetes';

interface AgentOverviewProps {
  agent: Agent;
}

export function AgentOverview({ agent }: AgentOverviewProps) {
  const { metadata, spec, status } = agent;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* General Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-agent" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Name" value={metadata.name} />
          <InfoRow label="Namespace" value={metadata.namespace || 'default'} />
          <InfoRow
            label="Created"
            value={metadata.creationTimestamp
              ? new Date(metadata.creationTimestamp).toLocaleString()
              : 'Unknown'}
          />
          <InfoRow
            label="Status"
            value={
              <Badge variant={status?.phase === 'Running' ? 'success' : 'secondary'}>
                {status?.phase || 'Unknown'}
              </Badge>
            }
          />
          {spec.config?.description && (
            <InfoRow label="Description" value={spec.config.description} />
          )}
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-modelapi" />
            Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow
            label="Model API"
            value={<Badge variant="modelapi">{spec.modelAPI}</Badge>}
          />
          <InfoRow
            label="Instructions"
            value={
              spec.config?.instructions ? (
                <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded block mt-1 whitespace-pre-wrap max-h-24 overflow-auto">
                  {spec.config.instructions.length > 200
                    ? `${spec.config.instructions.substring(0, 200)}...`
                    : spec.config.instructions}
                </span>
              ) : (
                <span className="text-muted-foreground">Not configured</span>
              )
            }
          />
        </CardContent>
      </Card>

      {/* MCP Servers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode className="h-4 w-4 text-mcpserver" />
            MCP Servers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {spec.mcpServers && spec.mcpServers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {spec.mcpServers.map((mcp) => (
                <Badge key={mcp} variant="mcpserver">
                  {mcp}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No MCP servers connected</p>
          )}
        </CardContent>
      </Card>

      {/* Network Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-primary" />
            Network Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow
            label="Expose Agent"
            value={
              spec.agentNetwork?.expose ? (
                <Badge variant="success">Exposed</Badge>
              ) : (
                <Badge variant="secondary">Private</Badge>
              )
            }
          />
          {spec.agentNetwork?.access && spec.agentNetwork.access.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Access List:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {spec.agentNetwork.access.map((peer) => (
                  <Badge key={peer} variant="outline" className="text-xs">
                    {peer}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labels & Annotations */}
      {(metadata.labels || metadata.annotations) && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {metadata.labels && Object.keys(metadata.labels).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Labels</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(metadata.labels).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs font-mono">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {metadata.annotations && Object.keys(metadata.annotations).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Annotations</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(metadata.annotations).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs font-mono">
                      {key}: {value.length > 30 ? `${value.substring(0, 30)}...` : value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
