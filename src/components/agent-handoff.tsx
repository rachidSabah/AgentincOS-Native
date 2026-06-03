'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight, Plus, CheckCircle, XCircle, Clock,
  Activity, Zap, Eye, ChevronDown, ChevronUp,
  ArrowRight, Network, FileText, TrendingUp,
  Send, AlertCircle, CircleDot, Radio,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

/* ─── Constants ─── */
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

type HandoffStatus = 'pending' | 'in-transit' | 'completed' | 'failed';

const STATUS_COLORS: Record<HandoffStatus, string> = {
  pending: '#7B2CBF',
  'in-transit': '#FFB627',
  completed: '#00ff88',
  failed: '#E63946',
};

const STATUS_ICONS: Record<HandoffStatus, typeof Clock> = {
  pending: Clock,
  'in-transit': Activity,
  completed: CheckCircle,
  failed: XCircle,
};

/* ─── Types ─── */
interface ContextItem {
  key: string;
  type: 'memory' | 'task' | 'preference' | 'session' | 'config';
  value: string;
  size: number; // in tokens
}

interface Handoff {
  id: string;
  sourceAgent: string;
  targetAgent: string;
  task: string;
  description: string;
  context: ContextItem[];
  status: HandoffStatus;
  progress: number;
  createdAt: number;
  completedAt: number | null;
  duration: number | null; // ms
  errorMessage?: string;
}

interface HandoffChain {
  id: string;
  name: string;
  steps: Array<{ agent: string; task: string }>;
  currentStep: number;
  status: HandoffStatus;
}

/* ─── Mock Data ─── */
const MOCK_HANDOFFS: Handoff[] = [
  {
    id: 'ho1',
    sourceAgent: 'claude',
    targetAgent: 'hermes',
    task: 'Research competitor AI stacks',
    description: 'Claude identified the need for competitive analysis. Handing off to Hermes for deep research execution.',
    context: [
      { key: 'market_context', type: 'memory', value: 'Key differentiator is Memory layer with compound knowledge', size: 245 },
      { key: 'target_competitors', type: 'task', value: 'AutoGPT, CrewAI, LangGraph', size: 48 },
      { key: 'research_depth', type: 'preference', value: 'deep analysis with code review', size: 32 },
      { key: 'session_state', type: 'session', value: 'Active chat session #847 with reasoning context', size: 1200 },
      { key: 'model_config', type: 'config', value: 'GPT-4 for research, Claude for reasoning', size: 64 },
    ],
    status: 'in-transit',
    progress: 72,
    createdAt: 1700000000000 - 120000,
    completedAt: null,
    duration: null,
  },
  {
    id: 'ho2',
    sourceAgent: 'hermes',
    targetAgent: 'openclaw',
    task: 'Route research findings to team',
    description: 'Hermes completed research. Routing results through OpenClaw for proper agent distribution.',
    context: [
      { key: 'research_summary', type: 'memory', value: '3 competitors analyzed — Memory layer confirmed as unique differentiator', size: 512 },
      { key: 'action_items', type: 'task', value: 'Update roadmap, notify product team, schedule review', size: 96 },
      { key: 'priority_level', type: 'preference', value: 'high — time-sensitive competitive intelligence', size: 28 },
    ],
    status: 'pending',
    progress: 0,
    createdAt: 1700000000000 - 60000,
    completedAt: null,
    duration: null,
  },
  {
    id: 'ho3',
    sourceAgent: 'openclaw',
    targetAgent: 'vault',
    task: 'Store governance policy updates',
    description: 'OpenClaw updated routing policies. Vault needs to persist the new governance rules.',
    context: [
      { key: 'policy_update', type: 'config', value: 'Session routing v2.1 — backward compatible changes', size: 384 },
      { key: 'affected_agents', type: 'task', value: 'All 4 agents require policy refresh', size: 56 },
    ],
    status: 'completed',
    progress: 100,
    createdAt: 1700000000000 - 600000,
    completedAt: 1700000000000 - 580000,
    duration: 20000,
  },
  {
    id: 'ho4',
    sourceAgent: 'claude',
    targetAgent: 'hermes',
    task: 'Execute browser automation for screenshots',
    description: 'Failed handoff — browser pool at capacity. Hermes could not acquire browser session.',
    context: [
      { key: 'screenshot_urls', type: 'task', value: '5 competitor landing pages', size: 128 },
    ],
    status: 'failed',
    progress: 15,
    createdAt: 1700000000000 - 1800000,
    completedAt: 1700000000000 - 1790000,
    duration: 10000,
    errorMessage: 'Browser pool at capacity — 5/5 sessions in use. Retry during off-peak.',
  },
  {
    id: 'ho5',
    sourceAgent: 'vault',
    targetAgent: 'claude',
    task: 'Load user context for personalized response',
    description: 'Vault loaded 23 memory entries for Claude to generate context-rich response.',
    context: [
      { key: 'user_preferences', type: 'preference', value: 'Async communication, deep focus blocks, concise responses', size: 64 },
      { key: 'recent_context', type: 'memory', value: 'Working on Agent OS v2.0 launch — 72% complete', size: 192 },
      { key: 'team_dynamics', type: 'memory', value: '4-agent architecture with OpenClaw routing', size: 96 },
    ],
    status: 'completed',
    progress: 100,
    createdAt: 1700000000000 - 3600000,
    completedAt: 1700000000000 - 3595000,
    duration: 5000,
  },
];

