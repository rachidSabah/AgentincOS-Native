'use client';

// ============================================================
// Agentic OS V2 — Observability Dashboard
// ============================================================
import { cn } from '@/lib/utils';
import { Activity, Zap, AlertTriangle, Database, Bot, Server, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemHealthData {
  status: string;
  activeAgents: number;
  totalAgents: number;
  activeModels: number;
  totalModels: number;
  avgLatencyMs: number;
  errorRate: number;
  memoryUsage: number;
  uptime: number;
}

interface ProviderHealthData {
  provider: string;
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  status: string;
}

export function ObservabilityDashboard() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [providers, setProviders] = useState<ProviderHealthData[]>([]);
  const [latencyData, setLatencyData] = useState<Array<{ time: number; value: number }>>([]);
  const [errorData, setErrorData] = useState<Array<{ time: number; value: number }>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/observability');
        const data = await response.json() as {
          systemHealth: SystemHealthData;
          providerHealth: ProviderHealthData[];
          charts: {
            latency: Array<{ time: number; value: number }>;
            errors: Array<{ time: number; value: number }>;
          };
        };
        setHealth(data.systemHealth);
        setProviders(data.providerHealth ?? []);
        setLatencyData(data.charts?.latency ?? []);
        setErrorData(data.charts?.errors ?? []);
      } catch {
        setHealth({
          status: 'healthy',
          activeAgents: 0,
          totalAgents: 0,
          activeModels: 7,
          totalModels: 7,
          avgLatencyMs: 0,
          errorRate: 0,
          memoryUsage: 0,
          uptime: 0,
        });
        setProviders([
          { provider: 'openai', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
          { provider: 'claude', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
          { provider: 'gemini-cli', healthy: false, latencyMs: 0, successRate: 0, status: 'unhealthy' },
          { provider: 'gemini', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
          { provider: 'glm', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
          { provider: 'mistral', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
          { provider: 'qwen', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
          { provider: 'deepseek', healthy: true, latencyMs: 0, successRate: 1, status: 'healthy' },
        ]);
      }
    };
    load();
    const interval = setInterval(() => { load(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusColors: Record<string, string> = {
    healthy: '#00ff88',
    degraded: '#FFB627',
    unhealthy: '#E6394A',
  };

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-[#00ff88]" />
        <h2 className="text-xl font-bold text-foreground">Observability</h2>
        {health && (
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: `${statusColors[health.status]}30`, color: statusColors[health.status] }}
          >
            {health.status}
          </Badge>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<Bot className="w-4 h-4 text-[#9d4edd]" />}
          label="Active Agents"
          value={health?.activeAgents ?? 0}
          subtext={`of ${health?.totalAgents ?? 0} total`}
        />
        <MetricCard
          icon={<Zap className="w-4 h-4 text-[#FFB627]" />}
          label="Avg Latency"
          value={`${health?.avgLatencyMs ?? 0}ms`}
          subtext="p50"
        />
        <MetricCard
          icon={<AlertTriangle className="w-4 h-4 text-[#E6394A]" />}
          label="Error Rate"
          value={`${((health?.errorRate ?? 0) * 100).toFixed(1)}%`}
          subtext="last hour"
        />
        <MetricCard
          icon={<Database className="w-4 h-4 text-[#00ffff]" />}
          label="Memory Usage"
          value={`${(health?.memoryUsage ?? 0).toFixed(0)}%`}
          subtext="of allocated"
        />
      </div>

      {/* Provider health */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-[#9d4edd]" />
            Provider Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {providers.map((p) => (
              <div
                key={p.provider}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-muted/20 border border-border"
              >
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  p.status === 'healthy' && 'bg-[#00ff88]',
                  p.status === 'degraded' && 'bg-yellow-500',
                  p.status === 'down' && 'bg-[#E6394A]',
                )} />
                <span className="text-[10px] capitalize font-medium">{p.provider}</span>
                <span className="text-[9px] text-muted-foreground">
                  {p.latencyMs > 0 ? `${p.latencyMs}ms` : 'Ready'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Latency Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyData.map((d) => ({ time: new Date(d.time).toLocaleTimeString(), ms: d.value }))}>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8888aa' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8888aa' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#12122a', border: '1px solid rgba(157,78,221,0.2)', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="ms" stroke="#9d4edd" fill="rgba(157,78,221,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={errorData.map((d) => ({ time: new Date(d.time).toLocaleTimeString(), errors: d.value }))}>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8888aa' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8888aa' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#12122a', border: '1px solid rgba(157,78,221,0.2)', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="errors" stroke="#E6394A" fill="rgba(230,57,74,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uptime */}
      {health && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Uptime: {formatUptime(health.uptime)}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, subtext }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-[10px] text-muted-foreground">{subtext}</div>
      </CardContent>
    </Card>
  );
}
