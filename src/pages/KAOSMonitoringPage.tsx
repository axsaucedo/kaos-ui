import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Activity, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import type { Service } from '@/types/kubernetes';

const MONITORING_NAMESPACE_KEY = 'kaos-monitoring-namespace';
const DEFAULT_MONITORING_NAMESPACE = 'monitoring';
const LOCAL_PORT = 8011;
const LOCALHOST_URL = `http://localhost:${LOCAL_PORT}`;

export default function KAOSMonitoringPage() {
  const { connected, baseUrl } = useKubernetesConnection();
  
  const [monitoringNamespace, setMonitoringNamespace] = useState(() => 
    localStorage.getItem(MONITORING_NAMESPACE_KEY) || DEFAULT_MONITORING_NAMESPACE
  );
  const [editingNamespace, setEditingNamespace] = useState(false);
  const [tempNamespace, setTempNamespace] = useState(monitoringNamespace);
  
  const [signozService, setSignozService] = useState<Service | null>(null);
  const [signozUrl, setSignozUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  const fetchMonitoringService = useCallback(async () => {
    if (!connected || !baseUrl) return;
    
    setLoading(true);
    setError(null);
    setIframeError(false);
    
    try {
      // Fetch services from monitoring namespace
      const response = await fetch(`${baseUrl}/api/v1/namespaces/${monitoringNamespace}/services`, {
        headers: {
          'bypass-tunnel-reminder': '1',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(`Namespace "${monitoringNamespace}" not found`);
          return;
        }
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
      
      const data = await response.json();
      const services = data.items || [];
      
      // Find SignOz service - prioritize exact match "signoz", then frontend/ui variants
      // Exclude clickhouse and other sub-services
      const signoz = services.find((svc: Service) => 
        svc.metadata.name === 'signoz'
      ) || services.find((svc: Service) => 
        svc.metadata.name === 'signoz-frontend' || svc.metadata.name === 'signoz-ui'
      ) || services.find((svc: Service) => 
        svc.metadata.name.startsWith('signoz') && 
        !svc.metadata.name.includes('clickhouse') &&
        !svc.metadata.name.includes('zookeeper') &&
        !svc.metadata.name.includes('otel') &&
        !svc.metadata.name.includes('alertmanager')
      );
      
      setSignozService(signoz || null);
      
      if (signoz) {
        // When service exists, default to localhost port-forward URL
        // The iframe will attempt to load it; if port-forward isn't running, show error state
        if (signoz.spec.type === 'LoadBalancer' && signoz.status?.loadBalancer?.ingress?.[0]) {
          const ingress = signoz.status.loadBalancer.ingress[0];
          const host = ingress.ip || ingress.hostname;
          const port = signoz.spec.ports?.[0]?.port || 8080;
          setSignozUrl(`http://${host}:${port}`);
        } else {
          // For ClusterIP/NodePort, assume user has port-forward running to localhost
          setSignozUrl(LOCALHOST_URL);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring services');
    } finally {
      setLoading(false);
    }
  }, [connected, baseUrl, monitoringNamespace]);

  useEffect(() => {
    fetchMonitoringService();
  }, [fetchMonitoringService]);

  const handleSaveNamespace = () => {
    localStorage.setItem(MONITORING_NAMESPACE_KEY, tempNamespace);
    setMonitoringNamespace(tempNamespace);
    setEditingNamespace(false);
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Connected</h2>
          <p className="text-muted-foreground">
            Please connect to a Kubernetes cluster first.
          </p>
        </div>
      </div>
    );
  }

  const showNotInstalled = !loading && (error || !signozService);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-chart-1/10 flex items-center justify-center">
            <Activity className="h-6 w-6 text-chart-1" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">KAOS Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              SignOz observability dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editingNamespace ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempNamespace}
                onChange={(e) => setTempNamespace(e.target.value)}
                className="w-40 h-8 text-sm"
                placeholder="Namespace"
              />
              <Button size="sm" onClick={handleSaveNamespace}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingNamespace(false);
                setTempNamespace(monitoringNamespace);
              }}>Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingNamespace(true)}>
              <span className="text-xs text-muted-foreground mr-2">Namespace:</span>
              <code className="text-xs">{monitoringNamespace}</code>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchMonitoringService} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {showNotInstalled ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>SignOz Not Found</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              No SignOz installation found in namespace <code className="bg-muted px-1 rounded">{monitoringNamespace}</code>.
            </p>
            <p>
              Please install SignOz for observability or configure the correct namespace using the button above.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://axsaucedo.github.io/kaos/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View KAOS Installation Docs
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : signozUrl ? (
        <div className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
          {iframeError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-muted/20">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Unable to Load SignOz</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                The SignOz dashboard could not be embedded. This may be due to security restrictions.
              </p>
              <Button asChild>
                <a href={signozUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          ) : (
            <iframe
              src={signozUrl}
              className="w-full h-full border-0"
              title="SignOz Dashboard"
              onError={() => setIframeError(true)}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              SignOz Service Found
            </CardTitle>
            <CardDescription>
              Service detected but not directly accessible from browser
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Service Name</span>
                <code className="text-sm">{signozService?.metadata.name}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <code className="text-sm">{signozService?.spec.type}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Port</span>
                <code className="text-sm">{signozService?.spec.ports?.[0]?.port}</code>
              </div>
              {signozService?.spec.clusterIP && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cluster IP</span>
                  <code className="text-sm">{signozService.spec.clusterIP}</code>
                </div>
              )}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Port Forward Required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>To access SignOz, run:</p>
                <code className="block bg-muted p-2 rounded text-xs">
                  kubectl port-forward svc/{signozService?.metadata.name} -n {monitoringNamespace} {LOCAL_PORT}:{signozService?.spec.ports?.[0]?.port}
                </code>
                <p className="text-xs">Then refresh this page. SignOz will be available at: <code>{LOCALHOST_URL}</code></p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
