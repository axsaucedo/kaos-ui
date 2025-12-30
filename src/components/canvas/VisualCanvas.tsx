import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Box, Server, Bot, Plus, Minus, Move, Trash2, Settings, 
  ZoomIn, ZoomOut, Maximize2, MousePointer, Link2, Save, Undo, Redo,
  Play, Pause, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { cn } from '@/lib/utils';
import type { CanvasNode, CanvasConnection, AgenticResource } from '@/types/kubernetes';

interface NodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onConnectionStart: (id: string, handle: string) => void;
  zoom: number;
}

const resourceIcons = {
  ModelAPI: Box,
  MCPServer: Server,
  Agent: Bot,
};

const resourceColors = {
  ModelAPI: 'modelapi',
  MCPServer: 'mcpserver',
  Agent: 'agent',
};

function CanvasNodeComponent({ node, isSelected, onSelect, onDragStart, onConnectionStart, zoom }: NodeProps) {
  const Icon = resourceIcons[node.type];
  const color = resourceColors[node.type];
  const status = (node.data as any).status?.phase || 'Unknown';

  return (
    <div
      className={cn(
        'absolute resource-node p-4 min-w-[200px] cursor-move select-none',
        isSelected && 'selected ring-2 ring-primary'
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: `scale(${1 / zoom})`,
        transformOrigin: 'top left',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(node.id);
        onDragStart(node.id, e);
      }}
    >
      {/* Input handles */}
      <div
        className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-background cursor-crosshair hover:scale-125 transition-transform"
        onMouseDown={(e) => {
          e.stopPropagation();
          onConnectionStart(node.id, 'input');
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `hsl(var(--${color}-color) / 0.2)` }}
        >
          <Icon className="h-5 w-5" style={{ color: `hsl(var(--${color}-color))` }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {node.data.metadata.name}
          </p>
          <p className="text-xs text-muted-foreground">{node.type}</p>
        </div>
        <Badge variant={status === 'Running' ? 'success' : status === 'Error' ? 'error' : 'warning'} className="text-[10px]">
          {status}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {node.type === 'ModelAPI' && (
          <p>Mode: {(node.data as any).spec.mode}</p>
        )}
        {node.type === 'MCPServer' && (
          <p>Type: {(node.data as any).spec.type}</p>
        )}
        {node.type === 'Agent' && (
          <>
            <p>Model: {(node.data as any).spec.modelAPI}</p>
            <p>MCPs: {(node.data as any).spec.mcpServers?.length || 0}</p>
          </>
        )}
      </div>

      {/* Output handles */}
      <div
        className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-accent border-2 border-background cursor-crosshair hover:scale-125 transition-transform"
        onMouseDown={(e) => {
          e.stopPropagation();
          onConnectionStart(node.id, 'output');
        }}
      />
    </div>
  );
}

interface ResourcePaletteItemProps {
  type: 'ModelAPI' | 'MCPServer' | 'Agent';
  onDragStart: (type: string) => void;
}

function ResourcePaletteItem({ type, onDragStart }: ResourcePaletteItemProps) {
  const Icon = resourceIcons[type];
  const color = resourceColors[type];

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all"
      draggable
      onDragStart={() => onDragStart(type)}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `hsl(var(--${color}-color) / 0.2)` }}
      >
        <Icon className="h-4 w-4" style={{ color: `hsl(var(--${color}-color))` }} />
      </div>
      <span className="text-sm font-medium">{type}</span>
    </div>
  );
}

