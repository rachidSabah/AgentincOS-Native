'use client';

import { create } from 'zustand';

export type AgentStatus = 'live' | 'degraded' | 'offline' | 'booting';
export type AgentType = 'claude' | 'openclaw' | 'hermes' | 'custom';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
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
  uptime: string;
}

export interface SelfData {
  goals: string[];
  journal: string[];
  memory: string[];
}

interface OSState {
  activeView: string;
  setActiveView: (view: string) => void;
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  systemMetrics: SystemMetrics;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  selfData: SelfData;
  setSelfData: (data: SelfData) => void;
  controlRoomAgent: string | null;
  setControlRoomAgent: (id: string | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useOSStore = create<OSState>((set) => ({
  activeView: 'mission-control',
  setActiveView: (view) => set({ activeView: view }),

  agents: [
    {
      id: 'claude',
      name: 'Claude',
      type: 'claude',
      status: 'live',
      description: 'Direct streaming link to Claude Code. Full throttle MCMC, digital.',
      uptime: '4d 12h 33m',
      latency: 142,
      requests: 12847,
      model: 'claude-3.5-sonnet',
      color: '#00ffff',
      tags: ['VISION', 'LATCHED'],
      lastActive: '2s ago',
    },
    {
      id: 'openclaw',
      name: 'OpenClaw',
      type: 'openclaw',
      status: 'live',
      description: 'Local agent gateway. Chat one-on-one or open the control room.',
      uptime: '2d 8h 15m',
      latency: 89,
      requests: 8932,
      model: 'multi-model',
      color: '#9d4edd',
      tags: ['AGENTS', 'SESSIONS'],
      lastActive: '5s ago',
    },
    {
      id: 'hermes',
      name: 'Hermes',
      type: 'hermes',
      status: 'live',
      description: 'Multi Research Agent. Tool calls, carbon, model, plugins. 2,550+ skills.',
      uptime: '6d 1h 45m',
      latency: 203,
      requests: 24531,
      model: 'hermes-3',
      color: '#9d4edd',
      tags: ['MODEL', 'POWER'],
      lastActive: '1s ago',
    },
    {
      id: 'latency-monitor',
      name: 'Latency',
      type: 'custom',
      status: 'degraded',
      description: 'Combined p99 latency monitor across all agent endpoints.',
      uptime: '12d 5h 20m',
      latency: 456,
      requests: 46289,
      color: '#ffaa00',
      tags: ['P99', 'NETWORK'],
      lastActive: '0s ago',
    },
  ],
  setAgents: (agents) => set({ agents }),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  logs: [
    { id: '1', timestamp: '04:48:12', agent: 'Claude', level: 'success', message: 'Stream connected — MCMC mode active' },
    { id: '2', timestamp: '04:48:10', agent: 'Hermes', level: 'info', message: 'Skill registry synced: 2,550 skills available' },
    { id: '3', timestamp: '04:48:08', agent: 'OpenClaw', level: 'info', message: 'Agent gateway heartbeat received' },
    { id: '4', timestamp: '04:47:55', agent: 'Latency', level: 'warn', message: 'p99 latency exceeded 400ms threshold' },
    { id: '5', timestamp: '04:47:42', agent: 'Hermes', level: 'success', message: 'MCP server connected (stdio transport)' },
    { id: '6', timestamp: '04:47:30', agent: 'Claude', level: 'info', message: 'Vision processing pipeline activated' },
    { id: '7', timestamp: '04:47:15', agent: 'OpenClaw', level: 'success', message: 'New session created: agent-deploy-0x7f' },
    { id: '8', timestamp: '04:46:58', agent: 'Hermes', level: 'info', message: 'Browser automation engine initialized (Chromium/CDP)' },
    { id: '9', timestamp: '04:46:40', agent: 'System', level: 'info', message: 'Memory provider synced: MEMORY.md updated' },
    { id: '10', timestamp: '04:46:22', agent: 'Hermes', level: 'warn', message: 'TTS provider fallback: local whisper activated' },
  ],
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs].slice(0, 50) })),

  systemMetrics: {
    cpu: 34,
    memory: 67,
    network: 82,
    disk: 45,
    activeAgents: 3,
    totalRequests: 92599,
    avgLatency: 178,
    uptime: '12d 5h 20m',
  },
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),

  selfData: {
    goals: [
      'Maintain 99.9% agent uptime across all endpoints',
      'Reduce p99 latency below 200ms',
      'Expand Hermes skill registry to 3,000+',
      'Enable cross-agent memory sharing protocol',
      'Deploy autonomous task delegation pipeline',
    ],
    journal: [
      'Completed Hermes MCP integration — all stdio transports verified',
      'OpenClaw session management refactored for horizontal scaling',
      'Claude vision pipeline upgraded to support multi-frame analysis',
      'Latency monitor flagged — investigating east-region endpoint',
    ],
    memory: [
      'hermes.config.yaml → ~/.hermes/config.yaml (secrets in .env)',
      'Hermes supports 20+ LLM providers, model-agnostic architecture',
      'OpenClaw gateway protocol v2.1 — backward compatible',
      'Claude MCMC mode requires 64K+ token context window',
      'Browser automation: cloud (Browserbase) / local (Chromium/CDP)',
    ],
  },
  setSelfData: (data) => set({ selfData: data }),

  controlRoomAgent: null,
  setControlRoomAgent: (id) => set({ controlRoomAgent: id }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
