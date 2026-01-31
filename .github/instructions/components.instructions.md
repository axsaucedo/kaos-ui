# UI Component Guidelines

Instructions for developing UI components in KAOS-UI.

## Component Architecture

### Folder Structure
Components are organized by domain:
```
src/components/
├── agent/           # Agent-specific components
├── mcp/             # MCP Server components
├── modelapi/        # Model API components
├── dashboard/       # Dashboard and overview widgets
├── layout/          # Layout structure (MainLayout, Sidebar, Header)
├── settings/        # Settings panel components
├── shared/          # Cross-cutting reusable components
├── kubernetes/      # Generic K8s resource components
├── resources/       # Resource cards and lists
└── ui/              # shadcn/ui base components (do not modify directly)
```

### Component Naming
- Use PascalCase for component files: `AgentOverview.tsx`
- Name components descriptively: `{Resource}{Feature}.tsx`
- Examples: `AgentChat.tsx`, `MCPToolsDebug.tsx`, `ModelAPIDiagnostics.tsx`

## Using shadcn/ui Components

### Import Pattern
Always import from the `@/components/ui/` path alias:
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
```

### Common Components
- **Card**: Container for content sections
- **Badge**: Status indicators and labels
- **Button**: Actions (use appropriate variants)
- **Separator**: Visual dividers
- **Tabs**: Tabbed navigation within pages
- **Dialog/AlertDialog**: Modals and confirmations
- **Toast/Sonner**: Notifications

### Badge Variants for Status
```typescript
const getStatusVariant = (phase?: string) => {
  switch (phase) {
    case 'Running':
    case 'Ready': return 'success';
    case 'Pending': return 'warning';
    case 'Error':
    case 'Failed': return 'destructive';
    default: return 'secondary';
  }
};
```

## Resource Detail Pages

### Standard Tab Structure
Resource detail pages follow a consistent pattern:
1. **Overview** - General info, status, configuration
2. **Pods** - Associated pods and their status
3. **YAML** - Raw resource definition (read-only)
4. Additional resource-specific tabs (Chat, Memory, Tools, etc.)

### Example Detail Page Structure
```typescript
export default function AgentDetail() {
  const { namespace, name } = useParams();
  const agent = useKubernetesStore(state => 
    state.agents.find(a => a.metadata.name === name)
  );

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="pods">Pods</TabsTrigger>
        <TabsTrigger value="yaml">YAML</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        <AgentOverview agent={agent} />
      </TabsContent>
      {/* ... other tabs */}
    </Tabs>
  );
}
```

## Icons

Use Lucide React icons consistently:
```typescript
import { Box, Globe, Settings, Activity, Clock } from 'lucide-react';
```

### Resource-Specific Icons
- **Agent**: `Bot` or custom agent icon
- **MCPServer**: `Wrench` or `Server`
- **ModelAPI**: `Box` or `Cpu`
- **Pod**: `Container` or `Box`

## Styling

### Tailwind Classes
- Use semantic color classes: `text-muted-foreground`, `bg-muted`
- Use resource-specific colors: `text-agent`, `text-mcp`, `text-modelapi`
- Grid layouts: `grid gap-6 md:grid-cols-2`

### Custom Resource Colors
Defined in `src/index.css`:
```css
:root {
  --agent: 142 76% 36%;    /* Green */
  --mcp: 262 83% 58%;      /* Purple */
  --modelapi: 45 93% 47%;  /* Yellow/Orange */
}
```

## Forms

### Using React Hook Form
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  // ...
});

function CreateForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });
  // ...
}
```

## Data Display Patterns

### Key-Value Display
```tsx
<div className="grid grid-cols-2 gap-4 text-sm">
  <div>
    <span className="text-muted-foreground">Label</span>
    <p className="font-mono font-medium">{value}</p>
  </div>
</div>
```

### Code/Config Display
```tsx
<code className="font-mono text-sm block bg-muted px-2 py-1 rounded mt-1">
  {configValue}
</code>
```

### Lists/Arrays
```tsx
<div className="flex flex-wrap gap-1 mt-1">
  {items.map((item, idx) => (
    <code key={idx} className="font-mono text-sm bg-muted px-2 py-1 rounded">
      {item}
    </code>
  ))}
</div>
```

## Error Handling

### Toast Notifications
```typescript
import { toast } from 'sonner';

// Success
toast.success('Resource created successfully');

// Error
toast.error('Failed to create resource', {
  description: error.message,
});
```

### Error Boundaries
Wrap pages/sections in ErrorBoundary for graceful degradation:
```tsx
<ErrorBoundary>
  <ComponentThatMightFail />
</ErrorBoundary>
```

## Responsive Design

- Use responsive grid classes: `md:grid-cols-2`, `lg:grid-cols-3`
- Test on mobile viewports
- Sidebar collapses on mobile (handled by MainLayout)
