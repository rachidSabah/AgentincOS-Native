// ============================================================
// Agentic OS V2 — TypeScript Type Definitions
// ============================================================

// ─── Brain Types ───
export type BrainID = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BrainInput {
  message: string;
  conversationId?: string;
  workspaceId?: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: string; content: string }>;
}

export interface BrainOutput {
  brainId: BrainID;
  name: string;
  result: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface BrainResult {
  input: BrainInput;
  outputs: BrainOutput[];
  finalResponse: string;
  artifacts: ArtifactData[];
  totalDurationMs: number;
  status: 'completed' | 'partial' | 'failed';
}

// ─── Agent Types ───
export type AgentType = 'planner' | 'architect' | 'researcher' | 'coder' | 'reviewer' | 'verifier' | 'memory';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  config: Record<string, unknown>;
  currentTask?: string;
}

export type AgentStatus = 'idle' | 'active' | 'error';

export interface AgentMessage {
  id: string;
  agentId: string;
  type: 'status' | 'result' | 'error' | 'log';
  content: string;
  timestamp: number;
}

// ─── Swarm Types ───
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'enterprise';

export interface SwarmConfig {
  id: string;
  task: string;
  complexity: TaskComplexity;
  agentIds: string[];
  status: SwarmStatus;
}

export type SwarmStatus = 'forming' | 'active' | 'completed' | 'failed';

// ─── Model Types ───
export type ModelProviderType = 'openai' | 'claude' | 'gemini' | 'glm' | 'mistral' | 'qwen' | 'deepseek';

export interface ModelProviderConfig {
  id: string;
  name: string;
  provider: ModelProviderType;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
}

export interface ModelRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: ModelProviderType;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse {
  content: string;
  provider: ModelProviderType;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface ModelHealth {
  provider: ModelProviderType;
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  lastChecked: number;
}

export interface ProviderScore {
  provider: ModelProviderType;
  score: number;
  health: ModelHealth;
  priority: number;
}

// ─── Memory Types ───
export type MemoryType = 'session' | 'workspace' | 'agent' | 'artifact' | 'knowledge';

export interface MemoryNode {
  id: string;
  type: MemoryType;
  content: string;
  summary?: string;
  importance: number;
  metadata: Record<string, unknown>;
  workspaceId?: string;
  expiresAt?: Date;
  createdAt: Date;
  edges: MemoryEdgeData[];
}

export interface MemoryEdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdgeData[];
}

// ─── Artifact Types ───
export type ArtifactType = 'code' | 'markdown' | 'pdf' | 'docx' | 'pptx' | 'image' | 'json' | 'yaml' | 'repo';

export interface ArtifactData {
  id: string;
  name: string;
  type: ArtifactType;
  content: string;
  language?: string;
  workspaceId: string;
  conversationId?: string;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Terminal Types ───
export interface TerminalCommand {
  id: string;
  command: string;
  sessionId: string;
  timestamp: number;
}

export interface TerminalResult {
  id: string;
  commandId: string;
  output: string;
  exitCode: number;
  durationMs: number;
  timestamp: number;
}

// ─── Observability Types ───
export interface MetricEvent {
  id: string;
  type: string;
  value: number;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeAgents: number;
  totalAgents: number;
  activeModels: number;
  totalModels: number;
  avgLatencyMs: number;
  errorRate: number;
  memoryUsage: number;
  uptime: number;
}

export interface ProviderHealth {
  provider: ModelProviderType;
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
  lastError?: string;
  lastChecked: number;
}

// ─── Navigation Types ───
export type ViewType = 'home' | 'chat' | 'agents' | 'swarm' | 'memory' | 'knowledge' | 'artifacts' | 'terminal' | 'observability' | 'settings';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  brainResults?: BrainOutput[];
  artifacts?: ArtifactData[];
}
