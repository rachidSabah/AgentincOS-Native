'use client';

import { useMemoryStore, type MemoryNode, type MemoryType } from '@/lib/memory-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer, Heart, Pin, TrendingDown, ArrowUp, Clock,
  Shield, Sparkles, Flame, Snowflake, Zap, Eye,
  Activity, BarChart3, AlertTriangle, ChevronRight,
  CheckCircle, XCircle, Settings, Gauge,
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface DecayConfig {
  type: MemoryType;
  label: string;
  halfLife: string;
  halfLifeHours: number;
  color: string;
  icon: typeof Timer;
}

interface DecayingMemory {
  memory: MemoryNode;
  currentStrength: number;
  hoursSinceAccess: number;
  willFadeIn: string | null;
  promoted: boolean;
  pinned: boolean;
}

interface DecayParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  speed: number;
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & MOCK
   ═══════════════════════════════════════════════════════════ */

const DECAY_CONFIGS: DecayConfig[] = [
  { type: 'short-term', label: 'Short-Term', halfLife: '1 hour', halfLifeHours: 1, color: '#5BC0EB', icon: Timer },
  { type: 'context', label: 'Context', halfLife: '24 hours', halfLifeHours: 24, color: '#FFB627', icon: Clock },
  { type: 'episodic', label: 'Episodic', halfLife: '7 days', halfLifeHours: 168, color: '#E63946', icon: Activity },
  { type: 'semantic', label: 'Semantic', halfLife: '30 days', halfLifeHours: 720, color: '#7B2CBF', icon: BarChart3 },
  { type: 'long-term', label: 'Long-Term', halfLife: 'Never', halfLifeHours: Infinity, color: '#2E86AB', icon: Shield },
  { type: 'conversation', label: 'Conversation', halfLife: '6 hours', halfLifeHours: 6, color: '#D62828', icon: Flame },
  { type: 'project', label: 'Project', halfLife: '14 days', halfLifeHours: 336, color: '#E8751A', icon: Zap },
  { type: 'user', label: 'User', halfLife: 'Never', halfLifeHours: Infinity, color: '#1B998B', icon: Heart },
  { type: 'team', label: 'Team', halfLife: '30 days', halfLifeHours: 720, color: '#FF8C42', icon: Eye },
];

function getConfig(type: MemoryType): DecayConfig {
  return DECAY_CONFIGS.find(c => c.type === type) || DECAY_CONFIGS[4];
}

function calculateDecay(memory: MemoryNode, now: number): DecayingMemory {
  const config = getConfig(memory.type);
  const hoursSinceAccess = Math.max(0, (now - memory.lastReferencedAt) / 3600000);
  const pinned = memory.importance >= 0.9;
  const promoted = memory.accessCount > 50 && memory.type === 'short-term';

  let currentStrength: number;
  if (pinned || config.halfLifeHours === Infinity) {
    currentStrength = 1.0;
  } else if (promoted) {
    currentStrength = Math.max(0.7, Math.pow(0.5, hoursSinceAccess / (config.halfLifeHours * 3)));
  } else {
    currentStrength = Math.pow(0.5, hoursSinceAccess / config.halfLifeHours);
  }

  let willFadeIn: string | null = null;
  if (!pinned && config.halfLifeHours !== Infinity && currentStrength > 0.1) {
    const hoursToFade = config.halfLifeHours * Math.log(0.1 / currentStrength) / Math.log(0.5);
    if (hoursToFade < 720) {
      if (hoursToFade < 24) willFadeIn = `${Math.round(hoursToFade)}h`;
      else willFadeIn = `${Math.round(hoursToFade / 24)}d`;
    }
  }

  return { memory, currentStrength, hoursSinceAccess, willFadeIn, promoted, pinned };
}

/* ═══════════════════════════════════════════════════════════
   DECAY CURVE SVG
   ═══════════════════════════════════════════════════════════ */

