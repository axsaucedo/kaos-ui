import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Key, Lock } from 'lucide-react';
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
import { 
  EnvVarEditorWithSecrets, 
  EnvVarEntry, 
  envVarEntriesToK8sEnvVars,
  k8sEnvVarsToEntries,
} from './shared/EnvVarEditorWithSecrets';
import { LabelsAnnotationsEditor } from '@/components/shared/LabelsAnnotationsEditor';
import type { ModelAPI, ModelAPIMode, ApiKeySource } from '@/types/kubernetes';

type ApiKeyType = 'none' | 'value' | 'secretKeyRef' | 'configMapKeyRef';

interface ModelAPIFormData {
  mode: ModelAPIMode;
  models: string;
  apiBase: string;
  apiKeyType: ApiKeyType;
  apiKeyValue: string;
  apiKeySecretName: string;
  apiKeySecretKey: string;
  apiKeyConfigMapName: string;
  apiKeyConfigMapKey: string;
  configYamlString: string;
  hostedModel: string;
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

const getApiKeyType = (apiKey?: ApiKeySource): ApiKeyType => {
  if (!apiKey) return 'none';
  if (apiKey.value) return 'value';
  if (apiKey.valueFrom?.secretKeyRef) return 'secretKeyRef';
  if (apiKey.valueFrom?.configMapKeyRef) return 'configMapKeyRef';
  return 'none';
};

export function ModelAPIEditDialog({ modelAPI, open, onClose }: ModelAPIEditDialogProps) {
  const { toast } = useToast();
  const { updateModelAPI } = useKubernetesConnection();
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);

  const getEnvVars = () => {
    if (modelAPI.spec.mode === 'Proxy') {
      return modelAPI.spec.proxyConfig?.env || [];
    }
    return modelAPI.spec.hostedConfig?.env || [];
  };