export function VisualCanvas() {
  const {
    modelAPIs,
    mcpServers,
    agents,
    canvasNodes,
    canvasConnections,
    selectedNodeId,
    canvasZoom,
    canvasPan,
    addCanvasNode,
    updateCanvasNode,
    removeCanvasNode,
    setSelectedNode,
    addCanvasConnection,
    setCanvasZoom,
    setCanvasPan,
  } = useKubernetesStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{ id: string; handle: string } | null>(null);
  const [draggedType, setDraggedType] = useState<string | null>(null);

  // Initialize canvas with existing resources
  useEffect(() => {
    if (canvasNodes.length === 0) {
      const allResources = [
        ...modelAPIs.map((r, i) => ({ type: 'ModelAPI' as const, data: r, x: 100, y: 100 + i * 150 })),
        ...mcpServers.map((r, i) => ({ type: 'MCPServer' as const, data: r, x: 400, y: 100 + i * 150 })),
        ...agents.map((r, i) => ({ type: 'Agent' as const, data: r, x: 700, y: 100 + i * 150 })),
      ];

      allResources.forEach(({ type, data, x, y }) => {
        addCanvasNode({
          id: `${type}-${data.metadata.name}`,
          type,
          position: { x, y },
          data: data as AgenticResource,
        });
      });

      // Create connections based on agent configurations
      agents.forEach((agent) => {
        const agentNodeId = `Agent-${agent.metadata.name}`;
        
        // Connect to ModelAPI
        const modelAPINode = canvasNodes.find(n => n.id === `ModelAPI-${agent.spec.modelAPI}`);
        if (modelAPINode) {
          addCanvasConnection({
            id: `${agentNodeId}-to-${modelAPINode.id}`,
            sourceId: modelAPINode.id,
            targetId: agentNodeId,
          });
        }

        // Connect to MCP Servers
        agent.spec.mcpServers?.forEach((mcpName) => {
          const mcpNodeId = `MCPServer-${mcpName}`;
          addCanvasConnection({
            id: `${mcpNodeId}-to-${agentNodeId}`,
            sourceId: mcpNodeId,
            targetId: agentNodeId,
          });
        });
      });
    }
  }, [modelAPIs, mcpServers, agents]);

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.25, Math.min(2, canvasZoom + delta));
    setCanvasZoom(newZoom);
  };

  const handleNodeDragStart = (id: string, e: React.MouseEvent) => {
    const node = canvasNodes.find(n => n.id === id);
    if (node) {
      setDraggedNode(id);
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y,
      });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode) {
      updateCanvasNode(draggedNode, {
        position: {
          x: (e.clientX - dragOffset.x) / canvasZoom,
          y: (e.clientY - dragOffset.y) / canvasZoom,
        },
      });
    } else if (isPanning) {
      setCanvasPan({
        x: canvasPan.x + (e.clientX - panStart.x),
        y: canvasPan.y + (e.clientY - panStart.y),
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedNode, dragOffset, isPanning, panStart, canvasZoom, canvasPan]);

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsPanning(false);
    setConnectingFrom(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleConnectionStart = (nodeId: string, handle: string) => {
    setConnectingFrom({ id: nodeId, handle });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedType) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - canvasPan.x) / canvasZoom;
    const y = (e.clientY - rect.top - canvasPan.y) / canvasZoom;

    // Create a new resource based on type
    const newResource = createDefaultResource(draggedType as any);
    addCanvasNode({
      id: `${draggedType}-${newResource.metadata.name}`,
      type: draggedType as any,
      position: { x, y },
      data: newResource as AgenticResource,
    });

    setDraggedType(null);
  };

  const createDefaultResource = (type: 'ModelAPI' | 'MCPServer' | 'Agent'): AgenticResource => {
    const timestamp = Date.now();
    const baseMeta = {
      name: `new-${type.toLowerCase()}-${timestamp}`,
      namespace: 'agentic-system',
      uid: `${type}-${timestamp}`,
    };

    switch (type) {
      case 'ModelAPI':
        return {
          apiVersion: 'agentic.example.com/v1alpha1',
          kind: 'ModelAPI',
          metadata: baseMeta,
          spec: { mode: 'Proxy', proxyConfig: { env: [] } },
          status: { phase: 'Pending' },
        };
      case 'MCPServer':
        return {
          apiVersion: 'agentic.example.com/v1alpha1',
          kind: 'MCPServer',
          metadata: baseMeta,
          spec: { type: 'python-custom', config: { mcp: 'default', env: [] } },
          status: { phase: 'Pending' },
        };
      case 'Agent':
        return {
          apiVersion: 'agentic.example.com/v1alpha1',
          kind: 'Agent',
          metadata: baseMeta,
          spec: {
            modelAPI: '',
            mcpServers: [],
            config: { description: 'New agent', instructions: '' },
          },
          status: { phase: 'Pending' },
        };
    }
  };

  const renderConnections = () => {
    return canvasConnections.map((conn) => {
      const sourceNode = canvasNodes.find(n => n.id === conn.sourceId);
      const targetNode = canvasNodes.find(n => n.id === conn.targetId);
      if (!sourceNode || !targetNode) return null;

      const x1 = sourceNode.position.x + 200;
      const y1 = sourceNode.position.y + 50;
      const x2 = targetNode.position.x;
      const y2 = targetNode.position.y + 50;

      const midX = (x1 + x2) / 2;

      return (
        <path
          key={conn.id}
          className="connection-line"
          d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        />
      );
    });
  };

  return (
    <div className="flex h-full animate-fade-in">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-lg border border-border p-2">
        <Button variant="toolbar" size="xs" onClick={() => handleZoom(0.1)}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(canvasZoom * 100)}%
        </span>
        <Button variant="toolbar" size="xs" onClick={() => handleZoom(-0.1)}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <Button variant="toolbar" size="xs" onClick={() => setCanvasZoom(1)}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Resource Palette */}
      <div className="w-64 bg-card border-r border-border p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
          <p className="text-xs text-muted-foreground mb-4">Drag to add to canvas</p>
          <div className="space-y-2">
            <ResourcePaletteItem type="ModelAPI" onDragStart={setDraggedType} />
            <ResourcePaletteItem type="MCPServer" onDragStart={setDraggedType} />
            <ResourcePaletteItem type="Agent" onDragStart={setDraggedType} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Actions</h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Save className="h-4 w-4" />
              Apply to Cluster
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Download className="h-4 w-4" />
              Export YAML
            </Button>
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNodeId && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Selected Resource</h3>
            {(() => {
              const node = canvasNodes.find(n => n.id === selectedNodeId);
              if (!node) return null;
              return (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{node.data.metadata.name}</p>
                  <p className="text-xs text-muted-foreground">{node.type}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="xs" className="flex-1 gap-1">
                      <Settings className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => removeCanvasNode(selectedNodeId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 bg-canvas-bg canvas-grid relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
            transformOrigin: '0 0',
          }}
        >
          {renderConnections()}
        </svg>

        <div
          style={{
            transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
            transformOrigin: '0 0',
          }}
        >
          {canvasNodes.map((node) => (
            <CanvasNodeComponent
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              onSelect={setSelectedNode}
              onDragStart={handleNodeDragStart}
              onConnectionStart={handleConnectionStart}
              zoom={canvasZoom}
            />
          ))}
        </div>

        {/* Empty state */}
        {canvasNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Start Building</p>
              <p className="text-sm text-muted-foreground">
                Drag resources from the left panel to create your agentic system
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
