'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Clock, Flame, TrendingUp, Calendar, Zap,
  Brain, Eye, Target, Activity, ChevronRight, Coffee,
  Sun, Moon, Layers, Users, ArrowUp, ArrowDown, Minus,
  Sparkles, Timer, Award, CheckCircle2, Circle, XCircle,
  Grid3X3, LayoutGrid, PieChart, LineChart,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';

/* ─── Types ─── */
interface HeatmapCell {
  hour: number;
  day: number;
  intensity: number; // 0-1
  agentContributions: Record<string, number>;
  tasksCompleted: number;
  tasksTotal: number;
}

interface PeakHour {
  hour: number;
  label: string;
  avgIntensity: number;
  agent: string;
  agentColor: string;
}

/* ─── Constants ─── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const AGENT_COLORS: Record<string, string> = {
  claude: '#E63946',
  hermes: '#FFB627',
  openclaw: '#E8751A',
  vault: '#2E86AB',
};

/* ─── Seeded PRNG to avoid hydration mismatch ─── */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ─── Generate heatmap data (deterministic via seeded PRNG) ─── */
function generateHeatmapData(): HeatmapCell[][] {
  const rand = seededRandom(42);
  const data: HeatmapCell[][] = [];
  for (let day = 0; day < 7; day++) {
    const row: HeatmapCell[] = [];
    for (let hour = 0; hour < 24; hour++) {
      // Simulate realistic productivity patterns
      let base = 0;
      if (hour >= 9 && hour <= 12) base = 0.7 + rand() * 0.3; // Morning peak
      else if (hour >= 14 && hour <= 17) base = 0.5 + rand() * 0.4; // Afternoon
      else if (hour >= 19 && hour <= 22) base = 0.2 + rand() * 0.3; // Evening
      else if (hour >= 6 && hour <= 8) base = 0.15 + rand() * 0.2; // Early morning
      else base = rand() * 0.1; // Night

      // Weekend reduction
      if (day >= 5) base *= 0.4;

      const intensity = Math.min(1, Math.max(0, base));
      const agentContributions: Record<string, number> = {
        claude: rand() * 0.4,
        hermes: rand() * 0.35,
        openclaw: rand() * 0.25,
        vault: rand() * 0.2,
      };

      const tasksTotal = Math.round(intensity * 12);
      const tasksCompleted = Math.round(tasksTotal * (0.6 + rand() * 0.4));

      row.push({ hour, day, intensity, agentContributions, tasksCompleted, tasksTotal });
    }
    data.push(row);
  }
  return data;
}

const HEATMAP_DATA = generateHeatmapData();

/* ─── Generate week comparison data ─── */
function generateWeekData(label: string, offset: number) {
  return {
    label,
    totalTasks: 147 + offset,
    completedTasks: 132 + Math.round(offset * 0.9),
    focusHours: 28.5 + offset * 0.3,
    avgIntensity: 0.62 + offset * 0.02,
  };
}

const THIS_WEEK = generateWeekData('This Week', 0);
const LAST_WEEK = generateWeekData('Last Week', -8);

/* ─── Peak hours detection ─── */
function detectPeakHours(): PeakHour[] {
  const hourAverages = HOURS.map(hour => {
    let total = 0;
    let topAgent = '';
    let topAgentScore = 0;
    for (let day = 0; day < 7; day++) {
      const cell = HEATMAP_DATA[day][hour];
      total += cell.intensity;
      for (const [agent, score] of Object.entries(cell.agentContributions)) {
        if (score > topAgentScore) { topAgentScore = score; topAgent = agent; }
      }
    }
    return { hour, avgIntensity: total / 7, topAgent };
  });

  hourAverages.sort((a, b) => b.avgIntensity - a.avgIntensity);
  return hourAverages.slice(0, 4).map(h => ({
    hour: h.hour,
    label: `${String(h.hour).padStart(2, '0')}:00`,
    avgIntensity: h.avgIntensity,
    agent: h.topAgent.charAt(0).toUpperCase() + h.topAgent.slice(1),
    agentColor: AGENT_COLORS[h.topAgent] || '#8888aa',
  }));
}

const PEAK_HOURS = detectPeakHours();

/* ─── Helper: get warm gradient color from intensity ─── */
function getHeatColor(intensity: number): string {
  if (intensity < 0.05) return 'rgba(18,18,42,0.6)';
  if (intensity < 0.2) return 'rgba(255,140,66,0.15)';
  if (intensity < 0.4) return 'rgba(255,140,66,0.3)';
  if (intensity < 0.6) return 'rgba(255,107,53,0.45)';
  if (intensity < 0.8) return 'rgba(255,69,58,0.6)';
  return 'rgba(230,57,70,0.8)';
}