function DecayCurve({ halfLifeHours, color, label }: { halfLifeHours: number; color: string; label: string }) {
  const w = 280, h = 80, padX = 8, padY = 8;
  const maxHours = halfLifeHours === Infinity ? 720 : Math.min(halfLifeHours * 5, 720);
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= 50; i++) {
    const t = (i / 50) * maxHours;
    const strength = halfLifeHours === Infinity ? 1.0 : Math.pow(0.5, t / halfLifeHours);
    points.push({
      x: padX + (i / 50) * (w - padX * 2),
      y: padY + (1 - strength) * (h - padY * 2),
    });
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - padY} L${points[0].x},${h - padY} Z`;

  // Half-life marker
  const hlIdx = halfLifeHours === Infinity ? -1 : Math.round((halfLifeHours / maxHours) * 50);
  const hlPoint = hlIdx >= 0 && hlIdx <= 50 ? points[hlIdx] : null;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
      <defs>
        <linearGradient id={`decay-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#decay-grad-${label})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.8} />
      {hlPoint && (
        <>
          <line x1={hlPoint.x} y1={padY} x2={hlPoint.x} y2={h - padY}
            stroke={color} strokeWidth="0.5" strokeDasharray="3,3" opacity={0.4} />
          <circle cx={hlPoint.x} cy={hlPoint.y} r="3" fill={color} />
          <text x={hlPoint.x} y={h - 1} textAnchor="middle" fill={color} fontSize="7" fontFamily="monospace">
            50%
          </text>
        </>
      )}
      {/* Y-axis labels */}
      <text x={padX} y={padY + 4} fill="#8888aa" fontSize="6" fontFamily="monospace">100%</text>
      <text x={padX} y={h - padY} fill="#8888aa" fontSize="6" fontFamily="monospace">0%</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   DECAY PARTICLES (animated background)
   ═══════════════════════════════════════════════════════════ */

