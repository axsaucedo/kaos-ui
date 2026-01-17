import React, { useState } from 'react';
import { 
  Stethoscope, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { k8sClient } from '@/lib/kubernetes-client';
import type { MCPServer } from '@/types/kubernetes';

interface MCPConnectionDiagnosticsProps {
  mcpServer: MCPServer;
  onSuccess?: () => void;
}

interface DiagnosticResult {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  duration?: number;
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
  };
  error?: string;
  sessionId?: string | null;
  tools?: unknown[];
}

export function MCPConnectionDiagnostics({ mcpServer, onSuccess }: MCPConnectionDiagnosticsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Parse endpoint to get service details
  const endpoint = mcpServer.status?.endpoint;
  const parseK8sEndpoint = (endpoint: string) => {
    try {
      const url = new URL(endpoint);
      const host = url.hostname;
      const port = parseInt(url.port) || 8000;
      const parts = host.split('.');
      if (parts.length >= 2) {
        return { serviceName: parts[0], namespace: parts[1], port };
      }
      return null;
    } catch {
      return null;
    }
  };

  const parsed = endpoint ? parseK8sEndpoint(endpoint) : null;
  const k8sConfig = k8sClient.getConfig();

  const updateResult = (name: string, update: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const runDiagnostics = async () => {
    if (!parsed || !k8sConfig.baseUrl) return;

    setIsRunning(true);
    setExpandedResults(new Set());

    const { serviceName, namespace, port } = parsed;
    const proxyBaseUrl = `${k8sConfig.baseUrl}/api/v1/namespaces/${namespace}/services/${serviceName}:${port}/proxy`;

    // Initialize all tests
    const initialResults: DiagnosticResult[] = [
      { name: 'health', description: 'GET /health - Basic health check', status: 'pending' },
      { name: 'ready', description: 'GET /ready - Readiness with tools', status: 'pending' },
      { name: 'initialize', description: 'POST /mcp - Initialize session (JSON-RPC)', status: 'pending' },
      { name: 'initialize_notify', description: 'POST /mcp - Send initialized notification', status: 'pending' },
      { name: 'tools_list', description: 'POST /mcp - List tools (JSON-RPC)', status: 'pending' },
      { name: 'direct_tools_list', description: 'POST /mcp - Direct tools/list (no init)', status: 'pending' },
    ];
    setResults(initialResults);

    // Test 1: Health check
    await runTest('health', async () => {
      const url = `${proxyBaseUrl}/health`;
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'bypass-tunnel-reminder': '1',
        },
      });
      
      const duration = Date.now() - startTime;
      const body = await response.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }

      return {
        duration,
        request: { method: 'GET', url, headers: { Accept: 'application/json' } },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
        },
        status: response.ok ? 'success' : 'error',
      };
    });

    // Test 2: Ready check
    await runTest('ready', async () => {
      const url = `${proxyBaseUrl}/ready`;
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'bypass-tunnel-reminder': '1',
        },
      });
      
      const duration = Date.now() - startTime;
      const body = await response.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }

      return {
        duration,
        request: { method: 'GET', url, headers: { Accept: 'application/json' } },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
        },
        status: response.ok ? 'success' : 'error',
        tools: Array.isArray((parsedBody as {tools?: unknown[]})?.tools) 
          ? (parsedBody as {tools: unknown[]}).tools 
          : undefined,
      };
    });

    // Test 3: Initialize session
    let sessionId: string | null = null;
    await runTest('initialize', async () => {
      const url = `${proxyBaseUrl}/mcp`;
      const requestBody = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          clientInfo: { name: 'kaos-ui-diagnostics', version: '1.0.0' },
          capabilities: {},
        },
      };
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'X-Requested-With': 'XMLHttpRequest',
          'bypass-tunnel-reminder': '1',
        },
        body: JSON.stringify(requestBody),
      });
      
      const duration = Date.now() - startTime;
      // Browser normalizes header names to lowercase
      sessionId = response.headers.get('mcp-session-id');
      
      const body = await response.text();
      let parsedBody: unknown;
      try {
        // Handle SSE format - check for both "data: " (with space) and "data:" (without)
        if (body.includes('data:')) {
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data && data !== '[DONE]') {
                try {
                  parsedBody = JSON.parse(data);
                  break;
                } catch { /* continue */ }
              }
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data && data !== '[DONE]') {
                try {
                  parsedBody = JSON.parse(data);
                  break;
                } catch { /* continue */ }
              }
            }
          }
        } else {
          parsedBody = JSON.parse(body);
        }
      } catch {
        parsedBody = body;
      }

      return {
        duration,
        request: { 
          method: 'POST', 
          url, 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
          },
          body: requestBody,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
        },
        sessionId,
        status: response.ok ? (sessionId ? 'success' : 'warning') : 'error',
      };
    });

    // Test 4: Send initialized notification
    await runTest('initialize_notify', async () => {
      const url = `${proxyBaseUrl}/mcp`;
      const requestBody = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Requested-With': 'XMLHttpRequest',
        'bypass-tunnel-reminder': '1',
      };
      if (sessionId) {
        headers['Mcp-Session-Id'] = sessionId;
      }
      
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      const duration = Date.now() - startTime;
      const body = await response.text();

      return {
        duration,
        request: { method: 'POST', url, headers, body: requestBody },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: body || '(empty)',
        },
        status: response.ok || response.status === 202 ? 'success' : 'error',
      };
    });

    // Test 5: List tools with session
    await runTest('tools_list', async () => {
      const url = `${proxyBaseUrl}/mcp`;
      const requestBody = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Requested-With': 'XMLHttpRequest',
        'bypass-tunnel-reminder': '1',
      };
      if (sessionId) {
        headers['Mcp-Session-Id'] = sessionId;
      }
      
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      const duration = Date.now() - startTime;
      const body = await response.text();
      let parsedBody: unknown;
      let tools: unknown[] | undefined;
      
      try {
        // Handle SSE format - check for both "data: " (with space) and "data:" (without)
        if (body.includes('data:')) {
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data && data !== '[DONE]') {
                try {
                  parsedBody = JSON.parse(data);
                  break;
                } catch { /* continue */ }
              }
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data && data !== '[DONE]') {
                try {
                  parsedBody = JSON.parse(data);
                  break;
                } catch { /* continue */ }
              }
            }
          }
        } else {
          parsedBody = JSON.parse(body);
        }
        
        // Extract tools from response
        const result = (parsedBody as { result?: { tools?: unknown[] } })?.result;
        if (result?.tools) {
          tools = result.tools;
        }
      } catch {
        parsedBody = body;
      }

      const success = response.ok && tools && tools.length > 0;
      
      return {
        duration,
        request: { method: 'POST', url, headers, body: requestBody },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
        },
        tools,
        status: success ? 'success' : (response.ok ? 'warning' : 'error'),
      };
    });

    // Test 6: Direct tools/list without initialization (for stateless servers)
    await runTest('direct_tools_list', async () => {
      const url = `${proxyBaseUrl}/mcp`;
      const requestBody = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {},
      };
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Requested-With': 'XMLHttpRequest',
        'bypass-tunnel-reminder': '1',
      };
      
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      const duration = Date.now() - startTime;
      const body = await response.text();
      let parsedBody: unknown;
      let tools: unknown[] | undefined;
      
      try {
        // Handle SSE format - check for both "data: " (with space) and "data:" (without)
        if (body.includes('data:')) {
          const lines = body.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data && data !== '[DONE]') {
                try {
                  parsedBody = JSON.parse(data);
                  break;
                } catch { /* continue */ }
              }
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data && data !== '[DONE]') {
                try {
                  parsedBody = JSON.parse(data);
                  break;
                } catch { /* continue */ }
              }
            }
          }
        } else {
          parsedBody = JSON.parse(body);
        }
        
        // Extract tools from response
        const result = (parsedBody as { result?: { tools?: unknown[] } })?.result;
        if (result?.tools) {
          tools = result.tools;
        }
      } catch {
        parsedBody = body;
      }

      const success = response.ok && tools && tools.length > 0;
      
      return {
        duration,
        request: { method: 'POST', url, headers, body: requestBody },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsedBody,
        },
        tools,
        status: success ? 'success' : (response.ok ? 'warning' : 'error'),
      };
    });

    // Check if any test succeeded
    setIsRunning(false);
    
    // If tools_list or direct_tools_list succeeded, call onSuccess
    setResults(prev => {
      const toolsListResult = prev.find(r => r.name === 'tools_list');
      const directResult = prev.find(r => r.name === 'direct_tools_list');
      if ((toolsListResult?.status === 'success' || directResult?.status === 'success') && onSuccess) {
        onSuccess();
      }
      return prev;
    });
  };

  const runTest = async (
    name: string, 
    fn: () => Promise<Partial<DiagnosticResult>>
  ) => {
    updateResult(name, { status: 'running' });
    try {
      const result = await fn();
      updateResult(name, result);
    } catch (error) {
      updateResult(name, { 
        status: 'error', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  };

  const toggleExpanded = (name: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending': return <div className="h-4 w-4 rounded-full bg-muted" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'running': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Running</Badge>;
      case 'success': return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Success</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Warning</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
    }
  };

  const successfulTest = results.find(r => 
    (r.name === 'tools_list' || r.name === 'direct_tools_list') && 
    r.status === 'success' && 
    r.tools && 
    r.tools.length > 0
  );

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-mcpserver" />
          <span className="text-sm font-medium">Connection Diagnostics</span>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={runDiagnostics}
          disabled={isRunning || !parsed}
          className="bg-mcpserver hover:bg-mcpserver/90"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {/* Connection Info */}
      {parsed && (
        <div className="px-4 py-2 border-b border-border bg-muted/20 text-xs">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Service:</strong> {parsed.serviceName}</span>
            <span><strong>Namespace:</strong> {parsed.namespace}</span>
            <span><strong>Port:</strong> {parsed.port}</span>
          </div>
        </div>
      )}

      {!parsed && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No valid endpoint found for this MCP server. The server may not be ready.
          </AlertDescription>
        </Alert>
      )}

      {/* Results Summary */}
      {successfulTest && (
        <Alert className="m-4 mb-0 border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <strong>Success!</strong> Found {successfulTest.tools?.length} tools via {
              successfulTest.name === 'direct_tools_list' ? 'stateless mode' : 'session-based mode'
            }. The Tools Debugger should now work.
          </AlertDescription>
        </Alert>
      )}

      {/* Results List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {results.map((result) => (
            <Collapsible
              key={result.name}
              open={expandedResults.has(result.name)}
              onOpenChange={() => toggleExpanded(result.name)}
            >
              <div className="rounded-lg border border-border overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                    {expandedResults.has(result.name) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {getStatusIcon(result.status)}
                    <div className="flex-1 text-left">
                      <span className="text-sm">{result.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                      )}
                      {getStatusBadge(result.status)}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                    {/* Session ID */}
                    {result.sessionId !== undefined && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Session ID:</span>
                        </div>
                        <div className={`mt-1 px-2 py-1 rounded text-xs font-mono ${
                          result.sessionId ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                          {result.sessionId || '(none - check CORS headers if server requires sessions)'}
                        </div>
                        {!result.sessionId && result.status === 'success' && (
                          <p className="mt-1 text-[10px] text-yellow-600">
                            ⚠️ Server returned 200 OK but no Mcp-Session-Id header visible. 
                            This is likely a CORS issue - the header may be sent but not exposed to JavaScript.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tools found */}
                    {result.tools && result.tools.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground font-medium">
                          Tools Found: {result.tools.length}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {result.tools.map((tool, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {(tool as { name?: string })?.name || `Tool ${i + 1}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request */}
                    {result.request && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Request:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleCopy(`${result.name}-req`, JSON.stringify(result.request, null, 2))}
                          >
                            {copiedId === `${result.name}-req` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <pre className="mt-1 p-2 rounded bg-muted text-xs font-mono overflow-auto max-h-32">
                          {JSON.stringify(result.request, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Response */}
                    {result.response && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">
                            Response ({result.response.status} {result.response.statusText}):
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleCopy(`${result.name}-res`, JSON.stringify(result.response, null, 2))}
                          >
                            {copiedId === `${result.name}-res` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <pre className="mt-1 p-2 rounded bg-muted text-xs font-mono overflow-auto max-h-48">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error */}
                    {result.error && (
                      <div>
                        <span className="text-xs text-destructive font-medium">Error:</span>
                        <pre className="mt-1 p-2 rounded bg-destructive/10 text-destructive text-xs font-mono overflow-auto">
                          {result.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* Recommendations */}
      {results.length > 0 && !isRunning && (
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Recommendations:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {/* CORS Header Issue - Initialize succeeds but no session ID */}
            {results.find(r => r.name === 'initialize' && r.status === 'success' && r.sessionId === null) && 
             results.find(r => r.name === 'tools_list' && r.status === 'error') && (
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                <div>
                  <strong className="text-destructive">CORS Header Issue Detected!</strong>
                  <p className="mt-1">
                    The initialize request succeeded, but the browser cannot read the <code className="bg-muted px-1 rounded">Mcp-Session-Id</code> response header 
                    due to missing CORS configuration. The server needs to include:
                  </p>
                  <pre className="mt-1 p-2 rounded bg-muted font-mono text-[10px] overflow-auto">
Access-Control-Expose-Headers: Mcp-Session-Id, mcp-session-id</pre>
                  <p className="mt-1">
                    <strong>Fix options:</strong>
                  </p>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    <li>Configure your K8s Ingress/proxy to add the CORS header</li>
                    <li>Configure the MCP server to expose the session header</li>
                    <li>Use an Nginx or similar reverse proxy with CORS headers</li>
                  </ul>
                </div>
              </li>
            )}
            {results.find(r => r.name === 'initialize' && r.sessionId === null) && 
             !results.find(r => r.name === 'initialize' && r.status === 'success' && r.sessionId === null) && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                Server is running in <strong>stateless mode</strong> (no session ID). 
                Direct tools/list should work without initialization.
              </li>
            )}
            {results.find(r => r.name === 'initialize' && r.status === 'error') && (
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                Initialize failed. Check if the MCP server supports the streamable HTTP transport.
              </li>
            )}
            {results.find(r => r.name === 'direct_tools_list' && r.status === 'error') && 
             results.find(r => r.name === 'tools_list' && r.status === 'error') && 
             !results.find(r => r.name === 'initialize' && r.status === 'success' && r.sessionId === null) && (
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                Both session and stateless modes failed. Check server logs for details.
              </li>
            )}
            {results.find(r => r.name === 'direct_tools_list' && r.status === 'success') && (
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                Stateless mode works. Consider updating the client to skip session initialization.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
