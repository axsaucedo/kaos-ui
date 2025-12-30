/**
 * Realistic Mock Kubernetes API
 * 
 * Simulates a real Kubernetes API with:
 * - Proper REST endpoints and response structures
 * - Realistic latency and error simulation
 * - Watch/stream events via EventSource pattern
 * - Resource versioning and conflict detection
 * - Proper K8s API response envelope
 */

import type {
  ModelAPI,
  MCPServer,
  Agent,
  Pod,
  Deployment,
  PersistentVolumeClaim,
  ResourceStatus,
} from '@/types/kubernetes';

// Configuration
export interface MockAPIConfig {
  latencyMs: { min: number; max: number };
  errorRate: number; // 0-1, probability of random errors
  watchIntervalMs: number;
}

const DEFAULT_CONFIG: MockAPIConfig = {
  latencyMs: { min: 100, max: 500 },
  errorRate: 0.02, // 2% random error rate
  watchIntervalMs: 5000,
};

// K8s API response types
interface K8sListResponse<T> {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion: string;
    continue?: string;
  };
  items: T[];
}

interface K8sWatchEvent<T> {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | 'ERROR';
  object: T;
}

interface K8sStatus {
  kind: 'Status';
  apiVersion: 'v1';
  metadata: {};
  status: 'Success' | 'Failure';
  message?: string;
  reason?: string;
  code: number;
}

// Error types matching K8s API
export class K8sAPIError extends Error {
  constructor(
    public code: number,
    public reason: string,
    message: string
  ) {
    super(message);
    this.name = 'K8sAPIError';
  }

  toStatus(): K8sStatus {
    return {
      kind: 'Status',
      apiVersion: 'v1',
      metadata: {},
      status: 'Failure',
      message: this.message,
      reason: this.reason,
      code: this.code,
    };
  }
}

// In-memory storage with versioning
class ResourceStore<T extends { metadata: { name: string; namespace?: string; uid?: string; resourceVersion?: string; creationTimestamp?: string } }> {
  private resources: Map<string, T> = new Map();
  private version = 1;
  private listeners: Set<(event: K8sWatchEvent<T>) => void> = new Set();

  private getKey(name: string, namespace: string): string {
    return `${namespace}/${name}`;
  }

  private getNextVersion(): string {
    return String(++this.version);
  }

  list(namespace?: string): T[] {
    const items = Array.from(this.resources.values());
    if (namespace) {
      return items.filter((r) => r.metadata.namespace === namespace);
    }
    return items;
  }

  get(name: string, namespace: string): T | undefined {
    return this.resources.get(this.getKey(name, namespace));
  }

