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
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Bot } from 'lucide-react';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { ResourceNode, VisualMapZoomContext, VisualMapDirectionContext } from './ResourceNode';
import { ColumnHeaderNode } from './ColumnHeaderNode';
import { VisualMapToolbar } from './VisualMapToolbar';
import { VisualMapContextMenu } from './VisualMapContextMenu';
import { useVisualMapLayout } from './useVisualMapLayout';
import { useVisualMapFilters } from './useVisualMapFilters';
import type { ResourceNodeData } from './types';

// ── Wrap ResourceNode with context menu ──
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
        <ResourceNode data={data} />
      </div>
    </VisualMapContextMenu>
  );
}

const nodeTypes: NodeTypes = {
  resourceNode: ContextMenuResourceNode as any,
  columnHeader: ColumnHeaderNode,
};

// ── Inner component (needs ReactFlowProvider) ──
function VisualMapInner() {
  const { modelAPIs, mcpServers, agents } = useKubernetesStore();
  const [zoom, setZoom] = useState(1);

  const {
    initialNodes,
    initialEdges,
    changed,
    isLocked,
    direction,
    toggleLock,
    handleNodeDragStop,
    reLayout,
    changeDirection,
  } = useVisualMapLayout(modelAPIs, mcpServers, agents);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { fitView } = useReactFlow();

  // Only sync nodes/edges when there's an actual structural change
  useEffect(() => {
    if (changed) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, changed, setNodes, setEdges]);

  // Track zoom
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
      <VisualMapDirectionContext.Provider value={direction}>
        <TooltipProvider delayDuration={200}>
          <div className="h-[calc(100vh-140px)] w-full rounded-xl border border-border bg-card overflow-hidden relative">
            <VisualMapToolbar
              kindFilter={kindFilter}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              isLocked={isLocked}
              direction={direction}
              onToggleKind={toggleKind}
              onToggleStatus={toggleStatus}
              onSearchChange={setSearchQuery}
              onReLayout={handleReLayout}
              onFitView={handleFitView}
              onToggleLock={toggleLock}
              onChangeDirection={changeDirection}
            />

            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              onNodesChange={isLocked ? undefined : onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              nodesDraggable={!isLocked}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={2}
              defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
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
        </TooltipProvider>
      </VisualMapDirectionContext.Provider>
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
