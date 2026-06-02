'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Filter, Play, Pause, SkipForward, SkipBack, Download,
  Search, ChevronDown, ChevronRight, Zap, Brain, Database,
  Shield, ArrowRightLeft, Eye, AlertTriangle, CheckCircle2,
  XCircle, Activity, Hash, Cpu, RefreshCw, X, MessageSquare,
  Terminal, Globe, FileText, Layers,
} from 'lucide-react';

// ─── Types ───

type ActionType = 'query' | 'tool_call' | 'memory_op' | 'handoff' | 'api_call' | 'permission_change';
type Severity = 'info' | 'warn' | 'error' | 'success';
type AgentId = 'claude' | 'openclaw' | 'hermes' | 'vault';

interface AuditAction {
  id: string;
  timestamp: number;
  agentId: AgentId;
  actionType: ActionType;
  severity: Severity;
  description: string;
  request: string;
  response: string;
  tokensUsed: number;
  latencyMs: number;
  metadata: Record<string, string>;
}

// ─── Color Constants ───

const AGENT_COLORS: Record<AgentId, string> = {
  claude: '#E63946',
  openclaw: '#E8751A',
  hermes: '#FFB627',
  vault: '#2E86AB',
};

const AGENT_NAMES: Record<AgentId, string> = {
  claude: 'Claude',
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  vault: 'Self Vault',
};

const ACTION_COLORS: Record<ActionType, string> = {
  query: '#00ffff',
  tool_call: '#9d4edd',
  memory_op: '#2E86AB',
  handoff: '#FFB627',
  api_call: '#00ff88',
  permission_change: '#E63946',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  info: '#00ffff',
  warn: '#FFB627',
  error: '#E63946',
  success: '#00ff88',
};

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  query: <MessageSquare size={12} />,
  tool_call: <Zap size={12} />,
  memory_op: <Database size={12} />,
  handoff: <ArrowRightLeft size={12} />,
  api_call: <Globe size={12} />,
  permission_change: <Shield size={12} />,
};

// ─── Mock Data Generator ───

