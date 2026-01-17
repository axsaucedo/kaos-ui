/**
 * MCP Streamable HTTP Client
 * 
 * Implements the correct MCP Streamable HTTP transport protocol.
 * Based on the working reference implementation.
 * 
 * Key requirements:
 * 1. Accept header must include both "application/json" and "text/event-stream"
 * 2. Session ID from first response must be included in subsequent requests (lowercase header)
 * 3. Responses are SSE-formatted: "event: message\ndata: {...}"
 */

import type { MCPTool, MCPToolCallResult } from '@/types/mcp';

export interface MCPClientConfig {
  /** Base URL for the MCP server (the K8s proxy URL) */
  baseUrl: string;
  /** Client name for identification */
  clientName?: string;
  /** Client version */
  clientVersion?: string;
}

interface MCPSession {
  sessionId: string | null;
  initialized: boolean;
}

/**
 * Parse SSE response to extract JSON data
 * SSE format: "event: message\ndata: {...}\n\n"
 */
function parseSSEResponse(text: string): unknown {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      if (data && data !== '[DONE]') {
        try {
          return JSON.parse(data);
        } catch {
          // Continue to next line
        }
      }
    }
  }
  throw new Error(`Could not parse SSE response: ${text.substring(0, 200)}`);
}

export class MCPClient {
  private config: MCPClientConfig;
  private session: MCPSession | null = null;
  private requestId = 0;

  constructor(config: MCPClientConfig) {
    this.config = {
      clientName: 'kaos-ui',
      clientVersion: '1.0.0',
      ...config,
    };
  }

  /**
   * Get the next request ID
   */
  private getNextId(): number {
    return ++this.requestId;
  }

  /**
   * Build headers for MCP requests
   * CRITICAL: Accept header must include both application/json AND text/event-stream
   */
  private buildHeaders(includeSessionId: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // CRITICAL: Both Accept types are required for MCP Streamable HTTP!
      'Accept': 'application/json, text/event-stream',
      'X-Requested-With': 'XMLHttpRequest',
      'bypass-tunnel-reminder': '1',
    };

    // Include session ID if we have one (required after initialize)
    // Note: Header name is case-insensitive in HTTP, but we use the exact case from server
    if (includeSessionId && this.session?.sessionId) {
      headers['Mcp-Session-Id'] = this.session.sessionId;
    }

