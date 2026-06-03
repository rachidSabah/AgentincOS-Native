import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createDefaultAgentIntelligence, type AgentIntelligence, type BrainMode } from './intelligence-layer';
import { BUILTIN_SKILLS, type Skill } from './skill-system';
import { type Artifact } from './artifact-system';

// ═══════════════════════════════════════════════════════════
// AGENTIC OS — Provider-Independent AI Operating System
// Core Data Types & Store
// ═══════════════════════════════════════════════════════════

// ─── Agent Status ───
export type AgentStatus = 'live' | 'degraded' | 'offline' | 'booting' | 'error';

// ─── Provider Types ───
export interface ProviderConfig {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom' | 'cli';
  apiEndpoint: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  enabled: boolean;
  healthStatus: 'healthy' | 'degraded' | 'offline' | 'unknown';
  lastHealthCheck: number;
  rateLimit: { rpm: number; tpm: number };
  costConfig: { alertThreshold: number; hardStop: boolean; dailyLimit: number; monthlyLimit: number };
  priority: number; // 1 = highest
  icon: string;
  color: string;
  description: string;
  website: string;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  maxContextTokens: number;
}

// ─── Brain Layer Types ───
export type ReasoningStyle = 'chain-of-thought' | 'tree-of-thought' | 'react' | 'plan-and-execute' | 'reflection';
export type MemoryMethod = 'short-term' | 'long-term' | 'semantic' | 'episodic' | 'full';
export type CodingWorkflow = 'iterative' | 'plan-first' | 'test-driven' | 'debug-first';
export type ResearchMethod = 'depth-first' | 'breadth-first' | 'hybrid';

export interface BrainConfig {
  id: string;
  name: string;
  systemPrompt: string;
  reasoningStyle: ReasoningStyle;
  toolUsagePattern: 'aggressive' | 'conservative' | 'adaptive';
  memoryMethod: MemoryMethod;
  codingWorkflow: CodingWorkflow;
  researchMethod: ResearchMethod;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextStrategy: 'sliding' | 'summarize' | 'rag-augmented';
  agentDelegation: boolean;
  selfReflection: boolean;
  multiStepPlanning: boolean;
}

export interface BrainTask {
  id: string;
  type: 'planning' | 'reasoning' | 'tool-selection' | 'memory-retrieval' | 'agent-delegation' | 'workflow-generation' | 'knowledge-interaction' | 'context-management' | 'task-decomposition' | 'multi-agent-coordination';
  input: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  providerUsed?: string;
  modelUsed?: string;
  tokensUsed: number;
  latencyMs: number;
  createdAt: number;
  completedAt?: number;
}

// ─── Gemini CLI Types ───
export interface GeminiCLIConfig {
  installed: boolean;
  running: boolean;
  version: string;
  path: string;
  model: string;
  projectContext: string;
  sandboxEnabled: boolean;
  lastHealthCheck: number;
  autoDetect: boolean;
  autoStart: boolean;
  projects: GeminiProject[];
}

export interface GeminiProject {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
}

// ─── Agent Types ───
export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  providerId: string;
  model: string;
  brainConfigId: string;
  color: string;
  icon: string;
  tags: string[];
  uptime: string;
  latency: number;
  requests: number;
  lastActive: string;
  capabilities: string[];
  createdFrom: 'builtin' | 'marketplace' | 'custom';
  version: string;
  layer: number;
  layers: number[];
}

// ─── Stack Layer Types ───
export interface StackLayer {
  id: string;
  number: number;
  name: string;
  color: string;
  flowLabel: string;
  flowIcon: string;
  icon: string;
  role: string;
  agent: string;
  whatItDoes: string;
  keyCapabilities: string[];
  description: string;
}

// ─── Agent Analytics ───
export interface AgentAnalytics {
  totalSessions: number;
  totalTokens: number;
  totalToolCalls: number;
  avgResponseTime: number;
  activityByHour: number[];
  peakHour: number;
}

// ─── Hermes Connection ───
export interface HermesConnection {
  running: boolean;
  apiEndpoint: string;
  model: string;
  version: string;
  latency: number;
}

// ─── Gemini Connection ───
export interface GeminiConnection {
  installed: boolean;
  running: boolean;
  version: string;
  model: string;
}

// ─── Goal Types ───
export interface GoalSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'active' | 'completed' | 'paused' | 'archived';
  category: string;
  createdAt: number;
  updatedAt: number;
  deadline?: number;
  subtasks: GoalSubtask[];
  color?: string;
  timeline?: string;
}

// ─── Journal Types ───
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: 'inspired' | 'focused' | 'reflective' | 'energized' | 'calm';
  tags: string[];
  createdAt: number;
  agent: string;
  type: 'milestone' | 'insight' | 'decision' | 'reflection' | 'voice' | 'text';
  // Legacy fields (for BrainPanel compatibility)
  date?: string;
  source?: string;
}

// ─── Skill Execution ───
export interface SkillExecution {
  id: string;
  skill: string;
  status: 'running' | 'completed' | 'failed';
  result?: string;
  startedAt: number;
  completedAt?: number;
}

// ─── Hermes Skill ───
export interface HermesSkill {
  id: string;
  name: string;
  description: string;
  category: string;
}

// ─── Chat Attachment ───
export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  processed: boolean;
  dataUrl?: string;
}

// ─── Swarm Types ───
export interface SwarmVote {
  agentId: string;
  vote: 'approve' | 'reject' | 'abstain';
  reasoning: string;
  timestamp: number;
}

export interface SwarmProposal {
  id: string;
  agentId: string;
  content: string;
  confidence: number;
  votes: SwarmVote[];
  timestamp: number;
}

export interface SwarmSession {
  id: string;
  task: string;
  agents: string[];
  strategy: string;
  maxRounds: number;
  currentRound: number;
  proposals: SwarmProposal[];
  status: 'forming' | 'proposing' | 'voting' | 'executing' | 'completed' | 'dissolved';
  winningProposal: SwarmProposal | null;
  consensusPercentage: number;
  createdAt: number;
}

// ─── Log Entry ───
export interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  layer: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

