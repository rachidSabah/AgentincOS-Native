'use client';

import { useOSStore, type StackLayer, type Goal, type JournalEntry, type MemoryEntry } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Cpu, Network, HardDrive, Activity, Radio, Zap, ChevronDown,
  Menu, Command, Shield, Search, Target, BookOpen, Database, Mic,
  FileText, TrendingUp, Eye, Headphones, PenLine, Sparkles, Crown,
  Route, FlaskConical, Gem,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/* ───────── SIDEBAR ───────── */
export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed, agents, stackLayers } = useOSStore();
  const liveCount = agents.filter((a) => a.status === 'live').length;

  const layerNav = [
    { id: 'mission-control', label: 'Mission Control', icon: Radio, layer: 0 },
    { id: 'layer-intelligence', label: 'L1 Intelligence', icon: Crown, layer: 1 },
    { id: 'layer-execution', label: 'L2 Execution', icon: Route, layer: 2 },
    { id: 'layer-research', label: 'L3 Research', icon: FlaskConical, layer: 3 },
    { id: 'layer-self', label: 'L4 Self', icon: Gem, layer: 4 },
  ];

  const selfItems = [
    { id: 'self-goals', label: 'Goals', icon: Target },
    { id: 'self-journal', label: 'Journal', icon: BookOpen },
    { id: 'self-memory', label: 'Memory', icon: Database },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen flex flex-col bg-[#0d0d20] border-r border-[rgba(157,78,221,0.15)] relative z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(157,78,221,0.1)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9d4edd] to-[#00ffff] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="overflow-hidden">
              <div className="text-white font-bold text-sm tracking-wider">AGENTIC OS</div>
              <div className="text-[10px] text-[#8888aa] tracking-widest uppercase">Goldie Mission Stack</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {!sidebarCollapsed && <div className="px-3 mb-2 text-[10px] text-[#8888aa] uppercase tracking-widest">Stack Layers</div>}
        {layerNav.map((item) => {
          const isActive = activeView === item.id;
          const layerData = stackLayers.find(l => l.number === item.layer);
          const dotColor = item.layer === 0 ? '#9d4edd' : (layerData?.color || '#8888aa');
          return (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isActive ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
              }`}
              style={isActive ? { background: `${dotColor}15` } : {}}
            >
              {isActive && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ backgroundColor: dotColor }} />}
              <item.icon size={18} className={`flex-shrink-0 transition-colors ${isActive ? '' : 'text-[#8888aa] group-hover:text-white'}`} style={isActive ? { color: dotColor } : {}} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium truncate">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.id === 'mission-control' && !sidebarCollapsed && (
                <span className="ml-auto text-[10px] bg-[#00ffff]/20 text-[#00ffff] px-1.5 py-0.5 rounded-full font-mono">{liveCount}</span>
              )}
            </button>
          );
        })}

        {/* S.E.L.F Section */}
        <div className="pt-6">
          {!sidebarCollapsed && <div className="px-3 mb-2 text-[10px] text-[#ffaa00] uppercase tracking-widest flex items-center gap-1"><Gem size={10} /> Self</div>}
          {selfItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActive ? 'bg-[rgba(255,170,0,0.1)] text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(255,170,0,0.05)]'
                }`}
              >
                <item.icon size={16} className={`flex-shrink-0 ${isActive ? 'text-[#ffaa00]' : 'text-[#8888aa] group-hover:text-[#ffaa00]'}`} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm truncate">{item.label}</motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>

      <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex items-center justify-center py-3 border-t border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white transition-colors">
        <Menu size={16} />
      </button>
    </motion.aside>
  );
}

/* ───────── TOP BAR ───────── */
export function TopBar() {
  const { setCommandPaletteOpen, systemMetrics, activeView } = useOSStore();
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  const viewLabels: Record<string, string> = {
    'mission-control': 'Mission Control',
    'layer-intelligence': 'Layer 1 — Intelligence',
    'layer-execution': 'Layer 2 — Execution',
    'layer-research': 'Layer 3 — Research',
    'layer-self': 'Layer 4 — Self',
    'self-goals': 'Self — Goals',
    'self-journal': 'Self — Journal',
    'self-memory': 'Self — Memory',
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-bold text-lg tracking-wide">{viewLabels[activeView] || 'Mission Control'}</h1>
        <span className="text-[#8888aa] text-sm hidden lg:block">
          {activeView === 'mission-control' ? 'The Goldie Mission Stack — 4 layers, 1 compound system.' : ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-[#8888aa] font-mono text-sm">{time} <span className="text-[10px]">LOCAL</span></div>
        <button onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] transition-all text-sm">
          <Command size={14} /><span className="hidden sm:inline">Command</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,255,255,0.2)] text-[#00ffff] text-sm">
          <div className="w-2 h-2 rounded-full bg-[#00ffff] animate-pulse-glow" />
          <span className="hidden sm:inline">ALL LAYERS</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}

/* ───────── STACK PYRAMID ───────── */
export function StackPyramid() {
  const { stackLayers, setActiveView } = useOSStore();

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-base tracking-wider uppercase flex items-center gap-2">
          <Sparkles size={16} className="text-[#ffaa00]" />
          The Goldie Mission Stack
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">4 LAYERS ACTIVE</span>
      </div>

      <div className="space-y-2">
        {stackLayers.map((layer, i) => (
          <motion.button
            key={layer.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setActiveView(`layer-${layer.id}`)}
            className="w-full group relative"
          >
            {/* Width gets wider as layer number increases (pyramid) */}
            <div
              className="mx-auto rounded-xl border overflow-hidden transition-all duration-300 card-hover cursor-pointer"
              style={{
                width: `${55 + layer.number * 12}%`,
                background: `linear-gradient(135deg, ${layer.color}08, ${layer.color}03)`,
                borderColor: `${layer.color}25`,
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="text-lg">{layer.icon}</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                      L{layer.number}
                    </span>
                    <span className="text-white text-sm font-semibold">{layer.name}</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: `${layer.color}aa` }}>{layer.role}</div>
                </div>
                <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ backgroundColor: layer.color }} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Compounding indicator */}
      <div className="mt-5 pt-4 border-t border-[rgba(157,78,221,0.1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-[#ffaa00]" />
          <span className="text-[11px] text-[#8888aa]">Compounding</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-[#ffaa00] font-mono font-bold">Day 30</div>
          <div className="w-24 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#9d4edd] to-[#ffaa00]"
              initial={{ width: '0%' }} animate={{ width: '72%' }} transition={{ duration: 2, ease: 'easeOut' }} />
          </div>
          <span className="text-[10px] text-[#ffaa00]">72%</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── LAYER CARD (detailed) ───────── */
export function LayerCard({ layer }: { layer: StackLayer }) {
  const { agents, setActiveView, setControlRoomAgent } = useOSStore();
  const agent = agents.find(a => a.layer === layer.number);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden card-hover"
      style={{ borderColor: `${layer.color}25`, background: `linear-gradient(135deg, ${layer.color}08, ${layer.color}03)` }}
    >
      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${layer.color}, transparent)` }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, border: `1px solid ${layer.color}30` }}>
            {layer.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>
                LAYER {layer.number}
              </span>
              {agent && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                  agent.status === 'live' ? 'bg-[#00ffff]/15 text-[#00ffff]' : 'bg-[#8888aa]/15 text-[#8888aa]'
                }`}>
                  {agent.status.toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-xl">{layer.name}</h3>
            <p className="text-sm mt-0.5" style={{ color: `${layer.color}bb` }}>{layer.role}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#ccccdd] text-sm leading-relaxed mb-4">{layer.description}</p>

        {/* Agent metrics */}
        {agent && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Uptime</div>
              <div className="text-white text-sm font-mono">{agent.uptime}</div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Latency</div>
              <div className="text-sm font-mono" style={{ color: agent.latency > 300 ? '#ffaa00' : '#00ff88' }}>{agent.latency}ms</div>
            </div>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Requests</div>
              <div className="text-white text-sm font-mono">{agent.requests.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Tags */}
        {agent && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {agent.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full border font-medium tracking-wider"
                style={{ borderColor: `${layer.color}40`, color: layer.color, background: `${layer.color}10` }}>
                {tag}
              </span>
            ))}
            {agent.model && (
              <span className="text-[11px] px-2.5 py-1 rounded-full border border-[rgba(0,255,255,0.2)] text-[#00ffff] bg-[rgba(0,255,255,0.05)] font-mono">
                {agent.model}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        {agent && (
          <button onClick={() => setControlRoomAgent(agent.id)}
            className="w-full text-center text-sm py-2.5 rounded-lg border transition-all duration-300 group font-medium"
            style={{ color: `${layer.color}aa`, borderColor: `${layer.color}20`, background: `${layer.color}08` }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${layer.color}40`; e.currentTarget.style.color = layer.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${layer.color}20`; e.currentTarget.style.color = `${layer.color}aa`; }}
          >
            OPEN CONTROL ROOM <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">→</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ───────── AGENT STATUS BAR ───────── */
export function AgentStatusBar() {
  const { agents, setControlRoomAgent, stackLayers } = useOSStore();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-1">
      {agents.map((agent) => {
        const layer = stackLayers.find(l => l.number === agent.layer);
        return (
          <motion.button key={agent.id} onClick={() => setControlRoomAgent(agent.id)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border min-w-[180px] card-hover cursor-pointer group"
            style={{ borderColor: `${agent.color}20`, background: `linear-gradient(135deg, ${agent.color}08, ${agent.color}03)` }}
          >
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${agent.status === 'live' ? 'animate-pulse-glow' : ''}`}
                style={{ backgroundColor: agent.status === 'live' ? agent.color : agent.status === 'degraded' ? '#ffaa00' : '#8888aa' }} />
              {agent.status === 'live' && <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-30" style={{ backgroundColor: agent.color }} />}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${agent.color}20`, color: agent.color }}>L{agent.layer}</span>
                <span className="text-white text-sm font-semibold">{agent.name}</span>
              </div>
              <div className="text-[#8888aa] text-[11px] mt-0.5">{agent.latency}ms · {agent.lastActive}</div>
            </div>
            <ChevronDown size={14} className="text-[#8888aa] group-hover:text-white transition-colors rotate-[-90deg]" />
          </motion.button>
        );
      })}
    </div>
  );
}

/* ───────── COMPOUND VISUALIZER ───────── */
export function CompoundVisualizer() {
  const { systemMetrics } = useOSStore();
  const days = Array.from({ length: 30 }, (_, i) => {
    const growth = Math.pow(1.08, i + 1);
    return { day: i + 1, entries: Math.round(100 * growth), quality: Math.min(100, 30 + i * 2.3) };
  });

  return (
    <div className="rounded-2xl border border-[rgba(255,170,0,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <TrendingUp size={14} className="text-[#ffaa00]" />
          Compounding Curve
        </h3>
        <span className="text-[10px] text-[#ffaa00] font-mono">DAY {systemMetrics.compoundDays}</span>
      </div>

      <svg viewBox="0 0 300 80" className="w-full">
        <defs>
          <linearGradient id="compound-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffaa00" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={days.map((d, i) => {
            const x = (i / (days.length - 1)) * 300;
            const y = 78 - (d.quality / 100) * 72;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none" stroke="#ffaa00" strokeWidth="2"
        />
        <path
          d={days.map((d, i) => {
            const x = (i / (days.length - 1)) * 300;
            const y = 78 - (d.quality / 100) * 72;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ') + ' L 300 80 L 0 80 Z'}
          fill="url(#compound-grad)"
        />
        {/* Current day marker */}
        <circle cx={(systemMetrics.compoundDays / 30) * 300} cy={78 - (days[systemMetrics.compoundDays - 1]?.quality || 50) / 100 * 72} r="4" fill="#ffaa00" />
      </svg>

      <div className="flex justify-between text-[10px] text-[#8888aa] mt-2">
        <span>Day 1 — Good</span>
        <span>Day 30 — Wild</span>
      </div>

      <div className="mt-3 pt-3 border-t border-[rgba(255,170,0,0.1)] grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase">Vault Size</div>
          <div className="text-white font-mono text-sm font-bold">{systemMetrics.vaultSize} GB</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase">Entries</div>
          <div className="text-[#ffaa00] font-mono text-sm font-bold">{systemMetrics.vaultEntries.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase">Compounding</div>
          <div className="text-[#00ff88] font-mono text-sm font-bold">{systemMetrics.compoundDays}d</div>
        </div>
      </div>
    </div>
  );
}

/* ───────── SYSTEM MONITOR ───────── */
export function SystemMonitor() {
  const { systemMetrics } = useOSStore();
  const [anim, setAnim] = useState(systemMetrics);
  useEffect(() => {
    const i = setInterval(() => setAnim(p => ({
      ...p,
      cpu: Math.max(5, Math.min(95, p.cpu + (Math.random() - 0.5) * 8)),
      memory: Math.max(30, Math.min(90, p.memory + (Math.random() - 0.5) * 4)),
      network: Math.max(20, Math.min(95, p.network + (Math.random() - 0.5) * 6)),
      disk: Math.max(20, Math.min(80, p.disk + (Math.random() - 0.5) * 2)),
    })), 2000);
    return () => clearInterval(i);
  }, []);

  const metrics = [
    { label: 'CPU', value: Math.round(anim.cpu), icon: Cpu, color: '#00ffff' },
    { label: 'Memory', value: Math.round(anim.memory), icon: HardDrive, color: '#9d4edd' },
    { label: 'Network', value: Math.round(anim.network), icon: Network, color: '#00ff88' },
    { label: 'Disk I/O', value: Math.round(anim.disk), icon: Activity, color: '#ffaa00' },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Activity size={16} className="text-[#9d4edd]" /> System Monitor
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">LIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><m.icon size={14} style={{ color: m.color }} /><span className="text-[#8888aa] text-xs">{m.label}</span></div>
              <span className="text-white text-xs font-mono font-bold">{m.value}%</span>
            </div>
            <div className="h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }}
                animate={{ width: `${m.value}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(157,78,221,0.1)] grid grid-cols-3 gap-3">
        <div className="text-center"><div className="text-[10px] text-[#8888aa] uppercase">Layers</div><div className="text-white font-mono text-sm font-bold">4</div></div>
        <div className="text-center"><div className="text-[10px] text-[#8888aa] uppercase">Requests</div><div className="text-white font-mono text-sm font-bold">{(systemMetrics.totalRequests / 1000).toFixed(1)}K</div></div>
        <div className="text-center"><div className="text-[10px] text-[#8888aa] uppercase">Avg Latency</div><div className="text-[#00ff88] font-mono text-sm font-bold">{systemMetrics.avgLatency}ms</div></div>
      </div>
    </div>
  );
}

/* ───────── LOG STREAM ───────── */
export function LogStream() {
  const { logs } = useOSStore();
  const levelColors: Record<string, string> = { info: '#00ffff', warn: '#ffaa00', error: '#ff0040', success: '#00ff88' };
  const layerColors: Record<number, string> = { 1: '#00ffff', 2: '#9d4edd', 3: '#00ff88', 4: '#ffaa00' };

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(157,78,221,0.1)]">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Radio size={14} className="text-[#00ffff]" /> Signal Log
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <span className="text-[10px] text-[#00ff88] font-mono tracking-wider">STREAMING</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-4 space-y-1.5 font-mono text-xs">
        {logs.map(log => (
          <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 py-1">
            <span className="text-[#8888aa] flex-shrink-0 w-16">{log.timestamp}</span>
            <span className="flex-shrink-0 text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${layerColors[log.layer] || '#8888aa'}20`, color: layerColors[log.layer] || '#8888aa' }}>
              L{log.layer}
            </span>
            <span className="flex-shrink-0 w-14 uppercase text-[10px] font-bold" style={{ color: levelColors[log.level] }}>[{log.level}]</span>
            <span className="text-[#ccccdd] flex-1">{log.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── LATENCY GRAPH ───────── */
export function LatencyGraph() {
  const [data, setData] = useState<number[]>([120, 145, 132, 189, 156, 203, 178, 145, 167, 198, 156, 134, 189, 210, 176]);
  useEffect(() => {
    const i = setInterval(() => setData(p => [...p.slice(1), Math.max(50, Math.min(500, p[p.length - 1] + (Math.random() - 0.45) * 40))]), 3000);
    return () => clearInterval(i);
  }, []);

  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Zap size={14} className="text-[#ffaa00]" /> Cross-Layer Latency
        </h3>
        <span className="text-[10px] text-[#ffaa00] font-mono">p99: {Math.round(max)}ms</span>
      </div>
      <svg viewBox="0 0 120 30" className="w-full h-8">
        <defs><linearGradient id="lat-grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ffaa00" stopOpacity="0.3" /><stop offset="100%" stopColor="#ffaa00" stopOpacity="0" /></linearGradient></defs>
        <path d={data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * 120} ${28 - ((v - min) / range) * 24}`).join(' ')} fill="none" stroke="#ffaa00" strokeWidth="1.5" />
        <path d={data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * 120} ${28 - ((v - min) / range) * 24}`).join(' ') + ' L 120 30 L 0 30 Z'} fill="url(#lat-grad)" />
      </svg>
    </div>
  );
}

/* ───────── CONTROL ROOM ───────── */
export function ControlRoom({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { agents, stackLayers } = useOSStore();
  const agent = agents.find(a => a.id === agentId);
  const layer = stackLayers.find(l => l.number === agent?.layer);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: `${agent?.name || 'Agent'} control room initialized. Layer ${agent?.layer} — ${layer?.role || 'active'}. Ready for commands.` },
  ]);
  if (!agent || !layer) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(p => [...p, { role: 'user', text: input }]);
    setTimeout(() => setMessages(p => [...p, { role: 'agent', text: `Command "${input}" acknowledged. Processing through Layer ${agent.layer} (${layer.name}) pipeline...` }]), 800);
    setInput('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-[90vw] max-w-4xl h-[80vh] rounded-2xl border bg-[#0a0a1a] overflow-hidden flex flex-col"
        style={{ borderColor: `${layer.color}25` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: `${layer.color}15` }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `linear-gradient(135deg, ${layer.color}20, ${layer.color}08)`, border: `1px solid ${layer.color}30` }}>
              {layer.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layer.color}20`, color: layer.color }}>L{layer.number}</span>
                <h2 className="text-white font-bold text-lg">{agent.name} Control Room</h2>
              </div>
              <p className="text-[11px]" style={{ color: `${layer.color}aa` }}>{layer.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${agent.status === 'live' ? 'bg-[#00ffff]/15 text-[#00ffff]' : 'bg-[#8888aa]/15 text-[#8888aa]'}`}>
              {agent.status.toUpperCase()}
            </span>
            <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors text-xl">×</button>
          </div>
        </div>
        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${
                  msg.role === 'user' ? 'bg-[rgba(157,78,221,0.2)] text-white border border-[rgba(157,78,221,0.15)]'
                    : 'bg-[rgba(18,18,42,0.8)] text-[#ccccdd] border border-[rgba(157,78,221,0.1)]'}`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="p-4 border-t border-[rgba(157,78,221,0.1)]">
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Send command to ${agent.name} (Layer ${layer.number})...`}
                className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
              <button onClick={handleSend} className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all"
                style={{ background: `linear-gradient(135deg, ${layer.color}cc, ${layer.color}88)` }}>Send</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── COMMAND PALETTE ───────── */
export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView, setControlRoomAgent } = useOSStore();
  const [query, setQuery] = useState('');
  const commands = [
    { id: 'mc', label: 'Mission Control', desc: 'View the Goldie Mission Stack', action: () => setActiveView('mission-control') },
    { id: 'l1', label: 'Layer 1 — Intelligence', desc: 'Claude CEO layer', action: () => setActiveView('layer-intelligence') },
    { id: 'l2', label: 'Layer 2 — Execution', desc: 'OpenClaw router layer', action: () => setActiveView('layer-execution') },
    { id: 'l3', label: 'Layer 3 — Research', desc: 'Hermes worker layer', action: () => setActiveView('layer-research') },
    { id: 'l4', label: 'Layer 4 — Self', desc: 'Obsidian Vault + OMI', action: () => setActiveView('layer-self') },
    { id: 'cr-claude', label: 'Claude Control Room', desc: 'Open L1 control room', action: () => setControlRoomAgent('claude') },
    { id: 'cr-openclaw', label: 'OpenClaw Control Room', desc: 'Open L2 control room', action: () => setControlRoomAgent('openclaw') },
    { id: 'cr-hermes', label: 'Hermes Control Room', desc: 'Open L3 control room', action: () => setControlRoomAgent('hermes') },
    { id: 'cr-vault', label: 'Self Vault Control Room', desc: 'Open L4 control room', action: () => setControlRoomAgent('vault') },
    { id: 'goals', label: 'Self — Goals', desc: 'View goals with progress', action: () => setActiveView('self-goals') },
    { id: 'journal', label: 'Self — Journal', desc: 'View journal entries', action: () => setActiveView('self-journal') },
    { id: 'memory', label: 'Self — Memory', desc: 'Search memory store', action: () => setActiveView('self-memory') },
  ];
  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase()));
  if (!commandPaletteOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => { setCommandPaletteOpen(false); setQuery(''); }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-[90vw] max-w-lg rounded-2xl border border-[rgba(157,78,221,0.2)] bg-[#0d0d20] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(157,78,221,0.1)]">
          <Search size={16} className="text-[#8888aa]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-[#8888aa] focus:outline-none" autoFocus />
          <kbd className="text-[10px] text-[#8888aa] bg-[rgba(157,78,221,0.1)] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.map(cmd => (
            <button key={cmd.id} onClick={() => { cmd.action(); setCommandPaletteOpen(false); setQuery(''); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(157,78,221,0.1)] transition-colors group">
              <Command size={14} className="text-[#9d4edd]" />
              <div><div className="text-white text-sm">{cmd.label}</div><div className="text-[#8888aa] text-xs">{cmd.desc}</div></div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center py-6 text-[#8888aa] text-sm">No commands found</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────── SELF: GOALS VIEW ───────── */
export function GoalsView() {
  const { goals } = useOSStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Target size={20} className="text-[#00ffff]" />
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Goals</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(0,255,255,0.2)] text-[#00ffff] font-mono">{goals.length} active</span>
        <span className="text-[11px] text-[#8888aa] ml-2">Tracked with progress bars — every agent knows what you're working towards</span>
      </div>
      <div className="grid gap-3">
        {goals.map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[rgba(0,255,255,0.1)] bg-[rgba(18,18,42,0.6)] p-5 card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(157,78,221,0.2)] text-[#9d4edd] bg-[rgba(157,78,221,0.08)] font-medium">{goal.category}</span>
                <h4 className="text-white text-sm font-semibold">{goal.title}</h4>
              </div>
              <span className="text-[10px] text-[#8888aa]">{goal.timeline}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, #00ffff88, #00ffff)` }}
                  initial={{ width: '0%' }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.1 }} />
              </div>
              <span className="text-[#00ffff] text-sm font-mono font-bold w-10 text-right">{goal.progress}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── SELF: JOURNAL VIEW ───────── */
export function JournalView() {
  const { journal } = useOSStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BookOpen size={20} className="text-[#9d4edd]" />
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Journal</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(157,78,221,0.2)] text-[#9d4edd] font-mono">{journal.length} entries</span>
        <span className="text-[11px] text-[#8888aa] ml-2">Voice or text — stored daily so agents always know your current state and focus</span>
      </div>
      <div className="grid gap-3">
        {journal.map((entry, i) => (
          <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] p-5 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-white text-sm font-medium">{entry.date}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                entry.type === 'voice' ? 'bg-[rgba(255,170,0,0.1)] text-[#ffaa00] border border-[rgba(255,170,0,0.2)]' : 'bg-[rgba(0,255,255,0.1)] text-[#00ffff] border border-[rgba(0,255,255,0.2)]'
              }`}>
                {entry.type === 'voice' ? <><Mic size={10} className="inline mr-1" />VOICE</> : <><PenLine size={10} className="inline mr-1" />TEXT</>}
              </span>
              <span className="text-[10px] text-[#8888aa]">via {entry.source}</span>
            </div>
            <p className="text-[#ccccdd] text-sm leading-relaxed">{entry.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── SELF: MEMORY VIEW ───────── */
export function MemoryView() {
  const { memories, selfSearchQuery, setSelfSearchQuery } = useOSStore();
  const filtered = selfSearchQuery
    ? memories.filter(m => m.content.toLowerCase().includes(selfSearchQuery.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(selfSearchQuery.toLowerCase())))
    : memories;

  const layerColors: Record<string, string> = { Claude: '#00ffff', OpenClaw: '#9d4edd', Hermes: '#00ff88', 'Self Vault': '#ffaa00' };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Database size={20} className="text-[#00ff88]" />
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Memory</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(0,255,136,0.2)] text-[#00ff88] font-mono">{memories.length} entries</span>
        <span className="text-[11px] text-[#8888aa] ml-2">Auto-saved and searchable — your AI never forgets a thing</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
        <input value={selfSearchQuery} onChange={e => setSelfSearchQuery(e.target.value)}
          placeholder="Search memories... (tags, content, agents)"
          className="w-full bg-[rgba(18,18,42,0.6)] border border-[rgba(157,78,221,0.15)] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.3)]" />
        {selfSearchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8888aa]">{filtered.length} results</span>
        )}
      </div>

      <div className="grid gap-3">
        {filtered.map((mem, i) => (
          <motion.div key={mem.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-[rgba(0,255,136,0.1)] bg-[rgba(18,18,42,0.6)] p-4 card-hover">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${layerColors[mem.agent] || '#8888aa'}20`, color: layerColors[mem.agent] || '#8888aa' }}>
                {mem.agent}
              </span>
              <span className="text-[10px] text-[#8888aa]">{mem.timestamp}</span>
              <div className="flex-1" />
              {mem.tags.map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full border border-[rgba(157,78,221,0.2)] text-[#9d4edd] bg-[rgba(157,78,221,0.05)]">{t}</span>
              ))}
            </div>
            <p className="text-[#ccccdd] text-sm leading-relaxed">{mem.content}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ───────── HERMES FEATURE GRID ───────── */
export function HermesFeatureGrid() {
  const features = [
    { title: '2,550+ Skills', desc: 'Across 11 registries in 35 categories', icon: '⚡', color: '#00ffff' },
    { title: '20+ LLM Providers', desc: 'Model-agnostic architecture', icon: '🧠', color: '#9d4edd' },
    { title: 'MCP Server', desc: 'stdio + SSE transports', icon: '🔌', color: '#00ff88' },
    { title: 'Browser Automation', desc: 'Cloud & local Chromium/CDP', icon: '🌐', color: '#ffaa00' },
    { title: 'Voice & TTS', desc: '5 TTS + 6 STT providers', icon: '🎙️', color: '#00ffff' },
    { title: '19+ Platforms', desc: 'Telegram, Discord, Slack, WhatsApp...', icon: '💬', color: '#9d4edd' },
    { title: 'OpenAI API', desc: 'Compatible server endpoint', icon: '🔗', color: '#00ff88' },
    { title: 'IDE Integration', desc: 'VS Code, Zed, JetBrains via ACP', icon: '💻', color: '#ffaa00' },
    { title: 'Kanban & DevOps', desc: 'Task lists, scheduled workflows', icon: '📋', color: '#00ffff' },
    { title: 'Memory System', desc: '8 providers + MEMORY.md persistence', icon: '🧠', color: '#9d4edd' },
    { title: 'Coding Delegation', desc: 'Claude Code, Codex, OpenCode CLIs', icon: '⚙️', color: '#00ff88' },
    { title: 'Computer Use', desc: 'Full macOS desktop automation', icon: '🖥️', color: '#ffaa00' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {features.map((f, i) => (
        <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-[rgba(0,255,136,0.1)] bg-[rgba(18,18,42,0.6)] p-4 card-hover">
          <div className="text-2xl mb-2">{f.icon}</div>
          <h4 className="text-white text-sm font-semibold mb-1">{f.title}</h4>
          <p className="text-[#8888aa] text-xs">{f.desc}</p>
          <div className="mt-2 h-0.5 w-8 rounded-full" style={{ backgroundColor: f.color }} />
        </motion.div>
      ))}
    </div>
  );
}

/* ───────── SELF LAYER EXPLANATION ───────── */
export function SelfLayerExplanation() {
  return (
    <div className="rounded-2xl border border-[rgba(255,170,0,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <Gem size={18} className="text-[#ffaa00]" />
        <h3 className="text-white font-bold text-base tracking-wider uppercase">Why The Self Layer Is The Real Unlock</h3>
      </div>
      <p className="text-[#ccccdd] text-sm leading-relaxed mb-4">
        The Self Layer is the difference between an agent that gives <span className="text-[#8888aa]">generic answers</span> and an agent that gives advice as if it&apos;s <span className="text-[#ffaa00] font-semibold">worked at your company for two years</span>. It has three components inside Agent OS that compound over time.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Target, label: 'Goals', desc: 'Tracked with progress bars so every agent knows what you\'re working towards this week, this month, and this quarter.', color: '#00ffff' },
          { icon: BookOpen, label: 'Journal', desc: 'Voice or text entries stored in the vault every day so agents always know your current state and focus.', color: '#9d4edd' },
          { icon: Database, label: 'Memory', desc: 'Every chat auto-saved and searchable across thousands of notes. Your AI never forgets a thing you\'ve ever told it.', color: '#00ff88' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: `${item.color}20`, background: `${item.color}05` }}>
            <item.icon size={18} style={{ color: item.color }} className="mb-2" />
            <h4 className="text-white text-sm font-semibold mb-1">{item.label}</h4>
            <p className="text-[#8888aa] text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[rgba(255,170,0,0.1)] flex items-center gap-3">
        <TrendingUp size={14} className="text-[#ffaa00]" />
        <p className="text-[#ffaa00] text-sm font-medium">Day one this is good. Day thirty this is wild. The system compounds because it knows more about you, your business and your priorities every single day. That&apos;s the lever.</p>
      </div>
    </div>
  );
}

/* ───────── OMI + OBSIDIAN STATUS ───────── */
export function OmiObsidianStatus() {
  const { systemMetrics } = useOSStore();
  return (
    <div className="rounded-2xl border border-[rgba(255,170,0,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Headphones size={14} className="text-[#ffaa00]" /> OMI + Obsidian
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ffaa00] animate-pulse-glow" />
          <span className="text-[10px] text-[#ffaa00] font-mono">RECORDING</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-[rgba(10,10,26,0.5)] p-3 text-center">
          <Eye size={14} className="text-[#ffaa00] mx-auto mb-1" />
          <div className="text-[10px] text-[#8888aa] uppercase">Screen</div>
          <div className="text-[#00ff88] text-xs font-mono font-bold">Active</div>
        </div>
        <div className="rounded-lg bg-[rgba(10,10,26,0.5)] p-3 text-center">
          <Mic size={14} className="text-[#ffaa00] mx-auto mb-1" />
          <div className="text-[10px] text-[#8888aa] uppercase">Microphone</div>
          <div className="text-[#00ff88] text-xs font-mono font-bold">Active</div>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-[#8888aa]">Export Target</span><span className="text-white font-mono">Obsidian Vault</span></div>
        <div className="flex justify-between"><span className="text-[#8888aa]">Vault Size</span><span className="text-white font-mono">{systemMetrics.vaultSize} GB</span></div>
        <div className="flex justify-between"><span className="text-[#8888aa]">Total Entries</span><span className="text-[#ffaa00] font-mono">{systemMetrics.vaultEntries.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-[#8888aa]">Notes Today</span><span className="text-[#00ff88] font-mono">47</span></div>
      </div>
    </div>
  );
}
