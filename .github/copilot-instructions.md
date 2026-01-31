# KAOS-UI Copilot Instructions

This document provides context for GitHub Copilot when working with the KAOS-UI codebase.

## Project Overview

**KAOS-UI** is a React-based web dashboard for the Kubernetes Agent Orchestration System (KAOS). It provides real-time visibility and management of AI agents, MCP servers, and Model APIs running on Kubernetes.

### Key Technologies
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with shadcn/ui components
- **Zustand** for state management
- **TanStack Query** for data fetching
- **React Router** for navigation
- **Playwright** for end-to-end testing

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │────▶│  CORS Proxy  │────▶│  Kubernetes API │
│  (KAOS UI)  │     │  (localhost) │     │    (cluster)    │
└─────────────┘     └──────────────┘     └─────────────────┘
```

The UI is a static web application that connects to Kubernetes via a local CORS proxy started by `kaos ui --no-browser`.

## Directory Structure

```
src/
├── components/          # React components
│   ├── agent/          # Agent-specific components
│   ├── mcp/            # MCP Server components
│   ├── modelapi/       # Model API components
│   ├── dashboard/      # Dashboard widgets
│   ├── layout/         # Layout components (sidebar, header)
│   ├── settings/       # Settings components
│   ├── shared/         # Shared/reusable components
│   └── ui/             # shadcn/ui base components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── kubernetes-client.ts  # K8s API client
│   └── utils.ts        # General utilities
├── pages/              # Route page components
├── stores/             # Zustand stores
└── types/              # TypeScript type definitions
    ├── kubernetes.ts   # KAOS CRD types (Agent, MCPServer, ModelAPI)
    └── mcp.ts          # MCP protocol types
```

## Running Locally

### Development Server
```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

### Connecting to a Cluster
1. Start the KAOS proxy (handles CORS):
   ```bash
   kaos ui --no-browser
   # Starts proxy at http://localhost:8080
   ```
2. Open the UI and configure connection in Settings > Connectivity
3. Enter proxy URL: `http://localhost:8080`
4. Select your namespace

### Building
```bash
npm run build      # Production build
npm run build:dev  # Development build with source maps
```

## KAOS Custom Resources

The UI manages three Kubernetes Custom Resources:

### 1. ModelAPI
Provides LLM API endpoints. Two modes:
- **Proxy**: Routes to external LLM providers via LiteLLM
- **Hosted**: Runs Ollama locally in the cluster

```typescript
interface ModelAPISpec {
  mode: 'Proxy' | 'Hosted';
  proxyConfig?: {
    models: string[];      // List of supported models
    provider?: string;     // LiteLLM provider prefix
    apiBase?: string;
    apiKey?: ApiKeySource;
  };
  hostedConfig?: {
    model: string;         // Single Ollama model
  };
}
```

### 2. MCPServer
Model Context Protocol servers providing tools to agents.

```typescript
interface MCPServerSpec {
  type: 'python-runtime' | 'node-runtime';
  config: {
    tools?: {
      fromPackage?: string;   // uvx package name
      fromString?: string;    // Inline Python code
    };
  };
}
```

### 3. Agent
AI agents with memory, tools, and multi-agent capabilities.

```typescript
interface AgentSpec {
  modelAPI: string;           // Reference to ModelAPI
  model: string;              // Model identifier
  mcpServers?: string[];      // References to MCPServers
  agentNetwork?: {
    expose?: boolean;         // Enable A2A endpoint
    access?: string[];        // Allowed peer agents
  };
  config?: {
    description?: string;
    instructions?: string;
  };
}
```

## Code Style Guidelines

### Components
- Use functional components with hooks
- Place component-specific types in the same file
- Use shadcn/ui components from `@/components/ui/`
- Follow the existing pattern of Overview/Pods/Detail tabs

### State Management
- Use Zustand store (`useKubernetesStore`) for global state
- Use React Query for server state that needs caching
- Use local state for component-specific UI state

### API Calls
- Use `k8sClient` from `@/lib/kubernetes-client.ts`
- Use `useRealKubernetesAPI` hook for CRUD operations
- Handle errors gracefully with toast notifications

### Testing
- Use Playwright for end-to-end tests
- Tests are in `/tests` directory
- Smoke tests validate basic functionality
- Read tests validate list and detail pages

## Common Tasks

### Adding a new field to a CRD type
1. Update type in `src/types/kubernetes.ts`
2. Update relevant Overview component to display the field
3. Update any forms that create/edit the resource
4. Sync with KAOS operator types if needed

### Adding a new page
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in sidebar (`src/components/layout/`)

### Adding a new test
1. Create test file in appropriate `/tests` subdirectory
2. Use fixtures from `tests/fixtures/test-utils.ts`
3. Follow existing test patterns

## Related Documentation

- [KAOS Operator Docs](../kaos/docs/) - Full KAOS documentation
- [UI Overview](../kaos/docs/ui/overview.md) - UI architecture
- [UI Features](../kaos/docs/ui/features.md) - Feature walkthrough

## Additional Instructions

For specific areas, see:
- `.github/instructions/components.instructions.md` - UI component guidelines
- `.github/instructions/testing.instructions.md` - Testing patterns
- `.github/instructions/kubernetes-types.instructions.md` - CRD type sync
