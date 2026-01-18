/**
 * Demo Mode Data - TEMPORARY for documentation screenshots
 */

import type { ModelAPI, MCPServer, Agent, Pod, Deployment, Service, K8sSecret } from '@/types/kubernetes';

export const DEMO_NAMESPACE = 'kaos-hierarchy';

export const demoModelAPIs: ModelAPI[] = [{
  apiVersion: 'kaos.tools/v1alpha1',
  kind: 'ModelAPI',
  metadata: { name: 'openai-gpt4', namespace: DEMO_NAMESPACE, uid: 'demo-1', creationTimestamp: '2026-01-15T10:00:00Z' },
  spec: { mode: 'Proxy', proxyConfig: { model: 'gpt-4-turbo', apiBase: 'https://api.openai.com/v1' } },
  status: { ready: true, phase: 'Ready', message: 'ModelAPI is ready' },
}];

export const demoMCPServers: MCPServer[] = [
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'MCPServer', metadata: { name: 'filesystem-mcp', namespace: DEMO_NAMESPACE, uid: 'demo-mcp-1', creationTimestamp: '2026-01-15T10:05:00Z' },
    spec: { type: 'python-runtime', config: { tools: { fromPackage: 'mcp-server-filesystem' } } },
    status: { ready: true, phase: 'Ready', availableTools: ['read_file', 'write_file', 'list_directory'] } },
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'MCPServer', metadata: { name: 'kubernetes-mcp', namespace: DEMO_NAMESPACE, uid: 'demo-mcp-2', creationTimestamp: '2026-01-15T10:10:00Z' },
    spec: { type: 'python-runtime', config: { tools: { fromPackage: 'mcp-server-kubernetes' } } },
    status: { ready: true, phase: 'Ready', availableTools: ['get_pods', 'get_deployments', 'scale'] } },
];

export const demoAgents: Agent[] = [
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'Agent', metadata: { name: 'orchestrator-agent', namespace: DEMO_NAMESPACE, uid: 'demo-a-1', creationTimestamp: '2026-01-15T10:15:00Z', labels: { 'kaos.tools/role': 'orchestrator' } },
    spec: { modelAPI: 'openai-gpt4', mcpServers: ['filesystem-mcp', 'kubernetes-mcp'], config: { description: 'Main orchestrator agent' } }, status: { ready: true, phase: 'Ready' } },
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'Agent', metadata: { name: 'research-agent', namespace: DEMO_NAMESPACE, uid: 'demo-a-2', creationTimestamp: '2026-01-15T10:20:00Z', labels: { 'kaos.tools/role': 'researcher' } },
    spec: { modelAPI: 'openai-gpt4', mcpServers: ['filesystem-mcp'] }, status: { ready: true, phase: 'Ready' } },
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'Agent', metadata: { name: 'code-agent', namespace: DEMO_NAMESPACE, uid: 'demo-a-3', creationTimestamp: '2026-01-15T10:25:00Z', labels: { 'kaos.tools/role': 'developer' } },
    spec: { modelAPI: 'openai-gpt4', mcpServers: ['filesystem-mcp', 'kubernetes-mcp'] }, status: { ready: true, phase: 'Ready' } },
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'Agent', metadata: { name: 'reviewer-agent', namespace: DEMO_NAMESPACE, uid: 'demo-a-4', creationTimestamp: '2026-01-15T10:30:00Z', labels: { 'kaos.tools/role': 'reviewer' } },
    spec: { modelAPI: 'openai-gpt4', mcpServers: ['filesystem-mcp'] }, status: { ready: true, phase: 'Ready' } },
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'Agent', metadata: { name: 'testing-agent', namespace: DEMO_NAMESPACE, uid: 'demo-a-5', creationTimestamp: '2026-01-15T10:35:00Z', labels: { 'kaos.tools/role': 'tester' } },
    spec: { modelAPI: 'openai-gpt4', mcpServers: ['kubernetes-mcp'] }, status: { ready: true, phase: 'Ready' } },
  { apiVersion: 'kaos.tools/v1alpha1', kind: 'Agent', metadata: { name: 'deployment-agent', namespace: DEMO_NAMESPACE, uid: 'demo-a-6', creationTimestamp: '2026-01-15T10:40:00Z', labels: { 'kaos.tools/role': 'deployer' } },
    spec: { modelAPI: 'openai-gpt4', mcpServers: ['kubernetes-mcp'] }, status: { ready: true, phase: 'Ready' } },
];

export const demoPods: Pod[] = demoAgents.map((a, i) => ({
  apiVersion: 'v1', kind: 'Pod', metadata: { name: `${a.metadata.name}-abc${i}`, namespace: DEMO_NAMESPACE, uid: `pod-${i}`, creationTimestamp: '2026-01-18T12:00:00Z', labels: { 'app.kubernetes.io/name': a.metadata.name } },
  spec: { containers: [{ name: 'agent', image: 'ghcr.io/kaos-tools/agent-runtime:latest' }] },
  status: { phase: 'Running', podIP: `10.244.0.${10+i}`, containerStatuses: [{ name: 'agent', ready: true, restartCount: 0 }] },
}));

export const demoDeployments: Deployment[] = demoAgents.map((a, i) => ({
  apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: a.metadata.name, namespace: DEMO_NAMESPACE, uid: `deploy-${i}`, creationTimestamp: '2026-01-18T12:00:00Z' },
  spec: { replicas: 1, selector: { matchLabels: { 'app.kubernetes.io/name': a.metadata.name } } },
  status: { replicas: 1, readyReplicas: 1, availableReplicas: 1 },
}));

export const demoServices: Service[] = demoAgents.map((a, i) => ({
  apiVersion: 'v1', kind: 'Service', metadata: { name: a.metadata.name, namespace: DEMO_NAMESPACE, uid: `svc-${i}`, creationTimestamp: '2026-01-18T12:00:00Z' },
  spec: { type: 'ClusterIP', ports: [{ port: 8080, targetPort: 8080, protocol: 'TCP' }], selector: { 'app.kubernetes.io/name': a.metadata.name } },
}));

export const demoSecrets: K8sSecret[] = [
  { apiVersion: 'v1', kind: 'Secret', metadata: { name: 'openai-api-key', namespace: DEMO_NAMESPACE, uid: 'secret-1', creationTimestamp: '2026-01-15T09:00:00Z' }, type: 'Opaque', data: { OPENAI_API_KEY: 'c2stcHJvai0qKio=' } },
  { apiVersion: 'v1', kind: 'Secret', metadata: { name: 'github-token', namespace: DEMO_NAMESPACE, uid: 'secret-2', creationTimestamp: '2026-01-15T09:05:00Z' }, type: 'Opaque', data: { GITHUB_TOKEN: 'Z2hwXyoqKg==' } },
];
