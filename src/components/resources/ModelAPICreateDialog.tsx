import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Plus, Trash2, Key, Lock } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { 
  EnvVarEditorWithSecrets, 
  EnvVarEntry, 
  envVarEntriesToK8sEnvVars 
} from './shared/EnvVarEditorWithSecrets';
import { validateKubernetesName } from './shared/EnvVarEditor';
import type { ModelAPI, ModelAPIMode, ApiKeySource } from '@/types/kubernetes';

type ApiKeyType = 'none' | 'value' | 'secretKeyRef' | 'configMapKeyRef';

interface ModelAPIFormData {
  name: string;
  mode: ModelAPIMode;
  // Proxy mode fields
  models: string;
  apiBase: string;
  apiKeyType: ApiKeyType;
  apiKeyValue: string;
  apiKeySecretName: string;
  apiKeySecretKey: string;
  apiKeyConfigMapName: string;
  apiKeyConfigMapKey: string;
  configYamlString: string;
  // Hosted mode fields
  hostedModel: string;
}

interface ModelAPICreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ModelAPICreateDialog({ open, onClose }: ModelAPICreateDialogProps) {
  const { toast } = useToast();
  const { modelAPIs } = useKubernetesStore();
  const { namespace, createModelAPI } = useKubernetesConnection();
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelAPIFormData>({
    defaultValues: {
      name: '',
      mode: 'Proxy',
      models: '*',
      apiBase: '',
      apiKeyType: 'none',
      apiKeyValue: '',
      apiKeySecretName: '',
      apiKeySecretKey: '',
      apiKeyConfigMapName: '',
      apiKeyConfigMapKey: '',
      configYamlString: '',
      hostedModel: '',
    },
  });

  const watchedMode = watch('mode');
  const watchedApiKeyType = watch('apiKeyType');

  const validateUniqueName = (name: string) => {
    if (modelAPIs.some((api) => api.metadata.name === name)) {
      return 'A ModelAPI with this name already exists';
    }
    return true;
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

  const parseModels = (modelsStr: string): string[] => {
    return modelsStr
      .split(/[,\n]/)
      .map(m => m.trim())
      .filter(m => m.length > 0);
  };

  const onSubmit = async (data: ModelAPIFormData) => {
    try {
      const k8sEnvVars = envVarEntriesToK8sEnvVars(envVars);
      const models = parseModels(data.models);
      
      if (data.mode === 'Proxy' && models.length === 0) {
        toast({
          title: 'Validation error',
          description: 'At least one model is required for Proxy mode',
          variant: 'destructive',
        });
        return;
      }
      
      const newModelAPI: ModelAPI = {
        apiVersion: 'kaos.tools/v1alpha1',
        kind: 'ModelAPI',
        metadata: {
          name: data.name,
          namespace: namespace || 'default',
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
        },
      };

      await createModelAPI(newModelAPI);
      
      toast({
        title: 'ModelAPI created',
        description: `Successfully created ModelAPI "${data.name}"`,
      });
      
      reset();
      setEnvVars([]);
      onClose();
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create ModelAPI',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    reset();
    setEnvVars([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-modelapi/20 flex items-center justify-center">
              <Box className="h-5 w-5 text-modelapi" />
            </div>
            <div>
              <DialogTitle>Create ModelAPI</DialogTitle>
              <DialogDescription>
                Create a new Model API endpoint for LLM access
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
                  placeholder="my-model-api"
                  className="font-mono"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

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
                    <SelectItem value="Proxy">
                      Proxy (LiteLLM)
                    </SelectItem>
                    <SelectItem value="Hosted">
                      Hosted (Ollama)
                    </SelectItem>
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
                      placeholder="# Optional: Full LiteLLM config YAML for advanced multi-model routing"
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
                    {...register('hostedModel', { 
                      required: watchedMode === 'Hosted' ? 'Model is required for Hosted mode' : false 
                    })}
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

              {/* Environment Variables with Secrets */}
              <EnvVarEditorWithSecrets
                fields={envVars}
                onChange={setEnvVars}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create ModelAPI'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
