'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Cpu,
  Network,
  HardDrive,
  Activity,
  Radio,
  Zap,
  ChevronDown,
  Menu,
  Command,
  Shield,
  Search,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, setSidebarCollapsed, agents } = useOSStore();
  const liveCount = agents.filter((a) => a.status === 'live').length;

  const navItems = [
    { id: 'mission-control', label: 'Mission Control', icon: Radio },
    { id: 'agents', label: 'Agents', icon: Brain },
    { id: 'cloud', label: 'Cloud', icon: Cpu },
    { id: 'openclaw', label: 'OpenClaw', icon: Network },
    { id: 'hermes', label: 'Hermes', icon: Zap },
  ];

  const selfItems = [
    { id: 'goals', label: 'Goals', icon: Shield },
    { id: 'journal', label: 'Journal', icon: Activity },
    { id: 'memory', label: 'Memory', icon: HardDrive },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
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
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <div className="text-white font-bold text-sm tracking-wider">AGENTIC OS</div>
              <div className="text-[10px] text-[#8888aa] tracking-widest uppercase">Mission Control</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {!sidebarCollapsed && (
          <div className="px-3 mb-2 text-[10px] text-[#8888aa] uppercase tracking-widest">Navigation</div>
        )}
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[rgba(157,78,221,0.15)] text-white'
                  : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#9d4edd] rounded-r"
                />
              )}
              <item.icon
                size={18}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#9d4edd]' : 'text-[#8888aa] group-hover:text-[#9d4edd]'
                }`}
              />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.id === 'mission-control' && !sidebarCollapsed && (
                <span className="ml-auto text-[10px] bg-[#00ffff]/20 text-[#00ffff] px-1.5 py-0.5 rounded-full font-mono">
                  {liveCount}
                </span>
              )}
            </button>
          );
        })}

        {/* S.E.L.F Section */}
        <div className="pt-6">
          {!sidebarCollapsed && (
            <div className="px-3 mb-2 text-[10px] text-[#8888aa] uppercase tracking-widest">S.E.L.F</div>
          )}
          {selfItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-[rgba(157,78,221,0.15)] text-white'
                    : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
                }`}
              >
                <item.icon size={16} className="flex-shrink-0 text-[#8888aa] group-hover:text-[#00ffff]" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex items-center justify-center py-3 border-t border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white transition-colors"
      >
        <Menu size={16} />
      </button>
    </motion.aside>
  );
}

export function TopBar() {
  const { commandPaletteOpen, setCommandPaletteOpen, systemMetrics } = useOSStore();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.8)] backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-white font-bold text-lg tracking-wide">Mission Control</h1>
        <span className="text-[#8888aa] text-sm hidden sm:block">
          Status of every agent, every memory, every signal.
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Time */}
        <div className="text-[#8888aa] font-mono text-sm">
          {time} <span className="text-[10px]">LOCAL</span>
        </div>

        {/* Command Palette */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] transition-all text-sm"
        >
          <Command size={14} />
          <span className="hidden sm:inline">Command</span>
        </button>

        {/* System Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,255,255,0.2)] text-[#00ffff] text-sm">
          <div className="w-2 h-2 rounded-full bg-[#00ffff] animate-pulse-glow" />
          <span className="hidden sm:inline">ALL SYSTEMS</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}

export function AgentStatusBar() {
  const { agents, setControlRoomAgent } = useOSStore();

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 px-1">
      {agents.map((agent) => (
        <motion.button
          key={agent.id}
          onClick={() => setControlRoomAgent(agent.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm min-w-[200px] card-hover cursor-pointer group"
        >
          {/* Status indicator */}
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full ${
                agent.status === 'live'
                  ? 'bg-[#00ffff] animate-pulse-glow'
                  : agent.status === 'degraded'
                  ? 'bg-[#ffaa00] animate-pulse-glow'
                  : 'bg-[#8888aa]'
              }`}
            />
            {agent.status === 'live' && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#00ffff] animate-ping opacity-30" />
            )}
          </div>

          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">{agent.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wider ${
                  agent.status === 'live'
                    ? 'bg-[#00ffff]/15 text-[#00ffff]'
                    : agent.status === 'degraded'
                    ? 'bg-[#ffaa00]/15 text-[#ffaa00]'
                    : 'bg-[#8888aa]/15 text-[#8888aa]'
                }`}
              >
                {agent.status.toUpperCase()}
              </span>
            </div>
            <div className="text-[#8888aa] text-[11px] mt-0.5">
              {agent.latency}ms · {agent.lastActive}
            </div>
          </div>

          <ChevronDown
            size={14}
            className="text-[#8888aa] group-hover:text-white transition-colors rotate-[-90deg]"
          />
        </motion.button>
      ))}
    </div>
  );
}

