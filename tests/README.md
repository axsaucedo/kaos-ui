# Puppeteer Integration Tests

This directory contains comprehensive Puppeteer-based integration tests for the Kubernetes Agentic Dashboard.

## Test Structure

```
tests/
├── helpers/
│   └── setup.ts          # Test utilities and browser setup
├── ui/
│   ├── dashboard.test.ts # Dashboard smoke tests
│   ├── navigation.test.ts # Tab navigation tests
│   ├── resources.test.ts  # Resource list tests
│   ├── canvas.test.ts     # Visual canvas tests
│   └── logs.test.ts       # Logs viewer tests
├── e2e/
│   └── workflows.test.ts  # End-to-end workflow tests
└── screenshots/           # Test failure screenshots
```

## Test Categories

### 1. Dashboard Smoke Tests (`ui/dashboard.test.ts`)
- Initial page load validation
- Sidebar, header, and main content verification
- Resource stat cards display
- System health indicators

### 2. Navigation Tests (`ui/navigation.test.ts`)
- All tab navigation works correctly
- Tab content renders appropriately
- Navigation back to Overview works

### 3. Resource List Tests (`ui/resources.test.ts`)
- Model APIs list with mock data
- MCP Servers list with tools display
- Agents list with connections
- Kubernetes resources (Pods, Deployments, Volumes)

### 4. Visual Canvas Tests (`ui/canvas.test.ts`)
- React Flow canvas renders
- Resource palette with drag items
- Nodes display with correct data
- Canvas controls (minimap, zoom, etc.)

### 5. Logs Viewer Tests (`ui/logs.test.ts`)
- Log entries display
- Search and filter functionality
- Level filtering

### 6. End-to-End Workflow Tests (`e2e/workflows.test.ts`)
- Complete navigation workflows
- Kubernetes resources browsing
- Tools access workflow
- Sidebar collapse functionality
- Full application health check

## Running Tests

```bash
# Start the development server first
npm run dev

# In another terminal, run tests
npm run test

# Run specific test file
npm run test -- tests/ui/dashboard.test.ts

# Run with verbose output
npm run test -- --reporter=verbose
```

## Test Configuration

Tests are configured in `vitest.config.ts` with:
- 60 second test timeout
- 30 second hook timeout
- Node environment for Puppeteer
- Path aliases matching the main app

## Mock Data

Tests use the mock data defined in `src/stores/kubernetesStore.ts`:
- 2 ModelAPIs (openai-proxy, llama-hosted)
- 3 MCPServers (websearch-mcp, filesystem-mcp, code-executor)
- 3 Agents (orchestrator-agent, coder-agent, reviewer-agent)
- 3 Pods
- 2 Deployments
- 1 PVC

## Adding New Tests

1. Create a new test file in the appropriate directory
2. Import helpers from `../helpers/setup`
3. Use `setupBrowser()` and `teardownBrowser()` for lifecycle
4. Navigate using `navigateTo(page, path)`
5. Use helper functions for common operations
