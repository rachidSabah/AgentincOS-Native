'use client';

import { useOSStore, type Agent } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Medal, Zap, Target, Clock, DollarSign,
  TrendingUp, BarChart3, Shield, Award, Activity,
  ChevronRight, Swords, Crown, Flame, Eye,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type MetricKey = 'speed' | 'accuracy' | 'costEfficiency' | 'tasksCompleted' | 'uptime';

interface AgentPerformance {
  agentId: string;
  speed: number;          // avg response time (lower = better, inverted for score)
  accuracy: number;       // 0-100
  costEfficiency: number; // 0-100 score
  tasksCompleted: number;
  uptime: number;         // percentage 0-100
  tokenEfficiency: number;// quality per 1k tokens
  wins: number;
  losses: number;
  sparkline: number[];    // 7-day trend values
  rank: number;
  prevRank: number;
}

interface ComparisonData {
  agentA: string;
  agentB: string;
  metrics: { label: string; key: string; a: number; b: number; unit: string }[];
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & MOCK
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

const METRIC_META: Record<MetricKey, { label: string; icon: typeof Trophy; color: string; unit: string; higherBetter: boolean }> = {
  speed: { label: 'Speed', icon: Zap, color: '#00ffff', unit: 'ms', higherBetter: true },
  accuracy: { label: 'Accuracy', icon: Target, color: '#00ff88', unit: '%', higherBetter: true },
  costEfficiency: { label: 'Cost Efficiency', icon: DollarSign, color: '#FFB627', unit: 'pts', higherBetter: true },
  tasksCompleted: { label: 'Tasks Done', icon: BarChart3, color: '#7B2CBF', unit: '', higherBetter: true },
  uptime: { label: 'Uptime', icon: Shield, color: '#1B998B', unit: '%', higherBetter: true },
};

const MOCK_PERFORMANCE: AgentPerformance[] = [
  {
    agentId: 'claude',
    speed: 142, accuracy: 94, costEfficiency: 68, tasksCompleted: 847,
    uptime: 99.7, tokenEfficiency: 78, wins: 23, losses: 8,
    sparkline: [72, 78, 82, 75, 88, 91, 94],
    rank: 2, prevRank: 3,
  },
  {
    agentId: 'hermes',
    speed: 203, accuracy: 87, costEfficiency: 72, tasksCompleted: 1203,
    uptime: 99.9, tokenEfficiency: 85, wins: 31, losses: 12,
    sparkline: [80, 83, 79, 85, 88, 86, 87],
    rank: 1, prevRank: 1,
  },
  {
    agentId: 'openclaw',
    speed: 89, accuracy: 91, costEfficiency: 82, tasksCompleted: 523,
    uptime: 99.2, tokenEfficiency: 92, wins: 18, losses: 7,
    sparkline: [85, 88, 90, 87, 89, 91, 91],
    rank: 3, prevRank: 2,
  },
  {
    agentId: 'vault',
    speed: 34, accuracy: 98, costEfficiency: 95, tasksCompleted: 892,
    uptime: 100, tokenEfficiency: 96, wins: 15, losses: 2,
    sparkline: [94, 95, 96, 97, 98, 97, 98],
    rank: 4, prevRank: 4,
  },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function getScore(perf: AgentPerformance, metric: MetricKey): number {
  switch (metric) {
    case 'speed': return Math.max(0, 100 - perf.speed / 3);
    case 'accuracy': return perf.accuracy;
    case 'costEfficiency': return perf.costEfficiency;
    case 'tasksCompleted': return Math.min(100, (perf.tasksCompleted / 1500) * 100);
    case 'uptime': return perf.uptime;
    default: return 0;
  }
}

function rankChangeIcon(prev: number, current: number) {
  if (current < prev) return { icon: ArrowUpRight, color: '#00ff88', text: `+${prev - current}` };
  if (current > prev) return { icon: ArrowDownRight, color: '#ff0040', text: `${prev - current}` };
  return { icon: Minus, color: '#8888aa', text: '—' };
}

function medalForRank(rank: number): { icon: typeof Crown; color: string; label: string } | null {
  switch (rank) {
    case 1: return { icon: Crown, color: '#FFB627', label: '1st' };
    case 2: return { icon: Medal, color: '#C0C0C0', label: '2nd' };
    case 3: return { icon: Award, color: '#CD7F32', label: '3rd' };
    default: return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   SPARKLINE SVG
   ═══════════════════════════════════════════════════════════ */

function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;
  const padX = 2, padY = 3;

  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (width - padX * 2),
    y: padY + (1 - (v - minVal) / range) * (height - padY * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${height - padY} L${pts[0].x},${height - padY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width, height }}>
      <defs>
        <linearGradient id={`sp-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${color.replace('#', '')})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 2 : 1} fill={color} opacity={i === pts.length - 1 ? 1 : 0.4} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   PODIUM ANIMATION
   ═══════════════════════════════════════════════════════════ */

function Podium({ sorted, metric }: { sorted: AgentPerformance[]; metric: MetricKey }) {
  const top3 = sorted.slice(0, 3);
  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = top3.length >= 3 ? [70, 100, 50] : top3.length === 2 ? [80, 100] : [100];

  return (
    <div className="flex items-end justify-center gap-3 h-40">
      {podiumOrder.map((perf, i) => {
        const color = AGENT_COLORS[perf.agentId] || '#8888aa';
        const name = AGENT_NAMES[perf.agentId] || perf.agentId;
        const medal = medalForRank(perf.rank);
        const h = heights[i] || 50;
        const score = getScore(perf, metric);

        return (
          <motion.div key={perf.agentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: `${h}%`, opacity: 1 }}
            transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
            className="flex flex-col items-center justify-end relative"
            style={{ width: '30%', maxWidth: 100 }}>
            {/* Agent avatar */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
                style={{ backgroundColor: `${color}20`, borderColor: `${color}50`, boxShadow: `0 0 15px ${color}30` }}>
                {name[0]}
              </div>
              {medal && (
                <div className="absolute -top-2 -right-1">
                  <medal.icon size={14} style={{ color: medal.color }} />
                </div>
              )}
            </motion.div>

            {/* Podium block */}
            <div className="w-full rounded-t-lg relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${color}30, ${color}08)`,
                border: `1px solid ${color}25`,
                borderBottom: 'none',
              }}>
              <div className="p-2 text-center">
                <div className="text-[9px] text-white font-bold">{name}</div>
                <div className="text-[8px] font-mono" style={{ color }}>{Math.round(score)}pts</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT LEADERBOARD — Main Export
   ═══════════════════════════════════════════════════════════ */

export function AgentLeaderboard() {
  const { agents, agentAnalytics } = useOSStore();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('accuracy');
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...MOCK_PERFORMANCE].sort((a, b) => getScore(b, selectedMetric) - getScore(a, selectedMetric));
  }, [selectedMetric]);

