import React from 'react';
import { Bell, Search, User, Moon, Sun, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useKubernetesStore } from '@/stores/kubernetesStore';

export function Header() {
  const { logs } = useKubernetesStore();
  const errorCount = logs.filter(l => l.level === 'error').length;
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources... (Ctrl+K)"
            className="pl-9 bg-muted/50 border-transparent focus:border-primary h-9"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="h-4 w-4" />
          {errorCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground">
              {errorCount}
            </span>
          )}
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">Admin</p>
            <p className="text-[10px] text-muted-foreground">agentic-system</p>
          </div>
        </div>
      </div>
    </header>
  );
}
