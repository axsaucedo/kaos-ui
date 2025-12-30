import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Bot, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import type { Agent, EnvVar } from '@/types/kubernetes';

interface AgentFormData {
  description: string;
  instructions: string;
  modelAPI: string;
  mcpServers: string[];
  networkExpose: boolean;
  networkAccess: string[];
  env: { name: string; value: string }[];
}

interface AgentEditDialogProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
}

export function AgentEditDialog({ agent, open, onClose }: AgentEditDialogProps) {
  const { toast } = useToast();
  const { modelAPIs, mcpServers, agents } = useKubernetesStore();
  const { updateAgent } = useKubernetesConnection();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormData>({
    defaultValues: {
      description: agent.spec.config.description || '',
      instructions: agent.spec.config.instructions || '',
      modelAPI: agent.spec.modelAPI || '',
      mcpServers: agent.spec.mcpServers || [],
      networkExpose: agent.spec.agentNetwork?.expose || false,
      networkAccess: agent.spec.agentNetwork?.access || [],
      env: agent.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  const watchedModelAPI = watch('modelAPI');
  const watchedMcpServers = watch('mcpServers');
  const watchedNetworkExpose = watch('networkExpose');
  const watchedNetworkAccess = watch('networkAccess');

  useEffect(() => {
    reset({
      description: agent.spec.config.description || '',
      instructions: agent.spec.config.instructions || '',
      modelAPI: agent.spec.modelAPI || '',
      mcpServers: agent.spec.mcpServers || [],
      networkExpose: agent.spec.agentNetwork?.expose || false,
      networkAccess: agent.spec.agentNetwork?.access || [],
      env: agent.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
    });
  }, [agent, reset]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      const updatedAgent: Agent = {
        ...agent,
        spec: {
          modelAPI: data.modelAPI,
          mcpServers: data.mcpServers.length > 0 ? data.mcpServers : undefined,
          agentNetwork: {
            expose: data.networkExpose,
            access: data.networkAccess.length > 0 ? data.networkAccess : undefined,
          },
          config: {
            description: data.description,
            instructions: data.instructions,
            env: data.env.length > 0 
              ? data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }))
              : undefined,
          },
        },
      };

      await updateAgent(updatedAgent);
      
      toast({
        title: 'Agent updated',
        description: `Successfully updated agent "${agent.metadata.name}"`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update agent',
        variant: 'destructive',
      });
    }
  };

  const otherAgents = agents.filter((a) => a.metadata.name !== agent.metadata.name);

  const toggleMcpServer = (serverName: string) => {
    const current = watchedMcpServers || [];
    if (current.includes(serverName)) {
      setValue('mcpServers', current.filter((s) => s !== serverName));
    } else {
      setValue('mcpServers', [...current, serverName]);
    }
  };

  const toggleNetworkAccess = (agentName: string) => {
    const current = watchedNetworkAccess || [];
    if (current.includes(agentName)) {
      setValue('networkAccess', current.filter((a) => a !== agentName));
    } else {
      setValue('networkAccess', [...current, agentName]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-agent/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-agent" />
            </div>
            <div>
              <DialogTitle>Edit Agent: {agent.metadata.name}</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {agent.metadata.namespace}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-220px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  {...register('description', { required: 'Description is required' })}
                  placeholder="Agent description"
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  {...register('instructions', { required: 'Instructions are required' })}
                  placeholder="Agent instructions and behavior..."
                  rows={4}
                />
                {errors.instructions && (
                  <p className="text-sm text-destructive">{errors.instructions.message}</p>
                )}
              </div>

              {/* Model API */}
              <div className="space-y-2">
                <Label>Model API</Label>
                <Select
                  value={watchedModelAPI}
                  onValueChange={(value) => setValue('modelAPI', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Model API" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelAPIs.map((api) => (
                      <SelectItem key={api.metadata.name} value={api.metadata.name}>
                        {api.metadata.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* MCP Servers */}
              {mcpServers.length > 0 && (
                <div className="space-y-2">
                  <Label>MCP Servers</Label>
                  <div className="flex flex-wrap gap-2">
                    {mcpServers.map((server) => (
                      <Button
                        key={server.metadata.name}
                        type="button"
                        variant={watchedMcpServers?.includes(server.metadata.name) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleMcpServer(server.metadata.name)}
                      >
                        {server.metadata.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Network */}
              <div className="space-y-4">
                <Label>Agent Network</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expose Agent</span>
                  <Switch
                    checked={watchedNetworkExpose}
                    onCheckedChange={(checked) => setValue('networkExpose', checked)}
                  />
                </div>
                
                {otherAgents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Peer Access</span>
                    <div className="flex flex-wrap gap-2">
                      {otherAgents.map((a) => (
                        <Button
                          key={a.metadata.name}
                          type="button"
                          variant={watchedNetworkAccess?.includes(a.metadata.name) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleNetworkAccess(a.metadata.name)}
                        >
                          {a.metadata.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Environment Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Environment Variables</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendEnv({ name: '', value: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {envFields.length > 0 && (
                  <div className="space-y-2">
                    {envFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          {...register(`env.${index}.name` as const)}
                          placeholder="NAME"
                          className="font-mono text-sm"
                        />
                        <Input
                          {...register(`env.${index}.value` as const)}
                          placeholder="value"
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEnv(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