// ─── Kanban Task ───
export interface KanbanTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  status: 'todo' | 'in-progress' | 'done';
  createdAt: number;
}

// ─── Workspace Types ───
export interface Workspace {
  id: string;
  name: string;
  description: string;
  type: 'project' | 'organization' | 'team' | 'department';
  agents: string[];
  models: string[];
  files: WorkspaceFile[];
  memory: string[];
  permissions: string[];
  knowledge: string[];
  automations: string[];
  templates: string[];
  prompts: string[];
  settings: {[key: string]: string};
  createdAt: number;
  updatedAt: number;
  color: string;
  icon: string;
  archived: boolean;
  snapshotCount: number;
  lastSnapshotAt?: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  processed: boolean;
  summary?: string;
  tags: string[];
  workspaceId: string;
  embeddingGenerated: boolean;
  ragIndexed: boolean;
}

export interface WorkspaceSnapshot {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: number;
  data: string; // serialized workspace state
}

// ─── Attachment Types ───
export interface Attachment {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  processed: boolean;
  summary?: string;
  tags: string[];
  workspaceId?: string;
  agentId?: string;
  embeddingGenerated: boolean;
  ragIndexed: boolean;
  previewUrl?: string;
  extractedText?: string;
  metadata: {[key: string]: string};
}

// ─── Knowledge Types ───
export interface KnowledgeEntry {
  id: string;
  content: string;
  type: 'fact' | 'concept' | 'procedure' | 'preference' | 'decision' | 'observation';
  source: string;
  tags: string[];
  confidence: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  lastAccessedAt: number;
  connections: string[]; // IDs of connected entries
  embeddingGenerated: boolean;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'entity' | 'concept' | 'event' | 'person' | 'tool' | 'document';
  color: string;
  size: number;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
}

// ─── Memory Types ───
export interface MemoryEntry {
  id: string;
  timestamp: string;
  content: string;
  agent: string;
  tags: string[];
  type: 'short-term' | 'long-term' | 'episodic' | 'semantic' | 'procedural';
  importance: number;
  decayRate: number;
  accessCount: number;
  lastAccessedAt: number;
  workspaceId?: string;
}

// ─── Workflow Types ───
export interface WorkflowNode {
  id: string;
  type: 'agent-call' | 'condition' | 'loop' | 'transform' | 'webhook' | 'delay' | 'human-approval' | 'output' | 'brain-reason' | 'tool-call' | 'memory-store' | 'memory-retrieve';
  position: { x: number; y: number };
  data: {[key: string]: unknown};
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused';
  lastRun?: number;
  createdAt: number;
  workspaceId?: string;
  triggerType: 'manual' | 'webhook' | 'schedule' | 'event';
  triggerConfig: {[key: string]: string};
}

// ─── Chat Types ───
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system' | 'brain';
  content: string;
  timestamp: number;
  agentId?: string;
  providerId?: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  attachments?: string[]; // attachment IDs
}

// ─── Cost & Observability Types ───
export interface CostTransaction {
  id: string;
  agentId: string;
  providerId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  taskName?: string;
  timestamp: number;
}

export interface BudgetConfig {
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number;
  hardStop: boolean;
}

export interface ExecutionLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
  providerId?: string;
  model?: string;
  agentId?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

// ─── Model Router Config ───
export interface ModelRouterConfig {
  mode: 'automatic' | 'fastest' | 'cheapest' | 'highest-quality' | 'reasoning-first' | 'coding-first' | 'research-first' | 'vision-first' | 'multi-agent-consensus';
  failoverEnabled: boolean;
  failoverOrder: string[]; // provider IDs in priority order
  parallelRouting: boolean;
  costOptimization: boolean;
}

// ─── Plugin Types ───
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'active' | 'inactive' | 'error';
  permissions: string[];
  config: {[key: string]: unknown};
  installedAt: number;
}

// ─── Prompt Types ───
export interface PromptEntry {
  id: string;
  name: string;
  category: 'system' | 'task' | 'skill' | 'workflow' | 'custom' | 'brain';
  content: string;
  variables: string[];
  version: number;
  performanceScore: number;
  usageCount: number;
  lastModified: number;
}

// ─── MCP Server Types ───
export interface MCPServer {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  url?: string;
  connected: boolean;
  toolCount?: number;
}

// ─── Marketplace Types ───
// ─── Brain Profile Type ───
export type BrainProfile = 'claude' | 'gemini' | 'hermes' | 'openclaw' | 'vault' | 'opencode' | 'custom';

export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'coding' | 'research' | 'marketing' | 'education' | 'custom' | 'recruitment' | 'wordpress' | 'seo' | 'aviation' | 'legal' | 'medical' | 'devops' | 'data' | 'writing' | 'productivity';
  author: string;
  version: string;
  rating: number;
  downloads: number;
  price: number;
  installed: boolean;
  brainProfile: BrainProfile;
  requiredProviders: string[];
  icon: string;
  color: string;
  tags: string[];
}

// ─── Security Types ───
export interface SecurityAlert {
  id: string;
  type: 'injection' | 'pii' | 'access' | 'rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: number;
  action: 'blocked' | 'warned' | 'logged';
}

// ─── Deployment Types ───
export interface Deployment {
  id: string;
  name: string;
  type: 'local' | 'docker' | 'cloud' | 'edge';
  status: 'running' | 'stopped' | 'deploying' | 'error';
  url?: string;
  createdAt: number;
  lastDeployedAt: number;
  config: {[key: string]: string};
}

// ─── System Metrics ───
export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
  activeAgents: number;
  activeProviders: number;
  totalRequests: number;
  avgLatency: number;
  totalTokensUsed: number;
  totalCost: number;
  uptimeSeconds: number;
  knowledgeEntries: number;
  memoryEntries: number;
  workspaceCount: number;
}

// ═══════════════════════════════════════════════════════════
// DEFAULT PROVIDERS
// ═══════════════════════════════════════════════════════════

