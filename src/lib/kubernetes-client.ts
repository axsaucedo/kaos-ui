/**
 * Real Kubernetes API Client
 * 
 * Connects to a Kubernetes cluster via kubectl proxy + ngrok tunnel
 */

import type {
  ModelAPI,
  MCPServer,
  Agent,
  Pod,
  Deployment,
  PersistentVolumeClaim,
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
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Skip ngrok browser warning
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`K8s API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const result = await this.request<{ gitVersion: string }>('/version');
      return { success: true, version: result.gitVersion };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Core K8s resources
  async listPods(namespace?: string): Promise<Pod[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<Pod>>(`/api/v1/namespaces/${ns}/pods`);
    return response.items;
  }

  async listAllPods(): Promise<Pod[]> {
    const response = await this.request<K8sListResponse<Pod>>('/api/v1/pods');
    return response.items;
  }

  async listDeployments(namespace?: string): Promise<Deployment[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<Deployment>>(`/apis/apps/v1/namespaces/${ns}/deployments`);
    return response.items;
  }

  async listAllDeployments(): Promise<Deployment[]> {
    const response = await this.request<K8sListResponse<Deployment>>('/apis/apps/v1/deployments');
    return response.items;
  }

  async listPVCs(namespace?: string): Promise<PersistentVolumeClaim[]> {
    const ns = namespace || this.config.namespace;
    const response = await this.request<K8sListResponse<PersistentVolumeClaim>>(`/api/v1/namespaces/${ns}/persistentvolumeclaims`);
    return response.items;
  }

  async listNamespaces(): Promise<{ metadata: { name: string } }[]> {
    const response = await this.request<K8sListResponse<{ metadata: { name: string } }>>('/api/v1/namespaces');
    return response.items;
  }

  // Custom Resources (CRDs) - adjust API group as needed
  private readonly agenticApiGroup = 'agentic.example.com';
  private readonly agenticApiVersion = 'v1alpha1';

  async listModelAPIs(namespace?: string): Promise<ModelAPI[]> {
    const ns = namespace || this.config.namespace;
    try {
      const response = await this.request<K8sListResponse<ModelAPI>>(
        `/apis/${this.agenticApiGroup}/${this.agenticApiVersion}/namespaces/${ns}/modelapis`
      );
      return response.items;
    } catch (error) {
      // CRD might not exist yet
      console.warn('ModelAPI CRD not found:', error);
      return [];
    }
  }

  async listMCPServers(namespace?: string): Promise<MCPServer[]> {
    const ns = namespace || this.config.namespace;
    try {
      const response = await this.request<K8sListResponse<MCPServer>>(
        `/apis/${this.agenticApiGroup}/${this.agenticApiVersion}/namespaces/${ns}/mcpservers`
      );
      return response.items;
    } catch (error) {
      console.warn('MCPServer CRD not found:', error);
      return [];
    }
  }

  async listAgents(namespace?: string): Promise<Agent[]> {
    const ns = namespace || this.config.namespace;
    try {
      const response = await this.request<K8sListResponse<Agent>>(
        `/apis/${this.agenticApiGroup}/${this.agenticApiVersion}/namespaces/${ns}/agents`
      );
      return response.items;
    } catch (error) {
      console.warn('Agent CRD not found:', error);
      return [];
    }
  }

  // Get pod logs
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
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get logs: ${response.status}`);
    }
    
    return response.text();
  }
}

// Singleton instance
export const k8sClient = new KubernetesClient();
