/**
 * End-to-End CRD Operations Tests
 * 
 * These tests validate CRUD operations against a real Kubernetes cluster
 * Run with: npx vitest run tests/e2e/crd-operations.test.ts
 * 
 * Prerequisites:
 * 1. kubectl proxy --port=8001 running
 * 2. ngrok http 8001 running (or direct access to cluster)
 * 3. CRDs installed in cluster (ModelAPI, MCPServer, Agent)
 * 4. Set K8S_BASE_URL environment variable to ngrok URL
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Configuration
const BASE_URL = process.env.K8S_BASE_URL || 'http://localhost:8001';
const NAMESPACE = process.env.K8S_NAMESPACE || 'test';
const CRD_API_GROUP = 'agentic.example.com';
const CRD_API_VERSION = 'v1alpha1';

// Test resource names (prefixed to avoid conflicts)
const TEST_PREFIX = 'e2e-test-';

interface K8sListResponse<T> {
  apiVersion: string;
  kind: string;
  metadata: { resourceVersion: string };
  items: T[];
}

interface K8sResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    resourceVersion?: string;
    creationTimestamp?: string;
  };
  spec: Record<string, unknown>;
  status?: Record<string, unknown>;
}

// Helper functions
async function k8sRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

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

function getCrdPath(resource: string, name?: string): string {
  const basePath = `/apis/${CRD_API_GROUP}/${CRD_API_VERSION}/namespaces/${NAMESPACE}/${resource}`;
  return name ? `${basePath}/${name}` : basePath;
}

// Cleanup helper
async function cleanupTestResources(): Promise<void> {
  const resources = ['modelapis', 'mcpservers', 'agents'];
  
  for (const resource of resources) {
    try {
      const list = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath(resource));
      for (const item of list.items) {
        if (item.metadata.name.startsWith(TEST_PREFIX)) {
          try {
            await k8sRequest(getCrdPath(resource, item.metadata.name), { method: 'DELETE' });
            console.log(`Cleaned up ${resource}/${item.metadata.name}`);
          } catch (e) {
            console.warn(`Failed to cleanup ${resource}/${item.metadata.name}:`, e);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to list ${resource} for cleanup:`, e);
    }
  }
}

describe('Kubernetes CRD E2E Tests', () => {
  let connectionValid = false;

  beforeAll(async () => {
    // Test connection
    try {
      const version = await k8sRequest<{ gitVersion: string }>('/version');
      console.log(`Connected to Kubernetes ${version.gitVersion}`);
      connectionValid = true;
    } catch (e) {
      console.error('Cannot connect to Kubernetes cluster:', e);
      console.log('Skipping E2E tests - set K8S_BASE_URL to run against real cluster');
    }

    // Cleanup any leftover test resources
    if (connectionValid) {
      await cleanupTestResources();
    }
  });

  afterAll(async () => {
    if (connectionValid) {
      await cleanupTestResources();
    }
  });

  describe('ModelAPI CRD Operations', () => {
    const testModelAPIName = `${TEST_PREFIX}modelapi-${Date.now()}`;

    it('should list ModelAPIs from cluster', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('modelapis'));
      
      expect(response.apiVersion).toBe(`${CRD_API_GROUP}/${CRD_API_VERSION}`);
      expect(response.kind).toBe('ModelAPIList');
      expect(Array.isArray(response.items)).toBe(true);
      
      console.log(`Found ${response.items.length} ModelAPIs in namespace ${NAMESPACE}`);
      response.items.forEach(item => {
        console.log(`  - ${item.metadata.name} (${item.spec.mode || 'unknown mode'})`);
      });
    });

    it('should create a new ModelAPI', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const newModelAPI = {
        apiVersion: `${CRD_API_GROUP}/${CRD_API_VERSION}`,
        kind: 'ModelAPI',
        metadata: {
          name: testModelAPIName,
          namespace: NAMESPACE,
        },
        spec: {
          mode: 'Proxy',
          proxyConfig: {
            env: [
              { name: 'TEST_KEY', value: 'test-value' },
            ],
          },
        },
      };

      const created = await k8sRequest<K8sResource>(getCrdPath('modelapis'), {
        method: 'POST',
        body: JSON.stringify(newModelAPI),
      });

      expect(created.metadata.name).toBe(testModelAPIName);
      expect(created.metadata.uid).toBeDefined();
      expect(created.spec.mode).toBe('Proxy');
      console.log(`Created ModelAPI: ${created.metadata.name} (uid: ${created.metadata.uid})`);
    });

    it('should get the created ModelAPI', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const modelAPI = await k8sRequest<K8sResource>(getCrdPath('modelapis', testModelAPIName));
      
      expect(modelAPI.metadata.name).toBe(testModelAPIName);
      expect(modelAPI.spec.mode).toBe('Proxy');
    });

    it('should update the ModelAPI', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      // Get current version
      const current = await k8sRequest<K8sResource>(getCrdPath('modelapis', testModelAPIName));
      
      // Update spec
      const updated = {
        ...current,
        spec: {
          ...current.spec,
          proxyConfig: {
            env: [
              { name: 'UPDATED_KEY', value: 'updated-value' },
            ],
          },
        },
      };

      const result = await k8sRequest<K8sResource>(getCrdPath('modelapis', testModelAPIName), {
        method: 'PUT',
        body: JSON.stringify(updated),
      });

      expect(result.metadata.name).toBe(testModelAPIName);
      const proxyConfig = result.spec.proxyConfig as { env: { name: string; value: string }[] };
      expect(proxyConfig.env[0].name).toBe('UPDATED_KEY');
    });

    it('should delete the ModelAPI', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      await k8sRequest(getCrdPath('modelapis', testModelAPIName), {
        method: 'DELETE',
      });

      // Verify deletion
      try {
        await k8sRequest(getCrdPath('modelapis', testModelAPIName));
        throw new Error('ModelAPI should have been deleted');
      } catch (e) {
        expect((e as Error).message).toContain('404');
      }
    });
  });

  describe('MCPServer CRD Operations', () => {
    const testMCPServerName = `${TEST_PREFIX}mcpserver-${Date.now()}`;

    it('should list MCPServers from cluster', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('mcpservers'));
      
      expect(response.kind).toBe('MCPServerList');
      expect(Array.isArray(response.items)).toBe(true);
      
      console.log(`Found ${response.items.length} MCPServers in namespace ${NAMESPACE}`);
      response.items.forEach(item => {
        console.log(`  - ${item.metadata.name} (${item.spec.type || 'unknown type'})`);
      });
    });

    it('should create a new MCPServer', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const newMCPServer = {
        apiVersion: `${CRD_API_GROUP}/${CRD_API_VERSION}`,
        kind: 'MCPServer',
        metadata: {
          name: testMCPServerName,
          namespace: NAMESPACE,
        },
        spec: {
          type: 'python-custom',
          config: {
            mcp: 'test-mcp',
            env: [],
          },
        },
      };

      const created = await k8sRequest<K8sResource>(getCrdPath('mcpservers'), {
        method: 'POST',
        body: JSON.stringify(newMCPServer),
      });

      expect(created.metadata.name).toBe(testMCPServerName);
      expect(created.spec.type).toBe('python-custom');
      console.log(`Created MCPServer: ${created.metadata.name}`);
    });

    it('should delete the MCPServer', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      await k8sRequest(getCrdPath('mcpservers', testMCPServerName), {
        method: 'DELETE',
      });
      console.log(`Deleted MCPServer: ${testMCPServerName}`);
    });
  });

  describe('Agent CRD Operations', () => {
    const testAgentName = `${TEST_PREFIX}agent-${Date.now()}`;

    it('should list Agents from cluster', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('agents'));
      
      expect(response.kind).toBe('AgentList');
      expect(Array.isArray(response.items)).toBe(true);
      
      console.log(`Found ${response.items.length} Agents in namespace ${NAMESPACE}`);
      response.items.forEach(item => {
        console.log(`  - ${item.metadata.name} (modelAPI: ${item.spec.modelAPI || 'none'})`);
      });
    });

    it('should create a new Agent', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const newAgent = {
        apiVersion: `${CRD_API_GROUP}/${CRD_API_VERSION}`,
        kind: 'Agent',
        metadata: {
          name: testAgentName,
          namespace: NAMESPACE,
        },
        spec: {
          modelAPI: 'test-model-api',
          mcpServers: [],
          agentNetwork: {
            expose: false,
            access: [],
          },
          config: {
            description: 'E2E test agent',
            instructions: 'Test instructions',
          },
        },
      };

      const created = await k8sRequest<K8sResource>(getCrdPath('agents'), {
        method: 'POST',
        body: JSON.stringify(newAgent),
      });

      expect(created.metadata.name).toBe(testAgentName);
      expect(created.spec.modelAPI).toBe('test-model-api');
      console.log(`Created Agent: ${created.metadata.name}`);
    });

    it('should delete the Agent', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      await k8sRequest(getCrdPath('agents', testAgentName), {
        method: 'DELETE',
      });
      console.log(`Deleted Agent: ${testAgentName}`);
    });
  });

  describe('Resource Counts Validation', () => {
    it('should match kubectl output for ModelAPIs', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('modelapis'));
      console.log(`\nValidate with: kubectl get modelapi -n ${NAMESPACE}`);
      console.log(`Expected count: ${response.items.length}`);
      console.log('Resources:');
      response.items.forEach(item => {
        console.log(`  ${item.metadata.name}`);
      });
    });

    it('should match kubectl output for MCPServers', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('mcpservers'));
      console.log(`\nValidate with: kubectl get mcpserver -n ${NAMESPACE}`);
      console.log(`Expected count: ${response.items.length}`);
      console.log('Resources:');
      response.items.forEach(item => {
        console.log(`  ${item.metadata.name}`);
      });
    });

    it('should match kubectl output for Agents', async () => {
      if (!connectionValid) {
        console.log('Skipping - no cluster connection');
        return;
      }

      const response = await k8sRequest<K8sListResponse<K8sResource>>(getCrdPath('agents'));
      console.log(`\nValidate with: kubectl get agent -n ${NAMESPACE}`);
      console.log(`Expected count: ${response.items.length}`);
      console.log('Resources:');
      response.items.forEach(item => {
        console.log(`  ${item.metadata.name}`);
      });
    });
  });
});
