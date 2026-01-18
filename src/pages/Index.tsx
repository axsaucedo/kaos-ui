import { useState } from 'react';
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
import { SecretsList } from '@/components/kubernetes/SecretsList';
import { VolumesList } from '@/components/kubernetes/VolumesList';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import type { Agent, ModelAPI, MCPServer } from '@/types/kubernetes';

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
      case 'secrets': return <SecretsList />;
      case 'volumes': return <VolumesList />;
      case 'settings': return <SettingsPage />;
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
  return <IndexContent />;
};

export default Index;
