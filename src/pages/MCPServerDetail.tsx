import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Server, Edit, Trash2, RefreshCw, Wrench, Info, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { MCPToolsDebug } from '@/components/mcp/MCPToolsDebug';
import { MCPServerOverview } from '@/components/mcp/MCPServerOverview';
import { MCPServerPods } from '@/components/mcp/MCPServerPods';
import { MCPServerEditDialog } from '@/components/resources/MCPServerEditDialog';
import type { MCPServer } from '@/types/kubernetes';

export default function MCPServerDetail() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mcpServers } = useKubernetesStore();
  const { deleteMCPServer, refreshAll, connected } = useKubernetesConnection();
  
  const [mcpServer, setMCPServer] = useState<MCPServer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get initial tab from URL params
  const initialTab = searchParams.get('tab') || 'overview';
  const [currentTab, setCurrentTab] = useState(initialTab);

  // Find MCPServer from store
  useEffect(() => {
    const found = mcpServers.find(
      (m) => m.metadata.name === name && (m.metadata.namespace || 'default') === namespace
    );
    setMCPServer(found || null);
  }, [mcpServers, name, namespace]);

  const handleDelete = async () => {
    if (!mcpServer) return;
    
    setIsDeleting(true);
    try {
      await deleteMCPServer(mcpServer.metadata.name, mcpServer.metadata.namespace);
      toast({
        title: 'MCPServer deleted',
        description: `${mcpServer.metadata.name} has been deleted.`,
      });
      navigate('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete MCPServer',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect to a Kubernetes cluster first.
          </p>
          <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!mcpServer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">MCPServer Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The MCPServer "{name}" in namespace "{namespace}" could not be found.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => refreshAll()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-mcpserver/20 flex items-center justify-center">
                <Server className="h-5 w-5 text-mcpserver" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{mcpServer.metadata.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{mcpServer.metadata.namespace || 'default'}</span>
                  <Badge
                    variant={getStatusVariant(mcpServer.status?.phase)}
                    className="text-xs"
                  >
                    {mcpServer.status?.phase || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete MCPServer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the MCPServer "{mcpServer.metadata.name}".
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container px-4 py-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="pods" className="flex items-center gap-1">
              <Boxes className="h-3 w-3" />
              Pods
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <MCPServerOverview mcpServer={mcpServer} />
          </TabsContent>

          <TabsContent value="tools" className="h-[calc(100vh-240px)]">
            <MCPToolsDebug mcpServer={mcpServer} />
          </TabsContent>

          <TabsContent value="pods" className="space-y-6">
            <MCPServerPods mcpServer={mcpServer} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <MCPServerEditDialog
        mcpServer={mcpServer}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      />
    </div>
  );
}
