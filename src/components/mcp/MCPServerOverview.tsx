import React from 'react';
import { Server, Package, Code, Globe, Activity, Clock, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeploymentStatusCard } from '@/components/shared/DeploymentStatusCard';
import type { MCPServer } from '@/types/kubernetes';

interface MCPServerOverviewProps {
  mcpServer: MCPServer;
}

export function MCPServerOverview({ mcpServer }: MCPServerOverviewProps) {
  const getStatusVariant = (phase?: string) => {
    switch (phase) {
      case 'Running':
      case 'Ready': return 'success';
      case 'Pending': return 'warning';
      case 'Error':
      case 'Failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const toolsConfig = mcpServer.spec.config.tools;
  const hasPackage = toolsConfig?.fromPackage;
  const hasString = toolsConfig?.fromString;
  const hasSecretRef = toolsConfig?.fromSecretKeyRef;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* General Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-mcpserver" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-mono font-medium">{mcpServer.metadata.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Namespace</span>
              <p className="font-mono font-medium">{mcpServer.metadata.namespace || 'default'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p>
                <Badge variant="secondary">{mcpServer.spec.type}</Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p>
                <Badge variant={getStatusVariant(mcpServer.status?.phase)}>
                  {mcpServer.status?.phase || 'Unknown'}
                </Badge>
              </p>
            </div>
          </div>
          
          {mcpServer.metadata.creationTimestamp && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Created
                </span>
                <p className="font-medium">
                  {new Date(mcpServer.metadata.creationTimestamp).toLocaleString()}
                </p>
              </div>
            </>
          )}

          {mcpServer.metadata.uid && (
            <div className="text-sm">
              <span className="text-muted-foreground">UID</span>
              <p className="font-mono text-xs text-muted-foreground truncate">
                {mcpServer.metadata.uid}
              </p>
            </div>
          )}

          {mcpServer.metadata.resourceVersion && (
            <div className="text-sm">
              <span className="text-muted-foreground">Resource Version</span>
              <p className="font-mono text-xs">{mcpServer.metadata.resourceVersion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-mcpserver" />
            Status Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ready</span>
              <p>
                <Badge variant={mcpServer.status?.ready ? 'success' : 'secondary'}>
                  {mcpServer.status?.ready ? 'Yes' : 'No'}
                </Badge>
              </p>
            </div>
            {mcpServer.status?.availableTools && (
              <div>
                <span className="text-muted-foreground">Tools Count</span>
                <p className="font-medium">{mcpServer.status.availableTools.length}</p>
              </div>
            )}
          </div>
          
          {mcpServer.status?.endpoint && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Endpoint
                </span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1 block overflow-auto">
                  {mcpServer.status.endpoint}
                </code>
              </div>
            </>
          )}

          {mcpServer.status?.message && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Message</span>
                <p className="text-muted-foreground">{mcpServer.status.message}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deployment Status */}
      {mcpServer.status?.deployment && (
        <DeploymentStatusCard 
          deployment={mcpServer.status.deployment} 
          className="md:col-span-2"
        />
      )}

      {/* Tools Configuration */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4 text-mcpserver" />
            Tools Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPackage && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">From Package</span>
                <code className="font-mono text-sm block bg-muted px-2 py-1 rounded mt-1">
                  {toolsConfig!.fromPackage}
                </code>
              </div>
            </div>
          )}
          
          {hasString && (
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground">From Code</span>
                <pre className="font-mono text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-[200px]">
                  {toolsConfig!.fromString}
                </pre>
              </div>
            </div>
          )}

          {hasSecretRef && (
            <div className="flex items-start gap-3">
              <Code className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">From Secret</span>
                <code className="font-mono text-xs block bg-muted px-2 py-1 rounded mt-1">
                  {toolsConfig!.fromSecretKeyRef!.name}:{toolsConfig!.fromSecretKeyRef!.key}
                </code>
              </div>
            </div>
          )}
          
          {!hasPackage && !hasString && !hasSecretRef && (
            <p className="text-sm text-muted-foreground">No tools configured</p>
          )}

          {/* Available Tools List */}
          {mcpServer.status?.availableTools && mcpServer.status.availableTools.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">
                  Available Tools ({mcpServer.status.availableTools.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {mcpServer.status.availableTools.map((tool) => (
                    <Badge key={tool} variant="outline" className="font-mono text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Gateway Route */}
          {mcpServer.spec.gatewayRoute && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">Gateway Route</span>
                <div className="flex gap-4 text-sm">
                  {mcpServer.spec.gatewayRoute.timeout && (
                    <div>
                      <span className="text-muted-foreground">Timeout:</span>{' '}
                      <code className="font-mono">{mcpServer.spec.gatewayRoute.timeout}</code>
                    </div>
                  )}
                  {mcpServer.spec.gatewayRoute.retries !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Retries:</span>{' '}
                      <code className="font-mono">{mcpServer.spec.gatewayRoute.retries}</code>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Environment Variables */}
      {mcpServer.spec.config.env && mcpServer.spec.config.env.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Environment Variables ({mcpServer.spec.config.env.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {mcpServer.spec.config.env.map((envVar, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono text-xs">{envVar.name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground truncate max-w-[300px]">
                        {envVar.value || (envVar.valueFrom ? '<from secret/configmap>' : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Labels & Annotations */}
      {(mcpServer.metadata.labels || mcpServer.metadata.annotations) && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Labels & Annotations
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {mcpServer.metadata.labels && Object.keys(mcpServer.metadata.labels).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Labels</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(mcpServer.metadata.labels).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs font-mono">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {mcpServer.metadata.annotations && Object.keys(mcpServer.metadata.annotations).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Annotations</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(mcpServer.metadata.annotations).map(([key, value]) => (
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
