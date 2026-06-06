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

export type ExtendedAgentType =
  | AgentType
  | 'devops' | 'security' | 'testing' | 'uiux' | 'seo'
  | 'automation' | 'business' | 'recruitment' | 'aviation'
  | 'database' | 'documentation' | 'deployment';

export type AgentStatus = 'idle' | 'active' | 'error';

// ─── Agent DNA ───
export interface AgentDNA {
  agentId: string;
  knowledge: string[];
  skills: string[];
  tools: string[];
  successRate: number;
  failureRate: number;
  experience: number;
  learningHistory: Array<{ task: string; outcome: string; timestamp: number }>;
  preferredModels: string[];
  performanceHistory: Array<{ metric: string; value: number; timestamp: number }>;
}

// ─── Agent Memory ───
export interface AgentMemory {
  shortTerm: Array<{ key: string; value: string; timestamp: number }>;
  longTerm: Array<{ key: string; value: string; timestamp: number; importance: number }>;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType | ExtendedAgentType;
  status: AgentStatus;
  config: Record<string, unknown>;
  currentTask?: string;
  dna?: AgentDNA;
  memory?: AgentMemory;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  type: 'status' | 'result' | 'error' | 'log';
  content: string;
  timestamp: number;
}

// ─── Swarm Types ───
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'enterprise' | 'multi_swarm';

export type SwarmRoleType = 'leader' | 'coordinator' | 'worker' | 'reviewer' | 'verifier' | 'memory_agent' | 'knowledge_agent';

export type SwarmLevel = 'single_agent' | 'light' | 'standard' | 'enterprise' | 'multi_swarm';

export interface SwarmRole {
  agentId: string;
  role: SwarmRoleType;
}

export interface SwarmMemoryEntry {
  key: string;
  value: string;
  timestamp: number;
  writtenBy: string;
  importance: number;
}

export interface SwarmConfig {
  id: string;
  task: string;
  complexity: TaskComplexity;
  level: SwarmLevel;
  agentIds: string[];
  roles: SwarmRole[];
  status: SwarmStatus;
  memory: SwarmMemoryEntry[];
  createdAt: number;
  completedAt?: number;
  parentSwarmId?: string;
  childSwarmIds: string[];
  artifacts: string[];
}

export type SwarmStatus = 'forming' | 'active' | 'completed' | 'failed' | 'cancelled';

// ─── Swarm Map / Visualization Types ───
export interface SwarmMapNode {
  id: string;
  type: 'agent' | 'model' | 'memory' | 'artifact';
  label: string;
  status: string;
  role?: SwarmRoleType;
  agentType?: string;
  x?: number;
  y?: number;
}

export interface SwarmMapEdge {
  sourceId: string;
  targetId: string;
  type: 'task_assignment' | 'result_delivery' | 'memory_access' | 'coordination' | 'review';
  label?: string;
}

export interface SwarmMapData {
  nodes: SwarmMapNode[];
  edges: SwarmMapEdge[];
}

// ─── Self-Healing Types ───
export type HealingErrorCategory =
  | 'agent_failure' | 'model_failure' | 'memory_failure'
  | 'api_failure' | 'tool_failure' | 'ui_failure' | 'route_failure';

export type HealingStrategy =
  | 'retry' | 'repair' | 'reroute' | 'recover' | 'restart' | 'rollback';

export type HealingOutcome = 'success' | 'partial' | 'failure';

export interface HealingEvent {
  id: string;
  errorCategory: HealingErrorCategory;
  errorMessage: string;
  errorStack?: string;
  strategy: HealingStrategy;
  recoverySteps: string[];
  outcome: HealingOutcome;
  timestamp: number;
  detectedAt: number;
  resolvedAt?: number;
  timeToRecoveryMs?: number;
  componentId?: string;
  componentType?: string;
  metadata: Record<string, unknown>;
}

export interface HealthCheckResult {
  component: string;
  healthy: boolean;
  latencyMs: number;
  lastError?: string;
  lastChecked: number;
  details?: Record<string, unknown>;
}

export interface HealingPattern {
  errorSignature: string;
  category: HealingErrorCategory;
  bestStrategy: HealingStrategy;
  successRate: number;
  occurrenceCount: number;
  avgRecoveryMs: number;
  lastSeen: number;
}

// ─── Model Types ───
export type ModelProviderType =
  | 'openai' | 'claude' | 'gemini' | 'glm' | 'mistral' | 'qwen' | 'deepseek'
  | 'openrouter' | 'ollama' | 'lmstudio' | 'llamacpp' | 'vllm'
  | 'grok' | 'moonshot';

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

// ─── Circuit Breaker Types ───
export interface CircuitBreakerState {
  provider: ModelProviderType;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: number;
  tripThreshold: number;
  resetTimeoutMs: number;
}

// ─── Multi-Model Execution Types ───
export interface MultiModelResult {
  results: Array<{
    role: string;
    content: string;
    provider: ModelProviderType;
    model: string;
    tokensUsed: number;
    latencyMs: number;
    success: boolean;
    error?: string;
  }>;
  mergedResponse: string;
  totalTokensUsed: number;
  totalLatencyMs: number;
}

// ─── Provider Metrics Types ───
export interface ProviderMetrics {
  provider: ModelProviderType;
  totalRequests: number;
  totalFailures: number;
  successRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  estimatedCost: number;
  contextWindowUsage: number;
  healthScore: number;
  reliabilityScore: number;
  speedScore: number;
  costScore: number;
  compositeScore: number;
  circuitBreakerState: CircuitBreakerState;
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
export type ViewType = 'home' | 'chat' | 'agents' | 'swarm' | 'memory' | 'knowledge' | 'artifacts' | 'terminal' | 'observability' | 'settings' | 'brain' | 'kernel' | 'healing' | 'browser' | 'editor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  brainResults?: BrainOutput[];
  artifacts?: ArtifactData[];
}

// ─── Kernel Types ───
export type KernelStatus = 'initializing' | 'running' | 'shutting_down' | 'stopped';

export interface KernelState {
  status: KernelStatus;
  uptime: number;
  totalEvents: number;
  activeTasks: number;
  registryCounts: {
    agents: number;
    brains: number;
    models: number;
    tools: number;
    skills: number;
    artifacts: number;
  };
}

export interface ScheduledTask {
  id: string;
  name: string;
  priority: number;
  execute: () => Promise<unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface KernelEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  result: 'allowed' | 'denied';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type BrainOverlayType =
  | 'default' | 'claude' | 'hermes' | 'research' | 'coding'
  | 'architect' | 'analyst' | 'devops' | 'security' | 'business'
  | 'recruitment' | 'aviation' | 'custom';

// ─── Knowledge Types ───
export interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'txt' | 'markdown' | 'json' | 'image' | 'audio' | 'video' | 'url' | 'code';
  content: string;
  summary: string;
  chunks: KnowledgeChunk[];
  metadata: Record<string, unknown>;
  tags: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RAGResult {
  answer: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    chunk: string;
    score: number;
  }>;
  context: string;
  totalChunksSearched: number;
}