  const getDefaultValues = (): ModelAPIFormData => {
    const apiKey = modelAPI.spec.proxyConfig?.apiKey;
    return {
      mode: modelAPI.spec.mode,
      models: modelAPI.spec.proxyConfig?.models?.join('\n') || '*',
      apiBase: modelAPI.spec.proxyConfig?.apiBase || '',
      apiKeyType: getApiKeyType(apiKey),
      apiKeyValue: apiKey?.value || '',
      apiKeySecretName: apiKey?.valueFrom?.secretKeyRef?.name || '',
      apiKeySecretKey: apiKey?.valueFrom?.secretKeyRef?.key || '',
      apiKeyConfigMapName: apiKey?.valueFrom?.configMapKeyRef?.name || '',
      apiKeyConfigMapKey: apiKey?.valueFrom?.configMapKeyRef?.key || '',
      configYamlString: modelAPI.spec.proxyConfig?.configYaml?.fromString || '',
      hostedModel: modelAPI.spec.hostedConfig?.model || '',
      gatewayTimeout: modelAPI.spec.gatewayRoute?.timeout || '',
      gatewayRetries: modelAPI.spec.gatewayRoute?.retries,
      labels: recordToArray(modelAPI.metadata.labels),
      annotations: recordToArray(modelAPI.metadata.annotations),
    };
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
    defaultValues: getDefaultValues(),
  });

  const watchedMode = watch('mode');
  const watchedApiKeyType = watch('apiKeyType');

  useEffect(() => {
    reset(getDefaultValues());
    setEnvVars(k8sEnvVarsToEntries(getEnvVars()));
  }, [modelAPI, reset]);

  const parseModels = (modelsStr: string): string[] => {
    return modelsStr
      .split(/[,\n]/)
      .map(m => m.trim())
      .filter(m => m.length > 0);
  };

  const buildApiKeySource = (data: ModelAPIFormData): ApiKeySource | undefined => {
    switch (data.apiKeyType) {
      case 'value':
        return data.apiKeyValue ? { value: data.apiKeyValue } : undefined;
      case 'secretKeyRef':
        return data.apiKeySecretName && data.apiKeySecretKey
          ? { valueFrom: { secretKeyRef: { name: data.apiKeySecretName, key: data.apiKeySecretKey } } }
          : undefined;
      case 'configMapKeyRef':
        return data.apiKeyConfigMapName && data.apiKeyConfigMapKey
          ? { valueFrom: { configMapKeyRef: { name: data.apiKeyConfigMapName, key: data.apiKeyConfigMapKey } } }
          : undefined;
      default:
        return undefined;
    }
  };

  const onSubmit = async (data: ModelAPIFormData) => {
    try {
      const k8sEnvVars = envVarEntriesToK8sEnvVars(envVars);
      const labels = arrayToRecord(data.labels);
      const annotations = arrayToRecord(data.annotations);
      const models = parseModels(data.models);
      
      if (data.mode === 'Proxy' && models.length === 0) {
        toast({
          title: 'Validation error',
          description: 'At least one model is required for Proxy mode',
          variant: 'destructive',
        });
        return;
      }
      
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
                models,
                apiBase: data.apiBase || undefined,
                apiKey: buildApiKeySource(data),
                configYaml: data.configYamlString ? { fromString: data.configYamlString } : undefined,
                env: k8sEnvVars.length > 0 ? k8sEnvVars : undefined 
              }
            : undefined,
          hostedConfig: data.mode === 'Hosted'
            ? { 
                model: data.hostedModel, 
                env: k8sEnvVars.length > 0 ? k8sEnvVars : undefined 
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
                    <Label htmlFor="models">
                      Models <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="models"
                      {...register('models', { required: 'At least one model is required' })}
                      placeholder="openai/gpt-4o&#10;anthropic/claude-3-sonnet&#10;* (wildcard for all)"
                      className="font-mono text-sm min-h-[80px]"
                    />
                    {errors.models && (
                      <p className="text-sm text-destructive">{errors.models.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      One model per line or comma-separated. Supports wildcards: <code className="bg-muted px-1 rounded">*</code>, <code className="bg-muted px-1 rounded">openai/*</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiBase">API Base URL</Label>
                    <Input
                      id="apiBase"
                      {...register('apiBase')}
                      placeholder="e.g., http://host.docker.internal:11434"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Base URL of the backend LLM API. Set as <code className="bg-muted px-1 rounded">PROXY_API_BASE</code> env var.
                    </p>
                  </div>

                  <Separator />

                  {/* API Key Configuration */}
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Key Configuration
                    </Label>
                    <Select
                      value={watchedApiKeyType}
                      onValueChange={(value: ApiKeyType) => setValue('apiKeyType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select API key source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No API Key</SelectItem>
                        <SelectItem value="value">Direct Value</SelectItem>
                        <SelectItem value="secretKeyRef">From Secret</SelectItem>
                        <SelectItem value="configMapKeyRef">From ConfigMap</SelectItem>
                      </SelectContent>
                    </Select>

                    {watchedApiKeyType === 'value' && (
                      <div className="space-y-2">
                        <Label htmlFor="apiKeyValue" className="text-xs text-muted-foreground">
                          API Key Value
                        </Label>
                        <Input
                          id="apiKeyValue"
                          type="password"
                          {...register('apiKeyValue')}
                          placeholder="sk-..."
                          className="font-mono"
                        />
                        <p className="text-xs text-warning flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Not recommended for production - use Secret reference instead
                        </p>
                      </div>
                    )}

                    {watchedApiKeyType === 'secretKeyRef' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="apiKeySecretName" className="text-xs text-muted-foreground">
                            Secret Name
                          </Label>
                          <Input
                            id="apiKeySecretName"
                            {...register('apiKeySecretName')}
                            placeholder="api-secrets"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apiKeySecretKey" className="text-xs text-muted-foreground">
                            Secret Key
                          </Label>
                          <Input
                            id="apiKeySecretKey"
                            {...register('apiKeySecretKey')}
                            placeholder="api-key"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {watchedApiKeyType === 'configMapKeyRef' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="apiKeyConfigMapName" className="text-xs text-muted-foreground">
                            ConfigMap Name
                          </Label>
                          <Input
                            id="apiKeyConfigMapName"
                            {...register('apiKeyConfigMapName')}
                            placeholder="api-config"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apiKeyConfigMapKey" className="text-xs text-muted-foreground">
                            ConfigMap Key
                          </Label>
                          <Input
                            id="apiKeyConfigMapKey"
                            {...register('apiKeyConfigMapKey')}
                            placeholder="api-key"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Set as <code className="bg-muted px-1 rounded">PROXY_API_KEY</code> env var for LiteLLM config.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="configYamlString">Advanced: LiteLLM Config YAML</Label>
                    <Textarea
                      id="configYamlString"
                      {...register('configYamlString')}
                      placeholder="# Optional: Full LiteLLM config YAML"
                      className="font-mono text-xs min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      When provided, this config is used directly. Models list is still required for Agent validation.
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

              {/* Environment Variables with Secrets */}
              <EnvVarEditorWithSecrets
                fields={envVars}
                onChange={setEnvVars}
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
