import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { ResourceNode, VisualMapZoomContext, VisualMapCompactContext } from './ResourceNode';
import { ColumnHeaderNode } from './ColumnHeaderNode';
import { DynamicEdge } from './DynamicEdge';
import { VisualMapToolbar } from './VisualMapToolbar';
import { VisualMapContextMenu } from './VisualMapContextMenu';
import { useVisualMapLayout } from './useVisualMapLayout';
import { useVisualMapFilters } from './useVisualMapFilters';
import type { ResourceNodeData, ResourceKind } from './types';

// Edit dialogs
import { AgentEditDialog } from '@/components/resources/AgentEditDialog';
import { MCPServerEditDialog } from '@/components/resources/MCPServerEditDialog';
import { ModelAPIEditDialog } from '@/components/resources/ModelAPIEditDialog';
// Create dialogs
import { AgentCreateDialog } from '@/components/resources/AgentCreateDialog';
import { MCPServerCreateDialog } from '@/components/resources/MCPServerCreateDialog';
import { ModelAPICreateDialog } from '@/components/resources/ModelAPICreateDialog';

import type { Agent, MCPServer, ModelAPI } from '@/types/kubernetes';

// ── Wrap ResourceNode with context menu + edit handler ──
function ContextMenuResourceNode({ data, ...rest }: { data: ResourceNodeData; [key: string]: any }) {
  const { fitView } = useReactFlow();

  const handleFocusNode = useCallback((nodeId: string) => {
    fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 400 });
  }, [fitView]);

  const handleEditNode = useCallback((data: ResourceNodeData) => {
    const store = useKubernetesStore.getState();
    store.setSelectedResource(data.resource);
    store.setSelectedResourceMode('edit');
  }, []);

  return (
    <VisualMapContextMenu data={data} onFocusNode={handleFocusNode} onEditNode={handleEditNode}>
      <div>
        <ResourceNode data={data} onEdit={handleEditNode} />
      </div>
    </VisualMapContextMenu>
  );
}

const nodeTypes: NodeTypes = {
  resourceNode: ContextMenuResourceNode as any,
  columnHeader: ColumnHeaderNode as any,
};

const edgeTypes: EdgeTypes = {
  dynamic: DynamicEdge as any,
};

