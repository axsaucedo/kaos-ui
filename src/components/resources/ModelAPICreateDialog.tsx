import React from 'react';
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
import type { ModelAPI, ModelAPIMode } from '@/types/kubernetes';

interface ModelAPIFormData {
  name: string;
  mode: ModelAPIMode;
  model: string;
  env: { name: string; value: string }[];
}

interface ModelAPICreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ModelAPICreateDialog({ open, onClose }: ModelAPICreateDialogProps) {
  const { toast } = useToast();
  const { modelAPIs } = useKubernetesStore();
  const { namespace, createModelAPI } = useKubernetesConnection();

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
      name: '',
      mode: 'Proxy',
      model: '',
      env: [],
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  const watchedMode = watch('mode');

  const validateUniqueName = (name: string) => {
    if (modelAPIs.some((api) => api.metadata.name === name)) {
      return 'A ModelAPI with this name already exists';
    }
    return true;
  };

  const onSubmit = async (data: ModelAPIFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      
      const newModelAPI: ModelAPI = {
        apiVersion: 'ethical.institute/v1alpha1',
        kind: 'ModelAPI',
        metadata: {
          name: data.name,
          namespace: namespace || 'default',
        },
        spec: {
          mode: data.mode,
          proxyConfig: data.mode === 'Proxy' 
            ? { env: envVars.length > 0 ? envVars : undefined }
            : undefined,
          serverConfig: data.mode === 'Hosted'
            ? { 
                model: data.model, 
                env: envVars.length > 0 ? envVars : undefined 
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
                      Hosted (vLLM)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {watchedMode === 'Proxy' 
                    ? 'Proxy mode forwards requests to external LLM providers via LiteLLM'
                    : 'Hosted mode runs a local vLLM server with the specified model'
                  }
                </p>
              </div>

              {/* Model (only for Hosted mode) */}
              {watchedMode === 'Hosted' && (
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    {...register('model', { 
                      required: watchedMode === 'Hosted' ? 'Model is required for Hosted mode' : false 
                    })}
                    placeholder="e.g., meta-llama/Llama-3.1-8B-Instruct"
                    className="font-mono"
                  />
                  {errors.model && (
                    <p className="text-sm text-destructive">{errors.model.message}</p>
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
