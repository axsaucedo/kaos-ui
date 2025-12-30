import React from 'react';
import { Server } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MCPServer } from '@/types/kubernetes';

interface MCPServerDetailDrawerProps {
  mcpServer: MCPServer;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

export function MCPServerDetailDrawer({ mcpServer, open, onClose, onEdit }: MCPServerDetailDrawerProps) {
  const getStatusVariant = (phase?: string) => {
    switch (phase) {
      case 'Running': return 'success';
      case 'Pending': return 'warning';
      case 'Error': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-mcpserver/20 flex items-center justify-center">
              <Server className="h-5 w-5 text-mcpserver" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">{mcpServer.metadata.name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {mcpServer.metadata.namespace}
              </SheetDescription>
            </div>
            <Badge variant={getStatusVariant(mcpServer.status?.phase)}>
              {mcpServer.status?.phase || 'Unknown'}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Type */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Type</h3>
              <Badge variant="secondary">{mcpServer.spec.type}</Badge>
            </section>

            <Separator />

            {/* Configuration */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Configuration</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">MCP Package: </span>
                  <code className="text-sm font-mono text-foreground bg-muted/50 px-2 py-0.5 rounded">
                    {mcpServer.spec.config.mcp}
                  </code>
                </div>
              </div>
            </section>

            <Separator />

            {/* Endpoint */}
            {mcpServer.status?.endpoint && (
              <>
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Endpoint</h3>
                  <code className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    {mcpServer.status.endpoint}
                  </code>
                </section>
                <Separator />
              </>
            )}

            {/* Available Tools */}
            {mcpServer.status?.availableTools && mcpServer.status.availableTools.length > 0 && (
              <>
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Available Tools ({mcpServer.status.availableTools.length})
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {mcpServer.status.availableTools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Environment Variables */}
            {mcpServer.spec.config.env && mcpServer.spec.config.env.length > 0 && (
              <>
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Environment Variables ({mcpServer.spec.config.env.length})
                  </h3>
                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-2 font-medium text-muted-foreground">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mcpServer.spec.config.env.map((envVar, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0">
                            <td className="p-2 font-mono text-xs text-foreground">{envVar.name}</td>
                            <td className="p-2 font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                              {envVar.value || (envVar.valueFrom ? '<from secret/configmap>' : '-')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Status Details */}
            {mcpServer.status && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2">Status Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ready</span>
                    <Badge variant={mcpServer.status.ready ? 'success' : 'secondary'}>
                      {mcpServer.status.ready ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {mcpServer.status.message && (
                    <div>
                      <span className="text-muted-foreground">Message: </span>
                      <span className="text-foreground">{mcpServer.status.message}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Metadata */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Metadata</h3>
              <div className="space-y-1 text-sm">
                {mcpServer.metadata.uid && (
                  <div>
                    <span className="text-muted-foreground">UID: </span>
                    <span className="font-mono text-xs text-foreground">{mcpServer.metadata.uid}</span>
                  </div>
                )}
                {mcpServer.metadata.creationTimestamp && (
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    <span className="text-foreground">
                      {new Date(mcpServer.metadata.creationTimestamp).toLocaleString()}
                    </span>
                  </div>
                )}
                {mcpServer.metadata.resourceVersion && (
                  <div>
                    <span className="text-muted-foreground">Resource Version: </span>
                    <span className="font-mono text-xs text-foreground">{mcpServer.metadata.resourceVersion}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button className="flex-1" onClick={onEdit}>
              Edit MCPServer
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
