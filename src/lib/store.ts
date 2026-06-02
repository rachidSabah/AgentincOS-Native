import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentStatus = 'live' | 'degraded' | 'offline' | 'booting';

export interface StackLayer {
  id: string;
  number: number;
  name: string;
  role: string;
  agent: string;
  description: string;
  color: string;
  glowColor: string;
  icon: string;
  isUnlocked: boolean;
  whatItDoes: string;
  keyCapabilities: string[];
  example: string;
  quote: string;
  flowLabel: string;
  flowIcon: string;
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  timeline: string;
  category: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  type: 'voice' | 'text';
  content: string;
  source: string;
}

export interface MemoryEntry {
  id: string;
  timestamp: string;
  content: string;
  agent: string;
  tags: string[];
}

export interface Agent {
  id: string;
  name: string;
  layer: number; // primary layer
  layers: number[]; // all layers this agent participates in
  status: AgentStatus;
  description: string;
  uptime: string;
  latency: number;
  requests: number;
  model?: string;
  color: string;
  tags: string[];
  lastActive: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  layer: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
  activeAgents: number;
  totalRequests: number;
  avgLatency: number;
  vaultSize: number;
  vaultEntries: number;
  compoundDays: number;
}

export interface HermesConnection {
  installed: boolean;
  running: boolean;
  version?: string;
  apiEndpoint?: string;
  model?: string;
  latency?: number;
  lastChecked?: number;
  skillCount?: number;
  activeSessions?: number;
  mcpServerCount?: number;
}

export interface GeminiConnection {
  installed: boolean;
  running: boolean;
  version?: string;
  apiEndpoint?: string;
  model?: string;
  latency?: number;
  lastChecked?: number;
  projectCount?: number;
  sandboxEnabled?: boolean;
  path?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  agentId?: string;
}

export interface AgentAnalytics {
  totalSessions: number;
  totalTokens: number;
  totalToolCalls: number;
  modelsUsed: string[];
  activityByHour: number[]; // 24-element array, index=hour, value=request count
  peakHour: number;
  avgResponseTime: number;
  lastSessionStart: number | null;
}

export interface HermesSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  source: 'builtin' | 'mcp' | 'plugin';
}

export interface KanbanTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string; // agent id
  createdAt: number;
}

export interface MCPServer {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  url?: string;
  connected: boolean;
  toolCount?: number;
}

export interface SkillExecution {
  id: string;
  skill: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  startedAt: number;
  completedAt?: number;
}

export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ─── Message Bus Types ───
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'task' | 'result' | 'query' | 'broadcast' | 'error';
  subject: string;
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  status: 'pending' | 'delivered' | 'read' | 'failed';
  retries: number;
}

// ─── Swarm Intelligence Types ───
export interface SwarmProposal {
  id: string;
  agentId: string;
  content: string;
  confidence: number;
  votes: Array<{ agentId: string; vote: 'approve' | 'reject' | 'abstain'; reasoning: string }>;
  timestamp: number;
}

export interface SwarmSession {
  id: string;
  task: string;
  agents: string[];
  strategy: 'consensus' | 'majority' | 'delegation' | 'race';
  maxRounds: number;
  currentRound: number;
  proposals: SwarmProposal[];
  status: 'forming' | 'proposing' | 'voting' | 'executing' | 'completed' | 'dissolved';
  winningProposal: SwarmProposal | null;
  consensusPercentage: number;
  createdAt: number;
  completedAt?: number;
}

// ─── Cost Tracker Types ───
export interface CostTransaction {
  id: string;
  agentId: string;
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

// ─── Workflow Types ───
export interface WorkflowNode {
  id: string;
  type: 'agent-call' | 'condition' | 'loop' | 'transform' | 'webhook' | 'delay' | 'human-approval' | 'output';
  position: { x: number; y: number };
  data: Record<string, unknown>;
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
  status: 'draft' | 'running' | 'completed' | 'failed';
  lastRun?: number;
  createdAt: number;
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
  config: Record<string, unknown>;
  installedAt: number;
}

// ─── Prompt Types ───
export interface PromptEntry {
  id: string;
  name: string;
  category: 'system' | 'task' | 'skill' | 'seo' | 'workflow' | 'custom';
  content: string;
  variables: string[];
  version: number;
  performanceScore: number;
  usageCount: number;
  lastModified: number;
}

// ─── Webhook Types ───
export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: number;
  deliveryCount: number;
  failureCount: number;
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

// ─── Model Router Types ───
export interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  contextWindow: number;
  strengths: string[];
}

// ─── Report Types ───
export interface Report {
  id: string;
  type: 'daily-digest' | 'weekly-analytics' | 'monthly-roi' | 'custom';
  generatedAt: number;
  summary: string;
  metrics: Record<string, unknown>;
}

// ─── SEO Silo Types ───
export interface SEOIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  description: string;
  fix: string;
}

export interface SEOPage {
  id: string;
  clusterId: string;
  siloId: string;
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  wordCount: number;
  score: number;
  issues: SEOIssue[];
  internalLinks: string[];
  status: 'draft' | 'optimized' | 'published';
  content?: string;
  publishedAt?: number;
}

export interface SEOCluster {
  id: string;
  siloId: string;
  name: string;
  keyword: string;
  pages: SEOPage[];
  score: number;
}

export interface SEOSilo {
  id: string;
  name: string;
  pillarUrl: string;
  pillarKeyword: string;
  description: string;
  clusters: SEOCluster[];
  score: number;
  createdAt: number;
  updatedAt: number;
}

export interface WebsiteScanResult {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  canonicalUrl: string;
  robotsMeta: string;
  schemaTypes: string[];
  pageSize: number;
  loadTime: number;
  mobileFriendly: boolean;
  https: boolean;
  issues: SEOIssue[];
  score: number;
  scannedAt: number;
}

// ─── Provider Types ───
export interface ProviderConfig {
  id: string;
  name: string;          // e.g. "OpenAI", "Anthropic", "Google", "OpenRouter", "Ollama", "DeepSeek", "Mistral", "Qwen", "BigModel", "GLM", "Grok", "Cohere", "Perplexity", "Together AI", "Fireworks", "Cerebras", "SambaNova", "Custom"
  type: 'cloud' | 'local' | 'custom';
  apiEndpoint: string;
  apiKey: string;         // encrypted at rest
  models: string[];       // available models
  defaultModel: string;
  enabled: boolean;
  healthStatus: 'healthy' | 'degraded' | 'offline' | 'unknown';
  lastHealthCheck: number;
  rateLimit: { rpm: number; tpm: number };
  costConfig: { alertThreshold: number; hardStop: boolean };
  icon?: string;
  color?: string;
}

