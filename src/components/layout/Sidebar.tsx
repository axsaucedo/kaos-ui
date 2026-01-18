import React from 'react';
import {
  LayoutDashboard,
  Box,
  Server,
  Bot,
  Boxes,
  KeyRound,
  FileText,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeVariant?: 'default' | 'destructive' | 'success' | 'warning';
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'visual-editor', label: 'Visual Editor', icon: Workflow },
  { id: 'model-apis', label: 'Model APIs', icon: Box },
  { id: 'mcp-servers', label: 'MCP Servers', icon: Server },
  { id: 'agents', label: 'Agents', icon: Bot },
];

const k8sItems: NavItem[] = [
  { id: 'pods', label: 'Pods', icon: Boxes },
  { id: 'secrets', label: 'Secrets', icon: KeyRound },
];

const toolItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activeTab, setActiveTab, modelAPIs, mcpServers, agents } = useKubernetesStore();

  const getResourceCount = (id: string): number | undefined => {
    switch (id) {
      case 'model-apis': return modelAPIs.length;
      case 'mcp-servers': return mcpServers.length;
      case 'agents': return agents.length;
      default: return undefined;
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = activeTab === item.id;
    const count = getResourceCount(item.id);
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={cn(
          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 group',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {count !== undefined && count > 0 && (
              <Badge
                variant={item.id === 'alerts' ? 'error' : 'secondary'}
                className="text-[10px] px-1.5 py-0"
              >
                {count}
              </Badge>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">K</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">KAOS</h1>
              <p className="text-[10px] text-muted-foreground">K8s Agent Orchestration</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* Quick Create */}
        {!collapsed && (
          <Button
            onClick={() => setActiveTab('visual-editor')}
            className="w-full justify-start gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Create Resource
          </Button>
        )}
        {collapsed && (
          <Button
            onClick={() => setActiveTab('visual-editor')}
            size="icon"
            className="w-full"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Main Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Agentic Resources
            </p>
          )}
          {navItems.map(renderNavItem)}
        </div>

        {/* Kubernetes Resources */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Kubernetes
            </p>
          )}
          {k8sItems.map(renderNavItem)}
        </div>

        {/* Tools */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Tools
            </p>
          )}
          {toolItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30',
          collapsed && 'justify-center'
        )}>
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          {!collapsed && (
            <span className="text-xs text-muted-foreground">Connected to cluster</span>
          )}
        </div>
      </div>
    </aside>
  );
}
