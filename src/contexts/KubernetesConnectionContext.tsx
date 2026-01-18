/**
 * Kubernetes Connection Context
 * 
 * Provides connection state and API methods to all components
 * Handles auto-connection on mount if saved config exists
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { k8sClient } from '@/lib/kubernetes-client';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import type { ModelAPI, MCPServer, Agent, LogEntry, Service, K8sSecret } from '@/types/kubernetes';

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastRefresh: Date | null;
  namespace: string;
  baseUrl: string;
  namespaces: string[];
}

interface KubernetesConnectionContextType extends ConnectionState {
  connect: (baseUrl: string, namespace?: string) => Promise<boolean>;
  disconnect: () => void;
  refreshAll: () => Promise<void>;
  refreshNamespaces: () => Promise<void>;
  switchNamespace: (namespace: string) => Promise<void>;
  startPolling: (intervalOverride?: number) => void;
  stopPolling: () => void;
  // CRUD operations
  createModelAPI: (api: ModelAPI) => Promise<ModelAPI>;
  updateModelAPI: (api: ModelAPI) => Promise<ModelAPI>;
  deleteModelAPI: (name: string, namespace?: string) => Promise<void>;
  createMCPServer: (server: MCPServer) => Promise<MCPServer>;
  updateMCPServer: (server: MCPServer) => Promise<MCPServer>;
  deleteMCPServer: (name: string, namespace?: string) => Promise<void>;
  createAgent: (agent: Agent) => Promise<Agent>;
  updateAgent: (agent: Agent) => Promise<Agent>;
  deleteAgent: (name: string, namespace?: string) => Promise<void>;
  // Secret operations
  createSecret: (secret: K8sSecret) => Promise<K8sSecret>;
  deleteSecret: (name: string, namespace?: string) => Promise<void>;
}

const KubernetesConnectionContext = createContext<KubernetesConnectionContextType | null>(null);

export function KubernetesConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    lastRefresh: null,
    namespace: 'default',
    baseUrl: '',
    namespaces: [],
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const store = useKubernetesStore();

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

  // Fetch and sync all resources
  const refreshAll = useCallback(async () => {
    console.log('[KubernetesConnectionContext] refreshAll called');
    
    if (!k8sClient.isConfigured()) {
      console.log('[KubernetesConnectionContext] Not configured, skipping refresh');
      return;
    }

    store.setIsRefreshing(true);

    try {
      // Fetch all resources in parallel (including namespaces and secrets)
      const [modelAPIs, mcpServers, agents, pods, deployments, pvcs, services, secrets, namespacesList] = await Promise.all([
        k8sClient.listModelAPIs().catch((e) => { console.error('ModelAPIs error:', e); return []; }),
        k8sClient.listMCPServers().catch((e) => { console.error('MCPServers error:', e); return []; }),
        k8sClient.listAgents().catch((e) => { console.error('Agents error:', e); return []; }),
        k8sClient.listPods().catch((e) => { console.error('Pods error:', e); return []; }),
        k8sClient.listDeployments().catch((e) => { console.error('Deployments error:', e); return []; }),
        k8sClient.listPVCs().catch((e) => { console.error('PVCs error:', e); return []; }),
        k8sClient.listServices().catch((e) => { console.error('Services error:', e); return []; }),
        k8sClient.listSecrets().catch((e) => { console.error('Secrets error:', e); return []; }),
        k8sClient.listNamespaces().catch((e) => { console.error('Namespaces error:', e); return []; }),
      ]);

      console.log('[KubernetesConnectionContext] Fetched:', {
        modelAPIs: modelAPIs.length,
        mcpServers: mcpServers.length,
        agents: agents.length,
        pods: pods.length,
        deployments: deployments.length,
        pvcs: pvcs.length,
        services: services.length,
        secrets: secrets.length,
      });

      // Sync to store
      store.setModelAPIs(modelAPIs);
      store.setMCPServers(mcpServers);
      store.setAgents(agents);
      store.setPods(pods);
      store.setDeployments(deployments);
      store.setPVCs(pvcs);
      store.setServices(services);
      store.setSecrets(secrets as K8sSecret[]);

      // Update namespaces
      const namespaceNames = namespacesList.map((ns: { metadata: { name: string } }) => ns.metadata.name);

      setState(s => ({
        ...s,
        error: null,
        lastRefresh: new Date(),
        namespaces: namespaceNames.length > 0 ? namespaceNames : s.namespaces,
      }));

      addLogEntry('info', `Synced: ${modelAPIs.length} ModelAPIs, ${mcpServers.length} MCPServers, ${agents.length} Agents, ${secrets.length} Secrets`, 'connection');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch resources';
      console.error('[KubernetesConnectionContext] refreshAll error:', error);
      setState(s => ({ ...s, error: message }));
      addLogEntry('error', message, 'connection');
    } finally {
      store.setIsRefreshing(false);
    }
  }, [store, addLogEntry]);

  // Start polling with interval from store (or override)
  const startPolling = useCallback((intervalOverride?: number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Use override if provided, otherwise read from store
    const interval = intervalOverride ?? store.autoRefreshInterval;
    const enabled = intervalOverride !== undefined ? intervalOverride > 0 : store.autoRefreshEnabled;
    
    if (!enabled || interval <= 0) {
      store.setNextRefreshTime(null);
      return;
    }
    
    // Reset countdown immediately
    store.setNextRefreshTime(Date.now() + interval);
    
    pollIntervalRef.current = setInterval(() => {
      if (k8sClient.isConfigured()) {
        refreshAll();
        // Reset countdown after each refresh
        store.setNextRefreshTime(Date.now() + interval);
      }
    }, interval);
  }, [refreshAll, store.autoRefreshEnabled, store.autoRefreshInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    store.setNextRefreshTime(null);
  }, [store]);

  // Connect
  const connect = useCallback(async (baseUrl: string, namespace: string = 'default'): Promise<boolean> => {
    console.log('[KubernetesConnectionContext] Connecting to:', baseUrl, 'namespace:', namespace);
    
    setState(s => ({ ...s, connecting: true, error: null }));
    
    const cleanUrl = baseUrl.replace(/\/$/, '');
    k8sClient.setConfig({ baseUrl: cleanUrl, namespace });

    try {
      const result = await k8sClient.testConnection();
      console.log('[KubernetesConnectionContext] Connection test result:', result);
      
      if (result.success) {
        setState(s => ({
          ...s,
          connected: true,
          connecting: false,
          baseUrl: cleanUrl,
          namespace,
          error: null,
        }));
        
        addLogEntry('info', `Connected to Kubernetes ${result.version}`, 'connection');
        
        // Fetch namespaces
        try {
          const nsList = await k8sClient.listNamespaces();
          const namespaceNames = nsList.map(ns => ns.metadata.name);
          setState(s => ({ ...s, namespaces: namespaceNames }));
        } catch (e) {
          console.warn('[KubernetesConnectionContext] Could not fetch namespaces:', e);
        }
        
        // Fetch resources immediately
        await refreshAll();
        
        // Start polling
        startPolling();
        
        return true;
      } else {
        setState(s => ({
          ...s,
          connected: false,
          connecting: false,
          error: result.error || 'Connection failed',
        }));
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      console.error('[KubernetesConnectionContext] Connection error:', error);
      setState(s => ({
        ...s,
        connected: false,
        connecting: false,
        error: message,
      }));
      return false;
    }
  }, [refreshAll, startPolling, addLogEntry]);

  // Refresh namespaces
  const refreshNamespaces = useCallback(async () => {
    if (!k8sClient.isConfigured()) return;
    
    try {
      const nsList = await k8sClient.listNamespaces();
      const namespaceNames = nsList.map(ns => ns.metadata.name);
      setState(s => ({ ...s, namespaces: namespaceNames }));
      console.log('[KubernetesConnectionContext] Refreshed namespaces:', namespaceNames.length);
    } catch (error) {
      console.warn('[KubernetesConnectionContext] Failed to fetch namespaces:', error);
    }
  }, []);

  // Switch namespace
  const switchNamespace = useCallback(async (newNamespace: string) => {
    if (!state.connected || !state.baseUrl) return;
    
    console.log('[KubernetesConnectionContext] Switching to namespace:', newNamespace);
    k8sClient.setConfig({ baseUrl: state.baseUrl, namespace: newNamespace });
    setState(s => ({ ...s, namespace: newNamespace }));
    
    // Save to localStorage
    localStorage.setItem('k8s-config', JSON.stringify({ baseUrl: state.baseUrl, namespace: newNamespace }));
    
    // Refresh resources for new namespace
    await refreshAll();
    addLogEntry('info', `Switched to namespace ${newNamespace}`, 'connection');
  }, [state.connected, state.baseUrl, refreshAll, addLogEntry]);

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('[KubernetesConnectionContext] Disconnecting');
    stopPolling();
    k8sClient.setConfig({ baseUrl: '', namespace: 'default' });
    
    setState({
      connected: false,
      connecting: false,
      error: null,
      lastRefresh: null,
      namespace: 'default',
      baseUrl: '',
      namespaces: [],
    });

    // Clear store
    store.setModelAPIs([]);
    store.setMCPServers([]);
    store.setAgents([]);
    store.setPods([]);
    store.setDeployments([]);
    store.setPVCs([]);
    store.setServices([]);
    store.setSecrets([]);
    
    addLogEntry('info', 'Disconnected from cluster', 'connection');
  }, [stopPolling, store, addLogEntry]);

  // Auto-connect on mount if saved config exists
  useEffect(() => {
    const savedConfig = localStorage.getItem('k8s-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        console.log('[KubernetesConnectionContext] Found saved config:', config);
        if (config.baseUrl) {
          connect(config.baseUrl, config.namespace || 'default');
        }
      } catch (e) {
        console.error('[KubernetesConnectionContext] Failed to parse saved config:', e);
      }
    }
    
    return () => stopPolling();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // CRUD operations
  const createModelAPI = useCallback(async (api: ModelAPI): Promise<ModelAPI> => {
    const created = await k8sClient.createModelAPI(api);
    store.addModelAPI(created);
    addLogEntry('info', `Created ModelAPI ${created.metadata.name}`, 'api', created.metadata.name, 'ModelAPI');
    return created;
  }, [store, addLogEntry]);

  const updateModelAPI = useCallback(async (api: ModelAPI): Promise<ModelAPI> => {
    const updated = await k8sClient.updateModelAPI(api);
    store.updateModelAPI(updated.metadata.name, updated);
    addLogEntry('info', `Updated ModelAPI ${updated.metadata.name}`, 'api', updated.metadata.name, 'ModelAPI');
    return updated;
  }, [store, addLogEntry]);

  const deleteModelAPI = useCallback(async (name: string, namespace?: string): Promise<void> => {
    await k8sClient.deleteModelAPI(name, namespace);
    store.deleteModelAPI(name);
    addLogEntry('info', `Deleted ModelAPI ${name}`, 'api', name, 'ModelAPI');
  }, [store, addLogEntry]);

  const createMCPServer = useCallback(async (server: MCPServer): Promise<MCPServer> => {
    const created = await k8sClient.createMCPServer(server);
    store.addMCPServer(created);
    addLogEntry('info', `Created MCPServer ${created.metadata.name}`, 'api', created.metadata.name, 'MCPServer');
    return created;
  }, [store, addLogEntry]);

  const updateMCPServer = useCallback(async (server: MCPServer): Promise<MCPServer> => {
    const updated = await k8sClient.updateMCPServer(server);
    store.updateMCPServer(updated.metadata.name, updated);
    addLogEntry('info', `Updated MCPServer ${updated.metadata.name}`, 'api', updated.metadata.name, 'MCPServer');
    return updated;
  }, [store, addLogEntry]);

  const deleteMCPServer = useCallback(async (name: string, namespace?: string): Promise<void> => {
    await k8sClient.deleteMCPServer(name, namespace);
    store.deleteMCPServer(name);
    addLogEntry('info', `Deleted MCPServer ${name}`, 'api', name, 'MCPServer');
  }, [store, addLogEntry]);

  const createAgent = useCallback(async (agent: Agent): Promise<Agent> => {
    const created = await k8sClient.createAgent(agent);
    store.addAgent(created);
    addLogEntry('info', `Created Agent ${created.metadata.name}`, 'api', created.metadata.name, 'Agent');
    return created;
  }, [store, addLogEntry]);

  const updateAgent = useCallback(async (agent: Agent): Promise<Agent> => {
    const updated = await k8sClient.updateAgent(agent);
    store.updateAgent(updated.metadata.name, updated);
    addLogEntry('info', `Updated Agent ${updated.metadata.name}`, 'api', updated.metadata.name, 'Agent');
    return updated;
  }, [store, addLogEntry]);

  const deleteAgent = useCallback(async (name: string, namespace?: string): Promise<void> => {
    await k8sClient.deleteAgent(name, namespace);
    store.deleteAgent(name);
    addLogEntry('info', `Deleted Agent ${name}`, 'api', name, 'Agent');
  }, [store, addLogEntry]);

  // Secret operations
  const createSecret = useCallback(async (secret: K8sSecret): Promise<K8sSecret> => {
    const created = await k8sClient.createSecret(secret);
    const secretWithKeys: K8sSecret = {
      ...created,
      dataKeys: secret.data ? Object.keys(secret.data) : [],
    };
    store.addSecret(secretWithKeys);
    addLogEntry('info', `Created Secret ${created.metadata.name}`, 'api', created.metadata.name, 'Secret');
    return secretWithKeys;
  }, [store, addLogEntry]);

  const deleteSecret = useCallback(async (name: string, namespace?: string): Promise<void> => {
    await k8sClient.deleteSecret(name, namespace);
    store.deleteSecret(name);
    addLogEntry('info', `Deleted Secret ${name}`, 'api', name, 'Secret');
  }, [store, addLogEntry]);

  const value: KubernetesConnectionContextType = {
    ...state,
    connect,
    disconnect,
    refreshAll,
    refreshNamespaces,
    switchNamespace,
    startPolling,
    stopPolling,
    createModelAPI,
    updateModelAPI,
    deleteModelAPI,
    createMCPServer,
    updateMCPServer,
    deleteMCPServer,
    createAgent,
    updateAgent,
    deleteAgent,
    createSecret,
    deleteSecret,
  };

  return (
    <KubernetesConnectionContext.Provider value={value}>
      {children}
    </KubernetesConnectionContext.Provider>
  );
}

// Default fallback for when context is unavailable (e.g., during hot reload)
const defaultContextValue: KubernetesConnectionContextType = {
  connected: false,
  connecting: false,
  error: null,
  lastRefresh: null,
  namespace: 'default',
  baseUrl: '',
  namespaces: [],
  connect: async () => false,
  disconnect: () => {},
  refreshAll: async () => {},
  refreshNamespaces: async () => {},
  switchNamespace: async () => {},
  startPolling: () => {},
  stopPolling: () => {},
  createModelAPI: async (api) => api,
  updateModelAPI: async (api) => api,
  deleteModelAPI: async () => {},
  createMCPServer: async (server) => server,
  updateMCPServer: async (server) => server,
  deleteMCPServer: async () => {},
  createAgent: async (agent) => agent,
  updateAgent: async (agent) => agent,
  deleteAgent: async () => {},
  createSecret: async (secret) => secret,
  deleteSecret: async () => {},
};

export function useKubernetesConnection() {
  const context = useContext(KubernetesConnectionContext);
  // Return fallback during HMR or if context is unavailable
  // This prevents crashes during React Fast Refresh
  if (!context) {
    console.warn('[useKubernetesConnection] Context unavailable, using fallback. This may happen during hot reload.');
    return defaultContextValue;
  }
  return context;
}