  create(resource: T): T {
    const key = this.getKey(resource.metadata.name, resource.metadata.namespace || 'default');
    
    if (this.resources.has(key)) {
      throw new K8sAPIError(409, 'AlreadyExists', `Resource "${resource.metadata.name}" already exists`);
    }

    const created: T = {
      ...resource,
      metadata: {
        ...resource.metadata,
        uid: resource.metadata.uid || `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        resourceVersion: this.getNextVersion(),
        creationTimestamp: new Date().toISOString(),
      },
    };

    this.resources.set(key, created);
    this.notify({ type: 'ADDED', object: created });
    return created;
  }

  update(resource: T): T {
    const key = this.getKey(resource.metadata.name, resource.metadata.namespace || 'default');
    const existing = this.resources.get(key);

    if (!existing) {
      throw new K8sAPIError(404, 'NotFound', `Resource "${resource.metadata.name}" not found`);
    }

    // Check for conflicts using resourceVersion
    if (resource.metadata.resourceVersion && resource.metadata.resourceVersion !== existing.metadata.resourceVersion) {
      throw new K8sAPIError(409, 'Conflict', 'Resource version conflict - resource was modified');
    }

    const updated: T = {
      ...resource,
      metadata: {
        ...resource.metadata,
        uid: existing.metadata.uid,
        resourceVersion: this.getNextVersion(),
        creationTimestamp: existing.metadata.creationTimestamp,
      },
    };

    this.resources.set(key, updated);
    this.notify({ type: 'MODIFIED', object: updated });
    return updated;
  }

  delete(name: string, namespace: string): void {
    const key = this.getKey(name, namespace);
    const existing = this.resources.get(key);

    if (!existing) {
      throw new K8sAPIError(404, 'NotFound', `Resource "${name}" not found`);
    }

    this.resources.delete(key);
    this.notify({ type: 'DELETED', object: existing });
  }

  watch(callback: (event: K8sWatchEvent<T>) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(event: K8sWatchEvent<T>): void {
    this.listeners.forEach((cb) => cb(event));
  }

  getResourceVersion(): string {
    return String(this.version);
  }

  // Seed with initial data
  seed(resources: T[]): void {
    resources.forEach((r) => {
      const key = this.getKey(r.metadata.name, r.metadata.namespace || 'default');
      this.resources.set(key, {
        ...r,
        metadata: {
          ...r.metadata,
          resourceVersion: this.getNextVersion(),
        },
      });
    });
  }
}

// Mock API Implementation
export class MockKubernetesAPI {
  private config: MockAPIConfig;
  private modelAPIs = new ResourceStore<ModelAPI>();
  private mcpServers = new ResourceStore<MCPServer>();
  private agents = new ResourceStore<Agent>();
  private pods = new ResourceStore<Pod>();
  private deployments = new ResourceStore<Deployment>();
  private pvcs = new ResourceStore<PersistentVolumeClaim>();
  
  private connected = false;
  private token: string | null = null;
  private watchIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<MockAPIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeMockData();
  }

  // Connection management
  connect(token?: string): Promise<void> {
    return this.simulateLatency().then(() => {
      this.token = token || 'mock-token';
      this.connected = true;
    });
  }

  disconnect(): void {
    this.connected = false;
    this.token = null;
    this.watchIntervals.forEach((interval) => clearInterval(interval));
    this.watchIntervals.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Latency and error simulation
  private async simulateLatency(): Promise<void> {
    const { min, max } = this.config.latencyMs;
    const delay = min + Math.random() * (max - min);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private maybeThrowRandomError(): void {
    if (Math.random() < this.config.errorRate) {
      const errors = [
        new K8sAPIError(500, 'InternalError', 'Internal server error'),
        new K8sAPIError(503, 'ServiceUnavailable', 'API server temporarily unavailable'),
        new K8sAPIError(504, 'GatewayTimeout', 'Gateway timeout'),
      ];
      throw errors[Math.floor(Math.random() * errors.length)];
    }
  }

  private checkConnection(): void {
    if (!this.connected) {
      throw new K8sAPIError(401, 'Unauthorized', 'Not connected to cluster');
    }
  }

  // Generic CRUD wrapper
  private async executeRequest<T>(operation: () => T): Promise<T> {
    await this.simulateLatency();
    this.checkConnection();
    this.maybeThrowRandomError();
    return operation();
  }

  // ModelAPI endpoints
  async listModelAPIs(namespace: string = 'agentic-system'): Promise<K8sListResponse<ModelAPI>> {
    return this.executeRequest(() => ({
      apiVersion: 'agentic.example.com/v1alpha1',
      kind: 'ModelAPIList',
      metadata: { resourceVersion: this.modelAPIs.getResourceVersion() },
      items: this.modelAPIs.list(namespace),
    }));
  }

  async getModelAPI(name: string, namespace: string = 'agentic-system'): Promise<ModelAPI> {
    return this.executeRequest(() => {
      const api = this.modelAPIs.get(name, namespace);
      if (!api) throw new K8sAPIError(404, 'NotFound', `ModelAPI "${name}" not found`);
      return api;
    });
  }

  async createModelAPI(api: ModelAPI): Promise<ModelAPI> {
    return this.executeRequest(() => this.modelAPIs.create(api));
  }

  async updateModelAPI(api: ModelAPI): Promise<ModelAPI> {
    return this.executeRequest(() => this.modelAPIs.update(api));
  }

  async deleteModelAPI(name: string, namespace: string = 'agentic-system'): Promise<K8sStatus> {
    return this.executeRequest(() => {
      this.modelAPIs.delete(name, namespace);
      return {
        kind: 'Status' as const,
        apiVersion: 'v1' as const,
        metadata: {},
        status: 'Success' as const,
        code: 200,
      };
    });
  }

  watchModelAPIs(namespace: string, callback: (event: K8sWatchEvent<ModelAPI>) => void): () => void {
    return this.modelAPIs.watch((event) => {
      if (!namespace || event.object.metadata.namespace === namespace) {
        callback(event);
      }
    });
  }

  // MCPServer endpoints
  async listMCPServers(namespace: string = 'agentic-system'): Promise<K8sListResponse<MCPServer>> {
    return this.executeRequest(() => ({
      apiVersion: 'agentic.example.com/v1alpha1',
      kind: 'MCPServerList',
      metadata: { resourceVersion: this.mcpServers.getResourceVersion() },
      items: this.mcpServers.list(namespace),
    }));
  }

  async getMCPServer(name: string, namespace: string = 'agentic-system'): Promise<MCPServer> {
    return this.executeRequest(() => {
      const server = this.mcpServers.get(name, namespace);
      if (!server) throw new K8sAPIError(404, 'NotFound', `MCPServer "${name}" not found`);
      return server;
    });
  }

  async createMCPServer(server: MCPServer): Promise<MCPServer> {
    return this.executeRequest(() => this.mcpServers.create(server));
  }

  async updateMCPServer(server: MCPServer): Promise<MCPServer> {
    return this.executeRequest(() => this.mcpServers.update(server));
  }

  async deleteMCPServer(name: string, namespace: string = 'agentic-system'): Promise<K8sStatus> {
    return this.executeRequest(() => {
      this.mcpServers.delete(name, namespace);
      return { kind: 'Status' as const, apiVersion: 'v1' as const, metadata: {}, status: 'Success' as const, code: 200 };
    });
  }

  watchMCPServers(namespace: string, callback: (event: K8sWatchEvent<MCPServer>) => void): () => void {
    return this.mcpServers.watch((event) => {
      if (!namespace || event.object.metadata.namespace === namespace) {
        callback(event);
      }
    });
  }

  // Agent endpoints
  async listAgents(namespace: string = 'agentic-system'): Promise<K8sListResponse<Agent>> {
    return this.executeRequest(() => ({
      apiVersion: 'agentic.example.com/v1alpha1',
      kind: 'AgentList',
      metadata: { resourceVersion: this.agents.getResourceVersion() },
      items: this.agents.list(namespace),
    }));
  }

  async getAgent(name: string, namespace: string = 'agentic-system'): Promise<Agent> {
    return this.executeRequest(() => {
      const agent = this.agents.get(name, namespace);
      if (!agent) throw new K8sAPIError(404, 'NotFound', `Agent "${name}" not found`);
      return agent;
    });
  }

  async createAgent(agent: Agent): Promise<Agent> {
    return this.executeRequest(() => this.agents.create(agent));
  }

  async updateAgent(agent: Agent): Promise<Agent> {
    return this.executeRequest(() => this.agents.update(agent));
  }

  async deleteAgent(name: string, namespace: string = 'agentic-system'): Promise<K8sStatus> {
    return this.executeRequest(() => {
      this.agents.delete(name, namespace);
      return { kind: 'Status' as const, apiVersion: 'v1' as const, metadata: {}, status: 'Success' as const, code: 200 };
    });
  }

  watchAgents(namespace: string, callback: (event: K8sWatchEvent<Agent>) => void): () => void {
    return this.agents.watch((event) => {
      if (!namespace || event.object.metadata.namespace === namespace) {
        callback(event);
      }
    });
  }

  // Standard K8s resources (read-only for now)
  async listPods(namespace: string = 'agentic-system'): Promise<K8sListResponse<Pod>> {
    return this.executeRequest(() => ({
      apiVersion: 'v1',
      kind: 'PodList',
      metadata: { resourceVersion: this.pods.getResourceVersion() },
      items: this.pods.list(namespace),
    }));
  }

  async listDeployments(namespace: string = 'agentic-system'): Promise<K8sListResponse<Deployment>> {
    return this.executeRequest(() => ({
      apiVersion: 'apps/v1',
      kind: 'DeploymentList',
      metadata: { resourceVersion: this.deployments.getResourceVersion() },
      items: this.deployments.list(namespace),
    }));
  }

  async listPVCs(namespace: string = 'agentic-system'): Promise<K8sListResponse<PersistentVolumeClaim>> {
    return this.executeRequest(() => ({
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaimList',
      metadata: { resourceVersion: this.pvcs.getResourceVersion() },
      items: this.pvcs.list(namespace),
    }));
  }

  // Pod logs (simulated)
  async getPodLogs(
    name: string,
    namespace: string = 'agentic-system',
    options: { container?: string; tailLines?: number; follow?: boolean } = {}
  ): Promise<string> {
    return this.executeRequest(() => {
      const pod = this.pods.get(name, namespace);
      if (!pod) throw new K8sAPIError(404, 'NotFound', `Pod "${name}" not found`);
      
      const lines = options.tailLines || 100;
      const logLines: string[] = [];
      
      for (let i = 0; i < lines; i++) {
        const timestamp = new Date(Date.now() - (lines - i) * 1000).toISOString();
        const level = ['INFO', 'DEBUG', 'WARN'][Math.floor(Math.random() * 3)];
        logLines.push(`${timestamp} [${level}] Processing request ${i + 1}`);
      }
      
      return logLines.join('\n');
    });
  }

  // Simulate status changes for realism
  startStatusSimulation(): () => void {
    const interval = setInterval(() => {
      if (!this.connected) return;

      // Randomly update agent statuses
      const agents = this.agents.list();
      if (agents.length > 0) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        const statuses: ResourceStatus[] = ['Running', 'Pending', 'Error'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        if (randomAgent.status?.phase !== newStatus) {
          this.agents.update({
            ...randomAgent,
            status: {
              ...randomAgent.status,
              phase: newStatus,
              message: newStatus === 'Error' ? 'Simulated error for testing' : undefined,
            },
          });
        }
      }
    }, this.config.watchIntervalMs);

    this.watchIntervals.set('status-simulation', interval);
    return () => {
      clearInterval(interval);
      this.watchIntervals.delete('status-simulation');
    };
  }

  // Initialize with realistic mock data
  private initializeMockData(): void {
    // ModelAPIs
    this.modelAPIs.seed([
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'ModelAPI',
        metadata: {
          name: 'openai-proxy',
          namespace: 'agentic-system',
          uid: 'modelapi-1',
          creationTimestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        spec: {
          mode: 'Proxy',
          proxyConfig: {
            env: [
              { name: 'OPENAI_API_KEY', valueFrom: { secretKeyRef: { name: 'openai-secret', key: 'api-key' } } },
              { name: 'LITELLM_LOG', value: 'INFO' },
            ],
          },
        },
        status: { phase: 'Running', endpoint: 'http://openai-proxy:8080' },
      },
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'ModelAPI',
        metadata: {
          name: 'llama-hosted',
          namespace: 'agentic-system',
          uid: 'modelapi-2',
          creationTimestamp: new Date(Date.now() - 172800000).toISOString(),
        },
        spec: {
          mode: 'Hosted',
          serverConfig: {
            model: 'NousResearch/Meta-Llama-3-8B-Instruct',
            env: [{ name: 'VLLM_LOG_LEVEL', value: 'INFO' }],
          },
        },
        status: { phase: 'Running', endpoint: 'http://llama-hosted:8000' },
      },
    ]);

    // MCPServers
    this.mcpServers.seed([
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: 'websearch-mcp',
          namespace: 'agentic-system',
          uid: 'mcp-1',
          creationTimestamp: new Date(Date.now() - 43200000).toISOString(),
        },
        spec: {
          type: 'python-custom',
          config: {
            mcp: 'websearch',
            env: [
              { name: 'WEBSEARCH_PROVIDER', value: 'serper' },
              { name: 'SERPER_API_KEY', valueFrom: { secretKeyRef: { name: 'serper-key', key: 'api-key' } } },
            ],
          },
        },
        status: { phase: 'Running', tools: ['search', 'scrape', 'summarize'] },
      },
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: 'filesystem-mcp',
          namespace: 'agentic-system',
          uid: 'mcp-2',
          creationTimestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        spec: {
          type: 'npx',
          config: {
            mcp: 'filesystem',
            env: [{ name: 'ROOT_PATH', value: '/data' }],
          },
        },
        status: { phase: 'Running', tools: ['read', 'write', 'list', 'delete'] },
      },
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'MCPServer',
        metadata: {
          name: 'code-executor',
          namespace: 'agentic-system',
          uid: 'mcp-3',
          creationTimestamp: new Date(Date.now() - 129600000).toISOString(),
        },
        spec: {
          type: 'uvx',
          config: {
            mcp: 'code-executor',
            env: [],
          },
        },
        status: { phase: 'Pending', message: 'Waiting for resources' },
      },
    ]);

    // Agents
    this.agents.seed([
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'Agent',
        metadata: {
          name: 'orchestrator-agent',
          namespace: 'agentic-system',
          uid: 'agent-1',
          creationTimestamp: new Date(Date.now() - 21600000).toISOString(),
        },
        spec: {
          modelAPI: 'openai-proxy',
          mcpServers: ['websearch-mcp', 'filesystem-mcp'],
          agentNetwork: {
            expose: true,
            access: ['coder-agent', 'reviewer-agent'],
          },
          config: {
            description: 'Main orchestrator for task coordination',
            instructions: 'Coordinate tasks between coder and reviewer agents.',
          },
        },
        status: { phase: 'Running', connectedAgents: ['coder-agent', 'reviewer-agent'] },
      },
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'Agent',
        metadata: {
          name: 'coder-agent',
          namespace: 'agentic-system',
          uid: 'agent-2',
          creationTimestamp: new Date(Date.now() - 43200000).toISOString(),
        },
        spec: {
          modelAPI: 'llama-hosted',
          mcpServers: ['filesystem-mcp', 'code-executor'],
          agentNetwork: {
            expose: true,
            access: ['orchestrator-agent'],
          },
          config: {
            description: 'Code generation and modification agent',
            instructions: 'Generate and modify code based on requirements.',
          },
        },
        status: { phase: 'Running', connectedAgents: ['orchestrator-agent'] },
      },
      {
        apiVersion: 'agentic.example.com/v1alpha1',
        kind: 'Agent',
        metadata: {
          name: 'reviewer-agent',
          namespace: 'agentic-system',
          uid: 'agent-3',
          creationTimestamp: new Date(Date.now() - 64800000).toISOString(),
        },
        spec: {
          modelAPI: 'openai-proxy',
          mcpServers: ['websearch-mcp'],
          agentNetwork: {
            expose: false,
            access: ['orchestrator-agent'],
          },
          config: {
            description: 'Code review and quality assurance agent',
            instructions: 'Review code for quality and suggest improvements.',
          },
        },
        status: { phase: 'Error', message: 'Connection to ModelAPI failed' },
      },
    ]);

    // Pods
    this.pods.seed([
      {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'openai-proxy-7d8f9c6b5-abc12',
          namespace: 'agentic-system',
          uid: 'pod-1',
          labels: { app: 'openai-proxy' },
        },
        spec: {
          containers: [{ name: 'litellm', image: 'ghcr.io/litellm/litellm:latest', ports: [{ containerPort: 8080 }] }],
        },
        status: { phase: 'Running', podIP: '10.0.0.15', hostIP: '192.168.1.10' },
      },
      {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'llama-hosted-5c4d3e2f1-xyz89',
          namespace: 'agentic-system',
          uid: 'pod-2',
          labels: { app: 'llama-hosted' },
        },
        spec: {
          containers: [{ name: 'vllm', image: 'vllm/vllm-openai:latest', ports: [{ containerPort: 8000 }] }],
        },
        status: { phase: 'Running', podIP: '10.0.0.16', hostIP: '192.168.1.10' },
      },
      {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
          name: 'orchestrator-agent-8a7b6c5d4-qrs45',
          namespace: 'agentic-system',
          uid: 'pod-3',
          labels: { app: 'orchestrator-agent' },
        },
        spec: {
          containers: [{ name: 'agent', image: 'agentic/runtime:latest', ports: [{ containerPort: 9000 }] }],
        },
        status: { phase: 'Running', podIP: '10.0.0.17', hostIP: '192.168.1.11' },
      },
    ]);

    // Deployments
    this.deployments.seed([
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'openai-proxy',
          namespace: 'agentic-system',
          uid: 'deploy-1',
        },
        spec: {
          replicas: 2,
          selector: { matchLabels: { app: 'openai-proxy' } },
        },
        status: { replicas: 2, readyReplicas: 2, availableReplicas: 2 },
      },
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'llama-hosted',
          namespace: 'agentic-system',
          uid: 'deploy-2',
        },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: 'llama-hosted' } },
        },
        status: { replicas: 1, readyReplicas: 1, availableReplicas: 1 },
      },
    ]);

    // PVCs
    this.pvcs.seed([
      {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: {
          name: 'model-cache',
          namespace: 'agentic-system',
          uid: 'pvc-1',
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: { requests: { storage: '100Gi' } },
          storageClassName: 'fast-ssd',
        },
        status: { phase: 'Bound', capacity: { storage: '100Gi' } },
      },
    ]);
  }
}

// Singleton instance
export const mockK8sAPI = new MockKubernetesAPI();
