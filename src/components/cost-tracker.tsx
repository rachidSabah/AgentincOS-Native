'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, Flame, PieChart, Calendar,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Radio, Send, Inbox, XCircle, RefreshCw, Zap,
  ArrowRight, Clock, Shield, Lightbulb,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════ */

const AGENT_COLORS: Record<string, string> = {
  claude: '#E63946',
  hermes: '#FFB627',
  openclaw: '#E8751A',
  vault: '#2E86AB',
};

const AGENT_NAMES: Record<string, string> = {
  claude: 'Claude',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
  vault: 'Vault',
};

const MSG_TYPE_COLORS: Record<string, string> = {
  task: '#7B2CBF',
  result: '#00ff88',
  query: '#2E86AB',
  broadcast: '#FFB627',
  error: '#ff4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#8888aa',
  medium: '#FFB627',
  high: '#E8751A',
  critical: '#ff4444',
};

function formatCost(n: number): string {
  return n < 0.01 ? n.toFixed(4) : n < 1 ? n.toFixed(3) : n.toFixed(2);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(ts: string | number): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/* ═══════════════════════════════════════════════════════════
   COST TRACKER COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface CostOverview {
  totalCost: number;
  totalTransactions: number;
  costByAgent: Record<string, { cost: number; transactions: number }>;
  costByModel: Record<string, { cost: number; transactions: number; inputTokens: number; outputTokens: number }>;
  costByDay: Record<string, number>;
  burnRate: number;
  budget: {
    dailyLimit: number;
    monthlyLimit: number;
    dailySpend: number;
    monthlySpend: number;
    dailyPercent: number;
    monthlyPercent: number;
    alert: { alert: boolean; level: 'none' | 'warning' | 'critical'; messages: string[] };
  };
  recentTransactions: Array<{
    id: string;
    timestamp: string;
    agentId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    taskName?: string;
  }>;
}

interface OptimizeResponse {
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    potentialSavings: number;
  }>;
  totalPotentialSavings: number;
}

export function CostTracker() {
  const { budgetConfig, setBudgetConfig } = useOSStore();
  const [data, setData] = useState<CostOverview | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizeResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [localDaily, setLocalDaily] = useState(String(budgetConfig.dailyLimit));
  const [localMonthly, setLocalMonthly] = useState(String(budgetConfig.monthlyLimit));
  const [localThreshold, setLocalThreshold] = useState(budgetConfig.alertThreshold * 100);
  const [localHardStop, setLocalHardStop] = useState(budgetConfig.hardStop);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/cost');
      if (res.ok) {
        const json = await res.json();
        setData(json as CostOverview);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptimize = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize' }),
      });
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json as OptimizeResponse);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30_000); return () => clearInterval(i); }, [fetchData]);
  useEffect(() => { fetchOptimize(); const i = setInterval(fetchOptimize, 60_000); return () => clearInterval(i); }, [fetchOptimize]);

  const saveBudget = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/hermes/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-budget',
          dailyLimit: Number(localDaily),
          monthlyLimit: Number(localMonthly),
          alertThreshold: localThreshold / 100,
          hardStop: localHardStop,
        }),
      });
      if (res.ok) {
        setBudgetConfig({
          dailyLimit: Number(localDaily),
          monthlyLimit: Number(localMonthly),
          alertThreshold: localThreshold / 100,
          hardStop: localHardStop,
        });
      }
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[rgba(157,78,221,0.1)] rounded-xl" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-[rgba(157,78,221,0.05)] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const budgetPct = data.budget.dailyPercent;
  const barColor = budgetPct < 50 ? '#00ff88' : budgetPct < 80 ? '#FFB627' : '#ff4444';
  const maxAgentCost = Math.max(...Object.values(data.costByAgent).map(a => a.cost), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <DollarSign size={16} className="text-[#00ff88]" />
          Cost &amp; Budget Tracker
        </h2>
        <span className="text-[9px] text-[#8888aa] font-mono">
          {data.totalTransactions} txns
        </span>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Cost', value: `$${formatCost(data.totalCost)}`, color: '#00ff88', icon: DollarSign },
          { label: "Today's Spend", value: `$${formatCost(data.budget.dailySpend)}`, color: '#FFB627', icon: Calendar },
          { label: 'Burn Rate', value: `$${data.burnRate.toFixed(2)}/hr`, color: '#E8751A', icon: Flame },
          { label: 'Budget Used', value: `${budgetPct.toFixed(1)}%`, color: barColor, icon: PieChart },
          { label: 'Monthly Projected', value: `$${formatCost(data.budget.monthlySpend)}`, color: '#7B2CBF', icon: TrendingUp },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-4"
            style={{ borderColor: `${m.color}25`, background: `${m.color}06` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <m.icon size={11} style={{ color: m.color }} />
              <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{m.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-lg" style={{ color: m.color }}>
              {m.value}
            </div>
            {m.label === 'Budget Used' && (
              <div className="mt-2 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: barColor }}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(budgetPct, 100)}%` }}
                  transition={{ duration: 0.8 }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Budget Status Bar */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
            {data.budget.alert.level === 'critical' ? <AlertTriangle size={11} className="text-[#ff4444]" /> :
             data.budget.alert.level === 'warning' ? <AlertTriangle size={11} className="text-[#FFB627]" /> :
             <CheckCircle size={11} className="text-[#00ff88]" />}
            Daily Budget Status
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono" style={{ color: barColor }}>
              ${formatCost(data.budget.dailySpend)} / ${data.budget.dailyLimit.toFixed(2)}
            </span>
            {budgetConfig.hardStop && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#ff444415] text-[#ff4444] font-bold border border-[#ff444430]">
                HARD STOP
              </span>
            )}
          </div>
        </div>
        <div className="relative h-3 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ backgroundColor: barColor }}
            initial={{ width: 0 }} animate={{ width: `${Math.min(budgetPct, 100)}%` }}
            transition={{ duration: 0.8 }} />
          {budgetPct >= 80 && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#ff4444] rounded-r-full animate-pulse" />
          )}
        </div>
        {data.budget.alert.alert && (
          <div className="mt-2 space-y-0.5">
            {data.budget.alert.messages.map((msg, i) => (
              <p key={i} className="text-[9px] font-medium" style={{
                color: data.budget.alert.level === 'critical' ? '#ff4444' : '#FFB627',
              }}>
                {msg}
              </p>
            ))}
          </div>
        )}
      </motion.div>

      {/* Cost by Agent + Cost by Model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost by Agent */}
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
            <PieChart size={12} className="text-[#7B2CBF]" /> Cost by Agent
          </h3>
          <div className="space-y-3">
            {Object.entries(data.costByAgent).sort((a, b) => b[1].cost - a[1].cost).map(([agentId, info]) => {
              const color = AGENT_COLORS[agentId] || '#8888aa';
              const pct = (info.cost / maxAgentCost) * 100;
              return (
                <div key={agentId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-white font-medium">
                        {AGENT_NAMES[agentId] || agentId}
                      </span>
                      <span className="text-[9px] text-[#8888aa] font-mono">{info.transactions} txns</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>
                      ${formatCost(info.cost)}
                    </span>
                  </div>
                  <div className="h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.costByAgent).length === 0 && (
              <p className="text-[10px] text-[#8888aa] text-center py-4">No agent transactions yet</p>
            )}
          </div>
        </motion.div>

        {/* Cost by Model */}
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Zap size={12} className="text-[#FFB627]" /> Cost by Model
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
            {Object.entries(data.costByModel).sort((a, b) => b[1].cost - a[1].cost).map(([model, info]) => (
              <div key={model} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white font-mono font-medium">{model}</span>
                  <span className="text-[10px] font-mono font-bold text-[#00ff88]">${formatCost(info.cost)}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-[#8888aa]">
                  <span className="font-mono">{formatTokens(info.inputTokens)} in</span>
                  <span className="font-mono">{formatTokens(info.outputTokens)} out</span>
                  <span>{info.transactions} calls</span>
                </div>
              </div>
            ))}
            {Object.keys(data.costByModel).length === 0 && (
              <p className="text-[10px] text-[#8888aa] text-center py-4">No model data yet</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Clock size={12} className="text-[#E8751A]" /> Recent Transactions
        </h3>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {data.recentTransactions.map((tx, i) => {
            const color = AGENT_COLORS[tx.agentId] || '#8888aa';
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[rgba(157,78,221,0.06)] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-medium flex-shrink-0" style={{ color }}>
                  {AGENT_NAMES[tx.agentId] || tx.agentId}
                </span>
                <span className="text-[9px] text-[#8888aa] font-mono truncate">{tx.model}</span>
                <span className="text-[9px] text-[#8888aa] font-mono flex-shrink-0">
                  {formatTokens(tx.inputTokens)}/{formatTokens(tx.outputTokens)}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#00ff88] flex-shrink-0 ml-auto">
                  ${formatCost(tx.cost)}
                </span>
                <span className="text-[9px] text-[#8888aa] flex-shrink-0">{timeAgo(tx.timestamp)}</span>
              </motion.div>
            );
          })}
          {data.recentTransactions.length === 0 && (
            <p className="text-[10px] text-[#8888aa] text-center py-4">No transactions recorded yet</p>
          )}
        </div>
      </motion.div>

      {/* Budget Settings — collapsible */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-[rgba(157,78,221,0.04)] transition-colors">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Shield size={12} className="text-[#2E86AB]" /> Budget Settings
          </h3>
          {settingsOpen ? <ChevronUp size={14} className="text-[#8888aa]" /> : <ChevronDown size={14} className="text-[#8888aa]" />}
        </button>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Daily Limit ($)</label>
                  <input type="number" value={localDaily} onChange={e => setLocalDaily(e.target.value)}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
                </div>
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Monthly Limit ($)</label>
                  <input type="number" value={localMonthly} onChange={e => setLocalMonthly(e.target.value)}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Alert Threshold</label>
                  <span className="text-[10px] font-mono text-[#FFB627]">{localThreshold.toFixed(0)}%</span>
                </div>
                <input type="range" min={10} max={100} step={5} value={localThreshold}
                  onChange={e => setLocalThreshold(Number(e.target.value))}
                  className="w-full accent-[#7B2CBF] h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                <div>
                  <span className="text-[10px] text-white font-medium">Hard Stop</span>
                  <p className="text-[9px] text-[#8888aa]">Block transactions that would exceed budget</p>
                </div>
                <button onClick={() => setLocalHardStop(!localHardStop)}
                  className={`w-10 h-5 rounded-full transition-all duration-200 relative ${localHardStop ? 'bg-[#ff4444]' : 'bg-[rgba(136,136,170,0.3)]'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${localHardStop ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
              <button onClick={saveBudget} disabled={sending}
                className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}>
                {sending ? 'Saving...' : 'Save Budget Settings'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Optimization Suggestions */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Lightbulb size={12} className="text-[#FFB627]" /> Optimization Suggestions
          {suggestions && suggestions.totalPotentialSavings > 0 && (
            <span className="ml-auto text-[9px] font-mono text-[#00ff88]">
              Save up to ${formatCost(suggestions.totalPotentialSavings)}
            </span>
          )}
        </h3>
        <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
          {suggestions?.suggestions.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-[rgba(255,182,39,0.12)] bg-[rgba(10,10,26,0.4)] p-3">
              <div className="flex items-start gap-2">
                <Zap size={10} className="text-[#FFB627] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white font-medium">{s.title}</span>
                    {s.potentialSavings > 0 && (
                      <span className="text-[9px] font-mono text-[#00ff88] flex-shrink-0">
                        ~${formatCost(s.potentialSavings)}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-[#8888aa] mt-0.5 leading-relaxed">{s.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {(!suggestions || suggestions.suggestions.length === 0) && (
            <p className="text-[10px] text-[#8888aa] text-center py-4">No suggestions yet — record transactions to get AI-powered tips</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   AGENT MESSAGE BUS COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface MessageBusStats {
  totalMessages: number;
  activeChannels: string[];
  recentMessages: Array<{
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
  }>;
  agentInboxes: Record<string, number>;
  deadLetterCount: number;
}

interface DeadLetterEntry {
  message: { id: string; from: string; to: string; subject: string; priority: string; retries: number };
  reason: string;
  failedAt: number;
}

export function AgentMessageBus() {
  const [stats, setStats] = useState<MessageBusStats | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Send message form state
  const [msgFrom, setMsgFrom] = useState('claude');
  const [msgTo, setMsgTo] = useState('hermes');
  const [msgType, setMsgType] = useState<'task' | 'result' | 'query' | 'broadcast' | 'error'>('task');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgPriority, setMsgPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [msgPayload, setMsgPayload] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/message-bus');
      if (res.ok) {
        const json = await res.json();
        setStats((json.stats ?? json) as MessageBusStats);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5_000); return () => clearInterval(i); }, [fetchData]);

  const sendMessage = async () => {
    if (!msgSubject.trim()) return;
    setSending(true);
    try {
      let payload = {};
      try { payload = msgPayload ? JSON.parse(msgPayload) : {}; } catch { payload = { text: msgPayload }; }
      await fetch('/api/hermes/message-bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: msgFrom,
          to: msgTo,
          type: msgType,
          subject: msgSubject,
          payload,
          priority: msgPriority,
        }),
      });
      setMsgSubject('');
      setMsgPayload('');
      await fetchData();
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[rgba(157,78,221,0.1)] rounded-xl" />
        <div className="h-40 bg-[rgba(157,78,221,0.05)] rounded-xl" />
      </div>
    );
  }

  const agents = ['claude', 'hermes', 'openclaw', 'vault'] as const;
  const online = true; // bus is always "online" when loaded

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Radio size={16} className="text-[#7B2CBF]" />
          Agent Message Bus
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${online ? 'animate-pulse-glow' : ''}`}
            style={{ backgroundColor: online ? '#00ff88' : '#ff4444' }} />
          <span className="text-[10px] font-mono" style={{ color: online ? '#00ff88' : '#ff4444' }}>
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className="text-[9px] text-[#8888aa] font-mono ml-2">{stats.totalMessages} msgs</span>
        </div>
      </div>

      {/* Channel Status */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Inbox size={11} className="text-[#7B2CBF]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Channel Status</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {agents.map(agentId => {
            const color = AGENT_COLORS[agentId];
            const unread = stats.agentInboxes[agentId] ?? 0;
            return (
              <div key={agentId} className="relative rounded-lg border p-3 text-center"
                style={{ borderColor: `${color}25`, background: `${color}06` }}>
                <div className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <span className="text-[10px] text-white font-medium block">{AGENT_NAMES[agentId]}</span>
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: color }}>
                    {unread}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Send Message Form */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Send size={12} className="text-[#00ff88]" /> Send Message
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
          {/* From */}
          <div>
            <label className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-0.5">From</label>
            <select value={msgFrom} onChange={e => setMsgFrom(e.target.value)}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1.5 text-white text-[10px] font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]">
              {agents.map(a => <option key={a} value={a}>{AGENT_NAMES[a]}</option>)}
            </select>
          </div>
          {/* To */}
          <div>
            <label className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-0.5">To</label>
            <select value={msgTo} onChange={e => setMsgTo(e.target.value)}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1.5 text-white text-[10px] font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]">
              <option value="all">📡 All (Broadcast)</option>
              {agents.map(a => <option key={a} value={a}>{AGENT_NAMES[a]}</option>)}
            </select>
          </div>
          {/* Type */}
          <div>
            <label className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-0.5">Type</label>
            <select value={msgType} onChange={e => setMsgType(e.target.value as typeof msgType)}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1.5 text-white text-[10px] font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]">
              {['task', 'result', 'query', 'broadcast', 'error'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          {/* Priority */}
          <div>
            <label className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-0.5">Priority</label>
            <select value={msgPriority} onChange={e => setMsgPriority(e.target.value as typeof msgPriority)}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1.5 text-white text-[10px] font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]">
              {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-0.5">Subject</label>
            <input type="text" value={msgSubject} onChange={e => setMsgSubject(e.target.value)}
              placeholder="Message subject..."
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1.5 text-white text-[10px] placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
          </div>
        </div>
        <div className="flex gap-2">
          <textarea value={msgPayload} onChange={e => setMsgPayload(e.target.value)}
            placeholder="Payload (JSON or plain text)..."
            rows={2}
            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-[10px] font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] resize-none" />
          <button onClick={sendMessage} disabled={sending || !msgSubject.trim()}
            className="flex-shrink-0 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}>
            <Send size={10} /> {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </motion.div>

      {/* Message Feed */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Radio size={12} className="text-[#1B998B]" /> Message Feed
        </h3>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {stats.recentMessages.map((msg, i) => {
            const isExpanded = expandedMsg === msg.id;
            const fromColor = AGENT_COLORS[msg.from] || '#8888aa';
            const toColor = msg.to === 'all' ? '#FFB627' : (AGENT_COLORS[msg.to] || '#8888aa');
            const typeColor = MSG_TYPE_COLORS[msg.type] || '#8888aa';
            const prioColor = PRIORITY_COLORS[msg.priority] || '#8888aa';
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.4)] p-2.5 hover:border-[rgba(157,78,221,0.15)] transition-colors">
                <div className="flex items-center gap-2">
                  {/* Priority dot */}
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: prioColor }} />
                  {/* From badge */}
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${fromColor}15`, color: fromColor }}>
                    {msg.from}
                  </span>
                  <ArrowRight size={9} className="text-[#8888aa] flex-shrink-0" />
                  {/* To badge */}
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${toColor}15`, color: toColor }}>
                    {msg.to === 'all' ? 'ALL' : msg.to}
                  </span>
                  {/* Type badge */}
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                    {msg.type.toUpperCase()}
                  </span>
                  {/* Subject */}
                  <span className="text-[10px] text-[#ccccdd] truncate flex-1 min-w-0">{msg.subject}</span>
                  {/* Timestamp */}
                  <span className="text-[9px] text-[#8888aa] font-mono flex-shrink-0">{timeAgo(msg.timestamp)}</span>
                  {/* Expand toggle */}
                  <button onClick={() => setExpandedMsg(isExpanded ? null : msg.id)}
                    className="text-[#8888aa] hover:text-white transition-colors flex-shrink-0">
                    <RefreshCw size={9} className={isExpanded ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                  </button>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                      className="mt-2 pt-2 border-t border-[rgba(157,78,221,0.08)]">
                      <pre className="text-[9px] text-[#8888aa] font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {JSON.stringify(msg.payload, null, 2)}
                      </pre>
                      <div className="flex items-center gap-3 mt-1.5 text-[8px] text-[#8888aa]">
                        <span>Status: <span className="font-bold" style={{ color: msg.status === 'delivered' ? '#00ff88' : msg.status === 'failed' ? '#ff4444' : '#FFB627' }}>{msg.status}</span></span>
                        {msg.retries > 0 && <span>Retries: {msg.retries}</span>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          {stats.recentMessages.length === 0 && (
            <p className="text-[10px] text-[#8888aa] text-center py-4">No messages yet — send one above</p>
          )}
        </div>
      </motion.div>

      {/* Dead Letter Queue */}
      {deadLetters.length > 0 && (
        <motion.div className="rounded-xl border border-[rgba(255,68,68,0.2)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
            <XCircle size={12} className="text-[#ff4444]" /> Dead Letter Queue
            <span className="ml-auto text-[9px] font-mono text-[#ff4444]">{deadLetters.length} failed</span>
          </h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {deadLetters.map((dl, i) => (
              <div key={i} className="rounded-lg border border-[rgba(255,68,68,0.12)] bg-[rgba(10,10,26,0.4)] p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white font-medium truncate">{dl.message.subject}</span>
                  <span className="text-[9px] font-mono text-[#ff4444]">x{dl.message.retries}</span>
                </div>
                <p className="text-[9px] text-[#8888aa]">{dl.reason}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state for dead letters */}
      {deadLetters.length === 0 && stats.deadLetterCount > 0 && (
        <div className="rounded-xl border border-[rgba(255,68,68,0.1)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-3">
          <div className="flex items-center gap-2">
            <XCircle size={11} className="text-[#ff4444] opacity-40" />
            <span className="text-[9px] text-[#8888aa]">
              Dead Letter Queue: <span className="font-mono text-[#ff4444]">{stats.deadLetterCount}</span> failed messages
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