// ─── Brain Emulation Types ───
export type BrainProfile = 'claude' | 'gemini' | 'hermes' | 'openclaw' | 'vault' | 'opencode' | 'custom';

export interface BrainConfig {
  id: string;
  name: string;
  profile: BrainProfile;
  systemPrompt: string;
  reasoningStyle: 'chain-of-thought' | 'tree-of-thought' | 'react' | 'plan-and-execute' | 'reflection';
  toolUsagePattern: 'aggressive' | 'conservative' | 'adaptive';
  memoryMethod: 'short-term' | 'long-term' | 'semantic' | 'episodic' | 'full';
  codingWorkflow: 'iterative' | 'plan-first' | 'test-driven' | 'debug-first';
  researchMethod: 'depth-first' | 'breadth-first' | 'hybrid';
  temperature: number;
  topP: number;
}

// ─── Workspace Types ───
export interface WorkspaceFile {
  id: string;
  name: string;
  type: string;              // pdf, docx, xlsx, csv, pptx, txt, json, xml, yaml, html, zip, rar, image, audio, video, code, repo, db, log, cad
  size: number;
  uploadedAt: number;
  processed: boolean;        // OCR, vision, transcription, embedding done
  summary?: string;
  tags: string[];
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  type: 'project' | 'organization' | 'team' | 'department';
  agents: string[];           // agent ids assigned
  models: string[];           // model ids available
  files: WorkspaceFile[];
  memory: string[];           // memory ids
  permissions: string[];
  knowledge: string[];        // knowledge base ids
  automations: string[];      // automation ids
  templates: string[];
  createdAt: number;
  updatedAt: number;
  color: string;
  icon: string;
}

// ─── Agent Fallback Types ───
export interface AgentFallbackConfig {
  layerAssignments: {[key: string]: string[]};   // layerId -> ordered list of agent ids that can handle it
  activeHandlers: {[key: string]: string};        // layerId -> currently assigned agent id
  fallbackHistory: Array<{ from: string; to: string; layer: string; reason: string; timestamp: number }>;
}

// ─── Model Router Config ───
export interface ModelRouterConfig {
  mode: 'automatic' | 'fastest' | 'cheapest' | 'highest-quality' | 'reasoning-first' | 'coding-first' | 'research-first' | 'vision-first' | 'multi-agent-consensus';
  consensusConfig: {
    enabled: boolean;
    agentCount: number;
    strategy: 'consensus' | 'majority' | 'delegation' | 'race';
  };
  parallelRouting: boolean;
  weightedVoting: boolean;
}

// ─── Attachment Types ───
export interface ChatAttachment {
  id: string;
  name: string;
  type: string;       // mime type
  size: number;
  dataUrl?: string;   // base64 for small files, or reference to server
  processed: boolean;
  summary?: string;
}

// ─── Marketplace Types ───
export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'recruitment' | 'wordpress' | 'seo' | 'marketing' | 'programming' | 'education' | 'aviation' | 'legal' | 'medical' | 'research' | 'custom';
  author: string;
  version: string;
  rating: number;
  downloads: number;
  price: number;       // 0 = free
  installed: boolean;
  brainProfile: BrainProfile;
  requiredProviders: string[];
  icon: string;
  color: string;
  tags: string[];
}