// ── Inner component (needs ReactFlowProvider) ──
function VisualMapInner() {
  const { modelAPIs, mcpServers, agents, selectedResource, selectedResourceMode, setSelectedResource, setSelectedResourceMode } = useKubernetesStore();
  const [zoom, setZoom] = useState(1);
  const [isCompact, setIsCompact] = useState(false);
  const [dimModelAPIEdges, setDimModelAPIEdges] = useState(false);

  // Create dialog state
  const [createKind, setCreateKind] = useState<ResourceKind | null>(null);

  const {
    initialNodes,
    initialEdges,
    changed,
    isLocked,
    toggleLock,
    handleNodeDragStop,
    reLayout,
  } = useVisualMapLayout(modelAPIs, mcpServers, agents, dimModelAPIEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { fitView } = useReactFlow();

  // Inject onAdd callbacks into header nodes
  const nodesWithCallbacks = useMemo(() => {
    return initialNodes.map(node => {
      if (node.type === 'columnHeader') {
        const kind = node.id.replace('header-', '') as ResourceKind;
        return { ...node, data: { ...node.data, onAdd: () => setCreateKind(kind) } };
      }
      return node;
    });
  }, [initialNodes]);

  // Sync nodes when structural change, sync edges always (for dimming toggle)
  useEffect(() => {
    if (changed) {
      setNodes(nodesWithCallbacks);
    }
  }, [nodesWithCallbacks, changed, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Track zoom (for label detail level, NOT for compact toggle)
  useOnViewportChange({
    onChange: useCallback((vp: Viewport) => setZoom(vp.zoom), []),
  });

  const {
    kindFilter, statusFilter, searchQuery,
    toggleKind, toggleStatus, setSearchQuery, applyFilters,
  } = useVisualMapFilters();

  const { nodes: displayNodes, edges: displayEdges } = useMemo(
    () => applyFilters(nodes, edges),
    [nodes, edges, applyFilters],
  );

  const handleReLayout = useCallback(() => {
    const layoutedNodes = reLayout(nodes, edges);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
  }, [nodes, edges, reLayout, setNodes, fitView]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.3, duration: 300 });
  }, [fitView]);

  const toggleCompact = useCallback(() => setIsCompact(prev => !prev), []);
  const toggleDimModelAPIEdges = useCallback(() => setDimModelAPIEdges(prev => !prev), []);

  // Determine what's being edited
  const editingAgent = selectedResourceMode === 'edit' && selectedResource?.kind === 'Agent' ? selectedResource as Agent : null;
  const editingMCPServer = selectedResourceMode === 'edit' && selectedResource?.kind === 'MCPServer' ? selectedResource as MCPServer : null;
  const editingModelAPI = selectedResourceMode === 'edit' && selectedResource?.kind === 'ModelAPI' ? selectedResource as ModelAPI : null;

  const closeEdit = useCallback(() => {
    setSelectedResource(null);
    setSelectedResourceMode(null);
  }, [setSelectedResource, setSelectedResourceMode]);

  const isEmpty = modelAPIs.length === 0 && mcpServers.length === 0 && agents.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-muted-foreground gap-3">
        <Bot className="h-12 w-12 opacity-30" />
        <p className="text-sm">No resources found. Create ModelAPIs, MCPServers, or Agents to see them here.</p>
      </div>
    );
  }

  return (
    <VisualMapZoomContext.Provider value={zoom}>
      <VisualMapCompactContext.Provider value={isCompact}>
        <TooltipProvider delayDuration={200}>
          <div className="h-[calc(100vh-140px)] w-full rounded-xl border border-border bg-card overflow-hidden relative">
            <VisualMapToolbar
              kindFilter={kindFilter}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              isLocked={isLocked}
              isCompact={isCompact}
              dimModelAPIEdges={dimModelAPIEdges}
              onToggleKind={toggleKind}
              onToggleStatus={toggleStatus}
              onSearchChange={setSearchQuery}
              onReLayout={handleReLayout}
              onFitView={handleFitView}
              onToggleLock={toggleLock}
              onToggleCompact={toggleCompact}
              onToggleDimModelAPIEdges={toggleDimModelAPIEdges}
            />

            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              onNodesChange={isLocked ? undefined : onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={!isLocked}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={2}
            >
              <Background gap={20} size={1} className="!bg-background" />
              <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
              <MiniMap
                nodeColor={(node) => {
                  const rt = (node.data as unknown as ResourceNodeData)?.resourceType;
                  if (rt === 'ModelAPI') return 'hsl(var(--modelapi-color))';
                  if (rt === 'MCPServer') return 'hsl(var(--mcpserver-color))';
                  if (rt === 'Agent') return 'hsl(var(--agent-color))';
                  return 'hsl(var(--muted-foreground))';
                }}
                className="!bg-card !border-border"
                maskColor="hsl(var(--background) / 0.7)"
              />
            </ReactFlow>
          </div>

          {/* Edit Dialogs */}
          {editingAgent && (
            <AgentEditDialog agent={editingAgent} open onClose={closeEdit} />
          )}
          {editingMCPServer && (
            <MCPServerEditDialog mcpServer={editingMCPServer} open onClose={closeEdit} />
          )}
          {editingModelAPI && (
            <ModelAPIEditDialog modelAPI={editingModelAPI} open onClose={closeEdit} />
          )}

          {/* Create Dialogs */}
          <AgentCreateDialog open={createKind === 'Agent'} onClose={() => setCreateKind(null)} />
          <MCPServerCreateDialog open={createKind === 'MCPServer'} onClose={() => setCreateKind(null)} />
          <ModelAPICreateDialog open={createKind === 'ModelAPI'} onClose={() => setCreateKind(null)} />
        </TooltipProvider>
      </VisualMapCompactContext.Provider>
    </VisualMapZoomContext.Provider>
  );
}

export function VisualMapEnhanced() {
  return (
    <ReactFlowProvider>
      <VisualMapInner />
    </ReactFlowProvider>
  );
}
