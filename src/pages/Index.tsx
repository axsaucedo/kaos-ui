import React, { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { VisualCanvas } from '@/components/canvas/VisualCanvas';
import { ModelAPIList } from '@/components/resources/ModelAPIList';
import { MCPServerList } from '@/components/resources/MCPServerList';
import { AgentList } from '@/components/resources/AgentList';
import { AgentDetailDrawer } from '@/components/resources/AgentDetailDrawer';
import { AgentEditDialog } from '@/components/resources/AgentEditDialog';
import { ModelAPIDetailDrawer } from '@/components/resources/ModelAPIDetailDrawer';
import { ModelAPIEditDialog } from '@/components/resources/ModelAPIEditDialog';
import { MCPServerDetailDrawer } from '@/components/resources/MCPServerDetailDrawer';
import { MCPServerEditDialog } from '@/components/resources/MCPServerEditDialog';
import { PodsList } from '@/components/kubernetes/PodsList';
import { DeploymentsList } from '@/components/kubernetes/DeploymentsList';
import { VolumesList } from '@/components/kubernetes/VolumesList';
import { ConnectionSettings } from '@/components/settings/ConnectionSettings';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { KubernetesConnectionProvider } from '@/contexts/KubernetesConnectionContext';
import { Settings, AlertCircle, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Agent, ModelAPI, MCPServer } from '@/types/kubernetes';

// Inline LogsViewer to avoid import issues
function LogsViewer() {
  const { logs, clearLogs } = useKubernetesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = searchQuery === '' || 
        log.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [logs, searchQuery, levelFilter]);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Logs</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-1" />Clear
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1 border rounded-lg">
        <div className="font-mono text-sm p-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No logs</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="flex items-start gap-2 py-1 px-2 hover:bg-muted/50">
                <Badge variant="outline" className={cn('text-xs', log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-blue-500')}>{log.level}</Badge>
                <span className="text-muted-foreground text-xs">{log.source}</span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function IndexContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { activeTab, selectedResource, selectedResourceMode, setSelectedResource, setSelectedResourceMode } = useKubernetesStore();

  const handleCloseResource = () => {
    setSelectedResource(null);
    setSelectedResourceMode(null);
  };

  const handleSwitchToEdit = () => {
    setSelectedResourceMode('edit');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewDashboard />;
      case 'visual-editor': return <VisualCanvas />;
      case 'model-apis': return <ModelAPIList />;
      case 'mcp-servers': return <MCPServerList />;
      case 'agents': return <AgentList />;
      case 'pods': return <PodsList />;
      case 'deployments': return <DeploymentsList />;
      case 'volumes': return <VolumesList />;
      case 'logs': return <LogsViewer />;
      case 'alerts':
        return (
          <div className="p-6"><div className="flex items-center gap-4 mb-6"><div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertCircle className="h-6 w-6 text-destructive" /></div><div><h1 className="text-2xl font-bold text-foreground">Alerts</h1><p className="text-muted-foreground">System alerts and notifications</p></div></div><div className="text-center py-12 text-muted-foreground">No active alerts</div></div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Configure your operator dashboard</p>
              </div>
            </div>
            <ConnectionSettings />
          </div>
        );
      default: return <OverviewDashboard />;
    }
  };

  const isAgentSelected = selectedResource?.kind === 'Agent';
  const isModelAPISelected = selectedResource?.kind === 'ModelAPI';
  const isMCPServerSelected = selectedResource?.kind === 'MCPServer';

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>

      {/* ModelAPI Detail Drawer */}
      {isModelAPISelected && selectedResourceMode === 'view' && (
        <ModelAPIDetailDrawer
          modelAPI={selectedResource as ModelAPI}
          open={true}
          onClose={handleCloseResource}
          onEdit={handleSwitchToEdit}
        />
      )}

      {/* ModelAPI Edit Dialog */}
      {isModelAPISelected && selectedResourceMode === 'edit' && (
        <ModelAPIEditDialog
          modelAPI={selectedResource as ModelAPI}
          open={true}
          onClose={handleCloseResource}
        />
      )}

      {/* MCPServer Detail Drawer */}
      {isMCPServerSelected && selectedResourceMode === 'view' && (
        <MCPServerDetailDrawer
          mcpServer={selectedResource as MCPServer}
          open={true}
          onClose={handleCloseResource}
          onEdit={handleSwitchToEdit}
        />
      )}

      {/* MCPServer Edit Dialog */}
      {isMCPServerSelected && selectedResourceMode === 'edit' && (
        <MCPServerEditDialog
          mcpServer={selectedResource as MCPServer}
          open={true}
          onClose={handleCloseResource}
        />
      )}

      {/* Agent Detail Drawer */}
      {isAgentSelected && selectedResourceMode === 'view' && (
        <AgentDetailDrawer
          agent={selectedResource as Agent}
          open={true}
          onClose={handleCloseResource}
          onEdit={handleSwitchToEdit}
        />
      )}

      {/* Agent Edit Dialog */}
      {isAgentSelected && selectedResourceMode === 'edit' && (
        <AgentEditDialog
          agent={selectedResource as Agent}
          open={true}
          onClose={handleCloseResource}
        />
      )}
    </div>
  );
}

const Index = () => {
  return (
    <KubernetesConnectionProvider>
      <IndexContent />
    </KubernetesConnectionProvider>
  );
};

export default Index;
