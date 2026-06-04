'use client';

import { useMemoryStore, type MemoryNode } from '@/lib/memory-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Brain, Sparkles, Activity, Database, Zap,
  ArrowRight, RefreshCw, CheckCircle, Layers,
  CircleDot, Timer, HardDrive, TrendingUp, Play, Square,
  ChevronDown, ChevronUp, Cpu,
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

type DreamPhase = 'compress' | 'reorganize' | 'extract' | 'strengthen';

const PHASE_META: Record<DreamPhase, { color: string; icon: typeof Brain; label: string; desc: string }> = {
  compress: { color: '#00ffff', icon: Layers, label: 'Compress', desc: 'Compressing redundant memories into compact representations' },
  reorganize: { color: '#7B2CBF', icon: RefreshCw, label: 'Reorganize', desc: 'Reorganizing memory graph for optimal retrieval paths' },
  extract: { color: '#00ff88', icon: Sparkles, label: 'Extract', desc: 'Extracting new patterns and connections from memory clusters' },
  strengthen: { color: '#FFB627', icon: TrendingUp, label: 'Strengthen', desc: 'Strengthening high-value memories and pruning weak ones' },
};

/* ─── Mock Data ─── */
interface DreamMemory {
  id: string;
  title: string;
  agent: string;
  phase: DreamPhase;
  progress: number;
}

interface DreamStats {
  memoriesConsolidated: number;
  spaceSaved: number;
  connectionsStrengthened: number;
  cyclesCompleted: number;
  avgCycleTime: number;
}

const MOCK_QUEUE: DreamMemory[] = [
  { id: 'dq1', title: 'Hermes Configuration Architecture', agent: 'hermes', phase: 'compress', progress: 87 },
  { id: 'dq2', title: 'Agent OS v2.0 Launch Plan', agent: 'claude', phase: 'reorganize', progress: 62 },
  { id: 'dq3', title: 'MCP Integration Breakthrough', agent: 'hermes', phase: 'extract', progress: 45 },
  { id: 'dq4', title: 'Compound Knowledge Effect', agent: 'vault', phase: 'strengthen', progress: 91 },
  { id: 'dq5', title: 'User Work Preferences', agent: 'vault', phase: 'compress', progress: 33 },
  { id: 'dq6', title: 'Current Sprint Tasks', agent: 'openclaw', phase: 'reorganize', progress: 18 },
  { id: 'dq7', title: 'OpenClaw Session Management', agent: 'openclaw', phase: 'extract', progress: 56 },
  { id: 'dq8', title: 'Vault Structure and Organization', agent: 'vault', phase: 'strengthen', progress: 74 },
];

/* ═══════════════════════════════════════════════════════════
   BRAIN PULSE ANIMATION
   ═══════════════════════════════════════════════════════════ */
