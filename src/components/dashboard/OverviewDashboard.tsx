import React from 'react';
import { Box, Server, Bot, Boxes, AlertCircle, CheckCircle2, Clock, Activity, TrendingUp, Zap } from 'lucide-react';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  running: number;
  pending: number;
  error: number;
}

function StatCard({ title, count, icon: Icon, color, running, pending, error }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300',
            `bg-${color}/10 group-hover:bg-${color}/20`
          )}
          style={{ backgroundColor: `hsl(var(--${color}) / 0.1)` }}
        >
          <Icon className="h-6 w-6" style={{ color: `hsl(var(--${color}))` }} />
        </div>
        <Badge variant="secondary" className="text-xs">
          {count} total
        </Badge>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-sm text-muted-foreground">{running}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-warning" />
          <span className="text-sm text-muted-foreground">{pending}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-sm text-muted-foreground">{error}</span>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ log }: { log: any }) {
  const levelColors = {
    info: 'text-primary',
    warn: 'text-warning',
    error: 'text-destructive',
    debug: 'text-muted-foreground',
  };

  const levelIcons = {
    info: Activity,
    warn: Clock,
    error: AlertCircle,
    debug: Zap,
  };

  const Icon = levelIcons[log.level as keyof typeof levelIcons] || Activity;
  const colorClass = levelColors[log.level as keyof typeof levelColors] || 'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
      <div className={cn('mt-0.5', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{log.message}</p>
        <div className="flex items-center gap-2 mt-1">
          {log.resourceName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {log.resourceKind}/{log.resourceName}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  const { modelAPIs, mcpServers, agents, pods, logs } = useKubernetesStore();

  const getStatusCounts = (resources: any[]) => {
    const running = resources.filter(r => r.status?.phase === 'Running').length;
    const pending = resources.filter(r => r.status?.phase === 'Pending').length;
    const error = resources.filter(r => r.status?.phase === 'Error').length;
    return { running, pending, error };
  };

  const modelAPIStats = getStatusCounts(modelAPIs);
  const mcpServerStats = getStatusCounts(mcpServers);
  const agentStats = getStatusCounts(agents);
  const podStats = getStatusCounts(pods);

  const totalResources = modelAPIs.length + mcpServers.length + agents.length;
  const healthyResources = modelAPIStats.running + mcpServerStats.running + agentStats.running;
  const healthPercentage = totalResources > 0 ? Math.round((healthyResources / totalResources) * 100) : 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your agentic system resources</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-3xl font-bold text-gradient-primary">{healthPercentage}%</p>
            <p className="text-xs text-muted-foreground">System Health</p>
          </div>
          <div className={cn(
            'h-14 w-14 rounded-full border-4 flex items-center justify-center',
            healthPercentage >= 80 ? 'border-success' : healthPercentage >= 50 ? 'border-warning' : 'border-destructive'
          )}>
            <TrendingUp className={cn(
              'h-6 w-6',
              healthPercentage >= 80 ? 'text-success' : healthPercentage >= 50 ? 'text-warning' : 'text-destructive'
            )} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Model APIs"
          count={modelAPIs.length}
          icon={Box}
          color="modelapi-color"
          {...modelAPIStats}
        />
        <StatCard
          title="MCP Servers"
          count={mcpServers.length}
          icon={Server}
          color="mcpserver-color"
          {...mcpServerStats}
        />
        <StatCard
          title="Agents"
          count={agents.length}
          icon={Bot}
          color="agent-color"
          {...agentStats}
        />
        <StatCard
          title="Pods"
          count={pods.length}
          icon={Boxes}
          color="pod-color"
          {...podStats}
        />
      </div>

      {/* Resource Relationships & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Resources */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Resource Summary</h2>
          <div className="space-y-3">
            {modelAPIs.slice(0, 3).map((api) => (
              <div key={api.metadata.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-modelapi/20 flex items-center justify-center">
                    <Box className="h-4 w-4 text-modelapi" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{api.metadata.name}</p>
                    <p className="text-xs text-muted-foreground">{api.spec.mode}</p>
                  </div>
                </div>
                <Badge variant={api.status?.phase === 'Running' ? 'success' : api.status?.phase === 'Error' ? 'error' : 'warning'}>
                  {api.status?.phase || 'Unknown'}
                </Badge>
              </div>
            ))}
            {agents.slice(0, 2).map((agent) => (
              <div key={agent.metadata.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-agent/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-agent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{agent.metadata.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.spec.mcpServers?.length || 0} MCP servers</p>
                  </div>
                </div>
                <Badge variant={agent.status?.phase === 'Running' ? 'success' : agent.status?.phase === 'Error' ? 'error' : 'warning'}>
                  {agent.status?.phase || 'Unknown'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Badge variant="secondary">{logs.length} events</Badge>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {logs.slice(0, 10).map((log, index) => (
              <ActivityItem key={index} log={log} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