const defaultProviders: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini', 'gpt-4-turbo', 'o3', 'o3-mini', 'o4-mini'],
    defaultModel: 'gpt-4o',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 50, hardStop: false, dailyLimit: 50, monthlyLimit: 500 },
    priority: 1,
    icon: '🤖',
    color: '#10a37f',
    description: 'Leading AI provider with GPT-4o, o1, o3 models',
    website: 'https://openai.com',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 128000,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    apiEndpoint: 'https://api.anthropic.com/v1',
    apiKey: '',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3.5-haiku-20241022', 'claude-3.5-sonnet-20241022'],
    defaultModel: 'claude-sonnet-4-20250514',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 50, hardStop: false, dailyLimit: 50, monthlyLimit: 500 },
    priority: 2,
    icon: '🧠',
    color: '#d4a574',
    description: 'Claude models with strong reasoning and safety',
    website: 'https://anthropic.com',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 200000,
  },
  {
    id: 'google',
    name: 'Google AI',
    type: 'cloud',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    defaultModel: 'gemini-2.5-pro',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 50, hardStop: false, dailyLimit: 50, monthlyLimit: 500 },
    priority: 3,
    icon: '✨',
    color: '#4285f4',
    description: 'Gemini models with multimodal capabilities',
    website: 'https://ai.google.dev',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 1000000,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'cloud',
    apiEndpoint: 'https://openrouter.ai/api/v1',
    apiKey: '',
    models: ['openai/gpt-4o', 'anthropic/claude-sonnet-4', 'google/gemini-2.5-pro', 'meta-llama/llama-3-70b', 'mistral/mistral-large', 'deepseek/deepseek-chat', 'qwen/qwen-2.5-72b'],
    defaultModel: 'openai/gpt-4o',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 50, hardStop: false, dailyLimit: 50, monthlyLimit: 500 },
    priority: 4,
    icon: '🔀',
    color: '#6366f1',
    description: 'Unified API for 100+ models from all providers',
    website: 'https://openrouter.ai',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 200000,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'cloud',
    apiEndpoint: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
    defaultModel: 'deepseek-chat',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 25, hardStop: false, dailyLimit: 25, monthlyLimit: 250 },
    priority: 5,
    icon: '🔮',
    color: '#7c3aed',
    description: 'Cost-effective models with strong coding and reasoning',
    website: 'https://deepseek.com',
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxContextTokens: 128000,
  },
  {
    id: 'glm',
    name: 'GLM / BigModel',
    type: 'cloud',
    apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    models: ['glm-4-plus', 'glm-4-0520', 'glm-4-air', 'glm-4-airx', 'glm-4-flash', 'glm-4-long'],
    defaultModel: 'glm-4-plus',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 25, hardStop: false, dailyLimit: 25, monthlyLimit: 250 },
    priority: 6,
    icon: '🌟',
    color: '#0ea5e9',
    description: 'Zhipu AI GLM models with Chinese & English support',
    website: 'https://open.bigmodel.cn',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 128000,
  },
  {
    id: 'qwen',
    name: 'Qwen / Alibaba',
    type: 'cloud',
    apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long', 'qwen-vl-max', 'qwen-coder-plus'],
    defaultModel: 'qwen-max',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 25, hardStop: false, dailyLimit: 25, monthlyLimit: 250 },
    priority: 7,
    icon: '🔷',
    color: '#f97316',
    description: 'Alibaba Qwen models with strong multilingual support',
    website: 'https://dashscope.aliyun.com',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 128000,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'cloud',
    apiEndpoint: 'https://api.mistral.ai/v1',
    apiKey: '',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'pixtral-large-latest'],
    defaultModel: 'mistral-large-latest',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 25, hardStop: false, dailyLimit: 25, monthlyLimit: 250 },
    priority: 8,
    icon: '🌬️',
    color: '#f97316',
    description: 'Mistral models for reasoning and code generation',
    website: 'https://mistral.ai',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 128000,
  },
  {
    id: 'grok',
    name: 'Grok / xAI',
    type: 'cloud',
    apiEndpoint: 'https://api.x.ai/v1',
    apiKey: '',
    models: ['grok-3', 'grok-3-mini', 'grok-2', 'grok-2-mini'],
    defaultModel: 'grok-3',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 60, tpm: 100000 },
    costConfig: { alertThreshold: 25, hardStop: false, dailyLimit: 25, monthlyLimit: 250 },
    priority: 9,
    icon: '⚡',
    color: '#ef4444',
    description: 'xAI Grok models with real-time knowledge',
    website: 'https://x.ai',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 131072,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'local',
    apiEndpoint: 'http://localhost:11434/v1',
    apiKey: '',
    models: ['llama3.1:70b', 'llama3.1:8b', 'codellama', 'mistral:7b', 'qwen2:72b', 'deepseek-coder-v2'],
    defaultModel: 'llama3.1:70b',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 999, tpm: 999999 },
    costConfig: { alertThreshold: 0, hardStop: false, dailyLimit: 0, monthlyLimit: 0 },
    priority: 10,
    icon: '🦙',
    color: '#22c55e',
    description: 'Run models locally with Ollama - no API costs',
    website: 'https://ollama.ai',
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    maxContextTokens: 128000,
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    type: 'cli',
    apiEndpoint: 'http://localhost:3100/api/gemini',
    apiKey: '',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-2.5-pro',
    enabled: false,
    healthStatus: 'unknown',
    lastHealthCheck: 0,
    rateLimit: { rpm: 30, tpm: 100000 },
    costConfig: { alertThreshold: 0, hardStop: false, dailyLimit: 0, monthlyLimit: 0 },
    priority: 0, // Highest priority when available
    icon: '💎',
    color: '#4285f4',
    description: 'Google Gemini CLI - local execution agent with multimodal capabilities',
    website: 'https://github.com/google-gemini/gemini-cli',
    supportsStreaming: true,
    supportsVision: true,
    supportsTools: true,
    maxContextTokens: 1000000,
  },
];

// ─── Default Brain Config ───
const defaultBrainConfig: BrainConfig = {
  id: 'default-brain',
  name: 'Agentic OS Brain',
  systemPrompt: 'You are the Agentic OS Brain - a provider-independent intelligence layer. You plan, reason, delegate, and coordinate regardless of which LLM provider is selected. You are the primary intelligence; external models are interchangeable execution engines.',
  reasoningStyle: 'chain-of-thought',
  toolUsagePattern: 'adaptive',
  memoryMethod: 'full',
  codingWorkflow: 'plan-first',
  researchMethod: 'hybrid',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  contextStrategy: 'rag-augmented',
  agentDelegation: true,
  selfReflection: true,
  multiStepPlanning: true,
};

