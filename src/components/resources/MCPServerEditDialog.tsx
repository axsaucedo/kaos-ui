import React, { useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { EnvVarEditor } from './shared/EnvVarEditor';
import type { MCPServer } from '@/types/kubernetes';

interface MCPServerFormData {
  mcp: string;
  env: { name: string; value: string }[];
}

interface MCPServerEditDialogProps {
  mcpServer: MCPServer;
  open: boolean;
  onClose: () => void;
}

export function MCPServerEditDialog({ mcpServer, open, onClose }: MCPServerEditDialogProps) {
  const { toast } = useToast();
  const { updateMCPServer } = useKubernetesConnection();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MCPServerFormData>({
    defaultValues: {
      mcp: mcpServer.spec.config.mcp || '',
      env: mcpServer.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  useEffect(() => {
    reset({
      mcp: mcpServer.spec.config.mcp || '',
      env: mcpServer.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
    });
  }, [mcpServer, reset]);

  const onSubmit = async (data: MCPServerFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      
      const updatedMCPServer: MCPServer = {
        ...mcpServer,
        spec: {
          type: mcpServer.spec.type,
          config: {
            mcp: data.mcp,
            env: envVars.length > 0 ? envVars : undefined,
          },
        },
      };

      await updateMCPServer(updatedMCPServer);
      
      toast({
        title: 'MCPServer updated',
        description: `Successfully updated MCPServer "${mcpServer.metadata.name}"`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update MCPServer',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-mcpserver/20 flex items-center justify-center">
              <Server className="h-5 w-5 text-mcpserver" />
            </div>
            <div>
              <DialogTitle>Edit MCPServer: {mcpServer.metadata.name}</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {mcpServer.metadata.namespace}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-220px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Type (read-only) */}
              <div className="space-y-2">
                <Label>Type</Label>
                <div>
                  <Badge variant="secondary">{mcpServer.spec.type}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Type cannot be changed after creation
                  </p>
                </div>
              </div>

              {/* MCP Package */}
              <div className="space-y-2">
                <Label htmlFor="mcp">MCP Package</Label>
                <Input
                  id="mcp"
                  {...register('mcp', { required: 'MCP package name is required' })}
                  placeholder="e.g., mcp-server-fetch"
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
