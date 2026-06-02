'use client';

import { useOSStore, type SwarmSession, type SwarmProposal } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, Users, CheckCircle, XCircle, MinusCircle,
  Play, Trash2, Zap, Trophy,
  Clock, BarChart3, TrendingUp, Shield,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

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

const STRATEGY_META: Record<string, { color: string; desc: string }> = {
  consensus: { color: '#00ff88', desc: 'All agents must agree — highest quality, slowest' },
  majority: { color: '#FFB627', desc: 'Simple majority wins — balanced speed & quality' },
  delegation: { color: '#7B2CBF', desc: 'Lead agent decides — fastest, trusts expertise' },
  race: { color: '#E63946', desc: 'First valid proposal wins — maximum speed' },
};

type UiStatus = 'forming' | 'proposing' | 'voting' | 'executing' | 'completed' | 'dissolved';

function mapStatus(apiStatus: string, proposals: { votes: unknown[] }[]): UiStatus {
  if (apiStatus === 'completed' || apiStatus === 'dissolved' || apiStatus === 'executing' || apiStatus === 'forming')
    return apiStatus as UiStatus;
  if (apiStatus === 'deliberating') {
    const hasVotes = proposals.some(p => p.votes.length > 0);
    return hasVotes ? 'voting' : 'proposing';
  }
  return 'proposing';
}

const STATUS_COLORS: Record<string, string> = {
  forming: '#7B2CBF',
  proposing: '#FFB627',
  voting: '#00ff88',
  executing: '#E63946',
  completed: '#1B998B',
  dissolved: '#8888aa',
};

function consensusColor(pct: number): string {
  if (pct >= 80) return '#00ff88';
  if (pct >= 50) return '#FFB627';
  return '#E63946';
}

/* ─── API Response Types ─── */
interface ApiProposal {
  id: string;
  agentId: string;
  confidence: number;
  approves: number;
  rejects: number;
  abstains: number;
  isWinning: boolean;
}

interface ConsensusState {
  swarmId: string;
  task: string;
  strategy: string;
  status: string;
  currentRound: number;
  consensusPercentage: number;
  hasWinner: boolean;
  proposals: ApiProposal[];
}

interface HistoryItem {
  id: string;
  task: string;
  strategy: string;
  status: string;
  consensusPercentage: number;
  currentRound: number;
  maxRounds: number;
  winningProposalId: string | null;
  completedAt: number | null;
  dissolvedAt: number | null;
  createdAt: number;
  agents: string[];
  proposals: SwarmProposal[];
}

/* ═══════════════════════════════════════════════════════
   SWARM INTELLIGENCE — Main Export
   ═══════════════════════════════════════════════════════ */
