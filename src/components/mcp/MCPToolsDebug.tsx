import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wrench, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { k8sClient } from '@/lib/kubernetes-client';
import type { MCPServer } from '@/types/kubernetes';
import type { MCPTool, MCPToolCallResult } from '@/types/mcp';

interface MCPToolsDebugProps {
  mcpServer: MCPServer;
}

interface ToolCallHistory {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result: MCPToolCallResult | null;
  error: string | null;
  timestamp: Date;
  duration: number;
}

export function MCPToolsDebug({ mcpServer }: MCPToolsDebugProps) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [isCallingTool, setIsCallingTool] = useState(false);
  const [callHistory, setCallHistory] = useState<ToolCallHistory[]>([]);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Use endpoint from MCPServer status, or construct service name as fallback
  const endpoint = mcpServer.status?.endpoint;
  const serviceName = `mcpserver-${mcpServer.metadata.name}`;
  const namespace = mcpServer.metadata.namespace || 'default';

  // Fetch available tools
  const fetchTools = useCallback(async () => {
    setIsLoadingTools(true);
    setToolsError(null);
    
    try {
      if (endpoint) {
        // Use direct endpoint from MCPServer status
        console.log(`[MCPToolsDebug] Fetching tools from endpoint: ${endpoint}`);
        const response = await k8sClient.listMCPToolsFromEndpoint(endpoint);
        console.log(`[MCPToolsDebug] Received tools:`, response);
        setTools(response.tools || []);
      } else {
        // Fallback to service proxy
        console.log(`[MCPToolsDebug] Fetching tools from service: ${serviceName}`);
        const response = await k8sClient.listMCPTools(serviceName, namespace);
        console.log(`[MCPToolsDebug] Received tools:`, response);
        setTools(response.tools || []);
      }
    } catch (error) {
      console.error('[MCPToolsDebug] Error fetching tools:', error);
      setToolsError(error instanceof Error ? error.message : 'Failed to fetch tools');
      setTools([]);
    } finally {
      setIsLoadingTools(false);
    }
  }, [endpoint, serviceName, namespace]);

  // Fetch tools on mount
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // Handle tool selection
  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    // Initialize args with empty values
    const initialArgs: Record<string, string> = {};
    if (tool.parameters?.properties) {
      Object.keys(tool.parameters.properties).forEach(key => {
        const prop = tool.parameters.properties[key];
        initialArgs[key] = prop.default !== undefined ? String(prop.default) : '';
      });
    }
    setToolArgs(initialArgs);
  };

  // Call the selected tool
  const handleCallTool = async () => {
    if (!selectedTool) return;

    setIsCallingTool(true);
    const startTime = Date.now();

    // Parse arguments based on parameter types
    const parsedArgs: Record<string, unknown> = {};
    if (selectedTool.parameters?.properties) {
      Object.entries(toolArgs).forEach(([key, value]) => {
        const paramDef = selectedTool.parameters.properties[key];
        if (!paramDef) {
          parsedArgs[key] = value;
          return;
        }
        
        // Type conversion based on parameter definition
        switch (paramDef.type) {
          case 'integer':
          case 'number':
            parsedArgs[key] = Number(value);
            break;
          case 'boolean':
            parsedArgs[key] = value.toLowerCase() === 'true';
            break;
          case 'object':
          case 'array':
            try {
              parsedArgs[key] = JSON.parse(value);
            } catch {
              parsedArgs[key] = value;
            }
            break;
          default:
            parsedArgs[key] = value;
        }
      });
    }

    const historyEntry: ToolCallHistory = {
      id: `call-${Date.now()}`,
      toolName: selectedTool.name,
      args: parsedArgs,
      result: null,
      error: null,
      timestamp: new Date(),
      duration: 0,
    };

    try {
      console.log(`[MCPToolsDebug] Calling tool: ${selectedTool.name} with args:`, parsedArgs);
      let result: MCPToolCallResult;
      if (endpoint) {
        // Use direct endpoint from MCPServer status
        result = await k8sClient.callMCPToolFromEndpoint(endpoint, selectedTool.name, parsedArgs);
      } else {
        // Fallback to service proxy
        result = await k8sClient.callMCPTool(serviceName, selectedTool.name, parsedArgs, namespace);
      }
      console.log(`[MCPToolsDebug] Tool result:`, result);
      
      historyEntry.result = result;
      historyEntry.duration = Date.now() - startTime;
    } catch (error) {
      console.error('[MCPToolsDebug] Tool call error:', error);
      historyEntry.error = error instanceof Error ? error.message : 'Unknown error';
      historyEntry.duration = Date.now() - startTime;
    } finally {
      setIsCallingTool(false);
      setCallHistory(prev => [historyEntry, ...prev]);
    }
  };

  // Toggle tool expansion
  const toggleToolExpanded = (toolName: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  // Copy result to clipboard
  const handleCopyResult = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get parameter type badge color
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'string': return 'default';
      case 'integer':
      case 'number': return 'secondary';
      case 'boolean': return 'outline';
      case 'object':
      case 'array': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-mcpserver" />
          <span className="text-sm font-medium">Tools Debugger</span>
          {tools.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tools.length} tools
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTools}
          disabled={isLoadingTools}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingTools ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {toolsError && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col gap-1">
              <span className="font-medium">Failed to load tools</span>
              <span className="text-sm opacity-90">{toolsError}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Tools List Panel */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Available Tools
            </span>
          </div>
          <ScrollArea className="flex-1">
            {isLoadingTools ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tools.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-muted-foreground">No tools available</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {tools.map((tool) => (
                  <Collapsible
                    key={tool.name}
                    open={expandedTools.has(tool.name)}
                    onOpenChange={() => toggleToolExpanded(tool.name)}
                  >
                    <div
                      className={`rounded-lg border transition-colors ${
                        selectedTool?.name === tool.name
                          ? 'border-mcpserver bg-mcpserver/10'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-2 text-left">
                          <div className="flex items-start gap-2">
                            {expandedTools.has(tool.name) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm font-medium truncate">
                                {tool.name}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {tool.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-2 pb-2 pt-0">
                          <Separator className="mb-2" />
                          <div className="space-y-2">
                            {tool.parameters?.properties && Object.entries(tool.parameters.properties).length > 0 ? (
                              Object.entries(tool.parameters.properties).map(([name, param]) => (
                                <div key={name} className="flex items-start gap-2 text-xs">
                                  <code className="bg-muted px-1 py-0.5 rounded font-mono">
                                    {name}
                                  </code>
                                  <Badge variant={getTypeBadgeVariant(param.type)} className="text-[10px]">
                                    {param.type}
                                  </Badge>
                                  {tool.parameters.required?.includes(name) && (
                                    <Badge variant="destructive" className="text-[10px]">
                                      required
                                    </Badge>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">No parameters</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-mcpserver hover:bg-mcpserver/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTool(tool);
                            }}
                          >
                            Select Tool
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Tool Call Panel */}
        <div className="flex-1 flex flex-col">
          {selectedTool ? (
            <>
              {/* Selected Tool Header */}
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedTool.name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTool.description}
                </p>
              </div>

              {/* Parameters Form */}
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Parameters</h4>
                    {selectedTool.parameters?.properties && Object.entries(selectedTool.parameters.properties).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(selectedTool.parameters.properties).map(([name, param]) => (
                          <div key={name}>
                            <Label htmlFor={name} className="text-sm flex items-center gap-2 mb-1.5">
                              <code className="font-mono">{name}</code>
                              <Badge variant={getTypeBadgeVariant(param.type)} className="text-[10px]">
                                {param.type}
                              </Badge>
                              {selectedTool.parameters.required?.includes(name) && (
                                <span className="text-destructive text-xs">*</span>
                              )}
                            </Label>
                            {param.description && (
                              <p className="text-xs text-muted-foreground mb-1.5">{param.description}</p>
                            )}
                            {param.type === 'object' || param.type === 'array' ? (
                              <Textarea
                                id={name}
                                value={toolArgs[name] || ''}
                                onChange={(e) => setToolArgs(prev => ({ ...prev, [name]: e.target.value }))}
                                placeholder={`Enter ${param.type} as JSON...`}
                                className="font-mono text-sm"
                                rows={3}
                              />
                            ) : (
                              <Input
                                id={name}
                                type={param.type === 'integer' || param.type === 'number' ? 'number' : 'text'}
                                value={toolArgs[name] || ''}
                                onChange={(e) => setToolArgs(prev => ({ ...prev, [name]: e.target.value }))}
                                placeholder={param.default !== undefined ? String(param.default) : `Enter ${name}...`}
                                className="font-mono"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">This tool has no parameters</p>
                    )}
                  </div>

                  <Button
                    onClick={handleCallTool}
                    disabled={isCallingTool}
                    className="w-full bg-mcpserver hover:bg-mcpserver/90"
                  >
                    {isCallingTool ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Call Tool
                      </>
                    )}
                  </Button>
                </div>

                {/* Call History */}
                {callHistory.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Call History</h4>
                    <div className="space-y-3">
                      {callHistory.map((call) => (
                        <div
                          key={call.id}
                          className="rounded-lg border border-border bg-muted/20 overflow-hidden"
                        >
                          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {call.error ? (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                              <code className="text-xs font-mono">{call.toolName}</code>
                              <span className="text-xs text-muted-foreground">
                                {call.duration}ms
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {call.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="p-3 space-y-2">
                            <div>
                              <span className="text-xs text-muted-foreground">Arguments:</span>
                              <pre className="text-xs font-mono bg-background p-2 rounded mt-1 overflow-auto max-h-20">
                                {JSON.stringify(call.args, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {call.error ? 'Error:' : 'Result:'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => handleCopyResult(
                                    call.id,
                                    call.error || JSON.stringify(call.result, null, 2)
                                  )}
                                >
                                  {copiedId === call.id ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <pre className={`text-xs font-mono p-2 rounded mt-1 overflow-auto max-h-32 ${
                                call.error ? 'bg-destructive/10 text-destructive' : 'bg-background'
                              }`}>
                                {call.error || JSON.stringify(call.result, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Select a Tool
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Choose a tool from the list to view its parameters and make test calls.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