export function AgentCard({ agent }: { agent: ReturnType<typeof useOSStore.getState>['agents'][0] }) {
  const { setControlRoomAgent } = useOSStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden card-hover"
    >
      {/* Card header with agent color accent */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${agent.color}, transparent)` }} />

      <div className="p-6">
        {/* Avatar + Name */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}11)`, border: `1px solid ${agent.color}33` }}
          >
            {agent.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-lg">{agent.name}</h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                  agent.status === 'live'
                    ? 'bg-[#00ffff]/15 text-[#00ffff]'
                    : agent.status === 'degraded'
                    ? 'bg-[#ffaa00]/15 text-[#ffaa00]'
                    : 'bg-[#8888aa]/15 text-[#8888aa]'
                }`}
              >
                {agent.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[#8888aa] text-sm mt-1">{agent.description}</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Uptime</div>
            <div className="text-white text-sm font-mono">{agent.uptime}</div>
          </div>
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Latency</div>
            <div className="text-sm font-mono" style={{ color: agent.latency > 300 ? '#ffaa00' : '#00ff88' }}>
              {agent.latency}ms
            </div>
          </div>
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-1">Requests</div>
            <div className="text-white text-sm font-mono">{agent.requests.toLocaleString()}</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-4">
          {agent.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-1 rounded-full border border-[rgba(157,78,221,0.3)] text-[#9d4edd] bg-[rgba(157,78,221,0.1)] font-medium tracking-wider"
            >
              {tag}
            </span>
          ))}
          {agent.model && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-[rgba(0,255,255,0.2)] text-[#00ffff] bg-[rgba(0,255,255,0.05)] font-mono">
              {agent.model}
            </span>
          )}
        </div>

        {/* Open Control Room */}
        <button
          onClick={() => setControlRoomAgent(agent.id)}
          className="w-full text-center text-[#8888aa] hover:text-white text-sm py-2 rounded-lg border border-[rgba(157,78,221,0.1)] hover:border-[rgba(157,78,221,0.3)] transition-all duration-300 group"
        >
          OPEN CONTROL ROOM
          <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>
    </motion.div>
  );
}

export function SystemMonitor() {
  const { systemMetrics } = useOSStore();
  const [animatedMetrics, setAnimatedMetrics] = useState(systemMetrics);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedMetrics((prev) => ({
        ...prev,
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.max(30, Math.min(90, prev.memory + (Math.random() - 0.5) * 4)),
        network: Math.max(20, Math.min(95, prev.network + (Math.random() - 0.5) * 6)),
        disk: Math.max(20, Math.min(80, prev.disk + (Math.random() - 0.5) * 2)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: 'CPU', value: Math.round(animatedMetrics.cpu), icon: Cpu, color: '#00ffff' },
    { label: 'Memory', value: Math.round(animatedMetrics.memory), icon: HardDrive, color: '#9d4edd' },
    { label: 'Network', value: Math.round(animatedMetrics.network), icon: Network, color: '#00ff88' },
    { label: 'Disk I/O', value: Math.round(animatedMetrics.disk), icon: Activity, color: '#ffaa00' },
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Activity size={16} className="text-[#9d4edd]" />
          System Monitor
        </h3>
        <span className="text-[10px] text-[#8888aa] font-mono">LIVE</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <metric.icon size={14} style={{ color: metric.color }} />
                <span className="text-[#8888aa] text-xs">{metric.label}</span>
              </div>
              <span className="text-white text-xs font-mono font-bold">{metric.value}%</span>
            </div>
            <div className="h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${metric.color}88, ${metric.color})` }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Additional stats */}
      <div className="mt-4 pt-4 border-t border-[rgba(157,78,221,0.1)] grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Active</div>
          <div className="text-white font-mono text-sm font-bold">{systemMetrics.activeAgents}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Requests</div>
          <div className="text-white font-mono text-sm font-bold">{(systemMetrics.totalRequests / 1000).toFixed(1)}K</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Avg Latency</div>
          <div className="text-[#00ff88] font-mono text-sm font-bold">{systemMetrics.avgLatency}ms</div>
        </div>
      </div>
    </div>
  );
}

