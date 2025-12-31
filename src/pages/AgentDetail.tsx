import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Edit, Trash2, RefreshCw } from 'lucide-react';
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
import { AgentChat } from '@/components/agent/AgentChat';
import { AgentOverview } from '@/components/agent/AgentOverview';
import { AgentMemory } from '@/components/agent/AgentMemory';
import { AgentEditDialog } from '@/components/resources/AgentEditDialog';
import type { Agent } from '@/types/kubernetes';

export default function AgentDetail() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { agents } = useKubernetesStore();
  const { deleteAgent, refreshAll, connected } = useKubernetesConnection();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find agent from store
  useEffect(() => {
    const found = agents.find(
      (a) => a.metadata.name === name && (a.metadata.namespace || 'default') === namespace
    );
    setAgent(found || null);
  }, [agents, name, namespace]);

  const handleDelete = async () => {
    if (!agent) return;
    
    setIsDeleting(true);
    try {
      await deleteAgent(agent.metadata.name, agent.metadata.namespace);
      toast({
        title: 'Agent deleted',
        description: `${agent.metadata.name} has been deleted.`,
      });
      navigate('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete agent',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsDeleting(false);
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

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The agent "{name}" in namespace "{namespace}" could not be found.
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
              <div className="h-10 w-10 rounded-lg bg-agent/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-agent" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{agent.metadata.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{agent.metadata.namespace || 'default'}</span>
                  <Badge
                    variant={agent.status?.phase === 'Running' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {agent.status?.phase || 'Unknown'}
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
                  <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the agent "{agent.metadata.name}".
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
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AgentOverview agent={agent} />
          </TabsContent>

          <TabsContent value="chat" className="h-[calc(100vh-240px)]">
            <AgentChat agent={agent} />
          </TabsContent>

          <TabsContent value="memory" className="space-y-6">
            <AgentMemory agent={agent} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <AgentEditDialog
        agent={agent}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      />
    </div>
  );
}