function generateAuditActions(): AuditAction[] {
  const actions: Omit<AuditAction, 'id' | 'timestamp'>[] = [
    { agentId: 'claude', actionType: 'query', severity: 'success', description: 'Processed multi-step reasoning query', request: 'Analyze the Q3 revenue projections vs actuals', response: 'Analysis complete: 12.4% variance detected in projected vs actual Q3 revenue...', tokensUsed: 4230, latencyMs: 1842, metadata: { model: 'claude-3.5-sonnet', context: '64k' } },
    { agentId: 'hermes', actionType: 'tool_call', severity: 'success', description: 'Executed web_search skill', request: 'Search: "competitor AI stack pricing 2025"', response: 'Found 14 results across 6 domains, extracted pricing data...', tokensUsed: 1820, latencyMs: 3400, metadata: { skill: 'web_search', toolCount: '3' } },
    { agentId: 'vault', actionType: 'memory_op', severity: 'success', description: 'Stored episodic memory entry', request: 'Store: Q3 revenue analysis findings', response: 'Memory entry #12848 created with embedding hash 0xf4a2...', tokensUsed: 340, latencyMs: 45, metadata: { memoryType: 'episodic', vaultSize: '2.4GB' } },
    { agentId: 'openclaw', actionType: 'handoff', severity: 'info', description: 'Routed task from Claude to Hermes', request: 'Delegate: competitor research task', response: 'Task routed successfully, Hermes session #2847 started', tokensUsed: 120, latencyMs: 89, metadata: { route: 'claude→hermes', priority: 'high' } },
    { agentId: 'hermes', actionType: 'api_call', severity: 'success', description: 'Called Browserbase API for scraping', request: 'POST /api/scrape { url: "competitor.com/pricing" }', response: '200 OK — HTML extracted, 42KB raw content', tokensUsed: 560, latencyMs: 8700, metadata: { endpoint: 'browserbase', statusCode: '200' } },
    { agentId: 'claude', actionType: 'query', severity: 'warn', description: 'Approaching context window limit', request: 'Extended reasoning with 58K tokens consumed', response: 'Warning: context window at 89% capacity, truncating older messages', tokensUsed: 58400, latencyMs: 2100, metadata: { model: 'claude-3.5-sonnet', contextUsage: '89%' } },
    { agentId: 'openclaw', actionType: 'permission_change', severity: 'warn', description: 'Hermes requested elevated browser access', request: 'Permission escalation: browser_automation → full_network', response: 'Denied — sandbox policy prevents network escalation', tokensUsed: 80, latencyMs: 12, metadata: { policy: 'sandbox_v2', denied: 'true' } },
    { agentId: 'vault', actionType: 'memory_op', severity: 'success', description: 'Exported memory snapshot to Obsidian', request: 'Export: daily snapshot for 2025-05-31', response: '47 notes exported, 3 goals updated, 12 tags reconciled', tokensUsed: 220, latencyMs: 180, metadata: { format: 'markdown', notes: '47' } },
    { agentId: 'hermes', actionType: 'tool_call', severity: 'error', description: 'API rate limit exceeded on external service', request: 'GET /api/competitors (4th call in 10s)', response: '429 Too Many Requests — retrying in 30s with exponential backoff', tokensUsed: 45, latencyMs: 120, metadata: { statusCode: '429', retryIn: '30s' } },
    { agentId: 'claude', actionType: 'tool_call', severity: 'success', description: 'Executed code in sandbox environment', request: 'Execute: python3 analysis.py --quarter=Q3', response: 'Exit code 0 — output: variance_report.csv generated', tokensUsed: 1240, latencyMs: 4200, metadata: { lang: 'python3', exitCode: '0' } },
    { agentId: 'openclaw', actionType: 'handoff', severity: 'success', description: 'Coordinated multi-agent swarm session', request: 'Initiate swarm: 3 agents for market analysis', response: 'Swarm session #412 formed — consensus reached in 2 rounds', tokensUsed: 680, latencyMs: 5400, metadata: { agents: '3', rounds: '2', strategy: 'consensus' } },
    { agentId: 'vault', actionType: 'memory_op', severity: 'info', description: 'Memory decay cycle completed', request: 'Run decay: reduce weight of entries older than 90 days', response: '412 entries decayed, 23 archived, 0 deleted', tokensUsed: 150, latencyMs: 2300, metadata: { decayed: '412', archived: '23' } },
    { agentId: 'hermes', actionType: 'api_call', severity: 'success', description: 'Synced MCP server tool registry', request: 'GET /mcp/registry/sync', response: '12 servers synced, 156 tools available', tokensUsed: 890, latencyMs: 1200, metadata: { servers: '12', tools: '156' } },
    { agentId: 'claude', actionType: 'query', severity: 'success', description: 'Vision pipeline processed screenshot', request: 'Analyze: dashboard_screenshot_0531.png', response: 'Identified 3 anomalies in revenue chart, flagged for review', tokensUsed: 3200, latencyMs: 5600, metadata: { model: 'claude-3.5-sonnet', mode: 'vision' } },
    { agentId: 'openclaw', actionType: 'permission_change', severity: 'success', description: 'Granted Claude sandboxed code execution', request: 'Permission grant: code_execute (sandboxed)', response: 'Permission granted with 512MB memory limit, 30s timeout', tokensUsed: 60, latencyMs: 8, metadata: { scope: 'sandboxed', memLimit: '512MB' } },
    { agentId: 'hermes', actionType: 'tool_call', severity: 'success', description: 'Completed SEO content generation', request: 'Generate: 3 blog posts for keyword cluster "AI agent platform"', response: '3 posts generated, avg 1,847 words, SEO score 92/100', tokensUsed: 8400, latencyMs: 12000, metadata: { posts: '3', avgWords: '1847', seoScore: '92' } },
  ];

  // Deterministic timestamp base to avoid hydration mismatch
  const now = 1700000000000;
  return actions.map((a, i) => ({
    ...a,
    id: `audit-${i + 1}`,
    timestamp: now - (actions.length - i) * 180000 + ((i * 37 + 13) % 60) * 1000,
  }));
}