function getHeatGlow(intensity: number): string {
  if (intensity < 0.3) return 'none';
  return `0 0 ${intensity * 12}px rgba(255,107,53,${intensity * 0.3})`;
}

/* ═══════════════════════════════════════════════════════════
   WEEKLY HEATMAP
   ═══════════════════════════════════════════════════════════ */
function WeeklyHeatmap() {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [showAgents, setShowAgents] = useState(false);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Grid3X3 size={12} className="text-[#00ffff]" /> Weekly Heatmap
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAgents(!showAgents)}
              className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg border transition-all"
              style={{
                borderColor: showAgents ? 'rgba(0,255,255,0.3)' : 'rgba(157,78,221,0.1)',
                color: showAgents ? '#00ffff' : '#8888aa',
                background: showAgents ? 'rgba(0,255,255,0.06)' : 'transparent',
              }}
            >
              <Users size={9} /> Agents
            </button>
            {/* Color legend */}
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-[#8888aa]">Low</span>
              <div className="flex gap-0.5">
                {[
                  'rgba(18,18,42,0.6)',
                  'rgba(255,140,66,0.15)',
                  'rgba(255,140,66,0.3)',
                  'rgba(255,107,53,0.45)',
                  'rgba(255,69,58,0.6)',
                  'rgba(230,57,70,0.8)',
                ].map((color, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="text-[7px] text-[#8888aa]">High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex items-center mb-1.5 pl-12">
            {HOURS.filter(h => h % 3 === 0).map(h => (
              <div key={h} className="flex-1 text-[7px] text-[#8888aa] font-mono text-center">
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {HEATMAP_DATA.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-1.5">
                <div className="w-10 text-[9px] text-[#8888aa] font-medium text-right pr-1">{DAYS[dayIdx]}</div>
                <div className="flex-1 flex gap-0.5">
                  {row.map((cell) => (
                    <motion.div
                      key={`${cell.day}-${cell.hour}`}
                      className="flex-1 aspect-square rounded-sm cursor-pointer relative group"
                      style={{
                        backgroundColor: getHeatColor(cell.intensity),
                        boxShadow: getHeatGlow(cell.intensity),
                      }}
                      whileHover={{ scale: 1.3, zIndex: 10 }}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {/* Agent contribution bars when toggled */}
                      {showAgents && cell.intensity > 0.1 && (
                        <div className="absolute inset-0.5 flex flex-col gap-px overflow-hidden rounded-sm">
                          {Object.entries(cell.agentContributions).map(([agent, contrib]) => {
                            if (contrib < 0.05) return null;
                            return (
                              <div
                                key={agent}
                                className="w-full rounded-sm"
                                style={{
                                  height: `${contrib * 100}%`,
                                  backgroundColor: `${AGENT_COLORS[agent]}40`,
                                  minHeight: 1,
                                }}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                        <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2.5 py-1.5 shadow-lg">
                          <div className="text-[9px] text-white font-medium">
                            {DAYS[cell.day]} {String(cell.hour).padStart(2, '0')}:00
                          </div>
                          <div className="text-[8px] text-[#8888aa]">
                            Intensity: <span className="text-[#FF8C42]">{(cell.intensity * 100).toFixed(0)}%</span>
                          </div>
                          <div className="text-[8px] text-[#8888aa]">
                            Tasks: <span className="text-[#00ff88]">{cell.tasksCompleted}/{cell.tasksTotal}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PEAK HOURS AUTO-DETECTION
   ═══════════════════════════════════════════════════════════ */
function PeakHoursDetection() {
  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Flame size={12} className="text-[#FF8C42]" /> Peak Hours
        </h3>
      </div>

      <div className="p-4 space-y-2">
        {PEAK_HOURS.map((peak, i) => (
          <motion.div
            key={peak.hour}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-[rgba(157,78,221,0.06)] bg-[rgba(10,10,26,0.2)]"
          >
            <div className="flex items-center gap-1.5">
              <div className="text-[9px] font-mono font-bold text-white w-10">{peak.label}</div>
              {i === 0 && <Flame size={10} className="text-[#FF8C42]" />}
              {i === 1 && <Zap size={10} className="text-[#FFB627]" />}
              {i === 2 && <Sun size={10} className="text-[#00ffff]" />}
              {i === 3 && <Coffee size={10} className="text-[#9d4edd]" />}
            </div>

            {/* Intensity bar */}
            <div className="flex-1 h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, rgba(255,140,66,0.6), rgba(230,57,70,0.8))` }}
                initial={{ width: 0 }}
                animate={{ width: `${peak.avgIntensity * 100}%` }}
                transition={{ duration: 1, delay: i * 0.15 }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono" style={{ color: '#FF8C42' }}>
                {(peak.avgIntensity * 100).toFixed(0)}%
              </span>
              <span className="text-[7px] px-1 py-0.5 rounded border font-bold"
                style={{ borderColor: `${peak.agentColor}30`, color: peak.agentColor, background: `${peak.agentColor}08` }}>
                {peak.agent}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Focus time indicator */}
        <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Timer size={10} className="text-[#00ff88]" />
              <span className="text-[9px] text-[#8888aa]">Peak Focus Window</span>
            </div>
            <span className="text-[10px] text-white font-mono font-bold">
              {PEAK_HOURS[0].label} — {PEAK_HOURS[1].label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT CONTRIBUTION BREAKDOWN
   ═══════════════════════════════════════════════════════════ */
function AgentContribution() {
  const agents = [
    { name: 'Claude', color: '#E63946', hours: 38.2, tasks: 47, pct: 35 },
    { name: 'Hermes', color: '#FFB627', hours: 31.5, tasks: 52, pct: 29 },
    { name: 'OpenClaw', color: '#E8751A', hours: 24.8, tasks: 33, pct: 23 },
    { name: 'Vault', color: '#2E86AB', hours: 13.1, tasks: 15, pct: 13 },
  ];

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Users size={12} className="text-[#FFB627]" /> Agent Contribution
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden">
          {agents.map((agent) => (
            <motion.div
              key={agent.name}
              className="h-full"
              style={{ backgroundColor: `${agent.color}80` }}
              initial={{ width: 0 }}
              animate={{ width: `${agent.pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          ))}
        </div>

        {/* Agent rows */}
        {agents.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold border"
              style={{ borderColor: `${agent.color}30`, background: `${agent.color}12`, color: agent.color }}>
              {agent.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-white font-medium">{agent.name}</span>
                <span className="text-[9px] font-mono" style={{ color: agent.color }}>{agent.pct}%</span>
              </div>
              <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: agent.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-white font-mono">{agent.hours}h</div>
              <div className="text-[7px] text-[#8888aa]">{agent.tasks} tasks</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEEK-OVER-WEEK COMPARISON
   ═══════════════════════════════════════════════════════════ */
function WeekComparison() {
  const metrics = [
    {
      label: 'Tasks Completed',
      thisWeek: THIS_WEEK.completedTasks,
      lastWeek: LAST_WEEK.completedTasks,
      format: (v: number) => String(v),
    },
    {
      label: 'Focus Hours',
      thisWeek: THIS_WEEK.focusHours,
      lastWeek: LAST_WEEK.focusHours,
      format: (v: number) => `${v.toFixed(1)}h`,
    },
    {
      label: 'Avg Intensity',
      thisWeek: THIS_WEEK.avgIntensity,
      lastWeek: LAST_WEEK.avgIntensity,
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    {
      label: 'Total Tasks',
      thisWeek: THIS_WEEK.totalTasks,
      lastWeek: LAST_WEEK.totalTasks,
      format: (v: number) => String(v),
    },
  ];

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <TrendingUp size={12} className="text-[#00ff88]" /> Week vs Week
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(0,255,255,0.2)] bg-[rgba(0,255,255,0.06)] text-[#00ffff] font-mono">This week</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(157,78,221,0.15)] bg-[rgba(157,78,221,0.06)] text-[#8888aa] font-mono">Last week</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {metrics.map((metric, i) => {
          const change = ((metric.thisWeek - metric.lastWeek) / metric.lastWeek) * 100;
          const isUp = change > 0;
          const isNeutral = Math.abs(change) < 1;

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-[rgba(157,78,221,0.06)] bg-[rgba(10,10,26,0.2)]"
            >
              <div className="flex-1">
                <div className="text-[9px] text-[#8888aa] mb-0.5">{metric.label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-white font-mono font-bold">{metric.format(metric.thisWeek)}</span>
                  <span className="text-[9px] text-[#8888aa] font-mono">/ {metric.format(metric.lastWeek)}</span>
                </div>
              </div>

              {/* Change indicator */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{
                  background: isNeutral ? 'rgba(136,136,170,0.1)' : isUp ? 'rgba(0,255,136,0.08)' : 'rgba(230,57,70,0.08)',
                  border: `1px solid ${isNeutral ? 'rgba(136,136,170,0.15)' : isUp ? 'rgba(0,255,136,0.2)' : 'rgba(230,57,70,0.2)'}`,
                }}>
                {isNeutral ? <Minus size={9} className="text-[#8888aa]" /> : isUp ? <ArrowUp size={9} className="text-[#00ff88]" /> : <ArrowDown size={9} className="text-[#E63946]" />}
                <span className={`text-[9px] font-mono font-bold ${isNeutral ? 'text-[#8888aa]' : isUp ? 'text-[#00ff88]' : 'text-[#E63946]'}`}>
                  {isNeutral ? '0' : `${Math.abs(change).toFixed(1)}`}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TASK COMPLETION PATTERNS
   ═══════════════════════════════════════════════════════════ */
function TaskCompletionPatterns() {
  const patterns = [
    { period: 'Morning (6-12)', completed: 42, total: 48, icon: Sun, color: '#FFB627' },
    { period: 'Afternoon (12-18)', completed: 38, total: 45, icon: Coffee, color: '#FF8C42' },
    { period: 'Evening (18-22)', completed: 22, total: 28, icon: Moon, color: '#9d4edd' },
    { period: 'Night (22-6)', completed: 8, total: 12, icon: Moon, color: '#2E86AB' },
  ];

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Target size={12} className="text-[#E8751A]" /> Task Patterns
        </h3>
      </div>

      <div className="p-4 space-y-2.5">
        {patterns.map((pattern, i) => {
          const pct = Math.round((pattern.completed / pattern.total) * 100);
          return (
            <motion.div
              key={pattern.period}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              <pattern.icon size={12} style={{ color: pattern.color }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-white font-medium">{pattern.period}</span>
                  <span className="text-[8px] font-mono" style={{ color: pattern.color }}>
                    {pattern.completed}/{pattern.total} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: pattern.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOCUS TIME CALCULATOR
   ═══════════════════════════════════════════════════════════ */
function FocusTimeCalculator() {
  const totalHours = THIS_WEEK.focusHours;
  const deepWork = totalHours * 0.65;
  const shallowWork = totalHours * 0.35;
  const optimalDeep = 20; // hours per week target
  const deepPct = Math.round((deepWork / optimalDeep) * 100);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Timer size={12} className="text-[#00ffff]" /> Focus Calculator
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Deep vs Shallow donut */}
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(10,10,26,0.8)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="40" fill="none"
                stroke="#00ffff"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={2 * Math.PI * 40 * (1 - 0.65)}
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,255,0.5))' }}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - 0.65) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-mono font-bold text-sm">{deepPct}%</span>
              <span className="text-[7px] text-[#00ffff] uppercase tracking-wider">Deep</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ffff]" />
              <span className="text-[9px] text-white">Deep Work</span>
              <span className="text-[9px] text-[#00ffff] font-mono ml-auto">{deepWork.toFixed(1)}h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#9d4edd]" />
              <span className="text-[9px] text-white">Shallow Work</span>
              <span className="text-[9px] text-[#9d4edd] font-mono ml-auto">{shallowWork.toFixed(1)}h</span>
            </div>
            <div className="flex items-center gap-2 pt-1.5 border-t border-[rgba(157,78,221,0.08)]">
              <span className="text-[9px] text-[#8888aa]">Optimal Deep Target</span>
              <span className="text-[9px] text-[#00ff88] font-mono ml-auto">{optimalDeep}h/wk</span>
            </div>
          </div>
        </div>

        {/* Focus score */}
        <div className="p-3 rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-[#8888aa]">Focus Score</span>
            <span className="text-[11px] text-[#00ff88] font-mono font-bold">
              {deepPct >= 80 ? 'Excellent' : deepPct >= 60 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
          <div className="h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#00ffff] to-[#00ff88]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, deepPct)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[7px] text-[#8888aa]">0h</span>
            <span className="text-[7px] text-[#00ff88] font-mono">{deepWork.toFixed(0)}h deep this week</span>
            <span className="text-[7px] text-[#8888aa]">{optimalDeep}h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTIVITY HEATMAP — Main Export
   ═══════════════════════════════════════════════════════════ */
export function ProductivityHeatmap() {
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }, []);

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <BarChart3 size={16} className="text-[#FF8C42]" />
          Productivity Heatmap
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#8888aa] font-mono">
            Week of {currentDate}
          </span>
        </div>
      </div>

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Focus Hours', value: `${THIS_WEEK.focusHours.toFixed(1)}h`, icon: Timer, color: '#00ffff' },
          { label: 'Tasks Done', value: String(THIS_WEEK.completedTasks), icon: CheckCircle2, color: '#00ff88' },
          { label: 'Deep Work', value: `${(THIS_WEEK.focusHours * 0.65).toFixed(0)}h`, icon: Brain, color: '#9d4edd' },
          { label: 'Peak Hour', value: PEAK_HOURS[0].label, icon: Flame, color: '#FF8C42' },
          { label: 'Top Agent', value: PEAK_HOURS[0].agent, icon: Award, color: PEAK_HOURS[0].agentColor },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-3 backdrop-blur-sm"
            style={{ borderColor: `${s.color}18`, background: `${s.color}04` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={10} style={{ color: s.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* ─── Heatmap ─── */}
      <WeeklyHeatmap />

      {/* ─── Secondary panels ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PeakHoursDetection />
        <AgentContribution />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeekComparison />
        <div className="space-y-4">
          <TaskCompletionPatterns />
          <FocusTimeCalculator />
        </div>
      </div>
    </div>
  );
}
