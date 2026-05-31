'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Cpu, HardDrive, Network, Zap, Clock, CheckCircle2,
  XCircle, DollarSign,
  Workflow, Flame, Server, Gauge, Eye,
} from 'lucide-react';
import { useMemo } from 'react';

// ─── Heatmap Data Generator ───

function generateHeatmapData() {
  const agents = ['Claude', 'OpenClaw', 'Hermes', 'Self Vault'];
  return agents.map(agent => {
    const hours: number[] = [];
    for (let h = 0; h < 24; h++) {
      if (agent === 'Self Vault') hours.push(Math.random() * 80 + 10);
      else if (agent === 'OpenClaw') hours.push(Math.random() * 200 + 40);
      else if (agent === 'Hermes') hours.push(Math.random() * 300 + 60);
      else hours.push(Math.random() * 250 + 50);
    }
    return { agent, hours };
  });
}

// ─── Simulated Data ───

const agentDetails = [
  {
    id: 'claude',
    name: 'Claude',
    activeTasks: 7,
    pendingTasks: 3,
    cpu: 42,
    memory: 58,
    rpm: [12, 18, 14, 22, 19, 25, 21, 28, 24, 20],
    lastAction: 'Reasoning pipeline — multi-step planning',
    latencyMs: 142,
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    activeTasks: 4,
    pendingTasks: 2,
    cpu: 28,
    memory: 35,
    rpm: [8, 11, 9, 14, 12, 16, 13, 18, 15, 10],
    lastAction: 'Routing task to Hermes — skill execution',
    latencyMs: 89,
  },
  {
    id: 'hermes',
    name: 'Hermes',
    activeTasks: 12,
    pendingTasks: 5,
    cpu: 67,
    memory: 72,
    rpm: [22, 28, 25, 34, 30, 38, 33, 42, 36, 29],
    lastAction: 'Web research — competitor analysis',
    latencyMs: 203,
  },
  {
    id: 'vault',
    name: 'Self Vault',
    activeTasks: 2,
    pendingTasks: 1,
    cpu: 12,
    memory: 24,
    rpm: [45, 52, 48, 61, 55, 64, 58, 70, 62, 50],
    lastAction: 'Memory sync — OMI export 47 notes',
    latencyMs: 34,
  },
];

const toolCallsData = [
  { id: '1', tool: 'web_search', agent: 'Hermes', duration: 1.2, status: 'success' as const },
  { id: '2', tool: 'code_execute', agent: 'Claude', duration: 3.4, status: 'success' as const },
  { id: '3', tool: 'memory_store', agent: 'Self Vault', duration: 0.03, status: 'success' as const },
  { id: '4', tool: 'route_task', agent: 'OpenClaw', duration: 0.08, status: 'success' as const },
  { id: '5', tool: 'browser_automation', agent: 'Hermes', duration: 8.7, status: 'success' as const },
  { id: '6', tool: 'api_call', agent: 'Hermes', duration: 2.1, status: 'fail' as const },
  { id: '7', tool: 'file_read', agent: 'Claude', duration: 0.5, status: 'success' as const },
  { id: '8', tool: 'vision_analyze', agent: 'Claude', duration: 4.2, status: 'success' as const },
  { id: '9', tool: 'skill_execute', agent: 'Hermes', duration: 6.8, status: 'success' as const },
  { id: '10', tool: 'permission_check', agent: 'OpenClaw', duration: 0.02, status: 'success' as const },
];

const workflowsData = [
  { id: 'w1', name: 'Competitor Intelligence Pipeline', progress: 72, currentStep: 'Scraping pricing pages', status: 'running' as const },
  { id: 'w2', name: 'Daily Digest Generator', progress: 100, currentStep: 'Complete', status: 'completed' as const },
  { id: 'w3', name: 'Memory Compaction Routine', progress: 45, currentStep: 'Embedding consolidation', status: 'running' as const },
  { id: 'w4', name: 'SEO Content Silo Builder', progress: 0, currentStep: 'Queued', status: 'pending' as const },
];

const costData = {
  totalTokens: { input: 4_200_000, output: 1_800_000 },
  byAgent: [
    { name: 'Claude', cost: 12.40, color: '#E63946' },
    { name: 'Hermes', cost: 28.90, color: '#FFB627' },
    { name: 'OpenClaw', cost: 8.30, color: '#E8751A' },
    { name: 'Self Vault', cost: 1.20, color: '#2E86AB' },
  ],
  dailyTrend: [8, 12, 10, 15, 14, 18, 22, 19, 24, 21, 26, 23, 28, 25],
  budgetUsed: 50.80,
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
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
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
        <CircularProgress value={systemMetrics.cpu} max={100} color="#00ffff" label="CPU" />
        <CircularProgress value={systemMetrics.memory} max={100} color="#9d4edd" label="Memory" />
        <CircularProgress value={systemMetrics.network} max={100} color="#00ff88" label="Network" />
        <CircularProgress value={systemMetrics.disk} max={100} color="#FFB627" label="Disk" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Active Agents', value: systemMetrics.activeAgents, icon: Server, color: '#00ff88' },
          { label: 'Total Requests', value: systemMetrics.totalRequests.toLocaleString(), icon: Activity, color: '#00ffff' },
          { label: 'Avg Latency', value: `${systemMetrics.avgLatency}ms`, icon: Clock, color: '#FFB627' },
          { label: 'Vault Size', value: `${systemMetrics.vaultSize}GB`, icon: HardDrive, color: '#9d4edd' },
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
  const successRate = Math.round((successCount / toolCallsData.length) * 100);

  const callsByAgent = [
    { name: 'Claude', count: 3, color: '#E63946' },
    { name: 'Hermes', count: 4, color: '#FFB627' },
    { name: 'OpenClaw', count: 2, color: '#E8751A' },
    { name: 'Self Vault', count: 1, color: '#2E86AB' },
  ];
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
      </div>

      <div className="mb-3">
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Daily Cost Trend</div>
        <MiniSparkline data={costData.dailyTrend} color="#00ff88" width={200} height={32} />
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
  const data = useMemo(() => generateHeatmapData(), []);

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
            {systemMetrics.totalRequests.toLocaleString()} total req
          </span>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
