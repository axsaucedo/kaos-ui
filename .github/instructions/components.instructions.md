# UI Component Guidelines

Instructions for developing UI components in KAOS-UI.

## Component Architecture

### Folder Structure

```
src/components/
├── agent/           # Agent-specific (Chat, Memory, Overview, Pods)
├── mcp/             # MCPServer (Overview, Pods, ToolsDebug)
├── modelapi/        # ModelAPI (Overview, Pods, Diagnostics)
├── dashboard/       # Dashboard widgets (OverviewDashboard)
├── kubernetes/      # K8s resources (PodsList, SecretsList, CreateSecretDialog)
├── layout/          # Layout (MainLayout, Sidebar, Header, ConnectionStatus)
├── resources/       # Resource CRUD
│   ├── AgentList.tsx, AgentCreateDialog.tsx, AgentEditDialog.tsx
│   ├── MCPServerList.tsx, MCPServerCreateDialog.tsx, ...
│   ├── ModelAPIList.tsx, ModelAPICreateDialog.tsx, ...
│   └── shared/      # EnvVarEditor, LabelsAnnotationsEditor
├── settings/        # Settings page components
├── shared/          # Cross-cutting (DeploymentStatusCard, YamlViewer)
├── theme/           # Theme (ThemeProvider, ThemeToggle)
└── ui/              # shadcn/ui base components (DO NOT MODIFY)
```

### Component Naming

- PascalCase file names: `AgentOverview.tsx`
- Pattern: `{Resource}{Feature}.tsx`
- Examples: `AgentChat.tsx`, `MCPToolsDebug.tsx`, `ModelAPIDiagnostics.tsx`

## shadcn/ui Usage

### Import Pattern

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
```

### Badge Variants

```typescript
// Resource-specific
<Badge variant="agent">Agent</Badge>
<Badge variant="mcpserver">MCP Server</Badge>
<Badge variant="modelapi">Model API</Badge>

// Status
<Badge variant="success">Ready</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="secondary">Unknown</Badge>
```

## Resource Detail Pages

### Standard Tab Structure

1. **Overview** - General info, status, configuration
2. **Pods** - Associated pods and their status
3. **YAML** - Raw resource definition (read-only)
4. Resource-specific tabs (Chat, Memory, Tools, Diagnostics)

### Example Pattern

```tsx
export default function AgentDetail() {
  const { namespace, name } = useParams();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { agents, refreshAll } = useKubernetesStore();
  
  const agent = agents.find(a => 
    a.metadata.name === name && a.metadata.namespace === namespace
  );

  const handleEditDialogClose = async () => {
    setEditDialogOpen(false);
    await refreshAll(); // Refresh after edit
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{agent.metadata.name}</h1>
        <Button onClick={() => setEditDialogOpen(true)}>Edit</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <AgentOverview agent={agent} />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>

      {/* Edit Dialog */}
      <AgentEditDialog 
        agent={agent} 
        open={editDialogOpen} 
        onClose={handleEditDialogClose} 
      />
    </div>
  );
}
```

## Form Patterns

### React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required')
    .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, 'Invalid K8s name'),
  model: z.string().min(1, 'Model is required'),
  modelAPI: z.string().min(1, 'ModelAPI is required'),
});

function AgentCreateDialog({ open, onClose }) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', model: '', modelAPI: '' },
  });

  const onSubmit = async (data) => {
    await createAgent(data);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            {/* ... */}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### EnvVar Editor Usage

```tsx
import { EnvVarEditorWithSecrets, EnvVarEntry, envVarEntriesToK8sEnvVars } from './shared/EnvVarEditorWithSecrets';

function MyForm() {
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);

  const onSubmit = async (data) => {
    const k8sEnvVars = envVarEntriesToK8sEnvVars(envVars);
    const resource = {
      // ...
      spec: {
        container: {
          env: k8sEnvVars,  // Use container.env (not config.env)
        },
      },
    };
  };

  return (
    <EnvVarEditorWithSecrets
      fields={envVars}
      onChange={setEnvVars}
      label="Environment Variables"
    />
  );
}
```

## Icons

Use Lucide React icons:

```typescript
import { 
  Bot,        // Agent
  Server,     // MCPServer
  Box,        // ModelAPI
  Boxes,      // Pods
  KeyRound,   // Secrets
  Settings,   // Settings
  Activity,   // Status
  Brain,      // Memory
  Send,       // Chat
  Wrench,     // Tools
} from 'lucide-react';
```

## Styling

### Resource Colors

```css
/* index.css tokens */
:root {
  --agent: 142 76% 36%;    /* Green */
  --mcp: 262 83% 58%;      /* Purple */
  --modelapi: 45 93% 47%;  /* Yellow/Orange */
}
```

```tsx
// Usage
<div className="text-agent">Agent text</div>
<div className="bg-modelapi/20">ModelAPI background</div>
<Badge variant="mcpserver">MCP Server</Badge>
```

### Layouts

```tsx
// Two-column grid
<div className="grid gap-6 md:grid-cols-2">

// Full-width card
<Card className="md:col-span-2">

// Info row
<div className="flex items-start justify-between gap-4">
  <span className="text-sm text-muted-foreground">{label}</span>
  <span className="text-sm font-medium">{value}</span>
</div>
```

## Error Handling

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('Agent created successfully');

// Error
toast.error('Failed to create agent', {
  description: error.message,
});
```

### Error States

```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

## Responsive Design

- Use `md:` prefix for tablet+: `md:grid-cols-2`
- Use `lg:` prefix for desktop+: `lg:grid-cols-3`
- Mobile-first approach
- Sidebar collapses on mobile (handled by MainLayout)

## Data-TestID Conventions

Add test IDs for Playwright tests:

```tsx
<Button data-testid="create-agent-button">Create</Button>
<Input data-testid="agent-name-input" {...register('name')} />
<tr data-testid={`agent-row-${agent.metadata.name}`}>
```
