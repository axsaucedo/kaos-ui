import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Box } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { EnvVarEditor } from './shared/EnvVarEditor';
import { GatewayRouteEditor } from '@/components/shared/GatewayRouteEditor';
import { LabelsAnnotationsEditor } from '@/components/shared/LabelsAnnotationsEditor';
import type { ModelAPI, ModelAPIMode } from '@/types/kubernetes';

interface ModelAPIFormData {
  mode: ModelAPIMode;
  apiBase: string;
  proxyModel: string;
  configYamlString: string;
  hostedModel: string;
  env: { name: string; value: string }[];
  gatewayTimeout: string;
  gatewayRetries: number | undefined;
  labels: { key: string; value: string }[];
  annotations: { key: string; value: string }[];
}

interface ModelAPIEditDialogProps {
  modelAPI: ModelAPI;
  open: boolean;
  onClose: () => void;
}

const recordToArray = (record?: Record<string, string>) =>
  record ? Object.entries(record).map(([key, value]) => ({ key, value })) : [];

const arrayToRecord = (arr: { key: string; value: string }[]) =>
  arr.filter(item => item.key).reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});

export function ModelAPIEditDialog({ modelAPI, open, onClose }: ModelAPIEditDialogProps) {
  const { toast } = useToast();
  const { updateModelAPI } = useKubernetesConnection();

  const getEnvVars = () => {
    if (modelAPI.spec.mode === 'Proxy') {
      return modelAPI.spec.proxyConfig?.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [];
    }
    return modelAPI.spec.hostedConfig?.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [];
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelAPIFormData>({
    defaultValues: {
      mode: modelAPI.spec.mode,
      apiBase: modelAPI.spec.proxyConfig?.apiBase || '',
      proxyModel: modelAPI.spec.proxyConfig?.model || '',
      configYamlString: modelAPI.spec.proxyConfig?.configYaml?.fromString || '',
      hostedModel: modelAPI.spec.hostedConfig?.model || '',
      env: getEnvVars(),
      gatewayTimeout: modelAPI.spec.gatewayRoute?.timeout || '',
      gatewayRetries: modelAPI.spec.gatewayRoute?.retries,
      labels: recordToArray(modelAPI.metadata.labels),
      annotations: recordToArray(modelAPI.metadata.annotations),
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  const watchedMode = watch('mode');

  useEffect(() => {
    reset({
      mode: modelAPI.spec.mode,
      apiBase: modelAPI.spec.proxyConfig?.apiBase || '',
      proxyModel: modelAPI.spec.proxyConfig?.model || '',
      configYamlString: modelAPI.spec.proxyConfig?.configYaml?.fromString || '',
      hostedModel: modelAPI.spec.hostedConfig?.model || '',
      env: getEnvVars(),
      gatewayTimeout: modelAPI.spec.gatewayRoute?.timeout || '',
      gatewayRetries: modelAPI.spec.gatewayRoute?.retries,
      labels: recordToArray(modelAPI.metadata.labels),
      annotations: recordToArray(modelAPI.metadata.annotations),
    });
  }, [modelAPI, reset]);

  const onSubmit = async (data: ModelAPIFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      const labels = arrayToRecord(data.labels);
      const annotations = arrayToRecord(data.annotations);
      
      const updatedModelAPI: ModelAPI = {
        ...modelAPI,
        metadata: {
          ...modelAPI.metadata,
          labels: Object.keys(labels).length > 0 ? labels : undefined,
          annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
        },
        spec: {
          mode: data.mode,
          proxyConfig: data.mode === 'Proxy' 
            ? { 
                apiBase: data.apiBase || undefined,
                model: data.proxyModel || undefined,
                configYaml: data.configYamlString ? { fromString: data.configYamlString } : undefined,
                env: envVars.length > 0 ? envVars : undefined 
              }
            : undefined,
          hostedConfig: data.mode === 'Hosted'
            ? { 
                model: data.hostedModel, 
                env: envVars.length > 0 ? envVars : undefined 
              }
            : undefined,
          gatewayRoute: (data.gatewayTimeout || data.gatewayRetries)
            ? {
                timeout: data.gatewayTimeout || undefined,
                retries: data.gatewayRetries || undefined,
              }
            : undefined,
        },
      };

      await updateModelAPI(updatedModelAPI);
      
      toast({
        title: 'ModelAPI updated',
        description: `Successfully updated ModelAPI "${modelAPI.metadata.name}"`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update ModelAPI',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-modelapi/20 flex items-center justify-center">
              <Box className="h-5 w-5 text-modelapi" />
            </div>
            <div>
              <DialogTitle>Edit ModelAPI: {modelAPI.metadata.name}</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {modelAPI.metadata.namespace}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-220px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Mode */}
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={watchedMode}
                  onValueChange={(value: ModelAPIMode) => setValue('mode', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Proxy">Proxy (LiteLLM)</SelectItem>
                    <SelectItem value="Hosted">Hosted (Ollama)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {watchedMode === 'Proxy' 
                    ? 'Proxy mode forwards requests to external LLM providers via LiteLLM'
                    : 'Hosted mode runs an Ollama server with the specified model in-cluster'
                  }
                </p>
              </div>

              {/* Proxy Mode Fields */}
              {watchedMode === 'Proxy' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiBase">API Base URL</Label>
                    <Input
                      id="apiBase"
                      {...register('apiBase')}
                      placeholder="e.g., http://host.docker.internal:11434"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Base URL of the backend LLM API to proxy to
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proxyModel">Model</Label>
                    <Input
                      id="proxyModel"
                      {...register('proxyModel')}
                      placeholder="e.g., ollama/smollm2:135m"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Model identifier to proxy (uses LiteLLM format)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="configYamlString">Advanced: LiteLLM Config YAML</Label>
                    <Textarea
                      id="configYamlString"
                      {...register('configYamlString')}
                      placeholder="# Optional: Full LiteLLM config YAML"
                      className="font-mono text-xs min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      If provided, API Base and Model are ignored
                    </p>
                  </div>
                </>
              )}

              {/* Hosted Mode Fields */}
              {watchedMode === 'Hosted' && (
                <div className="space-y-2">
                  <Label htmlFor="hostedModel">Model</Label>
                  <Input
                    id="hostedModel"
                    {...register('hostedModel', { required: watchedMode === 'Hosted' ? 'Model is required for Hosted mode' : false })}
                    placeholder="e.g., smollm2:135m"
                    className="font-mono"
                  />
                  {errors.hostedModel && (
                    <p className="text-sm text-destructive">{errors.hostedModel.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Ollama model to run in the cluster
                  </p>
                </div>
              )}

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
              <EnvVarEditor
                fields={envFields}
                register={register}
                append={appendEnv}
                remove={removeEnv}
                fieldPrefix="env"
              />

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
