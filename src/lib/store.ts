'use client';

import { create } from 'zustand';

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
}

function generateActivityByHour(peakHour: number): number[] {
  const hours: number[] = [];
  for (let i = 0; i < 24; i++) {
    const dist = Math.abs(i - peakHour);
    const base = Math.max(5, 100 - dist * 12 + Math.random() * 20);
    hours.push(Math.round(base));
  }
  return hours;
}

export const useOSStore = create<OSState>((set) => ({
  activeView: 'mission-control',
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
      status: 'live',
      description: 'The CEO of the stack. Handles Interaction & Perception (L1) and Cognitive Reasoning (L4). Plans, evaluates, and decides with full tool access and code execution.',
      uptime: '4d 12h 33m',
      latency: 142,
      requests: 12847,
      model: 'claude-3.5-sonnet',
      color: '#E63946',
      tags: ['REASONING', 'MCP', 'CODE', 'PERCEPTION'],
      lastActive: '2s ago',
    },
    {
      id: 'openclaw',
      name: 'OpenClaw',
      layer: 3,
      layers: [3, 7],
      status: 'live',
      description: 'The router and governor. Handles Agent Orchestration (L3) and Governance (L7). Routes tasks, coordinates agents, and ensures system security and reliability.',
      uptime: '2d 8h 15m',
      latency: 89,
      requests: 8932,
      model: 'multi-model',
      color: '#E8751A',
      tags: ['ROUTING', 'GOVERNANCE', 'COORDINATION', 'SECURITY'],
      lastActive: '5s ago',
    },
    {
      id: 'hermes',
      name: 'Hermes',
      layer: 2,
      layers: [2, 5],
      status: 'live',
      description: 'The worker. Handles Knowledge Acquisition (L2) and Execution (L5). Researches, retrieves information, and takes action through tools, APIs, and workflows.',
      uptime: '6d 1h 45m',
      latency: 203,
      requests: 24531,
      model: 'hermes-3',
      color: '#FFB627',
      tags: ['SKILLS', 'RESEARCH', 'EXECUTION', 'KANBAN'],
      lastActive: '1s ago',
    },
    {
      id: 'vault',
      name: 'Self Vault',
      layer: 6,
      layers: [6],
      status: 'live',
      description: 'The identity. Handles Memory, Learning & Context (L6). OMI records + Obsidian vault create a continuously growing, compound knowledge base about you and your work.',
      uptime: '30d 4h 12m',
      latency: 34,
      requests: 89234,
      model: 'obsidian+omi',
      color: '#2E86AB',
      tags: ['IDENTITY', 'COMPOUND', 'VAULT', 'MEMORY'],
      lastActive: '0s ago',
    },
  ],

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  logs: [
    { id: '1', timestamp: '04:48:12', agent: 'Claude', layer: 4, level: 'success', message: 'Cognitive Reasoning pipeline active — CEO layer online' },
    { id: '2', timestamp: '04:48:10', agent: 'Hermes', layer: 2, level: 'info', message: 'Knowledge Acquisition: skill registry synced — 2,550 skills available' },
    { id: '3', timestamp: '04:48:08', agent: 'OpenClaw', layer: 3, level: 'info', message: 'Agent Orchestration: routing table refreshed — 4 agents connected' },
    { id: '4', timestamp: '04:47:55', agent: 'Self Vault', layer: 6, level: 'success', message: 'Memory layer: OMI recording exported — 47 new notes today' },
    { id: '5', timestamp: '04:47:42', agent: 'Hermes', layer: 5, level: 'info', message: 'Execution layer: Kanban task completed — competitor-analysis-q2' },
    { id: '6', timestamp: '04:47:30', agent: 'Claude', layer: 1, level: 'info', message: 'Interaction layer: multimodal input received — voice + screenshot' },
    { id: '7', timestamp: '04:47:15', agent: 'OpenClaw', layer: 7, level: 'success', message: 'Governance: session coordination complete — all permissions verified' },
    { id: '8', timestamp: '04:46:58', agent: 'Self Vault', layer: 6, level: 'info', message: 'Memory layer: goal progress updated — 3 goals advanced this week' },
    { id: '9', timestamp: '04:46:40', agent: 'Hermes', layer: 2, level: 'warn', message: 'Knowledge retrieval: browser pool at capacity — scheduling for off-peak' },
    { id: '10', timestamp: '04:46:22', agent: 'Claude', layer: 4, level: 'info', message: 'Cognitive Reasoning: pulled 23 memory entries for context-rich response' },
  ],
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs].slice(0, 50) })),

  systemMetrics: {
    cpu: 34,
    memory: 67,
    network: 82,
    disk: 45,
    activeAgents: 4,
    totalRequests: 92599,
    avgLatency: 178,
    vaultSize: 2.4,
    vaultEntries: 12847,
    compoundDays: 30,
  },
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),

  goals: [
    { id: 'g1', title: 'Ship Agent OS v2.0 to production', progress: 72, timeline: 'this month', category: 'Product' },
    { id: 'g2', title: 'Reduce p99 latency below 200ms across all 7 layers', progress: 45, timeline: 'this week', category: 'Performance' },
    { id: 'g3', title: 'Expand Hermes skill registry to 3,000+', progress: 85, timeline: 'this quarter', category: 'Research' },
    { id: 'g4', title: 'Enable cross-agent memory sharing protocol', progress: 30, timeline: 'this month', category: 'Infrastructure' },
    { id: 'g5', title: 'Deploy autonomous task delegation pipeline', progress: 60, timeline: 'this quarter', category: 'Automation' },
    { id: 'g6', title: 'Grow Obsidian vault to 15K+ entries', progress: 91, timeline: 'this month', category: 'Self' },
  ],

  journal: [
    { id: 'j1', date: 'Today', type: 'voice', content: 'Completed Hermes MCP integration — all stdio transports verified. Routed through OpenClaw, no conflicts. The stack is compounding beautifully.', source: 'OMI' },
    { id: 'j2', date: 'Today', type: 'text', content: 'OpenClaw session management refactored for horizontal scaling. Now handles 3x concurrent agent sessions without degradation.', source: 'Manual' },
    { id: 'j3', date: 'Yesterday', type: 'voice', content: 'Claude vision pipeline upgraded to support multi-frame analysis. The Cognition layer can now reason over video streams. Massive unlock for research delegation.', source: 'OMI' },
    { id: 'j4', date: 'Yesterday', type: 'text', content: 'Vault crossed 12,000 entries. The Memory layer is starting to compound — agents are giving noticeably better advice. Day one this was good. Day thirty is wild.', source: 'Manual' },
    { id: 'j5', date: '2 days ago', type: 'voice', content: 'Set up OMI continuous recording. Screen + mic all day, auto-export to Obsidian. The knowledge base grows on its own now. That\'s the lever.', source: 'OMI' },
  ],

  memories: [
    { id: 'm1', timestamp: '2 min ago', content: 'Hermes config: ~/.hermes/config.yaml (secrets in .env). Supports 20+ LLM providers, model-agnostic architecture.', agent: 'Hermes', tags: ['config', 'setup'] },
    { id: 'm2', timestamp: '15 min ago', content: 'OpenClaw gateway protocol v2.1 — backward compatible. All agent routing must go through OpenClaw. No direct agent-to-agent communication.', agent: 'OpenClaw', tags: ['protocol', 'routing'] },
    { id: 'm3', timestamp: '1h ago', content: 'Claude MCMC mode requires 64K+ token context window. Vision pipeline active. Full code execution capabilities enabled.', agent: 'Claude', tags: ['compute', 'vision'] },
    { id: 'm4', timestamp: '3h ago', content: 'Browser automation: cloud (Browserbase) / local (Chromium/CDP). Hermes uses this for competitor analysis and web research tasks.', agent: 'Hermes', tags: ['browser', 'research'] },
    { id: 'm5', timestamp: '6h ago', content: 'Vault structure: Goals/ tracked weekly, Journal/ daily entries, Memory/ auto-saved from every chat. All agents read from vault for context.', agent: 'Self Vault', tags: ['vault', 'structure'] },
    { id: 'm6', timestamp: '1d ago', content: 'The difference between generic AI and personalised AI is the Memory layer. Without it, agents give generic answers. With it, they give advice as if they\'ve worked at your company for two years.', agent: 'Self Vault', tags: ['insight', 'compound'] },
    { id: 'm7', timestamp: '2d ago', content: 'OMI records screen + mic all day → exports to Obsidian vault. This is what makes the system compound. Every day it knows more about you, your business, and your priorities.', agent: 'Self Vault', tags: ['omi', 'recording'] },
  ],

  addMemory: (memory) => set((state) => ({ memories: [memory, ...state.memories] })),

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

  selectedAgentId: 'hermes',
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  agentAnalytics: {
    claude: {
      totalSessions: 847,
      totalTokens: 2400000,
      totalToolCalls: 4231,
      modelsUsed: ['claude-3.5-sonnet', 'claude-3-opus'],
      activityByHour: generateActivityByHour(10),
      peakHour: 10,
      avgResponseTime: 1200,
      lastSessionStart: Date.now() - 120000,
    },
    openclaw: {
      totalSessions: 523,
      totalTokens: 1100000,
      totalToolCalls: 8234,
      modelsUsed: ['multi-model', 'gpt-4', 'claude-3-sonnet'],
      activityByHour: generateActivityByHour(14),
      peakHour: 14,
      avgResponseTime: 800,
      lastSessionStart: Date.now() - 300000,
    },
    hermes: {
      totalSessions: 1203,
      totalTokens: 5600000,
      totalToolCalls: 18432,
      modelsUsed: ['hermes-3', 'gpt-4', 'claude-3.5-sonnet'],
      activityByHour: generateActivityByHour(11),
      peakHour: 11,
      avgResponseTime: 2100,
      lastSessionStart: Date.now() - 60000,
    },
    vault: {
      totalSessions: 892,
      totalTokens: 800000,
      totalToolCalls: 342,
      modelsUsed: ['obsidian+omi', 'embedding-ada-002'],
      activityByHour: generateActivityByHour(9),
      peakHour: 9,
      avgResponseTime: 300,
      lastSessionStart: Date.now() - 5000,
    },
  },
  setAgentAnalytics: (agentId, analytics) => set((state) => ({
    agentAnalytics: {
      ...state.agentAnalytics,
      [agentId]: { ...state.agentAnalytics[agentId], ...analytics },
    },
  })),

  hermesSkills: [],
  setHermesSkills: (skills) => set({ hermesSkills: skills }),

  kanbanTasks: [
    { id: 'kt1', title: 'Deploy Hermes v3.2 to production', status: 'in_progress', priority: 'high', assignedTo: 'hermes', createdAt: Date.now() - 86400000 },
    { id: 'kt2', title: 'Implement cross-agent memory sharing', status: 'todo', priority: 'high', assignedTo: 'openclaw', createdAt: Date.now() - 172800000 },
    { id: 'kt3', title: 'Optimize vault query latency', status: 'done', priority: 'medium', assignedTo: 'vault', createdAt: Date.now() - 259200000 },
    { id: 'kt4', title: 'Research competitor AI stacks', status: 'in_progress', priority: 'medium', assignedTo: 'hermes', createdAt: Date.now() - 43200000 },
    { id: 'kt5', title: 'Review Claude MCP integration docs', status: 'todo', priority: 'low', assignedTo: 'claude', createdAt: Date.now() - 345600000 },
    { id: 'kt6', title: 'Set up OMI continuous recording', status: 'done', priority: 'medium', assignedTo: 'vault', createdAt: Date.now() - 432000000 },
  ],
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
  securityRiskScore: 15,
  setSecurityRiskScore: (score) => set({ securityRiskScore: score }),

  // ─── Model Router State ───
  availableModels: [],
  setAvailableModels: (models) => set({ availableModels: models }),

  // ─── Reports State ───
  reports: [],
  addReport: (report) => set((state) => ({
    reports: [report, ...state.reports].slice(0, 50),
  })),
}));
