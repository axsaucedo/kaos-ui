// Kubernetes CRD Types for KAOS (K8s Agent Orchestration System)
// API Group: kaos.tools/v1alpha1

export type ResourceStatus = 'Running' | 'Pending' | 'Error' | 'Terminated' | 'Unknown' | 'Ready' | 'Failed' | 'Waiting';

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: {
      name: string;
      key: string;
    };
    configMapKeyRef?: {
      name: string;
      key: string;
    };
  };
}

export interface ResourceMetadata {
  name: string;
  namespace: string;
  uid?: string;
  creationTimestamp?: string;
  resourceVersion?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

// ============= ModelAPI CRD =============
export type ModelAPIMode = 'Proxy' | 'Hosted';

// ConfigYamlSource defines the source of LiteLLM config YAML
export interface ConfigYamlSource {
  // FromString is the config YAML as a literal string
  fromString?: string;
  // FromSecretKeyRef is a reference to a Secret key containing the config YAML
  fromSecretKeyRef?: {
    name: string;
    key: string;
  };
}

// ProxyConfig defines configuration for LiteLLM proxy mode
export interface ProxyConfig {
  // APIBase is the base URL of the backend LLM API to proxy to (e.g., http://host.docker.internal:11434)
  apiBase?: string;
  // Model is the model identifier to proxy (e.g., ollama/smollm2:135m)
  model?: string;
  // ConfigYaml allows providing a custom LiteLLM config (for advanced multi-model routing)
  configYaml?: ConfigYamlSource;
  // Env variables to pass to the proxy container
  env?: EnvVar[];
}

// HostedConfig defines configuration for Ollama hosted mode
export interface HostedConfig {
  // Model is the Ollama model to run (e.g., smollm2:135m)
  model: string;
  // Env variables to pass to the Ollama server
  env?: EnvVar[];
}

// GatewayRoute configures Gateway API routing
export interface GatewayRoute {
  timeout?: string;
  retries?: number;
}

export interface ModelAPISpec {
  // Mode specifies the deployment mode (Proxy or Hosted)
  mode: ModelAPIMode;
  // ProxyConfig contains configuration for Proxy mode
  proxyConfig?: ProxyConfig;
  // HostedConfig contains configuration for Hosted mode (replaces serverConfig)
  hostedConfig?: HostedConfig;
  // GatewayRoute configures Gateway API routing (timeout, etc.)
  gatewayRoute?: GatewayRoute;
  // PodSpec allows overriding the generated pod spec
  podSpec?: Record<string, unknown>;
}

export interface ModelAPIStatus {
  // Phase of the deployment (Pending, Ready, Failed)
  phase?: string;
  // Ready indicates if the model API is ready
  ready?: boolean;
  // Endpoint is the service endpoint for the model API
  endpoint?: string;
  // Message provides additional status information
  message?: string;
}

export interface ModelAPI {
  apiVersion: string;
  kind: 'ModelAPI';
  metadata: ResourceMetadata;
  spec: ModelAPISpec;
  status?: ModelAPIStatus;
}

// ============= MCPServer CRD =============
export type MCPServerType = 'python-runtime' | 'node-runtime';

// MCPToolsConfig defines the tools configuration for MCP server
export interface MCPToolsConfig {
  // FromPackage is the package name to run with uvx (e.g., "mcp-server-calculator")
  fromPackage?: string;
  // FromString is a Python literal string defining tools dynamically
  fromString?: string;
  // FromSecretKeyRef is a reference to a Secret key containing tool definitions
  fromSecretKeyRef?: {
    name: string;
    key: string;
  };
}

// MCPServerConfig defines the configuration for MCP server
export interface MCPServerConfig {
  // Tools configures how MCP tools are loaded
  tools?: MCPToolsConfig;
  // Env variables to pass to the MCP server
  env?: EnvVar[];
}

export interface MCPServerSpec {
  // Type specifies the MCP server runtime type
  type: MCPServerType;
  // Config contains the MCP server configuration
  config: MCPServerConfig;
  // GatewayRoute configures Gateway API routing (timeout, etc.)
  gatewayRoute?: GatewayRoute;
  // PodSpec allows overriding the generated pod spec
  podSpec?: Record<string, unknown>;
}

export interface MCPServerStatus {
  // Phase of the deployment (Pending, Ready, Failed)
  phase?: string;
  // Ready indicates if the MCP server is ready
  ready?: boolean;
  // Endpoint is the service endpoint for the MCP server
  endpoint?: string;
  // AvailableTools lists tools exposed by this server
  availableTools?: string[];
  // Message provides additional status information
  message?: string;
}

export interface MCPServer {
  apiVersion: string;
  kind: 'MCPServer';
  metadata: ResourceMetadata;
  spec: MCPServerSpec;
  status?: MCPServerStatus;
}

// ============= Agent CRD =============

// AgentNetworkConfig defines A2A communication settings
export interface AgentNetworkConfig {
  // Expose indicates if this agent exposes an Agent Card endpoint for A2A
  expose?: boolean;
  // Access is the allowlist of peer agent names this agent can call
  access?: string[];
}

// AgentConfig defines agent-specific configuration
export interface AgentConfig {
  // Description is a human-readable description of the agent
  description?: string;
  // Instructions are the system instructions for the agent
  instructions?: string;
  // ReasoningLoopMaxSteps is the maximum number of reasoning steps before stopping (1-20, default 5)
  reasoningLoopMaxSteps?: number;
  // Env variables to pass to the agent runtime
  env?: EnvVar[];
}

export interface AgentSpec {
  // ModelAPI is the name of the ModelAPI resource this agent uses
  modelAPI: string;
  // MCPServers is a list of MCPServer names this agent can use
  mcpServers?: string[];
  // AgentNetwork defines A2A communication settings
  agentNetwork?: AgentNetworkConfig;
  // Config contains agent-specific configuration
  config?: AgentConfig;
  // WaitForDependencies controls whether the agent waits for ModelAPI and MCPServers to be ready
  waitForDependencies?: boolean;
  // GatewayRoute configures Gateway API routing (timeout, etc.)
  gatewayRoute?: GatewayRoute;
  // PodSpec allows overriding the generated pod spec
  podSpec?: Record<string, unknown>;
}

export interface AgentStatus {
  // Phase of the deployment (Pending, Ready, Failed, Waiting)
  phase?: string;
  // Ready indicates if the agent is ready
  ready?: boolean;
  // Endpoint is the Agent Card HTTP endpoint for A2A communication
  endpoint?: string;
  // LinkedResources tracks references to ModelAPI and MCPServer resources
  linkedResources?: Record<string, string>;
  // Message provides additional status information
  message?: string;
}

export interface Agent {
  apiVersion: string;
  kind: 'Agent';
  metadata: ResourceMetadata;
  spec: AgentSpec;
  status?: AgentStatus;
}

// ============= Standard Kubernetes Resources =============

export interface Pod {
  apiVersion: string;
  kind: 'Pod';
  metadata: ResourceMetadata;
  spec: {
    containers: {
      name: string;
      image: string;
      ports?: { containerPort: number }[];
    }[];
    nodeName?: string;
  };
  status?: {
    phase: ResourceStatus;
    podIP?: string;
    hostIP?: string;
    containerStatuses?: {
      name: string;
      ready: boolean;
      restartCount: number;
    }[];
  };
}

export interface Deployment {
  apiVersion: string;
  kind: 'Deployment';
  metadata: ResourceMetadata;
  spec: {
    replicas: number;
    selector: {
      matchLabels: Record<string, string>;
    };
    template?: {
      metadata?: {
        labels?: Record<string, string>;
      };
      spec?: {
        containers?: {
          name: string;
          image: string;
          ports?: { containerPort: number }[];
        }[];
      };
    };
  };
  status?: {
    replicas: number;
    readyReplicas: number;
    availableReplicas: number;
  };
}

export interface PersistentVolumeClaim {
  apiVersion: string;
  kind: 'PersistentVolumeClaim';
  metadata: ResourceMetadata;
  spec: {
    accessModes: string[];
    resources: {
      requests: {
        storage: string;
      };
    };
    storageClassName?: string;
  };
  status?: {
    phase: 'Pending' | 'Bound' | 'Lost';
    capacity?: {
      storage: string;
    };
  };
}

export interface Service {
  apiVersion: string;
  kind: 'Service';
  metadata: ResourceMetadata;
  spec: {
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
    ports: {
      port: number;
      targetPort: number | string;
      protocol: string;
      name?: string;
      nodePort?: number;
    }[];
    selector?: Record<string, string>;
    clusterIP?: string;
    externalIPs?: string[];
  };
  status?: {
    loadBalancer?: {
      ingress?: { ip?: string; hostname?: string }[];
    };
  };
}

export interface ConfigMap {
  apiVersion: string;
  kind: 'ConfigMap';
  metadata: ResourceMetadata;
  data?: Record<string, string>;
  binaryData?: Record<string, string>;
}

export interface SecretRef {
  apiVersion: string;
  kind: 'Secret';
  metadata: ResourceMetadata;
  type: string;
}

// Union types for resources
export type AgenticResource = ModelAPI | MCPServer | Agent;
export type KubernetesResource = Pod | Deployment | PersistentVolumeClaim | Service;
export type Resource = AgenticResource | KubernetesResource;

// Log entry
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  resourceName?: string;
  resourceKind?: string;
}

// Canvas node for visual editor
export interface CanvasNode {
  id: string;
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  position: { x: number; y: number };
  data: AgenticResource;
  selected?: boolean;
}

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  zoom: number;
  pan: { x: number; y: number };
}
