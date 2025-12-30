import React from 'react';
import { Wifi, WifiOff, Server } from 'lucide-react';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ConnectionStatus() {
  const { connected, connecting, namespace, baseUrl, error } = useKubernetesConnection();

  // Truncate baseUrl for display
  const truncatedUrl = baseUrl ? (baseUrl.length > 30 ? baseUrl.slice(0, 30) + '...' : baseUrl) : 'Not connected';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs cursor-default transition-colors',
              connected 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-muted text-muted-foreground border border-border'
            )}
          >
            {connecting ? (
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            ) : connected ? (
              <div className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </div>
            ) : (
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            )}
            
            <span className="font-medium hidden md:inline">
              {connecting ? 'Connecting...' : connected ? namespace : 'Disconnected'}
            </span>
            
            {connected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="h-3 w-3" />
              <span className="font-medium">
                {connected ? 'Connected' : connecting ? 'Connecting' : 'Disconnected'}
              </span>
            </div>
            {connected && (
              <>
                <div className="text-muted-foreground text-xs">
                  <strong>Namespace:</strong> {namespace}
                </div>
                <div className="text-muted-foreground text-xs break-all">
                  <strong>URL:</strong> {baseUrl}
                </div>
              </>
            )}
            {error && (
              <div className="text-destructive text-xs">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}