  // Update ranks based on sort
  const ranked = useMemo(() => {
    return sorted.map((perf, i) => ({ ...perf, rank: i + 1 }));
  }, [sorted]);

  const comparisonData = useMemo((): ComparisonData | null => {
    if (!compareA || !compareB) return null;
    const perfA = MOCK_PERFORMANCE.find(p => p.agentId === compareA);
    const perfB = MOCK_PERFORMANCE.find(p => p.agentId === compareB);
    if (!perfA || !perfB) return null;

    return {
      agentA: compareA,
      agentB: compareB,
      metrics: [
        { label: 'Speed (lower = better)', key: 'speed', a: perfA.speed, b: perfB.speed, unit: 'ms' },
        { label: 'Accuracy', key: 'accuracy', a: perfA.accuracy, b: perfB.accuracy, unit: '%' },
        { label: 'Cost Efficiency', key: 'costEfficiency', a: perfA.costEfficiency, b: perfB.costEfficiency, unit: 'pts' },
        { label: 'Tasks Completed', key: 'tasksCompleted', a: perfA.tasksCompleted, b: perfB.tasksCompleted, unit: '' },
        { label: 'Uptime', key: 'uptime', a: perfA.uptime, b: perfB.uptime, unit: '%' },
        { label: 'Token Efficiency', key: 'tokenEfficiency', a: perfA.tokenEfficiency, b: perfB.tokenEfficiency, unit: 'pts' },
        { label: 'Win/Loss', key: 'wins', a: perfA.wins, b: perfB.wins, unit: 'W' },
      ],
    };
  }, [compareA, compareB]);

