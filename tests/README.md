# Integration and E2E Tests

This directory contains comprehensive tests for the Kubernetes Agentic Dashboard.

## Test Structure

```
tests/
├── helpers/
│   └── setup.ts              # Test utilities and browser setup
├── ui/
│   ├── dashboard.test.ts     # Dashboard smoke tests
│   ├── navigation.test.ts    # Tab navigation tests
│   ├── resources.test.ts     # Resource list tests
│   ├── canvas.test.ts        # Visual canvas tests
│   ├── resource-sync.test.ts # Resource sync tests
│   └── logs.test.ts          # Logs viewer tests
├── e2e/
│   ├── workflows.test.ts     # End-to-end workflow tests
│   └── crd-operations.test.ts # CRUD operations against live cluster
├── integration/
│   ├── kubernetes-api.test.ts # Kubernetes API tests
│   └── validate-crds.test.ts  # CRD validation tests
└── screenshots/              # Test failure screenshots
```

## Running Tests Against a Live Kubernetes Cluster

### Prerequisites

1. **Start kubectl proxy:**
   ```bash
   kubectl proxy --port=8001
   ```

2. **Start ngrok tunnel (for browser access):**
   ```bash
   ngrok http 8001
   ```

3. **Ensure CRDs are installed:**
   ```bash
   kubectl get crd modelapis.ethical.institute
   kubectl get crd mcpservers.ethical.institute
   kubectl get crd agents.ethical.institute
   ```

### Running CRUD Tests

```bash
# Set environment variables and run
K8S_BASE_URL=https://your-ngrok-url.ngrok-free.app K8S_NAMESPACE=test npx vitest run tests/e2e/crd-operations.test.ts

# Or for integration validation tests
K8S_BASE_URL=https://your-ngrok-url.ngrok-free.app K8S_NAMESPACE=test npx vitest run tests/integration/validate-crds.test.ts
```

### What the CRUD Tests Do

1. **Connect to the cluster** via the ngrok URL
2. **List existing resources** (ModelAPIs, MCPServers, Agents)
3. **Create test resources** with `e2e-test-` prefix
4. **Verify creation** by fetching them back
5. **Update resources** and verify changes
6. **Delete test resources** and verify removal
7. **Cleanup** any leftover test resources

### Verifying Results

After running tests, verify with kubectl:
```bash
kubectl get modelapi -n test
kubectl get mcpserver -n test
kubectl get agent -n test
```

## UI Tests

### Running UI Tests

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

## Test Categories

### 1. CRD Operations Tests (`e2e/crd-operations.test.ts`)
- Creates ModelAPI, MCPServer, Agent resources
- Tests update operations
- Tests delete operations
- Validates resource counts match kubectl

### 2. CRD Validation Tests (`integration/validate-crds.test.ts`)
- Validates correct API group (ethical.institute)
- Tests exact YAML structure from user examples
- Full CRUD cycle with cleanup

### 3. Dashboard Smoke Tests (`ui/dashboard.test.ts`)
- Initial page load validation
- Sidebar, header, and main content verification
- Resource stat cards display

### 4. Navigation Tests (`ui/navigation.test.ts`)
- All tab navigation works correctly
- Tab content renders appropriately

### 5. Resource List Tests (`ui/resources.test.ts`)
- Model APIs list display
- MCP Servers list with tools
- Agents list with connections

### 6. Visual Canvas Tests (`ui/canvas.test.ts`)
- React Flow canvas renders
- Nodes display with correct data

## Adding New Tests

1. Create a new test file in the appropriate directory
2. Import helpers from `../helpers/setup`
3. Use environment variables for cluster connection
4. Clean up any test resources after tests complete