// ═══════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════

interface OSState {
  // ─── Navigation ───
  activeView: string;
  setActiveView: (view: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // ─── Providers ───
  providers: ProviderConfig[];
  addProvider: (provider: ProviderConfig) => void;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  activeProviderId: string | null;
  setActiveProviderId: (id: string | null) => void;

  // ─── Brain Layer ───
  brainConfig: BrainConfig;
  updateBrainConfig: (updates: Partial<BrainConfig>) => void;
  brainTasks: BrainTask[];
  addBrainTask: (task: BrainTask) => void;
  updateBrainTask: (id: string, updates: Partial<BrainTask>) => void;
  brainTaskHistory: BrainTask[];

  // ─── Gemini CLI ───
  geminiCLI: GeminiCLIConfig;
  updateGeminiCLI: (updates: Partial<GeminiCLIConfig>) => void;

  // ─── Agents ───
  agents: Agent[];
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;

  // ─── Workspaces ───
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspaceId: (id: string | null) => void;

  // ─── Attachments ───
  attachments: Attachment[];
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  updateAttachment: (id: string, updates: Partial<Attachment>) => void;

  // ─── Knowledge ───
  knowledgeEntries: KnowledgeEntry[];
  addKnowledgeEntry: (entry: KnowledgeEntry) => void;
  updateKnowledgeEntry: (id: string, updates: Partial<KnowledgeEntry>) => void;
  removeKnowledgeEntry: (id: string) => void;
  knowledgeGraph: KnowledgeGraph;

  // ─── Memory ───
  memories: MemoryEntry[];
  addMemory: (memory: MemoryEntry) => void;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => void;
  removeMemory: (id: string) => void;

  // ─── Chat ───
  chatHistories: {[key: string]: ChatMessage[]};
  addChatMessage: (contextId: string, msg: ChatMessage) => void;
  clearChatHistory: (contextId: string) => void;
  isChatStreaming: boolean;
  setIsChatStreaming: (streaming: boolean) => void;

  // ─── Workflows ───
  workflows: Workflow[];
  addWorkflow: (wf: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;

  // ─── Cost & Observability ───
  costTransactions: CostTransaction[];
  addCostTransaction: (tx: CostTransaction) => void;
  budgetConfig: BudgetConfig;
  setBudgetConfig: (config: Partial<BudgetConfig>) => void;
  totalCost: number;
  executionLogs: ExecutionLog[];
  addExecutionLog: (log: ExecutionLog) => void;
  totalTokensUsed: number;
  incrementTokens: (count: number) => void;

  // ─── Model Router ───
  modelRouterConfig: ModelRouterConfig;
  setModelRouterConfig: (config: Partial<ModelRouterConfig>) => void;

  // ─── Plugins ───
  plugins: Plugin[];
  setPlugins: (plugins: Plugin[]) => void;
  updatePlugin: (id: string, updates: Partial<Plugin>) => void;

  // ─── Prompts ───
  prompts: PromptEntry[];
  setPrompts: (prompts: PromptEntry[]) => void;
  addPrompt: (prompt: PromptEntry) => void;

  // ─── MCP Servers ───
  mcpServers: MCPServer[];
  setMCPServers: (servers: MCPServer[]) => void;

  // ─── Marketplace ───
  marketplaceAgents: MarketplaceAgent[];
  setMarketplaceAgents: (agents: MarketplaceAgent[]) => void;

  // ─── Security ───
  securityAlerts: SecurityAlert[];
  addSecurityAlert: (alert: SecurityAlert) => void;

  // ─── Deployments ───
  deployments: Deployment[];
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (id: string, updates: Partial<Deployment>) => void;

  // ─── System Metrics ───
  systemMetrics: SystemMetrics;
  setSystemMetrics: (metrics: SystemMetrics) => void;

  // ─── UI State ───
  controlRoomAgent: string | null;
  setControlRoomAgent: (id: string | null) => void;
  selfSearchQuery: string;
  setSelfSearchQuery: (q: string) => void;

  // ─── Stack Layers ───
  stackLayers: StackLayer[];

  // ─── Agent Selection ───
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;

  // ─── Connections ───
  hermesConnection: HermesConnection;
  geminiConnection: GeminiConnection;
  sseConnectionStatus: string;

  // ─── Agent Analytics ───
  agentAnalytics: {[key: string]: AgentAnalytics};

  // ─── Goals & Journal ───
  goals: Goal[];
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  toggleGoalSubtask: (goalId: string, subtaskId: string) => void;
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  removeJournalEntry: (id: string) => void;

  // ─── Hermes ───
  hermesSkills: HermesSkill[];
  skillExecutions: SkillExecution[];
  addSkillExecution: (exec: SkillExecution) => void;

  // ─── Chat Attachments ───
  chatAttachments: ChatAttachment[];
  addChatAttachment: (att: ChatAttachment) => void;
  removeChatAttachment: (id: string) => void;
  clearChatAttachments: () => void;

  // ─── Swarm Intelligence ───
  activeSwarms: SwarmSession[];
  swarmHistory: SwarmSession[];
  addSwarm: (swarm: SwarmSession) => void;
  updateSwarm: (id: string, updates: Partial<SwarmSession>) => void;

  // ─── Logs ───
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;

  // ─── Kanban ───
  kanbanTasks: KanbanTask[];
  addKanbanTask: (task: KanbanTask) => void;

  // ─── Hydration Guard ───
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // ─── Intelligence Layer ───
  agentIntelligence: {[key: string]: AgentIntelligence};
  updateAgentIntelligence: (agentId: string, updates: Partial<AgentIntelligence>) => void;

  // ─── Brain Modes ───
  activeBrainMode: string;
  setActiveBrainMode: (mode: string) => void;

  // ─── Skills ───
  skills: Skill[];
  activeSkillIds: string[];
  toggleSkill: (skillId: string) => void;

  // ─── Artifacts ───
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;

  // ─── Swarm Intelligence ───
  swarmScore: number;
  swarmTier: string;
  lastSwarmTrigger: string;
  setSwarmScore: (score: number) => void;
  setSwarmTier: (tier: string) => void;
}

// ═══════════════════════════════════════════════════════════
// ZUSTAND STORE WITH PERSIST
// ═══════════════════════════════════════════════════════════

export const useOSStore = create<OSState>()(
  persist(
    (set) => ({
      // ─── Navigation ───
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      activeView: 'home',
      setActiveView: (view) => set({ activeView: view }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // ─── Providers ───
      providers: defaultProviders,
      addProvider: (provider) => set((s) => ({ providers: [...s.providers, provider] })),
      updateProvider: (id, updates) => set((s) => ({
        providers: s.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),
      removeProvider: (id) => set((s) => ({
        providers: s.providers.filter((p) => p.id !== id),
      })),
      activeProviderId: null,
      setActiveProviderId: (id) => set({ activeProviderId: id }),

      // ─── Brain Layer ───
      brainConfig: defaultBrainConfig,
      updateBrainConfig: (updates) => set((s) => ({
        brainConfig: { ...s.brainConfig, ...updates },
      })),
      brainTasks: [],
      addBrainTask: (task) => set((s) => ({
        brainTasks: [task, ...s.brainTasks].slice(0, 50),
      })),
      updateBrainTask: (id, updates) => set((s) => ({
        brainTasks: s.brainTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),
      brainTaskHistory: [],

      // ─── Gemini CLI ───
      geminiCLI: {
        installed: false,
        running: false,
        version: '',
        path: '',
        model: 'gemini-2.5-pro',
        projectContext: '',
        sandboxEnabled: true,
        lastHealthCheck: 0,
        autoDetect: true,
        autoStart: true,
        projects: [],
      },
      updateGeminiCLI: (updates) => set((s) => ({
        geminiCLI: { ...s.geminiCLI, ...updates },
      })),

      // ─── Agents ───
      agents: [
        {
          id: 'brain',
          name: 'Agentic OS Brain',
          description: 'The native intelligence layer. Plans, reasons, delegates, and coordinates all operations. Provider-independent.',
          status: 'live' as AgentStatus,
          providerId: '',
          model: '',
          brainConfigId: 'default-brain',
          color: '#9d4edd',
          icon: '🧠',
          tags: ['BRAIN', 'ORCHESTRATOR', 'PLANNING', 'REASONING'],
          uptime: '0s',
          latency: 0,
          requests: 0,
          lastActive: 'now',
          capabilities: ['planning', 'reasoning', 'delegation', 'coordination', 'memory-retrieval', 'tool-selection'],
          createdFrom: 'builtin' as const,
          version: '1.0.0',
          layer: 1,
          layers: [1, 2, 3, 4, 5, 6, 7],
        },
        {
          id: 'code-agent',
          name: 'Code Agent',
          description: 'Specialized for code generation, debugging, and software development tasks.',
          status: 'offline' as AgentStatus,
          providerId: '',
          model: '',
          brainConfigId: 'default-brain',
          color: '#00ff88',
          icon: '💻',
          tags: ['CODE', 'DEBUG', 'REVIEW'],
          uptime: '0s',
          latency: 0,
          requests: 0,
          lastActive: 'never',
          capabilities: ['code-generation', 'debugging', 'code-review', 'refactoring'],
          createdFrom: 'builtin' as const,
          version: '1.0.0',
          layer: 3,
          layers: [3, 5],
        },
        {
          id: 'research-agent',
          name: 'Research Agent',
          description: 'Deep research and knowledge acquisition agent. Synthesizes information from multiple sources.',
          status: 'offline' as AgentStatus,
          providerId: '',
          model: '',
          brainConfigId: 'default-brain',
          color: '#FFB627',
          icon: '🔍',
          tags: ['RESEARCH', 'KNOWLEDGE', 'SYNTHESIS'],
          uptime: '0s',
          latency: 0,
          requests: 0,
          lastActive: 'never',
          capabilities: ['web-research', 'document-analysis', 'fact-checking', 'synthesis'],
          createdFrom: 'builtin' as const,
          version: '1.0.0',
          layer: 4,
          layers: [4, 6],
        },
        {
          id: 'task-agent',
          name: 'Task Agent',
          description: 'General-purpose task execution agent. Handles API calls, workflows, and automation.',
          status: 'offline' as AgentStatus,
          providerId: '',
          model: '',
          brainConfigId: 'default-brain',
          color: '#E8751A',
          icon: '⚡',
          tags: ['EXECUTION', 'WORKFLOW', 'AUTOMATION'],
          uptime: '0s',
          latency: 0,
          requests: 0,
          lastActive: 'never',
          capabilities: ['task-execution', 'api-calls', 'workflow-automation', 'monitoring'],
          createdFrom: 'builtin' as const,
          version: '1.0.0',
          layer: 5,
          layers: [5, 7],
        },
      ],
      addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
      updateAgent: (id, updates) => set((s) => ({
        agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      })),
      removeAgent: (id) => set((s) => ({
        agents: s.agents.filter((a) => a.id !== id),
      })),

      // ─── Workspaces ───
      workspaces: [],
      activeWorkspaceId: null,
      addWorkspace: (workspace) => set((s) => ({ workspaces: [...s.workspaces, workspace] })),
      updateWorkspace: (id, updates) => set((s) => ({
        workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w)),
      })),
      removeWorkspace: (id) => set((s) => ({
        workspaces: s.workspaces.filter((w) => w.id !== id),
      })),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

      // ─── Attachments ───
      attachments: [],
      addAttachment: (attachment) => set((s) => ({ attachments: [...s.attachments, attachment] })),
      removeAttachment: (id) => set((s) => ({
        attachments: s.attachments.filter((a) => a.id !== id),
      })),
      updateAttachment: (id, updates) => set((s) => ({
        attachments: s.attachments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      })),

      // ─── Knowledge ───
      knowledgeEntries: [],
      addKnowledgeEntry: (entry) => set((s) => ({ knowledgeEntries: [...s.knowledgeEntries, entry] })),
      updateKnowledgeEntry: (id, updates) => set((s) => ({
        knowledgeEntries: s.knowledgeEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),
      removeKnowledgeEntry: (id) => set((s) => ({
        knowledgeEntries: s.knowledgeEntries.filter((e) => e.id !== id),
      })),
      knowledgeGraph: { nodes: [], edges: [] },

      // ─── Memory ───
      memories: [
        { id: 'mem-1', timestamp: new Date(Date.now() - 432000000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), content: 'Gemini CLI v0.44.1 installed at C:/Users/piopi/AppData/Roaming/npm/gemini.cmd. Supports models: gemini-3-pro-preview, gemini-3.1-flash-lite, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite. Use -p for prompts and -o json for JSON output.', agent: 'gemini', tags: ['cli', 'setup', 'gemini'], type: 'long-term', importance: 0.9, decayRate: 0.01, accessCount: 5 },
        { id: 'mem-2', timestamp: new Date(Date.now() - 172800000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), content: 'The 7-layer architecture: L1 Intelligence, L2 Providers, L3 Agents, L4 Knowledge, L5 Execution, L6 Memory, L7 Governance. Each layer can be independently configured with different AI providers.', agent: 'openclaw', tags: ['architecture', 'layers', 'configuration'], type: 'semantic', importance: 0.85, decayRate: 0.02, accessCount: 3 },
        { id: 'mem-3', timestamp: new Date(Date.now() - 86400000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), content: 'Agent Builder has 20 prebuilt templates including DevOps Engineer, Finance Analyst, Legal Researcher, Medical Assistant, UX Designer, and more. All agents can connect to the active AI provider model.', agent: 'brain', tags: ['agents', 'builder', 'templates'], type: 'episodic', importance: 0.8, decayRate: 0.03, accessCount: 2 },
      ] as MemoryEntry[],
      addMemory: (memory) => set((s) => ({ memories: [memory, ...s.memories] })),
      updateMemory: (id, updates) => set((s) => ({
        memories: s.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      })),
      removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

      // ─── Chat ───
      chatHistories: {},
      addChatMessage: (contextId, msg) => set((s) => ({
        chatHistories: {
          ...s.chatHistories,
          [contextId]: [...(s.chatHistories[contextId] || []), msg],
        },
      })),
      clearChatHistory: (contextId) => set((s) => ({
        chatHistories: { ...s.chatHistories, [contextId]: [] },
      })),
      isChatStreaming: false,
      setIsChatStreaming: (streaming) => set({ isChatStreaming: streaming }),

      // ─── Workflows ───
      workflows: [],
      addWorkflow: (wf) => set((s) => ({ workflows: [...s.workflows, wf] })),
      updateWorkflow: (id, updates) => set((s) => ({
        workflows: s.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      })),
      removeWorkflow: (id) => set((s) => ({
        workflows: s.workflows.filter((w) => w.id !== id),
      })),

      // ─── Cost & Observability ───
      costTransactions: [],
      addCostTransaction: (tx) => set((s) => ({
        costTransactions: [tx, ...s.costTransactions].slice(0, 500),
        totalCost: s.totalCost + tx.cost,
      })),
      budgetConfig: { dailyLimit: 50, monthlyLimit: 500, alertThreshold: 0.8, hardStop: false },
      setBudgetConfig: (config) => set((s) => ({
        budgetConfig: { ...s.budgetConfig, ...config },
      })),
      totalCost: 0,
      executionLogs: [],
      addExecutionLog: (log) => set((s) => ({
        executionLogs: [log, ...s.executionLogs].slice(0, 100),
      })),
      totalTokensUsed: 0,
      incrementTokens: (count) => set((s) => ({ totalTokensUsed: s.totalTokensUsed + count })),

      // ─── Model Router ───
      modelRouterConfig: {
        mode: 'automatic',
        failoverEnabled: true,
        failoverOrder: [],
        parallelRouting: false,
        costOptimization: true,
      },
      setModelRouterConfig: (config) => set((s) => ({
        modelRouterConfig: { ...s.modelRouterConfig, ...config },
      })),

      // ─── Plugins ───
      plugins: [],
      setPlugins: (plugins) => set({ plugins }),
      updatePlugin: (id, updates) => set((s) => ({
        plugins: s.plugins.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      })),

      // ─── Prompts ───
      prompts: [],
      setPrompts: (prompts) => set({ prompts }),
      addPrompt: (prompt) => set((s) => ({ prompts: [...s.prompts, prompt] })),

      // ─── MCP Servers ───
      mcpServers: [],
      setMCPServers: (servers) => set({ mcpServers: servers }),

      // ─── Marketplace ───
      marketplaceAgents: [],
      setMarketplaceAgents: (agents) => set({ marketplaceAgents: agents }),

      // ─── Security ───
      securityAlerts: [],
      addSecurityAlert: (alert) => set((s) => ({
        securityAlerts: [alert, ...s.securityAlerts].slice(0, 100),
      })),

      // ─── Deployments ───
      deployments: [],
      addDeployment: (deployment) => set((s) => ({ deployments: [...s.deployments, deployment] })),
      updateDeployment: (id, updates) => set((s) => ({
        deployments: s.deployments.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      })),

      // ─── System Metrics ───
      systemMetrics: {
        cpu: 0,
        memory: 0,
        network: 0,
        disk: 0,
        activeAgents: 0,
        activeProviders: 0,
        totalRequests: 0,
        avgLatency: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        uptimeSeconds: 0,
        knowledgeEntries: 0,
        memoryEntries: 0,
        workspaceCount: 0,
      },
      setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),

      // ─── Stack Layers ───
      stackLayers: [
        { id: 'brain', number: 1, name: 'Brain Layer', color: '#9d4edd', flowLabel: 'Intelligence', flowIcon: '🧠', icon: '🧠', role: 'Intelligence & Orchestration', agent: 'Brain', whatItDoes: 'The native intelligence. Plans, reasons, delegates, coordinates.', keyCapabilities: ['Planning', 'Reasoning', 'Delegation', 'Coordination'], description: 'Brain Layer' },
        { id: 'providers', number: 2, name: 'Provider Layer', color: '#00ffff', flowLabel: 'Providers', flowIcon: '🔌', icon: '🔌', role: 'Model Provider Management', agent: 'Router', whatItDoes: 'Manages connections to LLM providers as interchangeable engines.', keyCapabilities: ['API Management', 'Health Monitoring', 'Routing'], description: 'Provider Layer' },
        { id: 'agents', number: 3, name: 'Agent Layer', color: '#00ff88', flowLabel: 'Agents', flowIcon: '🤖', icon: '🤖', role: 'Specialized Agent Workers', agent: 'Agents', whatItDoes: 'Specialized agents for code, research, tasks.', keyCapabilities: ['Code', 'Research', 'Tasks', 'Swarm'], description: 'Agent Layer' },
        { id: 'knowledge', number: 4, name: 'Knowledge Layer', color: '#FFB627', flowLabel: 'Knowledge', flowIcon: '📚', icon: '📚', role: 'Knowledge & Memory Engine', agent: 'Knowledge', whatItDoes: 'Knowledge base, memory, knowledge graph, RAG.', keyCapabilities: ['Knowledge Base', 'Memory', 'Graph', 'RAG'], description: 'Knowledge Layer' },
        { id: 'execution', number: 5, name: 'Execution Layer', color: '#E8751A', flowLabel: 'Execution', flowIcon: '⚡', icon: '⚡', role: 'Workflows & Automation', agent: 'Runner', whatItDoes: 'Workflows, automations, plugins, prompts.', keyCapabilities: ['Workflows', 'Automations', 'Plugins'], description: 'Execution Layer' },
        { id: 'memory', number: 6, name: 'Memory Layer', color: '#2E86AB', flowLabel: 'Memory', flowIcon: '💾', icon: '💾', role: 'Multi-tier Memory System', agent: 'Memory', whatItDoes: 'Short-term, long-term, episodic, semantic memory.', keyCapabilities: ['STM', 'LTM', 'Episodic', 'Semantic'], description: 'Memory Layer' },
        { id: 'governance', number: 7, name: 'Governance Layer', color: '#1B998B', flowLabel: 'Governance', flowIcon: '🛡️', icon: '🛡️', role: 'Observability & Security', agent: 'Governor', whatItDoes: 'Observability, cost, security, audit trail.', keyCapabilities: ['Observability', 'Cost', 'Security', 'Audit'], description: 'Governance Layer' },
      ],

      // ─── Agent Selection ───
      selectedAgentId: null,
      setSelectedAgentId: (id) => set({ selectedAgentId: id }),

      // ─── Connections ───
      hermesConnection: { running: false, apiEndpoint: '', model: '', version: '', latency: 0 },
      geminiConnection: { installed: false, running: false, version: '', model: 'gemini-2.5-pro' },
      sseConnectionStatus: 'disconnected',

      // ─── Agent Analytics ───
      agentAnalytics: {
        brain: { totalSessions: 0, totalTokens: 0, totalToolCalls: 0, avgResponseTime: 0, activityByHour: Array(24).fill(0), peakHour: 0 },
        'code-agent': { totalSessions: 0, totalTokens: 0, totalToolCalls: 0, avgResponseTime: 0, activityByHour: Array(24).fill(0), peakHour: 0 },
        'research-agent': { totalSessions: 0, totalTokens: 0, totalToolCalls: 0, avgResponseTime: 0, activityByHour: Array(24).fill(0), peakHour: 0 },
        'task-agent': { totalSessions: 0, totalTokens: 0, totalToolCalls: 0, avgResponseTime: 0, activityByHour: Array(24).fill(0), peakHour: 0 },
      },

      // ─── Goals & Journal ───
      goals: [
        { id: 'goal-1', title: 'Set up Agentic OS dashboard', description: 'Install and configure the 7-layer Agentic OS dashboard with Gemini CLI integration', progress: 100, status: 'completed', category: 'Setup', createdAt: Date.now() - 604800000, updatedAt: Date.now() - 172800000, subtasks: [{ id: 'st-1', title: 'Clone repository', completed: true }, { id: 'st-2', title: 'Install dependencies', completed: true }, { id: 'st-3', title: 'Configure Gemini CLI', completed: true }], color: '#00ff88' },
        { id: 'goal-2', title: 'Connect AI providers', description: 'Configure Gemini, OpenRouter, NVIDIA NIM, and other AI providers for model flexibility', progress: 60, status: 'active', category: 'Development', createdAt: Date.now() - 259200000, updatedAt: Date.now() - 3600000, subtasks: [{ id: 'st-4', title: 'Add Gemini API key', completed: true }, { id: 'st-5', title: 'Configure OpenRouter', completed: false }, { id: 'st-6', title: 'Test NVIDIA NIM', completed: false }], color: '#FFB627' },
        { id: 'goal-3', title: 'Create custom AI agents', description: 'Build specialized agents for coding, research, and automation using the Agent Builder', progress: 30, status: 'active', category: 'Agents', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 7200000, subtasks: [{ id: 'st-7', title: 'Create Code Agent', completed: true }, { id: 'st-8', title: 'Create Research Agent', completed: false }, { id: 'st-9', title: 'Configure Swarm Intelligence', completed: false }], color: '#9d4edd' },
      ] as Goal[],
      addGoal: (goal) => set((s) => ({ goals: [goal, ...s.goals] })),
      updateGoal: (id, updates) => set((s) => ({
        goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g)),
      })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      toggleGoalSubtask: (goalId, subtaskId) => set((s) => ({
        goals: s.goals.map((g) => {
          if (g.id !== goalId) return g;
          const subtasks = (g.subtasks ?? []).map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          const completed = subtasks.filter(st => st.completed).length;
          const progress = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : g.progress;
          return { ...g, subtasks, progress, updatedAt: Date.now() };
        }),
      })),
      journal: [
        { id: 'jrn-1', title: 'Agentic OS First Launch', content: 'Successfully launched the 7-layer dashboard. The Gemini CLI integration is working via the chat tab. Need to configure more AI providers for flexibility. The agent builder has great templates for quick setup.', mood: 'inspired', tags: ['launch', 'setup', 'gemini-cli'], createdAt: Date.now() - 172800000, agent: 'gemini' },
        { id: 'jrn-2', title: 'Provider Configuration', content: 'Added Gemini as primary provider. Also exploring OpenRouter and NVIDIA NIM for additional model options. The self-contained architecture is impressive — no external API dependencies needed with Gemini CLI.', mood: 'focused', tags: ['providers', 'configuration', 'models'], createdAt: Date.now() - 86400000, agent: 'openclaw' },
        { id: 'jrn-3', title: 'Memory System Working', content: 'The cross-session memory engine is preserving context across sessions. Agents can now share memory and build compound knowledge over time. This is the key differentiator from generic AI tools.', mood: 'energized', tags: ['memory', 'cross-session', 'knowledge'], createdAt: Date.now() - 43200000, agent: 'brain' },
      ] as JournalEntry[],
      addJournalEntry: (entry) => set((s) => ({ journal: [entry, ...s.journal] })),
      updateJournalEntry: (id, updates) => set((s) => ({
        journal: s.journal.map((j) => (j.id === id ? { ...j, ...updates } : j)),
      })),
      removeJournalEntry: (id) => set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),

      // ─── Hermes ───
      hermesSkills: [] as HermesSkill[],
      skillExecutions: [] as SkillExecution[],
      addSkillExecution: (exec) => set((s) => ({ skillExecutions: [exec, ...s.skillExecutions].slice(0, 50) })),

      // ─── Chat Attachments ───
      chatAttachments: [] as ChatAttachment[],
      addChatAttachment: (att) => set((s) => ({ chatAttachments: [...s.chatAttachments, att] })),
      removeChatAttachment: (id) => set((s) => ({ chatAttachments: s.chatAttachments.filter(a => a.id !== id) })),
      clearChatAttachments: () => set({ chatAttachments: [] }),

      // ─── Swarm Intelligence ───
      activeSwarms: [] as SwarmSession[],
      swarmHistory: [] as SwarmSession[],
      addSwarm: (swarm) => set((s) => ({ activeSwarms: [...s.activeSwarms, swarm] })),
      updateSwarm: (id, updates) => set((s) => ({
        activeSwarms: s.activeSwarms.map(sw => sw.id === id ? { ...sw, ...updates } : sw),
      })),

      // ─── Logs ───
      logs: [] as LogEntry[],
      addLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 200) })),

      // ─── Kanban ───
      kanbanTasks: [] as KanbanTask[],
      addKanbanTask: (task) => set((s) => ({ kanbanTasks: [...s.kanbanTasks, task] })),

      // ─── UI State ───
      controlRoomAgent: null,
      setControlRoomAgent: (id) => set({ controlRoomAgent: id }),
      selfSearchQuery: '',
      setSelfSearchQuery: (q) => set({ selfSearchQuery: q }),

      // ─── Intelligence Layer ───
      agentIntelligence: {},
      updateAgentIntelligence: (agentId, updates) => set((s) => ({
        agentIntelligence: {
          ...s.agentIntelligence,
          [agentId]: { ...(s.agentIntelligence[agentId] || createDefaultAgentIntelligence(agentId)), ...updates },
        },
      })),

      // ─── Brain Modes ───
      activeBrainMode: 'hermes-brain',
      setActiveBrainMode: (mode) => set({ activeBrainMode: mode }),

      // ─── Skills ───
      skills: BUILTIN_SKILLS,
      activeSkillIds: ['coding', 'research'],
      toggleSkill: (skillId) => set((s) => ({
        activeSkillIds: s.activeSkillIds.includes(skillId)
          ? s.activeSkillIds.filter(id => id !== skillId)
          : [...s.activeSkillIds, skillId],
      })),

      // ─── Artifacts ───
      artifacts: [],
      addArtifact: (artifact) => set((s) => ({ artifacts: [...s.artifacts, artifact] })),
      updateArtifact: (id, updates) => set((s) => ({
        artifacts: s.artifacts.map(a => a.id === id ? { ...a, ...updates } : a),
      })),

      // ─── Swarm Intelligence ───
      swarmScore: 0,
      swarmTier: 'single-agent',
      lastSwarmTrigger: '',
      setSwarmScore: (score: number) => set({ swarmScore: score }),
      setSwarmTier: (tier: string) => set({ swarmTier: tier }),
    }),
    {
      name: 'agentic-os-store',
      partialize: (state) => ({
        providers: state.providers,
        brainConfig: state.brainConfig,
        geminiCLI: state.geminiCLI,
        agents: state.agents,
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
        attachments: state.attachments,
        knowledgeEntries: state.knowledgeEntries,
        memories: state.memories,
        chatHistories: state.chatHistories,
        workflows: state.workflows,
        costTransactions: state.costTransactions,
        budgetConfig: state.budgetConfig,
        totalCost: state.totalCost,
        totalTokensUsed: state.totalTokensUsed,
        modelRouterConfig: state.modelRouterConfig,
        plugins: state.plugins,
        prompts: state.prompts,
        mcpServers: state.mcpServers,
        marketplaceAgents: state.marketplaceAgents,
        deployments: state.deployments,
        activeProviderId: state.activeProviderId,
        sidebarCollapsed: state.sidebarCollapsed,
        selectedAgentId: state.selectedAgentId,
        hermesConnection: state.hermesConnection,
        geminiConnection: state.geminiConnection,
        agentAnalytics: state.agentAnalytics,
        goals: state.goals,
        journal: state.journal,
        hermesSkills: state.hermesSkills,
        skillExecutions: state.skillExecutions,
        chatAttachments: state.chatAttachments,
        activeSwarms: state.activeSwarms,
        swarmHistory: state.swarmHistory,
        logs: state.logs,
        kanbanTasks: state.kanbanTasks,
        agentIntelligence: state.agentIntelligence,
        activeBrainMode: state.activeBrainMode,
        skills: state.skills,
        activeSkillIds: state.activeSkillIds,
        artifacts: state.artifacts,
        swarmScore: state.swarmScore,
        swarmTier: state.swarmTier,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);

// ─── Hydration Hook ───
export function useHydration() {
  const hydrated = useOSStore((s) => s._hasHydrated);
  return hydrated;
}
