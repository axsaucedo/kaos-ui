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
import { Separator } from '@/components/ui/separator';
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
import { LabelsAnnotationsEditor } from '@/components/shared/LabelsAnnotationsEditor';
import type { Agent } from '@/types/kubernetes';

interface AgentFormData {
  description: string;
  instructions: string;
  modelAPI: string;
  mcpServers: string[];
  networkExpose: boolean;
  networkAccess: string[];
  reasoningLoopMaxSteps: number | undefined;
  waitForDependencies: boolean;
  gatewayTimeout: string;
  gatewayRetries: number | undefined;
  env: { name: string; value: string }[];
  labels: { key: string; value: string }[];
  annotations: { key: string; value: string }[];
}

interface AgentEditDialogProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
}

const recordToArray = (record?: Record<string, string>) =>
  record ? Object.entries(record).map(([key, value]) => ({ key, value })) : [];

const arrayToRecord = (arr: { key: string; value: string }[]) =>
  arr.filter(item => item.key).reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});

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
      description: agent.spec.config?.description || '',
      instructions: agent.spec.config?.instructions || '',
      modelAPI: agent.spec.modelAPI || '',
      mcpServers: agent.spec.mcpServers || [],
      networkExpose: agent.spec.agentNetwork?.expose || false,
      networkAccess: agent.spec.agentNetwork?.access || [],
      reasoningLoopMaxSteps: agent.spec.config?.reasoningLoopMaxSteps,
      waitForDependencies: agent.spec.waitForDependencies || false,
      gatewayTimeout: agent.spec.gatewayRoute?.timeout || '',
      gatewayRetries: agent.spec.gatewayRoute?.retries,
      env: agent.spec.config?.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
      labels: recordToArray(agent.metadata.labels),
      annotations: recordToArray(agent.metadata.annotations),
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
  const watchedWaitForDependencies = watch('waitForDependencies');

  useEffect(() => {
    reset({
      description: agent.spec.config?.description || '',
      instructions: agent.spec.config?.instructions || '',
      modelAPI: agent.spec.modelAPI || '',
      mcpServers: agent.spec.mcpServers || [],
      networkExpose: agent.spec.agentNetwork?.expose || false,
      networkAccess: agent.spec.agentNetwork?.access || [],
      reasoningLoopMaxSteps: agent.spec.config?.reasoningLoopMaxSteps,
      waitForDependencies: agent.spec.waitForDependencies || false,
      gatewayTimeout: agent.spec.gatewayRoute?.timeout || '',
      gatewayRetries: agent.spec.gatewayRoute?.retries,
      env: agent.spec.config?.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
      labels: recordToArray(agent.metadata.labels),
      annotations: recordToArray(agent.metadata.annotations),
    });
  }, [agent, reset]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      const labels = arrayToRecord(data.labels);
      const annotations = arrayToRecord(data.annotations);
      
      const updatedAgent: Agent = {
        ...agent,
        metadata: {
          ...agent.metadata,
          labels: Object.keys(labels).length > 0 ? labels : undefined,
          annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
        },
        spec: {
          modelAPI: data.modelAPI,
          mcpServers: data.mcpServers.length > 0 ? data.mcpServers : undefined,
          agentNetwork: {
            expose: data.networkExpose,
            access: data.networkAccess.length > 0 ? data.networkAccess : undefined,
          },
          waitForDependencies: data.waitForDependencies || undefined,
          gatewayRoute: (data.gatewayTimeout || data.gatewayRetries)
            ? {
                timeout: data.gatewayTimeout || undefined,
                retries: data.gatewayRetries || undefined,
              }
            : undefined,
          config: {
            description: data.description || undefined,
            instructions: data.instructions || undefined,
            reasoningLoopMaxSteps: data.reasoningLoopMaxSteps || undefined,
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
                  {...register('description')}
                  placeholder="Agent description"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  {...register('instructions')}
                  placeholder="Agent instructions and behavior..."
                  rows={4}
                />
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

              <Separator />

              {/* Reasoning Loop Settings */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Reasoning Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reasoningLoopMaxSteps" className="text-xs text-muted-foreground">
                      Max Reasoning Steps
                    </Label>
                    <Input
                      id="reasoningLoopMaxSteps"
                      type="number"
                      min={1}
                      max={20}
                      {...register('reasoningLoopMaxSteps', { valueAsNumber: true })}
                      placeholder="Default: 5"
                      className="font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Max iterations before stopping (1-20)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Wait for Dependencies</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={watchedWaitForDependencies}
                        onCheckedChange={(checked) => setValue('waitForDependencies', checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {watchedWaitForDependencies ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Wait for ModelAPI and MCPServers to be ready
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Agent Network */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Agent Network</Label>
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

              <Separator />

              {/* Gateway Route */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Gateway Route Settings</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gatewayTimeout" className="text-xs text-muted-foreground">
                      Timeout
                    </Label>
                    <Input
                      id="gatewayTimeout"
                      {...register('gatewayTimeout')}
                      placeholder="e.g., 30s, 5m"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gatewayRetries" className="text-xs text-muted-foreground">
                      Retries
                    </Label>
                    <Input
                      id="gatewayRetries"
                      type="number"
                      min={0}
                      max={10}
                      {...register('gatewayRetries', { valueAsNumber: true })}
                      placeholder="e.g., 3"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

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

              <Separator />

              {/* Labels & Annotations */}
              <LabelsAnnotationsEditor
                control={control}
                register={register}
                labelsFieldName="labels"
                annotationsFieldName="annotations"
              />
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
