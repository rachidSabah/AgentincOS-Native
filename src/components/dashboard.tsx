'use client';

import { useOSStore, useHydration } from '@/lib/store';
import type { Agent, MemoryEntry, ExecutionLog, ProviderConfig } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Cpu, Network, HardDrive, Activity, Radio, Zap, ChevronDown,
  Menu, Command, Shield, Search, Target, BookOpen, Database, Mic,
  FileText, TrendingUp, Eye, PenLine, Sparkles, Crown,
  Route, ArrowRight, MessageSquare, Terminal,
  Globe, Layers, Clock, Users, Wrench, Lock, Lightbulb,
  BarChart3, Moon, Scale, ArrowRightLeft, AlertTriangle, Server,
  Link2, Bot, Plus, X, Check, Trash2,
  FolderOpen, Store, Paperclip,
  Settings2, Briefcase, Cog, FileCode2, Play, Pause,
  CircleDot, Workflow, Gauge, ShieldAlert, ScrollText,
  Gem, Hexagon, Webhook, Plug, Type, GitBranch,
  LayoutDashboard, BrainCircuit, Box, Boxes, Share2,
  Atom, Fingerprint, Scan, CircuitBoard, Cable,
  MonitorSmartphone, Siren,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════
// LOCAL TYPES (no external agent framework dependencies)
// ═══════════════════════════════════════════════════════════

export interface StackLayer {
  id: string;
  number: number;
  name: string;
  color: string;
  flowLabel: string;
  flowIcon: string;
  agent: string;
  whatItDoes: string;
  keyCapabilities: string[];
  description: string;
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
  subtasks: { id: string; title: string; completed: boolean }[];
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: 'inspired' | 'focused' | 'reflective' | 'energized' | 'calm';
  tags: string[];
  createdAt: number;
  agent: string;
  type: 'reflection' | 'insight' | 'decision' | 'milestone';
}

// ─── Static layer data (Brain Layer is primary) ───
const stackLayers: StackLayer[] = [
  {
    id: 'brain', number: 1, name: 'Brain Layer', color: '#9d4edd',
    flowLabel: 'Intelligence', flowIcon: '🧠', agent: 'Brain',
    whatItDoes: 'The native intelligence of Agentic OS. Plans, reasons, delegates, coordinates. Provider-independent.',
    keyCapabilities: ['Planning', 'Reasoning', 'Delegation', 'Coordination', 'Memory Retrieval', 'Tool Selection'],
    description: 'The Brain Layer is the primary intelligence. It orchestrates all operations regardless of which LLM provider is active.',
  },
  {
    id: 'providers', number: 2, name: 'Provider Layer', color: '#00ffff',
    flowLabel: 'Providers', flowIcon: '🔌', agent: 'Router',
    whatItDoes: 'Manages connections to LLM providers. Providers are interchangeable execution engines.',
    keyCapabilities: ['API Management', 'Health Monitoring', 'Rate Limiting', 'Cost Tracking', 'Failover', 'Load Balancing'],
    description: 'External models are interchangeable execution engines. The Provider Layer manages connections and routing.',
  },
  {
    id: 'agents', number: 3, name: 'Agent Layer', color: '#00ff88',
    flowLabel: 'Agents', flowIcon: '🤖', agent: 'Agents',
    whatItDoes: 'Specialized agents for code, research, tasks, and more. Each agent uses the Brain for orchestration.',
    keyCapabilities: ['Code Generation', 'Research', 'Task Execution', 'Swarm Intelligence', 'Agent Builder', 'Marketplace'],
    description: 'Agents are specialized workers that execute tasks using the Brain Layer for planning and reasoning.',
  },
  {
    id: 'knowledge', number: 4, name: 'Knowledge Layer', color: '#FFB627',
    flowLabel: 'Knowledge', flowIcon: '📚', agent: 'Knowledge',
    whatItDoes: 'Knowledge base, memory engine, knowledge graph, and RAG engine for persistent intelligence.',
    keyCapabilities: ['Knowledge Base', 'Memory Engine', 'Knowledge Graph', 'RAG Engine', 'Embeddings', 'Semantic Search'],
    description: 'The Knowledge Layer provides persistent intelligence through structured knowledge, memory, and retrieval.',
  },
  {
    id: 'execution', number: 5, name: 'Execution Layer', color: '#E8751A',
    flowLabel: 'Execution', flowIcon: '⚡', agent: 'Runner',
    whatItDoes: 'Workflows, automations, plugins, and prompts for task execution and automation.',
    keyCapabilities: ['Workflows', 'Automations', 'Plugins', 'Prompts', 'Webhooks', 'Sandbox Execution'],
    description: 'The Execution Layer handles workflow automation, plugin management, and task execution pipelines.',
  },
  {
    id: 'memory', number: 6, name: 'Memory Layer', color: '#2E86AB',
    flowLabel: 'Memory', flowIcon: '💾', agent: 'Memory',
    whatItDoes: 'Short-term, long-term, episodic, and semantic memory with decay and importance scoring.',
    keyCapabilities: ['Short-term Memory', 'Long-term Memory', 'Episodic Memory', 'Semantic Memory', 'Decay', 'Consolidation'],
    description: 'The Memory Layer provides multi-tier memory with intelligent decay and importance scoring.',
  },
  {
    id: 'governance', number: 7, name: 'Governance Layer', color: '#1B998B',
    flowLabel: 'Governance', flowIcon: '🛡️', agent: 'Governor',
    whatItDoes: 'Observability, cost tracking, security, audit trail, and compliance for production readiness.',
    keyCapabilities: ['Observability', 'Cost Tracker', 'Security', 'Audit Trail', 'Permissions', 'Compliance'],
    description: 'The Governance Layer ensures production readiness through observability, security, and compliance.',
  },
];

const layerIconMap: {[key: string]: typeof Crown} = {
  brain: Brain,
  providers: Cpu,
  agents: Bot,
  knowledge: Search,
  execution: Zap,
  memory: Database,
  governance: Shield,
};

// ═══════════════════════════════════════════════════════════
// useSystemDetection Hook
// ═══════════════════════════════════════════════════════════

