import React, { useState } from 'react';
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
import { LogsViewer } from '@/components/logs/LogsViewer';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Settings, AlertCircle } from 'lucide-react';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { activeTab } = useKubernetesStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />;
      case 'canvas':
        return <VisualCanvas />;
      case 'modelapis':
        return <ModelAPIList />;
      case 'mcpservers':
        return <MCPServerList />;
      case 'agents':
        return <AgentList />;
      case 'pods':
        return <PodsList />;
      case 'deployments':
        return <DeploymentsList />;
      case 'volumes':
        return <VolumesList />;
      case 'logs':
        return <LogsViewer />;
      case 'alerts':
        return (
          <div className="p-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
                <p className="text-muted-foreground">System alerts and notifications</p>
              </div>
            </div>
            <div className="text-center py-12 text-muted-foreground">
              No active alerts
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Configure your operator dashboard</p>
              </div>
            </div>
            <div className="text-center py-12 text-muted-foreground">
              Settings panel coming soon
            </div>
          </div>
        );
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
