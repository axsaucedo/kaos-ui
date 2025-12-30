import { create } from 'zustand';
import type {
  ModelAPI,
  MCPServer,
  Agent,
  Pod,
  Deployment,
  PersistentVolumeClaim,
  LogEntry,
  CanvasNode,
  CanvasConnection,
  ResourceStatus,
} from '@/types/kubernetes';

interface KubernetesState {
  // Agentic Resources
  modelAPIs: ModelAPI[];
  mcpServers: MCPServer[];
  agents: Agent[];
  
  // Standard K8s Resources
  pods: Pod[];
  deployments: Deployment[];
  pvcs: PersistentVolumeClaim[];
  
  // Logs
  logs: LogEntry[];
  
  // Canvas state
  canvasNodes: CanvasNode[];
  canvasConnections: CanvasConnection[];
  selectedNodeId: string | null;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  
  // UI State
  selectedResource: any | null;
  activeTab: string;
  
  // Actions
  setModelAPIs: (apis: ModelAPI[]) => void;
  addModelAPI: (api: ModelAPI) => void;
  updateModelAPI: (name: string, api: Partial<ModelAPI>) => void;
  deleteModelAPI: (name: string) => void;
  
  setMCPServers: (servers: MCPServer[]) => void;
  addMCPServer: (server: MCPServer) => void;
  updateMCPServer: (name: string, server: Partial<MCPServer>) => void;
  deleteMCPServer: (name: string) => void;
  
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (name: string, agent: Partial<Agent>) => void;
  deleteAgent: (name: string) => void;
  
  setPods: (pods: Pod[]) => void;
  setDeployments: (deployments: Deployment[]) => void;
  setPVCs: (pvcs: PersistentVolumeClaim[]) => void;
  
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  
  // Canvas actions
  addCanvasNode: (node: CanvasNode) => void;
  updateCanvasNode: (id: string, updates: Partial<CanvasNode>) => void;
  removeCanvasNode: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  addCanvasConnection: (connection: CanvasConnection) => void;
  removeCanvasConnection: (id: string) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;
  
  setSelectedResource: (resource: any | null) => void;
  setActiveTab: (tab: string) => void;
}

// Mock data generators
const generateMockModelAPIs = (): ModelAPI[] => [
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
];

const generateMockMCPServers = (): MCPServer[] => [
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
];

const generateMockAgents = (): Agent[] => [
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
];

const generateMockPods = (): Pod[] => [
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
];

const generateMockDeployments = (): Deployment[] => [
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
];

const generateMockPVCs = (): PersistentVolumeClaim[] => [
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
];

const generateMockLogs = (): LogEntry[] => [
  { timestamp: new Date().toISOString(), level: 'info', message: 'ModelAPI openai-proxy started successfully', source: 'controller', resourceName: 'openai-proxy', resourceKind: 'ModelAPI' },
  { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'info', message: 'Agent orchestrator-agent connected to network', source: 'agent-runtime', resourceName: 'orchestrator-agent', resourceKind: 'Agent' },
  { timestamp: new Date(Date.now() - 10000).toISOString(), level: 'warn', message: 'MCPServer code-executor pending resources', source: 'scheduler', resourceName: 'code-executor', resourceKind: 'MCPServer' },
  { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'error', message: 'Agent reviewer-agent failed to connect to ModelAPI', source: 'agent-runtime', resourceName: 'reviewer-agent', resourceKind: 'Agent' },
  { timestamp: new Date(Date.now() - 20000).toISOString(), level: 'debug', message: 'Reconciliation loop completed for agentic-system namespace', source: 'controller', resourceName: undefined, resourceKind: undefined },
];

export const useKubernetesStore = create<KubernetesState>((set) => ({
  // Initialize with mock data
  modelAPIs: generateMockModelAPIs(),
  mcpServers: generateMockMCPServers(),
  agents: generateMockAgents(),
  pods: generateMockPods(),
  deployments: generateMockDeployments(),
  pvcs: generateMockPVCs(),
  logs: generateMockLogs(),
  
  canvasNodes: [],
  canvasConnections: [],
  selectedNodeId: null,
  canvasZoom: 1,
  canvasPan: { x: 0, y: 0 },
  
  selectedResource: null,
  activeTab: 'overview',
  
  // ModelAPI actions
  setModelAPIs: (apis) => set({ modelAPIs: apis }),
  addModelAPI: (api) => set((state) => ({ modelAPIs: [...state.modelAPIs, api] })),
  updateModelAPI: (name, api) => set((state) => ({
    modelAPIs: state.modelAPIs.map((a) => a.metadata.name === name ? { ...a, ...api } : a),
  })),
  deleteModelAPI: (name) => set((state) => ({
    modelAPIs: state.modelAPIs.filter((a) => a.metadata.name !== name),
  })),
  
  // MCPServer actions
  setMCPServers: (servers) => set({ mcpServers: servers }),
  addMCPServer: (server) => set((state) => ({ mcpServers: [...state.mcpServers, server] })),
  updateMCPServer: (name, server) => set((state) => ({
    mcpServers: state.mcpServers.map((s) => s.metadata.name === name ? { ...s, ...server } : s),
  })),
  deleteMCPServer: (name) => set((state) => ({
    mcpServers: state.mcpServers.filter((s) => s.metadata.name !== name),
  })),
  
  // Agent actions
  setAgents: (agents) => set({ agents }),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (name, agent) => set((state) => ({
    agents: state.agents.map((a) => a.metadata.name === name ? { ...a, ...agent } : a),
  })),
  deleteAgent: (name) => set((state) => ({
    agents: state.agents.filter((a) => a.metadata.name !== name),
  })),
  
  // K8s resources
  setPods: (pods) => set({ pods }),
  setDeployments: (deployments) => set({ deployments }),
  setPVCs: (pvcs) => set({ pvcs }),
  
  // Logs
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs].slice(0, 1000) })),
  clearLogs: () => set({ logs: [] }),
  
  // Canvas actions
  addCanvasNode: (node) => set((state) => ({ canvasNodes: [...state.canvasNodes, node] })),
  updateCanvasNode: (id, updates) => set((state) => ({
    canvasNodes: state.canvasNodes.map((n) => n.id === id ? { ...n, ...updates } : n),
  })),
  removeCanvasNode: (id) => set((state) => ({
    canvasNodes: state.canvasNodes.filter((n) => n.id !== id),
    canvasConnections: state.canvasConnections.filter((c) => c.sourceId !== id && c.targetId !== id),
  })),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  addCanvasConnection: (connection) => set((state) => ({ canvasConnections: [...state.canvasConnections, connection] })),
  removeCanvasConnection: (id) => set((state) => ({
    canvasConnections: state.canvasConnections.filter((c) => c.id !== id),
  })),
  setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
  setCanvasPan: (pan) => set({ canvasPan: pan }),
  
  setSelectedResource: (resource) => set({ selectedResource: resource }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
