'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, MemoryStick, HardDrive, Wifi, Activity,
  Search, RefreshCw, Play, Square, RotateCw, Plus,
  Trash2, Edit3, CheckCircle2, XCircle, AlertTriangle,
  Eye, Shield, Zap, Monitor, ChevronDown, ChevronRight,
  Settings, Clock, Gauge, Server, ToggleLeft, ToggleRight,
  Filter, ArrowUpDown, X, Save, GitBranch, Network,
  Users, Workflow, Layers, Target, AlertCircle,
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
type ManagementTab = 'processes' | 'services' | 'resources' | 'env' | 'orchestration';

interface Process {
  id: string;
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  user: string;
  startTime: string;
  command: string;
}

interface Service {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  autoStart: boolean;
  cpu: number;
  memory: number;
  uptime: string;
  description: string;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
  isEditing: boolean;
  isSystem: boolean;
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM MANAGEMENT CENTER — Main Export
   ═══════════════════════════════════════════════════════════ */
export function SystemManagement() {
  const { systemMetrics, setSystemMetrics } = useOSStore();
  const [activeTab, setActiveTab] = useState<ManagementTab>('processes');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/hermes/system');
      if (res.ok) {
        const data = await res.json();
        // API may return cpu/memory as objects — extract numeric values
        const extractNum = (v: unknown): number => {
          if (typeof v === 'number') return v;
          if (v && typeof v === 'object') {
            const obj = v as Record<string, unknown>;
            return Number(obj.overallUsagePercent ?? obj.usagePercent ?? obj.percent ?? obj.value ?? 0);
          }
          return 0;
        };
        setSystemMetrics({
          cpu: extractNum(data.cpu),
          memory: extractNum(data.memory),
          network: extractNum(data.network),
          disk: extractNum(data.disk),
          activeAgents: Number(data.activeAgents ?? systemMetrics.activeAgents),
          activeProviders: Number(data.activeProviders ?? systemMetrics.activeProviders),
          totalRequests: Number(data.totalRequests ?? systemMetrics.totalRequests),
          avgLatency: Number(data.avgLatency ?? systemMetrics.avgLatency),
          totalTokensUsed: Number(data.totalTokensUsed ?? systemMetrics.totalTokensUsed),
          totalCost: Number(data.totalCost ?? systemMetrics.totalCost),
          uptimeSeconds: Number(data.uptimeSeconds ?? systemMetrics.uptimeSeconds),
          knowledgeEntries: Number(data.knowledgeEntries ?? systemMetrics.knowledgeEntries),
          memoryEntries: Number(data.memoryEntries ?? systemMetrics.memoryEntries),
          workspaceCount: Number(data.workspaceCount ?? systemMetrics.workspaceCount),
        });
      }
    } catch {
      // Use simulated metrics
      setSystemMetrics({
        ...systemMetrics,
        cpu: Math.min(100, Math.max(0, systemMetrics.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.min(100, Math.max(0, systemMetrics.memory + (Math.random() - 0.5) * 5)),
        disk: Math.min(100, Math.max(0, systemMetrics.disk + (Math.random() - 0.5) * 2)),
        network: Math.min(100, Math.max(0, systemMetrics.network + (Math.random() - 0.5) * 15)),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [systemMetrics, setSystemMetrics]);

  useEffect(() => {
    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000);
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  const tabs: { id: ManagementTab; label: string; icon: typeof Cpu }[] = [
    { id: 'processes', label: 'Processes', icon: Activity },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'resources', label: 'Resources', icon: Gauge },
    { id: 'env', label: 'Env Variables', icon: Settings },
    { id: 'orchestration', label: 'Orchestration', icon: Zap },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CYBER_CYAN}25, ${CYBER_CYAN}08)`, border: `1px solid ${CYBER_CYAN}25` }}>
            <Monitor size={16} style={{ color: CYBER_CYAN }} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">System Management</h2>
            <div className="text-[10px] text-[#8888aa] flex items-center gap-2">
              <span style={{ color: CYBER_GREEN }}>●</span> System Online
              <span>· Uptime: {formatUptime(Number(systemMetrics.uptimeSeconds ?? 0))}</span>
              <span>· Agents: {Number(systemMetrics.activeAgents ?? 0)}</span>
            </div>
          </div>
        </div>

        <button onClick={refreshMetrics} disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
          <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={activeTab === tab.id ? {
              background: `${CYBER_CYAN}12`,
              border: `1px solid ${CYBER_CYAN}25`,
            } : { border: '1px solid transparent' }}>
            <tab.icon size={12} style={{ color: activeTab === tab.id ? CYBER_CYAN : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === 'processes' && <ProcessManagement />}
            {activeTab === 'services' && <ServiceManagement />}
            {activeTab === 'resources' && <ResourceMonitor metrics={systemMetrics} />}
            {activeTab === 'env' && <EnvVariables />}
            {activeTab === 'orchestration' && <OrchestrationPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROCESS MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function ProcessManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'name'>('cpu');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [processes] = useState<Process[]>([
    { id: 'p1', pid: 1, name: 'systemd', cpu: 0.1, memory: 0.5, status: 'running', user: 'root', startTime: '0:00', command: '/sbin/init' },
    { id: 'p2', pid: 256, name: 'node', cpu: 12.4, memory: 8.2, status: 'running', user: 'user', startTime: '10:23', command: 'node server.js' },
    { id: 'p3', pid: 312, name: 'bun', cpu: 8.7, memory: 6.1, status: 'running', user: 'user', startTime: '10:25', command: 'bun run dev' },
    { id: 'p4', pid: 445, name: 'next-server', cpu: 15.3, memory: 12.8, status: 'running', user: 'user', startTime: '10:25', command: 'next dev -p 3000' },
    { id: 'p5', pid: 512, name: 'chrome', cpu: 22.1, memory: 18.4, status: 'running', user: 'user', startTime: '09:15', command: '/opt/google/chrome/chrome' },
    { id: 'p6', pid: 678, name: 'code-server', cpu: 5.6, memory: 4.3, status: 'running', user: 'user', startTime: '08:30', command: 'code-server --port 8080' },
    { id: 'p7', pid: 734, name: 'docker', cpu: 3.2, memory: 7.5, status: 'running', user: 'root', startTime: '08:00', command: 'dockerd' },
    { id: 'p8', pid: 890, name: 'gemini-cli', cpu: 6.8, memory: 5.2, status: 'running', user: 'user', startTime: '10:30', command: 'gemini serve --port 3100' },
    { id: 'p9', pid: 912, name: 'postgres', cpu: 1.2, memory: 3.4, status: 'running', user: 'postgres', startTime: '08:00', command: 'postgres -D /var/lib/postgres' },
    { id: 'p10', pid: 1024, name: 'redis', cpu: 0.8, memory: 1.9, status: 'running', user: 'redis', startTime: '08:00', command: 'redis-server *:6379' },
  ]);

  const filtered = processes
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.command.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      return dir * ((a[sortBy] as number) - (b[sortBy] as number));
    });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const statusColor = (status: Process['status']) => {
    switch (status) {
      case 'running': return CYBER_GREEN;
      case 'sleeping': return CYBER_AMBER;
      case 'stopped': return CYBER_RED;
      case 'zombie': return CYBER_RED;
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Search & Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8888aa]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search processes..."
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,255,0.3)]" />
        </div>
        <div className="flex items-center gap-1">
          {(['cpu', 'memory', 'name'] as const).map(field => (
            <button key={field} onClick={() => toggleSort(field)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border transition-all ${
                sortBy === field ? 'text-white' : 'text-[#8888aa] hover:text-[#ccccdd]'
              }`}
              style={sortBy === field ? { background: `${CYBER_CYAN}10`, border: `1px solid ${CYBER_CYAN}25` } : { border: '1px solid rgba(157,78,221,0.1)' }}>
              <ArrowUpDown size={8} />
              {field.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Process List */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] text-[8px] text-[#8888aa] uppercase tracking-wider font-medium">
          <div className="col-span-1">PID</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2">CPU</div>
          <div className="col-span-2">Memory</div>
          <div className="col-span-1">User</div>
          <div className="col-span-2">Action</div>
        </div>

        {/* Rows */}
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          {filtered.map((proc, i) => (
            <motion.div key={proc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[rgba(157,78,221,0.05)] hover:bg-[rgba(66,133,244,0.04)] transition-colors items-center text-[10px]">
              <div className="col-span-1 text-[#8888aa] font-mono">{proc.pid}</div>
              <div className="col-span-3 text-white font-medium truncate">{proc.name}</div>
              <div className="col-span-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor(proc.status) }} />
                  <span style={{ color: statusColor(proc.status) }} className="text-[8px]">{proc.status}</span>
                </span>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(proc.cpu * 3, 100)}%`,
                      backgroundColor: proc.cpu > 20 ? CYBER_RED : proc.cpu > 10 ? CYBER_AMBER : CYBER_GREEN,
                    }} />
                  </div>
                  <span className="text-[8px] font-mono w-8 text-right" style={{
                    color: proc.cpu > 20 ? CYBER_RED : proc.cpu > 10 ? CYBER_AMBER : CYBER_GREEN,
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
                  <span className="text-[8px] font-mono w-8 text-right" style={{
                    color: proc.memory > 15 ? CYBER_RED : proc.memory > 8 ? CYBER_AMBER : CYBER_GREEN,
                  }}>{proc.memory.toFixed(1)}%</span>
                </div>
              </div>
              <div className="col-span-1 text-[#8888aa] truncate">{proc.user}</div>
              <div className="col-span-2">
                <button className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] hover:bg-[rgba(230,57,70,0.1)] transition-colors">
                  <Trash2 size={7} /> Kill
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SERVICE MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([
    { id: 's1', name: 'Gemini CLI', status: 'running', autoStart: true, cpu: 6.8, memory: 5.2, uptime: '2h 15m', description: 'Google Gemini CLI local server' },
    { id: 's2', name: 'Next.js Dev', status: 'running', autoStart: true, cpu: 15.3, memory: 12.8, uptime: '4h 30m', description: 'Next.js development server on port 3000' },
    { id: 's3', name: 'PostgreSQL', status: 'running', autoStart: true, cpu: 1.2, memory: 3.4, uptime: '12h 0m', description: 'PostgreSQL database server' },
    { id: 's4', name: 'Redis', status: 'running', autoStart: true, cpu: 0.8, memory: 1.9, uptime: '12h 0m', description: 'Redis in-memory cache' },
    { id: 's5', name: 'Docker Engine', status: 'running', autoStart: false, cpu: 3.2, memory: 7.5, uptime: '12h 0m', description: 'Docker container engine' },
    { id: 's6', name: 'Nginx Proxy', status: 'stopped', autoStart: false, cpu: 0, memory: 0, uptime: '—', description: 'Nginx reverse proxy' },
    { id: 's7', name: 'WebSocket Server', status: 'stopped', autoStart: false, cpu: 0, memory: 0, uptime: '—', description: 'WebSocket service on port 3003' },
    { id: 's8', name: 'Cron Scheduler', status: 'running', autoStart: true, cpu: 0.2, memory: 0.8, uptime: '12h 0m', description: 'Automated task scheduler' },
  ]);

  const toggleService = (id: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newStatus = s.status === 'running' ? 'stopped' : 'running';
      return {
        ...s,
        status: newStatus as Service['status'],
        cpu: newStatus === 'stopped' ? 0 : Math.random() * 10,
        memory: newStatus === 'stopped' ? 0 : Math.random() * 8,
        uptime: newStatus === 'stopped' ? '—' : '0m',
      };
    }));
  };

  const restartService = (id: string) => {
    setServices(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, status: 'starting' as const };
    }));
    setTimeout(() => {
      setServices(prev => prev.map(s => {
        if (s.id !== id) return s;
        return { ...s, status: 'running' as const, uptime: '0m' };
      }));
    }, 1500);
  };

  const toggleAutoStart = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, autoStart: !s.autoStart } : s));
  };

  const statusColor = (status: Service['status']) => {
    switch (status) {
      case 'running': return CYBER_GREEN;
      case 'stopped': return '#8888aa';
      case 'error': return CYBER_RED;
      case 'starting': return CYBER_AMBER;
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((service, i) => (
          <motion.div key={service.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border bg-[rgba(18,18,42,0.6)] p-3"
            style={{ borderColor: `${statusColor(service.status)}15` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(service.status) }} />
                <span className="text-white text-xs font-semibold">{service.name}</span>
              </div>
              <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: statusColor(service.status) }}>
                {service.status}
              </span>
            </div>
            <div className="text-[9px] text-[#8888aa] mb-2">{service.description}</div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-1.5 text-center">
                <div className="text-[7px] text-[#8888aa] uppercase">CPU</div>
                <div className="text-[10px] font-mono font-bold" style={{ color: CYBER_CYAN }}>{service.cpu.toFixed(1)}%</div>
              </div>
              <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-1.5 text-center">
                <div className="text-[7px] text-[#8888aa] uppercase">MEM</div>
                <div className="text-[10px] font-mono font-bold" style={{ color: CYBER_GREEN }}>{service.memory.toFixed(1)}%</div>
              </div>
              <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-1.5 text-center">
                <div className="text-[7px] text-[#8888aa] uppercase">Uptime</div>
                <div className="text-[10px] font-mono font-bold text-[#ccccdd]">{service.uptime}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleService(service.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: service.status === 'running' ? `${CYBER_RED}25` : `${CYBER_GREEN}25`,
                    color: service.status === 'running' ? CYBER_RED : CYBER_GREEN,
                    background: service.status === 'running' ? `${CYBER_RED}08` : `${CYBER_GREEN}08`,
                  }}>
                  {service.status === 'running' ? <><Square size={7} /> Stop</> : <><Play size={7} /> Start</>}
                </button>
                {service.status === 'running' && (
                  <button onClick={() => restartService(service.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,255,0.2)] text-[#00ffff] bg-[rgba(0,255,255,0.05)] hover:bg-[rgba(0,255,255,0.1)] transition-colors">
                    <RotateCw size={7} /> Restart
                  </button>
                )}
              </div>
              <button onClick={() => toggleAutoStart(service.id)}
                className="flex items-center gap-1 text-[8px]">
                {service.autoStart ? (
                  <ToggleRight size={14} style={{ color: CYBER_GREEN }} />
                ) : (
                  <ToggleLeft size={14} style={{ color: '#8888aa' }} />
                )}
                <span className="text-[#8888aa]">Auto</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESOURCE MONITOR
   ═══════════════════════════════════════════════════════════ */
function ResourceMonitor({ metrics }: { metrics: ReturnType<typeof useOSStore.getState>['systemMetrics'] }) {
  const [gpuAvailable] = useState(false);
  // Defensive: ensure numeric values
  const toNum = (v: unknown, fallback = 0): number => {
    if (typeof v === 'number') return v;
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      return Number(obj.overallUsagePercent ?? obj.usagePercent ?? obj.percent ?? obj.value ?? fallback);
    }
    return fallback;
  };

  const gauges = [
    { label: 'CPU Usage', value: toNum(metrics.cpu), icon: Cpu, color: CYBER_CYAN, max: 100, unit: '%' },
    { label: 'RAM Usage', value: toNum(metrics.memory), icon: MemoryStick, color: CYBER_GREEN, max: 100, unit: '%' },
    { label: 'Disk Usage', value: toNum(metrics.disk), icon: HardDrive, color: CYBER_AMBER, max: 100, unit: '%' },
    { label: 'Network', value: toNum(metrics.network), icon: Wifi, color: GOOGLE_BLUE, max: 100, unit: '%' },
    ...(gpuAvailable ? [{ label: 'GPU Usage', value: 0, icon: Zap, color: CYBER_PURPLE, max: 100, unit: '%' }] : []),
  ];

  const getStatusColor = (value: number) => {
    if (value > 80) return CYBER_RED;
    if (value > 60) return CYBER_AMBER;
    return CYBER_GREEN;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Gauge Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {gauges.map((gauge, i) => (
          <motion.div key={gauge.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <gauge.icon size={12} style={{ color: gauge.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{gauge.label}</span>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-20 h-20 mx-auto mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(10,10,26,0.5)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={getStatusColor(gauge.value)} strokeWidth="6"
                  strokeDasharray={`${(gauge.value / gauge.max) * 213.6} 213.6`}
                  strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-mono font-bold" style={{ color: getStatusColor(gauge.value) }}>
                  {Math.round(gauge.value)}
                </span>
              </div>
            </div>

            <div className="text-[9px] font-mono" style={{ color: getStatusColor(gauge.value) }}>
              {gauge.value.toFixed(1)}{gauge.unit}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Agents', value: toNum(metrics.activeAgents), color: CYBER_PURPLE },
          { label: 'Total Requests', value: toNum(metrics.totalRequests).toLocaleString(), color: GOOGLE_BLUE },
          { label: 'Avg Latency', value: `${toNum(metrics.avgLatency)}ms`, color: CYBER_CYAN },
          { label: 'Total Tokens', value: `${(toNum(metrics.totalTokensUsed) / 1000).toFixed(1)}K`, color: CYBER_GREEN },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-sm font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* GPU Info */}
      {!gpuAvailable && (
        <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-3 flex items-center gap-3">
          <Zap size={16} className="text-[#8888aa]" />
          <div>
            <div className="text-[10px] text-[#8888aa]">No GPU detected</div>
            <div className="text-[8px] text-[#666688]">GPU monitoring will be available when a compatible GPU is detected</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ENVIRONMENT VARIABLES
   ═══════════════════════════════════════════════════════════ */
function EnvVariables() {
  const [searchQuery, setSearchQuery] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { id: 'e1', key: 'NODE_ENV', value: 'development', isEditing: false, isSystem: false },
    { id: 'e2', key: 'PORT', value: '3000', isEditing: false, isSystem: false },
    { id: 'e3', key: 'DATABASE_URL', value: 'file:./dev.db', isEditing: false, isSystem: false },
    { id: 'e4', key: 'NEXT_PUBLIC_APP_URL', value: 'http://localhost:3000', isEditing: false, isSystem: false },
    { id: 'e5', key: 'GEMINI_API_KEY', value: '••••••••••••', isEditing: false, isSystem: false },
    { id: 'e6', key: 'PATH', value: '/usr/local/bin:/usr/bin:/bin', isEditing: false, isSystem: true },
    { id: 'e7', key: 'HOME', value: '/home/user', isEditing: false, isSystem: true },
    { id: 'e8', key: 'SHELL', value: '/bin/bash', isEditing: false, isSystem: true },
    { id: 'e9', key: 'LANG', value: 'en_US.UTF-8', isEditing: false, isSystem: true },
    { id: 'e10', key: 'TERM', value: 'xterm-256color', isEditing: false, isSystem: true },
  ]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = envVars.filter(v =>
    !searchQuery || v.key.toLowerCase().includes(searchQuery.toLowerCase()) || v.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEdit = (id: string) => {
    setEnvVars(prev => prev.map(v => ({ ...v, isEditing: v.id === id ? true : false })));
  };

  const saveEdit = (id: string, newValue: string) => {
    setEnvVars(prev => prev.map(v => v.id === id ? { ...v, value: newValue, isEditing: false } : v));
  };

  const cancelEdit = (id: string) => {
    setEnvVars(prev => prev.map(v => v.id === id ? { ...v, isEditing: false } : v));
  };

  const addVariable = () => {
    if (!newKey.trim()) return;
    setEnvVars(prev => [...prev, {
      id: `e-${Date.now()}`,
      key: newKey.trim(),
      value: newValue.trim(),
      isEditing: false,
      isSystem: false,
    }]);
    setNewKey('');
    setNewValue('');
    setShowAdd(false);
  };

  const deleteVariable = (id: string) => {
    setEnvVars(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="p-4 space-y-3">
      {/* Search & Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8888aa]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search environment variables..."
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,255,0.3)]" />
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95"
          style={{ borderColor: `${CYBER_GREEN}30`, color: CYBER_GREEN, background: `${CYBER_GREEN}10` }}>
          <Plus size={10} /> Add Variable
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.6)] p-3 flex items-center gap-2">
              <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                placeholder="KEY"
                className="w-1/3 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-white font-mono placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,255,0.3)]" />
              <span className="text-[#8888aa]">=</span>
              <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                placeholder="value"
                className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1.5 text-[10px] text-[#ccccdd] font-mono placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,255,0.3)]" />
              <button onClick={addVariable}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-[9px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors">
                <Save size={9} /> Save
              </button>
              <button onClick={() => setShowAdd(false)}
                className="p-1.5 rounded text-[#8888aa] hover:text-[#ff4444] transition-colors">
                <X size={10} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Variables List */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] text-[8px] text-[#8888aa] uppercase tracking-wider font-medium">
          <div className="col-span-4">Key</div>
          <div className="col-span-5">Value</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Actions</div>
        </div>

        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          {filtered.map((env, i) => (
            <motion.div key={env.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[rgba(157,78,221,0.05)] hover:bg-[rgba(66,133,244,0.04)] transition-colors items-center text-[10px]">
              <div className="col-span-4 text-[#00ffff] font-mono font-medium truncate">{env.key}</div>
              <div className="col-span-5 truncate">
                {env.isEditing ? (
                  <input type="text" defaultValue={env.value}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(env.id, (e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') cancelEdit(env.id);
                    }}
                    onBlur={(e) => saveEdit(env.id, e.target.value)}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(0,255,255,0.3)] rounded px-1 py-0.5 text-[10px] text-[#ccccdd] font-mono outline-none"
                    autoFocus />
                ) : (
                  <span className="text-[#ccccdd] font-mono">{env.value}</span>
                )}
              </div>
              <div className="col-span-1">
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${env.isSystem ? 'bg-[rgba(157,78,221,0.1)] text-[#9d4edd]' : 'bg-[rgba(0,255,136,0.1)] text-[#00ff88]'}`}>
                  {env.isSystem ? 'SYS' : 'USR'}
                </span>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                {!env.isSystem && (
                  <>
                    <button onClick={() => startEdit(env.id)}
                      className="p-1 rounded text-[#8888aa] hover:text-[#00ffff] transition-colors">
                      <Edit3 size={9} />
                    </button>
                    <button onClick={() => deleteVariable(env.id)}
                      className="p-1 rounded text-[#8888aa] hover:text-[#E63946] transition-colors">
                      <Trash2 size={9} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───
function formatUptime(seconds: number): string {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ═══════════════════════════════════════════════════════════
   ORCHESTRATION INTELLIGENCE PANEL
   ═══════════════════════════════════════════════════════════ */
function OrchestrationPanel() {
  const { agents, activeSwarms, addLog } = useOSStore();
  const swarms = activeSwarms ?? [];
  const [executionMode, setExecutionMode] = useState<'parallel' | 'sequential' | 'hybrid'>('hybrid');
  const [orchestratedTasks, setOrchestratedTasks] = useState<
    Array<{
      id: string;
      name: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      assignedAgent: string;
      dependencies: string[];
      retryCount: number;
      maxRetries: number;
    }>
  >([
    { id: 'ot1', name: 'Analyze project structure', status: 'completed', progress: 100, assignedAgent: 'brain', dependencies: [], retryCount: 0, maxRetries: 2 },
    { id: 'ot2', name: 'Generate component scaffolding', status: 'running', progress: 65, assignedAgent: 'code-agent', dependencies: ['ot1'], retryCount: 0, maxRetries: 2 },
    { id: 'ot3', name: 'Research API patterns', status: 'running', progress: 40, assignedAgent: 'research-agent', dependencies: ['ot1'], retryCount: 0, maxRetries: 2 },
    { id: 'ot4', name: 'Deploy to staging', status: 'pending', progress: 0, assignedAgent: 'task-agent', dependencies: ['ot2', 'ot3'], retryCount: 0, maxRetries: 3 },
    { id: 'ot5', name: 'Run integration tests', status: 'pending', progress: 0, assignedAgent: 'code-agent', dependencies: ['ot2'], retryCount: 0, maxRetries: 2 },
  ]);

  const [swarmData, setSwarmData] = useState({
    activeCount: swarms.length,
    complexityScore: 78,
    executionMode: 'hybrid' as const,
    composition: [
      { agentId: 'brain', role: 'Orchestrator' },
      { agentId: 'code-agent', role: 'Executor' },
      { agentId: 'research-agent', role: 'Researcher' },
      { agentId: 'task-agent', role: 'Deployer' },
    ],
  });

  // Simulate task progress
  useEffect(() => {
    const interval = setInterval(() => {
      setOrchestratedTasks(prev => prev.map(t => {
        if (t.status !== 'running') return t;
        const newProgress = Math.min(t.progress + Math.random() * 6, 100);
        return {
          ...t,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' as const : 'running' as const,
        };
      }));
      // Start pending tasks whose dependencies are all completed
      setOrchestratedTasks(prev => prev.map(t => {
        if (t.status !== 'pending') return t;
        const depsCompleted = t.dependencies.every(depId => {
          const dep = prev.find(d => d.id === depId);
          return dep && dep.status === 'completed';
        });
        if (depsCompleted) return { ...t, status: 'running' as const, progress: 5 };
        return t;
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return CYBER_CYAN;
      case 'completed': return CYBER_GREEN;
      case 'failed': return CYBER_RED;
      default: return '#8888aa';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Task Decomposition Visualization */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
          <div className="flex items-center gap-2">
            <Target size={12} style={{ color: CYBER_CYAN }} />
            <span className="text-[10px] text-white font-semibold">Task Decomposition</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Execution Mode Indicator */}
            {(['parallel', 'sequential', 'hybrid'] as const).map(mode => (
              <button key={mode} onClick={() => setExecutionMode(mode)}
                className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${
                  executionMode === mode ? 'text-white' : 'text-[#8888aa] hover:text-white'
                }`}
                style={executionMode === mode ? {
                  background: `${CYBER_CYAN}12`,
                  border: `1px solid ${CYBER_CYAN}25`,
                } : { border: '1px solid transparent' }}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-2">
          {orchestratedTasks.map((task, i) => {
            const agent = agents.find(a => a.id === task.assignedAgent);
            return (
              <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-lg border bg-[rgba(10,10,26,0.4)] p-3"
                style={{ borderColor: `${statusColor(task.status)}15` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(task.status) }} />
                    <span className="text-[10px] text-white font-medium">{task.name}</span>
                    {task.dependencies.length > 0 && (
                      <span className="text-[7px] text-[#666688] flex items-center gap-0.5">
                        <GitBranch size={7} /> deps: {task.dependencies.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {agent && (
                      <span className="text-[7px] px-1.5 py-0.5 rounded font-mono" style={{
                        color: agent.color, background: `${agent.color}12`, border: `1px solid ${agent.color}20`,
                      }}>{agent.name}</span>
                    )}
                    <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: statusColor(task.status) }}>
                      {task.status}
                    </span>
                    {task.retryCount > 0 && (
                      <span className="text-[7px] px-1 rounded" style={{ color: CYBER_AMBER, background: `${CYBER_AMBER}08` }}>
                        retry {task.retryCount}/{task.maxRetries}
                      </span>
                    )}
                  </div>
                </div>
                {(task.status === 'running' || task.status === 'completed') && (
                  <div className="w-full h-1.5 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: statusColor(task.status) }}
                      animate={{ width: `${task.progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                )}
                <div className="text-[8px] text-[#8888aa] mt-1 text-right">{task.progress.toFixed(0)}%</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Dependency Graph (Simple Visualization) */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5 mb-3">
          <GitBranch size={12} style={{ color: CYBER_PURPLE }} /> Dependency Graph
        </h3>
        <div className="relative">
          {/* Simple topological layout */}
          <div className="flex flex-col items-center gap-3">
            {/* Root task */}
            <div className="px-3 py-2 rounded-lg border text-[9px] font-medium" style={{
              borderColor: `${CYBER_GREEN}25`, color: CYBER_GREEN, background: `${CYBER_GREEN}08`,
            }}>Analyze project structure ✓</div>
            <div className="flex items-center gap-1">
              <div className="w-px h-6" style={{ background: 'rgba(157,78,221,0.2)' }} />
            </div>
            {/* Parallel tasks */}
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="px-3 py-2 rounded-lg border text-[9px] font-medium" style={{
                  borderColor: `${CYBER_CYAN}25`, color: CYBER_CYAN, background: `${CYBER_CYAN}08`,
                }}>Generate scaffolding ⟳</div>
                <div className="w-px h-4" style={{ background: 'rgba(157,78,221,0.15)' }} />
                <div className="flex items-start gap-4">
                  <div className="px-2 py-1 rounded text-[8px] border border-[rgba(157,78,221,0.15)] text-[#8888aa]">Run tests</div>
                  <div className="px-2 py-1 rounded text-[8px] border border-[rgba(157,78,221,0.15)] text-[#8888aa]">Deploy staging</div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="px-3 py-2 rounded-lg border text-[9px] font-medium" style={{
                  borderColor: `${CYBER_CYAN}25`, color: CYBER_CYAN, background: `${CYBER_CYAN}08`,
                }}>Research APIs ⟳</div>
                <div className="w-px h-4" style={{ background: 'rgba(157,78,221,0.15)' }} />
                <div className="px-2 py-1 rounded text-[8px] border border-[rgba(157,78,221,0.15)] text-[#8888aa]">Deploy staging</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Swarm Status */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Network size={12} style={{ color: CYBER_GREEN }} /> Swarm Status
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-[#8888aa]">Active:</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: CYBER_GREEN }}>{swarmData.activeCount}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Complexity Score */}
          <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Complexity Score</span>
              <span className="text-lg font-mono font-bold" style={{ color: swarmData.complexityScore > 70 ? CYBER_AMBER : CYBER_GREEN }}>
                {swarmData.complexityScore}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[rgba(10,10,26,0.5)] overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${swarmData.complexityScore}%`,
                backgroundColor: swarmData.complexityScore > 70 ? CYBER_AMBER : CYBER_GREEN,
              }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[7px] text-[#666688]">Simple</span>
              <span className="text-[7px] text-[#666688]">Complex</span>
            </div>
          </div>

          {/* Execution Mode */}
          <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-2">Execution Mode</div>
            <div className="flex items-center gap-1.5">
              {(['sequential', 'parallel', 'hybrid'] as const).map(mode => (
                <button key={mode} onClick={() => setSwarmData(prev => ({ ...prev, executionMode: mode }))}
                  className={`px-2.5 py-1.5 rounded text-[9px] font-medium border transition-all ${
                    swarmData.executionMode === mode ? 'text-white' : 'text-[#8888aa] hover:text-white'
                  }`}
                  style={swarmData.executionMode === mode ? {
                    background: `${CYBER_GREEN}12`,
                    border: `1px solid ${CYBER_GREEN}25`,
                  } : { border: '1px solid rgba(157,78,221,0.1)' }}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Swarm Composition */}
        <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-2">Swarm Composition</div>
          <div className="grid grid-cols-2 gap-2">
            {swarmData.composition.map(member => {
              const agent = agents.find(a => a.id === member.agentId);
              return (
                <div key={member.agentId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agent?.color || '#8888aa' }} />
                  <div>
                    <div className="text-[9px] text-white font-medium">{agent?.name || member.agentId}</div>
                    <div className="text-[7px]" style={{ color: agent?.color || '#8888aa' }}>{member.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Failure Recovery */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5 mb-3">
          <AlertCircle size={12} style={{ color: CYBER_AMBER }} /> Failure Recovery
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Retry Logic', value: 'Enabled', color: CYBER_GREEN, icon: RefreshCw },
            { label: 'Max Retries', value: '3', color: CYBER_CYAN, icon: Layers },
            { label: 'Rollback', value: 'Auto', color: CYBER_GREEN, icon: RotateCw },
            { label: 'Alert on Fail', value: 'Active', color: CYBER_AMBER, icon: AlertTriangle },
          ].map(item => (
            <div key={item.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon size={9} style={{ color: item.color }} />
                <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{item.label}</span>
              </div>
              <div className="text-[11px] font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers (original) ───
function _formatUptime(seconds: number): string {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
