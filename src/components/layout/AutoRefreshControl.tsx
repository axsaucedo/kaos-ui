import React from 'react';
import { RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { cn } from '@/lib/utils';

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '1s', value: 1000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
];

export function AutoRefreshControl() {
  const { autoRefreshEnabled, autoRefreshInterval, isRefreshing, setAutoRefreshEnabled, setAutoRefreshInterval } = useKubernetesStore();
  const { refreshAll, startPolling, stopPolling, lastRefresh, connected } = useKubernetesConnection();

  const currentInterval = REFRESH_INTERVALS.find(i => i.value === autoRefreshInterval) || REFRESH_INTERVALS[4]; // default 30s

  const handleIntervalChange = (interval: number) => {
    if (interval === 0) {
      setAutoRefreshEnabled(false);
      stopPolling();
    } else {
      setAutoRefreshEnabled(true);
      setAutoRefreshInterval(interval);
      // Restart polling with new interval
      stopPolling();
      setTimeout(() => startPolling(), 0);
    }
  };

  const handleManualRefresh = async () => {
    if (connected) {
      await refreshAll();
    }
  };

  // Format last refresh time
  const getLastRefreshText = () => {
    if (!lastRefresh) return 'Never';
    const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return lastRefresh.toLocaleTimeString();
  };

  // Update relative time display
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-1">
      {/* Manual Refresh Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        disabled={!connected || isRefreshing}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        title="Refresh now"
      >
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>

      {/* Last Refresh Time */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground px-2">
        <Clock className="h-3 w-3" />
        <span>{getLastRefreshText()}</span>
      </div>

      {/* Interval Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1 text-xs font-medium',
              autoRefreshEnabled && 'border-primary/50 text-primary'
            )}
            disabled={!connected}
          >
            {autoRefreshEnabled && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
            {autoRefreshEnabled ? currentInterval.label : 'Off'}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-28">
          {REFRESH_INTERVALS.map((interval) => (
            <DropdownMenuItem
              key={interval.value}
              onClick={() => handleIntervalChange(interval.value)}
              className={cn(
                'text-sm',
                (autoRefreshEnabled ? autoRefreshInterval : 0) === interval.value && 'bg-accent'
              )}
            >
              {interval.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
            Auto-refresh interval
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}