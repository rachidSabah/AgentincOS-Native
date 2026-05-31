'use client';

import { useOSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Zap, Globe, Mic, Monitor, Database, Clock, Radio, Activity,
  Shield, Server, Brain, Search, Play, Square, RotateCcw,
  Wifi, WifiOff, TrendingUp, BarChart3, Cpu, HardDrive,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

/* ───────── HERMES POWER PANEL ───────── */
export function HermesPowerPanel() {
  const { hermesConnection, hermesSkills, mcpServers, hermesLatencyHistory } = useOSStore();
  const [telemetry, setTelemetry] = useState<Record<string, unknown> | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<Record<string, unknown> | null>(null);
  const [processInfo, setProcessInfo] = useState<Record<string, unknown> | null>(null);
  const [browserStatus, setBrowserStatus] = useState<Record<string, unknown> | null>(null);
  const [memoryProviders, setMemoryProviders] = useState<Record<string, unknown> | null>(null);
  const [cronJobs, setCronJobs] = useState<Record<string, unknown> | null>(null);
  const [webConfig, setWebConfig] = useState<Record<string, unknown> | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPowerData = useCallback(async () => {
    if (!hermesConnection.running) return;
    try {
      const [tel, gw, proc, br, mem, cron, web, voice] = await Promise.allSettled([
        fetch('/api/hermes/telemetry').then(r => r.json()),
        fetch('/api/hermes/gateway').then(r => r.json()),
        fetch('/api/hermes/process').then(r => r.json()),
        fetch('/api/hermes/browser').then(r => r.json()),
        fetch('/api/hermes/memory').then(r => r.json()),
        fetch('/api/hermes/cron').then(r => r.json()),
        fetch('/api/hermes/web').then(r => r.json()),
        fetch('/api/hermes/voice').then(r => r.json()),
      ]);
      if (tel.status === 'fulfilled') setTelemetry(tel.value as Record<string, unknown>);
      if (gw.status === 'fulfilled') setGatewayStatus(gw.value as Record<string, unknown>);
      if (proc.status === 'fulfilled') setProcessInfo(proc.value as Record<string, unknown>);
      if (br.status === 'fulfilled') setBrowserStatus(br.value as Record<string, unknown>);
      if (mem.status === 'fulfilled') setMemoryProviders(mem.value as Record<string, unknown>);
      if (cron.status === 'fulfilled') setCronJobs(cron.value as Record<string, unknown>);
      if (web.status === 'fulfilled') setWebConfig(web.value as Record<string, unknown>);
      if (voice.status === 'fulfilled') setVoiceConfig(voice.value as Record<string, unknown>);
    } catch { /* silent */ }
  }, [hermesConnection.running]);

  useEffect(() => { 
    const i = setInterval(() => { fetchPowerData().catch(() => {}); }, 10000); 
    // Initial fetch scheduled after mount to avoid cascading render
    const timeout = setTimeout(() => fetchPowerData().catch(() => {}), 100);
    return () => { clearInterval(i); clearTimeout(timeout); };
  }, [fetchPowerData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'process', label: 'Process', icon: Server },
    { id: 'gateway', label: 'Gateway', icon: Radio },
    { id: 'browser', label: 'Browser', icon: Monitor },
    { id: 'memory', label: 'Memory', icon: Database },
    { id: 'cron', label: 'Cron', icon: Clock },
    { id: 'web', label: 'Web Search', icon: Globe },
    { id: 'voice', label: 'Voice I/O', icon: Mic },
  ];

  const isRunning = hermesConnection.running;
  const accentColor = '#FFB627';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Zap size={16} style={{ color: accentColor }} /> Hermes Power Panel
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'animate-pulse-glow' : ''}`}
            style={{ backgroundColor: isRunning ? '#00ff88' : '#ff4444' }} />
          <span className="text-[10px] font-mono" style={{ color: isRunning ? '#00ff88' : '#ff4444' }}>
            {isRunning ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
            }`}
            style={activeTab === tab.id ? { background: `${accentColor}15`, border: `1px solid ${accentColor}30` } : { border: '1px solid transparent' }}
          >
            <tab.icon size={12} style={{ color: activeTab === tab.id ? accentColor : '#8888aa' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        style={{ borderColor: `${accentColor}20` }}
      >
        {activeTab === 'overview' && <OverviewTab telemetry={telemetry} skills={hermesSkills} mcpServers={mcpServers} latencyHistory={hermesLatencyHistory} />}
        {activeTab === 'process' && <ProcessTab processInfo={processInfo} />}
        {activeTab === 'gateway' && <GatewayTab gatewayStatus={gatewayStatus} />}
        {activeTab === 'browser' && <BrowserTab browserStatus={browserStatus} />}
        {activeTab === 'memory' && <MemoryTab memoryProviders={memoryProviders} />}
        {activeTab === 'cron' && <CronTab cronJobs={cronJobs} />}
        {activeTab === 'web' && <WebTab webConfig={webConfig} />}
        {activeTab === 'voice' && <VoiceTab voiceConfig={voiceConfig} />}
      </motion.div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ telemetry, skills, mcpServers, latencyHistory }: {
  telemetry: Record<string, unknown> | null;
  skills: unknown[];
  mcpServers: unknown[];
  latencyHistory: number[];
}) {
  const tel = telemetry;
  const circuitState = (tel?.circuitBreakerState as string) ?? 'closed';
  const circuitColor = circuitState === 'closed' ? '#00ff88' : circuitState === 'open' ? '#ff4444' : '#ffaa00';

  return (
    <div className="space-y-4">
      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Requests', value: String(tel?.totalRequests ?? '0'), icon: Activity, color: '#7B2CBF' },
          { label: 'Success Rate', value: tel ? `${Math.round(((tel.successfulRequests as number) / Math.max(tel.totalRequests as number, 1)) * 100)}%` : '—', icon: Shield, color: '#00ff88' },
          { label: 'Avg Latency', value: tel ? `${Math.round(tel.avgLatencyMs as number)}ms` : '—', icon: Zap, color: '#FFB627' },
          { label: 'P99 Latency', value: tel ? `${Math.round(tel.p99LatencyMs as number)}ms` : '—', icon: TrendingUp, color: '#E63946' },
          { label: 'RPM', value: String(tel?.requestsPerMinute ?? '0'), icon: BarChart3, color: '#1B998B' },
          { label: 'Tokens Used', value: String(tel?.tokensUsed ?? '0'), icon: Brain, color: '#2E86AB' },
          { label: 'Tool Calls', value: String(tel?.toolCallsCount ?? '0'), icon: Cpu, color: '#E8751A' },
          { label: 'Circuit', value: circuitState.toUpperCase(), icon: Shield, color: circuitColor },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-lg border p-3" style={{ borderColor: `${stat.color}20`, background: `${stat.color}06` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={10} style={{ color: stat.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Skills & MCP Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1"><Zap size={10} /> Skills Registry</span>
            <span className="text-[9px] font-mono text-[#FFB627]">{skills.length} loaded</span>
          </div>
          <div className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#FFB627]"
              style={{ width: `${Math.min((skills.length / 2550) * 100, 100)}%` }} />
          </div>
          <div className="text-[8px] text-[#8888aa] mt-1">{skills.length} / 2,550 skills available</div>
        </div>

        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1"><Radio size={10} /> MCP Servers</span>
            <span className="text-[9px] font-mono text-[#1B998B]">{mcpServers.length} connected</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {mcpServers.slice(0, 6).map((s: unknown) => {
              const server = s as { name: string; connected: boolean };
              return (
                <span key={server.name} className="text-[8px] px-1.5 py-0.5 rounded-full border"
                  style={{ borderColor: server.connected ? '#1B998B35' : '#ff444435', color: server.connected ? '#1B998B' : '#ff4444', background: server.connected ? '#1B998B10' : '#ff444410' }}>
                  {server.name}
                </span>
              );
            })}
            {mcpServers.length > 6 && <span className="text-[8px] text-[#8888aa]">+{mcpServers.length - 6} more</span>}
          </div>
        </div>
      </div>

      {/* Latency Sparkline */}
      {latencyHistory.length > 0 && (
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2"><Activity size={10} /> Latency History (last {latencyHistory.length} readings)</span>
          <div className="flex items-end gap-0.5 h-8">
            {latencyHistory.map((lat, i) => {
              const maxLat = Math.max(...latencyHistory, 1);
              const h = Math.max(2, (lat / maxLat) * 100);
              return (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: lat > 500 ? '#ff4444' : lat > 200 ? '#ffaa00' : '#00ff88', opacity: 0.7 }} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Process Tab ─── */
function ProcessTab({ processInfo }: { processInfo: Record<string, unknown> | null }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await fetch('/api/hermes/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch { /* silent */ }
    setTimeout(() => setActionLoading(null), 2000);
  };

  const running = processInfo?.running as boolean;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Status', value: running ? 'RUNNING' : 'STOPPED', color: running ? '#00ff88' : '#ff4444' },
          { label: 'PID', value: String(processInfo?.pid ?? '—'), color: '#FFB627' },
          { label: 'Uptime', value: String(processInfo?.uptime ?? '—'), color: '#7B2CBF' },
          { label: 'Port', value: String(processInfo?.port ?? '—'), color: '#2E86AB' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3 text-center">
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="font-mono font-bold text-sm" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => handleAction('start')} disabled={running || actionLoading === 'start'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
          style={{ borderColor: '#00ff8835', color: '#00ff88', background: '#00ff8808' }}>
          <Play size={12} /> {actionLoading === 'start' ? 'Starting...' : 'Start'}
        </button>
        <button onClick={() => handleAction('stop')} disabled={!running || actionLoading === 'stop'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
          style={{ borderColor: '#ff444435', color: '#ff4444', background: '#ff444408' }}>
          <Square size={12} /> {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
        </button>
        <button onClick={() => handleAction('restart')} disabled={actionLoading === 'restart'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-30"
          style={{ borderColor: '#FFB62735', color: '#FFB627', background: '#FFB62708' }}>
          <RotateCcw size={12} /> {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
        </button>
      </div>
    </div>
  );
}

/* ─── Gateway Tab ─── */
function GatewayTab({ gatewayStatus }: { gatewayStatus: Record<string, unknown> | null }) {
  const platforms = (gatewayStatus?.platforms as Array<{ name: string; connected: boolean }>) ?? [];
  const running = gatewayStatus?.running as boolean;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: `${running ? '#00ff88' : '#ff4444'}20`, background: `${running ? '#00ff88' : '#ff4444'}06` }}>
        {running ? <Wifi size={16} style={{ color: '#00ff88' }} /> : <WifiOff size={16} style={{ color: '#ff4444' }} />}
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Gateway Status</div>
          <div className="font-mono font-bold text-sm" style={{ color: running ? '#00ff88' : '#ff4444' }}>{running ? 'RUNNING' : 'STOPPED'}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Connected Platforms ({platforms.filter(p => p.connected).length}/{platforms.length})</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {platforms.length > 0 ? platforms.map(p => (
            <div key={p.name} className="flex items-center gap-2 p-2 rounded-lg border"
              style={{ borderColor: `${p.connected ? '#1B998B' : '#8888aa'}20`, background: `${p.connected ? '#1B998B' : '#8888aa'}06` }}>
              <div className={`w-1.5 h-1.5 rounded-full ${p.connected ? 'animate-pulse-glow' : ''}`}
                style={{ backgroundColor: p.connected ? '#00ff88' : '#8888aa' }} />
              <span className="text-[10px] font-medium" style={{ color: p.connected ? '#ccccdd' : '#8888aa' }}>{p.name}</span>
            </div>
          )) : (
            <div className="col-span-full text-[10px] text-[#8888aa] py-4 text-center">No gateway platforms detected. Run <code className="text-[#FFB627]">hermes gateway setup</code> to configure.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Browser Tab ─── */
function BrowserTab({ browserStatus }: { browserStatus: Record<string, unknown> | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Backend', value: String(browserStatus?.backend ?? 'Not configured'), color: '#FFB627' },
          { label: 'Available', value: `${(browserStatus?.available as string[])?.length ?? 0} backends`, color: '#7B2CBF' },
          { label: 'Sessions', value: String(browserStatus?.activeSessions ?? 0), color: '#1B998B' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3 text-center">
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="font-mono font-bold text-xs" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-[#8888aa]">
        Supported backends: Browserbase (cloud), Browser Use (cloud), Local Chromium/CDP, agent-browser CLI.
        Use the chat interface with browser commands to navigate, screenshot, and automate web interactions.
      </div>
    </div>
  );
}

/* ─── Memory Tab ─── */
function MemoryTab({ memoryProviders }: { memoryProviders: Record<string, unknown> | null }) {
  const providers = (memoryProviders?.providers as Array<{ name: string; configured: boolean }>) ?? [];
  const active = memoryProviders?.activeProvider as string;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)]">
        <Database size={14} style={{ color: '#2E86AB' }} />
        <div>
          <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Active Provider</div>
          <div className="font-mono font-bold text-xs text-[#2E86AB]">{active || 'built-in (MEMORY.md)'}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Available Providers</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {providers.length > 0 ? providers.map(p => (
            <div key={p.name} className="flex items-center justify-between p-2 rounded-lg border"
              style={{ borderColor: `${p.configured ? '#2E86AB' : '#8888aa'}20`, background: `${p.configured ? '#2E86AB' : '#8888aa'}06` }}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: p.configured ? '#00ff88' : '#8888aa' }} />
                <span className="text-[10px] font-medium" style={{ color: p.configured ? '#ccccdd' : '#8888aa' }}>{p.name}</span>
              </div>
              <span className="text-[8px] font-mono" style={{ color: p.configured ? '#00ff88' : '#8888aa' }}>
                {p.configured ? 'READY' : 'NOT CONFIGURED'}
              </span>
            </div>
          )) : (
            <div className="col-span-full text-[10px] text-[#8888aa] py-4 text-center">
              8 memory providers available (Honcho, Mem0, Holographic, RetainDB, etc.). Configure via <code className="text-[#FFB627]">~/.hermes/config.yaml</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Cron Tab ─── */
function CronTab({ cronJobs }: { cronJobs: Record<string, unknown> | null }) {
  const jobs = (cronJobs?.jobs as Array<{ id: string; schedule: string; command: string; enabled: boolean; lastRun?: string; nextRun?: string }>) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Scheduled Jobs</span>
        <span className="text-[9px] font-mono text-[#1B998B]">{jobs.length} jobs</span>
      </div>
      {jobs.length > 0 ? (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.id} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: job.enabled ? '#00ff88' : '#8888aa' }} />
                  <span className="text-[10px] font-medium text-white">{job.command}</span>
                </div>
                <span className="text-[8px] font-mono" style={{ color: job.enabled ? '#1B998B' : '#8888aa' }}>
                  {job.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[8px] text-[#8888aa]">
                <span className="font-mono">{job.schedule}</span>
                {job.nextRun && <span>Next: {job.nextRun}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-[#8888aa] py-4 text-center">
          No cron jobs configured. Use <code className="text-[#FFB627]">hermes cron add</code> to schedule automated agent runs.
        </div>
      )}
    </div>
  );
}

/* ─── Web Search Tab ─── */
function WebTab({ webConfig }: { webConfig: Record<string, unknown> | null }) {
  const available = (webConfig?.available as string[]) ?? [];
  const backend = webConfig?.backend as string;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Active Backend</div>
          <div className="font-mono font-bold text-xs text-[#FFB627]">{backend || 'auto-detect'}</div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Configured</div>
          <div className="font-mono font-bold text-xs text-[#1B998B]">{available.length} / 4 backends</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Search Backends</span>
        {['firecrawl', 'parallel', 'tavily', 'exa'].map(b => {
          const isAvailable = available.includes(b);
          return (
            <div key={b} className="flex items-center justify-between p-2 rounded-lg border"
              style={{ borderColor: `${isAvailable ? '#1B998B' : '#8888aa'}20`, background: `${isAvailable ? '#1B998B' : '#8888aa'}06` }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isAvailable ? '#00ff88' : '#8888aa' }} />
                <span className="text-[10px] font-medium" style={{ color: isAvailable ? '#ccccdd' : '#8888aa' }}>{b}</span>
              </div>
              <span className="text-[8px] font-mono" style={{ color: isAvailable ? '#00ff88' : '#8888aa' }}>
                {isAvailable ? 'API KEY SET' : 'NOT CONFIGURED'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Voice Tab ─── */
function VoiceTab({ voiceConfig }: { voiceConfig: Record<string, unknown> | null }) {
  const tts = voiceConfig?.tts as { provider: string | null; available: string[] } | undefined;
  const stt = voiceConfig?.stt as { provider: string | null; available: string[] } | undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Mic size={10} style={{ color: '#FFB627' }} />
            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">TTS Provider</span>
          </div>
          <div className="font-mono font-bold text-xs text-[#FFB627]">{tts?.provider || 'edge-tts (free)'}</div>
          <div className="text-[8px] text-[#8888aa] mt-1">{tts?.available?.length ?? 5} providers available</div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Search size={10} style={{ color: '#2E86AB' }} />
            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">STT Provider</span>
          </div>
          <div className="font-mono font-bold text-xs text-[#2E86AB]">{stt?.provider || 'faster-whisper (free)'}</div>
          <div className="text-[8px] text-[#8888aa] mt-1">{stt?.available?.length ?? 6} providers available</div>
        </div>
      </div>

      <div className="text-[10px] text-[#8888aa]">
        Voice I/O works across all 19+ gateway platforms. Free local providers (Edge TTS, faster-whisper) require no API keys.
        Premium providers (ElevenLabs, OpenAI TTS) need API keys configured in <code className="text-[#FFB627]">~/.hermes/.env</code>.
      </div>
    </div>
  );
}
