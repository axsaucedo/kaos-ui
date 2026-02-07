
# Visual Map Enhancement Plan

## Overview

Transform the Visual Map from a static diagram into an interactive, production-grade topology view inspired by OpenShift and n8n. This covers 7 features: auto-layout with dagre, semantic zoom, graph-aware filtering/search, status overlays and edge labels, context menus, drag-and-drop nodes, and quick-action icons on each node.

## Architecture

The current `VisualMap.tsx` is a single ~280-line file. We will decompose it into a focused module under `src/components/dashboard/visual-map/` to keep each concern isolated.

```text
src/components/dashboard/
  VisualMap.tsx             --> thin wrapper that imports from visual-map/
  visual-map/
    index.tsx               --> main ReactFlow orchestration + toolbar
    ResourceNode.tsx        --> custom node with semantic zoom, quick-action icons, context menu trigger
    ColumnHeaderNode.tsx    --> column header (extracted from current file)
    VisualMapToolbar.tsx    --> filter bar, search, layout controls (Fit, Re-layout, Lock)
    VisualMapContextMenu.tsx--> right-click menu for nodes
    useVisualMapLayout.ts   --> dagre auto-layout hook + locked-positions state
    useVisualMapFilters.ts  --> filter/search state hook
    layout-engine.ts        --> dagre wrapper for computing node positions
    types.ts                --> shared types for ResourceNodeData, filter state, etc.
```

## Dependency

- **dagre** -- lightweight directed-graph layout library, widely used with React Flow. Will be added as a new dependency. No other new deps needed.

---

## Feature 1: Auto-layout + Tidy Graph Controls

### What changes
- Create `layout-engine.ts` that wraps dagre to compute node positions given nodes + edges
- Create `useVisualMapLayout.ts` hook managing:
  - Current layout mode (`'dagre'` -- tree left-to-right)
  - "Locked positions" mode: when enabled, user-dragged positions are persisted in a `useRef` map and dagre is skipped
  - Three toolbar actions: **Fit** (calls `reactFlowInstance.fitView()`), **Re-layout** (re-runs dagre, clears locked positions), **Lock** (toggle)
- Toolbar rendered as a floating bar at the top of the map area

### Toolbar UI
A small horizontal bar with icon buttons: `LayoutGrid` (Re-layout), `Maximize` (Fit View), `Lock`/`Unlock` toggle. Uses existing `Button` + `Tooltip` components.

---

## Feature 2: Semantic Zoom + Progressive Disclosure

### What changes
- Use `onViewportChange` from ReactFlow (or `useOnViewportChange` hook) to track current zoom level
- Pass zoom level to `ResourceNode` via React context or a zustand slice
- At **zoom < 0.6**: node renders as a compact pill -- just the colored icon circle + status dot, no text
- At **zoom >= 0.6**: full card with name, namespace, status badge (current design)
- At **zoom >= 1.2**: additionally show labels, model name, edge labels become visible
- Edge labels (relationship type) rendered via `edgeLabel` prop, hidden at low zoom via CSS class

### Implementation
- Add a `VisualMapZoomContext` (simple React context with zoom value)
- `ResourceNode` reads zoom and conditionally renders compact vs full vs detailed view
- CSS transitions on opacity for smooth disclosure

---

## Feature 3: Filtering + Search (Graph-aware)

### What changes
- Create `useVisualMapFilters.ts` hook with state:
  - `kindFilter`: `Set<'ModelAPI' | 'MCPServer' | 'Agent'>` (all enabled by default)
  - `statusFilter`: `Set<string>` (e.g., 'Ready', 'Pending', 'Failed')
  - `namespaceFilter`: `string | null`
  - `searchQuery`: `string`
- Create `VisualMapToolbar.tsx` with:
  - Toggle chips for kind (colored like resource badges)
  - Status dropdown filter
  - Search input with `Cmd+K` shortcut hint
- Filtering behavior:
  - Non-matching nodes get `style: { opacity: 0.15 }` (dimmed, not removed -- keeps graph structure)
  - Matching edges also dimmed if either endpoint is dimmed
- Search behavior:
  - As user types, matching node(s) get highlighted border
  - On Enter / single match: `reactFlowInstance.fitView({ nodes: [matchingNode], padding: 0.5 })` -- auto-pan/zoom to it
  - Optional "Show neighborhood" button: dim everything except the matched node and its 1-hop neighbors

---

## Feature 4: Status Overlays + Edge Labels

### What changes
- Node status indicator: add a small colored dot (green/yellow/red) to the top-right corner of the node card, visible even at low zoom
- Warning badge: if `status.message` contains error/warning keywords, show a small `AlertTriangle` icon
- Edge labels: add `label` property to edges:
  - ModelAPI -> Agent edges: label = `"model"`
  - MCPServer -> Agent edges: label = `"tools"`