  const handleCompare = useCallback((agentId: string) => {
    if (!compareA) {
      setCompareA(agentId);
    } else if (!compareB && agentId !== compareA) {
      setCompareB(agentId);
    } else {
      setCompareA(agentId);
      setCompareB(null);
    }
  }, [compareA, compareB]);

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Trophy size={16} className="text-[#FFB627]" />
          Agent Performance Leaderboard
        </h2>
        {compareA && compareB && (
          <button onClick={() => { setCompareA(null); setCompareB(null); }}
            className="text-[9px] text-[#8888aa] hover:text-white transition-colors flex items-center gap-1">
            Clear comparison
          </button>
        )}
      </div>

      {/* ─── Metric Selector ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.entries(METRIC_META) as [MetricKey, typeof METRIC_META[MetricKey]][]).map(([key, meta]) => (
          <button key={key} onClick={() => setSelectedMetric(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
            style={{
              borderColor: selectedMetric === key ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
              background: selectedMetric === key ? `${meta.color}12` : 'transparent',
              color: selectedMetric === key ? meta.color : '#8888aa',
            }}>
            <meta.icon size={10} /> {meta.label}
          </button>
        ))}
      </div>

      {/* ─── Podium ─── */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Crown size={10} className="text-[#FFB627]" /> Top Performers — {METRIC_META[selectedMetric].label}
        </div>
        <Podium sorted={ranked} metric={selectedMetric} />
      </motion.div>

      {/* ─── Leaderboard Table ─── */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[rgba(157,78,221,0.1)] text-[8px] text-[#8888aa] uppercase tracking-wider font-semibold">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">Agent</div>
          <div className="col-span-2">Score</div>
          <div className="col-span-2">Trend (7d)</div>
          <div className="col-span-2">W/L Record</div>
          <div className="col-span-2">Token Eff.</div>
        </div>

        {/* Table rows */}
        <AnimatePresence mode="popLayout">
          {ranked.map((perf, idx) => {
            const agent = agents.find(a => a.id === perf.agentId);
            const color = AGENT_COLORS[perf.agentId] || '#8888aa';
            const name = AGENT_NAMES[perf.agentId] || perf.agentId;
            const score = getScore(perf, selectedMetric);
            const medal = medalForRank(perf.rank);
            const rankChange = rankChangeIcon(perf.prevRank, perf.rank);
            const RankChangeIcon = rankChange.icon;
            const isSelectedForCompare = compareA === perf.agentId || compareB === perf.agentId;

            return (
              <motion.div key={perf.agentId}
                layout
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                onClick={() => handleCompare(perf.agentId)}
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[rgba(157,78,221,0.06)] items-center cursor-pointer hover:bg-[rgba(157,78,221,0.04)] transition-colors"
                style={{
                  background: isSelectedForCompare ? 'rgba(157,78,221,0.08)' : undefined,
                  borderLeft: isSelectedForCompare ? `2px solid ${color}` : '2px solid transparent',
                }}>
                {/* Rank */}
                <div className="col-span-1 flex items-center gap-1">
                  {medal ? (
                    <div className="relative">
                      <medal.icon size={16} style={{ color: medal.color, filter: `drop-shadow(0 0 4px ${medal.color}60)` }} />
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono font-bold text-[#8888aa]">{perf.rank}</span>
                  )}
                  <RankChangeIcon size={8} style={{ color: rankChange.color }} />
                </div>

                {/* Agent */}
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                    style={{
                      backgroundColor: `${color}25`,
                      border: `1px solid ${color}40`,
                      boxShadow: perf.rank <= 3 ? `0 0 10px ${color}25` : 'none',
                    }}>
                    {name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-white font-medium truncate">{name}</div>
                    <div className="text-[8px] text-[#8888aa] font-mono">{agent?.model || 'multi-model'}</div>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold" style={{ color: METRIC_META[selectedMetric].color }}>
                      {Math.round(score)}
                    </span>
                    <div className="flex-1 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden max-w-[60px]">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: METRIC_META[selectedMetric].color }}
                        initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.5, delay: idx * 0.05 }} />
                    </div>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="col-span-2">
                  <Sparkline data={perf.sparkline} color={color} width={70} height={22} />
                </div>

                {/* Win/Loss */}
                <div className="col-span-2 flex items-center gap-1.5">
                  <Swords size={9} className="text-[#8888aa]" />
                  <span className="text-[9px] font-mono text-[#00ff88] font-bold">{perf.wins}W</span>
                  <span className="text-[9px] text-[#8888aa]">/</span>
                  <span className="text-[9px] font-mono text-[#ff0040] font-bold">{perf.losses}L</span>
                  <span className="text-[8px] font-mono text-[#8888aa]">
                    ({perf.wins + perf.losses > 0 ? Math.round((perf.wins / (perf.wins + perf.losses)) * 100) : 0}%)
                  </span>
                </div>

                {/* Token Efficiency */}
                <div className="col-span-2 flex items-center gap-1.5">
                  <Flame size={9} style={{ color }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: perf.tokenEfficiency > 85 ? '#00ff88' : perf.tokenEfficiency > 70 ? '#FFB627' : '#ff0040' }}>
                    {perf.tokenEfficiency}
                  </span>
                  <span className="text-[8px] text-[#8888aa]">pts/1k tok</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* ─── Head-to-Head Comparison ─── */}
      {comparisonData && (
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-white text-xs font-semibold mb-4 flex items-center gap-1.5">
            <Swords size={12} className="text-[#E8751A]" /> Head-to-Head Comparison
          </h3>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: `${AGENT_COLORS[comparisonData.agentA]}25`, border: `1px solid ${AGENT_COLORS[comparisonData.agentA]}40` }}>
                {AGENT_NAMES[comparisonData.agentA]?.[0]}
              </div>
              <span className="text-[10px] text-white font-medium">{AGENT_NAMES[comparisonData.agentA]}</span>
            </div>
            <div className="text-[10px] text-[#8888aa] font-bold">VS</div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: `${AGENT_COLORS[comparisonData.agentB]}25`, border: `1px solid ${AGENT_COLORS[comparisonData.agentB]}40` }}>
                {AGENT_NAMES[comparisonData.agentB]?.[0]}
              </div>
              <span className="text-[10px] text-white font-medium">{AGENT_NAMES[comparisonData.agentB]}</span>
            </div>
          </div>

          <div className="space-y-2">
            {comparisonData.metrics.map((m, i) => {
              const aColor = AGENT_COLORS[comparisonData.agentA];
              const bColor = AGENT_COLORS[comparisonData.agentB];
              const total = m.a + m.b || 1;
              const aPct = (m.a / total) * 100;
              const bPct = (m.b / total) * 100;
              const aWins = m.key === 'speed' ? m.a < m.b : m.a > m.b;
              const bWins = m.key === 'speed' ? m.b < m.a : m.b > m.a;

              return (
                <motion.div key={m.key} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)] p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold" style={{ color: aWins ? aColor : '#8888aa' }}>
                      {m.a}{m.unit ? ` ${m.unit}` : ''}
                    </span>
                    <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{m.label}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: bWins ? bColor : '#8888aa' }}>
                      {m.b}{m.unit ? ` ${m.unit}` : ''}
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-[rgba(10,10,26,0.8)]">
                    <motion.div className="h-full rounded-l-full" style={{ backgroundColor: aColor }}
                      initial={{ width: 0 }} animate={{ width: `${aPct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }} />
                    <motion.div className="h-full rounded-r-full" style={{ backgroundColor: bColor }}
                      initial={{ width: 0 }} animate={{ width: `${bPct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Comparison Hint ─── */}
      {!comparisonData && compareA && (
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-[10px] text-[#8888aa]">
            <span className="font-medium" style={{ color: AGENT_COLORS[compareA] }}>{AGENT_NAMES[compareA]}</span> selected. Click another agent to compare.
          </p>
        </motion.div>
      )}

      {!compareA && (
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)] p-3 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-[9px] text-[#8888aa] flex items-center justify-center gap-1.5">
            <Eye size={9} /> Click any agent row to start a head-to-head comparison
          </p>
        </motion.div>
      )}
    </div>
  );
}
