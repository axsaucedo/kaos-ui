

# Visual Map Screen + Sidebar Reorganization

## Overview

Add a new "Visual Map" screen that displays all KAOS resources (ModelAPIs, MCPServers, Agents) as interactive nodes with their connections, and reorganize the sidebar into the new section structure.

## Part 1: Sidebar Reorganization

Restructure sidebar sections from the current layout to:

| Section | Items |
|---------|-------|
| **OVERVIEW** | Summary (was "Overview"), Visual Map (new) |
| **KAOS RESOURCES** | Model APIs, MCP Servers, Agents |
| **KUBERNETES** | Pods, Secrets |
| **MONITORING** | KAOS System, KAOS Observability (was "KAOS Monitoring") |
| **CONFIG** | Settings |

Changes in `Sidebar.tsx`:
- Rename "Overview" to "Summary" (id stays `overview`)
- Add "Visual Map" item with `Map` icon (id: `visual-map`)
- Move items into 5 section groups
- Rename "KAOS Monitoring" label to "KAOS Observability" (id stays `kaos-monitoring`)

## Part 2: Visual Map Page

Create `src/components/dashboard/VisualMap.tsx` using `@xyflow/react` (already installed).

### Node Layout Logic

Automatic layout arranged in 3 columns (left-to-right flow):

```text
  [ModelAPI]  -->  [MCPServer]  -->  [Agent]
```

- **Left column**: ModelAPI nodes
- **Middle column**: MCPServer nodes  
- **Right column**: Agent nodes

Each node is a custom React Flow node styled with the existing color scheme (`modelapi-color`, `mcpserver-color`, `agent-color`) and shows: name, status badge, namespace.

### Edge/Connection Logic

Derived from the Agent spec:
- `agent.spec.modelAPI` -- draw edge from the referenced ModelAPI node to the Agent node
- `agent.spec.mcpServers[]` -- draw edges from each referenced MCPServer node to the Agent node

Edges styled with animated dashes (similar to n8n's connector style).

### Interactions

- **Click node** -- navigate to detail page (`/agents/:ns/:name`, `/modelapis/:ns/:name`, `/mcpservers/:ns/:name`)
- **Pan/zoom** -- built-in React Flow controls
- **Minimap** -- React Flow MiniMap component for orientation
- **Fit view** -- auto-fit all nodes on load

### Wire into Index.tsx

Add `case 'visual-map': return <VisualMap />;` to the tab switch.

## Part 3: Update Copilot Instructions

Update `.github/instructions/components.instructions.md` to document the Visual Map component and the new sidebar structure.

---

## Technical Details

### Files to Create
- `src/components/dashboard/VisualMap.tsx` -- Main visual map component with custom nodes, edge derivation, and auto-layout

### Files to Modify
- `src/components/layout/Sidebar.tsx` -- Reorganize sections, rename items, add Visual Map entry
- `src/pages/Index.tsx` -- Add `visual-map` case to tab switch
- `.github/instructions/components.instructions.md` -- Document new component

### Dependencies
- `@xyflow/react` -- already installed, no new dependencies needed

### Custom Node Design
- Rounded card with colored left border (per resource type)
- Icon + name + status badge
- Subtle shadow, hover glow effect
- Dark-theme compatible using existing CSS variables

### Auto-Layout Algorithm
- Simple grid: evenly space nodes vertically within each column
- Column X positions: 0, 400, 800
- Row Y positions: spaced 150px apart per resource type
- `fitView` on initial render

