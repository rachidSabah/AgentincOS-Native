'use client';

import { useOSStore } from '@/lib/store';
import type { AgentStatus } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  MessageSquare, Search, BarChart3,
  Activity, Zap, ArrowUpRight, ArrowDownRight,
  ChevronRight,
  Database, Network, Cpu,
  Server, Brain, HardDrive, DollarSign,
  FolderKanban, Gem, Clock, Layers,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// ─── Shared Components ───

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[rgba(18,18,42,0.6)] backdrop-blur-sm border border-[rgba(157,78,221,0.15)] rounded-xl p-4 transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.08)] ${className}`}>
      {children}
    </div>
  );
}

function StatusDot({ status, color }: { status: string; color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      {status === 'live' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
          style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: color }} />
    </span>
  );
}

const STATUS_COLORS: {[key: string]: string} = {
  live: '#00ff88',
  degraded: '#FFB627',
  offline: '#ff4444',
  booting: '#4285F4',
  error: '#E63946',
};

const HEALTH_COLORS: {[key: string]: string} = {
  healthy: '#00ff88',
  degraded: '#FFB627',
  offline: '#ff4444',
  unknown: '#8888aa',
};

// ─── Welcome Banner ───

function WelcomeBanner() {
  const { setActiveView, systemMetrics } = useOSStore();
  const [time, setTime] = useState<Date>(() => new Date());
  const particles = useState<Array<{id: number; x: number; y: number; size: number; duration: number; delay: number; color: string}>>(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      color: Math.random() > 0.5 ? '#00ffff' : '#9d4edd',
    }))
  )[0];

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    { label: 'Brain Layer', icon: Brain, color: '#9d4edd', view: 'settings' as const },
    { label: 'Providers', icon: Server, color: '#00ffff', view: 'settings' as const },
    { label: 'Knowledge', icon: Database, color: '#00ff88', view: 'knowledge' as const },
    { label: 'Analytics', icon: BarChart3, color: '#FFB627', view: 'observability' as const },
  ];

  const activeProviders = systemMetrics.activeProviders;
  const activeAgents = systemMetrics.activeAgents;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[rgba(0,255,255,0.08)] via-[rgba(157,78,221,0.06)] to-[rgba(10,10,26,0.8)] border border-[rgba(0,255,255,0.15)] p-6">
      {/* Animated particles */}
      {particles.map(p => (
        <motion.div key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
            y: [0, -20, 0],
          }}
          transition={{
            duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut',
          }}
        />
      ))}

      <div className="relative z-10">
        <motion.h1
          className="text-2xl sm:text-3xl font-bold mb-1"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00ffff] via-[#9d4edd] to-[#00ffff] bg-[length:200%_auto] animate-gradient">
            Welcome to Agentic OS
          </span>
        </motion.h1>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[10px] text-[#00ff88] font-medium">{activeProviders} Providers · {activeAgents} Agents Active</span>
            </div>
            <span className="text-[10px] text-[#8888aa]">
              {time ? time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
            </span>
            <span className="text-[10px] font-mono text-[#ccccdd]">
              {time ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2">
          {quickActions.map(action => (
            <button key={action.label}
              onClick={() => setActiveView(action.view)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor: `${action.color}30`,
                backgroundColor: `${action.color}08`,
                color: action.color,
              }}>
              <action.icon size={13} />
              {action.label}
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── System Overview Cards ───

function SystemOverviewCards() {
  const { systemMetrics, totalCost, totalTokensUsed } = useOSStore();

  const cards = [
    { label: 'Active Providers', value: systemMetrics.activeProviders, icon: Server, color: '#00ffff' },
    { label: 'Active Agents', value: systemMetrics.activeAgents, icon: Brain, color: '#9d4edd' },
    { label: 'Total Tokens', value: totalTokensUsed > 1_000_000 ? `${(totalTokensUsed / 1_000_000).toFixed(1)}M` : totalTokensUsed > 1000 ? `${(totalTokensUsed / 1000).toFixed(1)}K` : totalTokensUsed, icon: Cpu, color: '#00ff88' },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, icon: DollarSign, color: '#FFB627' },
    { label: 'Knowledge', value: systemMetrics.knowledgeEntries, icon: Database, color: '#4285F4' },
    { label: 'Memories', value: systemMetrics.memoryEntries, icon: Layers, color: '#E8751A' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <motion.div key={card.label}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-[rgba(18,18,42,0.6)] backdrop-blur-sm border border-[rgba(157,78,221,0.15)] rounded-xl p-3 transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.08)]">
          <div className="flex items-center gap-1.5 mb-2">
            <card.icon size={12} style={{ color: card.color }} />
            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{card.label}</span>
          </div>
          <div className="text-white font-mono font-bold text-lg" style={{ color: card.color }}>
            {card.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Agent Status Row ───

function AgentStatusRow() {
  const { agents, setActiveView } = useOSStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {agents.map((agent, i) => (
        <motion.button key={agent.id}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          onClick={() => setActiveView('mission-control')}
          className="GlassCard bg-[rgba(18,18,42,0.6)] backdrop-blur-sm border border-[rgba(157,78,221,0.15)] rounded-xl p-3 text-left transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.08)] group">
          <div className="flex items-center gap-2 mb-2">
            <StatusDot status={agent.status} color={STATUS_COLORS[agent.status] || agent.color} />
            <span className="text-white text-xs font-semibold">{agent.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase">Latency</div>
              <div className="text-[11px] font-mono font-bold"
                style={{ color: agent.latency < 100 ? '#00ff88' : agent.latency < 200 ? '#FFB627' : '#E63946' }}>
                {agent.latency}ms
              </div>
            </div>
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase">Requests</div>
              <div className="text-[11px] font-mono font-bold text-[#ccccdd]">
                {agent.requests > 1000 ? `${(agent.requests / 1000).toFixed(1)}k` : agent.requests}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[8px] text-[#8888aa] group-hover:text-[#00ffff] transition-colors">
            <span>View</span> <ChevronRight size={8} />
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ─── Provider Status Cards ───

function ProviderStatusCards() {
  const { providers } = useOSStore();
  const enabledProviders = providers.filter(p => p.enabled);

  if (enabledProviders.length === 0) {
    return (
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-[#00ffff]" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">Providers</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-6 text-[#8888aa] text-xs">
          No providers enabled. Configure providers in Settings.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-[#00ffff]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Providers</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">{enabledProviders.length} enabled</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {enabledProviders.map((provider, i) => {
          const healthColor = HEALTH_COLORS[provider.healthStatus] || '#8888aa';
          const TypeIcon = provider.type === 'local' ? HardDrive : provider.type === 'cli' ? Zap : Server;
          return (
            <motion.div key={provider.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(10,10,26,0.4)] transition-colors">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: `${provider.color}15`, border: `1px solid ${provider.color}25` }}>
                {provider.icon || '🔌'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-white">{provider.name}</span>
                  <TypeIcon size={8} style={{ color: provider.color }} />
                  <span className="text-[8px] text-[#8888aa] font-mono truncate">{provider.defaultModel}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: healthColor }} />
                <span className="text-[8px] font-mono uppercase" style={{ color: healthColor }}>
                  {provider.healthStatus}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── Gemini CLI Status ───

function GeminiCLIStatus() {
  const { geminiCLI } = useOSStore();

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gem size={14} className="text-[#4285F4]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Gemini CLI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${geminiCLI.running ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: geminiCLI.installed ? (geminiCLI.running ? '#00ff88' : '#FFB627') : '#ff4444' }} />
          <span className="text-[8px] font-mono uppercase" style={{
            color: geminiCLI.installed ? (geminiCLI.running ? '#00ff88' : '#FFB627') : '#ff4444'
          }}>
            {geminiCLI.installed ? (geminiCLI.running ? 'Running' : 'Installed') : 'Not Installed'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Model</div>
          <div className="text-[11px] font-mono text-[#ccccdd]">{geminiCLI.model || '—'}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Version</div>
          <div className="text-[11px] font-mono text-[#ccccdd]">{geminiCLI.version || '—'}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Auto-Detect</div>
          <div className="text-[11px] font-mono" style={{ color: geminiCLI.autoDetect ? '#00ff88' : '#ff4444' }}>
            {geminiCLI.autoDetect ? 'Yes' : 'No'}
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Auto-Start</div>
          <div className="text-[11px] font-mono" style={{ color: geminiCLI.autoStart ? '#00ff88' : '#ff4444' }}>
            {geminiCLI.autoStart ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {geminiCLI.projects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)]">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-2">Projects</div>
          <div className="space-y-1">
            {geminiCLI.projects.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center gap-2 text-[9px]">
                <FolderKanban size={9} className="text-[#4285F4] flex-shrink-0" />
                <span className="text-[#ccccdd] truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Recent Activity (from executionLogs) ───

function RecentActivities() {
  const { executionLogs } = useOSStore();

  const LOG_ICONS: {[key: string]: string} = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
  };

  const LOG_COLORS: {[key: string]: string} = {
    info: '#00ffff',
    warn: '#FFB627',
    error: '#E63946',
    success: '#00ff88',
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#00ff88]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Recent Activity</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">{executionLogs.length} events</span>
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {executionLogs.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No recent activity yet
          </div>
        )}
        {executionLogs.slice(0, 12).map((log, i) => {
          const levelColor = LOG_COLORS[log.level] || '#8888aa';
          const timeStr = log.timestamp
            ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '';
          return (
            <motion.div key={log.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[rgba(10,10,26,0.4)] transition-colors">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm mt-0.5"
                style={{ backgroundColor: `${levelColor}15`, border: `1px solid ${levelColor}25` }}>
                {LOG_ICONS[log.level] || '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold" style={{ color: levelColor }}>{log.source}</span>
                  {log.model && <span className="text-[8px] text-[#8888aa] font-mono">{log.model}</span>}
                  <span className="text-[8px] text-[#8888aa]">{timeStr}</span>
                </div>
                <p className="text-[10px] text-[#ccccdd] leading-relaxed line-clamp-2">{log.message}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── System Resource Metrics ───

function SystemResourceMetrics() {
  const { systemMetrics } = useOSStore();

  const metrics = [
    { label: 'CPU', value: systemMetrics.cpu, color: '#00ff88' },
    { label: 'Memory', value: systemMetrics.memory, color: '#4285F4' },
    { label: 'Network', value: systemMetrics.network, color: '#FFB627' },
    { label: 'Disk', value: systemMetrics.disk, color: '#9d4edd' },
  ];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-[#00ff88]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">System Resources</span>
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map(m => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-[#8888aa] uppercase">{m.label}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: m.color }}>{m.value}%</span>
            </div>
            <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(m.value, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: m.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[rgba(157,78,221,0.1)]">
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Avg Latency</div>
          <div className="text-[11px] font-mono font-bold text-[#ccccdd]">{systemMetrics.avgLatency}ms</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Total Requests</div>
          <div className="text-[11px] font-mono font-bold text-[#ccccdd]">{systemMetrics.totalRequests.toLocaleString()}</div>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Brain Layer Status ───

function BrainLayerStatus() {
  const { brainConfig, brainTasks, setActiveView } = useOSStore();
  const runningTasks = brainTasks.filter(t => t.status === 'running');
  const recentCompleted = brainTasks.filter(t => t.status === 'completed').slice(0, 3);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[#9d4edd]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Brain Layer</span>
        </div>
        <button
          onClick={() => setActiveView('settings')}
          className="flex items-center gap-1 text-[9px] text-[#9d4edd] hover:text-white transition-colors"
        >
          Configure <ChevronRight size={8} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Config</div>
          <div className="text-[11px] font-mono font-bold text-[#9d4edd]">{brainConfig.name}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Reasoning</div>
          <div className="text-[11px] font-mono text-[#ccccdd] capitalize">{brainConfig.reasoningStyle.replace(/-/g, ' ')}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Temperature</div>
          <div className="text-[11px] font-mono text-[#FFB627]">{brainConfig.temperature}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Active Tasks</div>
          <div className="text-[11px] font-mono font-bold" style={{ color: runningTasks.length > 0 ? '#00ff88' : '#8888aa' }}>
            {runningTasks.length}
          </div>
        </div>
      </div>

      {/* Recent brain tasks */}
      {recentCompleted.length > 0 && (
        <div className="pt-2 border-t border-[rgba(157,78,221,0.1)]">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1.5">Recent Tasks</div>
          <div className="space-y-1">
            {recentCompleted.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-[9px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                <span className="text-[#ccccdd] truncate">{task.type.replace(/-/g, ' ')}</span>
                <span className="text-[#8888aa] ml-auto font-mono">{task.tokensUsed} tok</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Main Component ───

export function HomeDashboard() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* System Overview Cards */}
      <SystemOverviewCards />

      {/* Agent Status Row */}
      <AgentStatusRow />

      {/* Brain Layer + Provider Status + Gemini CLI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BrainLayerStatus />
        <ProviderStatusCards />
        <GeminiCLIStatus />
      </div>

      {/* Recent Activities + System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivities />
        <SystemResourceMetrics />
      </div>
    </div>
  );
}
