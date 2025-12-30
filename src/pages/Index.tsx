import React, { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { VisualCanvas } from '@/components/canvas/VisualCanvas';
import { ModelAPIList } from '@/components/resources/ModelAPIList';
import { MCPServerList } from '@/components/resources/MCPServerList';
import { AgentList } from '@/components/resources/AgentList';
import { PodsList } from '@/components/kubernetes/PodsList';
import { DeploymentsList } from '@/components/kubernetes/DeploymentsList';
import { VolumesList } from '@/components/kubernetes/VolumesList';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Settings, AlertCircle, Search, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { activeTab } = useKubernetesStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewDashboard />;
      case 'canvas': return <VisualCanvas />;
      case 'modelapis': return <ModelAPIList />;
      case 'mcpservers': return <MCPServerList />;
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
          <div className="p-6"><div className="flex items-center gap-4 mb-6"><div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center"><Settings className="h-6 w-6 text-muted-foreground" /></div><div><h1 className="text-2xl font-bold text-foreground">Settings</h1><p className="text-muted-foreground">Configure your operator dashboard</p></div></div><div className="text-center py-12 text-muted-foreground">Settings panel coming soon</div></div>
        );
      default: return <OverviewDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Index;
