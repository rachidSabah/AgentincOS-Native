'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Cpu, HardDrive, Network, Zap, Clock, CheckCircle2,
  XCircle, DollarSign,
  Workflow, Flame, Server, Gauge, Eye,
} from 'lucide-react';
import { useMemo } from 'react';

// ─── Simulated Data ───

interface AgentDetail {
  id: string; name: string; activeTasks: number; pendingTasks: number;
  cpu: number; memory: number; rpm: number[]; lastAction: string; latencyMs: number;
}
const agentDetails: AgentDetail[] = [];

interface ToolCall {
  id: string; tool: string; agent: string; duration: number; status: 'success' | 'fail';
}
const toolCallsData: ToolCall[] = [];

interface Workflow {
  id: string; name: string; progress: number; currentStep: string; status: 'running' | 'completed' | 'pending';
}
const workflowsData: Workflow[] = [];

const costData = {
  totalTokens: { input: 0, output: 0 },
  byAgent: [] as Array<{ name: string; cost: number; color: string }>,
  dailyTrend: [] as number[],
  budgetUsed: 0,
  budgetTotal: 50,
};



// ─── Sub-Components ───

function StatusDot({ status }: { status: string }) {
  const color = status === 'live' ? '#00ff88' : status === 'degraded' ? '#FFB627' : '#8888aa';
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'live' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
          style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }} />
    </span>
  );
}

function MiniSparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${points} ${width},${height}`} fill={`${color}15`} stroke="none" />
    </svg>
  );
}

function CircularProgress({ value, max, color, size = 56, strokeWidth = 4, label }: {
  value: number; max: number; color: string; size?: number; strokeWidth?: number; label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-mono font-bold text-xs">{value}%</span>
        </div>
      </div>
      <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">{label}</span>
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[rgba(18,18,42,0.6)] backdrop-blur-sm border border-[rgba(157,78,221,0.15)] rounded-xl p-4 transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.08)] ${className}`}>
      {children}
    </div>
  );
}

// ─── Agent Status Card ───

function AgentStatusCard({ detail }: { detail: typeof agentDetails[0] }) {
  const { agents } = useOSStore();
  const agent = agents.find(a => a.id === detail.id);
  const status = agent?.status || 'live';
  const latencyColor = detail.latencyMs < 100 ? '#00ff88' : detail.latencyMs < 200 ? '#FFB627' : '#E63946';

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-white text-sm font-semibold">{detail.name}</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
            style={{ backgroundColor: `${latencyColor}20`, color: latencyColor }}>
            {status}
          </span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: latencyColor }}>
          {detail.latencyMs}ms
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Active</div>
          <div className="text-white font-mono font-bold text-lg">{detail.activeTasks}</div>
        </div>
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Pending</div>
          <div className="text-white font-mono font-bold text-lg">{detail.pendingTasks}</div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#8888aa]">CPU</span>
            <span className="text-[9px] font-mono text-[#ccccdd]">{detail.cpu}%</span>
          </div>
          <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${detail.cpu}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#00ffff88] to-[#00ffff]" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-[#8888aa]">Memory</span>
            <span className="text-[9px] font-mono text-[#ccccdd]">{detail.memory}%</span>
          </div>
          <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${detail.memory}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#9d4edd88] to-[#9d4edd]" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-[#8888aa]">Requests/min</span>
        <span className="text-[9px] font-mono text-[#00ffff]">{detail.rpm[detail.rpm.length - 1]}</span>
      </div>
      <MiniSparkline data={detail.rpm} color={agent?.color || '#00ffff'} />

      <div className="mt-3 pt-2 border-t border-[rgba(157,78,221,0.1)]">
        <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">Last Action</div>
        <div className="text-[10px] text-[#ccccdd] truncate">{detail.lastAction}</div>
      </div>
    </GlassCard>
  );
}

// ─── System Metrics Panel ───

