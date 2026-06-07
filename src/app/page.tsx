'use client';

// ============================================================
// Agentic OS V2 — Enhanced Main Page (Lazy-Loaded Architecture)
// ============================================================
import React, { useState, useEffect, useCallback, Suspense, lazy, memo } from 'react';
import { useOSStore } from '@/lib/store';
import type { ViewType, BrainOverlayType, KernelState } from '@/lib/types';
import {
  Bot, Terminal, Activity, FileCode, Brain, Cpu, Clock,
  MemoryStick, Zap, CheckCircle2, XCircle, Loader2, Server,
  ChevronDown, Layers, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Lazy-loaded external components ───

const LazyAppSidebar = lazy(() =>
  import('@/components/app-sidebar').then((m) => ({ default: m.AppSidebar }))
);

const LazyHomeDashboard = lazy(() =>
  import('@/components/home-dashboard').then((m) => ({ default: m.HomeDashboard }))
);

const LazyChatWorkspace = lazy(() =>
  import('@/components/chat-workspace').then((m) => ({ default: m.ChatWorkspace }))
);

const LazyArtifactPanel = lazy(() =>
  import('@/components/artifact-panel').then((m) => ({ default: m.ArtifactPanel }))
);

const LazyTerminalPanel = lazy(() =>
  import('@/components/terminal-panel').then((m) => ({ default: m.TerminalPanel }))
);

const LazyAgentMonitor = lazy(() =>
  import('@/components/agent-monitor').then((m) => ({ default: m.AgentMonitor }))
);

const LazyModelMonitor = lazy(() =>
  import('@/components/model-monitor').then((m) => ({ default: m.ModelMonitor }))
);

const LazySelfHealingDashboard = lazy(() =>
  import('@/components/self-healing-dashboard').then((m) => ({ default: m.SelfHealingDashboard }))
);

const LazySwarmViewer = lazy(() =>
  import('@/components/swarm-viewer').then((m) => ({ default: m.SwarmViewer }))
);

const LazyObservabilityDashboard = lazy(() =>
  import('@/components/observability-dashboard').then((m) => ({ default: m.ObservabilityDashboard }))
);

const LazyMemoryBrowser = lazy(() =>
  import('@/components/memory-browser').then((m) => ({ default: m.MemoryBrowser }))
);

const LazyKnowledgeBrowser = lazy(() =>
  import('@/components/knowledge-browser').then((m) => ({ default: m.KnowledgeBrowser }))
);

const LazySettingsPanel = lazy(() =>
  import('@/components/settings-panel').then((m) => ({ default: m.SettingsPanel }))
);

const LazyFileEditor = lazy(() =>
  import('@/components/file-editor').then((m) => ({ default: m.FileEditor }))
);

const LazyBrowserAgent = lazy(() =>
  import('@/components/browser-agent').then((m) => ({ default: m.BrowserAgent }))
);

// ─── Preload on hover ───

const preloadComponent = (view: ViewType) => {
  switch (view) {
    case 'home': import('@/components/home-dashboard'); break;
    case 'chat': import('@/components/chat-workspace'); break;
    case 'swarm': import('@/components/swarm-viewer'); break;
    case 'memory': import('@/components/memory-browser'); break;
    case 'knowledge': import('@/components/knowledge-browser'); break;
    case 'observability': import('@/components/observability-dashboard'); break;
    case 'healing': import('@/components/self-healing-dashboard'); break;
    case 'settings': import('@/components/settings-panel'); break;
    case 'editor': import('@/components/file-editor'); break;
    case 'browser': import('@/components/browser-agent'); break;
    // Inline views — no import needed, already in bundle
    case 'agents':
    case 'brain':
    case 'kernel':
    case 'artifacts':
    case 'terminal':
      break;
  }
};

// ─── Suspense fallback wrapper ───

function LazyView({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// ─── Kernel Status Bar Data ───

interface KernelBarData {
  status: string;
  uptime: number;
  agentCount: number;
  activeModelProvider: string;
  memoryUsage: number;
  totalEvents: number;
  activeTasks: number;
}

function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ─── Kernel Status Bar ───

function KernelStatusBar() {
  const { kernelStatus, setKernelStatus } = useOSStore();
  const [data, setData] = useState<KernelBarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKernel = useCallback(async () => {
    try {
      const res = await fetch('/api/kernel');
      const json = await res.json();
      setData(json);
      setKernelStatus(json.status as typeof kernelStatus);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [setKernelStatus]);

  useEffect(() => {
    fetchKernel();
    const interval = setInterval(fetchKernel, 10000);
    return () => clearInterval(interval);
  }, [fetchKernel]);

  const isRunning = kernelStatus === 'running';
  const statusColor = isRunning ? '#00ff88' : kernelStatus === 'initializing' ? '#FFB627' : '#E6394A';

  return (
    <div className="h-9 bg-[#0d0d20]/80 backdrop-blur-md border-b border-border/50 flex items-center px-4 gap-4 shrink-0 z-10 overflow-x-auto">
      {/* Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex items-center justify-center">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          {isRunning && (
            <div
              className="absolute w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: statusColor, opacity: 0.4 }}
            />
          )}
        </div>
        <span className="text-[11px] font-medium" style={{ color: statusColor }}>
          {kernelStatus.toUpperCase()}
        </span>
      </div>

      <div className="w-px h-4 bg-border/50 shrink-0" />

      {/* Agent count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Bot className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          {loading ? '...' : (data?.agentCount ?? 0)} agents
        </span>
      </div>

      <div className="w-px h-4 bg-border/50 shrink-0" />

      {/* Active model provider */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Zap className="w-3 h-3 text-[#9d4edd]" />
        <span className="text-[11px] text-muted-foreground">
          {loading ? '...' : (data?.activeModelProvider ?? 'none')}
        </span>
      </div>

      <div className="w-px h-4 bg-border/50 shrink-0" />

      {/* Memory usage */}
      <div className="flex items-center gap-1.5 shrink-0">
        <MemoryStick className="w-3 h-3 text-[#2E86AB]" />
        <span className="text-[11px] text-muted-foreground">
          {loading ? '...' : `${data?.memoryUsage ?? 0} MB`}
        </span>
      </div>

      <div className="w-px h-4 bg-border/50 shrink-0" />

      {/* Uptime */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          {loading ? '...' : formatUptime(data?.uptime ?? 0)}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Events & Tasks (right side) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            {data?.totalEvents ?? 0} events
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Loader2 className={`w-3 h-3 text-muted-foreground ${(data?.activeTasks ?? 0) > 0 ? 'animate-spin' : ''}`} />
          <span className="text-[11px] text-muted-foreground">
            {data?.activeTasks ?? 0} tasks
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Brain View (inline — wrapped in memo) ───

const ALL_OVERLAYS: { id: BrainOverlayType; label: string; color: string }[] = [
  { id: 'default', label: 'Default', color: '#888888' },
  { id: 'claude', label: 'Claude', color: '#E8751A' },
  { id: 'hermes', label: 'Hermes', color: '#9d4edd' },
  { id: 'research', label: 'Research', color: '#2E86AB' },
  { id: 'coding', label: 'Coding', color: '#00ff88' },
  { id: 'architect', label: 'Architect', color: '#00ffff' },
  { id: 'analyst', label: 'Analyst', color: '#FFB627' },
  { id: 'devops', label: 'DevOps', color: '#1B998B' },
  { id: 'security', label: 'Security', color: '#E6394A' },
  { id: 'business', label: 'Business', color: '#6B5B95' },
  { id: 'recruitment', label: 'Recruitment', color: '#88B04B' },
  { id: 'aviation', label: 'Aviation', color: '#92A8D1' },
  { id: 'custom', label: 'Custom', color: '#DD4124' },
];

const PIPELINE_STAGES = [
  { id: 'input', label: 'Input Processing', icon: ArrowRight },
  { id: 'routing', label: 'Brain Routing', icon: Layers },
  { id: 'execution', label: 'Multi-Brain Execution', icon: Brain },
  { id: 'merge', label: 'Result Merging', icon: ChevronDown },
  { id: 'output', label: 'Response Output', icon: CheckCircle2 },
];

const BrainView = memo(function BrainView() {
  const { activeOverlays, toggleOverlay } = useOSStore();
  const [pipelineStage, setPipelineStage] = useState(0);

  // Simulate pipeline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPipelineStage((prev) => (prev + 1) % (PIPELINE_STAGES.length + 2));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-[#9d4edd]" />
        <h2 className="text-xl font-bold text-foreground">Brain Overlays</h2>
        <Badge variant="outline" className="text-[10px] border-[#9d4edd]/30 text-[#9d4edd]">
          {activeOverlays.length} active
        </Badge>
      </div>

      {/* Overlay Selector */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Overlay Selector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ALL_OVERLAYS.map((overlay) => {
              const isActive = activeOverlays.includes(overlay.id);
              return (
                <motion.div
                  key={overlay.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isActive
                      ? 'border-opacity-50 bg-opacity-10'
                      : 'border-border/50 bg-transparent hover:bg-muted/20'
                  }`}
                  style={isActive ? {
                    borderColor: `${overlay.color}40`,
                    backgroundColor: `${overlay.color}10`,
                  } : {}}
                  onClick={() => {
                    // Don't allow deactivating the last overlay
                    if (isActive && activeOverlays.length <= 1) return;
                    toggleOverlay(overlay.id);
                  }}
                >
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={() => {
                      if (isActive && activeOverlays.length <= 1) return;
                      toggleOverlay(overlay.id);
                    }}
                    className="pointer-events-none"
                  />
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: overlay.color }}
                  />
                  <span className={`text-xs ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {overlay.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Overlays Display */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Active Overlays</h3>
        <div className="flex flex-wrap gap-2">
          {activeOverlays.map((id) => {
            const overlay = ALL_OVERLAYS.find((o) => o.id === id);
            if (!overlay) return null;
            return (
              <Badge
                key={id}
                variant="outline"
                className="text-xs py-1 px-2.5"
                style={{
                  borderColor: `${overlay.color}40`,
                  color: overlay.color,
                  backgroundColor: `${overlay.color}10`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: overlay.color }} />
                {overlay.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Pipeline Status */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Brain Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage, index) => {
              const isComplete = pipelineStage > index;
              const isActive = pipelineStage === index;
              const isPending = pipelineStage < index;
              const Icon = stage.icon;

              return (
                <motion.div
                  key={stage.id}
                  initial={false}
                  animate={{ opacity: isPending ? 0.4 : 1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isComplete ? 'bg-[#00ff88]/15 text-[#00ff88]' :
                    isActive ? 'bg-[#FFB627]/15 text-[#FFB627]' :
                    'bg-muted/30 text-muted-foreground'
                  }`}>
                    {isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isActive ? 'text-[#FFB627]' : isComplete ? 'text-[#00ff88]' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </div>
                    <Progress
                      value={isComplete ? 100 : isActive ? 50 : 0}
                      className={`h-1 mt-1 ${isComplete ? '[&>[data-slot=progress-indicator]]:bg-[#00ff88]' : isActive ? '[&>[data-slot=progress-indicator]]:bg-[#FFB627]' : ''}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {isComplete ? 'Done' : isActive ? 'Running' : 'Pending'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Brain Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Brains', value: '7', color: '#9d4edd' },
          { label: 'Overlays', value: String(activeOverlays.length), color: '#E8751A' },
          { label: 'Avg Latency', value: '142ms', color: '#2E86AB' },
          { label: 'Success Rate', value: '97.3%', color: '#00ff88' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
              <div className="text-lg font-bold mt-1" style={{ color: stat.color }}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// ─── Kernel View (inline — wrapped in memo) ───

const KernelView = memo(function KernelView() {
  const [data, setData] = useState<KernelState & {
    memoryUsage?: number;
    activeModelProvider?: string;
    agentCount?: number;
    recentEvents?: Array<{ id: string; type: string; timestamp: number }>;
    scheduledTasks?: Array<{
      id: string; name: string; priority: number; status: string;
      createdAt: number; error?: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { kernelStatus, setKernelStatus } = useOSStore();

  const fetchKernel = useCallback(async () => {
    try {
      const res = await fetch('/api/kernel');
      const json = await res.json();
      setData(json);
      setKernelStatus(json.status);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [setKernelStatus]);

  useEffect(() => {
    fetchKernel();
    const interval = setInterval(fetchKernel, 5000);
    return () => clearInterval(interval);
  }, [fetchKernel]);

  const handleKernelAction = async (action: 'init' | 'shutdown') => {
    try {
      await fetch('/api/kernel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchKernel();
    } catch (error) {
      console.error('Kernel action failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isRunning = kernelStatus === 'running';
  const statusColor = isRunning ? '#00ff88' : kernelStatus === 'initializing' ? '#FFB627' : '#E6394A';

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6" style={{ color: statusColor }} />
          <h2 className="text-xl font-bold text-foreground">Agentic Kernel</h2>
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: `${statusColor}40`, color: statusColor, backgroundColor: `${statusColor}10` }}
          >
            {kernelStatus.toUpperCase()}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              size="sm"
              onClick={() => handleKernelAction('init')}
              className="bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25 border border-[#00ff88]/30"
            >
              <Server className="w-3.5 h-3.5 mr-1.5" />
              Initialize
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleKernelAction('shutdown')}
              className="bg-[#E6394A]/15 text-[#E6394A] hover:bg-[#E6394A]/25 border border-[#E6394A]/30"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Shutdown
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Uptime', value: formatUptime(data?.uptime ?? 0), icon: Clock, color: '#00ff88' },
          { label: 'Memory', value: `${data?.memoryUsage ?? 0} MB`, icon: MemoryStick, color: '#2E86AB' },
          { label: 'Events', value: String(data?.totalEvents ?? 0), icon: Activity, color: '#9d4edd' },
          { label: 'Active Tasks', value: String(data?.activeTasks ?? 0), icon: Loader2, color: '#FFB627' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-lg font-bold mt-1" style={{ color: stat.color }}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs for details */}
      <Tabs defaultValue="registries" className="w-full">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="registries">Registries</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="tasks">Scheduler</TabsTrigger>
        </TabsList>

        <TabsContent value="registries" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(data?.registryCounts ?? {}).map(([key, value]) => {
              const colors: Record<string, string> = {
                agents: '#00ff88', brains: '#9d4edd', models: '#E8751A',
                tools: '#2E86AB', skills: '#FFB627', artifacts: '#1B998B',
              };
              return (
                <Card key={key} className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground capitalize">{key}</div>
                    <div className="text-2xl font-bold mt-1" style={{ color: colors[key] ?? '#888' }}>
                      {value as number}
                    </div>
                    <Progress
                      value={Math.min(((value as number) / 20) * 100, 100)}
                      className="h-1 mt-2"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.recentEvents?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No events yet</div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
                  {data?.recentEvents?.map((event) => (
                    <div key={event.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/20 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd]" />
                      <span className="text-foreground font-mono">{event.type}</span>
                      <span className="text-muted-foreground ml-auto">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.scheduledTasks?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No scheduled tasks</div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {data?.scheduledTasks?.map((task) => {
                    const statusColors: Record<string, string> = {
                      pending: '#FFB627', running: '#00ff88', completed: '#2E86AB', failed: '#E6394A',
                    };
                    return (
                      <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/10 border border-border/50">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[task.status] ?? '#888' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground truncate">{task.name}</div>
                          <div className="text-[10px] text-muted-foreground">Priority: {task.priority}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]"
                          style={{ borderColor: `${statusColors[task.status] ?? '#888'}40`, color: statusColors[task.status] ?? '#888' }}>
                          {task.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

// ─── Agents View (inline — wrapped in memo) ───

const AgentsView = memo(function AgentsView() {
  const [agents, setAgents] = useState<Array<{ id: string; name: string; type: string; status: string; currentTask?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const spawnAgent = async (type: string) => {
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const res = await fetch('/api/agents');
    const data = await res.json();
    setAgents(data.agents ?? []);
  };

  const agentTypes = ['planner', 'architect', 'researcher', 'coder', 'reviewer', 'verifier', 'memory'];
  const agentColors: Record<string, string> = {
    planner: '#FFB627', architect: '#00ffff', researcher: '#2E86AB',
    coder: '#00ff88', reviewer: '#9d4edd', verifier: '#E8751A', memory: '#1B998B',
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-[#00ff88]" />
        <h2 className="text-xl font-bold text-foreground">Agent Registry</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {agentTypes.map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => spawnAgent(type)}
            className="text-xs capitalize" style={{ borderColor: `${agentColors[type]}30`, color: agentColors[type] }}>
            + {type}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No agents spawned yet</p>
          <p className="text-xs mt-1">Click the buttons above to spawn agents</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <motion.div key={agent.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${agentColors[agent.type] ?? '#888'}15`, color: agentColors[agent.type] ?? '#888' }}>
                  {agent.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{agent.type}</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-[#00ff88]' : agent.status === 'error' ? 'bg-[#E6394A]' : 'bg-muted-foreground'}`} />
                  <span className="text-[10px] text-muted-foreground">{agent.status}</span>
                </div>
              </div>
              {agent.currentTask && (
                <div className="mt-2 text-xs text-muted-foreground truncate">Task: {agent.currentTask}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Artifacts View (inline — wrapped in memo) ───

const ArtifactsView = memo(function ArtifactsView() {
  const [artifacts, setArtifacts] = useState<Array<{ id: string; name: string; type: string; version: number }>>([]);
  const { setActiveArtifact, setArtifactPanelOpen } = useOSStore();

  useEffect(() => {
    fetch('/api/artifacts')
      .then((r) => r.json())
      .then((data) => setArtifacts(data.artifacts ?? []))
      .catch(() => setArtifacts([]));
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
      <div className="flex items-center gap-3">
        <FileCode className="w-6 h-6 text-[#E8751A]" />
        <h2 className="text-xl font-bold text-foreground">Artifacts</h2>
      </div>

      {artifacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileCode className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No artifacts yet</p>
          <p className="text-xs mt-1">Artifacts are created during chat sessions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {artifacts.map((a) => (
            <Card key={a.id} className="bg-card border-border cursor-pointer hover:border-[#9d4edd]/30 transition-colors"
              onClick={() => { setActiveArtifact(a as never); setArtifactPanelOpen(true); }}>
              <CardContent className="p-4">
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.type} · v{a.version}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Terminal View (inline — wrapped in memo) ───

const TerminalView = memo(function TerminalView() {
  const { setTerminalOpen } = useOSStore();
  useEffect(() => { setTerminalOpen(true); }, [setTerminalOpen]);
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Terminal className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Terminal panel is open at the bottom</p>
        <p className="text-xs mt-1">Type naturally or use commands</p>
      </div>
    </div>
  );
});

// ─── View Router (uses lazy components with Suspense) ───

function ViewRenderer({ view }: { view: ViewType }) {
  switch (view) {
    case 'home':
      return (
        <LazyView>
          <LazyHomeDashboard />
        </LazyView>
      );
    case 'chat':
      return (
        <LazyView>
          <LazyChatWorkspace />
        </LazyView>
      );
    case 'agents':
      return <AgentsView />;
    case 'brain':
      return <BrainView />;
    case 'kernel':
      return <KernelView />;
    case 'swarm':
      return (
        <LazyView>
          <LazySwarmViewer />
        </LazyView>
      );
    case 'memory':
      return (
        <LazyView>
          <LazyMemoryBrowser />
        </LazyView>
      );
    case 'knowledge':
      return (
        <LazyView>
          <LazyKnowledgeBrowser />
        </LazyView>
      );
    case 'artifacts':
      return <ArtifactsView />;
    case 'editor':
      return (
        <LazyView>
          <LazyFileEditor />
        </LazyView>
      );
    case 'terminal':
      return <TerminalView />;
    case 'observability':
      return (
        <LazyView>
          <LazyObservabilityDashboard />
        </LazyView>
      );
    case 'healing':
      return (
        <LazyView>
          <LazySelfHealingDashboard />
        </LazyView>
      );
    case 'settings':
      return (
        <LazyView>
          <LazySettingsPanel />
        </LazyView>
      );
    case 'browser':
      return (
        <LazyView>
          <LazyBrowserAgent />
        </LazyView>
      );
    default:
      return (
        <LazyView>
          <LazyHomeDashboard />
        </LazyView>
      );
  }
}

// ─── Main Page ───

export default function HomePage() {
  const {
    activeView, artifactPanelOpen, terminalOpen,
    agentMonitorVisible, modelMonitorVisible,
    setAgentMonitorVisible, setModelMonitorVisible, setTerminalOpen,
    kernelStatus, activeOverlays,
  } = useOSStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAgentMonitorVisible(!agentMonitorVisible);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setModelMonitorVisible(!modelMonitorVisible);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(!terminalOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [agentMonitorVisible, modelMonitorVisible, terminalOpen, setAgentMonitorVisible, setModelMonitorVisible, setTerminalOpen]);

  const isKernelRunning = kernelStatus === 'running';
  const kernelDotColor = isKernelRunning ? '#00ff88' : kernelStatus === 'initializing' ? '#FFB627' : '#E6394A';

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a]">
      {/* Left Sidebar (lazy-loaded) */}
      <LazyView>
        <LazyAppSidebar />
      </LazyView>

      {/* Center Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Kernel Status Bar */}
        <KernelStatusBar />

        {/* Main view */}
        <main className="flex-1 overflow-hidden pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="h-full"
            >
              <ViewRenderer view={activeView} />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Terminal Panel (lazy-loaded) */}
        <LazyView>
          <LazyTerminalPanel />
        </LazyView>
      </div>

      {/* Right Artifact Panel (lazy-loaded) */}
      <AnimatePresence>
        {artifactPanelOpen && (
          <LazyView>
            <LazyArtifactPanel />
          </LazyView>
        )}
      </AnimatePresence>

      {/* Floating Monitors (lazy-loaded) */}
      <LazyView>
        <LazyAgentMonitor />
      </LazyView>
      <LazyView>
        <LazyModelMonitor />
      </LazyView>

      {/* Bottom toolbar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#0d0d20]/90 backdrop-blur-md border-t border-border flex items-center justify-between px-3 z-40">
        <div className="flex items-center gap-2">
          {/* Kernel status dot */}
          <div className="flex items-center gap-1.5 mr-1">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: kernelDotColor }} />
              {isKernelRunning && (
                <div className="absolute w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: kernelDotColor, opacity: 0.3 }} />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground capitalize">{kernelStatus}</span>
          </div>

          <div className="w-px h-3 bg-border/50" />

          {/* Active overlays */}
          <div className="flex items-center gap-1 max-w-[200px] overflow-hidden">
            {activeOverlays.slice(0, 3).map((id) => {
              const overlay = ALL_OVERLAYS.find((o) => o.id === id);
              return (
                <Badge
                  key={id}
                  variant="outline"
                  className="text-[9px] py-0 px-1.5 h-4 shrink-0"
                  style={{
                    borderColor: `${overlay?.color ?? '#888'}30`,
                    color: overlay?.color ?? '#888',
                    backgroundColor: `${overlay?.color ?? '#888'}08`,
                  }}
                >
                  {overlay?.label ?? id}
                </Badge>
              );
            })}
            {activeOverlays.length > 3 && (
              <span className="text-[9px] text-muted-foreground">+{activeOverlays.length - 3}</span>
            )}
          </div>

          <div className="w-px h-3 bg-border/50" />

          {/* Model provider */}
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#9d4edd]" />
            <span className="text-[10px] text-muted-foreground">openai</span>
          </div>

          <div className="w-px h-3 bg-border/50" />

          {/* Agent count */}
          <div className="flex items-center gap-1">
            <Bot className="w-3 h-3 text-[#00ff88]" />
            <span className="text-[10px] text-muted-foreground">0</span>
          </div>

          <div className="w-px h-3 bg-border/50" />

          <Button variant="ghost" size="sm" onClick={() => setAgentMonitorVisible(!agentMonitorVisible)}
            className={`h-5 text-[10px] px-2 ${agentMonitorVisible ? 'text-[#00ff88]' : 'text-muted-foreground'}`}>
            <Bot className="w-3 h-3 mr-1" /> Agents
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setModelMonitorVisible(!modelMonitorVisible)}
            className={`h-5 text-[10px] px-2 ${modelMonitorVisible ? 'text-[#9d4edd]' : 'text-muted-foreground'}`}>
            <Activity className="w-3 h-3 mr-1" /> Models
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTerminalOpen(!terminalOpen)}
            className={`h-5 text-[10px] px-2 ${terminalOpen ? 'text-[#00ff88]' : 'text-muted-foreground'}`}>
            <Terminal className="w-3 h-3 mr-1" /> Terminal
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground hidden sm:block">
          Ctrl+Shift+A Agents · Ctrl+Shift+M Models · Ctrl+` Terminal
        </div>
      </div>
    </div>
  );
}
