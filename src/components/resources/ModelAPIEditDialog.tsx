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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { EnvVarEditor } from './shared/EnvVarEditor';
import type { ModelAPI } from '@/types/kubernetes';

interface ModelAPIFormData {
  apiBase: string;
  proxyModel: string;
  configYamlString: string;
  hostedModel: string;
  env: { name: string; value: string }[];
}

interface ModelAPIEditDialogProps {
  modelAPI: ModelAPI;
  open: boolean;
  onClose: () => void;
}

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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelAPIFormData>({
    defaultValues: {
      apiBase: modelAPI.spec.proxyConfig?.apiBase || '',
      proxyModel: modelAPI.spec.proxyConfig?.model || '',
      configYamlString: modelAPI.spec.proxyConfig?.configYaml?.fromString || '',
      hostedModel: modelAPI.spec.hostedConfig?.model || '',
      env: getEnvVars(),
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  useEffect(() => {
    reset({
      apiBase: modelAPI.spec.proxyConfig?.apiBase || '',
      proxyModel: modelAPI.spec.proxyConfig?.model || '',
      configYamlString: modelAPI.spec.proxyConfig?.configYaml?.fromString || '',
      hostedModel: modelAPI.spec.hostedConfig?.model || '',
      env: getEnvVars(),
    });
  }, [modelAPI, reset]);

  const onSubmit = async (data: ModelAPIFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      
      const updatedModelAPI: ModelAPI = {
        ...modelAPI,
        spec: {
          mode: modelAPI.spec.mode,
          proxyConfig: modelAPI.spec.mode === 'Proxy' 
            ? { 
                apiBase: data.apiBase || undefined,
                model: data.proxyModel || undefined,
                configYaml: data.configYamlString ? { fromString: data.configYamlString } : undefined,
                env: envVars.length > 0 ? envVars : undefined 
              }
            : undefined,
          hostedConfig: modelAPI.spec.mode === 'Hosted'
            ? { 
                model: data.hostedModel, 
                env: envVars.length > 0 ? envVars : undefined 
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
              {/* Mode (read-only) */}
              <div className="space-y-2">
                <Label>Mode</Label>
                <div>
                  <Badge variant="secondary">{modelAPI.spec.mode}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mode cannot be changed after creation
                  </p>
                </div>
              </div>

              {/* Proxy Mode Fields */}
              {modelAPI.spec.mode === 'Proxy' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiBase">API Base URL</Label>
                    <Input
                      id="apiBase"
                      {...register('apiBase')}
                      placeholder="e.g., http://host.docker.internal:11434"
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proxyModel">Model</Label>
                    <Input
                      id="proxyModel"
                      {...register('proxyModel')}
                      placeholder="e.g., ollama/smollm2:135m"
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="configYamlString">Advanced: LiteLLM Config YAML</Label>
                    <Textarea
                      id="configYamlString"
                      {...register('configYamlString')}
                      placeholder="# Optional: Full LiteLLM config YAML"
                      className="font-mono text-xs min-h-[100px]"
                    />
                  </div>
                </>
              )}

              {/* Hosted Mode Fields */}
              {modelAPI.spec.mode === 'Hosted' && (
                <div className="space-y-2">
                  <Label htmlFor="hostedModel">Model</Label>
                  <Input
                    id="hostedModel"
                    {...register('hostedModel', { required: 'Model is required for Hosted mode' })}
                    placeholder="e.g., smollm2:135m"
                    className="font-mono"
                  />
                  {errors.hostedModel && (
                    <p className="text-sm text-destructive">{errors.hostedModel.message}</p>
                  )}
                </div>
              )}

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