function SystemMetricsPanel() {
  const { systemMetrics } = useOSStore();

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={14} className="text-[#00ffff]" />
        <span className="text-white text-xs font-bold uppercase tracking-wider">System Metrics</span>
      </div>

      <div className="flex items-center justify-around mb-4">
        <CircularProgress value={systemMetrics.cpu ?? 0} max={100} color="#00ffff" label="CPU" />
        <CircularProgress value={systemMetrics.memory ?? 0} max={100} color="#9d4edd" label="Memory" />
        <CircularProgress value={systemMetrics.network ?? 0} max={100} color="#00ff88" label="Network" />
        <CircularProgress value={systemMetrics.disk ?? 0} max={100} color="#FFB627" label="Disk" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Active Agents', value: systemMetrics.activeAgents ?? 0, icon: Server, color: '#00ff88' },
          { label: 'Total Requests', value: (systemMetrics.totalRequests ?? 0).toLocaleString('en-US'), icon: Activity, color: '#00ffff' },
          { label: 'Avg Latency', value: `${systemMetrics.avgLatency ?? 0}ms`, icon: Clock, color: '#FFB627' },
          { label: 'Vault Size', value: `${systemMetrics.vaultSize ?? 0}GB`, icon: HardDrive, color: '#9d4edd' },
        ].map(item => (
          <div key={item.label} className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2.5 flex items-center gap-2">
            <item.icon size={12} style={{ color: item.color }} />
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">{item.label}</div>
              <div className="text-white font-mono font-bold text-sm">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Tool Calls Panel ───

function ToolCallsPanel() {
  const successCount = toolCallsData.filter(t => t.status === 'success').length;
  const successRate = toolCallsData.length > 0 ? Math.round((successCount / toolCallsData.length) * 100) : 0;

  const callsByAgent = useMemo(() => {
    const map = new Map<string, { name: string; count: number; color: string }>();
    const colorMap: Record<string, string> = {
      Claude: '#E63946', Hermes: '#FFB627', OpenClaw: '#E8751A', 'Self Vault': '#2E86AB',
    };
    toolCallsData.forEach(call => {
      if (!map.has(call.agent)) {
        map.set(call.agent, { name: call.agent, count: 0, color: colorMap[call.agent] || '#8888aa' });
      }
      map.get(call.agent)!.count++;
    });
    return Array.from(map.values());
  }, [toolCallsData]);
  const maxCalls = Math.max(...callsByAgent.map(a => a.count), 1);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#FFB627]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Tool Calls</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#8888aa]">Success Rate</span>
          <span className="text-[10px] font-mono font-bold text-[#00ff88]">{successRate}%</span>
        </div>
      </div>

      <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {toolCallsData.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No tool calls recorded yet
          </div>
        )}
        <AnimatePresence>
          {toolCallsData.map((call, i) => (
            <motion.div key={call.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 bg-[rgba(10,10,26,0.4)] rounded-lg p-2">
              {call.status === 'success'
                ? <CheckCircle2 size={12} className="text-[#00ff88] flex-shrink-0" />
                : <XCircle size={12} className="text-[#E63946] flex-shrink-0" />}
              <span className="text-[10px] font-mono text-white flex-1 truncate">{call.tool}</span>
              <span className="text-[9px] text-[#8888aa]">{call.agent}</span>
              <span className="text-[9px] font-mono text-[#ccccdd]">{call.duration}s</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Calls by Agent</div>
        <div className="space-y-1.5">
          {callsByAgent.map(agent => (
            <div key={agent.name} className="flex items-center gap-2">
              <span className="text-[9px] text-[#ccccdd] w-16">{agent.name}</span>
              <div className="flex-1 h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(agent.count / maxCalls) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full" style={{ backgroundColor: agent.color }} />
              </div>
              <span className="text-[9px] font-mono text-[#ccccdd] w-4 text-right">{agent.count}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Cost & Token Usage Panel ───

function CostTokenPanel() {
  const totalCost = costData.byAgent.reduce((s, a) => s + a.cost, 0);
  const budgetPct = Math.min((costData.budgetUsed / costData.budgetTotal) * 100, 100);
  const budgetColor = budgetPct > 90 ? '#E63946' : budgetPct > 70 ? '#FFB627' : '#00ff88';

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={14} className="text-[#00ff88]" />
        <span className="text-white text-xs font-bold uppercase tracking-wider">Cost & Tokens</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2.5">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Input Tokens</div>
          <div className="text-white font-mono font-bold text-sm">{(costData.totalTokens.input / 1_000_000).toFixed(1)}M</div>
        </div>
        <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-2.5">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Output Tokens</div>
          <div className="text-white font-mono font-bold text-sm">{(costData.totalTokens.output / 1_000_000).toFixed(1)}M</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Cost by Agent</div>
        {costData.byAgent.length === 0 ? (
          <div className="text-[#8888aa] text-xs py-2">No cost data yet</div>
        ) : (
          <div className="space-y-1.5">
            {costData.byAgent.map(agent => (
              <div key={agent.name} className="flex items-center gap-2">
                <span className="text-[9px] text-[#ccccdd] w-16">{agent.name}</span>
                <div className="flex-1 h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(agent.cost / totalCost) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: agent.color }} />
                </div>
                <span className="text-[9px] font-mono text-[#ccccdd] w-10 text-right">${agent.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Daily Cost Trend</div>
        {costData.dailyTrend.length > 0 ? (
          <MiniSparkline data={costData.dailyTrend} color="#00ff88" width={200} height={32} />
        ) : (
          <div className="text-[#8888aa] text-xs py-2">No trend data yet</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#8888aa]">Budget Used</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: budgetColor }}>
            ${costData.budgetUsed.toFixed(2)} / ${costData.budgetTotal.toFixed(2)}
          </span>
        </div>
        <div className="h-2 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full" style={{ backgroundColor: budgetColor }} />
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Workflow Status Panel ───

function WorkflowStatusPanel() {
  const running = workflowsData.filter(w => w.status === 'running').length;
  const pending = workflowsData.filter(w => w.status === 'pending').length;
  const completed = workflowsData.filter(w => w.status === 'completed').length;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Workflow size={14} className="text-[#9d4edd]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Workflows</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFB627]/15 text-[#FFB627] font-bold">{running} Running</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(136,136,170,0.15)] text-[#8888aa] font-bold">{pending} Pending</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] font-bold">{completed} Done</span>
        </div>
      </div>

      <div className="space-y-2">
        {workflowsData.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No workflows yet
          </div>
        )}
        {workflowsData.map((wf, i) => {
          const statusColor = wf.status === 'running' ? '#FFB627' : wf.status === 'completed' ? '#00ff88' : '#8888aa';
          return (
            <motion.div key={wf.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[rgba(10,10,26,0.4)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white font-medium truncate mr-2">{wf.name}</span>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                  {wf.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${wf.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: statusColor }} />
                </div>
                <span className="text-[9px] font-mono text-[#ccccdd]">{wf.progress}%</span>
              </div>
              <div className="text-[9px] text-[#8888aa]">{wf.currentStep}</div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── Latency Heatmap Panel ───

function LatencyHeatmapPanel() {
  const data = useMemo(() => [] as Array<{ agent: string; hours: number[] }>, []);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-[#E63946]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Latency Heatmap</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">Last 24h</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[360px]">
          {/* Hour labels */}
          <div className="flex items-center mb-1 ml-16">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center">
                {h % 4 === 0 && <span className="text-[7px] text-[#8888aa] font-mono">{h}</span>}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {data.length === 0 && (
            <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
              No latency data yet
            </div>
          )}
          {data.map(row => (
            <div key={row.agent} className="flex items-center gap-1 mb-1">
              <span className="text-[9px] text-[#ccccdd] w-14 text-right pr-1">{row.agent}</span>
              <div className="flex flex-1 gap-[1px]">
                {row.hours.map((latency, h) => {
                  const color = latency < 100 ? '#00ff88' : latency < 300 ? '#FFB627' : '#E63946';
                  const opacity = Math.min(0.3 + (latency / 400) * 0.7, 1);
                  return (
                    <motion.div key={h}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: h * 0.02 }}
                      className="flex-1 h-5 rounded-sm"
                      style={{ backgroundColor: color, opacity }}
                      title={`${row.agent} @ ${h}:00 — ${Math.round(latency)}ms`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[rgba(157,78,221,0.1)]">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]" />
          <span className="text-[8px] text-[#8888aa]">&lt;100ms</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FFB627]" />
          <span className="text-[8px] text-[#8888aa]">&lt;300ms</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#E63946]" />
          <span className="text-[8px] text-[#8888aa]">&gt;300ms</span>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Main Component ───

export function AgentObservability() {
  const { agents, systemMetrics } = useOSStore();
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[rgba(0,255,255,0.1)] border border-[rgba(0,255,255,0.2)] flex items-center justify-center">
            <Eye size={16} className="text-[#00ffff]" />
          </div>
          <div>
            <h2 className="text-white text-sm font-bold">Agent Observability</h2>
            <p className="text-[10px] text-[#8888aa]">Real-time monitoring & metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.15)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[9px] text-[#00ff88] font-mono">
              {agents.filter(a => a.status === 'live').length}/{agents.length} agents live
            </span>
          </div>
          <span className="text-[9px] text-[#8888aa] font-mono">
            {(systemMetrics.totalRequests ?? 0).toLocaleString('en-US')} total req
          </span>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {agentDetails.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No agent data available yet
          </div>
        )}
        {agentDetails.map((detail, i) => (
          <motion.div key={detail.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}>
            <AgentStatusCard detail={detail} />
          </motion.div>
        ))}
      </div>

      {/* System Metrics + Tool Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemMetricsPanel />
        <ToolCallsPanel />
      </div>

      {/* Cost & Tokens + Workflow Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostTokenPanel />
        <WorkflowStatusPanel />
      </div>

      {/* Latency Heatmap */}
      <LatencyHeatmapPanel />
    </div>
  );
}
