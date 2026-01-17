/**
 * Real Kubernetes API Client
 * 
 * Connects to a Kubernetes cluster via kubectl proxy + ngrok tunnel
 * Provides full CRUD operations for CRDs and standard K8s resources
 */

import type {
  ModelAPI,
  MCPServer,
  Agent,
  Pod,
  Deployment,
  PersistentVolumeClaim,
  Service,
  ConfigMap,
  SecretRef,
} from '@/types/kubernetes';

export interface K8sClientConfig {
  baseUrl: string;
  namespace: string;
}

interface K8sListResponse<T> {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion: string;
    continue?: string;
  };
  items: T[];
}

interface K8sStatus {
  kind: 'Status';
  apiVersion: 'v1';
  metadata: Record<string, unknown>;
  status: 'Success' | 'Failure';
  message?: string;
  reason?: string;
  code: number;
}

class KubernetesClient {
  private config: K8sClientConfig = {
    baseUrl: '',
    namespace: 'default',
  };

  setConfig(config: Partial<K8sClientConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): K8sClientConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return !!this.config.baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.config.baseUrl) {
      throw new Error('Kubernetes API not configured. Please set the base URL.');
    }

    const url = `${this.config.baseUrl}${path}`;
    
    const headers: HeadersInit = {};
    
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    headers['ngrok-skip-browser-warning'] = '1';
    headers['bypass-tunnel-reminder'] = '1';
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`K8s API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  private async simpleRequest<T>(path: string): Promise<T> {
    if (!this.config.baseUrl) {
      throw new Error('Kubernetes API not configured. Please set the base URL.');
    }

    const url = `${this.config.baseUrl}${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`K8s API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; version?: string; error?: string; method?: string }> {
    try {
      const result = await this.simpleRequest<{ gitVersion: string }>('/version');
      return { success: true, version: result.gitVersion, method: 'simple' };
    } catch (simpleError) {
      console.log('Simple request failed, trying with headers:', simpleError);
    }

    try {
      const result = await this.request<{ gitVersion: string }>('/version');
      return { success: true, version: result.gitVersion, method: 'with-headers' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ============= CRD API Group Configuration =============
  private readonly agenticApiGroup = 'kaos.tools';
  private readonly agenticApiVersion = 'v1alpha1';

  private getCrdPath(resource: string, namespace?: string, name?: string): string {
    const ns = namespace || this.config.namespace;
    const basePath = `/apis/${this.agenticApiGroup}/${this.agenticApiVersion}/namespaces/${ns}/${resource}`;
    return name ? `${basePath}/${name}` : basePath;
  }

  // ============= ModelAPI CRUD =============
  async listModelAPIs(namespace?: string): Promise<ModelAPI[]> {
    const ns = namespace || this.config.namespace;
    const path = this.getCrdPath('modelapis', ns);
    console.log(`[k8sClient] Fetching ModelAPIs from: ${path}`);
    try {
      const response = await this.request<K8sListResponse<ModelAPI>>(path);
      console.log(`[k8sClient] Found ${response.items.length} ModelAPIs`);
      return response.items;
    } catch (error) {
      console.warn('[k8sClient] ModelAPI CRD not found:', error);
      return [];
    }
  }

  async getModelAPI(name: string, namespace?: string): Promise<ModelAPI> {
    return this.request<ModelAPI>(this.getCrdPath('modelapis', namespace, name));
  }

  async createModelAPI(api: ModelAPI): Promise<ModelAPI> {
    const ns = api.metadata.namespace || this.config.namespace;
    return this.request<ModelAPI>(this.getCrdPath('modelapis', ns), {
      method: 'POST',
      body: JSON.stringify(api),
    });
  }

  async updateModelAPI(api: ModelAPI): Promise<ModelAPI> {
    const ns = api.metadata.namespace || this.config.namespace;
    return this.request<ModelAPI>(this.getCrdPath('modelapis', ns, api.metadata.name), {
      method: 'PUT',
      body: JSON.stringify(api),
    });
  }

  async deleteModelAPI(name: string, namespace?: string): Promise<K8sStatus> {
    return this.request<K8sStatus>(this.getCrdPath('modelapis', namespace, name), {
      method: 'DELETE',
    });
  }

  // ============= MCPServer CRUD =============
  async listMCPServers(namespace?: string): Promise<MCPServer[]> {
    const ns = namespace || this.config.namespace;
    const path = this.getCrdPath('mcpservers', ns);
    console.log(`[k8sClient] Fetching MCPServers from: ${path}`);
    try {
      const response = await this.request<K8sListResponse<MCPServer>>(path);
      console.log(`[k8sClient] Found ${response.items.length} MCPServers`);
      return response.items;
    } catch (error) {
      console.warn('[k8sClient] MCPServer CRD not found:', error);
      return [];
    }
  }

  async getMCPServer(name: string, namespace?: string): Promise<MCPServer> {
    return this.request<MCPServer>(this.getCrdPath('mcpservers', namespace, name));
  }

  async createMCPServer(server: MCPServer): Promise<MCPServer> {
    const ns = server.metadata.namespace || this.config.namespace;
    return this.request<MCPServer>(this.getCrdPath('mcpservers', ns), {
      method: 'POST',
      body: JSON.stringify(server),
    });
  }

  async updateMCPServer(server: MCPServer): Promise<MCPServer> {
    const ns = server.metadata.namespace || this.config.namespace;
    return this.request<MCPServer>(this.getCrdPath('mcpservers', ns, server.metadata.name), {
      method: 'PUT',
      body: JSON.stringify(server),
    });
  }

  async deleteMCPServer(name: string, namespace?: string): Promise<K8sStatus> {
    return this.request<K8sStatus>(this.getCrdPath('mcpservers', namespace, name), {
      method: 'DELETE',
    });
  }

  // ============= Agent CRUD =============
  async listAgents(namespace?: string): Promise<Agent[]> {
    const ns = namespace || this.config.namespace;
    const path = this.getCrdPath('agents', ns);
    console.log(`[k8sClient] Fetching Agents from: ${path}`);
    try {
      const response = await this.request<K8sListResponse<Agent>>(path);
      console.log(`[k8sClient] Found ${response.items.length} Agents`);
      return response.items;
    } catch (error) {
      console.warn('[k8sClient] Agent CRD not found:', error);
      return [];
    }
  }

  async getAgent(name: string, namespace?: string): Promise<Agent> {
    return this.request<Agent>(this.getCrdPath('agents', namespace, name));
  }

  async createAgent(agent: Agent): Promise<Agent> {
    const ns = agent.metadata.namespace || this.config.namespace;
    return this.request<Agent>(this.getCrdPath('agents', ns), {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async updateAgent(agent: Agent): Promise<Agent> {
    const ns = agent.metadata.namespace || this.config.namespace;
    return this.request<Agent>(this.getCrdPath('agents', ns, agent.metadata.name), {
      method: 'PUT',
      body: JSON.stringify(agent),
    });
  }

  async deleteAgent(name: string, namespace?: string): Promise<K8sStatus> {
    return this.request<K8sStatus>(this.getCrdPath('agents', namespace, name), {
      method: 'DELETE',
    });
  }

  // ============= Pod Operations =============
  async listPods(namespace?: string): Promise<Pod[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<Pod>>(`/api/v1/namespaces/${ns}/pods`);
    return response.items;
  }

  async listAllPods(): Promise<Pod[]> {
    const response = await this.request<K8sListResponse<Pod>>('/api/v1/pods');
    return response.items;
  }

  async getPod(name: string, namespace?: string): Promise<Pod> {
    const ns = namespace || this.config.namespace;
    return this.request<Pod>(`/api/v1/namespaces/${ns}/pods/${name}`);
  }

  async deletePod(name: string, namespace?: string): Promise<K8sStatus> {
    const ns = namespace || this.config.namespace;
    return this.request<K8sStatus>(`/api/v1/namespaces/${ns}/pods/${name}`, {
      method: 'DELETE',
    });
  }

  async getPodLogs(
    name: string,
    namespace?: string,
    options?: { container?: string; tailLines?: number }
  ): Promise<string> {
    const ns = namespace || this.config.namespace;
    const params = new URLSearchParams();
    if (options?.container) params.set('container', options.container);
    if (options?.tailLines) params.set('tailLines', String(options.tailLines));
    
    const queryString = params.toString();
    const path = `/api/v1/namespaces/${ns}/pods/${name}/log${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      headers: { 
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get logs: ${response.status}`);
    }
    
    return response.text();
  }

  // ============= Deployment Operations =============
  async listDeployments(namespace?: string): Promise<Deployment[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<Deployment>>(`/apis/apps/v1/namespaces/${ns}/deployments`);
    return response.items;
  }

  async listAllDeployments(): Promise<Deployment[]> {
    const response = await this.request<K8sListResponse<Deployment>>('/apis/apps/v1/deployments');
    return response.items;
  }

  async getDeployment(name: string, namespace?: string): Promise<Deployment> {
    const ns = namespace || this.config.namespace;
    return this.request<Deployment>(`/apis/apps/v1/namespaces/${ns}/deployments/${name}`);
  }

  async createDeployment(deployment: Deployment): Promise<Deployment> {
    const ns = deployment.metadata.namespace || this.config.namespace;
    return this.request<Deployment>(`/apis/apps/v1/namespaces/${ns}/deployments`, {
      method: 'POST',
      body: JSON.stringify(deployment),
    });
  }

  async updateDeployment(deployment: Deployment): Promise<Deployment> {
    const ns = deployment.metadata.namespace || this.config.namespace;
    return this.request<Deployment>(`/apis/apps/v1/namespaces/${ns}/deployments/${deployment.metadata.name}`, {
      method: 'PUT',
      body: JSON.stringify(deployment),
    });
  }

  async deleteDeployment(name: string, namespace?: string): Promise<K8sStatus> {
    const ns = namespace || this.config.namespace;
    return this.request<K8sStatus>(`/apis/apps/v1/namespaces/${ns}/deployments/${name}`, {
      method: 'DELETE',
    });
  }

  async scaleDeployment(name: string, replicas: number, namespace?: string): Promise<Deployment> {
    const ns = namespace || this.config.namespace;
    const deployment = await this.getDeployment(name, ns);
    deployment.spec.replicas = replicas;
    return this.updateDeployment(deployment);
  }

  // ============= Service Operations =============
  async listServices(namespace?: string): Promise<Service[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<Service>>(`/api/v1/namespaces/${ns}/services`);
    return response.items;
  }

  async listAllServices(): Promise<Service[]> {
    const response = await this.request<K8sListResponse<Service>>('/api/v1/services');
    return response.items;
  }

  async getService(name: string, namespace?: string): Promise<Service> {
    const ns = namespace || this.config.namespace;
    return this.request<Service>(`/api/v1/namespaces/${ns}/services/${name}`);
  }

  async createService(service: Service): Promise<Service> {
    const ns = service.metadata.namespace || this.config.namespace;
    return this.request<Service>(`/api/v1/namespaces/${ns}/services`, {
      method: 'POST',
      body: JSON.stringify(service),
    });
  }

  async updateService(service: Service): Promise<Service> {
    const ns = service.metadata.namespace || this.config.namespace;
    return this.request<Service>(`/api/v1/namespaces/${ns}/services/${service.metadata.name}`, {
      method: 'PUT',
      body: JSON.stringify(service),
    });
  }

  async deleteService(name: string, namespace?: string): Promise<K8sStatus> {
    const ns = namespace || this.config.namespace;
    return this.request<K8sStatus>(`/api/v1/namespaces/${ns}/services/${name}`, {
      method: 'DELETE',
    });
  }

  // ============= PVC Operations =============
  async listPVCs(namespace?: string): Promise<PersistentVolumeClaim[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<PersistentVolumeClaim>>(`/api/v1/namespaces/${ns}/persistentvolumeclaims`);
    return response.items;
  }

  async getPVC(name: string, namespace?: string): Promise<PersistentVolumeClaim> {
    const ns = namespace || this.config.namespace;
    return this.request<PersistentVolumeClaim>(`/api/v1/namespaces/${ns}/persistentvolumeclaims/${name}`);
  }

  async createPVC(pvc: PersistentVolumeClaim): Promise<PersistentVolumeClaim> {
    const ns = pvc.metadata.namespace || this.config.namespace;
    return this.request<PersistentVolumeClaim>(`/api/v1/namespaces/${ns}/persistentvolumeclaims`, {
      method: 'POST',
      body: JSON.stringify(pvc),
    });
  }

  async deletePVC(name: string, namespace?: string): Promise<K8sStatus> {
    const ns = namespace || this.config.namespace;
    return this.request<K8sStatus>(`/api/v1/namespaces/${ns}/persistentvolumeclaims/${name}`, {
      method: 'DELETE',
    });
  }

  // ============= ConfigMaps & Secrets =============
  async listConfigMaps(namespace?: string): Promise<ConfigMap[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<ConfigMap>>(`/api/v1/namespaces/${ns}/configmaps`);
    return response.items;
  }

  async listSecrets(namespace?: string): Promise<SecretRef[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<SecretRef>>(`/api/v1/namespaces/${ns}/secrets`);
    // Return only metadata, not actual secret values
    return response.items.map(secret => ({
      apiVersion: secret.apiVersion,
      kind: secret.kind,
      metadata: secret.metadata,
      type: secret.type,
    }));
  }

  // ============= Namespaces =============
  async listNamespaces(): Promise<{ metadata: { name: string } }[]> {
    const response = await this.request<K8sListResponse<{ metadata: { name: string } }>>('/api/v1/namespaces');
    return response.items;
  }

  async createNamespace(name: string): Promise<{ metadata: { name: string } }> {
    return this.request<{ metadata: { name: string } }>('/api/v1/namespaces', {
      method: 'POST',
      body: JSON.stringify({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name },
      }),
    });
  }

  // ============= Service Proxy Operations =============
  
  /**
   * Proxy a request to a service within the cluster
   * Uses the Kubernetes API server's built-in proxy capability
   */
  async proxyServiceRequest(
    serviceName: string,
    path: string,
    options: RequestInit = {},
    namespace?: string,
    port: number = 8000
  ): Promise<Response> {
    if (!this.config.baseUrl) {
      throw new Error('Kubernetes API not configured. Please set the base URL.');
    }

    const ns = namespace || this.config.namespace;
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Kubernetes service proxy URL format: /api/v1/namespaces/{ns}/services/{name}:{port}/proxy/{path}
    const url = `${this.config.baseUrl}/api/v1/namespaces/${ns}/services/${serviceName}:${port}/proxy${cleanPath}`;
    
    console.log(`[k8sClient] Proxying request to: ${url}`);
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
        'bypass-tunnel-reminder': '1',
        ...options.headers,
      },
    });
  }

  /**
   * Stream chat completions from an OpenAI-compatible agent service
   * Handles SSE parsing and provides callbacks for streaming updates
   */
  async streamChatCompletion(
    serviceName: string,
    messages: { role: string; content: string }[],
    options: {
      namespace?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      sessionId?: string;
      onChunk: (content: string) => void;
      onDone: (metadata?: { sessionId?: string }) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    const { namespace, model = 'default', temperature = 0.7, maxTokens, sessionId, onChunk, onDone, onError } = options;

    try {
      const response = await this.proxyServiceRequest(
        serviceName,
        '/v1/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature,
            ...(maxTokens && { max_tokens: maxTokens }),
            ...(sessionId && { session_id: sessionId }),
          }),
        },
        namespace
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat API error ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedSessionId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onDone({ sessionId: receivedSessionId });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onDone({ sessionId: receivedSessionId });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            // Extract session_id from response if present
            if (parsed.session_id && !receivedSessionId) {
              receivedSessionId = parsed.session_id;
              console.log('[k8sClient] Received session ID:', receivedSessionId);
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
            console.debug('[k8sClient] SSE parse skip:', data.substring(0, 50));
          }
        }
      }
    } catch (error) {
      console.error('[k8sClient] streamChatCompletion error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Singleton instance
export const k8sClient = new KubernetesClient();