const MOCK_CHAINS: HandoffChain[] = [
  {
    id: 'chain1',
    name: 'Competitive Analysis Pipeline',
    steps: [
      { agent: 'claude', task: 'Identify research scope' },
      { agent: 'hermes', task: 'Execute deep research' },
      { agent: 'openclaw', task: 'Route findings to team' },
      { agent: 'vault', task: 'Persist insights & update vault' },
    ],
    currentStep: 1,
    status: 'in-transit',
  },
  {
    id: 'chain2',
    name: 'Feature Development Flow',
    steps: [
      { agent: 'claude', task: 'Design feature architecture' },
      { agent: 'hermes', task: 'Implement & test' },
      { agent: 'openclaw', task: 'Deploy & govern' },
    ],
    currentStep: 3,
    status: 'completed',
  },
  {
    id: 'chain3',
    name: 'Incident Response Chain',
    steps: [
      { agent: 'openclaw', task: 'Detect & classify incident' },
      { agent: 'claude', task: 'Reason about root cause' },
      { agent: 'hermes', task: 'Execute remediation' },
      { agent: 'vault', task: 'Record incident for future reference' },
    ],
    currentStep: 2,
    status: 'in-transit',
  },
];

/* ─── Helpers ─── */
function timeAgo(ts: number): string {
  // Use a fixed base time to avoid hydration mismatch with SSR
  const baseTs = 1700000000000;
  const diff = baseTs - ts;
  if (diff < 0) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const CONTEXT_TYPE_COLORS: Record<string, string> = {
  memory: '#2E86AB',
  task: '#E8751A',
  preference: '#1B998B',
  session: '#7B2CBF',
  config: '#FFB627',
};

/* ═══════════════════════════════════════════════════════════
   HANDOFF CHAIN VISUALIZATION
   ═══════════════════════════════════════════════════════════ */
function ChainVisualization({ chain }: { chain: HandoffChain }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
      style={{ borderColor: `${STATUS_COLORS[chain.status]}20` }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Network size={11} style={{ color: STATUS_COLORS[chain.status] }} />
        <span className="text-[10px] text-white font-medium">{chain.name}</span>
        <span
          className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase ml-auto"
          style={{ backgroundColor: `${STATUS_COLORS[chain.status]}12`, color: STATUS_COLORS[chain.status] }}
        >
          {chain.status}
        </span>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto pb-2 custom-scrollbar">
        {chain.steps.map((step, i) => {
          const agentColor = AGENT_COLORS[step.agent] || '#8888aa';
          const isComplete = i < chain.currentStep;
          const isCurrent = i === chain.currentStep && chain.status === 'in-transit';
          const isPending = i > chain.currentStep;

          return (
            <div key={i} className="flex items-center flex-shrink-0">
              <motion.div
                className="relative rounded-lg border p-2 min-w-[120px]"
                style={{
                  borderColor: isCurrent ? `${agentColor}50` : isComplete ? `${agentColor}30` : 'rgba(157,78,221,0.1)',
                  background: isCurrent ? `${agentColor}08` : isComplete ? `${agentColor}04` : 'rgba(18,18,42,0.4)',
                }}
                animate={isCurrent ? {
                  boxShadow: [`0 0 8px ${agentColor}15`, `0 0 20px ${agentColor}25`, `0 0 8px ${agentColor}15`],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {/* Data stream animation for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${agentColor}20` }}
                  >
                    <motion.div
                      className="absolute w-full h-1"
                      style={{ background: `linear-gradient(90deg, transparent, ${agentColor}40, transparent)` }}
                      animate={{ y: ['-100%', '400%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                      style={{ backgroundColor: agentColor, color: '#fff' }}
                    >
                      {step.agent[0].toUpperCase()}
                    </div>
                    <span className="text-[9px] text-white font-medium">{AGENT_NAMES[step.agent]}</span>
                    {isComplete && <CheckCircle size={8} style={{ color: agentColor }} />}
                    {isCurrent && (
                      <motion.div
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: agentColor }}
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <p className="text-[8px] text-[#8888aa] leading-tight">{step.task}</p>
                </div>
              </motion.div>

              {i < chain.steps.length - 1 && (
                <div className="flex items-center mx-1 flex-shrink-0">
                  <motion.div
                    className="w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: isComplete ? agentColor : 'rgba(157,78,221,0.15)' }}
                    animate={isCurrent ? {
                      background: [`linear-gradient(90deg, ${agentColor}, transparent)`, `linear-gradient(90deg, transparent, ${agentColor})`, `linear-gradient(90deg, ${agentColor}, transparent)`],
                    } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <ArrowRight size={8} style={{ color: isComplete ? agentColor : '#8888aa' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT HANDOFF — Main Export
   ═══════════════════════════════════════════════════════════ */
export function AgentHandoff() {
  const { agents } = useOSStore();

  const [handoffs, setHandoffs] = useState<Handoff[]>(MOCK_HANDOFFS);
  const [chains, setChains] = useState<HandoffChain[]>(MOCK_CHAINS);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedHandoff, setExpandedHandoff] = useState<string | null>('ho1');
  const [showContextPreview, setShowContextPreview] = useState<string | null>(null);

  // Create form state
  const [sourceAgent, setSourceAgent] = useState('claude');
  const [targetAgent, setTargetAgent] = useState('hermes');
  const [taskDesc, setTaskDesc] = useState('');
  const [handoffDesc, setHandoffDesc] = useState('');

  // Simulate handoff progress
  useEffect(() => {
    const interval = setInterval(() => {
      setHandoffs(prev => prev.map(h => {
        if (h.status === 'in-transit') {
          const newProgress = Math.min(100, h.progress + Math.random() * 5);
          if (newProgress >= 100) {
            return {
              ...h,
              status: 'completed' as HandoffStatus,
              progress: 100,
              completedAt: Date.now(),
              duration: Date.now() - h.createdAt,
            };
          }
          return { ...h, progress: newProgress };
        }
        if (h.status === 'pending' && Math.random() > 0.8) {
          return { ...h, status: 'in-transit' as HandoffStatus, progress: Math.random() * 10 };
        }
        return h;
      }));

      // Simulate chain progress
      setChains(prev => prev.map(chain => {
        if (chain.status === 'in-transit' && Math.random() > 0.9) {
          const nextStep = chain.currentStep + 1;
          if (nextStep >= chain.steps.length) {
            return { ...chain, status: 'completed' as HandoffStatus, currentStep: chain.steps.length };
          }
          return { ...chain, currentStep: nextStep };
        }
        return chain;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCreate = useCallback(() => {
    if (!taskDesc.trim() || sourceAgent === targetAgent) return;

    const newHandoff: Handoff = {
      id: `ho${Date.now()}`,
      sourceAgent,
      targetAgent,
      task: taskDesc.trim(),
      description: handoffDesc.trim() || `Handoff from ${AGENT_NAMES[sourceAgent]} to ${AGENT_NAMES[targetAgent]}`,
      context: [
        { key: 'session_state', type: 'session', value: 'Current session context', size: 512 },
        { key: 'task_requirements', type: 'task', value: taskDesc.trim(), size: 128 },
      ],
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      completedAt: null,
      duration: null,
    };

    setHandoffs(prev => [newHandoff, ...prev]);
    setTaskDesc('');
    setHandoffDesc('');
    setShowCreate(false);
  }, [taskDesc, handoffDesc, sourceAgent, targetAgent]);

  // Metrics
  const completedCount = handoffs.filter(h => h.status === 'completed').length;
  const failedCount = handoffs.filter(h => h.status === 'failed').length;
  const avgDuration = handoffs.filter(h => h.duration).length > 0
    ? Math.round(handoffs.filter(h => h.duration).reduce((s, h) => s + (h.duration || 0), 0) / handoffs.filter(h => h.duration).length)
    : 0;
  const successRate = handoffs.length > 0 ? ((completedCount / (completedCount + failedCount)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <ArrowLeftRight size={16} className="text-[#7B2CBF]" />
          Agent Handoff Protocol
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[#FFB627] font-mono font-bold text-sm">{handoffs.filter(h => h.status === 'in-transit').length}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">In Transit</div>
            </div>
            <div className="text-center">
              <div className="text-[#00ff88] font-mono font-bold text-sm">{completedCount}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Completed</div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'rgba(123,44,191,0.15)', border: '1px solid rgba(123,44,191,0.3)', color: '#c084fc' }}
          >
            <Plus size={12} /> New Handoff
          </button>
        </div>
      </div>

      {/* ─── Create Handoff Form ─── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[rgba(123,44,191,0.2)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 overflow-hidden"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Source Agent</div>
                  <div className="flex gap-2">
                    {['claude', 'hermes', 'openclaw', 'vault'].map(id => (
                      <button
                        key={id}
                        onClick={() => { setSourceAgent(id); if (targetAgent === id) setTargetAgent(['claude', 'hermes', 'openclaw', 'vault'].find(a => a !== id)!); }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                        style={{
                          borderColor: sourceAgent === id ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)',
                          background: sourceAgent === id ? `${AGENT_COLORS[id]}15` : 'transparent',
                          color: sourceAgent === id ? AGENT_COLORS[id] : '#8888aa',
                        }}
                      >
                        <div className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: AGENT_COLORS[id], color: '#fff' }}>{AGENT_NAMES[id][0]}</div>
                        {AGENT_NAMES[id]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Target Agent</div>
                  <div className="flex gap-2">
                    {['claude', 'hermes', 'openclaw', 'vault'].map(id => (
                      <button
                        key={id}
                        onClick={() => { if (id !== sourceAgent) setTargetAgent(id); }}
                        disabled={id === sourceAgent}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border disabled:opacity-30"
                        style={{
                          borderColor: targetAgent === id ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)',
                          background: targetAgent === id ? `${AGENT_COLORS[id]}15` : 'transparent',
                          color: targetAgent === id ? AGENT_COLORS[id] : '#8888aa',
                        }}
                      >
                        <div className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ backgroundColor: AGENT_COLORS[id], color: '#fff' }}>{AGENT_NAMES[id][0]}</div>
                        {AGENT_NAMES[id]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flow visualization */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border" style={{ borderColor: `${AGENT_COLORS[sourceAgent]}30`, background: `${AGENT_COLORS[sourceAgent]}08` }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: AGENT_COLORS[sourceAgent], color: '#fff' }}>{AGENT_NAMES[sourceAgent][0]}</div>
                  <span className="text-[10px] font-medium" style={{ color: AGENT_COLORS[sourceAgent] }}>{AGENT_NAMES[sourceAgent]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <motion.div className="w-8 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${AGENT_COLORS[sourceAgent]}, ${AGENT_COLORS[targetAgent]})` }} animate={{ scaleX: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  <ArrowRight size={12} style={{ color: AGENT_COLORS[targetAgent] }} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border" style={{ borderColor: `${AGENT_COLORS[targetAgent]}30`, background: `${AGENT_COLORS[targetAgent]}08` }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: AGENT_COLORS[targetAgent], color: '#fff' }}>{AGENT_NAMES[targetAgent][0]}</div>
                  <span className="text-[10px] font-medium" style={{ color: AGENT_COLORS[targetAgent] }}>{AGENT_NAMES[targetAgent]}</span>
                </div>
              </div>

              <input
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                placeholder="Task description for the handoff..."
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
              />
              <textarea
                value={handoffDesc}
                onChange={e => setHandoffDesc(e.target.value)}
                placeholder="Additional context or instructions..."
                rows={2}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] resize-none"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreate}
                  disabled={!taskDesc.trim() || sourceAgent === targetAgent}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)', color: '#fff' }}
                >
                  <Send size={11} /> Initiate Handoff
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Active Handoff Chains ─── */}
      <div>
        <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Network size={10} /> Active Chains
        </div>
        <div className="grid grid-cols-1 gap-3">
          {chains.map(chain => (
            <ChainVisualization key={chain.id} chain={chain} />
          ))}
        </div>
      </div>

      {/* ─── Handoffs List ─── */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
        <div className="p-3 border-b border-[rgba(157,78,221,0.1)]">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeftRight size={10} /> Handoffs
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {handoffs.map((handoff, i) => {
            const sourceColor = AGENT_COLORS[handoff.sourceAgent] || '#8888aa';
            const targetColor = AGENT_COLORS[handoff.targetAgent] || '#8888aa';
            const statusColor = STATUS_COLORS[handoff.status];
            const isExpanded = expandedHandoff === handoff.id;

            return (
              <motion.div
                key={handoff.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-[rgba(157,78,221,0.06)] last:border-0"
              >
                <button
                  onClick={() => setExpandedHandoff(isExpanded ? null : handoff.id)}
                  className="w-full text-left p-3 hover:bg-[rgba(157,78,221,0.04)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sourceColor}15`, color: sourceColor }}>
                        {AGENT_NAMES[handoff.sourceAgent]}
                      </span>
                      <ArrowRight size={9} className="text-[#8888aa]" />
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${targetColor}15`, color: targetColor }}>
                        {AGENT_NAMES[handoff.targetAgent]}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#ccccdd] truncate flex-1 min-w-0">{handoff.task}</span>
                    <span
                      className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0"
                      style={{ backgroundColor: `${statusColor}12`, color: statusColor }}
                    >
                      {handoff.status}
                    </span>
                    <span className="text-[9px] text-[#8888aa] font-mono flex-shrink-0">{timeAgo(handoff.createdAt)}</span>
                    {isExpanded ? <ChevronUp size={12} className="text-[#8888aa] flex-shrink-0" /> : <ChevronDown size={12} className="text-[#8888aa] flex-shrink-0" />}
                  </div>

                  {/* Progress bar for in-transit */}
                  {(handoff.status === 'in-transit' || handoff.status === 'pending') && (
                    <div className="mt-2 ml-5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${sourceColor}, ${targetColor})` }}
                          animate={{ width: `${handoff.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-[#8888aa]">{Math.round(handoff.progress)}%</span>
                    </div>
                  )}
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pb-3 overflow-hidden"
                    >
                      <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3 space-y-3">
                        <p className="text-[9px] text-[#ccccdd]">{handoff.description}</p>

                        {handoff.errorMessage && (
                          <div className="flex items-start gap-2 p-2 rounded-lg border border-[rgba(230,57,70,0.2)] bg-[rgba(230,57,70,0.05)]">
                            <AlertCircle size={10} className="text-[#E63946] mt-0.5 flex-shrink-0" />
                            <p className="text-[9px] text-[#E63946]">{handoff.errorMessage}</p>
                          </div>
                        )}

                        {/* Context Transfer Preview */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <FileText size={10} className="text-[#7B2CBF]" />
                            <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Context Transfer</span>
                            <span className="text-[8px] font-mono text-[#8888aa] ml-auto">
                              {handoff.context.reduce((s, c) => s + c.size, 0)} tokens
                            </span>
                          </div>
                          <div className="space-y-1">
                            {handoff.context.map((ctx, ci) => {
                              const ctxColor = CONTEXT_TYPE_COLORS[ctx.type] || '#8888aa';
                              return (
                                <motion.div
                                  key={ci}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: ci * 0.05 }}
                                  className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[rgba(157,78,221,0.06)] transition-colors"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ctxColor }} />
                                  <span className="text-[8px] font-bold uppercase tracking-wider w-16 flex-shrink-0" style={{ color: ctxColor }}>
                                    {ctx.type}
                                  </span>
                                  <span className="text-[9px] text-[#ccccdd] truncate flex-1 min-w-0">{ctx.value}</span>
                                  <span className="text-[8px] font-mono text-[#8888aa] flex-shrink-0">{ctx.size}t</span>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Handoff details */}
                        <div className="flex items-center gap-4 text-[8px] text-[#8888aa]">
                          <span>Created: {timeAgo(handoff.createdAt)}</span>
                          {handoff.duration && <span>Duration: {formatDuration(handoff.duration)}</span>}
                          {handoff.completedAt && <span>Completed: {timeAgo(handoff.completedAt)}</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── Metrics ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Success Rate', value: `${successRate.toFixed(0)}%`, color: '#00ff88', icon: CheckCircle },
          { label: 'Avg Duration', value: formatDuration(avgDuration), color: '#FFB627', icon: Clock },
          { label: 'Failed', value: String(failedCount), color: '#E63946', icon: XCircle },
          { label: 'Total Context', value: `${(handoffs.reduce((s, h) => s + h.context.reduce((cs, c) => cs + c.size, 0), 0) / 1000).toFixed(1)}K`, color: '#7B2CBF', icon: Zap, suffix: 'tokens' },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-lg border p-3"
            style={{ borderColor: `${m.color}15`, background: `${m.color}05` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon size={10} style={{ color: m.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{m.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-lg" style={{ color: m.color }}>
              {m.value}
            </div>
            {m.suffix && <div className="text-[8px] text-[#8888aa]">{m.suffix}</div>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
