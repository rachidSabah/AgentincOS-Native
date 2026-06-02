'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Cpu, MemoryStick, HardDrive, Wifi, Zap,
  Play, Square, Trash2, RefreshCw, Search, X,
  AlertTriangle, CheckCircle2, XCircle, Clock,
  Filter, Eye, ArrowUpDown, Radio, Terminal,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

// ─── Color Constants ───
const CYBER_GREEN = '#00ff88';
const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#E63946';
const CYBER_AMBER = '#FFB627';
const CYBER_PURPLE = '#9d4edd';
const GOOGLE_BLUE = '#4285f4';

// ─── Types ───
interface RunningProcess {
  pid: number;
  command: string;
  cpu: number;
  memory: number;
  startedAt: number;
  output?: string;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
}

type LogLevel = 'info' | 'warn' | 'error' | 'success';

/* ═══════════════════════════════════════════════════════════
   LIVE EXECUTION VIEWER — Main Export
   ═══════════════════════════════════════════════════════════ */
export function LiveExecutionViewer() {
  const { agents, systemMetrics, executionLogs, addExecutionLog, logs } = useOSStore();
  const [activePanel, setActivePanel] = useState<'commands' | 'agents' | 'resources' | 'logs'>('commands');

  const panels: { id: typeof activePanel; label: string; icon: typeof Activity }[] = [
    { id: 'commands', label: 'Commands', icon: Terminal },
    { id: 'agents', label: 'Agents', icon: Activity },
    { id: 'resources', label: 'Resources', icon: Cpu },
    { id: 'logs', label: 'Logs', icon: Eye },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CYBER_CYAN}25, ${CYBER_CYAN}08)`, border: `1px solid ${CYBER_CYAN}25` }}>
            <Activity size={16} style={{ color: CYBER_CYAN }} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">Live Execution Viewer</h2>
            <div className="text-[10px] text-[#8888aa] flex items-center gap-2">
              <span style={{ color: CYBER_GREEN }}>●</span> Real-time monitoring
              <span>· Agents: {agents.length}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {panels.map(panel => (
            <button key={panel.id} onClick={() => setActivePanel(panel.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                activePanel === panel.id ? 'text-white' : 'text-[#8888aa] hover:text-white'
              }`}
              style={activePanel === panel.id ? {
                background: `${CYBER_CYAN}12`,
                border: `1px solid ${CYBER_CYAN}25`,
              } : { border: '1px solid transparent' }}>
              <panel.icon size={12} style={{ color: activePanel === panel.id ? CYBER_CYAN : '#8888aa' }} />
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div key={activePanel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activePanel === 'commands' && <CommandsPanel />}
            {activePanel === 'agents' && <AgentsPanel />}
            {activePanel === 'resources' && <ResourcesPanel />}
            {activePanel === 'logs' && <LogsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RUNNING COMMANDS PANEL
   ═══════════════════════════════════════════════════════════ */
function CommandsPanel() {
  const { addExecutionLog } = useOSStore();
  const [processes, setProcesses] = useState<RunningProcess[]>([
    { pid: 1234, command: 'bun run dev', cpu: 12.4, memory: 8.2, startedAt: Date.now() - 3600000, output: 'Dev server running on port 3000' },
    { pid: 5678, command: 'gemini serve --port 3100', cpu: 6.8, memory: 5.2, startedAt: Date.now() - 7200000, output: 'Gemini CLI server listening' },
    { pid: 9012, command: 'next build', cpu: 45.2, memory: 18.4, startedAt: Date.now() - 300000, output: 'Compiling...' },
  ]);
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandOutput, setCommandOutput] = useState<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([]);

  const killProcess = useCallback((pid: number) => {
    setProcesses(prev => prev.filter(p => p.pid !== pid));
    addExecutionLog({
      id: `kill-${Date.now()}`,
      timestamp: Date.now(),
      level: 'warn',
      source: 'ExecutionViewer',
      message: `Process killed: PID ${pid}`,
    });
  }, [addExecutionLog]);

  const executeCommand = useCallback(async () => {
    if (!commandInput.trim() || isExecuting) return;
    const cmd = commandInput.trim();
    setCommandOutput(prev => [...prev, { type: 'input', text: cmd }]);
    setCommandInput('');
    setIsExecuting(true);

    // Simulate adding a process
    const newPid = Math.floor(Math.random() * 9000) + 1000;
    setProcesses(prev => [...prev, {
      pid: newPid,
      command: cmd,
      cpu: Math.random() * 15,
      memory: Math.random() * 10,
      startedAt: Date.now(),
      output: 'Starting...',
    }]);

    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', command: cmd, shell: 'bash' }),
      });
      const data = await res.json();
      setCommandOutput(prev => [...prev, {
        type: data.exitCode === 0 ? 'output' : 'error',
        text: data.output || data.error || 'Command completed.',
      }]);
    } catch {
      setCommandOutput(prev => [...prev, {
        type: 'error',
        text: 'Failed to execute command.',
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [commandInput, isExecuting, addExecutionLog]);

  return (
    <div className="p-4 space-y-4">
      {/* Live Command Execution */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
          <div className="flex items-center gap-2">
            <Radio size={10} style={{ color: CYBER_CYAN }} className="animate-pulse" />
            <span className="text-[10px] text-white font-semibold uppercase tracking-wider">Live Command Execution</span>
          </div>
          <span className="text-[8px] text-[#8888aa]">Streaming output</span>
        </div>
        <div className="p-3 bg-[#0a0a1a] font-mono text-[10px] max-h-40 overflow-y-auto custom-scrollbar">
          {commandOutput.length === 0 ? (
            <div className="text-[#666688]">Type a command and press Enter...</div>
          ) : (
            commandOutput.map((line, i) => (
              <div key={i} className="mb-1" style={{
                color: line.type === 'input' ? CYBER_CYAN : line.type === 'error' ? CYBER_RED : CYBER_GREEN,
              }}>
                {line.type === 'input' && <span className="text-[#8888aa] mr-1">$</span>}
                {line.text}
              </div>
            ))
          )}
          {isExecuting && (
            <div className="flex items-center gap-2 text-[#8888aa]">
              <RefreshCw size={9} className="animate-spin" /> Executing...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[rgba(157,78,221,0.1)]">
          <span className="text-[9px] font-mono" style={{ color: CYBER_CYAN }}>$</span>
          <input type="text" value={commandInput} onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
            placeholder="Enter command..."
            disabled={isExecuting}
            className="flex-1 bg-transparent text-[10px] text-white font-mono placeholder:text-[#666688] outline-none disabled:opacity-50"
          />
          <button onClick={executeCommand} disabled={isExecuting || !commandInput.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border disabled:opacity-30"
            style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
            <Play size={8} /> Run
          </button>
        </div>
      </div>

      {/* Process List */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
          <span className="text-[10px] text-white font-semibold flex items-center gap-1.5">
            <Cpu size={10} style={{ color: CYBER_PURPLE }} /> Process List
          </span>
          <span className="text-[8px] text-[#8888aa]">{processes.length} running</span>
        </div>
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[rgba(157,78,221,0.08)] text-[8px] text-[#8888aa] uppercase tracking-wider font-medium">
          <div className="col-span-1">PID</div>
          <div className="col-span-4">Command</div>
          <div className="col-span-2">CPU%</div>
          <div className="col-span-2">MEM%</div>
          <div className="col-span-2">Output</div>
          <div className="col-span-1">Action</div>
        </div>
        {/* Rows */}
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          {processes.length === 0 ? (
            <div className="px-3 py-6 text-center text-[10px] text-[#8888aa]">
              <Cpu size={16} className="mx-auto mb-2 opacity-40" /> No running processes
            </div>
          ) : (
            processes.map((proc, i) => (
              <motion.div key={proc.pid} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[rgba(157,78,221,0.05)] hover:bg-[rgba(157,78,221,0.04)] transition-colors items-center text-[10px]">
                <div className="col-span-1 text-[#8888aa] font-mono">{proc.pid}</div>
                <div className="col-span-4 text-white font-medium truncate font-mono">{proc.command}</div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(proc.cpu * 2, 100)}%`,
                        backgroundColor: proc.cpu > 30 ? CYBER_RED : proc.cpu > 15 ? CYBER_AMBER : CYBER_GREEN,
                      }} />
                    </div>
                    <span className="text-[8px] font-mono" style={{
                      color: proc.cpu > 30 ? CYBER_RED : proc.cpu > 15 ? CYBER_AMBER : CYBER_GREEN,
                    }}>{proc.cpu.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(proc.memory * 4, 100)}%`,
                        backgroundColor: proc.memory > 15 ? CYBER_RED : proc.memory > 8 ? CYBER_AMBER : CYBER_GREEN,
                      }} />
                    </div>
                    <span className="text-[8px] font-mono" style={{
                      color: proc.memory > 15 ? CYBER_RED : proc.memory > 8 ? CYBER_AMBER : CYBER_GREEN,
                    }}>{proc.memory.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="col-span-2 text-[#8888aa] truncate text-[9px]">{proc.output || '—'}</div>
                <div className="col-span-1">
                  <button onClick={() => killProcess(proc.pid)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] transition-colors">
                    <Trash2 size={7} /> Kill
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT ACTIVITIES PANEL
   ═══════════════════════════════════════════════════════════ */
function AgentsPanel() {
  const { agents } = useOSStore();
  const [agentTasks, setAgentTasks] = useState([
    { id: 'at1', agentId: 'brain', task: 'Planning project structure', status: 'running' as const, progress: 72 },
    { id: 'at2', agentId: 'code-agent', task: 'Generating component code', status: 'pending' as const, progress: 0 },
    { id: 'at3', agentId: 'research-agent', task: 'Analyzing API patterns', status: 'completed' as const, progress: 100 },
    { id: 'at4', agentId: 'task-agent', task: 'Deploying build artifacts', status: 'failed' as const, progress: 45 },
  ]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return CYBER_CYAN;
      case 'completed': return CYBER_GREEN;
      case 'failed': return CYBER_RED;
      default: return '#8888aa';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': return RefreshCw;
      case 'completed': return CheckCircle2;
      case 'failed': return XCircle;
      default: return Clock;
    }
  };

  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentTasks(prev => prev.map(t => {
        if (t.status !== 'running') return t;
        const newProgress = Math.min(t.progress + Math.random() * 5, 100);
        return {
          ...t,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' as const : 'running' as const,
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Active Agent Tasks */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
          <span className="text-[10px] text-white font-semibold flex items-center gap-1.5">
            <Activity size={10} style={{ color: CYBER_GREEN }} /> Agent Activities
          </span>
          <span className="text-[8px] text-[#8888aa]">
            {agentTasks.filter(t => t.status === 'running').length} running · {agentTasks.filter(t => t.status === 'completed').length} completed
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {agentTasks.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-[#8888aa]">
              <Activity size={16} className="mx-auto mb-2 opacity-40" /> No active agent tasks
            </div>
          ) : (
            agentTasks.map(task => {
              const StatusIcon = statusIcon(task.status);
              const agent = agents.find(a => a.id === task.agentId);
              return (
                <div key={task.id} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon size={10} style={{ color: statusColor(task.status) }}
                        className={task.status === 'running' ? 'animate-spin' : ''} />
                      <span className="text-[10px] text-white font-medium">{task.task}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {agent && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{
                          color: agent.color, background: `${agent.color}15`, border: `1px solid ${agent.color}25`,
                        }}>{agent.name}</span>
                      )}
                      <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: statusColor(task.status) }}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  {task.status === 'running' && (
                    <div className="w-full h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: CYBER_CYAN }}
                        initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} transition={{ duration: 0.5 }} />
                    </div>
                  )}
                  {task.status === 'completed' && (
                    <div className="w-full h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: CYBER_GREEN, width: '100%' }} />
                    </div>
                  )}
                  {task.status === 'failed' && (
                    <div className="w-full h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: CYBER_RED, width: `${task.progress}%` }} />
                    </div>
                  )}
                  <div className="text-[8px] text-[#8888aa] mt-1.5 text-right">{task.progress.toFixed(0)}%</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Agent Status Overview */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Zap size={12} style={{ color: CYBER_AMBER }} /> Agent Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {agents.slice(0, 4).map(agent => (
            <div key={agent.id} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.status === 'live' ? CYBER_GREEN : '#8888aa' }} />
                <span className="text-[9px] text-white font-medium truncate">{agent.name}</span>
              </div>
              <div className="text-[8px]" style={{ color: agent.color }}>{agent.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESOURCE USAGE PANEL
   ═══════════════════════════════════════════════════════════ */
function ResourcesPanel() {
  const { systemMetrics, setSystemMetrics } = useOSStore();
  const [networkActivity, setNetworkActivity] = useState(0);

  // Poll metrics
  useEffect(() => {
    const updateMetrics = () => {
      setSystemMetrics({
        ...systemMetrics,
        cpu: Math.min(100, Math.max(0, systemMetrics.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.min(100, Math.max(0, systemMetrics.memory + (Math.random() - 0.5) * 4)),
        disk: Math.min(100, Math.max(0, systemMetrics.disk + (Math.random() - 0.5) * 1)),
        network: Math.min(100, Math.max(0, systemMetrics.network + (Math.random() - 0.5) * 12)),
      });
      setNetworkActivity(Math.random() * 100);
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [systemMetrics, setSystemMetrics]);

  const resources = [
    { label: 'CPU Usage', value: systemMetrics.cpu, icon: Cpu, color: CYBER_CYAN, unit: '%' },
    { label: 'RAM Usage', value: systemMetrics.memory, icon: MemoryStick, color: CYBER_GREEN, unit: '%' },
    { label: 'Disk Usage', value: systemMetrics.disk, icon: HardDrive, color: CYBER_AMBER, unit: '%' },
    { label: 'Network', value: systemMetrics.network, icon: Wifi, color: GOOGLE_BLUE, unit: '%' },
  ];

  const getStatusColor = (value: number) => {
    if (value > 80) return CYBER_RED;
    if (value > 60) return CYBER_AMBER;
    return CYBER_GREEN;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Resource Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {resources.map((res, i) => (
          <motion.div key={res.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <res.icon size={14} style={{ color: res.color }} />
                <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">{res.label}</span>
              </div>
              <span className="text-lg font-mono font-bold" style={{ color: getStatusColor(res.value) }}>
                {Math.round(res.value)}{res.unit}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: getStatusColor(res.value) }}
                animate={{ width: `${res.value}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[8px] text-[#666688]">0%</span>
              <span className="text-[8px] text-[#666688]">100%</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Network Activity Indicator */}
      <div className="rounded-xl border border-[rgba(66,133,244,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio size={12} style={{ color: GOOGLE_BLUE }} className="animate-pulse" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Network Activity</span>
          </div>
          <span className="text-sm font-mono font-bold" style={{ color: GOOGLE_BLUE }}>
            {networkActivity.toFixed(0)} KB/s
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-12">
          {Array.from({ length: 30 }).map((_, i) => {
            const height = Math.random() * 80 + 20;
            return (
              <motion.div key={i} className="flex-1 rounded-t" style={{ backgroundColor: `${GOOGLE_BLUE}60` }}
                animate={{ height: `${height}%` }} transition={{ duration: 0.3 }} />
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Active Agents', value: systemMetrics.activeAgents, color: CYBER_PURPLE },
          { label: 'Total Requests', value: systemMetrics.totalRequests.toLocaleString(), color: GOOGLE_BLUE },
          { label: 'Avg Latency', value: `${systemMetrics.avgLatency}ms`, color: CYBER_CYAN },
          { label: 'Total Tokens', value: `${(systemMetrics.totalTokensUsed / 1000).toFixed(1)}K`, color: CYBER_GREEN },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-2.5">
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">{stat.label}</div>
            <div className="text-xs font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXECUTION LOGS PANEL
   ═══════════════════════════════════════════════════════════ */
function LogsPanel() {
  const { logs, executionLogs } = useOSStore();
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);

  // Combine store logs with execution logs (memoized, no setState in effect)
  const combinedLogs: LogEntry[] = [
    ...logs.map(l => ({
      id: l.id,
      timestamp: new Date(l.timestamp).getTime(),
      level: l.level as LogLevel,
      source: l.agent,
      message: l.message,
    })),
    ...executionLogs.map(l => ({
      id: l.id,
      timestamp: l.timestamp,
      level: l.level as LogLevel,
      source: l.source,
      message: l.message,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);

  // Add sample logs periodically
  useEffect(() => {
    const sampleMessages = [
      { level: 'info' as LogLevel, source: 'Brain', message: 'Planning task decomposition for new request' },
      { level: 'success' as LogLevel, source: 'Code Agent', message: 'Component generated successfully' },
      { level: 'warn' as LogLevel, source: 'System', message: 'Memory usage approaching threshold' },
      { level: 'info' as LogLevel, source: 'Gemini', message: 'Processing chat request with gemini-2.5-pro' },
      { level: 'error' as LogLevel, source: 'Task Agent', message: 'Failed to connect to external API' },
      { level: 'info' as LogLevel, source: 'Research', message: 'Web search completed: 15 results found' },
      { level: 'success' as LogLevel, source: 'Brain', message: 'Task orchestration completed successfully' },
    ];

    const interval = setInterval(() => {
      const msg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      setLocalLogs(prev => [{
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        level: msg.level,
        source: msg.source,
        message: msg.message,
      }, ...prev].slice(0, 200));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Merge combined logs with local sample logs
  const allLogs = [...localLogs, ...combinedLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 300);

  const filtered = allLogs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) && !log.source.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const levelColor = (level: LogLevel) => {
    switch (level) {
      case 'info': return CYBER_CYAN;
      case 'warn': return CYBER_AMBER;
      case 'error': return CYBER_RED;
      case 'success': return CYBER_GREEN;
    }
  };

  const levelBg = (level: LogLevel) => {
    switch (level) {
      case 'info': return `${CYBER_CYAN}08`;
      case 'warn': return `${CYBER_AMBER}08`;
      case 'error': return `${CYBER_RED}08`;
      case 'success': return `${CYBER_GREEN}08`;
    }
  };

  const clearLogs = () => {
    setLocalLogs([]);
  };

  const levels: (LogLevel | 'all')[] = ['all', 'info', 'warn', 'error', 'success'];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
        <Filter size={10} className="text-[#8888aa]" />
        {levels.map(level => (
          <button key={level} onClick={() => setFilterLevel(level)}
            className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${
              filterLevel === level ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={filterLevel === level ? {
              background: level === 'all' ? `${CYBER_PURPLE}15` : `${levelColor(level)}15`,
              border: `1px solid ${level === 'all' ? CYBER_PURPLE : levelColor(level)}25`,
            } : { border: '1px solid transparent' }}>
            {level === 'all' ? 'ALL' : level.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative w-40">
          <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8888aa]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded pl-6 pr-2 py-1 text-[9px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(157,78,221,0.3)]" />
        </div>
        <button onClick={clearLogs}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] transition-colors">
          <Trash2 size={8} /> Clear
        </button>
      </div>

      {/* Log Stream */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar font-mono text-[10px]">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#8888aa] text-[10px]">
            <div className="text-center">
              <Eye size={20} className="mx-auto mb-2 opacity-40" />
              <div>No logs matching filter</div>
            </div>
          </div>
        ) : (
          filtered.map((log, i) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.3) }}
              className="flex items-start gap-2 px-2 py-1.5 rounded mb-0.5 hover:bg-[rgba(157,78,221,0.04)]"
              style={{ background: levelBg(log.level) }}>
              <span className="text-[#666688] flex-shrink-0 text-[9px] w-14">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider"
                style={{ color: levelColor(log.level), background: `${levelColor(log.level)}12` }}>
                {log.level}
              </span>
              <span className="flex-shrink-0 text-[9px] font-medium w-20 truncate" style={{ color: CYBER_PURPLE }}>
                {log.source}
              </span>
              <span className="text-[#ccccdd] flex-1">{log.message}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
