import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings, AlertCircle, ExternalLink, Boxes, Info, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKubernetesConnection } from '@/contexts/KubernetesConnectionContext';
import { k8sClient } from '@/lib/kubernetes-client';
import { YamlViewer } from '@/components/shared/YamlViewer';
import type { Pod, Deployment } from '@/types/kubernetes';

const KAOS_NAMESPACE_KEY = 'kaos-system-namespace';
const DEFAULT_KAOS_NAMESPACE = 'kaos-system';

export default function KAOSSystemPage() {
  const { connected, baseUrl } = useKubernetesConnection();
  
  const [kaosNamespace, setKaosNamespace] = useState(() => 
    localStorage.getItem(KAOS_NAMESPACE_KEY) || DEFAULT_KAOS_NAMESPACE
  );
  const [editingNamespace, setEditingNamespace] = useState(false);
  const [tempNamespace, setTempNamespace] = useState(kaosNamespace);
  
  const [operatorPods, setOperatorPods] = useState<Pod[]>([]);
  const [operatorDeployments, setOperatorDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);

  const fetchKAOSResources = useCallback(async () => {
    if (!connected || !baseUrl) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch pods from KAOS system namespace
      const podsResponse = await fetch(`${baseUrl}/api/v1/namespaces/${kaosNamespace}/pods`, {
        headers: {
          'bypass-tunnel-reminder': '1',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      if (!podsResponse.ok) {
        if (podsResponse.status === 404) {
          setError(`Namespace "${kaosNamespace}" not found`);
          setOperatorPods([]);
          return;
        }
        throw new Error(`Failed to fetch pods: ${podsResponse.statusText}`);
      }
      
      const podsData = await podsResponse.json();
      // Filter for KAOS controller/operator pods
      const kaosPods = (podsData.items || []).filter((pod: Pod) => 
        pod.metadata.name.includes('kaos') || 
        pod.metadata.labels?.['app.kubernetes.io/name']?.includes('kaos') ||
        pod.metadata.labels?.['app']?.includes('kaos')
      );
      setOperatorPods(kaosPods);
      
      if (kaosPods.length > 0 && !selectedPod) {
        setSelectedPod(kaosPods[0]);
      }
      
      // Fetch deployments
      const deploymentsResponse = await fetch(`${baseUrl}/apis/apps/v1/namespaces/${kaosNamespace}/deployments`, {
        headers: {
          'bypass-tunnel-reminder': '1',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json();
        const kaosDeployments = (deploymentsData.items || []).filter((d: Deployment) =>
          d.metadata.name.includes('kaos')
        );
        setOperatorDeployments(kaosDeployments);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch KAOS resources');
    } finally {
      setLoading(false);
    }
  }, [connected, baseUrl, kaosNamespace, selectedPod]);

  useEffect(() => {
    fetchKAOSResources();
  }, [fetchKAOSResources]);

  const handleSaveNamespace = () => {
    localStorage.setItem(KAOS_NAMESPACE_KEY, tempNamespace);
    setKaosNamespace(tempNamespace);
    setEditingNamespace(false);
    setSelectedPod(null);
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Connected</h2>
          <p className="text-muted-foreground">
            Please connect to a Kubernetes cluster first.
          </p>
        </div>
      </div>
    );
  }

  const showNotInstalled = !loading && (error || operatorPods.length === 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">KAOS System</h1>
            <p className="text-sm text-muted-foreground">
              Operator installation and configuration
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
                setTempNamespace(kaosNamespace);
              }}>Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingNamespace(true)}>
              <span className="text-xs text-muted-foreground mr-2">Namespace:</span>
              <code className="text-xs">{kaosNamespace}</code>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchKAOSResources} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {showNotInstalled ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>KAOS Not Found</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              No KAOS operator installation found in namespace <code className="bg-muted px-1 rounded">{kaosNamespace}</code>.
            </p>
            <p>
              Please install KAOS or configure the correct namespace using the button above.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://axsaucedo.github.io/kaos/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Installation Docs
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pods" className="flex items-center gap-1">
              <Boxes className="h-3 w-3" />
              Pods
            </TabsTrigger>
            <TabsTrigger value="yaml" className="flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              YAML
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Operator Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Operator Status</CardTitle>
                  <CardDescription>KAOS controller manager health</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {operatorDeployments.map((deployment) => (
                    <div key={deployment.metadata.name} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{deployment.metadata.name}</span>
                        <Badge variant={
                          deployment.status?.readyReplicas === deployment.status?.replicas ? 'success' : 'warning'
                        }>
                          {deployment.status?.readyReplicas || 0}/{deployment.status?.replicas || 0} Ready
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Replicas: {deployment.spec.replicas}
                      </p>
                    </div>
                  ))}
                  {operatorDeployments.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No deployments found</p>
                  )}
                </CardContent>
              </Card>

              {/* Pods Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Running Pods</CardTitle>
                  <CardDescription>KAOS system pods in {kaosNamespace}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {operatorPods.map((pod) => (
                    <div
                      key={pod.metadata.name}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPod?.metadata.name === pod.metadata.name
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                      onClick={() => setSelectedPod(pod)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{pod.metadata.name}</span>
                        <Badge variant={pod.status?.phase === 'Running' ? 'success' : 'warning'}>
                          {pod.status?.phase}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Environment Variables */}
              {selectedPod && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Environment Variables</CardTitle>
                    <CardDescription>Configuration for {selectedPod.metadata.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {selectedPod.spec.containers.map((container) => {
                          const envVars = container.env || [];
                          
                          return (
                            <div key={container.name} className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">{container.name}</p>
                              {envVars.length > 0 ? (
                                <div className="bg-muted/30 rounded-lg overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="text-left p-2 font-medium text-muted-foreground w-1/3">Name</th>
                                        <th className="text-left p-2 font-medium text-muted-foreground">Value / Source</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {envVars.map((env, idx) => (
                                        <tr key={idx} className="border-b border-border/50 last:border-0">
                                          <td className="p-2 font-mono font-medium">{env.name}</td>
                                          <td className="p-2 font-mono text-muted-foreground break-all">
                                            {env.value ? (
                                              <span className="text-foreground">
                                                {env.value.length > 80 ? env.value.substring(0, 80) + '...' : env.value}
                                              </span>
                                            ) : env.valueFrom?.secretKeyRef ? (
                                              <Badge variant="outline" className="text-xs">
                                                Secret: {env.valueFrom.secretKeyRef.name}/{env.valueFrom.secretKeyRef.key}
                                              </Badge>
                                            ) : (
                                              <span className="italic">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No environment variables</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Pods Tab */}
          <TabsContent value="pods" className="space-y-4">
            <div className="grid gap-4">
              {operatorPods.map((pod) => (
                <Card key={pod.metadata.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-mono">{pod.metadata.name}</CardTitle>
                      <Badge variant={pod.status?.phase === 'Running' ? 'success' : 'warning'}>
                        {pod.status?.phase}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Pod IP</span>
                      <p className="font-mono">{pod.status?.podIP || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Node</span>
                      <p className="font-mono">{pod.spec.nodeName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Containers</span>
                      <p>{pod.spec.containers.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Created</span>
                      <p>{pod.metadata.creationTimestamp ? new Date(pod.metadata.creationTimestamp).toLocaleString() : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* YAML Tab */}
          <TabsContent value="yaml" className="space-y-4">
            {selectedPod && (
              <YamlViewer 
                resource={selectedPod} 
                title={`${selectedPod.metadata.name} YAML`} 
              />
            )}
            {!selectedPod && (
              <p className="text-muted-foreground">Select a pod to view its YAML</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