function DecayParticles({ count = 20 }: { count?: number }) {
  const [particles, setParticles] = useState<DecayParticle[]>([]);

  useEffect(() => {
    const p: DecayParticle[] = Array.from({ length: count }, (_, i) => ({
      id: `p-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.3 + 0.1,
      color: ['#9d4edd', '#00ffff', '#ff0040', '#00ff88'][Math.floor(Math.random() * 4)],
      speed: Math.random() * 0.5 + 0.2,
    }));
    setParticles(p);
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, -10, -40],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.5, 0],
          }}
          transition={{
            duration: 6 / p.speed,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MEMORY DECAY & PRIORITIZATION — Main Export
   ═══════════════════════════════════════════════════════════ */

export function MemoryDecay() {
  const { memories, updateMemory } = useMemoryStore();
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');
  const [simulationRange, setSimulationRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [showConfig, setShowConfig] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    new Set(memories.filter(m => m.importance >= 0.9).map(m => m.id))
  );

  const now = useMemo(() => Date.now(), []);

  const decayingMemories = useMemo(() => {
    return memories
      .map(m => calculateDecay(m, now))
      .sort((a, b) => a.currentStrength - b.currentStrength);
  }, [memories, now]);

  const filteredMemories = useMemo(() => {
    if (selectedType === 'all') return decayingMemories;
    return decayingMemories.filter(dm => dm.memory.type === selectedType);
  }, [decayingMemories, selectedType]);

  const healthScore = useMemo(() => {
    if (decayingMemories.length === 0) return 100;
    const avg = decayingMemories.reduce((s, dm) => s + dm.currentStrength, 0) / decayingMemories.length;
    return Math.round(avg * 100);
  }, [decayingMemories]);

  const fadingCount = useMemo(() => {
    const rangeHours = simulationRange === '24h' ? 24 : simulationRange === '7d' ? 168 : 720;
    return decayingMemories.filter(dm => {
      if (dm.pinned) return false;
      const config = getConfig(dm.memory.type);
      if (config.halfLifeHours === Infinity) return false;
      const futureStrength = Math.pow(0.5, (dm.hoursSinceAccess + rangeHours) / config.halfLifeHours);
      return futureStrength < 0.1;
    }).length;
  }, [decayingMemories, simulationRange]);

  const criticalMemories = useMemo(() => decayingMemories.filter(dm => dm.pinned), [decayingMemories]);
  const promotedCount = useMemo(() => decayingMemories.filter(dm => dm.promoted).length, [decayingMemories]);

  const healthColor = useMemo(() => {
    if (healthScore >= 80) return '#00ff88';
    if (healthScore >= 50) return '#FFB627';
    return '#ff0040';
  }, [healthScore]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4 relative">
      <DecayParticles count={15} />

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Timer size={16} className="text-[#9d4edd]" />
          Memory Decay & Prioritization
        </h2>
        <button onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border border-[rgba(157,78,221,0.2)] bg-[rgba(157,78,221,0.08)] text-[#c084fc]">
          <Settings size={10} /> Config
        </button>
      </div>

      {/* ─── Health Score + Top Metrics ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        {/* Health Score */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-4 col-span-2 sm:col-span-1"
          style={{ borderColor: `${healthColor}25`, background: `${healthColor}06` }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Heart size={11} style={{ color: healthColor }} />
            <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Health Score</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-mono font-bold" style={{ color: healthColor }}>{healthScore}</span>
            <span className="text-[10px] text-[#8888aa] mb-1">/ 100</span>
          </div>
          <div className="mt-2 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: healthColor }}
              initial={{ width: 0 }} animate={{ width: `${healthScore}%` }} transition={{ duration: 0.8 }} />
          </div>
        </motion.div>

        {[
          { label: 'Fading Soon', value: String(fadingCount), color: '#E8751A', icon: TrendingDown, sub: `in ${simulationRange}` },
          { label: 'Auto-Promoted', value: String(promotedCount), color: '#00ff88', icon: ArrowUp, sub: 'short → long' },
          { label: 'Pinned', value: String(criticalMemories.length), color: '#9d4edd', icon: Pin, sub: 'never decay' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.05 }}
            className="rounded-xl border p-4"
            style={{ borderColor: `${m.color}25`, background: `${m.color}06` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <m.icon size={11} style={{ color: m.color }} />
              <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{m.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[8px] text-[#8888aa] mt-0.5">{m.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ─── Decay Rate Config (collapsible) ─── */}
      <AnimatePresence>
        {showConfig && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden relative z-10">
            <div className="p-4 space-y-3">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
                <Gauge size={12} className="text-[#FFB627]" /> Decay Rate Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DECAY_CONFIGS.filter(c => c.halfLifeHours !== Infinity).map(config => (
                  <div key={config.type} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <config.icon size={10} style={{ color: config.color }} />
                      <span className="text-[10px] text-white font-medium">{config.label}</span>
                    </div>
                    <DecayCurve halfLifeHours={config.halfLifeHours} color={config.color} label={config.type} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[8px] text-[#8888aa]">Half-life</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: config.color }}>{config.halfLife}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Never-decay types */}
              <div className="flex items-center gap-3 pt-2 border-t border-[rgba(157,78,221,0.08)]">
                <Snowflake size={10} className="text-[#2E86AB]" />
                <span className="text-[9px] text-[#8888aa]">Never decay: </span>
                {DECAY_CONFIGS.filter(c => c.halfLifeHours === Infinity).map(config => (
                  <span key={config.type} className="text-[9px] font-mono font-bold flex items-center gap-1"
                    style={{ color: config.color }}>
                    <config.icon size={8} /> {config.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Decay Simulation Controls ─── */}
      <div className="flex items-center gap-3 relative z-10">
        <span className="text-[9px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={9} className="text-[#FFB627]" /> Simulate fade:
        </span>
        {(['24h', '7d', '30d'] as const).map(range => (
          <button key={range} onClick={() => setSimulationRange(range)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
            style={{
              borderColor: simulationRange === range ? 'rgba(255,182,39,0.4)' : 'rgba(157,78,221,0.1)',
              background: simulationRange === range ? 'rgba(255,182,39,0.1)' : 'transparent',
              color: simulationRange === range ? '#FFB627' : '#8888aa',
            }}>
            {range}
          </button>
        ))}
        <span className="text-[9px] font-mono text-[#E8751A] ml-1">
          {fadingCount} memories will fade
        </span>
      </div>

      {/* ─── Critical / Pinned Memories ─── */}
      {criticalMemories.length > 0 && (
        <motion.div className="rounded-xl border border-[rgba(157,78,221,0.2)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 relative z-10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
            <Pin size={12} className="text-[#9d4edd]" /> Critical Memories
            <span className="text-[8px] text-[#8888aa] font-normal ml-1">— pinned, never decay</span>
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {criticalMemories.map((dm, i) => {
              const config = getConfig(dm.memory.type);
              return (
                <motion.div key={dm.memory.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0 w-52 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(10,10,26,0.5)] p-3 relative">
                  <div className="absolute top-2 right-2">
                    <Pin size={9} style={{ color: '#9d4edd' }} />
                  </div>
                  <div className="text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-block mb-1.5"
                    style={{ backgroundColor: `${config.color}15`, color: config.color, border: `1px solid ${config.color}30` }}>
                    {config.label}
                  </div>
                  <p className="text-[10px] text-white font-medium truncate">{dm.memory.title}</p>
                  <p className="text-[8px] text-[#8888aa] mt-1 line-clamp-2">{dm.memory.summary}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] font-mono text-[#00ff88]">STR: 100%</span>
                    <span className="text-[8px] font-mono text-[#8888aa]">{dm.memory.accessCount} accesses</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Type Filter ─── */}
      <div className="flex items-center gap-2 flex-wrap relative z-10">
        <button onClick={() => setSelectedType('all')}
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
          style={{
            borderColor: selectedType === 'all' ? 'rgba(157,78,221,0.4)' : 'rgba(157,78,221,0.1)',
            background: selectedType === 'all' ? 'rgba(157,78,221,0.12)' : 'transparent',
            color: selectedType === 'all' ? '#c084fc' : '#8888aa',
          }}>
          All ({decayingMemories.length})
        </button>
        {DECAY_CONFIGS.map(config => {
          const count = decayingMemories.filter(dm => dm.memory.type === config.type).length;
          if (count === 0) return null;
          return (
            <button key={config.type} onClick={() => setSelectedType(config.type)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
              style={{
                borderColor: selectedType === config.type ? `${config.color}40` : 'rgba(157,78,221,0.1)',
                background: selectedType === config.type ? `${config.color}12` : 'transparent',
                color: selectedType === config.type ? config.color : '#8888aa',
              }}>
              <config.icon size={9} /> {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ─── Memory Decay Timeline ─── */}
      <div className="space-y-1.5 relative z-10 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredMemories.map((dm, idx) => {
            const config = getConfig(dm.memory.type);
            const strengthPct = Math.round(dm.currentStrength * 100);
            const strengthColor = dm.currentStrength > 0.7 ? '#00ff88' : dm.currentStrength > 0.3 ? '#FFB627' : dm.currentStrength > 0.1 ? '#E8751A' : '#ff0040';
            const isPinned = pinnedIds.has(dm.memory.id);
            const isPromoted = dm.promoted;

            return (
              <motion.div key={dm.memory.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-lg border bg-[rgba(18,18,42,0.5)] backdrop-blur-sm p-3"
                style={{
                  borderColor: dm.currentStrength < 0.2 ? 'rgba(255,0,64,0.2)' : 'rgba(157,78,221,0.1)',
                  opacity: Math.max(0.4, dm.currentStrength),
                }}>
                <div className="flex items-center gap-3">
                  {/* Strength indicator */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(10,10,26,0.8)" strokeWidth="2.5" />
                      <motion.circle cx="20" cy="20" r="16" fill="none"
                        stroke={strengthColor} strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray={`${strengthPct * 1.005} 100.5`}
                        initial={{ strokeDasharray: '0 100.5' }}
                        animate={{ strokeDasharray: `${strengthPct * 1.005} 100.5` }}
                        transition={{ duration: 0.6, delay: idx * 0.03 }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-mono font-bold" style={{ color: strengthColor }}>{strengthPct}</span>
                    </div>
                  </div>

                  {/* Memory info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] text-white font-medium truncate">{dm.memory.title}</span>
                      {isPinned && <Pin size={8} className="text-[#9d4edd] flex-shrink-0" />}
                      {isPromoted && (
                        <span className="text-[7px] px-1 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] text-[#00ff88] font-bold border border-[rgba(0,255,136,0.2)]">
                          PROMOTED
                        </span>
                      )}
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                        style={{ backgroundColor: `${config.color}12`, color: config.color, border: `1px solid ${config.color}30` }}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[8px] text-[#8888aa] truncate">{dm.memory.summary}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] font-mono text-[#8888aa]">
                        {dm.hoursSinceAccess < 1 ? `${Math.round(dm.hoursSinceAccess * 60)}m ago` : `${Math.round(dm.hoursSinceAccess)}h ago`}
                      </span>
                      <span className="text-[8px] font-mono" style={{ color: config.color }}>
                        half-life: {config.halfLife}
                      </span>
                      {dm.willFadeIn && (
                        <span className="text-[8px] font-mono text-[#ff0040] flex items-center gap-0.5">
                          <AlertTriangle size={6} /> fades in {dm.willFadeIn}
                        </span>
                      )}
                      <span className="text-[8px] font-mono text-[#8888aa]">{dm.memory.accessCount} accesses</span>
                    </div>
                  </div>

                  {/* Pin toggle */}
                  <button onClick={() => togglePin(dm.memory.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
                    style={{
                      borderColor: isPinned ? 'rgba(157,78,221,0.4)' : 'rgba(157,78,221,0.1)',
                      background: isPinned ? 'rgba(157,78,221,0.15)' : 'transparent',
                      color: isPinned ? '#c084fc' : '#8888aa',
                    }}
                    title={isPinned ? 'Unpin memory' : 'Pin memory (never decay)'}>
                    <Pin size={10} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ─── Auto-Promotion Rules ─── */}
      <motion.div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 relative z-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <ArrowUp size={12} className="text-[#00ff88]" /> Auto-Promotion Rules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { rule: 'Access Count > 50', from: 'Short-Term', to: 'Long-Term', color: '#00ff88', active: true },
            { rule: 'Referenced by 3+ agents', from: 'Context', to: 'Semantic', color: '#FFB627', active: true },
            { rule: 'Importance Score > 0.9', from: 'Any', to: 'Pinned', color: '#9d4edd', active: true },
          ].map((r, i) => (
            <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5 flex items-center gap-2">
              <CheckCircle size={10} style={{ color: r.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-white font-medium">{r.rule}</div>
                <div className="text-[8px] text-[#8888aa] font-mono">
                  {r.from} → {r.to}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