export function SwarmIntelligence() {
  const { activeSwarms, swarmHistory, agents, addSwarm, updateSwarm } = useOSStore();
  const swarms = activeSwarms ?? [];

  const [consensusStates, setConsensusStates] = useState<ConsensusState[]>([]);
  const [apiHistory, setApiHistory] = useState<HistoryItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [task, setTask] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['claude', 'hermes']);
  const [strategy, setStrategy] = useState<string>('consensus');
  const [maxRounds, setMaxRounds] = useState(5);

  const fetchSwarmData = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/swarm');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const currentSwarms = useOSStore.getState().activeSwarms ?? [];
        for (const sw of data.activeSwarms ?? []) {
          const existing = currentSwarms.find(s => s.id === sw.id);
          if (!existing) {
            addSwarm({
              id: sw.id,
              task: sw.task,
              agents: sw.agents,
              strategy: sw.strategy,
              maxRounds: sw.maxRounds,
              currentRound: sw.currentRound,
              proposals: [],
              status: mapStatus(sw.status, []),
              winningProposal: null,
              consensusPercentage: sw.consensusPercentage,
              createdAt: sw.createdAt,
            });
          } else {
            updateSwarm(sw.id, {
              currentRound: sw.currentRound,
              status: mapStatus(sw.status, existing.proposals),
              consensusPercentage: sw.consensusPercentage,
            });
          }
        }
        setConsensusStates(data.consensusStates ?? []);
        setApiHistory(data.swarmHistory ?? []);
      }
    } catch { /* silent */ }
  }, [addSwarm, updateSwarm]);

  useEffect(() => {
    const controller = new AbortController();
    const doFetch = async () => {
      try {
        const res = await fetch('/api/hermes/swarm', { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          const currentSwarms = useOSStore.getState().activeSwarms ?? [];
          for (const sw of data.activeSwarms ?? []) {
            const existing = currentSwarms.find(s => s.id === sw.id);
            if (!existing) {
              addSwarm({
                id: sw.id,
                task: sw.task,
                agents: sw.agents,
                strategy: sw.strategy,
                maxRounds: sw.maxRounds,
                currentRound: sw.currentRound,
                proposals: [],
                status: mapStatus(sw.status, []),
                winningProposal: null,
                consensusPercentage: sw.consensusPercentage,
                createdAt: sw.createdAt,
              });
            } else {
              updateSwarm(sw.id, {
                currentRound: sw.currentRound,
                status: mapStatus(sw.status, existing.proposals),
                consensusPercentage: sw.consensusPercentage,
              });
            }
          }
          setConsensusStates(data.consensusStates ?? []);
          setApiHistory(data.swarmHistory ?? []);
        }
      } catch { /* silent */ }
    };
    doFetch();
    const interval = setInterval(doFetch, 10000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [addSwarm, updateSwarm]);

  const handleCreate = async () => {
    if (!task.trim() || selectedAgents.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hermes/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-swarm',
          task: task.trim(),
          agents: selectedAgents,
          strategy,
          maxRounds,
        }),
      });
      const data = await res.json();
      if (data.success && data.swarm) {
        addSwarm({
          id: data.swarm.id,
          task: data.swarm.task,
          agents: data.swarm.agents,
          strategy: data.swarm.strategy,
          maxRounds: data.swarm.maxRounds,
          currentRound: data.swarm.currentRound,
          proposals: [],
          status: mapStatus(data.swarm.status, []),
          winningProposal: null,
          consensusPercentage: 0,
          createdAt: data.swarm.createdAt,
        });
        setTask('');
        setShowCreate(false);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleVote = async (swarmId: string, proposalId: string, vote: 'approve' | 'reject' | 'abstain') => {
    try {
      await fetch('/api/hermes/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', swarmId, agentId: 'user', proposalId, vote, reasoning: '' }),
      });
      fetchSwarmData();
    } catch { /* silent */ }
  };

  const handleExecute = async (swarmId: string) => {
    try {
      await fetch('/api/hermes/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', swarmId }),
      });
      fetchSwarmData();
    } catch { /* silent */ }
  };

  const handleDissolve = async (swarmId: string) => {
    try {
      await fetch('/api/hermes/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dissolve', swarmId }),
      });
      fetchSwarmData();
    } catch { /* silent */ }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const completedCount = apiHistory.filter(s => s.status === 'completed').length;
  const avgConsensus = swarms.length > 0
    ? Math.round(swarms.reduce((sum, s) => sum + s.consensusPercentage, 0) / swarms.length)
    : 0;

  // Metrics
  const totalDecisions = apiHistory.filter(s => s.winningProposalId).length;
  const avgConsensusTime = apiHistory.filter(s => s.completedAt && s.createdAt).length > 0
    ? Math.round(apiHistory.filter(s => s.completedAt && s.createdAt).reduce((sum, s) => sum + ((s.completedAt! - s.createdAt) / 1000), 0) / Math.max(apiHistory.filter(s => s.completedAt && s.createdAt).length, 1))
    : 0;
  const strategyCounts: Record<string, { total: number; wins: number }> = {};
  for (const s of apiHistory) {
    if (!strategyCounts[s.strategy]) strategyCounts[s.strategy] = { total: 0, wins: 0 };
    strategyCounts[s.strategy].total++;
    if (s.winningProposalId) strategyCounts[s.strategy].wins++;
  }

  const agentWins: Record<string, number> = {};
  for (const s of apiHistory) {
    if (s.winningProposalId) {
      const winner = s.proposals?.find(p => p.id === s.winningProposalId);
      if (winner) agentWins[winner.agentId] = (agentWins[winner.agentId] || 0) + 1;
    }
  }
  const topAgent = Object.entries(agentWins).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      {/* ─── 1. Header with Status ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Brain size={16} className="text-[#7B2CBF]" />
          Swarm Intelligence
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-white font-mono font-bold text-sm">{swarms.length}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Active</div>
            </div>
            <div className="text-center">
              <div className="text-[#1B998B] font-mono font-bold text-sm">{completedCount}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Completed</div>
            </div>
            <div className="text-center">
              <div className="font-mono font-bold text-sm" style={{ color: consensusColor(avgConsensus) }}>{avgConsensus}%</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Consensus</div>
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'rgba(123,44,191,0.15)', border: '1px solid rgba(123,44,191,0.3)', color: '#c084fc' }}>
            <Plus size={12} /> Create Swarm
          </button>
        </div>
      </div>

      {/* ─── 2. Create Swarm Form (collapsible) ─── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[rgba(123,44,191,0.2)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 overflow-hidden">
            <div className="space-y-3">
              <input value={task} onChange={e => setTask(e.target.value)} placeholder="Describe the task for the swarm..."
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />

              <div>
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Agents</div>
                <div className="flex gap-2">
                  {['claude', 'hermes', 'openclaw', 'vault'].map(id => (
                    <button key={id} onClick={() => toggleAgent(id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                      style={{
                        borderColor: selectedAgents.includes(id) ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)',
                        background: selectedAgents.includes(id) ? `${AGENT_COLORS[id]}15` : 'transparent',
                        color: selectedAgents.includes(id) ? AGENT_COLORS[id] : '#8888aa',
                      }}>
                      <div className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold"
                        style={{ backgroundColor: AGENT_COLORS[id], color: '#fff' }}>{AGENT_NAMES[id][0]}</div>
                      {AGENT_NAMES[id]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Strategy</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(STRATEGY_META).map(([key, meta]) => (
                    <button key={key} onClick={() => setStrategy(key)}
                      className="text-left p-2 rounded-lg border text-[10px] transition-all"
                      style={{
                        borderColor: strategy === key ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                        background: strategy === key ? `${meta.color}10` : 'transparent',
                      }}>
                      <div className="font-bold capitalize" style={{ color: strategy === key ? meta.color : '#ccc' }}>{key}</div>
                      <div className="text-[8px] text-[#8888aa] mt-0.5 leading-tight">{meta.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Max Rounds</div>
                  <input type="number" min={1} max={100} value={maxRounds} onChange={e => setMaxRounds(Number(e.target.value))}
                    className="w-20 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
                </div>
                <button onClick={handleCreate} disabled={loading || !task.trim() || selectedAgents.length === 0}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)', color: '#fff' }}>
                  <Zap size={11} /> {loading ? 'Creating...' : 'Launch Swarm'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 3. Active Swarms Grid ─── */}
      {swarms.length === 0 && consensusStates.length === 0 ? (
        <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
          <Users size={24} className="mx-auto text-[#8888aa] mb-2" />
          <p className="text-[#8888aa] text-xs">No active swarms. Create one to begin collaborative decision-making.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {(consensusStates.length > 0 ? consensusStates : swarms.map(s => ({
            swarmId: s.id, task: s.task, strategy: s.strategy, status: s.status,
            currentRound: s.currentRound, consensusPercentage: s.consensusPercentage,
            hasWinner: s.winningProposal !== null, proposals: s.proposals.map(p => ({
              id: p.id, agentId: p.agentId, confidence: p.confidence,
              approves: p.votes.filter(v => v.vote === 'approve').length,
              rejects: p.votes.filter(v => v.vote === 'reject').length,
              abstains: p.votes.filter(v => v.vote === 'abstain').length,
              isWinning: s.winningProposal?.id === p.id,
            })),
          }))).map((swarm, idx) => {
            const uiStatus = mapStatus(swarm.status, swarm.proposals as unknown as { votes: unknown[] }[]);
            const sMeta = STRATEGY_META[swarm.strategy] || STRATEGY_META.consensus;
            const swarmAgents = swarms.find(s => s.id === swarm.swarmId)?.agents ?? [];

            return (
              <motion.div key={swarm.swarmId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
                style={{ borderColor: `${sMeta.color}20` }}>
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-white text-xs font-medium truncate">{swarm.task}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{ backgroundColor: `${sMeta.color}15`, color: sMeta.color, border: `1px solid ${sMeta.color}30` }}>
                        {swarm.strategy}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{ backgroundColor: `${STATUS_COLORS[uiStatus]}15`, color: STATUS_COLORS[uiStatus], border: `1px solid ${STATUS_COLORS[uiStatus]}30` }}>
                        {uiStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex -space-x-1.5">
                    {swarmAgents.map(agentId => (
                      <div key={agentId} className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-[#0a0a1a]"
                        style={{ backgroundColor: AGENT_COLORS[agentId] || '#8888aa', color: '#fff' }}>
                        {(AGENT_NAMES[agentId] || agentId)[0]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Round progress */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[9px] text-[#8888aa] mb-1">
                    <span>Round <span className="text-white font-mono">{swarm.currentRound}</span></span>
                    <span className="font-mono" style={{ color: consensusColor(swarm.consensusPercentage) }}>
                      {Math.round(swarm.consensusPercentage)}% consensus
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${sMeta.color}88, ${sMeta.color})` }}
                      initial={{ width: 0 }} animate={{ width: `${Math.min((swarm.currentRound / (swarms.find(s => s.id === swarm.swarmId)?.maxRounds || 5)) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Proposals list */}
                {swarm.proposals.length > 0 && (
                  <div className="space-y-1.5 mt-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {swarm.proposals.map((prop: ApiProposal) => (
                      <div key={prop.id}
                        className="rounded-lg border p-2 flex items-center gap-2"
                        style={{ borderColor: prop.isWinning ? '#00ff8830' : 'rgba(157,78,221,0.1)', background: prop.isWinning ? 'rgba(0,255,136,0.03)' : 'rgba(10,10,26,0.3)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                          style={{ backgroundColor: AGENT_COLORS[prop.agentId] || '#8888aa', color: '#fff' }}>
                          {(AGENT_NAMES[prop.agentId] || prop.agentId)[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-white font-medium">{AGENT_NAMES[prop.agentId] || prop.agentId}</span>
                            <span className="text-[8px] font-mono px-1 py-0.5 rounded"
                              style={{ backgroundColor: `${consensusColor(prop.confidence * 100)}15`, color: consensusColor(prop.confidence * 100) }}>
                              {(prop.confidence * 100).toFixed(0)}%
                            </span>
                            {prop.isWinning && <Trophy size={9} className="text-[#FFB627]" />}
                          </div>
                          <div className="flex items-center gap-2 text-[8px] text-[#8888aa] font-mono mt-0.5">
                            <span className="text-[#00ff88]">{prop.approves}✓</span>
                            <span className="text-[#E63946]">{prop.rejects}✗</span>
                            <span className="text-[#8888aa]">{prop.abstains}○</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleVote(swarm.swarmId, prop.id, 'approve')}
                            className="w-5 h-5 rounded flex items-center justify-center border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors" title="Approve">
                            <CheckCircle size={10} />
                          </button>
                          <button onClick={() => handleVote(swarm.swarmId, prop.id, 'reject')}
                            className="w-5 h-5 rounded flex items-center justify-center border border-[rgba(230,57,70,0.2)] text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] transition-colors" title="Reject">
                            <XCircle size={10} />
                          </button>
                          <button onClick={() => handleVote(swarm.swarmId, prop.id, 'abstain')}
                            className="w-5 h-5 rounded flex items-center justify-center border border-[rgba(136,136,170,0.2)] text-[#8888aa] hover:bg-[rgba(136,136,170,0.1)] transition-colors" title="Abstain">
                            <MinusCircle size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[rgba(157,78,221,0.08)]">
                  <button onClick={() => handleExecute(swarm.swarmId)} disabled={!swarm.hasWinner}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors disabled:opacity-30">
                    <Play size={9} /> Execute
                  </button>
                  <button onClick={() => handleDissolve(swarm.swarmId)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] hover:bg-[rgba(230,57,70,0.1)] transition-colors">
                    <Trash2 size={9} /> Dissolve
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── 4. Swarm History ─── */}
      {apiHistory.length > 0 && (
        <div>
          <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={10} /> Swarm History
          </h3>
          <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] overflow-hidden">
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {apiHistory.map((s, i) => {
                const winner = s.winningProposalId ? s.proposals?.find(p => p.id === s.winningProposalId) : null;
                const duration = s.completedAt && s.createdAt ? Math.round((s.completedAt - s.createdAt) / 1000) : null;
                return (
                  <motion.div key={s.id + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 px-3 py-2 border-b border-[rgba(157,78,221,0.06)] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[10px] truncate">{s.task}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] px-1 py-0.5 rounded-full font-bold uppercase"
                          style={{ backgroundColor: `${STRATEGY_META[s.strategy]?.color || '#8888aa'}12`, color: STRATEGY_META[s.strategy]?.color || '#8888aa' }}>
                          {s.strategy}
                        </span>
                        {winner && (
                          <span className="text-[8px] text-[#FFB627] flex items-center gap-0.5">
                            <Trophy size={7} /> {AGENT_NAMES[winner.agentId] || winner.agentId}
                          </span>
                        )}
                        <span className="text-[8px] font-mono" style={{ color: consensusColor(s.consensusPercentage) }}>
                          {Math.round(s.consensusPercentage)}%
                        </span>
                        {duration !== null && (
                          <span className="text-[8px] text-[#8888aa] font-mono">{duration}s</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                      style={{ backgroundColor: `${STATUS_COLORS[s.status] || '#8888aa'}12`, color: STATUS_COLORS[s.status] || '#8888aa' }}>
                      {s.status}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Collective Intelligence Metrics ─── */}
      <div>
        <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BarChart3 size={10} /> Collective Intelligence
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="rounded-lg border border-[rgba(123,44,191,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={10} className="text-[#7B2CBF]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Decisions</span>
            </div>
            <div className="text-white font-mono font-bold text-lg">{totalDecisions}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-lg border border-[rgba(255,182,39,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={10} className="text-[#FFB627]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Avg Time</span>
            </div>
            <div className="text-white font-mono font-bold text-lg">{avgConsensusTime}<span className="text-[10px] text-[#8888aa]">s</span></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy size={10} className="text-[#00ff88]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Top Agent</span>
            </div>
            <div className="text-white font-mono font-bold text-sm">
              {topAgent ? AGENT_NAMES[topAgent[0]] || topAgent[0] : '—'}
            </div>
            {topAgent && <div className="text-[8px] text-[#00ff88] font-mono">{topAgent[1]} wins</div>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-lg border border-[rgba(230,57,70,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={10} className="text-[#E63946]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Strategy Rates</span>
            </div>
            <div className="space-y-1">
              {Object.entries(strategyCounts).map(([name, { total, wins }]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="text-[8px] capitalize w-16" style={{ color: STRATEGY_META[name]?.color || '#8888aa' }}>{name}</span>
                  <div className="flex-1 h-1 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? (wins / total) * 100 : 0}%`, backgroundColor: STRATEGY_META[name]?.color || '#8888aa' }} />
                  </div>
                  <span className="text-[8px] font-mono text-[#8888aa]">{wins}/{total}</span>
                </div>
              ))}
              {Object.keys(strategyCounts).length === 0 && <div className="text-[8px] text-[#8888aa]">No data yet</div>}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
