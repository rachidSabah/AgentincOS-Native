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
  layer: number;
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
  controlRoomAgent: string | null;
  setControlRoomAgent: (id: string | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  selfSearchQuery: string;
  setSelfSearchQuery: (q: string) => void;
}

export const useOSStore = create<OSState>((set) => ({
  activeView: 'mission-control',
  setActiveView: (view) => set({ activeView: view }),

  stackLayers: [
    {
      id: 'intelligence',
      number: 1,
      name: 'Intelligence',
      role: 'CEO — Thinking, Planning, Decisions',
      agent: 'claude',
      description: 'Claude is the CEO of the stack. It\'s the thinking, planning and decision-making layer. Wired directly into Agent OS with full tool access, MCPs attached, and the ability to write and execute code. Anything that needs reasoning gets routed here first.',
      color: '#00ffff',
      glowColor: 'rgba(0,255,255,0.15)',
      icon: '🧠',
      isUnlocked: true,
    },
    {
      id: 'execution',
      number: 2,
      name: 'Execution',
      role: 'Router — Multi-Agent Coordination',
      agent: 'openclaw',
      description: 'OpenClaw is the local agent gateway. It routes tasks between agents, manages sessions, and handles multi-agent coordination. Like the router in your house — everything connects through it, and nothing talks to anything else without going through OpenClaw first.',
      color: '#9d4edd',
      glowColor: 'rgba(157,78,221,0.15)',
      icon: '🔀',
      isUnlocked: true,
    },
    {
      id: 'research',
      number: 3,
      name: 'Research',
      role: 'Worker — Tool Calls, Skills, Workflows',
      agent: 'hermes',
      description: 'Hermes runs the tool calls, the Kanban task lists, the skills and plugins, the multi-step workflows on schedule, and the deeper research tasks like competitor analysis. This is the layer that goes off and does the work in the background while Claude plans and OpenClaw routes.',
      color: '#00ff88',
      glowColor: 'rgba(0,255,136,0.15)',
      icon: '🔬',
      isUnlocked: true,
    },
    {
      id: 'self',
      number: 4,
      name: 'Self',
      role: 'Identity — Obsidian Vault + OMI',
      agent: 'vault',
      description: 'OMI records your screen and microphone all day, takes notes on what you\'re working on, and exports everything to your Obsidian vault. That vault becomes a continuously growing knowledge base about who you are, what your goals are, who your team is, and how your business actually runs. Every agent in the stack pulls from this vault for personalised, context-rich output.',
      color: '#ffaa00',
      glowColor: 'rgba(255,170,0,0.15)',
      icon: '💎',
      isUnlocked: true,
    },
  ],

  agents: [
    {
      id: 'claude',
      name: 'Claude',
      layer: 1,
      status: 'live',
      description: 'The CEO of the stack. Thinking, planning, and decision-making. Full tool access, MCPs attached, code execution.',
      uptime: '4d 12h 33m',
      latency: 142,
      requests: 12847,
      model: 'claude-3.5-sonnet',
      color: '#00ffff',
      tags: ['REASONING', 'MCP', 'CODE'],
      lastActive: '2s ago',
    },
    {
      id: 'openclaw',
      name: 'OpenClaw',
      layer: 2,
      status: 'live',
      description: 'The router. Routes tasks between agents, manages sessions, handles multi-agent coordination. Nothing talks without going through OpenClaw first.',
      uptime: '2d 8h 15m',
      latency: 89,
      requests: 8932,
      model: 'multi-model',
      color: '#9d4edd',
      tags: ['ROUTING', 'SESSIONS', 'COORDINATION'],
      lastActive: '5s ago',
    },
    {
      id: 'hermes',
      name: 'Hermes',
      layer: 3,
      status: 'live',
      description: 'The worker. Tool calls, Kanban, skills, plugins, scheduled workflows, competitor analysis. Goes off and does the work in the background.',
      uptime: '6d 1h 45m',
      latency: 203,
      requests: 24531,
      model: 'hermes-3',
      color: '#00ff88',
      tags: ['SKILLS', 'KANBAN', 'RESEARCH'],
      lastActive: '1s ago',
    },
    {
      id: 'vault',
      name: 'Self Vault',
      layer: 4,
      status: 'live',
      description: 'Obsidian Vault + OMI. Continuously growing knowledge base. Every agent pulls from this for personalised, context-rich output.',
      uptime: '30d 4h 12m',
      latency: 34,
      requests: 89234,
      model: 'obsidian+omi',
      color: '#ffaa00',
      tags: ['IDENTITY', 'COMPOUND', 'VAULT'],
      lastActive: '0s ago',
    },
  ],

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  logs: [
    { id: '1', timestamp: '04:48:12', agent: 'Claude', layer: 1, level: 'success', message: 'Reasoning pipeline active — CEO layer online' },
    { id: '2', timestamp: '04:48:10', agent: 'Hermes', layer: 3, level: 'info', message: 'Skill registry synced: 2,550 skills available for research tasks' },
    { id: '3', timestamp: '04:48:08', agent: 'OpenClaw', layer: 2, level: 'info', message: 'Agent gateway routing table refreshed — 3 agents connected' },
    { id: '4', timestamp: '04:47:55', agent: 'Self Vault', layer: 4, level: 'success', message: 'OMI recording exported to Obsidian vault — 47 new notes today' },
    { id: '5', timestamp: '04:47:42', agent: 'Hermes', layer: 3, level: 'info', message: 'Kanban task completed: competitor-analysis-q2' },
    { id: '6', timestamp: '04:47:30', agent: 'Claude', layer: 1, level: 'info', message: 'Decision routed to Hermes via OpenClaw: deep-dive research' },
    { id: '7', timestamp: '04:47:15', agent: 'OpenClaw', layer: 2, level: 'success', message: 'Session coordination: Claude → Hermes handoff complete' },
    { id: '8', timestamp: '04:46:58', agent: 'Self Vault', layer: 4, level: 'info', message: 'Goal progress updated: 3 goals advanced this week' },
    { id: '9', timestamp: '04:46:40', agent: 'Hermes', layer: 3, level: 'warn', message: 'Scheduled workflow delayed: browser pool at capacity' },
    { id: '10', timestamp: '04:46:22', agent: 'Claude', layer: 1, level: 'info', message: 'Pulled context from vault — 23 relevant memory entries loaded' },
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
    { id: 'g2', title: 'Reduce p99 latency below 200ms across all layers', progress: 45, timeline: 'this week', category: 'Performance' },
    { id: 'g3', title: 'Expand Hermes skill registry to 3,000+', progress: 85, timeline: 'this quarter', category: 'Research' },
    { id: 'g4', title: 'Enable cross-agent memory sharing protocol', progress: 30, timeline: 'this month', category: 'Infrastructure' },
    { id: 'g5', title: 'Deploy autonomous task delegation pipeline', progress: 60, timeline: 'this quarter', category: 'Automation' },
    { id: 'g6', title: 'Grow Obsidian vault to 15K+ entries', progress: 91, timeline: 'this month', category: 'Self' },
  ],

  journal: [
    { id: 'j1', date: 'Today', type: 'voice', content: 'Completed Hermes MCP integration — all stdio transports verified. Routed through OpenClaw, no conflicts. The stack is compounding beautifully.', source: 'OMI' },
    { id: 'j2', date: 'Today', type: 'text', content: 'OpenClaw session management refactored for horizontal scaling. Now handles 3x concurrent agent sessions without degradation.', source: 'Manual' },
    { id: 'j3', date: 'Yesterday', type: 'voice', content: 'Claude vision pipeline upgraded to support multi-frame analysis. The CEO layer can now reason over video streams. Massive unlock for research delegation.', source: 'OMI' },
    { id: 'j4', date: 'Yesterday', type: 'text', content: 'Vault crossed 12,000 entries. The Self layer is starting to compound — agents are giving noticeably better advice. Day one this was good. Day thirty is wild.', source: 'Manual' },
    { id: 'j5', date: '2 days ago', type: 'voice', content: 'Set up OMI continuous recording. Screen + mic all day, auto-export to Obsidian. The knowledge base grows on its own now. That\'s the lever.', source: 'OMI' },
  ],

  memories: [
    { id: 'm1', timestamp: '2 min ago', content: 'Hermes config: ~/.hermes/config.yaml (secrets in .env). Supports 20+ LLM providers, model-agnostic architecture.', agent: 'Hermes', tags: ['config', 'setup'] },
    { id: 'm2', timestamp: '15 min ago', content: 'OpenClaw gateway protocol v2.1 — backward compatible. All agent routing must go through OpenClaw. No direct agent-to-agent communication.', agent: 'OpenClaw', tags: ['protocol', 'routing'] },
    { id: 'm3', timestamp: '1h ago', content: 'Claude MCMC mode requires 64K+ token context window. Vision pipeline active. Full code execution capabilities enabled.', agent: 'Claude', tags: ['compute', 'vision'] },
    { id: 'm4', timestamp: '3h ago', content: 'Browser automation: cloud (Browserbase) / local (Chromium/CDP). Hermes uses this for competitor analysis and web research tasks.', agent: 'Hermes', tags: ['browser', 'research'] },
    { id: 'm5', timestamp: '6h ago', content: 'Vault structure: Goals/ tracked weekly, Journal/ daily entries, Memory/ auto-saved from every chat. All agents read from vault for context.', agent: 'Self Vault', tags: ['vault', 'structure'] },
    { id: 'm6', timestamp: '1d ago', content: 'The difference between generic AI and personalised AI is the Self layer. Without it, agents give generic answers. With it, they give advice as if they\'ve worked at your company for two years.', agent: 'Self Vault', tags: ['insight', 'compound'] },
    { id: 'm7', timestamp: '2d ago', content: 'OMI records screen + mic all day → exports to Obsidian vault. This is what makes the system compound. Every day it knows more about you, your business, and your priorities.', agent: 'Self Vault', tags: ['omi', 'recording'] },
  ],

  controlRoomAgent: null,
  setControlRoomAgent: (id) => set({ controlRoomAgent: id }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  selfSearchQuery: '',
  setSelfSearchQuery: (q) => set({ selfSearchQuery: q }),
}));