export function LogStream() {
  const { logs } = useOSStore();
  const [autoScroll, setAutoScroll] = useState(true);

  const levelColors: Record<string, string> = {
    info: '#00ffff',
    warn: '#ffaa00',
    error: '#ff0040',
    success: '#00ff88',
  };

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(157,78,221,0.1)]">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Radio size={14} className="text-[#00ffff]" />
          Signal Log
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-glow" />
          <span className="text-[10px] text-[#00ff88] font-mono tracking-wider">STREAMING</span>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-4 space-y-1.5 font-mono text-xs">
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 py-1"
          >
            <span className="text-[#8888aa] flex-shrink-0 w-16">{log.timestamp}</span>
            <span
              className="flex-shrink-0 w-14 uppercase text-[10px] font-bold"
              style={{ color: levelColors[log.level] }}
            >
              [{log.level}]
            </span>
            <span className="text-[#9d4edd] flex-shrink-0 w-20 truncate">{log.agent}</span>
            <span className="text-[#ccccdd]">{log.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function MiniChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">{label}</div>
      <svg viewBox="0 0 120 30" className="w-full h-8">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={data
            .map((val, i) => {
              const x = (i / (data.length - 1)) * 120;
              const y = 28 - ((val - min) / range) * 24;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
        <path
          d={
            data
              .map((val, i) => {
                const x = (i / (data.length - 1)) * 120;
                const y = 28 - ((val - min) / range) * 24;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ') + ' L 120 30 L 0 30 Z'
          }
          fill={`url(#grad-${label})`}
        />
      </svg>
    </div>
  );
}

export function LatencyGraph() {
  const [data, setData] = useState<number[]>([120, 145, 132, 189, 156, 203, 178, 145, 167, 198, 156, 134, 189, 210, 176]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => [...prev.slice(1), Math.max(50, Math.min(500, prev[prev.length - 1] + (Math.random() - 0.45) * 40))]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm tracking-wider uppercase flex items-center gap-2">
          <Zap size={14} className="text-[#ffaa00]" />
          Latency Monitor
        </h3>
        <span className="text-[10px] text-[#ffaa00] font-mono">p99: {Math.round(Math.max(...data))}ms</span>
      </div>
      <MiniChart data={data} color="#ffaa00" label="COMBINED P99" />
    </div>
  );
}

export function ControlRoom({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { agents, updateAgent } = useOSStore();
  const agent = agents.find((a) => a.id === agentId);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: `${agent?.name || 'Agent'} control room initialized. Ready for commands.` },
  ]);

  if (!agent) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `Command "${input}" acknowledged. Processing through ${agent.name} pipeline...`,
        },
      ]);
    }, 800);
    setInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-[90vw] max-w-4xl h-[80vh] rounded-2xl border border-[rgba(157,78,221,0.2)] bg-[#0a0a1a] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(157,78,221,0.1)]">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}11)`, border: `1px solid ${agent.color}33` }}
            >
              {agent.name[0]}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{agent.name} Control Room</h2>
              <p className="text-[#8888aa] text-xs">{agent.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                agent.status === 'live' ? 'bg-[#00ffff]/15 text-[#00ffff]' : 'bg-[#ffaa00]/15 text-[#ffaa00]'
              }`}
            >
              {agent.status.toUpperCase()}
            </span>
            <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors text-xl">
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-[rgba(157,78,221,0.2)] text-white border border-[rgba(157,78,221,0.15)]'
                        : 'bg-[rgba(18,18,42,0.8)] text-[#ccccdd] border border-[rgba(157,78,221,0.1)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[rgba(157,78,221,0.1)]">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Send command to ${agent.name}...`}
                  className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
                />
                <button
                  onClick={handleSend}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] text-white text-sm font-medium hover:from-[#a855f7] hover:to-[#9d4edd] transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Side panel - agent details */}
          <div className="w-72 border-l border-[rgba(157,78,221,0.1)] p-5 space-y-4 overflow-y-auto hidden lg:block">
            <div>
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2">Agent Details</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8888aa]">Model</span>
                  <span className="text-white font-mono">{agent.model || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8888aa]">Uptime</span>
                  <span className="text-white font-mono">{agent.uptime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8888aa]">Latency</span>
                  <span className="font-mono" style={{ color: agent.latency > 300 ? '#ffaa00' : '#00ff88' }}>
                    {agent.latency}ms
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8888aa]">Requests</span>
                  <span className="text-white font-mono">{agent.requests.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[rgba(157,78,221,0.1)] pt-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2">Capabilities</div>
              <div className="flex flex-wrap gap-1.5">
                {agent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 rounded-full border border-[rgba(157,78,221,0.3)] text-[#9d4edd] bg-[rgba(157,78,221,0.1)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Hermes-specific info */}
            {agent.type === 'hermes' && (
              <div className="border-t border-[rgba(157,78,221,0.1)] pt-4">
                <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2">Hermes Features</div>
                <div className="space-y-1.5 text-[11px] text-[#ccccdd]">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />2,550+ Skills</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />20+ LLM Providers</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />MCP Server Support</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />Browser Automation</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />Voice & TTS</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />19+ Messaging Platforms</div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />OpenAI-Compatible API</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView, setControlRoomAgent } = useOSStore();
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'mc', label: 'Mission Control', desc: 'View all agents status', action: () => setActiveView('mission-control') },
    { id: 'claude', label: 'Claude Control Room', desc: 'Open Claude control room', action: () => setControlRoomAgent('claude') },
    { id: 'openclaw', label: 'OpenClaw Control Room', desc: 'Open OpenClaw control room', action: () => setControlRoomAgent('openclaw') },
    { id: 'hermes', label: 'Hermes Control Room', desc: 'Open Hermes control room', action: () => setControlRoomAgent('hermes') },
    { id: 'agents', label: 'Agents Overview', desc: 'View all registered agents', action: () => setActiveView('agents') },
    { id: 'goals', label: 'S.E.L.F Goals', desc: 'View and manage goals', action: () => setActiveView('goals') },
    { id: 'journal', label: 'S.E.L.F Journal', desc: 'View journal entries', action: () => setActiveView('journal') },
    { id: 'memory', label: 'S.E.L.F Memory', desc: 'View memory store', action: () => setActiveView('memory') },
    { id: 'cloud', label: 'Cloud Status', desc: 'Check cloud infrastructure', action: () => setActiveView('cloud') },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.desc.toLowerCase().includes(query.toLowerCase())
  );

  if (!commandPaletteOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => {
        setCommandPaletteOpen(false);
        setQuery('');
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-[90vw] max-w-lg rounded-2xl border border-[rgba(157,78,221,0.2)] bg-[#0d0d20] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(157,78,221,0.1)]">
          <Search size={16} className="text-[#8888aa]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-[#8888aa] focus:outline-none"
            autoFocus
          />
          <kbd className="text-[10px] text-[#8888aa] bg-[rgba(157,78,221,0.1)] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                setCommandPaletteOpen(false);
                setQuery('');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(157,78,221,0.1)] transition-colors group"
            >
              <Command size={14} className="text-[#9d4edd]" />
              <div>
                <div className="text-white text-sm">{cmd.label}</div>
                <div className="text-[#8888aa] text-xs">{cmd.desc}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-[#8888aa] text-sm">No commands found</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SelfView({ type }: { type: 'goals' | 'journal' | 'memory' }) {
  const { selfData } = useOSStore();

  const data = selfData[type];
  const icons: Record<string, string> = {
    goals: '🎯',
    journal: '📓',
    memory: '🧠',
  };

  const colors: Record<string, string> = {
    goals: '#00ffff',
    journal: '#9d4edd',
    memory: '#00ff88',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icons[type]}</span>
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">S.E.L.F — {type}</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[rgba(157,78,221,0.2)] text-[#9d4edd] font-mono">
          {data.length} entries
        </span>
      </div>

      <div className="grid gap-3">
        {data.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] p-4 flex items-start gap-3 card-hover"
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: colors[type] }}
            />
            <p className="text-[#ccccdd] text-sm leading-relaxed">{item}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

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
    { title: 'Computer Use', desc: 'Full macOS desktop automation', icon: '🖥️', color: '#00ffff' },
    { title: 'Memory System', desc: '8 providers + MEMORY.md persistence', icon: '🧠', color: '#9d4edd' },
    { title: 'Coding Delegation', desc: 'Claude Code, Codex, OpenCode CLIs', icon: '⚙️', color: '#00ff88' },
    { title: 'Home Assistant', desc: 'Smart home integration', icon: '🏠', color: '#ffaa00' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {features.map((feat, i) => (
        <motion.div
          key={feat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] p-4 card-hover"
        >
          <div className="text-2xl mb-2">{feat.icon}</div>
          <h4 className="text-white text-sm font-semibold mb-1">{feat.title}</h4>
          <p className="text-[#8888aa] text-xs">{feat.desc}</p>
          <div className="mt-2 h-0.5 w-8 rounded-full" style={{ backgroundColor: feat.color }} />
        </motion.div>
      ))}
    </div>
  );
}

export function NetworkTopology() {
  const { agents } = useOSStore();
  const center = { x: 200, y: 120 };

  const nodes = [
    { ...center, label: 'HUB', color: '#9d4edd', size: 20 },
    ...agents.map((agent, i) => {
      const angle = ((i + 1) / agents.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 80;
      return {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        label: agent.name,
        color: agent.color,
        size: 14,
      };
    }),
  ];

  return (
    <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-5">
      <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3">Network Topology</div>
      <svg viewBox="0 0 400 240" className="w-full">
        {/* Connection lines */}
        {nodes.slice(1).map((node, i) => (
          <g key={`line-${i}`}>
            <line
              x1={center.x}
              y1={center.y}
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeWidth="1"
              strokeOpacity="0.3"
            />
            <motion.circle
              r="2"
              fill={node.color}
              initial={{ cx: center.x, cy: center.y }}
              animate={{ cx: node.x, cy: node.y }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.5 }}
            />
          </g>
        ))}

        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <circle cx={node.x} cy={node.y} r={node.size} fill={`${node.color}22`} stroke={node.color} strokeWidth="1.5" />
            <circle cx={node.x} cy={node.y} r={node.size * 0.5} fill={`${node.color}44`} />
            <text x={node.x} y={node.y + node.size + 14} textAnchor="middle" fill="#8888aa" fontSize="9" fontFamily="monospace">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function CloudView() {
  const services = [
    { name: 'API Gateway', status: 'operational', uptime: '99.99%', latency: '12ms' },
    { name: 'Agent Runtime', status: 'operational', uptime: '99.95%', latency: '45ms' },
    { name: 'Model Router', status: 'operational', uptime: '99.97%', latency: '8ms' },
    { name: 'Memory Store', status: 'degraded', uptime: '98.2%', latency: '156ms' },
    { name: 'Skill Registry', status: 'operational', uptime: '99.99%', latency: '23ms' },
    { name: 'Browser Pool', status: 'operational', uptime: '99.9%', latency: '89ms' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl uppercase tracking-wider">Cloud Infrastructure</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] font-mono">
          5/6 OPERATIONAL
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((svc, i) => (
          <motion.div
            key={svc.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] p-4 card-hover"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-medium">{svc.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  svc.status === 'operational'
                    ? 'bg-[#00ff88]/15 text-[#00ff88]'
                    : 'bg-[#ffaa00]/15 text-[#ffaa00]'
                }`}
              >
                {svc.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-xs text-[#8888aa]">
              <span>Uptime: <span className="text-white font-mono">{svc.uptime}</span></span>
              <span>Latency: <span className="text-white font-mono">{svc.latency}</span></span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
