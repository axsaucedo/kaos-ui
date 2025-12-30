import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Server } from 'lucide-react';
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
import type { MCPServer, MCPServerType } from '@/types/kubernetes';

interface MCPServerFormData {
  name: string;
  type: MCPServerType;
  mcp: string;
  env: { name: string; value: string }[];
}

interface MCPServerCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MCPServerCreateDialog({ open, onClose }: MCPServerCreateDialogProps) {
  const { toast } = useToast();
  const { mcpServers } = useKubernetesStore();
  const { namespace, createMCPServer } = useKubernetesConnection();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MCPServerFormData>({
    defaultValues: {
      name: '',
      type: 'python-runtime',
      mcp: '',
      env: [],
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  const watchedType = watch('type');

  const validateUniqueName = (name: string) => {
    if (mcpServers.some((server) => server.metadata.name === name)) {
      return 'An MCPServer with this name already exists';
    }
    return true;
  };

  const onSubmit = async (data: MCPServerFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      
      const newMCPServer: MCPServer = {
        apiVersion: 'ethical.institute/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: data.name,
          namespace: namespace || 'default',
        },
        spec: {
          type: data.type,
          config: {
            mcp: data.mcp,
            env: envVars.length > 0 ? envVars : undefined,
          },
        },
      };

      await createMCPServer(newMCPServer);
      
      toast({
        title: 'MCPServer created',
        description: `Successfully created MCPServer "${data.name}"`,
      });
      
      reset();
      onClose();
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create MCPServer',
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
            <div className="h-10 w-10 rounded-lg bg-mcpserver/20 flex items-center justify-center">
              <Server className="h-5 w-5 text-mcpserver" />
            </div>
            <div>
              <DialogTitle>Create MCPServer</DialogTitle>
              <DialogDescription>
                Create a new MCP Server for tool integration
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
                  placeholder="my-mcp-server"
                  className="font-mono"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={watchedType}
                  onValueChange={(value: MCPServerType) => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select runtime type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python-runtime">
                      Python Runtime
                    </SelectItem>
                    <SelectItem value="node-runtime">
                      Node.js Runtime
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {watchedType === 'python-runtime' 
                    ? 'Uses Python to run MCP server packages (uvx)'
                    : 'Uses Node.js to run MCP server packages (npx)'
                  }
                </p>
              </div>

              {/* MCP Package */}
              <div className="space-y-2">
                <Label htmlFor="mcp">MCP Package</Label>
                <Input
                  id="mcp"
                  {...register('mcp', { required: 'MCP package name is required' })}
                  placeholder={watchedType === 'python-runtime' ? 'e.g., mcp-server-fetch' : 'e.g., @anthropic/mcp-server-github'}
                  className="font-mono"
                />
                {errors.mcp && (
                  <p className="text-sm text-destructive">{errors.mcp.message}</p>
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
              {isSubmitting ? 'Creating...' : 'Create MCPServer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
