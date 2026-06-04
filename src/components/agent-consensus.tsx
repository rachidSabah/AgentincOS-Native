'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel, Users, Plus, CheckCircle, XCircle, MinusCircle,
  Trophy, Clock, BarChart3, MessageSquare, Sparkles,
  Shield, Zap, ArrowRight, Play, Vote,
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

type ConsensusStrategy = 'unanimous' | 'majority' | 'delegation' | 'race';
type VoteType = 'approve' | 'reject' | 'abstain';
type SessionStatus = 'voting' | 'completed' | 'failed' | 'pending';

const STRATEGY_META: Record<ConsensusStrategy, { color: string; desc: string; icon: typeof Shield }> = {
  unanimous: { color: '#00ff88', desc: 'All agents must agree — highest quality, slowest', icon: Shield },
  majority: { color: '#FFB627', desc: 'Simple majority (51%+) wins — balanced speed & quality', icon: BarChart3 },
  delegation: { color: '#7B2CBF', desc: 'One lead agent decides — fastest, trusts expertise', icon: Zap },
  race: { color: '#E63946', desc: 'First valid answer wins — maximum speed', icon: Trophy },
};

/* ─── Types ─── */
interface AgentVote {
  agentId: string;
  vote: VoteType;
  reasoning: string;
  timestamp: number;
  confidence: number;
}

interface DebateEntry {
  agentId: string;
  argument: string;
  timestamp: number;
  type: 'support' | 'oppose' | 'neutral';
}

interface ConsensusSession {
  id: string;
  question: string;
  agents: string[];
  strategy: ConsensusStrategy;
  status: SessionStatus;
  votes: AgentVote[];
  debate: DebateEntry[];
  result: string | null;
  confidence: number;
  createdAt: number;
  completedAt: number | null;
  delegator?: string;
}

/* ─── Mock Data ─── */
const MOCK_SESSIONS: ConsensusSession[] = [
  {
    id: 'cs1',
    question: 'Should we deploy Hermes v3.2 to production this Friday?',
    agents: ['claude', 'hermes', 'openclaw', 'vault'],
    strategy: 'majority',
    status: 'voting',
    votes: [
      { agentId: 'claude', vote: 'approve', reasoning: 'v3.2 passed all integration tests with zero regressions. Weekend traffic is low, making rollback safe.', timestamp: 1700000000000 - 300000, confidence: 0.92 },
      { agentId: 'hermes', vote: 'approve', reasoning: 'I\'ve run the full E2E suite 3 times. Performance improved 15% on skill execution. Ready to ship.', timestamp: 1700000000000 - 280000, confidence: 0.95 },
      { agentId: 'openclaw', vote: 'reject', reasoning: 'Friday deploy violates our governance policy. At least 2 agents should monitor for 24h post-deploy.', timestamp: 1700000000000 - 250000, confidence: 0.88 },
    ],
    debate: [
      { agentId: 'claude', argument: 'The test coverage is comprehensive. 15% perf improvement is significant.', timestamp: 1700000000000 - 320000, type: 'support' },
      { agentId: 'openclaw', argument: 'Policy requires at least 48h monitoring window before weekend. We can\'t guarantee response times on Saturday.', timestamp: 1700000000000 - 310000, type: 'oppose' },
      { agentId: 'hermes', argument: 'I can set up automated monitoring alerts. If anything breaks, OpenClaw can trigger rollback automatically.', timestamp: 1700000000000 - 290000, type: 'neutral' },
    ],
    result: null,
    confidence: 0,
    createdAt: 1700000000000 - 3600000,
    completedAt: null,
  },
  {
    id: 'cs2',
    question: 'Which LLM provider should be the default for research tasks?',
    agents: ['claude', 'hermes'],
    strategy: 'delegation',
    status: 'completed',
    votes: [
      { agentId: 'claude', vote: 'approve', reasoning: 'Hermes has the most experience with research tasks. Delegating to their expertise.', timestamp: 1700000000000 - 7200000, confidence: 0.85 },
      { agentId: 'hermes', vote: 'approve', reasoning: 'GPT-4 for deep research, Claude for reasoning-heavy analysis. Multi-model approach wins.', timestamp: 1700000000000 - 7100000, confidence: 0.93 },
    ],
    debate: [
      { agentId: 'hermes', argument: 'Multi-model routing gives best results. Use model strengths for task types.', timestamp: 1700000000000 - 7300000, type: 'support' },
    ],
    result: 'Multi-model approach: GPT-4 for deep research, Claude for reasoning-heavy tasks',
    confidence: 0.89,
    createdAt: 1700000000000 - 8000000,
    completedAt: 1700000000000 - 7000000,
    delegator: 'hermes',
  },
  {
    id: 'cs3',
    question: 'Should we enable cross-agent memory sharing by default?',
    agents: ['claude', 'hermes', 'openclaw', 'vault'],
    strategy: 'unanimous',
    status: 'failed',
    votes: [
      { agentId: 'claude', vote: 'approve', reasoning: 'Shared memory creates compound knowledge effect. Critical for personalized AI.', timestamp: 1700000000000 - 14400000, confidence: 0.90 },
      { agentId: 'hermes', vote: 'approve', reasoning: 'Access to vault data would improve research relevance by ~40%.', timestamp: 1700000000000 - 14300000, confidence: 0.87 },
      { agentId: 'openclaw', vote: 'approve', reasoning: 'Routing decisions improve when agents share context.', timestamp: 1700000000000 - 14200000, confidence: 0.82 },
      { agentId: 'vault', vote: 'reject', reasoning: 'Privacy risk. Not all memories should be shared. Need access control first.', timestamp: 1700000000000 - 14100000, confidence: 0.94 },
    ],
    debate: [
      { agentId: 'vault', argument: 'User preferences contain sensitive data. We need granular access control before any sharing.', timestamp: 1700000000000 - 14500000, type: 'oppose' },
      { agentId: 'claude', argument: 'Access control is already 30% implemented. We can enable sharing for non-sensitive categories.', timestamp: 1700000000000 - 14450000, type: 'neutral' },
    ],
    result: null,
    confidence: 0,
    createdAt: 1700000000000 - 15000000,
    completedAt: 1700000000000 - 14000000,
  },
];

