import React from 'react';
import { FileText, HardDrive, RefreshCw } from 'lucide-react';
import { useKubernetesStore } from '@/stores/kubernetesStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function VolumesList() {
  const { pvcs, setSelectedResource } = useKubernetesStore();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-volume/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-volume" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Persistent Volume Claims</h1>
            <p className="text-muted-foreground">Storage volumes attached to your workloads</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* PVCs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pvcs.map((pvc) => {
          const requestedStorage = pvc.spec.resources.requests.storage;
          const actualStorage = pvc.status?.capacity?.storage || requestedStorage;
          
          return (
            <div
              key={pvc.metadata.name}
              className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedResource(pvc)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-volume/20 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-volume" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{pvc.metadata.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{pvc.metadata.namespace}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    pvc.status?.phase === 'Bound' ? 'success' : 
                    pvc.status?.phase === 'Pending' ? 'warning' : 'error'
                  }
                >
                  {pvc.status?.phase}
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Storage */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-mono font-medium">{actualStorage}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1">Access Modes</p>
                    <div className="flex flex-wrap gap-1">
                      {pvc.spec.accessModes.map((mode) => (
                        <Badge key={mode} variant="outline" className="text-[10px]">
                          {mode}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Storage Class</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {pvc.spec.storageClassName || 'default'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pvcs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No persistent volume claims found</p>
        </div>
      )}
    </div>
  );
}
