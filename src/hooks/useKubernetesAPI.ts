/**
 * Hook to connect MockKubernetesAPI with the Zustand store
 * 
 * Provides a bridge between the realistic K8s API simulation
 * and the UI state management, with:
 * - Automatic syncing of API responses to store
 * - Watch subscription management
 * - Loading and error states
 * - CRUD operations that update both API and store
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { mockK8sAPI, K8sAPIError } from '@/lib/mock-kubernetes-api';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import type { ModelAPI, MCPServer, Agent, LogEntry } from '@/types/kubernetes';

interface APIState {
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export function useKubernetesAPI() {
  const [state, setState] = useState<APIState>({
    connected: false,
    loading: false,
    error: null,
  });

  const watchCleanups = useRef<(() => void)[]>([]);

  const store = useKubernetesStore();

  // Connect to the mock API
  const connect = useCallback(async (token?: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await mockK8sAPI.connect(token);
      setState({ connected: true, loading: false, error: null });
      return true;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Connection failed';
      setState({ connected: false, loading: false, error: message });
      return false;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    mockK8sAPI.disconnect();
    watchCleanups.current.forEach((cleanup) => cleanup());
    watchCleanups.current = [];
    setState({ connected: false, loading: false, error: null });
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Fetch and sync all resources
  const refreshAll = useCallback(async () => {
    if (!mockK8sAPI.isConnected()) return;

    setState((s) => ({ ...s, loading: true }));
    try {
      const [modelAPIs, mcpServers, agents, pods, deployments, pvcs] = await Promise.all([
        mockK8sAPI.listModelAPIs(),
        mockK8sAPI.listMCPServers(),
        mockK8sAPI.listAgents(),
        mockK8sAPI.listPods(),
        mockK8sAPI.listDeployments(),
        mockK8sAPI.listPVCs(),
      ]);

      store.setModelAPIs(modelAPIs.items);
      store.setMCPServers(mcpServers.items);
      store.setAgents(agents.items);
      store.setPods(pods.items);
      store.setDeployments(deployments.items);
      store.setPVCs(pvcs.items);

      setState((s) => ({ ...s, loading: false, error: null }));
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to fetch resources';
      setState((s) => ({ ...s, loading: false, error: message }));
      addLogEntry('error', message, 'api-client');
    }
  }, [store]);

  // Add log entry helper
  const addLogEntry = useCallback(
    (level: LogEntry['level'], message: string, source: string, resourceName?: string, resourceKind?: string) => {
      store.addLog({
        timestamp: new Date().toISOString(),
        level,
        message,
        source,
        resourceName,
        resourceKind,
      });
    },
    [store]
  );

  // Setup watch subscriptions
  const setupWatchers = useCallback(() => {
    // Clean up existing watchers
    watchCleanups.current.forEach((cleanup) => cleanup());
    watchCleanups.current = [];

    // Watch ModelAPIs
    const unwatchModelAPIs = mockK8sAPI.watchModelAPIs('agentic-system', (event) => {
      const { type, object } = event;
      addLogEntry('info', `ModelAPI ${object.metadata.name} ${type.toLowerCase()}`, 'watch', object.metadata.name, 'ModelAPI');
      
      switch (type) {
        case 'ADDED':
          store.addModelAPI(object);
          break;
        case 'MODIFIED':
          store.updateModelAPI(object.metadata.name, object);
          break;
        case 'DELETED':
          store.deleteModelAPI(object.metadata.name);
          break;
      }
    });
    watchCleanups.current.push(unwatchModelAPIs);

    // Watch MCPServers
    const unwatchMCPServers = mockK8sAPI.watchMCPServers('agentic-system', (event) => {
      const { type, object } = event;
      addLogEntry('info', `MCPServer ${object.metadata.name} ${type.toLowerCase()}`, 'watch', object.metadata.name, 'MCPServer');
      
      switch (type) {
        case 'ADDED':
          store.addMCPServer(object);
          break;
        case 'MODIFIED':
          store.updateMCPServer(object.metadata.name, object);
          break;
        case 'DELETED':
          store.deleteMCPServer(object.metadata.name);
          break;
      }
    });
    watchCleanups.current.push(unwatchMCPServers);

    // Watch Agents
    const unwatchAgents = mockK8sAPI.watchAgents('agentic-system', (event) => {
      const { type, object } = event;
      addLogEntry('info', `Agent ${object.metadata.name} ${type.toLowerCase()}`, 'watch', object.metadata.name, 'Agent');
      
      switch (type) {
        case 'ADDED':
          store.addAgent(object);
          break;
        case 'MODIFIED':
          store.updateAgent(object.metadata.name, object);
          break;
        case 'DELETED':
          store.deleteAgent(object.metadata.name);
          break;
      }
    });
    watchCleanups.current.push(unwatchAgents);

    // Start status simulation
    const stopSimulation = mockK8sAPI.startStatusSimulation();
    watchCleanups.current.push(stopSimulation);
  }, [store, addLogEntry]);

  // Initialize: refresh all and setup watchers when connected
  useEffect(() => {
    if (state.connected) {
      refreshAll().then(() => setupWatchers());
    }
  }, [state.connected, refreshAll, setupWatchers]);

  // CRUD operations that sync with API
  const createModelAPI = useCallback(async (api: ModelAPI) => {
    try {
      const created = await mockK8sAPI.createModelAPI(api);
      store.addModelAPI(created);
      addLogEntry('info', `Created ModelAPI ${created.metadata.name}`, 'api-client', created.metadata.name, 'ModelAPI');
      return created;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to create ModelAPI';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const updateModelAPI = useCallback(async (api: ModelAPI) => {
    try {
      const updated = await mockK8sAPI.updateModelAPI(api);
      store.updateModelAPI(updated.metadata.name, updated);
      addLogEntry('info', `Updated ModelAPI ${updated.metadata.name}`, 'api-client', updated.metadata.name, 'ModelAPI');
      return updated;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to update ModelAPI';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const deleteModelAPI = useCallback(async (name: string, namespace: string = 'agentic-system') => {
    try {
      await mockK8sAPI.deleteModelAPI(name, namespace);
      store.deleteModelAPI(name);
      addLogEntry('info', `Deleted ModelAPI ${name}`, 'api-client', name, 'ModelAPI');
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to delete ModelAPI';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const createMCPServer = useCallback(async (server: MCPServer) => {
    try {
      const created = await mockK8sAPI.createMCPServer(server);
      store.addMCPServer(created);
      addLogEntry('info', `Created MCPServer ${created.metadata.name}`, 'api-client', created.metadata.name, 'MCPServer');
      return created;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to create MCPServer';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const updateMCPServer = useCallback(async (server: MCPServer) => {
    try {
      const updated = await mockK8sAPI.updateMCPServer(server);
      store.updateMCPServer(updated.metadata.name, updated);
      addLogEntry('info', `Updated MCPServer ${updated.metadata.name}`, 'api-client', updated.metadata.name, 'MCPServer');
      return updated;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to update MCPServer';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const deleteMCPServer = useCallback(async (name: string, namespace: string = 'agentic-system') => {
    try {
      await mockK8sAPI.deleteMCPServer(name, namespace);
      store.deleteMCPServer(name);
      addLogEntry('info', `Deleted MCPServer ${name}`, 'api-client', name, 'MCPServer');
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to delete MCPServer';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const createAgent = useCallback(async (agent: Agent) => {
    try {
      const created = await mockK8sAPI.createAgent(agent);
      store.addAgent(created);
      addLogEntry('info', `Created Agent ${created.metadata.name}`, 'api-client', created.metadata.name, 'Agent');
      return created;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to create Agent';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const updateAgent = useCallback(async (agent: Agent) => {
    try {
      const updated = await mockK8sAPI.updateAgent(agent);
      store.updateAgent(updated.metadata.name, updated);
      addLogEntry('info', `Updated Agent ${updated.metadata.name}`, 'api-client', updated.metadata.name, 'Agent');
      return updated;
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to update Agent';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  const deleteAgent = useCallback(async (name: string, namespace: string = 'agentic-system') => {
    try {
      await mockK8sAPI.deleteAgent(name, namespace);
      store.deleteAgent(name);
      addLogEntry('info', `Deleted Agent ${name}`, 'api-client', name, 'Agent');
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to delete Agent';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [store, addLogEntry]);

  // Get pod logs
  const getPodLogs = useCallback(async (name: string, namespace: string = 'agentic-system', options?: { container?: string; tailLines?: number }) => {
    try {
      return await mockK8sAPI.getPodLogs(name, namespace, options);
    } catch (err) {
      const message = err instanceof K8sAPIError ? err.message : 'Failed to get pod logs';
      addLogEntry('error', message, 'api-client');
      throw err;
    }
  }, [addLogEntry]);

  return {
    // State
    ...state,
    
    // Connection
    connect,
    disconnect,
    refreshAll,
    
    // ModelAPI CRUD
    createModelAPI,
    updateModelAPI,
    deleteModelAPI,
    
    // MCPServer CRUD  
    createMCPServer,
    updateMCPServer,
    deleteMCPServer,
    
    // Agent CRUD
    createAgent,
    updateAgent,
    deleteAgent,
    
    // Utilities
    getPodLogs,
  };
}