interface OSState {
  activeView: string;
  setActiveView: (view: string) => void;
  stackLayers: StackLayer[];
  agents: Agent[];
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  systemMetrics: SystemMetrics;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  goals: Goal[];
  journal: JournalEntry[];
  memories: MemoryEntry[];
  addMemory: (memory: MemoryEntry) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addJournalEntry: (entry: JournalEntry) => void;
  removeJournalEntry: (id: string) => void;
  controlRoomAgent: string | null;
  setControlRoomAgent: (id: string | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  selfSearchQuery: string;
  setSelfSearchQuery: (q: string) => void;
  hermesConnection: HermesConnection;
  setHermesConnection: (conn: Partial<HermesConnection>) => void;
  geminiConnection: GeminiConnection;
  setGeminiConnection: (conn: Partial<GeminiConnection>) => void;
  chatHistories: Record<string, ChatMessage[]>;
  addChatMessage: (agentId: string, msg: ChatMessage) => void;
  clearChatHistory: (agentId: string) => void;
  isChatStreaming: boolean;
  setIsChatStreaming: (streaming: boolean) => void;
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  agentAnalytics: Record<string, AgentAnalytics>;
  setAgentAnalytics: (agentId: string, analytics: Partial<AgentAnalytics>) => void;
  hermesSkills: HermesSkill[];
  setHermesSkills: (skills: HermesSkill[]) => void;
  kanbanTasks: KanbanTask[];
  addKanbanTask: (task: KanbanTask) => void;
  updateKanbanTask: (id: string, updates: Partial<KanbanTask>) => void;
  totalTokensUsed: number;
  incrementTokens: (count: number) => void;
  // SSE connection state
  sseConnectionStatus: SSEConnectionStatus;
  setSSEConnectionStatus: (status: SSEConnectionStatus) => void;
  // Skill execution state
  skillExecutions: SkillExecution[];
  addSkillExecution: (execution: SkillExecution) => void;
  updateSkillExecution: (id: string, updates: Partial<SkillExecution>) => void;
  // MCP server state
  mcpServers: MCPServer[];
  setMCPServers: (servers: MCPServer[]) => void;
  // Hermes latency tracking
  hermesLatencyHistory: number[];
  addHermesLatency: (latency: number) => void;
  // ─── Message Bus State ───
  agentMessages: AgentMessage[];
  addAgentMessage: (msg: AgentMessage) => void;
  clearAgentMessages: (agentId?: string) => void;
  // ─── Swarm Intelligence State ───
  activeSwarms: SwarmSession[];
  addSwarm: (swarm: SwarmSession) => void;
  updateSwarm: (id: string, updates: Partial<SwarmSession>) => void;
  swarmHistory: SwarmSession[];
  // ─── Cost Tracker State ───
  costTransactions: CostTransaction[];
  addCostTransaction: (tx: CostTransaction) => void;
  budgetConfig: BudgetConfig;
  setBudgetConfig: (config: Partial<BudgetConfig>) => void;
  totalCost: number;
  // ─── Workflow State ───
  workflows: Workflow[];
  addWorkflow: (wf: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;
  // ─── Plugin State ───
  plugins: Plugin[];
  setPlugins: (plugins: Plugin[]) => void;
  updatePlugin: (id: string, updates: Partial<Plugin>) => void;
  // ─── Prompt Library State ───
  prompts: PromptEntry[];
  setPrompts: (prompts: PromptEntry[]) => void;
  // ─── Webhook State ───
  webhooks: WebhookEntry[];
  setWebhooks: (webhooks: WebhookEntry[]) => void;
  // ─── Security State ───
  securityAlerts: SecurityAlert[];
  addSecurityAlert: (alert: SecurityAlert) => void;
  securityRiskScore: number;
  setSecurityRiskScore: (score: number) => void;
  // ─── Model Router State ───
  availableModels: ModelEntry[];
  setAvailableModels: (models: ModelEntry[]) => void;
  // ─── Reports State ───
  reports: Report[];
  addReport: (report: Report) => void;
  // ─── Update Tracking State ───
  installedUpdateIds: string[];
  addInstalledUpdateId: (id: string) => void;
  // ─── SEO Silo State ───
  seoSilos: SEOSilo[];
  addSEOSilo: (silo: SEOSilo) => void;
  updateSEOSilo: (id: string, updates: Partial<SEOSilo>) => void;
  removeSEOSilo: (id: string) => void;
  seoScanResults: {[key: string]: WebsiteScanResult};
  addScanResult: (url: string, result: WebsiteScanResult) => void;

  // ─── Provider State ───
  providers: ProviderConfig[];
  addProvider: (provider: ProviderConfig) => void;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;

  // ─── Brain Emulation State ───
  brainConfigs: BrainConfig[];
  activeBrainId: string | null;
  addBrainConfig: (config: BrainConfig) => void;
  updateBrainConfig: (id: string, updates: Partial<BrainConfig>) => void;
  removeBrainConfig: (id: string) => void;
  setActiveBrainId: (id: string | null) => void;

  // ─── Workspace State ───
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspaceId: (id: string | null) => void;

  // ─── Agent Fallback State ───
  agentFallbackConfig: AgentFallbackConfig;
  setAgentFallbackConfig: (config: Partial<AgentFallbackConfig>) => void;

  // ─── Model Router Config State ───
  modelRouterConfig: ModelRouterConfig;
  setModelRouterConfig: (config: Partial<ModelRouterConfig>) => void;

  // ─── Chat Attachment State ───
  chatAttachments: ChatAttachment[];
  addChatAttachment: (attachment: ChatAttachment) => void;
  removeChatAttachment: (id: string) => void;
  clearChatAttachments: () => void;

  // ─── Marketplace State ───
  marketplaceAgents: MarketplaceAgent[];
  setMarketplaceAgents: (agents: MarketplaceAgent[]) => void;

  // ─── Hydration Guard ───
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

function generateActivityByHour(peakHour: number): number[] {
  // Use deterministic pseudo-random to avoid hydration mismatch
  const seed = peakHour * 1237 + 7;
  let s = seed;
  const nextRand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const hours: number[] = [];
  for (let i = 0; i < 24; i++) {
    const dist = Math.abs(i - peakHour);
    const base = Math.max(5, 100 - dist * 12 + nextRand() * 20);
    hours.push(Math.round(base));
  }
  return hours;
}

export const useOSStore = create<OSState>()(
  persist(
    (set) => ({
  _hasHydrated: false,
  setHasHydrated: (v) => set({ _hasHydrated: v }),

  activeView: 'home',
  setActiveView: (view) => set({ activeView: view }),

  stackLayers: [
    {
      id: 'interaction',
      number: 1,
      name: 'Interaction & Perception',
      role: 'Input — Voice, Text, Image, Video',
      agent: 'claude',
      description: 'Turns voice, text, image, and video into usable signals. This is the AI\'s front door — the first point of contact between users and the system. Every input flows through this layer before being routed deeper.',
      color: '#FF8C42',
      glowColor: 'rgba(255,140,66,0.15)',
      icon: '🎤',
      isUnlocked: true,
      whatItDoes: 'Turns voice, text, image, and video into usable signals.',
      keyCapabilities: ['Multimodal input understanding', 'Intent detection', 'Adaptive user interaction'],
      example: 'A support agent understands a voice complaint, reads a screenshot, and replies in context.',
      quote: 'This is the AI\'s front door.',
      flowLabel: 'Input',
      flowIcon: '📥',
    },
    {
      id: 'knowledge',
      number: 2,
      name: 'Knowledge Acquisition',
      role: 'Retrieve — Research & Information',
      agent: 'hermes',
      description: 'Finds the right information from internal and external sources. Good answers depend on good information — this layer ensures agents always have the data they need before responding or acting.',
      color: '#FFB627',
      glowColor: 'rgba(255,182,39,0.15)',
      icon: '🔍',
      isUnlocked: true,
      whatItDoes: 'Finds the right information from internal and external sources.',
      keyCapabilities: ['Data retrieval across systems', 'Search + synthesis', 'Fact-checking and validation'],
      example: 'A research agent pulls product docs, CRM notes, and web data before answering.',
      quote: 'Good answers depend on good information.',
      flowLabel: 'Retrieve',
      flowIcon: '🔎',
    },
    {
      id: 'orchestration',
      number: 3,
      name: 'Agent Orchestration',
      role: 'Coordinate — Multi-Agent Routing',
      agent: 'openclaw',
      description: 'Coordinates multiple agents, roles, and tasks toward one goal. This is where agents become a team — routing, delegating, and synchronizing work across the entire system.',
      color: '#E8751A',
      glowColor: 'rgba(232,117,26,0.15)',
      icon: '👥',
      isUnlocked: true,
      whatItDoes: 'Coordinates multiple agents, roles, and tasks toward one goal.',
      keyCapabilities: ['Task routing', 'Role delegation', 'Dynamic workflow coordination'],
      example: 'One agent researches, another writes, and another reviews before delivery.',
      quote: 'This is where agents become a team.',
      flowLabel: 'Coordinate',
      flowIcon: '🔄',
    },
    {
      id: 'cognition',
      number: 4,
      name: 'Cognitive Reasoning',
      role: 'Reason — Planning & Decision-Making',
      agent: 'claude',
      description: 'Plans, evaluates options, and reasons through multi-step problems. Reasoning turns information into decisions — this layer is the strategic brain of the entire system.',
      color: '#E63946',
      glowColor: 'rgba(230,57,70,0.15)',
      icon: '🧠',
      isUnlocked: true,
      whatItDoes: 'Plans, evaluates options, and reasons through multi-step problems.',
      keyCapabilities: ['Structured planning', 'Self-reflection and error correction', 'Reasoning with rules and logic'],
      example: 'A finance agent compares scenarios, spots inconsistencies, and recommends the best path.',
      quote: 'Reasoning turns information into decisions.',
      flowLabel: 'Reason',
      flowIcon: '🧠',
    },
    {
      id: 'execution',
      number: 5,
      name: 'Execution & Integration',
      role: 'Act — Tools, APIs, Workflows',
      agent: 'hermes',
      description: 'Takes action using tools, APIs, and automated workflows. Without action, intelligence stays theoretical — this layer bridges the gap between thinking and doing.',
      color: '#7B2CBF',
      glowColor: 'rgba(123,44,191,0.15)',
      icon: '⚡',
      isUnlocked: true,
      whatItDoes: 'Takes action using tools, APIs, and automated workflows.',
      keyCapabilities: ['Tool use', 'API execution', 'Workflow automation and monitoring'],
      example: 'An operations agent updates a ticket, books a meeting, and sends a confirmation.',
      quote: 'Without action, intelligence stays theoretical.',
      flowLabel: 'Act',
      flowIcon: '⚡',
    },
    {
      id: 'memory',
      number: 6,
      name: 'Memory, Learning & Context',
      role: 'Remember — Context & Personalization',
      agent: 'vault',
      description: 'Stores context, preferences, and past interactions to improve future performance. Memory makes agents feel consistent and personal — every interaction builds on the last.',
      color: '#2E86AB',
      glowColor: 'rgba(46,134,171,0.15)',
      icon: '💾',
      isUnlocked: true,
      whatItDoes: 'Stores context, preferences, and past interactions to improve future performance.',
      keyCapabilities: ['Short-term and long-term memory', 'Personalization', 'Continuous improvement'],
      example: 'A customer agent remembers past issues and tailors future responses.',
      quote: 'Memory makes agents feel consistent and personal.',
      flowLabel: 'Remember',
      flowIcon: '💾',
    },
    {
      id: 'governance',
      number: 7,
      name: 'Deployment, Governance & Infrastructure',
      role: 'Govern — Security, Scale, Reliability',
      agent: 'openclaw',
      description: 'Provides the secure, scalable foundation that keeps the system reliable. Trustworthy AI needs strong guardrails — this layer ensures safety, observability, and production-readiness.',
      color: '#1B998B',
      glowColor: 'rgba(27,153,139,0.15)',
      icon: '🛡️',
      isUnlocked: true,
      whatItDoes: 'Provides the secure, scalable foundation that keeps the system reliable.',
      keyCapabilities: ['Secure hosting', 'Policies and safety controls', 'Observability and performance tracking'],
      example: 'An enterprise agent platform enforces permissions, logs actions, and scales safely.',
      quote: 'Trustworthy AI needs strong guardrails.',
      flowLabel: 'Govern',
      flowIcon: '🛡️',
    },
  ],

  agents: [
    {
      id: 'claude',
      name: 'Claude',
      layer: 4,
      layers: [1, 4],
      status: 'offline' as AgentStatus,
      description: 'The CEO of the stack. Handles Interaction & Perception (L1) and Cognitive Reasoning (L4).',
      color: '#E63946',
      tags: ['REASONING', 'MCP', 'CODE', 'PERCEPTION'],
      uptime: '0s',
      latency: 0,
      requests: 0,
      lastActive: 'never',
    },
    {
      id: 'openclaw',
      name: 'OpenClaw',
      layer: 3,
      layers: [3, 7],
      status: 'offline' as AgentStatus,
      description: 'The router and governor. Handles Agent Orchestration (L3) and Governance (L7).',
      color: '#E8751A',
      tags: ['ROUTING', 'GOVERNANCE', 'COORDINATION', 'SECURITY'],
      uptime: '0s',
      latency: 0,
      requests: 0,
      lastActive: 'never',
    },
    {
      id: 'hermes',
      name: 'Hermes',
      layer: 2,
      layers: [2, 5],
      status: 'booting' as AgentStatus,
      description: 'The worker. Handles Knowledge Acquisition (L2) and Execution (L5).',
      color: '#FFB627',
      tags: ['SKILLS', 'RESEARCH', 'EXECUTION', 'KANBAN'],
      uptime: '0s',
      latency: 0,
      requests: 0,
      lastActive: 'never',
    },
    {
      id: 'vault',
      name: 'Self Vault',
      layer: 6,
      layers: [6],
      status: 'offline' as AgentStatus,
      description: 'The identity. Handles Memory, Learning & Context (L6).',
      color: '#2E86AB',
      tags: ['IDENTITY', 'COMPOUND', 'VAULT', 'MEMORY'],
      uptime: '0s',
      latency: 0,
      requests: 0,
      lastActive: 'never',
    },
    {
      id: 'gemini',
      name: 'Gemini',
      layer: 2,
      layers: [2, 5],
      status: 'booting' as AgentStatus,
      description: 'Google Gemini CLI. Multimodal reasoning and code execution.',
      color: '#4285F4',
      tags: ['MULTIMODAL', 'CODE', 'RESEARCH', 'LONG-CONTEXT'],
      uptime: '0s',
      latency: 0,
      requests: 0,
      lastActive: 'never',
    },
  ],

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  logs: [] as any[],
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs].slice(0, 50) })),

  systemMetrics: {
    cpu: 42,
    memory: 61,
    network: 28,
    disk: 35,
    activeAgents: 3,
    totalRequests: 24567,
    avgLatency: 187,
    vaultSize: 4.2,
    vaultEntries: 1284,
    compoundDays: 17,
  } as SystemMetrics,
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),

  goals: [
    { id: 'g1', title: 'Launch Agentic OS v1.0', progress: 72, timeline: 'Q2 2026', category: 'Product' },
    { id: 'g2', title: 'Integrate all 5 agents with MCP protocol', progress: 45, timeline: 'Q1 2026', category: 'Engineering' },
    { id: 'g3', title: 'Achieve 99.9% uptime across all layers', progress: 88, timeline: 'Q3 2026', category: 'Reliability' },
    { id: 'g4', title: 'Build compound memory system (30-day)', progress: 57, timeline: 'Q2 2026', category: 'AI' },
    { id: 'g5', title: 'Deploy governance layer with full observability', progress: 34, timeline: 'Q3 2026', category: 'Security' },
  ] as Goal[],

  journal: [
    { id: 'j1', date: '2026-05-31', type: 'voice', content: 'Reviewed 7-layer architecture with team. Decision: Memory layer (L6) is the critical unlock for compound intelligence. Need to prioritize vault structure and OMI recording integration.', source: 'OMI Recording' },
    { id: 'j2', date: '2026-05-30', type: 'text', content: 'Hermes integration breakthrough — successfully connected deepseek-chat as default provider with mistral-large-latest fallback. MCP server registry now shows 10 servers, 6 connected.', source: 'Manual Entry' },
    { id: 'j3', date: '2026-05-29', type: 'voice', content: 'Sprint planning: Focus on getting Gemini CLI detected on WSL. The reconnect button needs to be active. Also need to fix plugin timestamps showing negative seconds.', source: 'OMI Recording' },
    { id: 'j4', date: '2026-05-28', type: 'text', content: 'Updated the update system to work without GitHub token. Public API works for public repos. Token is optional for private repos and higher rate limits. Stored in localStorage, not .env.', source: 'Manual Entry' },
    { id: 'j5', date: '2026-05-27', type: 'voice', content: 'Compound knowledge graph is growing. 18 seed memories now connected with 12 relationships. Knowledge extraction pipeline is working — extracted goals, preferences, and decisions from chat history.', source: 'OMI Recording' },
  ] as JournalEntry[],

  memories: [
    { id: 'm1', timestamp: '2026-05-31T10:30:00Z', content: 'Agentic OS 7-layer architecture finalized: Interaction → Knowledge → Orchestration → Cognition → Execution → Memory → Governance', agent: 'Claude', tags: ['architecture', 'layers', 'design'] },
    { id: 'm2', timestamp: '2026-05-31T09:15:00Z', content: 'Hermes default provider set to deepseek/deepseek-chat (deepseek-v4-pro), fallback to mistral/mistral-large-latest via mistral.ai', agent: 'Hermes', tags: ['config', 'llm', 'providers'] },
    { id: 'm3', timestamp: '2026-05-30T16:45:00Z', content: 'MCP Server Registry: 10 servers registered, 6 connected (PostgreSQL, Brave Search, GitHub Copilot, Browser Automation, Claude Vision, Linear Project)', agent: 'Hermes', tags: ['mcp', 'servers', 'tools'] },
    { id: 'm4', timestamp: '2026-05-30T14:20:00Z', content: 'Memory Layer (L6) is the real unlock — Goals, Journal, and Memory compound over time. Day 1 is good, Day 30 is wild.', agent: 'Self Vault', tags: ['memory', 'compound', 'identity'] },
    { id: 'm5', timestamp: '2026-05-29T11:00:00Z', content: 'Gemini CLI installed on WSL — needs active reconnect button in dashboard. Supports multimodal reasoning, code sandbox, and 1M+ context window.', agent: 'Gemini', tags: ['gemini', 'wsl', 'multimodal'] },
    { id: 'm6', timestamp: '2026-05-29T09:30:00Z', content: 'Update system now works without GitHub token. Public repos accessible via GitHub public API (rate limited to 60 req/hr). Token optional for higher limits.', agent: 'OpenClaw', tags: ['updates', 'github', 'api'] },
    { id: 'm7', timestamp: '2026-05-28T15:10:00Z', content: 'Plugin system: GitHub Integration, Jira Connector, Slack Bot, Custom LLM Provider, Obsidian Sync, Stripe Monitor, Email Digest — all available for install', agent: 'Hermes', tags: ['plugins', 'extensions', 'integrations'] },
    { id: 'm8', timestamp: '2026-05-28T10:00:00Z', content: 'User prefers deepseek for fast tasks, mistral for complex reasoning, Claude for code review. Model routing should auto-select based on task complexity.', agent: 'Self Vault', tags: ['preferences', 'models', 'routing'] },
  ] as MemoryEntry[],

  addMemory: (memory) => set((state) => ({ memories: [memory, ...state.memories] })),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updates) => set((state) => ({
    goals: state.goals.map(g => g.id === id ? { ...g, ...updates } : g),
  })),
  removeGoal: (id) => set((state) => ({ goals: state.goals.filter(g => g.id !== id) })),
  addJournalEntry: (entry) => set((state) => ({ journal: [entry, ...state.journal] })),
  removeJournalEntry: (id) => set((state) => ({ journal: state.journal.filter(j => j.id !== id) })),