export function useSystemDetection() {
  const { geminiCLI, updateGeminiCLI, providers, updateProvider } = useOSStore();

  useEffect(() => {
    let mounted = true;

    // Check Gemini CLI health
    const checkGeminiCLI = async () => {
      try {
        const res = await fetch('/api/gemini/health');
        if (res.ok && mounted) {
          const data = await res.json();
          updateGeminiCLI({
            installed: true,
            running: data.running ?? true,
            version: data.version ?? '',
            lastHealthCheck: Date.now(),
          });
          // Also update the gemini-cli provider
          updateProvider('gemini-cli', {
            enabled: true,
            healthStatus: data.running ? 'healthy' : 'degraded',
            lastHealthCheck: Date.now(),
          });
        }
      } catch {
        // Gemini CLI not available - this is fine
        if (mounted) {
          updateGeminiCLI({ installed: false, running: false, lastHealthCheck: Date.now() });
          updateProvider('gemini-cli', { healthStatus: 'offline', lastHealthCheck: Date.now() });
        }
      }
    };

    // Check enabled providers health
    const checkProviders = async () => {
      for (const p of providers) {
        if (!p.enabled || !p.apiKey) continue;
        try {
          const res = await fetch(`/api/providers/health?id=${p.id}`);
          if (res.ok && mounted) {
            const data = await res.json();
            updateProvider(p.id, {
              healthStatus: data.healthy ? 'healthy' : 'degraded',
              lastHealthCheck: Date.now(),
            });
          }
        } catch {
          if (mounted) {
            updateProvider(p.id, { healthStatus: 'offline', lastHealthCheck: Date.now() });
          }
        }
      }
    };

    checkGeminiCLI();
    checkProviders();

    const interval = setInterval(() => {
      checkGeminiCLI();
      checkProviders();
    }, 30000);

    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const activeProvider = providers.find(p => p.enabled && p.apiKey);
  const hasAnyProvider = providers.some(p => p.enabled && p.apiKey);

  return {
    geminiInstalled: geminiCLI.installed,
    geminiRunning: geminiCLI.running,
    geminiVersion: geminiCLI.version,
    activeProvider: activeProvider ?? null,
    hasAnyProvider,
    providerCount: providers.filter(p => p.enabled && p.apiKey).length,
  };
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed, agents } = useOSStore();
  const liveCount = agents.filter((a) => a.status === 'live').length;

  type NavItem = { id: string; label: string; icon: typeof Sparkles };
  type NavSection = { label: string; color: string; icon: typeof Sparkles; items: NavItem[] };

  const sections: NavSection[] = [
    {
      label: 'Main', color: '#9d4edd', icon: Sparkles,
      items: [
        { id: 'home', label: 'Home', icon: LayoutDashboard },
        { id: 'mission-control', label: 'Mission Control', icon: Radio },
        { id: 'brain-layer', label: 'Brain Layer', icon: Brain },
      ],
    },
    {
      label: 'Intelligence', color: '#00ffff', icon: Cpu,
      items: [
        { id: 'providers', label: 'Providers', icon: Cpu },
        { id: 'models', label: 'Models', icon: Boxes },
        { id: 'model-router', label: 'Model Router', icon: Route },
        { id: 'gemini-cli', label: 'Gemini CLI', icon: Gem },
      ],
    },
    {
      label: 'Workspace', color: '#FFB627', icon: Briefcase,
      items: [
        { id: 'workspaces', label: 'Workspaces', icon: Briefcase },
        { id: 'projects', label: 'Projects', icon: FolderOpen },
        { id: 'files', label: 'Files', icon: FileText },
        { id: 'attachments', label: 'Attachments', icon: Paperclip },
      ],
    },
    {
      label: 'Knowledge', color: '#FFB627', icon: Search,
      items: [
        { id: 'knowledge', label: 'Knowledge Base', icon: Search },
        { id: 'memory-engine', label: 'Memory Engine', icon: Database },
        { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Network },
        { id: 'rag-engine', label: 'RAG Engine', icon: Zap },
      ],
    },
    {
      label: 'Agents', color: '#00ff88', icon: Bot,
      items: [
        { id: 'agents', label: 'Agents', icon: Bot },
        { id: 'agent-builder', label: 'Agent Builder', icon: Wrench },
        { id: 'agent-marketplace', label: 'Agent Marketplace', icon: Store },
        { id: 'swarm-intelligence', label: 'Swarm Intelligence', icon: BrainCircuit },
      ],
    },
    {
      label: 'Automation', color: '#E8751A', icon: Workflow,
      items: [
        { id: 'workflows', label: 'Workflows', icon: Workflow },
        { id: 'automations', label: 'Automations', icon: Play },
        { id: 'plugins', label: 'Plugins', icon: Plug },
        { id: 'prompts', label: 'Prompts', icon: Type },
      ],
    },
    {
      label: 'Monitoring', color: '#E63946', icon: Gauge,
      items: [
        { id: 'observability', label: 'Observability', icon: Eye },
        { id: 'cost-tracker', label: 'Cost Tracker', icon: Zap },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'audit-trail', label: 'Audit Trail', icon: ScrollText },
      ],
    },
    {
      label: 'Settings', color: '#8888aa', icon: Settings2,
      items: [
        { id: 'settings', label: 'Provider Settings', icon: Settings2 },
        { id: 'updates', label: 'System Settings', icon: Cog },
      ],
    },
  ];

  const selfItems: NavItem[] = [
    { id: 'self-goals', label: 'Goals', icon: Target },
    { id: 'self-journal', label: 'Journal', icon: BookOpen },
    { id: 'self-memory', label: 'Memory', icon: Database },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen flex flex-col bg-[#0d0d20] border-r border-[rgba(157,78,221,0.15)] relative z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(157,78,221,0.1)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9d4edd] to-[#E8751A] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="overflow-hidden">
              <div className="text-white font-bold text-sm tracking-wider">AGENTIC OS</div>
              <div className="text-[9px] text-[#8888aa] tracking-widest uppercase">Brain-First AI Stack</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.label} className="pt-2">
            {!sidebarCollapsed && (
              <div className="px-3 mb-1 text-[9px] uppercase tracking-widest flex items-center gap-1" style={{ color: section.color }}>
                <section.icon size={9} /> {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button key={item.id} onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 group relative ${
                    isActive ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.06)]'
                  }`}
                  style={isActive ? { background: `${section.color}15` } : {}}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.div layoutId={`sidebar-${section.label}`} className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{ backgroundColor: section.color }} />
                  )}
                  <item.icon size={14} className="flex-shrink-0 transition-colors" style={isActive ? { color: section.color } : {}} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-medium truncate">
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.id === 'mission-control' && !sidebarCollapsed && (
                    <span className="ml-auto text-[9px] bg-[#00ffff]/20 text-[#00ffff] px-1.5 py-0.5 rounded-full font-mono">{liveCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Self section */}
        <div className="pt-3 border-t border-[rgba(157,78,221,0.08)]">
          {!sidebarCollapsed && <div className="px-3 mb-1 text-[9px] text-[#2E86AB] uppercase tracking-widest flex items-center gap-1"><Fingerprint size={9} /> Self</div>}
          {selfItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 group ${
                  isActive ? 'bg-[rgba(46,134,171,0.12)] text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(46,134,171,0.06)]'
                }`}
              >
                <item.icon size={14} className={`flex-shrink-0 ${isActive ? 'text-[#2E86AB]' : 'text-[#8888aa] group-hover:text-[#2E86AB]'}`} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-medium truncate">{item.label}</motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {/* Layer quick nav */}
        <div className="pt-3 border-t border-[rgba(157,78,221,0.08)]">
          {!sidebarCollapsed && <div className="px-3 mb-1 text-[9px] text-[#9d4edd] uppercase tracking-widest flex items-center gap-1"><Layers size={9} /> Layers</div>}
          {stackLayers.map((layer) => {
            const isActive = activeView === `layer-${layer.id}`;
            const IconComp = layerIconMap[layer.id] || Sparkles;
            return (
              <button key={layer.id} onClick={() => setActiveView(`layer-${layer.id}`)}
                className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all duration-200 group relative ${
                  isActive ? 'text-white' : 'text-[#8888aa] hover:text-white'
                }`}
                style={isActive ? { background: `${layer.color}12` } : {}}
              >
                {isActive && <motion.div layoutId="sidebar-layer" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r" style={{ backgroundColor: layer.color }} />}
                <IconComp size={13} className="flex-shrink-0" style={isActive ? { color: layer.color } : {}} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-medium truncate">
                      L{layer.number} {layer.flowLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!sidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layer.color }} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Collapse toggle */}
      <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex items-center justify-center py-3 border-t border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white transition-colors"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <Menu size={16} />
      </button>
    </motion.aside>
  );
}

// ═══════════════════════════════════════════════════════════
// TOP BAR
// ═══════════════════════════════════════════════════════════

export function TopBar() {
  const { setCommandPaletteOpen, activeView, providers, geminiCLI } = useOSStore();
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  const viewLabels: {[key: string]: string} = {
    'home': 'Home',
    'mission-control': 'Mission Control',
    'brain-layer': 'Brain Layer — Native Intelligence',
    'providers': 'Providers — Execution Engines',
    'models': 'Models — Available Models',
    'model-router': 'Model Router — Intelligent Routing',
    'gemini-cli': 'Gemini CLI — Local Agent',
    'workspaces': 'Workspaces',
    'projects': 'Projects',
    'files': 'Files',
    'attachments': 'Attachments',
    'knowledge': 'Knowledge Base',
    'memory-engine': 'Memory Engine',
    'knowledge-graph': 'Knowledge Graph',
    'rag-engine': 'RAG Engine',
    'agents': 'Agents',
    'agent-builder': 'Agent Builder',
    'agent-marketplace': 'Agent Marketplace',
    'swarm-intelligence': 'Swarm Intelligence',
    'workflows': 'Workflows',
    'automations': 'Automations',
    'plugins': 'Plugins',
    'prompts': 'Prompts',
    'observability': 'Observability',
    'cost-tracker': 'Cost Tracker',
    'security': 'Security',
    'audit-trail': 'Audit Trail',
    'settings': 'Provider Settings',
    'updates': 'System Settings',
    'layer-brain': 'Layer 1 — Brain Layer',
    'layer-providers': 'Layer 2 — Provider Layer',
    'layer-agents': 'Layer 3 — Agent Layer',
    'layer-knowledge': 'Layer 4 — Knowledge Layer',
    'layer-execution': 'Layer 5 — Execution Layer',
    'layer-memory': 'Layer 6 — Memory Layer',
    'layer-governance': 'Layer 7 — Governance Layer',
    'self-goals': 'Self — Goals',
    'self-journal': 'Self — Journal',
    'self-memory': 'Self — Memory',
  };

  const activeProvider = providers.find(p => p.enabled && p.apiKey);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md z-10" role="banner">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-bold text-lg tracking-wide">{viewLabels[activeView] || 'Agentic OS'}</h1>
        <span className="text-[#8888aa] text-sm hidden lg:block">
          {activeView === 'home' ? 'Brain-first AI operating system.' : ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-[#8888aa] font-mono text-sm">{time} <span className="text-[10px]">LOCAL</span></div>
        <button onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] transition-all text-sm"
          aria-label="Open command palette">
          <Command size={14} /><span className="hidden sm:inline">Command</span>
        </button>
        {/* Active provider badge */}
        {activeProvider && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium"
            style={{ borderColor: `${activeProvider.color}30`, color: activeProvider.color, background: `${activeProvider.color}10` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeProvider.color }} />
            {activeProvider.name}
          </div>
        )}
        {/* Gemini CLI status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
          geminiCLI.running ? 'border-[rgba(66,133,244,0.3)] text-[#4285f4] bg-[rgba(66,133,244,0.1)]' :
          geminiCLI.installed ? 'border-[rgba(255,182,39,0.3)] text-[#FFB627] bg-[rgba(255,182,39,0.1)]' :
          'border-[rgba(136,136,170,0.2)] text-[#8888aa] bg-[rgba(136,136,170,0.05)]'
        }`}>
          <Gem size={12} />
          <span className="hidden sm:inline">{geminiCLI.running ? 'Running' : geminiCLI.installed ? 'Installed' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════
// SYSTEM MONITOR
// ═══════════════════════════════════════════════════════════

export function SystemMonitor() {
  const { systemMetrics } = useOSStore();
  const metrics = [
    { label: 'CPU', value: systemMetrics.cpu, icon: Cpu, color: '#9d4edd' },
    { label: 'Memory', value: systemMetrics.memory, icon: HardDrive, color: '#00ffff' },
    { label: 'Network', value: systemMetrics.network, icon: Network, color: '#00ff88' },
    { label: 'Disk', value: systemMetrics.disk, icon: Database, color: '#FFB627' },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Activity size={16} className="text-[#9d4edd]" /> System Monitor
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">LIVE</span>
      </div>
      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <m.icon size={14} style={{ color: m.color }} />
                <span className="text-[#ccccdd] text-xs font-medium">{m.label}</span>
              </div>
              <span className="text-white text-xs font-mono font-bold">{m.value}%</span>
            </div>
            <div className="w-full h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${m.color}80, ${m.color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${m.value}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOG STREAM
// ═══════════════════════════════════════════════════════════

export function LogStream() {
  const { executionLogs } = useOSStore();
  const levelColors: {[key: string]: string} = {
    info: '#00ffff', warn: '#FFB627', error: '#E63946', success: '#00ff88',
  };

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Terminal size={16} className="text-[#00ff88]" /> Execution Log
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">{executionLogs.length} ENTRIES</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar">
        {executionLogs.length === 0 ? (
          <div className="text-[#8888aa] text-xs text-center py-8">No execution logs yet. Start an agent to see logs.</div>
        ) : (
          executionLogs.slice(0, 30).map((log: ExecutionLog) => (
            <div key={log.id} className="flex items-start gap-2 py-1 px-2 rounded-md hover:bg-[rgba(157,78,221,0.05)] transition-colors">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: levelColors[log.level] || '#8888aa' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: levelColors[log.level] }}>{log.level}</span>
                  <span className="text-[9px] text-[#8888aa] font-mono">{log.source}</span>
                  {log.providerId && <span className="text-[8px] text-[#9d4edd] font-mono">{log.providerId}</span>}
                </div>
                <p className="text-[#ccccdd] text-[11px] leading-tight truncate">{log.message}</p>
              </div>
              <span className="text-[8px] text-[#8888aa] font-mono flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LATENCY GRAPH
// ═══════════════════════════════════════════════════════════

export function LatencyGraph() {
  const { providers } = useOSStore();
  const enabledProviders = providers.filter(p => p.enabled);

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Gauge size={16} className="text-[#FFB627]" /> Provider Latency
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">MS</span>
      </div>
      {enabledProviders.length === 0 ? (
        <div className="text-[#8888aa] text-xs text-center py-8">Enable a provider to see latency data.</div>
      ) : (
        <div className="space-y-3">
          {enabledProviders.map((p: ProviderConfig) => {
            const latency = p.healthStatus === 'healthy' ? Math.floor(Math.random() * 400 + 100) : 0;
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.icon}</span>
                    <span className="text-[#ccccdd] text-xs font-medium">{p.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: latency > 500 ? '#E63946' : latency > 300 ? '#FFB627' : '#00ff88' }}>
                    {latency}ms
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p.color}60, ${p.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((latency / 1000) * 100, 100)}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTROL ROOM
// ═══════════════════════════════════════════════════════════

export function ControlRoom({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { agents, updateAgent, chatHistories, addChatMessage, providers, brainConfig } = useOSStore();
  const agent = agents.find(a => a.id === agentId);
  const [input, setInput] = useState('');
  const messages = chatHistories[agentId] || [];
  const activeProvider = providers.find(p => p.enabled && p.apiKey);

  if (!agent) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    addChatMessage(agentId, {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    });
    // Simulate brain response
    setTimeout(() => {
      addChatMessage(agentId, {
        id: `msg-${Date.now()}-r`,
        role: 'brain',
        content: `[Brain Layer] Processing via ${activeProvider?.name || 'no provider'}... The Brain Layer coordinates all intelligence. This agent uses the configured execution engine.`,
        timestamp: Date.now(),
        providerId: activeProvider?.id,
        model: activeProvider?.defaultModel,
      });
    }, 800);
    setInput('');
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-[#0d0d20] border-l border-[rgba(157,78,221,0.2)] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(157,78,221,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `linear-gradient(135deg, ${agent.color}25, ${agent.color}10)`, border: `1px solid ${agent.color}30` }}>
            {agent.icon}
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{agent.name}</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'live' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: agent.status === 'live' ? '#00ff88' : '#8888aa' }} />
              <span className="text-[9px] font-mono uppercase" style={{ color: agent.status === 'live' ? '#00ff88' : '#8888aa' }}>{agent.status}</span>
              {activeProvider && <span className="text-[8px] text-[#8888aa]">via {activeProvider.name}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors p-1" aria-label="Close control room">
          <X size={18} />
        </button>
      </div>

      {/* Status metrics */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-[rgba(157,78,221,0.08)]">
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase">Uptime</div>
          <div className="text-white text-[11px] font-mono font-bold">{agent.uptime}</div>
        </div>
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase">Latency</div>
          <div className="text-[11px] font-mono font-bold" style={{ color: agent.latency > 300 ? '#FFB627' : '#00ff88' }}>{agent.latency}ms</div>
        </div>
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase">Requests</div>
          <div className="text-white text-[11px] font-mono font-bold">{agent.requests}</div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <div className="text-center text-[9px] text-[#8888aa] font-mono py-2">
          Brain Layer: {brainConfig.reasoningStyle} | Context: {brainConfig.contextStrategy}
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-[12px] ${
              msg.role === 'user' ? 'bg-[rgba(157,78,221,0.15)] text-white' :
              msg.role === 'brain' ? 'bg-[rgba(0,255,255,0.08)] text-[#00ffff]' :
              'bg-[rgba(18,18,42,0.8)] text-[#ccccdd]'
            }`}>
              <p className="leading-relaxed">{msg.content}</p>
              {msg.providerId && <div className="text-[8px] text-[#8888aa] mt-1 font-mono">via {msg.providerId} · {msg.model}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[rgba(157,78,221,0.1)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send to Brain Layer..."
            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg px-3 py-2 text-white text-sm placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
          />
          <button onClick={handleSend} className="px-3 py-2 rounded-lg bg-[#9d4edd] text-white hover:bg-[#7B2CBF] transition-colors" aria-label="Send message">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMMAND PALETTE
// ═══════════════════════════════════════════════════════════

export function CommandPalette() {
  const { setActiveView, setCommandPaletteOpen } = useOSStore();
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, category: 'Main' },
    { id: 'mission-control', label: 'Mission Control', icon: Radio, category: 'Main' },
    { id: 'brain-layer', label: 'Brain Layer', icon: Brain, category: 'Intelligence' },
    { id: 'providers', label: 'Providers', icon: Cpu, category: 'Intelligence' },
    { id: 'models', label: 'Models', icon: Boxes, category: 'Intelligence' },
    { id: 'model-router', label: 'Model Router', icon: Route, category: 'Intelligence' },
    { id: 'gemini-cli', label: 'Gemini CLI', icon: Gem, category: 'Intelligence' },
    { id: 'workspaces', label: 'Workspaces', icon: Briefcase, category: 'Workspace' },
    { id: 'projects', label: 'Projects', icon: FolderOpen, category: 'Workspace' },
    { id: 'files', label: 'Files', icon: FileText, category: 'Workspace' },
    { id: 'attachments', label: 'Attachments', icon: Paperclip, category: 'Workspace' },
    { id: 'knowledge', label: 'Knowledge Base', icon: Search, category: 'Knowledge' },
    { id: 'memory-engine', label: 'Memory Engine', icon: Database, category: 'Knowledge' },
    { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Network, category: 'Knowledge' },
    { id: 'rag-engine', label: 'RAG Engine', icon: Zap, category: 'Knowledge' },
    { id: 'agents', label: 'Agents', icon: Bot, category: 'Agents' },
    { id: 'agent-builder', label: 'Agent Builder', icon: Wrench, category: 'Agents' },
    { id: 'agent-marketplace', label: 'Agent Marketplace', icon: Store, category: 'Agents' },
    { id: 'swarm-intelligence', label: 'Swarm Intelligence', icon: BrainCircuit, category: 'Agents' },
    { id: 'workflows', label: 'Workflows', icon: Workflow, category: 'Automation' },
    { id: 'automations', label: 'Automations', icon: Play, category: 'Automation' },
    { id: 'plugins', label: 'Plugins', icon: Plug, category: 'Automation' },
    { id: 'prompts', label: 'Prompts', icon: Type, category: 'Automation' },
    { id: 'observability', label: 'Observability', icon: Eye, category: 'Monitoring' },
    { id: 'cost-tracker', label: 'Cost Tracker', icon: Zap, category: 'Monitoring' },
    { id: 'security', label: 'Security', icon: Shield, category: 'Monitoring' },
    { id: 'audit-trail', label: 'Audit Trail', icon: ScrollText, category: 'Monitoring' },
    { id: 'settings', label: 'Provider Settings', icon: Settings2, category: 'Settings' },
    { id: 'updates', label: 'System Settings', icon: Cog, category: 'Settings' },
    ...stackLayers.map(l => ({
      id: `layer-${l.id}`,
      label: `L${l.number} ${l.name}`,
      icon: layerIconMap[l.id] || Sparkles,
      category: 'Layers',
    })),
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-[#0d0d20] border border-[rgba(157,78,221,0.2)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(157,78,221,0.1)]">
          <Search size={16} className="text-[#9d4edd]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-white text-sm placeholder-[#8888aa] focus:outline-none"
            autoFocus
          />
          <kbd className="text-[9px] text-[#8888aa] border border-[rgba(157,78,221,0.2)] rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-[#8888aa] text-xs text-center py-6">No commands found.</div>
          ) : (
            filtered.map((cmd) => (
              <button key={cmd.id}
                onClick={() => { setActiveView(cmd.id); setCommandPaletteOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#ccccdd] hover:text-white hover:bg-[rgba(157,78,221,0.1)] transition-all text-sm"
              >
                <cmd.icon size={14} className="text-[#9d4edd]" />
                <span className="flex-1 text-left">{cmd.label}</span>
                <span className="text-[9px] text-[#8888aa] font-mono">{cmd.category}</span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// STACK OVERVIEW
// ═══════════════════════════════════════════════════════════

export function StackOverview() {
  const { setActiveView, systemMetrics } = useOSStore();

  const layers = [
    { id: 'brain', name: 'Brain Layer', color: '#9d4edd', icon: Brain, desc: 'Native intelligence — planning, reasoning, delegation, coordination' },
    { id: 'providers', name: 'Provider Layer', color: '#00ffff', icon: Cpu, desc: 'Interchangeable execution engines — OpenAI, Anthropic, Google, Ollama, etc.' },
    { id: 'agents', name: 'Agent Layer', color: '#00ff88', icon: Bot, desc: 'Specialized workers — Code Agent, Research Agent, Task Agent' },
    { id: 'knowledge', name: 'Knowledge Layer', color: '#FFB627', icon: Search, desc: 'Persistent intelligence — knowledge base, memory, RAG, graph' },
    { id: 'execution', name: 'Execution Layer', color: '#E8751A', icon: Zap, desc: 'Automation — workflows, plugins, prompts, webhooks' },
    { id: 'memory', name: 'Memory Layer', color: '#2E86AB', icon: Database, desc: 'Multi-tier memory — short-term, long-term, episodic, semantic' },
    { id: 'governance', name: 'Governance Layer', color: '#1B998B', icon: Shield, desc: 'Production readiness — observability, security, audit, compliance' },
  ];

  return (
    <section aria-label="Stack Overview" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg tracking-wider uppercase flex items-center gap-2">
          <Layers size={20} className="text-[#9d4edd]" /> Agentic OS Architecture
        </h2>
        <span className="text-[10px] text-[#8888aa] font-mono">7 LAYERS · BRAIN-FIRST</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border overflow-hidden cursor-pointer group card-hover"
            style={{ borderColor: `${layer.color}20`, background: `linear-gradient(135deg, ${layer.color}06, ${layer.color}02)` }}
            onClick={() => setActiveView(`layer-${layer.id}`)}
          >
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${layer.color}, transparent)` }} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, border: `1px solid ${layer.color}25` }}>
                  <layer.icon size={18} style={{ color: layer.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                      L{i + 1}
                    </span>
                    <h3 className="text-white font-semibold text-sm">{layer.name}</h3>
                  </div>
                  <p className="text-[#aaaacc] text-[11px] leading-relaxed mt-1">{layer.desc}</p>
                </div>
                <ArrowRight size={14} className="text-[#8888aa] group-hover:text-white transition-colors flex-shrink-0 mt-2" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Active Agents</div>
            <div className="text-[#00ff88] font-mono text-lg font-bold">{systemMetrics.activeAgents}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Providers</div>
            <div className="text-[#00ffff] font-mono text-lg font-bold">{systemMetrics.activeProviders}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Knowledge</div>
            <div className="text-[#FFB627] font-mono text-lg font-bold">{systemMetrics.knowledgeEntries}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Memory</div>
            <div className="text-[#2E86AB] font-mono text-lg font-bold">{systemMetrics.memoryEntries}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYER CARD
// ═══════════════════════════════════════════════════════════

export function LayerCard({ layer }: { layer: StackLayer }) {
  const IconComp = layerIconMap[layer.id] || Sparkles;
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${layer.color}20`, background: `linear-gradient(135deg, ${layer.color}08, rgba(18,18,42,0.6))` }}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${layer.color}, ${layer.color}40, transparent)` }} />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${layer.color}25, ${layer.color}10)`, border: `1px solid ${layer.color}30` }}>
            <IconComp size={24} style={{ color: layer.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                L{layer.number}
              </span>
              <h2 className="text-white font-bold text-xl">{layer.name}</h2>
            </div>
            <p className="text-[#aaaacc] text-sm leading-relaxed">{layer.whatItDoes}</p>
          </div>
        </div>
        <div className="mt-4">
          <h4 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2">Key Capabilities</h4>
          <div className="flex flex-wrap gap-2">
            {layer.keyCapabilities.map(cap => (
              <span key={cap} className="text-[10px] px-2 py-1 rounded-full border font-medium"
                style={{ borderColor: `${layer.color}25`, color: `${layer.color}cc`, background: `${layer.color}08` }}>
                {cap}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[rgba(157,78,221,0.08)]">
          <p className="text-[#ccccdd] text-sm leading-relaxed">{layer.description}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUICK STATS
// ═══════════════════════════════════════════════════════════

export function QuickStats() {
  const { systemMetrics, agents, providers, knowledgeEntries, memories, totalCost, totalTokensUsed } = useOSStore();
  const liveAgents = agents.filter(a => a.status === 'live').length;
  const enabledProviders = providers.filter(p => p.enabled && p.apiKey).length;

  const stats = [
    { label: 'Active Agents', value: liveAgents, total: agents.length, color: '#00ff88', icon: Bot },
    { label: 'Providers', value: enabledProviders, total: providers.length, color: '#00ffff', icon: Cpu },
    { label: 'Knowledge', value: knowledgeEntries.length, total: null, color: '#FFB627', icon: Search },
    { label: 'Memories', value: memories.length, total: null, color: '#2E86AB', icon: Database },
    { label: 'Tokens Used', value: totalTokensUsed, total: null, color: '#9d4edd', icon: Zap },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, total: null, color: '#E8751A', icon: Gauge },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border p-3"
          style={{ borderColor: `${stat.color}15`, background: `linear-gradient(135deg, ${stat.color}06, ${stat.color}02)` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon size={12} style={{ color: stat.color }} />
            <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
          </div>
          <div className="text-white font-mono text-lg font-bold">{stat.value}</div>
          {stat.total !== null && <div className="text-[9px] text-[#8888aa]">of {stat.total}</div>}
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NETWORK TOPOLOGY
// ═══════════════════════════════════════════════════════════

export function NetworkTopology() {
  const { agents, providers } = useOSStore();
  const enabledProviders = providers.filter(p => p.enabled);
  const liveAgents = agents.filter(a => a.status === 'live');

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Network size={16} className="text-[#00ffff]" /> Network Topology
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">{liveAgents.length}A · {enabledProviders.length}P</span>
      </div>

      {/* Central Brain node with connections */}
      <div className="relative flex items-center justify-center min-h-[200px]">
        {/* Brain center */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9d4edd] to-[#7B2CBF] flex items-center justify-center z-10 shadow-lg shadow-[#9d4edd]/20">
          <Brain size={28} className="text-white" />
        </div>
        <div className="absolute text-[8px] text-[#9d4edd] font-mono font-bold top-[calc(50%+44px)]">BRAIN</div>

        {/* Provider nodes */}
        {enabledProviders.slice(0, 5).map((p, i) => {
          const angle = (i / Math.max(enabledProviders.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const radius = 80;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <div key={p.id} className="absolute" style={{ transform: `translate(${x}px, ${y}px)` }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs border"
                style={{ background: `${p.color}15`, borderColor: `${p.color}30` }}>
                {p.icon}
              </motion.div>
              {/* Connection line would be SVG */}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.08)] flex items-center gap-3 text-[9px] text-[#8888aa]">
        <span className="font-mono" style={{ color: '#9d4edd' }}>Brain = Primary Intelligence</span>
        <span>·</span>
        <span className="font-mono" style={{ color: '#00ffff' }}>Providers = Execution Engines</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SYSTEM STATUS BANNER (was HermesConnectionBanner)
// ═══════════════════════════════════════════════════════════

export function SystemStatusBanner() {
  const { geminiCLI, providers, systemMetrics } = useOSStore();
  const activeProvider = providers.find(p => p.enabled && p.apiKey);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Siren size={16} className="text-[#FFB627]" /> System Status
        </h3>
        <span className="text-[9px] font-mono text-[#00ff88]">● OPERATIONAL</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Brain status */}
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] p-3"
          style={{ background: 'rgba(157,78,221,0.05)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} className="text-[#9d4edd]" />
            <span className="text-[10px] text-[#8888aa] uppercase">Brain Layer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-white text-sm font-bold">Active</span>
          </div>
          <div className="text-[9px] text-[#8888aa] mt-1">Native intelligence running</div>
        </div>

        {/* Provider status */}
        <div className="rounded-lg border border-[rgba(0,255,255,0.15)] p-3"
          style={{ background: 'rgba(0,255,255,0.03)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={14} className="text-[#00ffff]" />
            <span className="text-[10px] text-[#8888aa] uppercase">Active Provider</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${activeProvider ? 'bg-[#00ff88] animate-pulse' : 'bg-[#8888aa]'}`} />
            <span className="text-white text-sm font-bold">{activeProvider?.name || 'None'}</span>
          </div>
          <div className="text-[9px] text-[#8888aa] mt-1">{activeProvider ? `${activeProvider.defaultModel}` : 'Configure in Settings'}</div>
        </div>

        {/* Gemini CLI status */}
        <div className="rounded-lg border border-[rgba(66,133,244,0.15)] p-3"
          style={{ background: 'rgba(66,133,244,0.03)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Gem size={14} className="text-[#4285f4]" />
            <span className="text-[10px] text-[#8888aa] uppercase">Gemini CLI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${geminiCLI.running ? 'bg-[#00ff88] animate-pulse' : geminiCLI.installed ? 'bg-[#FFB627]' : 'bg-[#8888aa]'}`} />
            <span className="text-white text-sm font-bold">{geminiCLI.running ? 'Running' : geminiCLI.installed ? 'Installed' : 'Not Found'}</span>
          </div>
          <div className="text-[9px] text-[#8888aa] mt-1">{geminiCLI.version ? `v${geminiCLI.version}` : 'Local execution agent'}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN QUICK ACTIONS (was HermesQuickActions)
// ═══════════════════════════════════════════════════════════

export function BrainQuickActions() {
  const { setActiveView, providers } = useOSStore();
  const hasProvider = providers.some(p => p.enabled && p.apiKey);

  const actions = [
    { label: 'Configure Provider', icon: Cpu, view: 'settings', color: '#00ffff', desc: 'Set up an LLM provider' },
    { label: 'Open Brain Layer', icon: Brain, view: 'brain-layer', color: '#9d4edd', desc: 'Native intelligence settings' },
    { label: 'Browse Agents', icon: Bot, view: 'agent-marketplace', color: '#00ff88', desc: 'Find specialized agents' },
    { label: 'Build Workflow', icon: Workflow, view: 'workflows', color: '#E8751A', desc: 'Create automation' },
    { label: 'Query Knowledge', icon: Search, view: 'knowledge', color: '#FFB627', desc: 'Search knowledge base' },
    { label: 'View Memory', icon: Database, view: 'memory-engine', color: '#2E86AB', desc: 'Explore memory' },
  ];

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Zap size={16} className="text-[#9d4edd]" /> Brain Quick Actions
        </h3>
        {!hasProvider && <span className="text-[9px] text-[#FFB627] font-mono">⚠ No provider configured</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {actions.map(action => (
          <button key={action.label} onClick={() => setActiveView(action.view)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all hover:scale-105"
            style={{ borderColor: `${action.color}15`, background: `${action.color}05` }}>
            <action.icon size={18} style={{ color: action.color }} />
            <span className="text-white text-[10px] font-medium">{action.label}</span>
            <span className="text-[8px] text-[#8888aa]">{action.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN FEATURE GRID (was HermesFeatureGrid)
// ═══════════════════════════════════════════════════════════

export function BrainFeatureGrid() {
  const { setActiveView } = useOSStore();

  const features = [
    { name: 'Planning', desc: 'Multi-step task decomposition', icon: Target, color: '#9d4edd', view: 'brain-layer' },
    { name: 'Reasoning', desc: 'Chain-of-thought & tree-of-thought', icon: Brain, color: '#9d4edd', view: 'brain-layer' },
    { name: 'Delegation', desc: 'Agent delegation & coordination', icon: Users, color: '#00ff88', view: 'agents' },
    { name: 'Memory', desc: 'Short-term, long-term, semantic', icon: Database, color: '#2E86AB', view: 'memory-engine' },
    { name: 'Tool Selection', desc: 'Adaptive tool usage patterns', icon: Wrench, color: '#E8751A', view: 'plugins' },
    { name: 'RAG', desc: 'Retrieval-augmented generation', icon: Search, color: '#FFB627', view: 'rag-engine' },
    { name: 'Model Router', desc: 'Intelligent provider routing', icon: Route, color: '#00ffff', view: 'model-router' },
    { name: 'Security', desc: 'Injection & PII protection', icon: Shield, color: '#E63946', view: 'security' },
    { name: 'Cost Control', desc: 'Budget limits & optimization', icon: Gauge, color: '#1B998B', view: 'cost-tracker' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Brain size={16} className="text-[#9d4edd]" /> Brain Capabilities
        </h3>
        <span className="text-[9px] text-[#8888aa] font-mono">NATIVE INTELLIGENCE</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {features.map(feat => (
          <motion.button key={feat.name} onClick={() => setActiveView(feat.view)}
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all"
            style={{ borderColor: `${feat.color}15`, background: `${feat.color}05` }}>
            <feat.icon size={16} style={{ color: feat.color }} />
            <div>
              <div className="text-white text-[11px] font-medium">{feat.name}</div>
              <div className="text-[8px] text-[#8888aa]">{feat.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STACK 3D VISUALIZATION
// ═══════════════════════════════════════════════════════════

export function Stack3DVisualization() {
  const { setActiveView } = useOSStore();

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-base tracking-wider uppercase flex items-center gap-2">
          <Layers size={16} className="text-[#FFB627]" />
          7-Layer Agentic Stack
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">BRAIN-FIRST</span>
      </div>

      <div className="space-y-1.5">
        {stackLayers.map((layer, i) => {
          const IconComp = layerIconMap[layer.id] || Sparkles;
          return (
            <motion.button
              key={layer.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setActiveView(`layer-${layer.id}`)}
              className="w-full group relative"
            >
              <div
                className="mx-auto rounded-lg border overflow-hidden transition-all duration-300 card-hover cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${layer.color}12, ${layer.color}05)`,
                  borderColor: `${layer.color}30`,
                }}
              >
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${layer.color}25, ${layer.color}10)`, border: `1px solid ${layer.color}35` }}>
                    <IconComp size={14} style={{ color: layer.color }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                        L{layer.number}
                      </span>
                      <span className="text-white text-xs font-semibold truncate">{layer.name}</span>
                      <span className="text-[9px] hidden sm:inline" style={{ color: `${layer.color}88` }}>— {layer.flowLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono" style={{ color: `${layer.color}aa` }}>{layer.agent}</span>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: layer.color }} />
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[rgba(157,78,221,0.1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa]">Compounding</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#FFB627]"
              initial={{ width: '0%' }} animate={{ width: '72%' }} transition={{ duration: 2, ease: 'easeOut' }} />
          </div>
          <span className="text-[9px] text-[#FFB627]">72%</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYER FLOW DIAGRAM
// ═══════════════════════════════════════════════════════════

export function LayerFlowDiagram() {
  const flowSteps = stackLayers.map(l => ({
    label: l.flowLabel,
    icon: l.flowIcon,
    color: l.color,
    id: l.id,
    number: l.number,
  }));

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Activity size={14} className="text-[#FFB627]" /> Layer Flow
        </h3>
        <span className="text-[9px] text-[#8888aa] font-mono">BRAIN → GOVERNANCE</span>
      </div>

      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {flowSteps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-1 cursor-pointer group"
              onClick={() => useOSStore.getState().setActiveView(`layer-${step.id}`)}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border transition-all group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${step.color}15, ${step.color}05)`, borderColor: `${step.color}30` }}>
                {step.icon}
              </div>
              <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: step.color }}>{step.label.toUpperCase()}</span>
              <span className="text-[7px] text-[#8888aa] font-mono">L{step.number}</span>
            </motion.div>
            {i < flowSteps.length - 1 && (
              <div className="flex items-center px-0.5">
                <div className="w-3 h-px" style={{ backgroundColor: `${step.color}40` }} />
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: step.color }}
                />
                <div className="w-3 h-px" style={{ backgroundColor: `${flowSteps[i + 1].color}40` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)] flex items-center gap-3 text-[9px] text-[#8888aa]">
        <span className="font-mono" style={{ color: '#9d4edd' }}>Brain = Primary Intelligence</span>
        <span>·</span>
        <span className="font-mono" style={{ color: '#00ffff' }}>Providers = Execution Engines</span>
        <span>·</span>
        <span className="font-mono" style={{ color: '#1B998B' }}>Governance = Production Ready</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYER FLOW VIEW
// ═══════════════════════════════════════════════════════════

export function LayerFlowView() {
  return (
    <div className="space-y-6">
      <LayerFlowDiagram />
      <Stack3DVisualization />
      <SystemStatusBanner />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemMonitor />
        <LatencyGraph />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AGENT HERO CARDS (Brain, Code, Research, Task)
// ═══════════════════════════════════════════════════════════

export function AgentHeroCards() {
  const { agents, setControlRoomAgent } = useOSStore();

  const heroAgents = [
    {
      ...agents.find(a => a.id === 'brain') ?? agents[0],
      heroIcon: Brain,
      borderAccent: '#9d4edd',
      features: ['Planning', 'Reasoning', 'Delegation', 'Coordination'],
      tagline: 'Native Intelligence',
      layerNames: ['L1 Brain'],
    },
    {
      ...agents.find(a => a.id === 'code-agent') ?? agents[0],
      heroIcon: FileCode2,
      borderAccent: '#00ff88',
      features: ['Code Generation', 'Debugging', 'Code Review', 'Refactoring'],
      tagline: 'Code Execution',
      layerNames: ['L3 Agents', 'L5 Execution'],
    },
    {
      ...agents.find(a => a.id === 'research-agent') ?? agents[0],
      heroIcon: Search,
      borderAccent: '#FFB627',
      features: ['Deep Research', 'Fact Checking', 'Synthesis', 'Knowledge'],
      tagline: 'Research & Knowledge',
      layerNames: ['L4 Knowledge'],
    },
    {
      ...agents.find(a => a.id === 'task-agent') ?? agents[0],
      heroIcon: Zap,
      borderAccent: '#E8751A',
      features: ['Task Execution', 'API Calls', 'Workflows', 'Automation'],
      tagline: 'Task Automation',
      layerNames: ['L5 Execution'],
    },
  ];

  return (
    <section aria-label="Agent Status Cards" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Radio size={16} className="text-[#9d4edd]" /> Live Agents
        </h2>
        <span className="text-[10px] text-[#8888aa] font-mono tracking-wider">{agents.filter(a => a.status === 'live').length}/{agents.length} ONLINE</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {heroAgents.map((agent, i) => {
          const IconComp = agent.heroIcon;
          return (
            <motion.article
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative rounded-2xl border overflow-hidden cursor-pointer card-hover"
              style={{
                borderColor: `${agent.borderAccent}30`,
                background: `linear-gradient(145deg, ${agent.borderAccent}08, ${agent.borderAccent}02, rgba(18,18,42,0.6))`,
              }}
              onClick={() => setControlRoomAgent(agent.id)}
            >
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${agent.borderAccent}, ${agent.borderAccent}40, transparent)` }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${agent.borderAccent}20, ${agent.borderAccent}08)`, border: `1px solid ${agent.borderAccent}30` }}>
                      <IconComp size={18} style={{ color: agent.borderAccent }} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{agent.name}</h3>
                      <p className="text-[10px] mt-0.5" style={{ color: `${agent.borderAccent}aa` }}>{agent.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <div className={`w-2 h-2 rounded-full ${agent.status === 'live' ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: agent.status === 'live' ? agent.borderAccent : '#8888aa' }} />
                    </div>
                    <span className={`text-[8px] font-bold tracking-wider ${agent.status === 'live' ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-[#ccccdd] text-[11px] leading-relaxed mb-2 line-clamp-2">{agent.description}</p>

                <div className="flex items-center gap-1 mb-3">
                  {agent.layerNames.map(ln => (
                    <span key={ln} className="text-[8px] px-1.5 py-0.5 rounded-full border font-bold tracking-wider"
                      style={{ borderColor: `${agent.borderAccent}35`, color: agent.borderAccent, background: `${agent.borderAccent}10` }}>
                      {ln}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1 mb-3">
                  {agent.features.map(feat => (
                    <div key={feat} className="flex items-center gap-1 text-[9px]">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: agent.borderAccent }} />
                      <span className="text-[#aaaacc]">{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full text-center text-[10px] py-2 rounded-lg border transition-all duration-300 group-hover:border-opacity-60 font-medium flex items-center justify-center gap-1.5"
                  style={{ color: `${agent.borderAccent}cc`, borderColor: `${agent.borderAccent}25`, background: `${agent.borderAccent}08` }}
                  onClick={(e) => { e.stopPropagation(); setControlRoomAgent(agent.id); }}
                >
                  <MessageSquare size={10} /> CONTROL ROOM <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SEO SILO (updated — no external framework refs)
// ═══════════════════════════════════════════════════════════

export function SEOSilo() {
  const { setActiveView, systemMetrics } = useOSStore();

  const siloSections = stackLayers.map(layer => ({
    title: `Layer ${layer.number}: ${layer.name}`,
    description: layer.whatItDoes,
    color: layer.color,
    icon: layerIconMap[layer.id] || Sparkles,
    viewId: `layer-${layer.id}`,
    keywords: layer.keyCapabilities,
  }));

  return (
    <section aria-label="SEO Content Silo" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Layers size={16} className="text-[#FFB627]" /> 7-Layer Architecture
        </h2>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] text-[#8888aa]">
          <button onClick={() => setActiveView('home')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <span className="text-[#FFB627]">Stack Architecture</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {siloSections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border overflow-hidden card-hover cursor-pointer group"
            style={{ borderColor: `${section.color}20`, background: `linear-gradient(135deg, ${section.color}06, ${section.color}02)` }}
            onClick={() => setActiveView(section.viewId)}
          >
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${section.color}, transparent)` }} />
            <div className="p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${section.color}15, ${section.color}05)`, border: `1px solid ${section.color}20` }}>
                  <section.icon size={14} style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-xs mb-0.5">{section.title}</h3>
                  <p className="text-[#aaaacc] text-[10px] leading-relaxed line-clamp-2 mb-1.5">{section.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {section.keywords.slice(0, 3).map(kw => (
                      <span key={kw} className="text-[7px] px-1 py-0.5 rounded-full border font-medium"
                        style={{ borderColor: `${section.color}25`, color: `${section.color}aa`, background: `${section.color}08` }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight size={12} className="text-[#8888aa] group-hover:text-white transition-colors flex-shrink-0 mt-1" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Total Layers</div>
            <div className="text-white font-mono text-lg font-bold">7</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Active Agents</div>
            <div className="text-[#9d4edd] font-mono text-lg font-bold">{systemMetrics.activeAgents}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Knowledge</div>
            <div className="text-[#FFB627] font-mono text-lg font-bold">{systemMetrics.knowledgeEntries}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Providers</div>
            <div className="text-[#00ffff] font-mono text-lg font-bold">{systemMetrics.activeProviders}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN LAYER EXPLANATION (was SelfLayerExplanation)
// ═══════════════════════════════════════════════════════════

export function BrainLayerExplanation() {
  const { brainConfig } = useOSStore();

  const aspects = [
    { label: 'Reasoning', value: brainConfig.reasoningStyle, icon: Brain, color: '#9d4edd' },
    { label: 'Memory', value: brainConfig.memoryMethod, icon: Database, color: '#2E86AB' },
    { label: 'Coding', value: brainConfig.codingWorkflow, icon: FileCode2, color: '#00ff88' },
    { label: 'Research', value: brainConfig.researchMethod, icon: Search, color: '#FFB627' },
    { label: 'Context', value: brainConfig.contextStrategy, icon: Layers, color: '#00ffff' },
    { label: 'Tools', value: brainConfig.toolUsagePattern, icon: Wrench, color: '#E8751A' },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9d4edd] to-[#7B2CBF] flex items-center justify-center">
          <Brain size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Brain Layer — Native Intelligence</h3>
          <p className="text-[#aaaacc] text-[11px]">The Brain is the primary intelligence of Agentic OS. External models are interchangeable execution engines.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {aspects.map(aspect => (
          <div key={aspect.label} className="rounded-lg border p-3" style={{ borderColor: `${aspect.color}15`, background: `${aspect.color}05` }}>
            <div className="flex items-center gap-2 mb-1">
              <aspect.icon size={12} style={{ color: aspect.color }} />
              <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{aspect.label}</span>
            </div>
            <span className="text-white text-sm font-mono font-bold capitalize">{String(aspect.value).replace(/-/g, ' ')}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(157,78,221,0.08)]">
        <p className="text-[#ccccdd] text-sm leading-relaxed">
          The Brain Layer handles all cognitive operations natively: planning, reasoning, tool selection,
          memory retrieval, agent delegation, and multi-agent coordination. It is provider-independent —
          external LLM models serve as interchangeable execution engines that the Brain dispatches to as needed.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// KNOWLEDGE SYSTEM STATUS (was OmiObsidianStatus)
// ═══════════════════════════════════════════════════════════

export function KnowledgeSystemStatus() {
  const { knowledgeEntries, memories, knowledgeGraph } = useOSStore();

  const systems = [
    { name: 'Knowledge Base', status: 'active', count: knowledgeEntries.length, color: '#FFB627', icon: Search },
    { name: 'Memory Engine', status: 'active', count: memories.length, color: '#2E86AB', icon: Database },
    { name: 'Knowledge Graph', status: knowledgeGraph.nodes.length > 0 ? 'active' : 'empty', count: knowledgeGraph.nodes.length, color: '#00ffff', icon: Network },
    { name: 'RAG Engine', status: 'ready', count: 0, color: '#00ff88', icon: Zap },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Search size={16} className="text-[#FFB627]" /> Knowledge System
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">L4 KNOWLEDGE</span>
      </div>
      <div className="space-y-3">
        {systems.map(sys => (
          <div key={sys.name} className="flex items-center justify-between p-3 rounded-lg border"
            style={{ borderColor: `${sys.color}15`, background: `${sys.color}05` }}>
            <div className="flex items-center gap-3">
              <sys.icon size={16} style={{ color: sys.color }} />
              <div>
                <span className="text-white text-sm font-medium">{sys.name}</span>
                <div className="text-[9px] text-[#8888aa] capitalize">{sys.status}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono text-sm font-bold">{sys.count}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${sys.status === 'active' ? 'animate-pulse bg-[#00ff88]' : 'bg-[#8888aa]'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPOUND VISUALIZER
// ═══════════════════════════════════════════════════════════

export function CompoundVisualizer() {
  const { systemMetrics } = useOSStore();
  const days = [1, 7, 14, 30, 60, 90];
  const compoundFactors = [1, 1.8, 3.2, 7.5, 18, 42];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <TrendingUp size={16} className="text-[#FFB627]" /> Compound Growth
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">KNOWLEDGE × TIME</span>
      </div>
      <div className="space-y-3">
        {days.map((day, i) => (
          <div key={day} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#ccccdd] text-xs">Day {day}</span>
              <span className="text-[#FFB627] text-xs font-mono font-bold">{compoundFactors[i]}×</span>
            </div>
            <div className="w-full h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#FFB627]"
                initial={{ width: 0 }}
                animate={{ width: `${(compoundFactors[i] / 42) * 100}%` }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[rgba(157,78,221,0.08)]">
        <p className="text-[9px] text-[#8888aa]">Knowledge compounds. Each day, the Brain Layer learns, remembers, and reasons more effectively.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GOALS VIEW
// ═══════════════════════════════════════════════════════════

export function GoalsView() {
  const { selfSearchQuery, setSelfSearchQuery } = useOSStore();
  const [goals, setGoals] = useState<Goal[]>([
    { id: 'g1', title: 'Master Agentic OS Architecture', description: 'Understand the Brain Layer, Provider Layer, and Agent Layer deeply', progress: 35, status: 'active', category: 'Learning', createdAt: Date.now(), updatedAt: Date.now(), subtasks: [{ id: 's1', title: 'Understand Brain Layer', completed: true }, { id: 's2', title: 'Configure Provider', completed: false }, { id: 's3', title: 'Build first Agent', completed: false }] },
    { id: 'g2', title: 'Configure First Provider', description: 'Set up an LLM provider API key to enable execution', progress: 0, status: 'active', category: 'Setup', createdAt: Date.now(), updatedAt: Date.now(), subtasks: [{ id: 's4', title: 'Choose provider', completed: false }, { id: 's5', title: 'Add API key', completed: false }] },
    { id: 'g3', title: 'Build Knowledge Base', description: 'Add knowledge entries and build the knowledge graph', progress: 20, status: 'active', category: 'Knowledge', createdAt: Date.now(), updatedAt: Date.now(), subtasks: [{ id: 's6', title: 'Add first entry', completed: true }, { id: 's7', title: 'Connect entries', completed: false }] },
  ]);

  const filteredGoals = goals.filter(g =>
    !selfSearchQuery || g.title.toLowerCase().includes(selfSearchQuery.toLowerCase())
  );

  const statusColors: {[key: string]: string} = {
    active: '#00ff88', completed: '#9d4edd', paused: '#FFB627', archived: '#8888aa',
  };

  const toggleSubtask = (goalId: string, subtaskId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const subtasks = g.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
      const completed = subtasks.filter(s => s.completed).length;
      const progress = Math.round((completed / subtasks.length) * 100);
      return { ...g, subtasks, progress, updatedAt: Date.now() };
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg tracking-wider uppercase flex items-center gap-2">
          <Target size={20} className="text-[#00ff88]" /> Goals
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
          <input type="text" value={selfSearchQuery} onChange={e => setSelfSearchQuery(e.target.value)}
            placeholder="Search goals..."
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
        </div>
        <button className="px-4 py-2 rounded-lg bg-[#9d4edd] text-white text-sm font-medium hover:bg-[#7B2CBF] transition-colors flex items-center gap-2">
          <Plus size={14} /> New Goal
        </button>
      </div>
      <div className="space-y-3">
        {filteredGoals.map(goal => (
          <div key={goal.id} className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-white font-semibold text-sm">{goal.title}</h3>
                <p className="text-[#aaaacc] text-[11px]">{goal.description}</p>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase"
                style={{ borderColor: `${statusColors[goal.status]}30`, color: statusColors[goal.status], background: `${statusColors[goal.status]}10` }}>
                {goal.status}
              </span>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-[#8888aa]">Progress</span>
                <span className="text-[9px] text-white font-mono">{goal.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#00ff88]"
                  initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 1 }} />
              </div>
            </div>
            <div className="space-y-1">
              {goal.subtasks.map(sub => (
                <button key={sub.id} onClick={() => toggleSubtask(goal.id, sub.id)}
                  className="flex items-center gap-2 text-xs w-full text-left py-0.5 hover:bg-[rgba(157,78,221,0.05)] rounded px-1 transition-colors">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                    sub.completed ? 'bg-[#9d4edd] border-[#9d4edd]' : 'border-[#8888aa]'
                  }`}>
                    {sub.completed && <Check size={8} className="text-white" />}
                  </div>
                  <span className={sub.completed ? 'text-[#8888aa] line-through' : 'text-[#ccccdd]'}>{sub.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// JOURNAL VIEW
// ═══════════════════════════════════════════════════════════

export function JournalView() {
  const { selfSearchQuery, setSelfSearchQuery } = useOSStore();
  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: 'j1', title: 'Agentic OS Architecture Redesign', content: 'Completed the redesign to make Agentic OS completely provider-independent. The Brain Layer is now the native intelligence. External models are interchangeable execution engines.', mood: 'inspired', tags: ['architecture', 'brain', 'redesign'], createdAt: Date.now(), agent: 'Brain', type: 'milestone' },
    { id: 'j2', title: 'Brain Layer Activation', content: 'The Brain Layer is now the primary intelligence. It handles planning, reasoning, delegation, and coordination natively. No dependency on any external agent framework.', mood: 'focused', tags: ['brain', 'core'], createdAt: Date.now() - 86400000, agent: 'Brain', type: 'insight' },
    { id: 'j3', title: 'Provider-Independent Design', content: 'All dependencies on Hermes, Claude Desktop, OpenClaw, and Vault have been removed. The platform is now a clean, provider-independent operating system for AI agents.', mood: 'calm', tags: ['independence', 'cleanup'], createdAt: Date.now() - 172800000, agent: 'Brain', type: 'decision' },
  ]);
  const [newEntry, setNewEntry] = useState('');

  const filteredEntries = entries.filter(e =>
    !selfSearchQuery || e.title.toLowerCase().includes(selfSearchQuery.toLowerCase()) || e.content.toLowerCase().includes(selfSearchQuery.toLowerCase())
  );

  const moodColors: {[key: string]: string} = {
    inspired: '#9d4edd', focused: '#00ffff', reflective: '#2E86AB', energized: '#FFB627', calm: '#00ff88',
  };

  const addEntry = () => {
    if (!newEntry.trim()) return;
    setEntries(prev => [{
      id: `j-${Date.now()}`,
      title: newEntry.slice(0, 60),
      content: newEntry,
      mood: 'reflective',
      tags: ['journal'],
      createdAt: Date.now(),
      agent: 'Brain',
      type: 'reflection',
    }, ...prev]);
    setNewEntry('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg tracking-wider uppercase flex items-center gap-2">
          <BookOpen size={20} className="text-[#2E86AB]" /> Journal
        </h2>
      </div>
      <div className="flex gap-2">
        <input type="text" value={newEntry} onChange={e => setNewEntry(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Write a journal entry..."
          className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg px-3 py-2 text-white text-sm placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
        <button onClick={addEntry} className="px-4 py-2 rounded-lg bg-[#2E86AB] text-white text-sm font-medium hover:bg-[#1B998B] transition-colors">
          <Plus size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Search size={12} className="text-[#8888aa]" />
        <input type="text" value={selfSearchQuery} onChange={e => setSelfSearchQuery(e.target.value)}
          placeholder="Search journal..."
          className="flex-1 bg-transparent text-[#ccccdd] text-xs placeholder-[#8888aa] focus:outline-none" />
      </div>
      <div className="space-y-3">
        {filteredEntries.map(entry => (
          <div key={entry.id} className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-white font-semibold text-sm">{entry.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-bold capitalize"
                    style={{ borderColor: `${moodColors[entry.mood]}30`, color: moodColors[entry.mood], background: `${moodColors[entry.mood]}10` }}>
                    {entry.mood}
                  </span>
                  <span className="text-[8px] text-[#8888aa] font-mono">{entry.type}</span>
                  <span className="text-[8px] text-[#8888aa]">by {entry.agent}</span>
                </div>
              </div>
              <span className="text-[9px] text-[#8888aa]">{new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-[#ccccdd] text-[12px] leading-relaxed">{entry.content}</p>
            <div className="flex gap-1 mt-2">
              {entry.tags.map(tag => (
                <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[rgba(157,78,221,0.1)] text-[#9d4edd]">#{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MEMORY VIEW
// ═══════════════════════════════════════════════════════════

export function MemoryView() {
  const { memories, selfSearchQuery, setSelfSearchQuery } = useOSStore();

  const filteredMemories = memories.filter(m =>
    !selfSearchQuery || m.content.toLowerCase().includes(selfSearchQuery.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(selfSearchQuery.toLowerCase()))
  );

  const typeColors: {[key: string]: string} = {
    'short-term': '#00ffff', 'long-term': '#9d4edd', 'episodic': '#FFB627', 'semantic': '#00ff88', 'procedural': '#E8751A',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg tracking-wider uppercase flex items-center gap-2">
          <Database size={20} className="text-[#2E86AB]" /> Memory
        </h2>
        <span className="text-[10px] text-[#8888aa] font-mono">{memories.length} ENTRIES</span>
      </div>
      <div className="flex items-center gap-2">
        <Search size={12} className="text-[#8888aa]" />
        <input type="text" value={selfSearchQuery} onChange={e => setSelfSearchQuery(e.target.value)}
          placeholder="Search memories..."
          className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg px-3 py-2 text-white text-sm placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
      </div>
      <div className="space-y-3">
        {filteredMemories.map((memory: MemoryEntry) => (
          <div key={memory.id} className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border font-bold capitalize"
                  style={{ borderColor: `${typeColors[memory.type] || '#8888aa'}30`, color: typeColors[memory.type] || '#8888aa', background: `${typeColors[memory.type] || '#8888aa'}10` }}>
                  {memory.type}
                </span>
                <span className="text-[8px] text-[#8888aa]">by {memory.agent}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-[#8888aa]">Importance:</span>
                <div className="w-12 h-1 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#9d4edd]" style={{ width: `${memory.importance * 100}%` }} />
                </div>
              </div>
            </div>
            <p className="text-[#ccccdd] text-[12px] leading-relaxed">{memory.content}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1">
                {memory.tags.map(tag => (
                  <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[rgba(157,78,221,0.1)] text-[#9d4edd]">#{tag}</span>
                ))}
              </div>
              <span className="text-[8px] text-[#8888aa] font-mono">×{memory.accessCount}</span>
            </div>
          </div>
        ))}
        {filteredMemories.length === 0 && (
          <div className="text-[#8888aa] text-sm text-center py-8">No memories found. The Brain Layer will create memories as you use the system.</div>
        )}
      </div>
    </div>
  );
}
