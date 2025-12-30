/**
 * Kubernetes Connection Context
 * 
 * Provides connection state and API methods to all components
 * Handles auto-connection on mount if saved config exists
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { k8sClient } from '@/lib/kubernetes-client';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import type { ModelAPI, MCPServer, Agent, LogEntry, Service } from '@/types/kubernetes';

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastRefresh: Date | null;
  namespace: string;
  baseUrl: string;
}

interface KubernetesConnectionContextType extends ConnectionState {
  connect: (baseUrl: string, namespace?: string) => Promise<boolean>;
  disconnect: () => void;
  refreshAll: () => Promise<void>;
  startPolling: () => void;
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
      // Fetch all resources in parallel
      const [modelAPIs, mcpServers, agents, pods, deployments, pvcs, services] = await Promise.all([
        k8sClient.listModelAPIs().catch((e) => { console.error('ModelAPIs error:', e); return []; }),
        k8sClient.listMCPServers().catch((e) => { console.error('MCPServers error:', e); return []; }),
        k8sClient.listAgents().catch((e) => { console.error('Agents error:', e); return []; }),
        k8sClient.listPods().catch((e) => { console.error('Pods error:', e); return []; }),
        k8sClient.listDeployments().catch((e) => { console.error('Deployments error:', e); return []; }),
        k8sClient.listPVCs().catch((e) => { console.error('PVCs error:', e); return []; }),
        k8sClient.listServices().catch((e) => { console.error('Services error:', e); return []; }),
      ]);

      console.log('[KubernetesConnectionContext] Fetched:', {
        modelAPIs: modelAPIs.length,
        mcpServers: mcpServers.length,
        agents: agents.length,
        pods: pods.length,
        deployments: deployments.length,
        pvcs: pvcs.length,
        services: services.length,
      });

      // Sync to store
      store.setModelAPIs(modelAPIs);
      store.setMCPServers(mcpServers);
      store.setAgents(agents);
      store.setPods(pods);
      store.setDeployments(deployments);
      store.setPVCs(pvcs);
      store.setServices(services);

      setState(s => ({
        ...s,
        error: null,
        lastRefresh: new Date(),
      }));

      addLogEntry('info', `Synced: ${modelAPIs.length} ModelAPIs, ${mcpServers.length} MCPServers, ${agents.length} Agents`, 'connection');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch resources';
      console.error('[KubernetesConnectionContext] refreshAll error:', error);
      setState(s => ({ ...s, error: message }));
      addLogEntry('error', message, 'connection');
    } finally {
      store.setIsRefreshing(false);
    }
  }, [store, addLogEntry]);

  // Start polling with interval from store
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    const interval = store.autoRefreshInterval;
    if (!store.autoRefreshEnabled || interval <= 0) {
      return;
    }
    
    pollIntervalRef.current = setInterval(() => {
      if (k8sClient.isConfigured()) {
        refreshAll();
      }
    }, interval);
  }, [refreshAll, store.autoRefreshEnabled, store.autoRefreshInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

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
    });

    // Clear store
    store.setModelAPIs([]);
    store.setMCPServers([]);
    store.setAgents([]);
    store.setPods([]);
    store.setDeployments([]);
    store.setPVCs([]);
    store.setServices([]);
    
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

  const value: KubernetesConnectionContextType = {
    ...state,
    connect,
    disconnect,
    refreshAll,
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
  };

  return (
    <KubernetesConnectionContext.Provider value={value}>
      {children}
    </KubernetesConnectionContext.Provider>
  );
}

export function useKubernetesConnection() {
  const context = useContext(KubernetesConnectionContext);
  if (!context) {
    throw new Error('useKubernetesConnection must be used within KubernetesConnectionProvider');
  }
  return context;
}