/* ─── Helpers ─── */
function getStatusColor(status: SessionStatus): string {
  switch (status) {
    case 'voting': return '#FFB627';
    case 'completed': return '#00ff88';
    case 'failed': return '#E63946';
    case 'pending': return '#7B2CBF';
  }
}

function getVoteColor(vote: VoteType): string {
  switch (vote) {
    case 'approve': return '#00ff88';
    case 'reject': return '#E63946';
    case 'abstain': return '#8888aa';
  }
}

function getVoteIcon(vote: VoteType) {
  switch (vote) {
    case 'approve': return CheckCircle;
    case 'reject': return XCircle;
    case 'abstain': return MinusCircle;
  }
}

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

/* ═══════════════════════════════════════════════════════════
   VOTE CARD — Parliament Style
   ═══════════════════════════════════════════════════════════ */
function VoteCard({ vote, isAnimating }: { vote: AgentVote; isAnimating: boolean }) {
  const agentColor = AGENT_COLORS[vote.agentId] || '#8888aa';
  const voteColor = getVoteColor(vote.vote);

  const voteIconMap: Record<VoteType, typeof CheckCircle> = {
    approve: CheckCircle,
    reject: XCircle,
    abstain: MinusCircle,
  };
  const VoteIconComponent = voteIconMap[vote.vote];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="rounded-xl border p-3 relative overflow-hidden"
      style={{
        borderColor: `${voteColor}30`,
        background: `linear-gradient(135deg, ${voteColor}05, ${agentColor}05)`,
      }}
    >
      {/* Glow effect */}
      {isAnimating && (
        <motion.div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 0%, ${voteColor}10, transparent 70%)` }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: `${agentColor}20`, color: agentColor, border: `2px solid ${agentColor}40` }}
          >
            {(AGENT_NAMES[vote.agentId] || vote.agentId)[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white font-medium">{AGENT_NAMES[vote.agentId] || vote.agentId}</span>
              <span
                className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${voteColor}15`, color: voteColor, border: `1px solid ${voteColor}30` }}
              >
                {vote.vote}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <VoteIconComponent size={10} style={{ color: voteColor }} />
              <span className="text-[8px] font-mono" style={{ color: voteColor }}>
                {(vote.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-[#ccccdd] leading-relaxed">{vote.reasoning}</p>
        <div className="text-[8px] text-[#8888aa] font-mono mt-1.5">{timeAgo(vote.timestamp)}</div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT CONSENSUS — Main Export
   ═══════════════════════════════════════════════════════════ */
export function AgentConsensus() {
  const { agents } = useOSStore();

  const [sessions, setSessions] = useState<ConsensusSession[]>(MOCK_SESSIONS);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>('cs1');

  // Create form state
  const [question, setQuestion] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['claude', 'hermes', 'openclaw', 'vault']);
  const [strategy, setStrategy] = useState<ConsensusStrategy>('majority');
  const [delegator, setDelegator] = useState<string>('claude');

  // Simulate voting for active sessions
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev => prev.map(session => {
        if (session.status !== 'voting') return session;

        // Check if vault hasn't voted yet
        const votedAgents = session.votes.map(v => v.agentId);
        const missingAgents = session.agents.filter(a => !votedAgents.includes(a));

        if (missingAgents.length > 0 && Math.random() > 0.6) {
          const nextAgent = missingAgents[0];
          const votes: VoteType[] = ['approve', 'reject', 'abstain'];
          const vote = votes[Math.floor(Math.random() * 3)];
          const newVote: AgentVote = {
            agentId: nextAgent,
            vote,
            reasoning: vote === 'approve'
              ? 'Analysis supports this decision based on available evidence.'
              : vote === 'reject'
              ? 'Risk assessment indicates potential issues that need resolution first.'
              : 'Insufficient data to form a strong position either way.',
            timestamp: Date.now(),
            confidence: 0.7 + Math.random() * 0.25,
          };

          const newVotes = [...session.votes, newVote];

          // Check if session should complete
          let status: SessionStatus = 'voting';
          let result: string | null = null;
          let confidence = 0;
          let completedAt: number | null = null;

          if (newVotes.length === session.agents.length) {
            const approves = newVotes.filter(v => v.vote === 'approve').length;
            const total = newVotes.length;

            switch (session.strategy) {
              case 'unanimous':
                if (approves === total) {
                  status = 'completed';
                  result = 'All agents approved — unanimous consensus achieved';
                  confidence = newVotes.reduce((s, v) => s + v.confidence, 0) / total;
                  completedAt = Date.now();
                } else {
                  status = 'failed';
                  completedAt = Date.now();
                }
                break;
              case 'majority':
                if (approves / total > 0.5) {
                  status = 'completed';
                  result = `Majority approved (${approves}/${total}) — consensus reached`;
                  confidence = newVotes.filter(v => v.vote === 'approve').reduce((s, v) => s + v.confidence, 0) / approves;
                  completedAt = Date.now();
                } else {
                  status = 'failed';
                  completedAt = Date.now();
                }
                break;
              case 'delegation':
                const delegatorVote = newVotes.find(v => v.agentId === session.delegator);
                if (delegatorVote?.vote === 'approve') {
                  status = 'completed';
                  result = `Lead agent ${AGENT_NAMES[session.delegator || 'claude']} approved — delegation consensus`;
                  confidence = delegatorVote.confidence;
                  completedAt = Date.now();
                } else {
                  status = 'failed';
                  completedAt = Date.now();
                }
                break;
              case 'race':
                const firstApprove = newVotes.find(v => v.vote === 'approve');
                if (firstApprove) {
                  status = 'completed';
                  result = `${AGENT_NAMES[firstApprove.agentId]} won the race — first approval`;
                  confidence = firstApprove.confidence;
                  completedAt = Date.now();
                } else if (newVotes.length === session.agents.length) {
                  status = 'failed';
                  completedAt = Date.now();
                }
                break;
            }
          }

          return {
            ...session,
            votes: newVotes,
            status,
            result,
            confidence,
            completedAt,
          };
        }

        return session;
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleCreate = useCallback(() => {
    if (!question.trim() || selectedAgents.length === 0) return;

    const newSession: ConsensusSession = {
      id: `cs${Date.now()}`,
      question: question.trim(),
      agents: selectedAgents,
      strategy,
      status: 'voting',
      votes: [],
      debate: [],
      result: null,
      confidence: 0,
      createdAt: Date.now(),
      completedAt: null,
      delegator: strategy === 'delegation' ? delegator : undefined,
    };

    setSessions(prev => [newSession, ...prev]);
    setSelectedSession(newSession.id);
    setQuestion('');
    setShowCreate(false);
  }, [question, selectedAgents, strategy, delegator]);

  const activeSession = sessions.find(s => s.id === selectedSession);
  const activeSessions = sessions.filter(s => s.status === 'voting');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const failedSessions = sessions.filter(s => s.status === 'failed');

  const totalDecisions = completedSessions.length;
  const avgConfidence = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + s.confidence, 0) / completedSessions.length
    : 0;

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Gavel size={16} className="text-[#7B2CBF]" />
          Agent Consensus
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[#FFB627] font-mono font-bold text-sm">{activeSessions.length}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Voting</div>
            </div>
            <div className="text-center">
              <div className="text-[#00ff88] font-mono font-bold text-sm">{completedSessions.length}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Resolved</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-sm" style={{ color: avgConfidence > 0.8 ? '#00ff88' : avgConfidence > 0.6 ? '#FFB627' : '#E63946' }}>
                {(avgConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Confidence</div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'rgba(123,44,191,0.15)', border: '1px solid rgba(123,44,191,0.3)', color: '#c084fc' }}
          >
            <Plus size={12} /> New Session
          </button>
        </div>
      </div>

      {/* ─── Create Session Form ─── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[rgba(123,44,191,0.2)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 overflow-hidden"
          >
            <div className="space-y-3">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Enter the question for agents to debate..."
                rows={2}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] resize-none"
              />

              <div>
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Participating Agents</div>
                <div className="flex gap-2 flex-wrap">
                  {['claude', 'hermes', 'openclaw', 'vault'].map(id => (
                    <button
                      key={id}
                      onClick={() => setSelectedAgents(prev =>
                        prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
                      )}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                      style={{
                        borderColor: selectedAgents.includes(id) ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)',
                        background: selectedAgents.includes(id) ? `${AGENT_COLORS[id]}15` : 'transparent',
                        color: selectedAgents.includes(id) ? AGENT_COLORS[id] : '#8888aa',
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold"
                        style={{ backgroundColor: AGENT_COLORS[id], color: '#fff' }}
                      >
                        {AGENT_NAMES[id][0]}
                      </div>
                      {AGENT_NAMES[id]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Strategy</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.entries(STRATEGY_META) as [ConsensusStrategy, typeof STRATEGY_META[ConsensusStrategy]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setStrategy(key)}
                      className="text-left p-2 rounded-lg border text-[10px] transition-all"
                      style={{
                        borderColor: strategy === key ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                        background: strategy === key ? `${meta.color}10` : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <meta.icon size={10} style={{ color: strategy === key ? meta.color : '#8888aa' }} />
                        <span className="font-bold capitalize" style={{ color: strategy === key ? meta.color : '#ccc' }}>{key}</span>
                      </div>
                      <div className="text-[8px] text-[#8888aa] mt-0.5 leading-tight">{meta.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {strategy === 'delegation' && (
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Lead Agent (Delegator)</div>
                  <div className="flex gap-2">
                    {selectedAgents.map(id => (
                      <button
                        key={id}
                        onClick={() => setDelegator(id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                        style={{
                          borderColor: delegator === id ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)',
                          background: delegator === id ? `${AGENT_COLORS[id]}15` : 'transparent',
                          color: delegator === id ? AGENT_COLORS[id] : '#8888aa',
                        }}
                      >
                        {AGENT_NAMES[id]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreate}
                  disabled={!question.trim() || selectedAgents.length === 0}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)', color: '#fff' }}
                >
                  <Gavel size={11} /> Create Session
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content: Session List + Detail ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── Session List ─── */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
            <div className="p-3 border-b border-[rgba(157,78,221,0.1)]">
              <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
                <Users size={10} /> Sessions
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {sessions.map((session, i) => {
                const statusColor = getStatusColor(session.status);
                const isSelected = session.id === selectedSession;
                return (
                  <motion.button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="w-full text-left p-3 border-b border-[rgba(157,78,221,0.06)] hover:bg-[rgba(157,78,221,0.06)] transition-colors"
                    style={{ background: isSelected ? 'rgba(157,78,221,0.08)' : undefined }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: statusColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-medium truncate">{session.question}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="text-[7px] px-1 py-0.5 rounded-full font-bold uppercase"
                            style={{ backgroundColor: `${STRATEGY_META[session.strategy].color}12`, color: STRATEGY_META[session.strategy].color }}
                          >
                            {session.strategy}
                          </span>
                          <span
                            className="text-[7px] px-1 py-0.5 rounded-full font-bold uppercase"
                            style={{ backgroundColor: `${statusColor}12`, color: statusColor }}
                          >
                            {session.status}
                          </span>
                          <span className="text-[8px] text-[#8888aa] font-mono">
                            {session.votes.length}/{session.agents.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Session Detail ─── */}
        <div className="lg:col-span-2 space-y-4">
          {activeSession ? (
            <>
              {/* Question & Status */}
              <motion.div
                key={activeSession.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
                style={{ borderColor: `${getStatusColor(activeSession.status)}25` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <h3 className="text-white text-sm font-semibold leading-snug">{activeSession.question}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${STRATEGY_META[activeSession.strategy].color}12`, color: STRATEGY_META[activeSession.strategy].color, border: `1px solid ${STRATEGY_META[activeSession.strategy].color}25` }}
                      >
                        {activeSession.strategy}
                      </span>
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${getStatusColor(activeSession.status)}12`, color: getStatusColor(activeSession.status), border: `1px solid ${getStatusColor(activeSession.status)}25` }}
                      >
                        {activeSession.status}
                      </span>
                      {activeSession.delegator && (
                        <span className="text-[8px] text-[#8888aa]">
                          Lead: <span style={{ color: AGENT_COLORS[activeSession.delegator] }}>{AGENT_NAMES[activeSession.delegator]}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex -space-x-1.5 flex-shrink-0">
                    {activeSession.agents.map(agentId => (
                      <div
                        key={agentId}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-[#0a0a1a]"
                        style={{ backgroundColor: AGENT_COLORS[agentId] || '#8888aa', color: '#fff' }}
                      >
                        {(AGENT_NAMES[agentId] || agentId)[0]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vote Tally Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[9px] text-[#8888aa] mb-1">
                    <span>Vote Tally</span>
                    <span className="font-mono">
                      <span className="text-[#00ff88]">{activeSession.votes.filter(v => v.vote === 'approve').length} approve</span>
                      {' · '}
                      <span className="text-[#E63946]">{activeSession.votes.filter(v => v.vote === 'reject').length} reject</span>
                      {' · '}
                      <span className="text-[#8888aa]">{activeSession.votes.filter(v => v.vote === 'abstain').length} abstain</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden flex">
                    {activeSession.agents.length > 0 && activeSession.votes.map((vote, i) => (
                      <motion.div
                        key={i}
                        className="h-full"
                        style={{ backgroundColor: getVoteColor(vote.vote) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${100 / activeSession.agents.length}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Vote Cards — Parliament Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSession.votes.map((vote, i) => (
                  <VoteCard key={vote.agentId} vote={vote} isAnimating={activeSession.status === 'voting'} />
                ))}

                {/* Pending vote placeholders */}
                {activeSession.agents
                  .filter(agentId => !activeSession.votes.find(v => v.agentId === agentId))
                  .map(agentId => {
                    const agentColor = AGENT_COLORS[agentId] || '#8888aa';
                    return (
                      <motion.div
                        key={agentId}
                        className="rounded-xl border border-dashed p-3"
                        style={{ borderColor: 'rgba(157,78,221,0.15)', background: 'rgba(18,18,42,0.3)' }}
                        animate={{ borderColor: ['rgba(157,78,221,0.15)', 'rgba(157,78,221,0.3)', 'rgba(157,78,221,0.15)'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: `${agentColor}20`, color: agentColor, border: `2px solid ${agentColor}30` }}
                          >
                            {(AGENT_NAMES[agentId] || agentId)[0]}
                          </div>
                          <div>
                            <div className="text-[10px] text-[#8888aa]">{AGENT_NAMES[agentId] || agentId}</div>
                            <div className="flex items-center gap-1">
                              <motion.div
                                className="w-1.5 h-1.5 rounded-full bg-[#FFB627]"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                              <span className="text-[8px] text-[#FFB627] uppercase tracking-wider">Deliberating...</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              {/* Result Display */}
              <AnimatePresence>
                {activeSession.result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: activeSession.status === 'completed' ? 'rgba(0,255,136,0.25)' : 'rgba(230,57,70,0.25)',
                      background: activeSession.status === 'completed'
                        ? 'linear-gradient(135deg, rgba(0,255,136,0.05), rgba(18,18,42,0.6))'
                        : 'linear-gradient(135deg, rgba(230,57,70,0.05), rgba(18,18,42,0.6))',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {activeSession.status === 'completed' ? (
                        <CheckCircle size={16} className="text-[#00ff88]" />
                      ) : (
                        <XCircle size={16} className="text-[#E63946]" />
                      )}
                      <span className="text-white text-xs font-bold">
                        {activeSession.status === 'completed' ? 'Consensus Reached' : 'Consensus Failed'}
                      </span>
                      {activeSession.confidence > 0 && (
                        <span
                          className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${activeSession.status === 'completed' ? '#00ff88' : '#E63946'}12`,
                            color: activeSession.status === 'completed' ? '#00ff88' : '#E63946',
                          }}
                        >
                          {(activeSession.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#ccccdd]">{activeSession.result}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Debate Timeline */}
              {activeSession.debate.length > 0 && (
                <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <MessageSquare size={11} className="text-[#7B2CBF]" />
                    <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Debate Timeline</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {activeSession.debate.map((entry, i) => {
                      const agentColor = AGENT_COLORS[entry.agentId] || '#8888aa';
                      const typeColor = entry.type === 'support' ? '#00ff88' : entry.type === 'oppose' ? '#E63946' : '#FFB627';
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-2"
                        >
                          <div className="w-1 h-full min-h-[20px] rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: typeColor }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold" style={{ color: agentColor }}>
                                {AGENT_NAMES[entry.agentId] || entry.agentId}
                              </span>
                              <span
                                className="text-[7px] px-1 py-0.5 rounded-full font-bold uppercase"
                                style={{ backgroundColor: `${typeColor}12`, color: typeColor }}
                              >
                                {entry.type}
                              </span>
                            </div>
                            <p className="text-[9px] text-[#ccccdd] mt-0.5">{entry.argument}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
              <Gavel size={24} className="mx-auto text-[#8888aa] mb-2" />
              <p className="text-[#8888aa] text-xs">Select a session to view details, or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Consensus Metrics ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Decisions', value: String(totalDecisions), color: '#7B2CBF', icon: Gavel },
          { label: 'Avg Confidence', value: `${(avgConfidence * 100).toFixed(0)}%`, color: '#00ff88', icon: Sparkles },
          { label: 'Failed', value: String(failedSessions.length), color: '#E63946', icon: XCircle },
          { label: 'Success Rate', value: `${sessions.length > 0 ? ((completedSessions.length / sessions.length) * 100).toFixed(0) : 0}%`, color: '#FFB627', icon: Trophy },
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
            <div className="text-white font-mono font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
