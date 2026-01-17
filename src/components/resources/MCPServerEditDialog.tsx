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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { EnvVarEditor } from './shared/EnvVarEditor';
import type { MCPServer } from '@/types/kubernetes';

interface MCPServerFormData {
  toolsSource: 'package' | 'string';
  fromPackage: string;
  fromString: string;
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

  const getToolsSource = (): 'package' | 'string' => {
    if (mcpServer.spec.config.tools?.fromString) return 'string';
    return 'package';
  };

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
      toolsSource: getToolsSource(),
      fromPackage: mcpServer.spec.config.tools?.fromPackage || '',
      fromString: mcpServer.spec.config.tools?.fromString || '',
      env: mcpServer.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  const watchedToolsSource = watch('toolsSource');

  useEffect(() => {
    reset({
      toolsSource: getToolsSource(),
      fromPackage: mcpServer.spec.config.tools?.fromPackage || '',
      fromString: mcpServer.spec.config.tools?.fromString || '',
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
            tools: data.toolsSource === 'package'
              ? { fromPackage: data.fromPackage }
              : { fromString: data.fromString },
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

              {/* Tools Configuration */}
              <div className="space-y-2">
                <Label>Tools Source</Label>
                <Tabs value={watchedToolsSource} onValueChange={(v) => setValue('toolsSource', v as 'package' | 'string')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="package">From Package</TabsTrigger>
                    <TabsTrigger value="string">From Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="package" className="space-y-2 mt-4">
                    <Label htmlFor="fromPackage">Package Name</Label>
                    <Input
                      id="fromPackage"
                      {...register('fromPackage', { 
                        required: watchedToolsSource === 'package' ? 'Package name is required' : false 
                      })}
                      placeholder="e.g., mcp-server-calculator"
                      className="font-mono"
                    />
                    {errors.fromPackage && (
                      <p className="text-sm text-destructive">{errors.fromPackage.message}</p>
                    )}
                  </TabsContent>
                  <TabsContent value="string" className="space-y-2 mt-4">
                    <Label htmlFor="fromString">Tool Definition Code</Label>
                    <Textarea
                      id="fromString"
                      {...register('fromString', {
                        required: watchedToolsSource === 'string' ? 'Tool definition is required' : false
                      })}
                      placeholder="# Python code defining MCP tools..."
                      className="font-mono text-xs min-h-[150px]"
                    />
                    {errors.fromString && (
                      <p className="text-sm text-destructive">{errors.fromString.message}</p>
                    )}
                  </TabsContent>
                </Tabs>
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
