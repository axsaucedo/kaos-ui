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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { LabelsAnnotationsEditor } from '@/components/shared/LabelsAnnotationsEditor';
import type { MCPServer, MCPServerType } from '@/types/kubernetes';

interface MCPServerFormData {
  type: MCPServerType;
  toolsSource: 'package' | 'string';
  fromPackage: string;
  fromString: string;
  env: { name: string; value: string }[];
  gatewayTimeout: string;
  gatewayRetries: number | undefined;
  labels: { key: string; value: string }[];
  annotations: { key: string; value: string }[];
}

interface MCPServerEditDialogProps {
  mcpServer: MCPServer;
  open: boolean;
  onClose: () => void;
}

const recordToArray = (record?: Record<string, string>) =>
  record ? Object.entries(record).map(([key, value]) => ({ key, value })) : [];

const arrayToRecord = (arr: { key: string; value: string }[]) =>
  arr.filter(item => item.key).reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});

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
      type: mcpServer.spec.type,
      toolsSource: getToolsSource(),
      fromPackage: mcpServer.spec.config.tools?.fromPackage || '',
      fromString: mcpServer.spec.config.tools?.fromString || '',
      env: mcpServer.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
      gatewayTimeout: mcpServer.spec.gatewayRoute?.timeout || '',
      gatewayRetries: mcpServer.spec.gatewayRoute?.retries,
      labels: recordToArray(mcpServer.metadata.labels),
      annotations: recordToArray(mcpServer.metadata.annotations),
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control,
    name: 'env',
  });

  const watchedType = watch('type');
  const watchedToolsSource = watch('toolsSource');

  useEffect(() => {
    reset({
      type: mcpServer.spec.type,
      toolsSource: getToolsSource(),
      fromPackage: mcpServer.spec.config.tools?.fromPackage || '',
      fromString: mcpServer.spec.config.tools?.fromString || '',
      env: mcpServer.spec.config.env?.map((e) => ({ name: e.name, value: e.value || '' })) || [],
      gatewayTimeout: mcpServer.spec.gatewayRoute?.timeout || '',
      gatewayRetries: mcpServer.spec.gatewayRoute?.retries,
      labels: recordToArray(mcpServer.metadata.labels),
      annotations: recordToArray(mcpServer.metadata.annotations),
    });
  }, [mcpServer, reset]);

  const onSubmit = async (data: MCPServerFormData) => {
    try {
      const envVars = data.env.filter((e) => e.name).map((e) => ({ name: e.name, value: e.value }));
      const labels = arrayToRecord(data.labels);
      const annotations = arrayToRecord(data.annotations);
      
      const updatedMCPServer: MCPServer = {
        ...mcpServer,
        metadata: {
          ...mcpServer.metadata,
          labels: Object.keys(labels).length > 0 ? labels : undefined,
          annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
        },
        spec: {
          type: data.type,
          config: {
            tools: data.toolsSource === 'package'
              ? { fromPackage: data.fromPackage }
              : { fromString: data.fromString },
            env: envVars.length > 0 ? envVars : undefined,
          },
          gatewayRoute: (data.gatewayTimeout || data.gatewayRetries)
            ? {
                timeout: data.gatewayTimeout || undefined,
                retries: data.gatewayRetries || undefined,
              }
            : undefined,
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
              {/* Type */}
              <div className="space-y-2">
                <Label>Runtime Type</Label>
                <Select
                  value={watchedType}
                  onValueChange={(value: MCPServerType) => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select runtime type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python-runtime">Python Runtime</SelectItem>
                    <SelectItem value="node-runtime">Node.js Runtime</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {watchedType === 'python-runtime' 
                    ? 'Uses Python to run MCP server packages (uvx)'
                    : 'Uses Node.js to run MCP server packages (npx)'
                  }
                </p>
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
                      placeholder={watchedType === 'python-runtime' ? 'e.g., mcp-server-calculator' : 'e.g., @anthropic/mcp-server-github'}
                      className="font-mono"
                    />
                    {errors.fromPackage && (
                      <p className="text-sm text-destructive">{errors.fromPackage.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Package to run with {watchedType === 'python-runtime' ? 'uvx' : 'npx'}
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Python literal string defining tools dynamically
                    </p>
                  </TabsContent>
                </Tabs>
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