    return headers;
  }

  /**
   * Send a JSON-RPC request to the MCP server
   */
  private async request<T>(
    method: string,
    params: Record<string, unknown> = {},
    includeSessionId: boolean = false,
    isNotification: boolean = false
  ): Promise<{ data: T; sessionId: string | null }> {
    const headers = this.buildHeaders(includeSessionId);

    const body: Record<string, unknown> = {
      jsonrpc: '2.0',
      method,
      params,
    };

    // Notifications don't have an id
    if (!isNotification) {
      body.id = this.getNextId();
    }

    console.log(`[MCPClient] Request: ${method}`);
    console.log(`[MCPClient] URL: ${this.config.baseUrl}`);
    console.log(`[MCPClient] Session ID: ${this.session?.sessionId || '(none - will be created)'}`);
    console.log(`[MCPClient] Headers:`, headers);
    console.log(`[MCPClient] Body:`, JSON.stringify(body));

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Extract session ID from response headers (lowercase!)
    const newSessionId = response.headers.get('mcp-session-id');
    
    console.log(`[MCPClient] Response status: ${response.status}`);
    console.log(`[MCPClient] New Session ID from header: ${newSessionId}`);
    console.log(`[MCPClient] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MCPClient] Error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Handle 202 Accepted (notification response) - may have empty body
    if (response.status === 202 || isNotification) {
      console.log(`[MCPClient] Notification accepted (status: ${response.status})`);
      return { data: {} as T, sessionId: newSessionId };
    }

    const responseText = await response.text();
    console.log(`[MCPClient] Raw response:`, responseText.substring(0, 500));
    
    // Parse response - could be JSON or SSE
    let data: T;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream') || responseText.includes('data:')) {
      // SSE format
      const parsed = parseSSEResponse(responseText) as { result?: T; error?: { code: number; message: string } };
      if (parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error) {
        throw new Error(`JSON-RPC error ${parsed.error.code}: ${parsed.error.message}`);
      }
      data = (parsed as { result: T }).result || parsed as T;
    } else {
      // Plain JSON
      const parsed = JSON.parse(responseText) as { result?: T; error?: { code: number; message: string } };
      if (parsed.error) {
        throw new Error(`JSON-RPC error ${parsed.error.code}: ${parsed.error.message}`);
      }
      data = parsed.result || parsed as T;
    }

    console.log(`[MCPClient] Parsed data:`, data);
    return { data, sessionId: newSessionId };
  }

  /**
   * Initialize connection and get session ID
   * STEP 1 of the MCP protocol
   */
  async initialize(): Promise<string | null> {
    console.log(`[MCPClient] STEP 1: Initialize connection`);

    const { data, sessionId } = await this.request<{
      protocolVersion: string;
      serverInfo: { name: string; version: string };
      capabilities: Record<string, unknown>;
    }>('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: this.config.clientName || 'kaos-ui',
        version: this.config.clientVersion || '1.0.0',
      },
    });

    console.log(`[MCPClient] Protocol: ${data.protocolVersion}`);
    console.log(`[MCPClient] Server: ${data.serverInfo?.name} v${data.serverInfo?.version}`);

    // Store session
    this.session = {
      sessionId,
      initialized: false,
    };

    return sessionId;
  }

  /**
   * Send initialized notification (required after initialize)
   * STEP 2 of the MCP protocol
   */
  async sendInitializedNotification(): Promise<void> {
    console.log(`[MCPClient] STEP 2: Send initialized notification`);

    if (!this.session) {
      throw new Error('Must call initialize() before sendInitializedNotification()');
    }

    await this.request<void>(
      'notifications/initialized',
      {},
      true, // Include session ID
      true  // This is a notification (no id field)
    );

    this.session.initialized = true;
    console.log(`[MCPClient] Initialized notification sent successfully`);
  }

  /**
   * Ensure the session is initialized
   */
  async ensureInitialized(): Promise<void> {
    if (!this.session) {
      await this.initialize();
    }
    if (!this.session?.initialized) {
      await this.sendInitializedNotification();
    }
  }

  /**
   * List available tools
   * STEP 3 of the MCP protocol (or any subsequent request)
   */
  async listTools(): Promise<MCPTool[]> {
    console.log(`[MCPClient] STEP 3: List tools`);

    await this.ensureInitialized();

    const { data } = await this.request<{ tools: MCPTool[] }>(
      'tools/list',
      {},
      true // Include session ID
    );

    console.log(`[MCPClient] Found ${data.tools?.length || 0} tools`);
    return data.tools || [];
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    console.log(`[MCPClient] Call tool: ${name}`);

    await this.ensureInitialized();

    const { data } = await this.request<MCPToolCallResult>(
      'tools/call',
      { name, arguments: args },
      true // Include session ID
    );

    console.log(`[MCPClient] Tool result:`, data);
    return data;
  }

  /**
   * Reset the session (force re-initialization)
   */
  resetSession(): void {
    this.session = null;
    this.requestId = 0;
  }

  /**
   * Get current session info
   */
  getSessionInfo(): { sessionId: string | null; initialized: boolean } | null {
    return this.session ? { ...this.session } : null;
  }
}

/**
 * Create an MCP client for a K8s service proxy URL
 */
export function createMCPClient(
  k8sBaseUrl: string,
  serviceName: string,
  namespace: string,
  port: number = 8000
): MCPClient {
  // Kubernetes service proxy URL format: /api/v1/namespaces/{ns}/services/{name}:{port}/proxy/mcp
  const baseUrl = `${k8sBaseUrl}/api/v1/namespaces/${namespace}/services/${serviceName}:${port}/proxy/mcp`;
  
  return new MCPClient({ baseUrl });
}

/**
 * Create an MCP client from a K8s internal endpoint URL
 * Endpoint format: http://servicename.namespace.svc.cluster.local:port
 */
export function createMCPClientFromEndpoint(
  k8sBaseUrl: string,
  endpoint: string
): MCPClient {
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    const port = parseInt(url.port) || 8000;
    
    // Parse host format: servicename.namespace.svc.cluster.local
    const parts = host.split('.');
    if (parts.length >= 2) {
      const serviceName = parts[0];
      const namespace = parts[1];
      return createMCPClient(k8sBaseUrl, serviceName, namespace, port);
    }
    
    throw new Error(`Invalid K8s endpoint format: ${endpoint}`);
  } catch (error) {
    throw new Error(`Failed to parse endpoint: ${endpoint}. Error: ${error}`);
  }
}