function BrainPulse({ active, phase }: { active: boolean; phase: DreamPhase }) {
  const meta = PHASE_META[phase];
  return (
    <div className="relative w-full h-48 flex items-center justify-center overflow-hidden">
      {/* Outer rings */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: `${meta.color}20` }}
          animate={active ? {
            scale: [1, 1.2 + i * 0.15, 1],
            opacity: [0.3, 0.6, 0.3],
          } : { scale: 1, opacity: 0.15 }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          <div className="w-32 h-32" />
        </motion.div>
      ))}

      {/* Central brain */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${meta.color}30, ${meta.color}08)`,
          border: `2px solid ${meta.color}40`,
          boxShadow: active ? `0 0 30px ${meta.color}30, 0 0 60px ${meta.color}15` : 'none',
        }}
        animate={active ? {
          scale: [1, 1.08, 1],
          boxShadow: [
            `0 0 20px ${meta.color}20, 0 0 40px ${meta.color}10`,
            `0 0 40px ${meta.color}40, 0 0 80px ${meta.color}20`,
            `0 0 20px ${meta.color}20, 0 0 40px ${meta.color}10`,
          ],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Brain size={32} style={{ color: meta.color }} />
      </motion.div>

      {/* Neural particles — deterministic positions to avoid hydration mismatch */}
      {active && Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 50 + ((i * 7 + 13) % 30); // deterministic pseudo-random
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: meta.color }}
            animate={{
              x: [Math.cos(angle) * 40, Math.cos(angle) * radius, Math.cos(angle) * 40],
              y: [Math.sin(angle) * 40, Math.sin(angle) * radius, Math.sin(angle) * 40],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 2 + (i * 0.3 + 0.5), // deterministic duration
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.15,
            }}
          />
        );
      })}

      {/* Phase label */}
      <motion.div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONSOLIDATION PIPELINE VISUALIZATION
   ═══════════════════════════════════════════════════════════ */
function ConsolidationPipeline({ active, currentPhase }: { active: boolean; currentPhase: DreamPhase }) {
  const phases: DreamPhase[] = ['compress', 'reorganize', 'extract', 'strengthen'];
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1">
      {phases.map((phase, i) => {
        const meta = PHASE_META[phase];
        const isActive = active && i === currentIndex;
        const isComplete = active && i < currentIndex;
        const isPast = isComplete;

        return (
          <div key={phase} className="flex items-center gap-1 flex-1">
            <motion.div
              className="flex-1 rounded-lg p-2 border text-center relative overflow-hidden"
              style={{
                borderColor: isActive ? `${meta.color}50` : isPast ? `${meta.color}30` : 'rgba(157,78,221,0.1)',
                background: isActive ? `${meta.color}08` : isPast ? `${meta.color}04` : 'rgba(18,18,42,0.4)',
              }}
              animate={isActive ? {
                boxShadow: [`0 0 8px ${meta.color}10`, `0 0 16px ${meta.color}25`, `0 0 8px ${meta.color}10`],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {/* Animated scan line for active phase */}
              {isActive && (
                <motion.div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(180deg, transparent, ${meta.color}08, transparent)` }}
                  animate={{ y: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <div className="relative z-10">
                <meta.icon size={14} className="mx-auto mb-1" style={{ color: isPast ? meta.color : isActive ? meta.color : '#8888aa' }} />
                <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: isPast ? meta.color : isActive ? meta.color : '#8888aa' }}>
                  {meta.label}
                </div>
                {isPast && <CheckCircle size={8} className="mx-auto mt-0.5" style={{ color: meta.color }} />}
                {isActive && (
                  <motion.div
                    className="mx-auto mt-0.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: meta.color }}
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>
            {i < phases.length - 1 && (
              <ArrowRight size={10} style={{ color: isPast ? meta.color : '#8888aa' }} className="flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DREAM MODE — Main Export
   ═══════════════════════════════════════════════════════════ */
export function DreamMode() {
  const { memories } = useMemoryStore();

  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<DreamPhase>('compress');
  const [cycleProgress, setCycleProgress] = useState(0);
  const [queue, setQueue] = useState<DreamMemory[]>(MOCK_QUEUE);
  const [stats, setStats] = useState<DreamStats>({
    memoriesConsolidated: 847,
    spaceSaved: 2.4,
    connectionsStrengthened: 342,
    cyclesCompleted: 28,
    avgCycleTime: 12.5,
  });
  const [showHistory, setShowHistory] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  // Phase cycling simulation
  useEffect(() => {
    if (!isActive) return;

    const phases: DreamPhase[] = ['compress', 'reorganize', 'extract', 'strengthen'];
    let phaseIdx = phases.indexOf(currentPhase);
    let progress = cycleProgress;

    const interval = setInterval(() => {
      progress += 2;
      if (progress >= 100) {
        progress = 0;
        phaseIdx = (phaseIdx + 1) % phases.length;
        setCurrentPhase(phases[phaseIdx]);

        if (phaseIdx === 0) {
          setCycleCount(c => c + 1);
          setStats(s => ({
            ...s,
            memoriesConsolidated: s.memoriesConsolidated + Math.floor(Math.random() * 5) + 2,
            connectionsStrengthened: s.connectionsStrengthened + Math.floor(Math.random() * 3) + 1,
            cyclesCompleted: s.cyclesCompleted + 1,
            spaceSaved: +(s.spaceSaved + Math.random() * 0.1).toFixed(1),
          }));

          // Move queue items
          setQueue(q => {
            const first = q[0];
            const rest = q.slice(1);
            return [...rest, { ...first, progress: Math.floor(Math.random() * 40), phase: phases[Math.floor(Math.random() * 4)] }];
          });
        }
      }
      setCycleProgress(progress);

      // Update queue item progress
      setQueue(q => q.map((item, i) => {
        if (i === 0) return { ...item, progress: Math.min(100, item.progress + Math.random() * 3) };
        return item;
      }));
    }, 200);

    return () => clearInterval(interval);
  }, [isActive, currentPhase, cycleProgress]);

  const toggleDream = useCallback(() => {
    setIsActive(prev => !prev);
    if (!isActive) {
      setCycleProgress(0);
      setCurrentPhase('compress');
    }
  }, [isActive]);

  const meta = PHASE_META[currentPhase];

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Moon size={16} className="text-[#7B2CBF]" />
          Dream Mode
          {isActive && (
            <motion.span
              className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Dreaming
            </motion.span>
          )}
        </h2>
        <button
          onClick={toggleDream}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
          style={{
            background: isActive ? 'rgba(230,57,70,0.15)' : 'rgba(123,44,191,0.15)',
            border: `1px solid ${isActive ? 'rgba(230,57,70,0.3)' : 'rgba(123,44,191,0.3)'}`,
            color: isActive ? '#E63946' : '#c084fc',
          }}
        >
          {isActive ? <><Square size={10} /> Stop</> : <><Play size={10} /> Start Dream</>}
        </button>
      </div>

      {/* ─── Brain Pulse Visualization ─── */}
      <motion.div
        className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
        style={{ borderColor: isActive ? `${meta.color}30` : 'rgba(157,78,221,0.1)' }}
        animate={isActive ? { borderColor: [`${meta.color}20`, `${meta.color}40`, `${meta.color}20`] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <BrainPulse active={isActive} phase={currentPhase} />
        <div className="px-4 pb-3">
          <p className="text-[9px] text-center" style={{ color: isActive ? meta.color : '#8888aa' }}>
            {isActive ? meta.desc : 'Dream Mode idle — start consolidation to begin memory processing'}
          </p>
        </div>
      </motion.div>

      {/* ─── Consolidation Pipeline ─── */}
      <motion.div
        className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Cpu size={11} className="text-[#00ffff]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Consolidation Pipeline</span>
          {isActive && (
            <span className="ml-auto text-[9px] font-mono" style={{ color: meta.color }}>
              Cycle {cycleCount + 1} — {Math.round(cycleProgress)}%
            </span>
          )}
        </div>
        <ConsolidationPipeline active={isActive} currentPhase={currentPhase} />

        {/* Cycle progress bar */}
        {isActive && (
          <div className="mt-3">
            <div className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})` }}
                animate={{ width: `${cycleProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── Memory Queue ─── */}
      <motion.div
        className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Database size={11} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Memory Queue</span>
          <span className="ml-auto text-[9px] font-mono text-[#8888aa]">{queue.length} memories</span>
        </div>
        <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
          {queue.map((item, i) => {
            const phaseMeta = PHASE_META[item.phase];
            const agentColor = AGENT_COLORS[item.agent] || '#8888aa';
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border p-2.5 flex items-center gap-2"
                style={{
                  borderColor: isActive && i === 0 ? `${phaseMeta.color}30` : 'rgba(157,78,221,0.08)',
                  background: isActive && i === 0 ? `${phaseMeta.color}05` : 'rgba(10,10,26,0.3)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                  style={{ backgroundColor: `${agentColor}20`, color: agentColor, border: `1px solid ${agentColor}30` }}
                >
                  {(AGENT_NAMES[item.agent] || item.agent)[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white font-medium truncate">{item.title}</span>
                    <span
                      className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
                      style={{ backgroundColor: `${phaseMeta.color}12`, color: phaseMeta.color, border: `1px solid ${phaseMeta.color}25` }}
                    >
                      {phaseMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: phaseMeta.color }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-[8px] font-mono text-[#8888aa] flex-shrink-0">{Math.round(item.progress)}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Consolidated', value: (stats.memoriesConsolidated ?? 0).toLocaleString('en-US'), color: '#00ffff', icon: Database },
          { label: 'Space Saved', value: `${stats.spaceSaved} MB`, color: '#00ff88', icon: HardDrive },
          { label: 'Connections', value: (stats.connectionsStrengthened ?? 0).toLocaleString('en-US'), color: '#FFB627', icon: Activity },
          { label: 'Cycles Done', value: String(stats.cyclesCompleted), color: '#7B2CBF', icon: RefreshCw },
          { label: 'Avg Cycle', value: `${stats.avgCycleTime}s`, color: '#E8751A', icon: Timer },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-3"
            style={{ borderColor: `${s.color}20`, background: `${s.color}05` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={10} style={{ color: s.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-lg" style={{ color: s.color }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Dream Cycle History ─── */}
      <motion.div
        className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 hover:bg-[rgba(157,78,221,0.04)] transition-colors"
        >
          <span className="text-white text-xs font-semibold flex items-center gap-1.5">
            <CircleDot size={12} className="text-[#7B2CBF]" /> Dream Cycle History
          </span>
          {showHistory ? <ChevronUp size={14} className="text-[#8888aa]" /> : <ChevronDown size={14} className="text-[#8888aa]" />}
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4"
            >
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {Array.from({ length: 8 }).map((_, i) => {
                  const phases: DreamPhase[] = ['compress', 'reorganize', 'extract', 'strengthen'];
                  const phase = phases[i % 4];
                  const phaseMeta = PHASE_META[phase];
                  const minutesAgo = (i + 1) * 15;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[rgba(157,78,221,0.06)] transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: phaseMeta.color }} />
                      <span className="text-[10px] text-white font-medium flex-1 min-w-0">
                        Cycle #{stats.cyclesCompleted - i}
                      </span>
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{ backgroundColor: `${phaseMeta.color}12`, color: phaseMeta.color }}
                      >
                        {phaseMeta.label}
                      </span>
                      <span className="text-[9px] text-[#8888aa] font-mono flex-shrink-0">
                        {minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`}
                      </span>
                      <Zap size={9} className="text-[#00ff88] flex-shrink-0" />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
