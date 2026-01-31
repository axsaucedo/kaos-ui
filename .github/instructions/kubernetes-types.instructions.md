# Kubernetes Types Instructions

Guidelines for managing KAOS CRD type definitions in the UI.

## Overview

The KAOS-UI TypeScript types in `src/types/kubernetes.ts` must stay in sync with the KAOS operator Go types in `operator/api/v1alpha1/`.

## Type Locations

| Resource | UI Types | Operator Types |
|----------|----------|----------------|
| ModelAPI | `src/types/kubernetes.ts` | `../kaos/operator/api/v1alpha1/modelapi_types.go` |
| MCPServer | `src/types/kubernetes.ts` | `../kaos/operator/api/v1alpha1/mcpserver_types.go` |
| Agent | `src/types/kubernetes.ts` | `../kaos/operator/api/v1alpha1/agent_types.go` |

## Syncing Types

When the operator types change, update the UI types:

### 1. Check Operator Changes
```bash
# From kaos-ui directory
cat ../kaos/operator/api/v1alpha1/modelapi_types.go | grep -A 20 "type.*Spec struct"
```

### 2. Update TypeScript Types
Edit `src/types/kubernetes.ts` to match the Go structs.

### 3. Go to TypeScript Mapping

| Go Type | TypeScript Type |
|---------|-----------------|
| `string` | `string` |
| `[]string` | `string[]` |
| `*string` | `string \| undefined` or optional field |
| `map[string]string` | `Record<string, string>` |
| `bool` | `boolean` |
| `int32` | `number` |
| `struct { ... }` | `interface { ... }` |
| `*SomeType` | `SomeType \| undefined` or `SomeType?` |

## Current Type Definitions

### ModelAPI

```typescript
// Mode enum
export type ModelAPIMode = 'Proxy' | 'Hosted';

// ProxyConfig - for external LLM providers
export interface ProxyConfig {
  // Models is the list of model identifiers (e.g., ["openai/gpt-5-mini"])
  models: string[];
  // Provider is the LiteLLM provider prefix (e.g., "openai", "anthropic", "ollama")
  provider?: string;
  // APIBase is the backend LLM API URL
  apiBase?: string;
  // APIKey for authentication
  apiKey?: ApiKeySource;
  // ConfigYaml for advanced LiteLLM configuration
  configYaml?: ConfigYamlSource;
  // Env variables for the proxy container
  env?: EnvVar[];
}

// HostedConfig - for local Ollama deployment
export interface HostedConfig {
  // Model is the single Ollama model to run
  model: string;
  // Env variables for Ollama
  env?: EnvVar[];
}

export interface ModelAPISpec {
  mode: ModelAPIMode;
  proxyConfig?: ProxyConfig;
  hostedConfig?: HostedConfig;
  gatewayRoute?: GatewayRoute;
  podSpec?: Record<string, unknown>;
}
```

### Key Differences: Proxy vs Hosted

| Aspect | Proxy Mode | Hosted Mode |
|--------|------------|-------------|
| Models | `models: string[]` (multiple) | `model: string` (single) |
| Provider | `provider?: string` | N/A |
| Use Case | External LLM APIs | Local Ollama |

### MCPServer

```typescript
export interface MCPServerSpec {
  type: 'python-runtime' | 'node-runtime';
  config: MCPServerConfig;
  gatewayRoute?: GatewayRoute;
  podSpec?: Record<string, unknown>;
}

export interface MCPServerConfig {
  tools?: MCPToolsConfig;
  env?: EnvVar[];
}

export interface MCPToolsConfig {
  fromPackage?: string;     // uvx package (e.g., "mcp-server-calculator")
  fromString?: string;      // Inline Python code
  fromSecretKeyRef?: { name: string; key: string; };
}
```

### Agent

```typescript
export interface AgentSpec {
  modelAPI: string;           // Reference to ModelAPI name
  model: string;              // Model identifier
  mcpServers?: string[];      // References to MCPServer names
  agentNetwork?: AgentNetworkConfig;
  config?: AgentConfig;
  waitForDependencies?: boolean;
  gatewayRoute?: GatewayRoute;
  podSpec?: Record<string, unknown>;
}

export interface AgentConfig {
  description?: string;
  instructions?: string;
  reasoningLoopMaxSteps?: number;
  memory?: AgentMemoryConfig;
  env?: EnvVar[];
}
```

## Common Patterns

### ApiKeySource
Used for sensitive values that can come from different sources:
```typescript
export interface ApiKeySource {
  value?: string;  // Direct value (not recommended for production)
  valueFrom?: {
    secretKeyRef?: { name: string; key: string; };
    configMapKeyRef?: { name: string; key: string; };
  };
}
```

### EnvVar
Standard Kubernetes environment variable pattern:
```typescript
export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: { name: string; key: string; };
    configMapKeyRef?: { name: string; key: string; };
  };
}
```

### GatewayRoute
Common gateway configuration:
```typescript
export interface GatewayRoute {
  timeout?: string;   // e.g., "30s", "5m"
  retries?: number;
}
```

## Adding New Fields

When the operator adds a new field:

1. **Add to TypeScript interface**
   ```typescript
   export interface ProxyConfig {
     // ... existing fields
     newField?: string;  // Add new field
   }
   ```

2. **Update UI components to display it**
   ```tsx
   // In ModelAPIOverview.tsx
   {modelAPI.spec.proxyConfig?.newField && (
     <div>
       <span className="text-muted-foreground">New Field</span>
       <code>{modelAPI.spec.proxyConfig.newField}</code>
     </div>
   )}
   ```

3. **Update forms if the field is editable**

4. **Add tests for the new field**

## Validation

### Type Checking
```bash
npm run build  # Will catch type errors
```

### Visual Verification
1. Run `npm run dev`
2. Connect to a cluster with the new fields
3. Verify the UI displays them correctly

## Reference: Operator Type Files

```bash
# View operator types
ls ../kaos/operator/api/v1alpha1/

# Key files:
# - modelapi_types.go    - ModelAPI CRD
# - mcpserver_types.go   - MCPServer CRD
# - agent_types.go       - Agent CRD
# - common_types.go      - Shared types (EnvVar, etc.)
```
