import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Bot } from 'lucide-react';
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
import { EnvVarEditor, validateKubernetesName } from './shared/EnvVarEditor';
import type { Agent } from '@/types/kubernetes';

interface AgentFormData {
  name: string;
  description: string;
  instructions: string;
  modelAPI: string;
  mcpServers: string[];
  networkExpose: boolean;
  networkAccess: string[];
  env: { name: string; value: string }[];
}

interface AgentCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AgentCreateDialog({ open, onClose }: AgentCreateDialogProps) {
  const { toast } = useToast();
  const { modelAPIs, mcpServers, agents } = useKubernetesStore();
  const { namespace, createAgent } = useKubernetesConnection();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormData>({
    defaultValues: {
      name: '',
      description: '',
      instructions: '',
      modelAPI: '',
      mcpServers: [],
      networkExpose: false,
      networkAccess: [],
      env: [],
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

  const validateUniqueName = (name: string) => {
    if (agents.some((agent) => agent.metadata.name === name)) {
      return 'An Agent with this name already exists';
    }
    return true;
  };

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

  const onSubmit = async (data: AgentFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      
      const newAgent: Agent = {
        apiVersion: 'ethical.institute/v1alpha1',
        kind: 'Agent',
        metadata: {
          name: data.name,
          namespace: namespace || 'default',
        },
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
            env: envVars.length > 0 ? envVars : undefined,
          },
        },
      };

      await createAgent(newAgent);
      
      toast({
        title: 'Agent created',
        description: `Successfully created Agent "${data.name}"`,
      });
      
      reset();
      onClose();
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create Agent',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-agent/20 flex items-center justify-center">
              <Bot className="h-5 w-5 text-agent" />
            </div>
            <div>
              <DialogTitle>Create Agent</DialogTitle>
              <DialogDescription>
                Create a new AI Agent with LLM and tool access
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-220px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...register('name', { 
                    required: 'Name is required',
                    validate: (value) => {
                      const k8sValidation = validateKubernetesName(value);
                      if (k8sValidation !== true) return k8sValidation;
                      return validateUniqueName(value);
                    },
                  })}
                  placeholder="my-agent"
                  className="font-mono"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

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
                {modelAPIs.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No Model APIs available. Create one first.
                  </p>
                )}
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
                
                {agents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Peer Access</span>
                    <div className="flex flex-wrap gap-2">
                      {agents.map((a) => (
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
              <EnvVarEditor
                fields={envFields}
                register={register}
                append={appendEnv}
                remove={removeEnv}
                fieldPrefix="env"
              />
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