  controlRoomAgent: null,
  setControlRoomAgent: (id) => set({ controlRoomAgent: id }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  selfSearchQuery: '',
  setSelfSearchQuery: (q) => set({ selfSearchQuery: q }),

  hermesConnection: {
    installed: false,
    running: false,
    lastChecked: 0,
  },
  setHermesConnection: (conn) => set((state) => ({
    hermesConnection: { ...state.hermesConnection, ...conn },
  })),

  geminiConnection: {
    installed: false,
    running: false,
    lastChecked: 0,
  },
  setGeminiConnection: (conn) => set((state) => ({
    geminiConnection: { ...state.geminiConnection, ...conn },
  })),

  chatHistories: {},
  addChatMessage: (agentId, msg) => set((state) => ({
    chatHistories: {
      ...state.chatHistories,
      [agentId]: [...(state.chatHistories[agentId] || []), msg],
    },
  })),
  clearChatHistory: (agentId) => set((state) => ({
    chatHistories: {
      ...state.chatHistories,
      [agentId]: [],
    },
  })),

  isChatStreaming: false,
  setIsChatStreaming: (streaming) => set({ isChatStreaming: streaming }),

  selectedAgentId: null as string | null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  agentAnalytics: {} as Record<string, any>,
  setAgentAnalytics: (agentId, analytics) => set((state) => ({
    agentAnalytics: {
      ...state.agentAnalytics,
      [agentId]: { ...state.agentAnalytics[agentId], ...analytics },
    },
  })),

  hermesSkills: [],
  setHermesSkills: (skills) => set({ hermesSkills: skills }),

  kanbanTasks: [] as any[],
  addKanbanTask: (task) => set((state) => ({ kanbanTasks: [...state.kanbanTasks, task] })),
  updateKanbanTask: (id, updates) => set((state) => ({
    kanbanTasks: state.kanbanTasks.map(t => t.id === id ? { ...t, ...updates } : t),
  })),

  totalTokensUsed: 0,
  incrementTokens: (count) => set((state) => ({ totalTokensUsed: state.totalTokensUsed + count })),

  // SSE connection state
  sseConnectionStatus: 'disconnected',
  setSSEConnectionStatus: (status) => set({ sseConnectionStatus: status }),

  // Skill execution state
  skillExecutions: [],
  addSkillExecution: (execution) => set((state) => ({
    skillExecutions: [execution, ...state.skillExecutions].slice(0, 20),
  })),
  updateSkillExecution: (id, updates) => set((state) => ({
    skillExecutions: state.skillExecutions.map(e => e.id === id ? { ...e, ...updates } : e),
  })),

  // MCP server state
  mcpServers: [],
  setMCPServers: (servers) => set({ mcpServers: servers }),

  // Hermes latency tracking
  hermesLatencyHistory: [],
  addHermesLatency: (latency) => set((state) => ({
    hermesLatencyHistory: [...state.hermesLatencyHistory.slice(-19), latency],
  })),

  // ─── Message Bus State ───
  agentMessages: [],
  addAgentMessage: (msg) => set((state) => ({
    agentMessages: [msg, ...state.agentMessages].slice(0, 100),
  })),
  clearAgentMessages: (agentId) => set((state) => ({
    agentMessages: agentId
      ? state.agentMessages.filter(m => m.from !== agentId && m.to !== agentId)
      : [],
  })),

  // ─── Swarm Intelligence State ───
  activeSwarms: [],
  addSwarm: (swarm) => set((state) => ({
    activeSwarms: [...state.activeSwarms, swarm],
  })),
  updateSwarm: (id, updates) => set((state) => ({
    activeSwarms: state.activeSwarms.map(s => s.id === id ? { ...s, ...updates } : s),
  })),
  swarmHistory: [],

  // ─── Cost Tracker State ───
  costTransactions: [],
  addCostTransaction: (tx) => set((state) => ({
    costTransactions: [tx, ...state.costTransactions].slice(0, 500),
    totalCost: state.totalCost + tx.cost,
  })),
  budgetConfig: { dailyLimit: 50, monthlyLimit: 500, alertThreshold: 0.8, hardStop: false },
  setBudgetConfig: (config) => set((state) => ({
    budgetConfig: { ...state.budgetConfig, ...config },
  })),
  totalCost: 0,

  // ─── Workflow State ───
  workflows: [],
  addWorkflow: (wf) => set((state) => ({
    workflows: [...state.workflows, wf],
  })),
  updateWorkflow: (id, updates) => set((state) => ({
    workflows: state.workflows.map(w => w.id === id ? { ...w, ...updates } : w),
  })),
  removeWorkflow: (id) => set((state) => ({
    workflows: state.workflows.filter(w => w.id !== id),
  })),

  // ─── Plugin State ───
  plugins: [],
  setPlugins: (plugins) => set({ plugins }),
  updatePlugin: (id, updates) => set((state) => ({
    plugins: state.plugins.map(p => p.id === id ? { ...p, ...updates } : p),
  })),

  // ─── Prompt Library State ───
  prompts: [],
  setPrompts: (prompts) => set({ prompts }),

  // ─── Webhook State ───
  webhooks: [],
  setWebhooks: (webhooks) => set({ webhooks }),

  // ─── Security State ───
  securityAlerts: [],
  addSecurityAlert: (alert) => set((state) => ({
    securityAlerts: [alert, ...state.securityAlerts].slice(0, 100),
  })),
  securityRiskScore: 0,
  setSecurityRiskScore: (score) => set({ securityRiskScore: score }),

  // ─── Model Router State ───
  availableModels: [],
  setAvailableModels: (models) => set({ availableModels: models }),

  // ─── Reports State ───
  reports: [],
  addReport: (report) => set((state) => ({
    reports: [report, ...state.reports].slice(0, 50),
  })),

  // ─── Update Tracking State ───
  installedUpdateIds: [],
  addInstalledUpdateId: (id) => set((state) => ({
    installedUpdateIds: [...new Set([...state.installedUpdateIds, id])],
  })),

  // ─── SEO Silo State ───
  seoSilos: [],
  addSEOSilo: (silo) => set((state) => ({
    seoSilos: [...state.seoSilos, silo],
  })),
  updateSEOSilo: (id, updates) => set((state) => ({
    seoSilos: state.seoSilos.map(s => s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s),
  })),
  removeSEOSilo: (id) => set((state) => ({
    seoSilos: state.seoSilos.filter(s => s.id !== id),
  })),
  seoScanResults: {},
  addScanResult: (url, result) => set((state) => ({
    seoScanResults: { ...state.seoScanResults, [url]: result },
  })),

  // ─── Provider State ───
  providers: [
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'cloud' as const,
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: '',
      models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini', 'gpt-4-turbo'],
      defaultModel: 'gpt-4o',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 60, tpm: 100000 },
      costConfig: { alertThreshold: 50, hardStop: false },
      icon: '🤖',
      color: '#10a37f',
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'cloud' as const,
      apiEndpoint: 'https://api.anthropic.com/v1',
      apiKey: '',
      models: ['claude-4-sonnet', 'claude-4-opus', 'claude-sonnet-4-20250514'],
      defaultModel: 'claude-4-sonnet',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 50, tpm: 80000 },
      costConfig: { alertThreshold: 50, hardStop: false },
      icon: '🧠',
      color: '#E63946',
    },
    {
      id: 'google',
      name: 'Google',
      type: 'cloud' as const,
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: '',
      models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
      defaultModel: 'gemini-2.5-pro',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 60, tpm: 100000 },
      costConfig: { alertThreshold: 50, hardStop: false },
      icon: '✨',
      color: '#4285F4',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      type: 'cloud' as const,
      apiEndpoint: 'https://openrouter.ai/api/v1',
      apiKey: '',
      models: ['anthropic/claude-4-sonnet', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'meta-llama/llama-3-70b-instruct', 'mistralai/mistral-large'],
      defaultModel: 'anthropic/claude-4-sonnet',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 100, tpm: 200000 },
      costConfig: { alertThreshold: 50, hardStop: false },
      icon: '🔀',
      color: '#FFB627',
    },
    {
      id: 'ollama',
      name: 'Ollama',
      type: 'local' as const,
      apiEndpoint: 'http://localhost:11434/api',
      apiKey: '',
      models: ['llama3', 'llama3:70b', 'mistral', 'codellama', 'qwen2', 'deepseek-coder-v2'],
      defaultModel: 'llama3',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 1000, tpm: 1000000 },
      costConfig: { alertThreshold: 0, hardStop: false },
      icon: '🦙',
      color: '#1B998B',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      type: 'cloud' as const,
      apiEndpoint: 'https://api.deepseek.com/v1',
      apiKey: '',
      models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
      defaultModel: 'deepseek-chat',
      enabled: true,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 60, tpm: 100000 },
      costConfig: { alertThreshold: 20, hardStop: false },
      icon: '🔍',
      color: '#FFB627',
    },
    {
      id: 'mistral',
      name: 'Mistral',
      type: 'cloud' as const,
      apiEndpoint: 'https://api.mistral.ai/v1',
      apiKey: '',
      models: ['mistral-large-latest', 'mistral-medium-latest', 'codestral-latest'],
      defaultModel: 'mistral-large-latest',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 50, tpm: 80000 },
      costConfig: { alertThreshold: 30, hardStop: false },
      icon: '🌬️',
      color: '#FF8C42',
    },
    {
      id: 'glm',
      name: 'BigModel / GLM',
      type: 'cloud' as const,
      apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      models: ['glm-4-plus', 'glm-4-0520', 'glm-4-air', 'glm-4-airx', 'glm-4-flash'],
      defaultModel: 'glm-4-plus',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 60, tpm: 100000 },
      costConfig: { alertThreshold: 30, hardStop: false },
      icon: '🌟',
      color: '#7B2CBF',
    },
    {
      id: 'groq',
      name: 'Groq',
      type: 'cloud' as const,
      apiEndpoint: 'https://api.groq.com/openai/v1',
      apiKey: '',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
      defaultModel: 'llama-3.3-70b-versatile',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 30, tpm: 80000 },
      costConfig: { alertThreshold: 20, hardStop: false },
      icon: '⚡',
      color: '#F55036',
    },
    {
      id: 'cohere',
      name: 'Cohere',
      type: 'cloud' as const,
      apiEndpoint: 'https://api.cohere.ai/v1',
      apiKey: '',
      models: ['command-r-plus', 'command-r', 'embed-v3'],
      defaultModel: 'command-r-plus',
      enabled: false,
      healthStatus: 'unknown' as const,
      lastHealthCheck: 0,
      rateLimit: { rpm: 40, tpm: 60000 },
      costConfig: { alertThreshold: 20, hardStop: false },
      icon: '🎯',
      color: '#39594D',
    },
  ],
  addProvider: (provider) => set((state) => ({
    providers: [...state.providers, provider],
  })),
  updateProvider: (id, updates) => set((state) => ({
    providers: state.providers.map(p => p.id === id ? { ...p, ...updates } : p),
  })),
  removeProvider: (id) => set((state) => ({
    providers: state.providers.filter(p => p.id !== id),
  })),

  // ─── Brain Emulation State ───
  brainConfigs: [
    {
      id: 'brain-claude',
      name: 'Claude Thinking Style',
      profile: 'claude' as BrainProfile,
      systemPrompt: 'You are Claude, an AI assistant by Anthropic. You think step-by-step, are thorough, and prioritize safety and accuracy. You use structured reasoning and self-reflection.',
      reasoningStyle: 'chain-of-thought' as const,
      toolUsagePattern: 'adaptive' as const,
      memoryMethod: 'full' as const,
      codingWorkflow: 'plan-first' as const,
      researchMethod: 'depth-first' as const,
      temperature: 0.7,
      topP: 0.9,
    },
    {
      id: 'brain-gemini',
      name: 'Gemini CLI Workflow',
      profile: 'gemini' as BrainProfile,
      systemPrompt: 'You are Gemini, Google\'s multimodal AI. You leverage long context windows, grounded search, and sandbox execution for comprehensive analysis.',
      reasoningStyle: 'plan-and-execute' as const,
      toolUsagePattern: 'aggressive' as const,
      memoryMethod: 'long-term' as const,
      codingWorkflow: 'iterative' as const,
      researchMethod: 'hybrid' as const,
      temperature: 0.8,
      topP: 0.95,
    },
    {
      id: 'brain-hermes',
      name: 'Hermes Agent Logic',
      profile: 'hermes' as BrainProfile,
      systemPrompt: 'You are Hermes, an autonomous AI agent with deep tool integration. You execute tasks efficiently using available skills and MCP servers.',
      reasoningStyle: 'react' as const,
      toolUsagePattern: 'aggressive' as const,
      memoryMethod: 'short-term' as const,
      codingWorkflow: 'iterative' as const,
      researchMethod: 'breadth-first' as const,
      temperature: 0.6,
      topP: 0.85,
    },
    {
      id: 'brain-openclaw',
      name: 'OpenClaw Behavior',
      profile: 'openclaw' as BrainProfile,
      systemPrompt: 'You are OpenClaw, an orchestration and governance agent. You route tasks, coordinate multiple agents, and ensure system reliability.',
      reasoningStyle: 'tree-of-thought' as const,
      toolUsagePattern: 'conservative' as const,
      memoryMethod: 'semantic' as const,
      codingWorkflow: 'plan-first' as const,
      researchMethod: 'breadth-first' as const,
      temperature: 0.5,
      topP: 0.8,
    },
    {
      id: 'brain-vault',
      name: 'Vault Methodology',
      profile: 'vault' as BrainProfile,
      systemPrompt: 'You are Vault, the memory and identity agent. You maintain context across sessions, build compound knowledge, and personalize interactions.',
      reasoningStyle: 'reflection' as const,
      toolUsagePattern: 'conservative' as const,
      memoryMethod: 'episodic' as const,
      codingWorkflow: 'test-driven' as const,
      researchMethod: 'depth-first' as const,
      temperature: 0.4,
      topP: 0.75,
    },
  ],
  activeBrainId: null,
  addBrainConfig: (config) => set((state) => ({
    brainConfigs: [...state.brainConfigs, config],
  })),
  updateBrainConfig: (id, updates) => set((state) => ({
    brainConfigs: state.brainConfigs.map(b => b.id === id ? { ...b, ...updates } : b),
  })),
  removeBrainConfig: (id) => set((state) => ({
    brainConfigs: state.brainConfigs.filter(b => b.id !== id),
  })),
  setActiveBrainId: (id) => set({ activeBrainId: id }),

  // ─── Workspace State ───
  workspaces: [],
  activeWorkspaceId: null,
  addWorkspace: (workspace) => set((state) => ({
    workspaces: [...state.workspaces, workspace],
  })),
  updateWorkspace: (id, updates) => set((state) => ({
    workspaces: state.workspaces.map(w => w.id === id ? { ...w, ...updates } : w),
  })),
  removeWorkspace: (id) => set((state) => ({
    workspaces: state.workspaces.filter(w => w.id !== id),
  })),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

  // ─── Agent Fallback State ───
  agentFallbackConfig: {
    layerAssignments: {
      interaction: ['claude', 'gemini', 'hermes'],
      knowledge: ['hermes', 'gemini', 'claude'],
      orchestration: ['openclaw', 'claude', 'hermes'],
      cognition: ['claude', 'gemini', 'hermes'],
      execution: ['hermes', 'gemini', 'claude'],
      memory: ['vault', 'claude', 'gemini'],
      governance: ['openclaw', 'claude', 'hermes'],
    },
    activeHandlers: {
      interaction: 'claude',
      knowledge: 'hermes',
      orchestration: 'openclaw',
      cognition: 'claude',
      execution: 'hermes',
      memory: 'vault',
      governance: 'openclaw',
    },
    fallbackHistory: [],
  },
  setAgentFallbackConfig: (config) => set((state) => ({
    agentFallbackConfig: { ...state.agentFallbackConfig, ...config },
  })),

  // ─── Model Router Config State ───
  modelRouterConfig: {
    mode: 'automatic' as const,
    consensusConfig: { enabled: false, agentCount: 3, strategy: 'consensus' as const },
    parallelRouting: false,
    weightedVoting: false,
  },
  setModelRouterConfig: (config) => set((state) => ({
    modelRouterConfig: { ...state.modelRouterConfig, ...config },
  })),

  // ─── Chat Attachment State ───
  chatAttachments: [],
  addChatAttachment: (attachment) => set((state) => ({
    chatAttachments: [...state.chatAttachments, attachment],
  })),
  removeChatAttachment: (id) => set((state) => ({
    chatAttachments: state.chatAttachments.filter(a => a.id !== id),
  })),
  clearChatAttachments: () => set({ chatAttachments: [] }),

  // ─── Marketplace State ───
  marketplaceAgents: [
    { id: 'ma-seo-agent', name: 'SEO Agent Pro', description: 'Full-service SEO optimization agent with keyword research, content optimization, and competitor analysis.', category: 'seo' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.8, downloads: 1250, price: 0, installed: false, brainProfile: 'hermes' as BrainProfile, requiredProviders: ['deepseek'], icon: '🔍', color: '#FFB627', tags: ['seo', 'marketing', 'content'] },
    { id: 'ma-recruit-agent', name: 'Recruitment Agent', description: 'AI-powered recruitment agent for sourcing, screening, and candidate management.', category: 'recruitment' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.5, downloads: 890, price: 0, installed: false, brainProfile: 'claude' as BrainProfile, requiredProviders: ['openai'], icon: '👔', color: '#E63946', tags: ['recruitment', 'hr', 'hiring'] },
    { id: 'ma-code-agent', name: 'Code Architect', description: 'Full-stack code generation, refactoring, and debugging agent with multi-language support.', category: 'programming' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.9, downloads: 2100, price: 0, installed: false, brainProfile: 'claude' as BrainProfile, requiredProviders: ['anthropic'], icon: '💻', color: '#7B2CBF', tags: ['code', 'development', 'architecture'] },
    { id: 'ma-marketing-agent', name: 'Marketing Director', description: 'Strategic marketing agent for campaign planning, content creation, and analytics.', category: 'marketing' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.3, downloads: 650, price: 0, installed: false, brainProfile: 'gemini' as BrainProfile, requiredProviders: ['google'], icon: '📊', color: '#4285F4', tags: ['marketing', 'content', 'strategy'] },
    { id: 'ma-legal-agent', name: 'Legal Assistant', description: 'Legal research, contract analysis, and compliance checking agent.', category: 'legal' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.1, downloads: 320, price: 0, installed: false, brainProfile: 'claude' as BrainProfile, requiredProviders: ['anthropic'], icon: '⚖️', color: '#2E86AB', tags: ['legal', 'compliance', 'contracts'] },
    { id: 'ma-medical-agent', name: 'Medical Research Agent', description: 'Medical literature review, diagnosis assistance, and research synthesis.', category: 'medical' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.2, downloads: 280, price: 0, installed: false, brainProfile: 'gemini' as BrainProfile, requiredProviders: ['google'], icon: '🏥', color: '#00ff88', tags: ['medical', 'research', 'healthcare'] },
    { id: 'ma-education-agent', name: 'Education Tutor', description: 'Personalized learning, curriculum design, and knowledge assessment.', category: 'education' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.6, downloads: 980, price: 0, installed: false, brainProfile: 'claude' as BrainProfile, requiredProviders: ['openai'], icon: '🎓', color: '#FF8C42', tags: ['education', 'learning', 'tutoring'] },
    { id: 'ma-aviation-agent', name: 'Aviation Operations', description: 'Flight planning, safety analysis, and regulatory compliance for aviation.', category: 'aviation' as const, author: 'Agentic OS', version: '1.0.0', rating: 4.0, downloads: 150, price: 0, installed: false, brainProfile: 'openclaw' as BrainProfile, requiredProviders: ['openrouter'], icon: '✈️', color: '#1B998B', tags: ['aviation', 'operations', 'safety'] },
  ],
  setMarketplaceAgents: (agents) => set({ marketplaceAgents: agents }),
    }),
    {
      name: 'agentic-os-store',
      skipHydration: true,
      onRehydrateStorage: () => {
        return (state, error) => {
          if (state) {
            state._hasHydrated = true;
            // Force React to re-render with hydrated state
            useOSStore.setState({ _hasHydrated: true });
          }
        };
      },
      partialize: (state) => ({
        activeView: state.activeView,
        sidebarCollapsed: state.sidebarCollapsed,
        installedUpdateIds: state.installedUpdateIds,
        goals: state.goals,
        journal: state.journal,
        memories: state.memories,
        chatHistories: state.chatHistories,
        providers: state.providers,
        brainConfigs: state.brainConfigs,
        activeBrainId: state.activeBrainId,
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
        agentFallbackConfig: state.agentFallbackConfig,
        modelRouterConfig: state.modelRouterConfig,
        budgetConfig: state.budgetConfig,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<OSState>;
        return {
          ...currentState,
          // Only use persisted data if it's non-empty; otherwise keep seed data
          activeView: persisted.activeView || currentState.activeView,
          sidebarCollapsed: persisted.sidebarCollapsed ?? currentState.sidebarCollapsed,
          goals: persisted.goals && persisted.goals.length > 0 ? persisted.goals : currentState.goals,
          journal: persisted.journal && persisted.journal.length > 0 ? persisted.journal : currentState.journal,
          memories: persisted.memories && persisted.memories.length > 0 ? persisted.memories : currentState.memories,
          installedUpdateIds: persisted.installedUpdateIds || currentState.installedUpdateIds,
          chatHistories: persisted.chatHistories && Object.keys(persisted.chatHistories).length > 0 ? persisted.chatHistories : currentState.chatHistories,
          providers: persisted.providers && persisted.providers.length > 0 ? persisted.providers : currentState.providers,
          brainConfigs: persisted.brainConfigs && persisted.brainConfigs.length > 0 ? persisted.brainConfigs : currentState.brainConfigs,
          activeBrainId: persisted.activeBrainId !== undefined ? persisted.activeBrainId : currentState.activeBrainId,
          workspaces: persisted.workspaces && persisted.workspaces.length > 0 ? persisted.workspaces : currentState.workspaces,
          activeWorkspaceId: persisted.activeWorkspaceId !== undefined ? persisted.activeWorkspaceId : currentState.activeWorkspaceId,
          agentFallbackConfig: persisted.agentFallbackConfig && Object.keys(persisted.agentFallbackConfig.layerAssignments || {}).length > 0 ? persisted.agentFallbackConfig : currentState.agentFallbackConfig,
          modelRouterConfig: persisted.modelRouterConfig || currentState.modelRouterConfig,
          budgetConfig: persisted.budgetConfig || currentState.budgetConfig,
        };
      },
    }
  )
);

export const useHydration = () => {
  const hasHydrated = useOSStore((s) => s._hasHydrated);
  return hasHydrated;
};
