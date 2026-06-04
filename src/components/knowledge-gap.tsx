'use client';

import { useMemoryStore } from '@/lib/memory-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, AlertTriangle, TrendingUp, Brain, BookOpen,
  Target, Zap, ChevronRight, BarChart3, Layers,
  Shield, ArrowUpRight, Sparkles, Eye, Clock,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type GapCategory = 'technical' | 'business' | 'personal' | 'projects';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface KnowledgeGap {
  id: string;
  topic: string;
  category: GapCategory;
  gapScore: number;       // 0-100, lower = more gaps
  description: string;
  researchActions: ResearchAction[];
  trend: 'improving' | 'stable' | 'declining';
  lastQueried: string;
  missCount: number;
}

interface ResearchAction {
  id: string;
  title: string;
  priority: Priority;
  estimatedTime: string;
  description: string;
}

interface TrendPoint {
  week: string;
  score: number;
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */

const CATEGORY_META: Record<GapCategory, { color: string; icon: typeof Brain; label: string }> = {
  technical: { color: '#00ffff', icon: Brain, label: 'Technical' },
  business: { color: '#FFB627', icon: BarChart3, label: 'Business' },
  personal: { color: '#1B998B', icon: Eye, label: 'Personal' },
  projects: { color: '#7B2CBF', icon: Layers, label: 'Projects' },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: '#ff0040',
  high: '#E8751A',
  medium: '#FFB627',
  low: '#8888aa',
};

const MOCK_GAPS: KnowledgeGap[] = [
  {
    id: 'gap-001',
    topic: 'Kubernetes Orchestration',
    category: 'technical',
    gapScore: 18,
    description: 'No memories found for Kubernetes deployment patterns, pod scaling, or service mesh configuration. Recent queries about container orchestration returned 0 matches.',
    researchActions: [
      { id: 'ra-001', title: 'Research K8s deployment patterns', priority: 'critical', estimatedTime: '45 min', description: 'Deep dive into deployment strategies, Helm charts, and service mesh configs' },
      { id: 'ra-002', title: 'Document container scaling policies', priority: 'high', estimatedTime: '30 min', description: 'Capture HPA, VPA, and cluster autoscaler configurations' },
    ],
    trend: 'declining',
    lastQueried: '2 hours ago',
    missCount: 7,
  },
  {
    id: 'gap-002',
    topic: 'Revenue Model & Pricing',
    category: 'business',
    gapScore: 32,
    description: 'Limited knowledge on pricing strategies, revenue projections, and market sizing. Only 2 fragmented notes on competitor pricing found.',
    researchActions: [
      { id: 'ra-003', title: 'Build pricing model matrix', priority: 'high', estimatedTime: '60 min', description: 'Research SaaS pricing tiers, freemium conversion rates, and enterprise licensing' },
      { id: 'ra-004', title: 'Analyze competitor pricing pages', priority: 'medium', estimatedTime: '20 min', description: 'Extract pricing data from AutoGPT, CrewAI, and LangGraph websites' },
    ],
    trend: 'stable',
    lastQueried: '1 day ago',
    missCount: 4,
  },
  {
    id: 'gap-003',
    topic: 'Team Work Preferences',
    category: 'personal',
    gapScore: 55,
    description: 'Some knowledge exists about user preferences, but team-level preferences for communication, standup format, and code review style are missing.',
    researchActions: [
      { id: 'ra-005', title: 'Survey team communication preferences', priority: 'medium', estimatedTime: '15 min', description: 'Ask about async vs sync preferences, meeting cadence, and review style' },
    ],
    trend: 'improving',
    lastQueried: '3 days ago',
    missCount: 2,
  },
  {
    id: 'gap-004',
    topic: 'Agent OS v3.0 Architecture',
    category: 'projects',
    gapScore: 12,
    description: 'Zero knowledge about v3.0 plans. No design docs, architecture decisions, or feature specs recorded. Critical gap for planning.',
    researchActions: [
      { id: 'ra-006', title: 'Draft v3.0 architecture spec', priority: 'critical', estimatedTime: '90 min', description: 'Define the next-gen agent architecture, multi-tenant support, and plugin ecosystem' },
      { id: 'ra-007', title: 'Research multi-tenant patterns', priority: 'high', estimatedTime: '40 min', description: 'Study SaaS multi-tenancy: data isolation, billing, and RBAC' },
      { id: 'ra-008', title: 'Evaluate plugin marketplace designs', priority: 'medium', estimatedTime: '30 min', description: 'Analyze VS Code, Figma, and Shopify plugin architectures' },
    ],
    trend: 'declining',
    lastQueried: '5 hours ago',
    missCount: 9,
  },
  {
    id: 'gap-005',
    topic: 'WebGL & Shader Programming',
    category: 'technical',
    gapScore: 25,
    description: 'No memories for GPU programming, shader languages, or 3D rendering pipelines. Recent visual effects queries returned empty.',
    researchActions: [
      { id: 'ra-009', title: 'Study WebGL 2.0 pipeline', priority: 'high', estimatedTime: '50 min', description: 'Capture vertex/fragment shader basics, buffer management, and rendering loop' },
    ],
    trend: 'stable',
    lastQueried: '12 hours ago',
    missCount: 3,
  },
  {
    id: 'gap-006',
    topic: 'Investor Relations Strategy',
    category: 'business',
    gapScore: 42,
    description: 'Limited investor data — only basic contact info stored. No pitch deck versions, term sheet analysis, or fundraising timeline documented.',
    researchActions: [
      { id: 'ra-010', title: 'Document fundraising timeline', priority: 'medium', estimatedTime: '25 min', description: 'Record seed/Series A milestones, investor pipeline, and key dates' },
    ],
    trend: 'improving',
    lastQueried: '2 days ago',
    missCount: 5,
  },
];

const TREND_DATA: TrendPoint[] = [
  { week: 'W1', score: 22 },
  { week: 'W2', score: 28 },
  { week: 'W3', score: 35 },
  { week: 'W4', score: 42 },
  { week: 'W5', score: 48 },
  { week: 'W6', score: 53 },
  { week: 'W7', score: 58 },
  { week: 'W8', score: 61 },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function gapScoreColor(score: number): string {
  if (score < 25) return '#ff0040';
  if (score < 50) return '#E8751A';
  if (score < 75) return '#FFB627';
  return '#00ff88';
}

function trendIcon(trend: string): typeof TrendingUp {
  return trend === 'improving' ? TrendingUp : trend === 'declining' ? AlertTriangle : Target;
}

function trendColor(trend: string): string {
  return trend === 'improving' ? '#00ff88' : trend === 'declining' ? '#ff0040' : '#FFB627';
}

/* ═══════════════════════════════════════════════════════════
   RADAR CHART (SVG)
   ═══════════════════════════════════════════════════════════ */

function RadarChart({ gaps }: { gaps: KnowledgeGap[] }) {
  const categories: GapCategory[] = ['technical', 'business', 'personal', 'projects'];
  const avgByCategory = categories.map(cat => {
    const catGaps = gaps.filter(g => g.category === cat);
    return catGaps.length > 0 ? catGaps.reduce((s, g) => s + g.gapScore, 0) / catGaps.length : 0;
  });

  const cx = 120, cy = 120, maxR = 90;
  const angles = categories.map((_, i) => (i * 2 * Math.PI) / categories.length - Math.PI / 2);

  const points = avgByCategory.map((score, i) => {
    const r = (score / 100) * maxR;
    return { x: cx + r * Math.cos(angles[i]), y: cy + r * Math.sin(angles[i]) };
  });

  const gridLevels = [25, 50, 75, 100];

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full max-w-[260px] mx-auto">
      {/* Grid rings */}
      {gridLevels.map(level => {
        const r = (level / 100) * maxR;
        const gridPoints = angles.map(a => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }));
        return (
          <polygon key={level}
            points={gridPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="rgba(157,78,221,0.12)" strokeWidth="0.5" />
        );
      })}

      {/* Axis lines */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
          stroke="rgba(157,78,221,0.1)" strokeWidth="0.5" />
      ))}

      {/* Gap zone (red fill for low scores) */}
      <polygon
        points={points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(255,0,64,0.08)" stroke="rgba(255,0,64,0.4)" strokeWidth="1.5"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4"
            fill={gapScoreColor(avgByCategory[i])} opacity={0.8} />
          <circle cx={p.x} cy={p.y} r="7"
            fill="none" stroke={gapScoreColor(avgByCategory[i])} strokeWidth="0.5" opacity={0.4} />
        </g>
      ))}

      {/* Labels */}
      {categories.map((cat, i) => {
        const labelR = maxR + 22;
        const lx = cx + labelR * Math.cos(angles[i]);
        const ly = cy + labelR * Math.sin(angles[i]);
        const meta = CATEGORY_META[cat];
        return (
          <text key={cat} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="central"
            fill={meta.color} fontSize="9" fontWeight="600" fontFamily="monospace">
            {meta.label}
          </text>
        );
      })}

      {/* Center score */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e8e8f0" fontSize="14" fontWeight="700" fontFamily="monospace">
        {Math.round(avgByCategory.reduce((a, b) => a + b, 0) / avgByCategory.length)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#8888aa" fontSize="7" fontFamily="monospace">
        AVG COVERAGE
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   TREND SPARKLINE (SVG)
   ═══════════════════════════════════════════════════════════ */

function TrendSparkline({ data, color = '#00ffff' }: { data: TrendPoint[]; color?: string }) {
  const w = 200, h = 48, padX = 4, padY = 6;
  const maxScore = Math.max(...data.map(d => d.score), 1);

  const pts = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * (w - padX * 2),
    y: padY + (1 - d.score / maxScore) * (h - padY * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${h - padY} L${pts[0].x},${h - padY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} opacity={i === pts.length - 1 ? 1 : 0.5} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE GAP DETECTION — Main Export
   ═══════════════════════════════════════════════════════════ */

export function KnowledgeGap() {
  const { memories } = useMemoryStore();
  const [selectedCategory, setSelectedCategory] = useState<GapCategory | 'all'>('all');
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [researching, setResearching] = useState<string | null>(null);

  const filteredGaps = useMemo(() => {
    if (selectedCategory === 'all') return MOCK_GAPS;
    return MOCK_GAPS.filter(g => g.category === selectedCategory);
  }, [selectedCategory]);

  const overallScore = useMemo(() => {
    if (MOCK_GAPS.length === 0) return 0;
    return Math.round(MOCK_GAPS.reduce((s, g) => s + g.gapScore, 0) / MOCK_GAPS.length);
  }, []);

  const criticalGaps = useMemo(() => MOCK_GAPS.filter(g => g.gapScore < 25).length, []);
  const totalMisses = useMemo(() => MOCK_GAPS.reduce((s, g) => s + g.missCount, 0), []);

  const handleResearchNow = useCallback((actionId: string, gapTopic: string) => {
    setResearching(actionId);
    setTimeout(() => {
      setResearching(null);
      // In production, this would create a Hermes task via API
    }, 2000);
  }, []);

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Search size={16} className="text-[#00ffff]" />
          Knowledge Gap Detection
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ backgroundColor: criticalGaps > 0 ? '#ff0040' : '#00ff88' }} />
          <span className="text-[10px] font-mono" style={{ color: criticalGaps > 0 ? '#ff0040' : '#00ff88' }}>
            {criticalGaps} CRITICAL GAP{criticalGaps !== 1 ? 'S' : ''}
          </span>
        </div>
      </div>

      {/* ─── Top Metrics ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Coverage Score', value: `${overallScore}%`, color: gapScoreColor(overallScore), icon: Target },
          { label: 'Critical Gaps', value: String(criticalGaps), color: '#ff0040', icon: AlertTriangle },
          { label: 'Total Misses', value: String(totalMisses), color: '#E8751A', icon: Eye },
          { label: 'Memory Entries', value: String(memories.length), color: '#2E86AB', icon: BookOpen },
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
          </motion.div>
        ))}
      </div>

      {/* ─── Radar + Trend Chart ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Shield size={12} className="text-[#00ffff]" /> Knowledge Coverage Radar
          </h3>
          <RadarChart gaps={MOCK_GAPS} />
          <div className="flex justify-center gap-4 mt-2">
            {(['technical', 'business', 'personal', 'projects'] as GapCategory[]).map(cat => {
              const meta = CATEGORY_META[cat];
              const catGaps = MOCK_GAPS.filter(g => g.category === cat);
              const avg = catGaps.length > 0 ? Math.round(catGaps.reduce((s, g) => s + g.gapScore, 0) / catGaps.length) : 0;
              return (
                <div key={cat} className="text-center">
                  <div className="text-[9px] font-mono font-bold" style={{ color: gapScoreColor(avg) }}>{avg}%</div>
                  <div className="text-[8px]" style={{ color: meta.color }}>{meta.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Trend Chart */}
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-[#00ff88]" /> Knowledge Growth Trend
          </h3>
          <TrendSparkline data={TREND_DATA} color="#00ff88" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] text-[#8888aa]">8-week trajectory</span>
            <span className="text-[9px] font-mono text-[#00ff88]">
              +{TREND_DATA[TREND_DATA.length - 1].score - TREND_DATA[0].score}% growth
            </span>
          </div>

          {/* Auto-detection banner */}
          <div className="mt-3 rounded-lg border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.04)] p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={10} className="text-[#00ffff]" />
              <span className="text-[9px] text-[#00ffff] font-semibold uppercase tracking-wider">Auto-Detection</span>
            </div>
            <p className="text-[9px] text-[#8888aa] leading-relaxed">
              {totalMisses} queries returned no memory matches in the last 7 days. Gaps are auto-detected from failed lookups.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ─── Category Filter ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setSelectedCategory('all')}
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
          style={{
            borderColor: selectedCategory === 'all' ? 'rgba(157,78,221,0.4)' : 'rgba(157,78,221,0.1)',
            background: selectedCategory === 'all' ? 'rgba(157,78,221,0.12)' : 'transparent',
            color: selectedCategory === 'all' ? '#c084fc' : '#8888aa',
          }}>
          All ({MOCK_GAPS.length})
        </button>
        {(['technical', 'business', 'personal', 'projects'] as GapCategory[]).map(cat => {
          const meta = CATEGORY_META[cat];
          const count = MOCK_GAPS.filter(g => g.category === cat).length;
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
              style={{
                borderColor: selectedCategory === cat ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                background: selectedCategory === cat ? `${meta.color}12` : 'transparent',
                color: selectedCategory === cat ? meta.color : '#8888aa',
              }}>
              <meta.icon size={10} />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ─── Gap Cards ─── */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredGaps.sort((a, b) => a.gapScore - b.gapScore).map((gap, idx) => {
            const isExpanded = expandedGap === gap.id;
            const meta = CATEGORY_META[gap.category];
            const TrendIcon = trendIcon(gap.trend);
            const scoreColor = gapScoreColor(gap.gapScore);
            const isResearching = researching !== null && gap.researchActions.some(a => a.id === researching);

            return (
              <motion.div key={gap.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
                style={{
                  borderColor: gap.gapScore < 25 ? 'rgba(255,0,64,0.25)' : 'rgba(157,78,221,0.15)',
                  boxShadow: gap.gapScore < 25 ? '0 0 20px rgba(255,0,64,0.06)' : 'none',
                }}>
                {/* Gap header */}
                <button onClick={() => setExpandedGap(isExpanded ? null : gap.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[rgba(157,78,221,0.04)] transition-colors text-left">
                  {/* Gap score ring */}
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(10,10,26,0.8)" strokeWidth="3" />
                      <motion.circle cx="24" cy="24" r="20" fill="none"
                        stroke={scoreColor} strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${(gap.gapScore / 100) * 125.6} 125.6`}
                        initial={{ strokeDasharray: '0 125.6' }}
                        animate={{ strokeDasharray: `${(gap.gapScore / 100) * 125.6} 125.6` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold" style={{ color: scoreColor }}>{gap.gapScore}</span>
                    </div>
                  </div>

                  {/* Gap info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-xs font-semibold truncate">{gap.topic}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{ backgroundColor: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#8888aa] truncate">{gap.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] flex items-center gap-1" style={{ color: trendColor(gap.trend) }}>
                        <TrendIcon size={8} /> {gap.trend}
                      </span>
                      <span className="text-[8px] text-[#8888aa] flex items-center gap-1">
                        <Clock size={7} /> {gap.lastQueried}
                      </span>
                      <span className="text-[8px] font-mono" style={{ color: '#ff004088' }}>
                        {gap.missCount} misses
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-[#8888aa] flex-shrink-0 transition-transform"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                </button>

                {/* Expanded research actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="px-4 pb-4">
                      <div className="pt-2 border-t border-[rgba(157,78,221,0.08)]">
                        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Zap size={9} className="text-[#FFB627]" /> Suggested Research Actions
                        </div>
                        <div className="space-y-2">
                          {gap.researchActions.map(action => {
                            const prioColor = PRIORITY_COLORS[action.priority];
                            const isThisResearching = researching === action.id;
                            return (
                              <motion.div key={action.id}
                                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
                                <div className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: prioColor }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] text-white font-medium">{action.title}</span>
                                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                                        style={{ backgroundColor: `${prioColor}15`, color: prioColor, border: `1px solid ${prioColor}30` }}>
                                        {action.priority}
                                      </span>
                                      <span className="text-[8px] text-[#8888aa] font-mono">~{action.estimatedTime}</span>
                                    </div>
                                    <p className="text-[9px] text-[#8888aa] leading-relaxed">{action.description}</p>
                                  </div>
                                  <button
                                    onClick={() => handleResearchNow(action.id, gap.topic)}
                                    disabled={isThisResearching}
                                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 border"
                                    style={{
                                      background: 'linear-gradient(135deg, rgba(0,255,255,0.08), rgba(157,78,221,0.08))',
                                      borderColor: 'rgba(0,255,255,0.2)',
                                      color: '#00ffff',
                                    }}>
                                    {isThisResearching ? (
                                      <>
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                          <Zap size={9} />
                                        </motion.div>
                                        Researching...
                                      </>
                                    ) : (
                                      <>
                                        <ArrowUpRight size={9} /> Research Now
                                      </>
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
