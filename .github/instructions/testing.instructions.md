# Testing Guidelines

Instructions for writing and running tests in KAOS-UI.

## Testing Framework

KAOS-UI uses **Playwright** for end-to-end testing.

### Why Playwright?
- Cross-browser testing (Chromium, Firefox, WebKit)
- Built-in auto-waiting and assertions
- Excellent TypeScript support
- Visual debugging tools

## Test Directory Structure

```
tests/
├── fixtures/
│   └── test-utils.ts         # Base fixtures and helpers
├── smoke/
│   ├── app-loads.spec.ts     # Basic app loading tests
│   └── cluster-connection.spec.ts  # Cluster connectivity
├── read/
│   ├── modelapi.spec.ts      # ModelAPI read operations
│   ├── agent.spec.ts         # Agent read operations
│   └── mcpserver.spec.ts     # MCPServer read operations
├── crud/
│   ├── modelapi.spec.ts      # ModelAPI create/update/delete
│   ├── agent.spec.ts         # Agent create/update/delete
│   └── mcpserver.spec.ts     # MCPServer create/update/delete
└── functional/
    ├── mcpserver-tools.spec.ts  # MCPServer tools UI testing
    ├── agent-chat.spec.ts       # Agent chat and memory testing
    └── modelapi-request.spec.ts # ModelAPI diagnostics testing
```

## Prerequisites for Running Tests

### Required Services
1. **KAOS UI Development Server**
   ```bash
   npm run dev
   # Runs at http://localhost:8081
   ```

2. **KAOS Proxy** (for cluster connection)
   ```bash
   kaos ui --no-browser
   # Runs at http://localhost:8010
   ```

3. **Kubernetes Cluster** with KAOS resources
   - Tests use the `kaos-hierarchy` namespace
   - Requires existing ModelAPIs, Agents, and MCPServers

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/smoke/app-loads.spec.ts

# Run tests in headed mode (visible browser)
npm run test:e2e -- --headed

# Run tests with UI mode
npm run test:e2e:ui
```

## Writing Tests

### Test File Structure

```typescript
import { test, expect } from '@playwright/test';
import { setupConnection } from '../fixtures/test-utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await setupConnection(page, {
      proxyUrl: 'http://localhost:8080',
      namespace: 'kaos-hierarchy',
    });
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Using Test Fixtures

The `test-utils.ts` provides common helpers:

```typescript
import { 
  setupConnection,
  waitForResourceList,
  navigateToResource,
} from '../fixtures/test-utils';

// Setup cluster connection
await setupConnection(page, { namespace: 'kaos-hierarchy' });

// Wait for resources to load
await waitForResourceList(page, 'agents');

// Navigate to a specific resource
await navigateToResource(page, 'modelapi', 'my-model-api');
```

### Common Assertions

```typescript
// Check element is visible
await expect(page.getByText('Agent List')).toBeVisible();

// Check element count
await expect(page.getByTestId('agent-card')).toHaveCount(3);

// Check URL
await expect(page).toHaveURL(/\/agents\/kaos-hierarchy\/my-agent/);

// Check text content
await expect(page.getByRole('heading')).toContainText('Overview');
```

### Waiting for Dynamic Content

```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="resource-list"]');

// Wait for API response
await page.waitForResponse(resp => 
  resp.url().includes('/apis/kaos.io/v1alpha1') && resp.status() === 200
);
```

## Test Categories

### Smoke Tests (`tests/smoke/`)
Quick validation that core functionality works:
- App loads without errors
- Can connect to cluster
- Basic navigation works

**Run frequently during development.**

### Read Tests (`tests/read/`)
Validate list and detail pages for resources:
- Resource list loads with correct items
- Detail page displays correct information
- Tabs and navigation work correctly

**Run before committing changes to resource components.**

### CRUD Tests (`tests/crud/`)
Test full Create, Update, Delete operations:
- Form submission with all required fields
- Update existing resources via edit dialog
- Delete resources and verify removal
- Uses `test.describe.serial()` to ensure order

**Use unique names with timestamps** (e.g., `test-modelapi-${Date.now()}`).

```typescript
test.describe.serial('Create, Update, Delete ModelAPI', () => {
  const uniqueName = `test-modelapi-${Date.now()}`;
  
  test('should CREATE', async ({ page }) => { /* ... */ });
  test('should UPDATE', async ({ page }) => { /* ... */ });
  test('should DELETE', async ({ page }) => { /* ... */ });
});
```

### Functional Tests (`tests/functional/`)
Test interactive features and workflows:
- MCPServer tools: list, select, execute
- Agent chat: send messages, view memory
- ModelAPI: diagnostics, request testing

**These may require longer timeouts** for LLM responses (up to 120s).

## Best Practices

### 1. Use Data-TestId Selectors
Add `data-testid` attributes to important elements:
```tsx
<Card data-testid="agent-card">
  <CardTitle data-testid="agent-name">{agent.metadata.name}</CardTitle>
</Card>
```

```typescript
// In tests
await page.getByTestId('agent-card').click();
```

### 2. Prefer Role and Text Selectors
```typescript
// Good - semantic selectors
await page.getByRole('button', { name: 'Save' }).click();
await page.getByText('Overview').click();

// Avoid - fragile CSS selectors
await page.locator('.btn-primary').click();
```

### 3. Navigate Resource Lists via Table Rows
The UI uses tables with action buttons, not links. Navigate to detail pages by:
```typescript
// Click view button in table row
const rows = page.locator('table tbody tr');
const count = await rows.count();
expect(count, 'Expected resources').toBeGreaterThan(0);

const viewButton = rows.first().locator('button').first();
await viewButton.click();
await page.waitForLoadState('networkidle');
```

### 4. Detect React Crashes
Always check for error messages after navigation:
```typescript
const hasError = await page.locator('text=Something went wrong').count() > 0 ||
                 await page.locator('text=TypeError').count() > 0 ||
                 await page.locator('text=Cannot read properties').count() > 0;
expect(hasError, 'Page should not display error messages').toBeFalsy();
```

### 5. Don't Silently Pass When No Resources
Fail tests when expected resources are missing:
```typescript
// BAD - silent pass
if (count > 0) {
  // test...
} else {
  console.log('No resources found');
}

// GOOD - explicit failure
expect(count, 'Expected resources in namespace').toBeGreaterThan(0);
```

### 6. Keep Tests Independent
Each test should:
- Set up its own state
- Not depend on other tests
- Clean up if it creates resources

### 4. Handle Async Operations
```typescript
// Wait for navigation
await Promise.all([
  page.waitForURL(/\/agents\//),
  page.getByTestId('agent-link').click(),
]);

// Wait for data to load
await expect(page.getByTestId('loading')).not.toBeVisible();
await expect(page.getByTestId('agent-list')).toBeVisible();
```

### 5. Use Descriptive Test Names
```typescript
// Good
test('should display all agents in the kaos-hierarchy namespace', ...);
test('should show agent details including model and MCPServers', ...);

// Avoid
test('agents work', ...);
test('test1', ...);
```

## Debugging Tests

### Visual Mode
```bash
npm run test:e2e -- --headed --debug
```

### Trace Viewer
```bash
npm run test:e2e -- --trace on
npx playwright show-trace trace.zip
```

### Screenshots on Failure
Configured automatically in `playwright.config.ts`.

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Push to main branch

See `.github/workflows/` for CI configuration.

## Adding New Tests

1. Determine test category (smoke, read, etc.)
2. Create test file in appropriate directory
3. Import fixtures from `test-utils.ts`
4. Follow existing test patterns
5. Run locally to verify
6. Commit with descriptive message
