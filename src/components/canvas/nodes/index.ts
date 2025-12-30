import { ModelAPINode } from './ModelAPINode';
import { MCPServerNode } from './MCPServerNode';
import { AgentNode } from './AgentNode';

export { ModelAPINode } from './ModelAPINode';
export { MCPServerNode } from './MCPServerNode';
export { AgentNode } from './AgentNode';

export const nodeTypes = {
  ModelAPI: ModelAPINode,
  MCPServer: MCPServerNode,
  Agent: AgentNode,
} as const;