// ─── GlassCard Component ───

function GlassCard({ children, className = '', glowColor, onClick }: {
  children: React.ReactNode; className?: string; glowColor?: string; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={glowColor ? { scale: 1.005 } : undefined}
      onClick={onClick}
      className={`rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] ${className}`}
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}20, inset 0 1px 0 ${glowColor}15` } : undefined}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Component ───

export function AuditTrail() {
  const [actions] = useState<AuditAction[]>(() => generateAuditActions());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<AgentId | 'all'>('all');
  const [filterAction, setFilterAction] = useState<ActionType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const replayInterval = useRef<NodeJS.Timeout | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filtered actions
  const filteredActions = useMemo(() => {
    let result = [...actions].sort((a, b) => a.timestamp - b.timestamp);
    if (filterAgent !== 'all') result = result.filter(a => a.agentId === filterAgent);
    if (filterAction !== 'all') result = result.filter(a => a.actionType === filterAction);
    if (filterSeverity !== 'all') result = result.filter(a => a.severity === filterSeverity);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.description.toLowerCase().includes(q) ||
        a.request.toLowerCase().includes(q) ||
        a.agentId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [actions, filterAgent, filterAction, filterSeverity, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const today = actions.length;
    const byAgent: Record<string, number> = {};
    let errors = 0;
    for (const a of actions) {
      byAgent[a.agentId] = (byAgent[a.agentId] || 0) + 1;
      if (a.severity === 'error') errors++;
    }
    const errorRate = today > 0 ? ((errors / today) * 100).toFixed(1) : '0';
    return { today, byAgent, errorRate, errors };
  }, [actions]);

  // Replay logic
  const visibleActions = useMemo(() => {
    if (!replayMode) return filteredActions;
    return filteredActions.slice(0, replayIndex + 1);
  }, [filteredActions, replayMode, replayIndex]);

  const startReplay = useCallback(() => {
    setReplayMode(true);
    setReplayIndex(0);
    setIsPlaying(true);
  }, []);

  const stopReplay = useCallback(() => {
    setReplayMode(false);
    setIsPlaying(false);
    setReplayIndex(0);
    if (replayInterval.current) clearInterval(replayInterval.current);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (replayInterval.current) clearInterval(replayInterval.current);
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stepForward = useCallback(() => {
    setReplayIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
  }, [filteredActions.length]);

  const stepBackward = useCallback(() => {
    setReplayIndex(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    if (isPlaying && replayMode) {
      replayInterval.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= filteredActions.length - 1) {
            setIsPlaying(false);
            if (replayInterval.current) clearInterval(replayInterval.current);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (replayInterval.current) clearInterval(replayInterval.current);
    };
  }, [isPlaying, replayMode, filteredActions.length]);

  // Export JSON
  const exportAudit = useCallback(() => {
    const blob = new Blob([JSON.stringify(filteredActions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredActions]);

  const selectedActionData = useMemo(() => actions.find(a => a.id === selectedAction), [actions, selectedAction]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const actionTypes: ActionType[] = ['query', 'tool_call', 'memory_op', 'handoff', 'api_call', 'permission_change'];
  const severities: Severity[] = ['info', 'warn', 'error', 'success'];
  const agentIds: AgentId[] = ['claude', 'openclaw', 'hermes', 'vault'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,255,0.1)', boxShadow: '0 0 15px rgba(0,255,255,0.3)' }}
          >
            <Clock className="w-5 h-5" style={{ color: '#00ffff' }} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">Audit Trail</h2>
            <p className="text-sm" style={{ color: '#8888aa' }}>
              <span className="font-mono" style={{ color: '#00ffff' }}>{stats.today}</span> actions today · <span className="font-mono" style={{ color: stats.errors > 0 ? '#E63946' : '#00ff88' }}>{stats.errorRate}%</span> error rate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#8888aa' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search actions..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white text-xs placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,255,0.3)] w-44"
            />
          </div>

          <button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-xs hover:bg-[rgba(157,78,221,0.1)] transition-colors" style={{ color: '#ccccdd' }}>
            <Filter size={12} /> Filters
          </button>

          <button onClick={exportAudit} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] text-xs hover:bg-[rgba(0,255,136,0.1)] transition-colors" style={{ color: '#00ff88' }}>
            <Download size={12} /> Export
          </button>

          {replayMode ? (
            <button onClick={stopReplay} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(230,57,70,0.2)] bg-[rgba(230,57,70,0.05)] text-xs hover:bg-[rgba(230,57,70,0.1)] transition-colors" style={{ color: '#E63946' }}>
              <X size={12} /> Exit Replay
            </button>
          ) : (
            <button onClick={startReplay} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(157,78,221,0.2)] bg-[rgba(157,78,221,0.05)] text-xs hover:bg-[rgba(157,78,221,0.1)] transition-colors" style={{ color: '#9d4edd' }}>
              <Play size={12} /> Replay
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <GlassCard className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Agent Filter */}
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Agent</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterAgent('all')} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ background: filterAgent === 'all' ? 'rgba(157,78,221,0.2)' : 'rgba(18,18,42,0.4)', color: filterAgent === 'all' ? '#9d4edd' : '#8888aa', border: `1px solid ${filterAgent === 'all' ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.1)'}` }}>All</button>
                    {agentIds.map(id => (
                      <button key={id} onClick={() => setFilterAgent(id)} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ background: filterAgent === id ? `${AGENT_COLORS[id]}20` : 'rgba(18,18,42,0.4)', color: filterAgent === id ? AGENT_COLORS[id] : '#8888aa', border: `1px solid ${filterAgent === id ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)'}` }}>{AGENT_NAMES[id]}</button>
                    ))}
                  </div>
                </div>
                {/* Action Type Filter */}
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Action Type</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterAction('all')} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ background: filterAction === 'all' ? 'rgba(157,78,221,0.2)' : 'rgba(18,18,42,0.4)', color: filterAction === 'all' ? '#9d4edd' : '#8888aa', border: `1px solid ${filterAction === 'all' ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.1)'}` }}>All</button>
                    {actionTypes.map(t => (
                      <button key={t} onClick={() => setFilterAction(t)} className="px-2 py-1 rounded-lg text-xs capitalize transition-colors flex items-center gap-1" style={{ background: filterAction === t ? `${ACTION_COLORS[t]}20` : 'rgba(18,18,42,0.4)', color: filterAction === t ? ACTION_COLORS[t] : '#8888aa', border: `1px solid ${filterAction === t ? `${ACTION_COLORS[t]}40` : 'rgba(157,78,221,0.1)'}` }}>{ACTION_ICONS[t]} {t.replace('_', ' ')}</button>
                    ))}
                  </div>
                </div>
                {/* Severity Filter */}
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Severity</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterSeverity('all')} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ background: filterSeverity === 'all' ? 'rgba(157,78,221,0.2)' : 'rgba(18,18,42,0.4)', color: filterSeverity === 'all' ? '#9d4edd' : '#8888aa', border: `1px solid ${filterSeverity === 'all' ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.1)'}` }}>All</button>
                    {severities.map(s => (
                      <button key={s} onClick={() => setFilterSeverity(s)} className="px-2 py-1 rounded-lg text-xs capitalize transition-colors" style={{ background: filterSeverity === s ? `${SEVERITY_COLORS[s]}20` : 'rgba(18,18,42,0.4)', color: filterSeverity === s ? SEVERITY_COLORS[s] : '#8888aa', border: `1px solid ${filterSeverity === s ? `${SEVERITY_COLORS[s]}40` : 'rgba(157,78,221,0.1)'}` }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Actions', value: stats.today, color: '#00ffff', icon: <Activity size={14} /> },
          { label: 'Errors', value: stats.errors, color: '#E63946', icon: <AlertTriangle size={14} /> },
          { label: 'Most Active', value: Object.entries(stats.byAgent).sort((a, b) => b[1] - a[1])[0] ? AGENT_NAMES[Object.entries(stats.byAgent).sort((a, b) => b[1] - a[1])[0][0] as AgentId] : '—', color: '#FFB627', icon: <Cpu size={14} /> },
          { label: 'Error Rate', value: `${stats.errorRate}%`, color: parseFloat(stats.errorRate) > 10 ? '#E63946' : '#00ff88', icon: <Hash size={14} /> },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard glowColor={stat.color} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="font-mono text-lg font-bold text-white">{stat.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Replay Controls */}
      <AnimatePresence>
        {replayMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard glowColor="#9d4edd" className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(157,78,221,0.2)] text-[#9d4edd] font-bold uppercase">Replay Mode</span>
                  <span className="text-[10px] font-mono text-[#ccccdd]">{replayIndex + 1} / {filteredActions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={stepBackward} className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors" aria-label="Step backward">
                    <SkipBack size={14} style={{ color: '#ccccdd' }} />
                  </button>
                  <button onClick={togglePlayPause} className="p-2 rounded-lg border border-[rgba(157,78,221,0.2)] bg-[rgba(157,78,221,0.1)] hover:bg-[rgba(157,78,221,0.2)] transition-colors" aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={16} style={{ color: '#9d4edd' }} /> : <Play size={16} style={{ color: '#9d4edd' }} />}
                  </button>
                  <button onClick={stepForward} className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors" aria-label="Step forward">
                    <SkipForward size={14} style={{ color: '#ccccdd' }} />
                  </button>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#9d4edd88] to-[#9d4edd]"
                      animate={{ width: `${((replayIndex + 1) / filteredActions.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline + Detail Panel */}
      <div className="flex gap-4">
        {/* Timeline */}
        <div className="flex-1 min-w-0">
          <div className="max-h-[520px] overflow-y-auto custom-scrollbar pr-2">
            <div className="relative pl-6 border-l-2 border-[rgba(157,78,221,0.15)]">
              <AnimatePresence>
                {visibleActions.map((action, i) => {
                  const isSelected = selectedAction === action.id;
                  const isReplayCurrent = replayMode && replayIndex === filteredActions.indexOf(action);
                  const color = ACTION_COLORS[action.actionType];
                  const agentColor = AGENT_COLORS[action.agentId];

                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="relative mb-3"
                    >
                      {/* Timeline dot */}
                      <motion.div
                        className="absolute -left-[31px] top-3.5 w-3 h-3 rounded-full z-10"
                        style={{
                          background: color,
                          boxShadow: isReplayCurrent
                            ? `0 0 12px ${color}, 0 0 24px ${color}60`
                            : `0 0 6px ${color}60`,
                        }}
                        animate={isReplayCurrent ? { scale: [1, 1.5, 1] } : {}}
                        transition={{ duration: 1, repeat: isReplayCurrent ? Infinity : 0 }}
                      />

                      <GlassCard
                        glowColor={isSelected ? color : isReplayCurrent ? '#9d4edd' : undefined}
                        className="p-3 cursor-pointer"
                        onClick={() => setSelectedAction(isSelected ? null : action.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Agent badge */}
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${agentColor}20`, color: agentColor }}>
                            <Brain size={13} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-semibold" style={{ color: agentColor }}>{AGENT_NAMES[action.agentId]}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] capitalize font-medium flex items-center gap-1" style={{ background: `${color}20`, color }}>
                                {ACTION_ICONS[action.actionType]} {action.actionType.replace('_', ' ')}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] capitalize" style={{ background: `${SEVERITY_COLORS[action.severity]}20`, color: SEVERITY_COLORS[action.severity] }}>
                                {action.severity === 'success' ? <CheckCircle2 size={10} className="inline mr-0.5" /> : action.severity === 'error' ? <XCircle size={10} className="inline mr-0.5" /> : null}
                                {action.severity}
                              </span>
                              <span className="font-mono text-[10px] ml-auto" style={{ color: '#8888aa' }}>{formatTime(action.timestamp)}</span>
                            </div>
                            <div className="text-xs text-white truncate">{action.description}</div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[9px] font-mono" style={{ color: '#8888aa' }}>{(action.tokensUsed ?? 0).toLocaleString('en-US')} tokens</span>
                              <span className="text-[9px] font-mono" style={{ color: action.latencyMs > 5000 ? '#E63946' : action.latencyMs > 2000 ? '#FFB627' : '#00ff88' }}>{action.latencyMs}ms</span>
                            </div>
                          </div>

                          <motion.div animate={{ rotate: isSelected ? 90 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronRight size={14} style={{ color: '#8888aa' }} />
                          </motion.div>
                        </div>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)] space-y-2">
                                <div>
                                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Request</div>
                                  <div className="bg-[rgba(10,10,26,0.6)] rounded-lg p-2 text-[10px] font-mono text-[#ccccdd] border border-[rgba(157,78,221,0.1)]">{action.request}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Response</div>
                                  <div className="bg-[rgba(10,10,26,0.6)] rounded-lg p-2 text-[10px] font-mono text-[#ccccdd] border border-[rgba(157,78,221,0.1)]">{action.response}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Metadata</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(action.metadata).map(([k, v]) => (
                                      <span key={k} className="px-1.5 py-0.5 rounded text-[9px] bg-[rgba(10,10,26,0.4)] border border-[rgba(157,78,221,0.1)]" style={{ color: '#ccccdd' }}>
                                        <span style={{ color: '#8888aa' }}>{k}:</span> {v}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedActionData && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-72 shrink-0 hidden lg:block">
              <GlassCard glowColor={ACTION_COLORS[selectedActionData.actionType]} className="p-4 space-y-3 sticky top-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Action Detail</h4>
                  <button onClick={() => setSelectedAction(null)} className="text-[#8888aa] hover:text-white"><X size={14} /></button>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Agent', value: AGENT_NAMES[selectedActionData.agentId], color: AGENT_COLORS[selectedActionData.agentId] },
                    { label: 'Type', value: selectedActionData.actionType.replace('_', ' '), color: ACTION_COLORS[selectedActionData.actionType] },
                    { label: 'Severity', value: selectedActionData.severity, color: SEVERITY_COLORS[selectedActionData.severity] },
                    { label: 'Time', value: formatTime(selectedActionData.timestamp), color: '#ccccdd' },
                    { label: 'Tokens', value: (selectedActionData.tokensUsed ?? 0).toLocaleString('en-US'), color: '#00ffff' },
                    { label: 'Latency', value: `${selectedActionData.latencyMs}ms`, color: selectedActionData.latencyMs > 5000 ? '#E63946' : selectedActionData.latencyMs > 2000 ? '#FFB627' : '#00ff88' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center text-xs">
                      <span style={{ color: '#8888aa' }}>{item.label}</span>
                      <span className="font-mono font-medium capitalize" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[rgba(157,78,221,0.1)]">
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Description</div>
                  <div className="text-xs text-white">{selectedActionData.description}</div>
                </div>

                <div className="pt-2 border-t border-[rgba(157,78,221,0.1)]">
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Request</div>
                  <div className="text-[10px] font-mono text-[#ccccdd] bg-[rgba(10,10,26,0.5)] rounded-lg p-2 max-h-24 overflow-y-auto custom-scrollbar">{selectedActionData.request}</div>
                </div>

                <div className="pt-2 border-t border-[rgba(157,78,221,0.1)]">
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Response</div>
                  <div className="text-[10px] font-mono text-[#ccccdd] bg-[rgba(10,10,26,0.5)] rounded-lg p-2 max-h-24 overflow-y-auto custom-scrollbar">{selectedActionData.response}</div>
                </div>

                <div className="pt-2 border-t border-[rgba(157,78,221,0.1)]">
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Metadata</div>
                  {Object.entries(selectedActionData.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#8888aa' }}>{k}</span>
                      <span className="font-mono text-[#ccccdd]">{v}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(18,18,42,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157,78,221,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}