- Edge color already matches resource type; keep animated for "active/ready" connections, make static (no animation) if source node is not Ready

---

## Feature 5: Context Menus

### What changes
- Create `VisualMapContextMenu.tsx` using the existing `ContextMenu` UI component from `@radix-ui/react-context-menu` (already installed)
- Wrap each `ResourceNode` with `ContextMenuTrigger`
- Menu items per resource type:

| Action | ModelAPI | MCPServer | Agent | Navigation |
|--------|---------|-----------|-------|------------|
| View Overview | Y | Y | Y | `/{type}/{ns}/{name}` |
| View YAML | Y | Y | Y | `/{type}/{ns}/{name}?tab=yaml` |
| View Pods | Y | Y | Y | `/{type}/{ns}/{name}?tab=pods` |
| View Diagnostics | Y | - | - | `/{type}/{ns}/{name}?tab=diagnostics` |
| View Tools | - | Y | - | `/{type}/{ns}/{name}?tab=tools` |
| Open Chat | - | - | Y | `/{type}/{ns}/{name}?tab=chat` |
| Focus in Graph | Y | Y | Y | fitView to node + 1-hop neighbors |
| Edit | Y | Y | Y | opens edit dialog via store |

- Context menu appears on right-click; on touch devices falls back to long-press (handled by Radix)

---

## Feature 6: Draggable Nodes

### What changes
- Currently nodes have no `onNodesChange` handler, making them static
- Add `useNodesState` and `useEdgesState` from `@xyflow/react` to make the graph controlled
- Wire `onNodesChange` to update node positions
- When a user drags a node, record that node's ID in the "locked positions" map (from Feature 1)
- On re-layout, only reposition nodes that are NOT locked (unless user clicks "Re-layout" which clears all locks)

---

## Feature 7: Quick-Action Icons on Nodes

### What changes
- Replace the single "click whole card to navigate" pattern
- Add small icon buttons at the bottom of each node card (visible at zoom >= 0.6):

| Resource | Icons |
|----------|-------|
| **Agent** | `Info` (Overview), `MessageSquare` (Chat), `Brain` (Memory) |
| **MCPServer** | `Info` (Overview), `Wrench` (Tools) |
| **ModelAPI** | `Info` (Overview), `Stethoscope` (Diagnostics) |

- Each icon navigates to `/{type}/{ns}/{name}?tab={tab}`
- The card itself remains clickable as a fallback (navigates to overview)
- Icons styled as small muted buttons, highlight on hover

---

## TODO Checklist

1. Add `dagre` dependency
2. Create `src/components/dashboard/visual-map/types.ts` -- shared types
3. Create `src/components/dashboard/visual-map/layout-engine.ts` -- dagre wrapper
4. Create `src/components/dashboard/visual-map/ColumnHeaderNode.tsx` -- extracted
5. Create `src/components/dashboard/visual-map/ResourceNode.tsx` -- enhanced node with semantic zoom, quick-action icons, context menu trigger, status dot
6. Create `src/components/dashboard/visual-map/VisualMapContextMenu.tsx` -- right-click actions
7. Create `src/components/dashboard/visual-map/useVisualMapLayout.ts` -- layout hook with lock state
8. Create `src/components/dashboard/visual-map/useVisualMapFilters.ts` -- filter/search state
9. Create `src/components/dashboard/visual-map/VisualMapToolbar.tsx` -- toolbar with filters, search, layout controls
10. Create `src/components/dashboard/visual-map/index.tsx` -- main orchestration (ReactFlow with controlled nodes/edges, viewport tracking, context menu wrapper)
11. Update `src/components/dashboard/VisualMap.tsx` -- thin re-export from `visual-map/index.tsx`
12. Update `.github/instructions/components.instructions.md` -- document new visual-map module structure

---

## Technical Details

### Dagre Layout Configuration

```text
Direction: LR (left-to-right)
Node separation: 80px vertical
Rank separation: 300px horizontal
Ranker: 'tight-tree'
```

Column headers become non-graph "label" nodes positioned above their column after layout.

### Controlled ReactFlow Pattern

```text
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
```

When store data changes (modelAPIs/mcpServers/agents), re-derive the graph but preserve locked positions.

### Zoom Context

```text
const VisualMapZoomContext = createContext(1);
// Updated via useOnViewportChange -> setZoom(viewport.zoom)
// ResourceNode reads: const zoom = useContext(VisualMapZoomContext);
```

### Filter Dimming

Non-matching nodes get `style: { opacity: 0.15, pointerEvents: 'none' }`. Their connected edges also get reduced opacity. This preserves the graph structure while making filtered-out resources visually recede.
