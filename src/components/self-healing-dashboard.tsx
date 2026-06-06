'use client';

// ============================================================
// Agentic OS V2 — Self-Healing Dashboard
// Comprehensive dashboard for monitoring and controlling the
// self-healing engine: health, events, patterns, strategies
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  Shield, HeartPulse, Activity, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, RotateCcw, Wrench, ArrowRightLeft,
  RefreshCw, Undo2, ChevronDown, ChevronUp, Loader2,
  TrendingUp, Brain, Eye, ToggleLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  HealingErrorCategory,
  HealingStrategy,
  HealingOutcome,
  HealingEvent,
  HealthCheckResult,
  HealingPattern,
} from '@/lib/types';

// ─── Type Definitions ────────────────────────────────────────

interface HealthStatus {
  totalEvents: number;
  resolvedEvents: number;
  unresolvedEvents: number;
  recentErrors: number;
  avgRecoveryMs: number;
  topCategories: Array<{ category: HealingErrorCategory; count: number }>;
  topStrategies: Array<{ strategy: HealingStrategy; successRate: number }>;
  componentHealth: HealthCheckResult[];
}

interface DashboardData {
  health: HealthStatus;
  events: HealingEvent[];
  patterns: HealingPattern[];
  healthChecks: HealthCheckResult[];
}

// ─── Constants ───────────────────────────────────────────────

const CATEGORY_COLORS: Record<HealingErrorCategory, string> = {
  agent_failure: '#9d4edd',
  model_failure: '#E8751A',
  memory_failure: '#2E86AB',
  api_failure: '#FFB627',
  tool_failure: '#1B998B',
  ui_failure: '#00ff88',
  route_failure: '#E6394A',
};

const CATEGORY_LABELS: Record<HealingErrorCategory, string> = {
  agent_failure: 'Agent',
  model_failure: 'Model',
  memory_failure: 'Memory',
  api_failure: 'API',
  tool_failure: 'Tool',
  ui_failure: 'UI',
  route_failure: 'Route',
};

const STRATEGY_COLORS: Record<HealingStrategy, string> = {
  retry: '#FFB627',
  repair: '#00ff88',
  reroute: '#2E86AB',
  recover: '#9d4edd',
  restart: '#E6394A',
  rollback: '#E8751A',
};

const STRATEGY_ICONS: Record<HealingStrategy, React.ElementType> = {
  retry: RotateCcw,
  repair: Wrench,
  reroute: ArrowRightLeft,
  recover: RefreshCw,
  restart: Undo2,
  rollback: Undo2,
};

const OUTCOME_CONFIG: Record<HealingOutcome, { color: string; label: string; icon: React.ElementType }> = {
  success: { color: '#00ff88', label: 'Success', icon: CheckCircle2 },
  partial: { color: '#FFB627', label: 'Partial', icon: AlertTriangle },
  failure: { color: '#E6394A', label: 'Failed', icon: XCircle },
};

const SUBSYSTEM_STATUS: { name: string; category: HealingErrorCategory; icon: React.ElementType }[] = [
  { name: 'Agents', category: 'agent_failure', icon: Brain },
  { name: 'Models', category: 'model_failure', icon: Zap },
  { name: 'Memory', category: 'memory_failure', icon: Activity },
  { name: 'API', category: 'api_failure', icon: ArrowRightLeft },
  { name: 'Tools', category: 'tool_failure', icon: Wrench },
  { name: 'UI', category: 'ui_failure', icon: Eye },
  { name: 'Routes', category: 'route_failure', icon: RotateCcw },
];

// ─── Utility Functions ───────────────────────────────────────

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getOverallStatus(health: HealthStatus): 'healthy' | 'degraded' | 'unhealthy' {
  if (health.unresolvedEvents === 0 && health.recentErrors < 3) return 'healthy';
  if (health.unresolvedEvents < 5 && health.recentErrors < 10) return 'degraded';
  return 'unhealthy';
}

// ─── Custom Tooltip ──────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#12122a] border border-[#9d4edd]/20 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <div className="text-muted-foreground mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="text-foreground font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({
  icon, label, value, subtext, color, loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            {subtext && <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Health Pulse Indicator ──────────────────────────────────

function HealthPulseIndicator({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  const colors: Record<string, string> = {
    healthy: '#00ff88',
    degraded: '#FFB627',
    unhealthy: '#E6394A',
  };
  const color = colors[status];
  const labels: Record<string, string> = {
    healthy: 'HEALTHY',
    degraded: 'DEGRADED',
    unhealthy: 'UNHEALTHY',
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, border: `2px solid ${color}40` }}
        >
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        {/* Pulsing ring */}
        <motion.div
          className="absolute w-16 h-16 rounded-full"
          style={{ border: `2px solid ${color}` }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-16 h-16 rounded-full"
          style={{ border: `1px solid ${color}` }}
          animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color }}>{labels[status]}</div>
        <div className="text-xs text-muted-foreground">System Status</div>
      </div>
    </div>
  );
}

// ─── Component Health Grid ───────────────────────────────────

function ComponentHealthGrid({ health }: { health: HealthStatus }) {
  const categoryCounts = new Map<string, number>();
  for (const c of health.topCategories) {
    categoryCounts.set(c.category, c.count);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {SUBSYSTEM_STATUS.map((sub) => {
        const count = categoryCounts.get(sub.category) ?? 0;
        const isHealthy = count === 0;
        const statusColor = isHealthy ? '#00ff88' : count < 3 ? '#FFB627' : '#E6394A';
        const Icon = sub.icon;

        return (
          <motion.div
            key={sub.category}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50"
          >
            <div className="relative flex items-center justify-center">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              {!isHealthy && (
                <motion.div
                  className="absolute w-3 h-3 rounded-full"
                  style={{ backgroundColor: statusColor }}
                  animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <Icon className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">{sub.name}</div>
              <div className="text-[10px]" style={{ color: statusColor }}>
                {isHealthy ? 'Healthy' : `${count} error${count !== 1 ? 's' : ''}`}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Error Category Breakdown Chart ──────────────────────────

function ErrorCategoryChart({ health }: { health: HealthStatus }) {
  const allCategories: HealingErrorCategory[] = [
    'agent_failure', 'model_failure', 'memory_failure',
    'api_failure', 'tool_failure', 'ui_failure', 'route_failure',
  ];

  const categoryMap = new Map(health.topCategories.map((c) => [c.category, c.count]));

  const data = allCategories.map((cat) => ({
    category: CATEGORY_LABELS[cat],
    count: categoryMap.get(cat) ?? 0,
    fill: CATEGORY_COLORS[cat],
  }));

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E6394A]" />
          Error Category Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8888aa' }} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: '#8888aa' }} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Healing Event Timeline ─────────────────────────────────

function EventTimeline({ events }: { events: HealingEvent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2E86AB]" />
            Healing Event Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No healing events recorded yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#2E86AB]" />
          Healing Event Timeline
          <Badge variant="outline" className="text-[10px] ml-auto">{events.length} events</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="px-4 pb-4 space-y-2">
            {events.map((event, i) => {
              const outcomeCfg = OUTCOME_CONFIG[event.outcome];
              const OutcomeIcon = outcomeCfg.icon;
              const StrategyIcon = STRATEGY_ICONS[event.strategy] ?? RotateCcw;
              const isExpanded = expandedId === event.id;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="relative pl-6"
                >
                  {/* Timeline line */}
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-border/50" />
                  {/* Timeline dot */}
                  <div
                    className="absolute left-0.5 top-3 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a1a]"
                    style={{ backgroundColor: CATEGORY_COLORS[event.errorCategory] }}
                  />

                  <div
                    className="p-3 rounded-lg bg-muted/10 border border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Timestamp */}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatTimestamp(event.timestamp)}
                      </span>

                      {/* Category Badge */}
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 h-4"
                        style={{
                          borderColor: `${CATEGORY_COLORS[event.errorCategory]}40`,
                          color: CATEGORY_COLORS[event.errorCategory],
                          backgroundColor: `${CATEGORY_COLORS[event.errorCategory]}10`,
                        }}
                      >
                        {CATEGORY_LABELS[event.errorCategory]}
                      </Badge>

                      {/* Strategy */}
                      <div className="flex items-center gap-1">
                        <StrategyIcon className="w-3 h-3" style={{ color: STRATEGY_COLORS[event.strategy] }} />
                        <span className="text-[10px] capitalize" style={{ color: STRATEGY_COLORS[event.strategy] }}>
                          {event.strategy}
                        </span>
                      </div>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Outcome */}
                      <div className="flex items-center gap-1">
                        <OutcomeIcon className="w-3 h-3" style={{ color: outcomeCfg.color }} />
                        <span className="text-[10px]" style={{ color: outcomeCfg.color }}>
                          {outcomeCfg.label}
                        </span>
                      </div>

                      {/* Recovery time */}
                      {event.timeToRecoveryMs !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(event.timeToRecoveryMs)}
                        </span>
                      )}

                      {/* Expand chevron */}
                      {event.recoverySteps.length > 0 && (
                        isExpanded ? (
                          <ChevronUp className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        )
                      )}
                    </div>

                    {/* Error message */}
                    <div className="text-xs text-foreground mt-1.5 truncate">
                      {event.errorMessage}
                    </div>

                    {/* Expanded recovery steps */}
                    <AnimatePresence>
                      {isExpanded && event.recoverySteps.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
                            {event.recoverySteps.map((step, si) => (
                              <div key={si} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <span className="text-[9px] mt-0.5 shrink-0" style={{ color: STRATEGY_COLORS[event.strategy] }}>●</span>
                                {step}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Strategy Success Rates Chart ────────────────────────────

function StrategySuccessChart({ health }: { health: HealthStatus }) {
  const allStrategies: HealingStrategy[] = ['retry', 'repair', 'reroute', 'recover', 'restart', 'rollback'];

  const strategyMap = new Map(health.topStrategies.map((s) => [s.strategy, s.successRate]));

  const data = allStrategies.map((strat) => ({
    strategy: strat.charAt(0).toUpperCase() + strat.slice(1),
    successRate: Math.round((strategyMap.get(strat) ?? 0) * 100),
    fullMark: 100,
  }));

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00ff88]" />
          Strategy Success Rates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="#ffffff10" />
              <PolarAngleAxis dataKey="strategy" tick={{ fontSize: 10, fill: '#8888aa' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#8888aa' }} />
              <Radar
                name="Success Rate"
                dataKey="successRate"
                stroke="#00ff88"
                fill="#00ff88"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Learned Patterns Table ──────────────────────────────────

function LearnedPatternsTable({ patterns }: { patterns: HealingPattern[] }) {
  if (patterns.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#9d4edd]" />
            Learned Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No patterns learned yet. Patterns emerge as the engine heals errors.
          </div>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...patterns].sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, 15);

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#9d4edd]" />
          Learned Patterns
          <Badge variant="outline" className="text-[10px] ml-auto">{patterns.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-72">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Error Signature</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Category</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Best Strategy</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Success Rate</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Count</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Avg Recovery</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((pattern, i) => (
                  <motion.tr
                    key={pattern.errorSignature}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/30 hover:bg-muted/10 transition-colors"
                  >
                    <td className="p-3 max-w-[180px]">
                      <div className="truncate font-mono text-muted-foreground" title={pattern.errorSignature}>
                        {pattern.errorSignature}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 h-4"
                        style={{
                          borderColor: `${CATEGORY_COLORS[pattern.category]}40`,
                          color: CATEGORY_COLORS[pattern.category],
                          backgroundColor: `${CATEGORY_COLORS[pattern.category]}10`,
                        }}
                      >
                        {CATEGORY_LABELS[pattern.category]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="capitalize" style={{ color: STRATEGY_COLORS[pattern.bestStrategy] }}>
                        {pattern.bestStrategy}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={pattern.successRate * 100}
                          className="h-1.5 w-16"
                        />
                        <span className="text-muted-foreground">{Math.round(pattern.successRate * 100)}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{pattern.occurrenceCount}</td>
                    <td className="p-3 text-right text-muted-foreground">{formatTime(pattern.avgRecoveryMs)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Health Check Cards ──────────────────────────────────────

function HealthCheckCards({ healthChecks }: { healthChecks: HealthCheckResult[] }) {
  if (healthChecks.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[#00ff88]" />
            Component Health Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No health checks registered. Health checks appear when components register monitoring.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-[#00ff88]" />
          Component Health Checks
          <Badge variant="outline" className="text-[10px] ml-auto">{healthChecks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {healthChecks.map((check, i) => {
            const statusColor = check.healthy ? '#00ff88' : '#E6394A';

            return (
              <motion.div
                key={check.component}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-lg bg-muted/10 border border-border/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
                    {!check.healthy && (
                      <motion.div
                        className="absolute w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{check.component}</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] ml-auto py-0 px-1.5 h-4"
                    style={{
                      borderColor: `${statusColor}40`,
                      color: statusColor,
                      backgroundColor: `${statusColor}10`,
                    }}
                  >
                    {check.healthy ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Last check:</span>
                    <span>{timeAgo(check.lastChecked)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span>{check.latencyMs > 0 ? `${check.latencyMs}ms` : 'N/A'}</span>
                  </div>
                  {check.lastError && (
                    <div className="mt-1 text-[#E6394A] truncate" title={check.lastError}>
                      Error: {check.lastError}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recovery Time Chart ─────────────────────────────────────

function RecoveryTimeChart({ events }: { events: HealingEvent[] }) {
  const recoveryEvents = events
    .filter((e) => e.timeToRecoveryMs !== undefined)
    .slice(-20);

  if (recoveryEvents.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2E86AB]" />
            Recovery Time Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No recovery data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = recoveryEvents.map((e) => ({
    time: formatTimestamp(e.timestamp),
    ms: e.timeToRecoveryMs ?? 0,
    category: CATEGORY_LABELS[e.errorCategory],
  }));

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#2E86AB]" />
          Recovery Time Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#8888aa' }} />
              <YAxis tick={{ fontSize: 9, fill: '#8888aa' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px' }}
              />
              <Line
                type="monotone"
                dataKey="ms"
                stroke="#2E86AB"
                strokeWidth={2}
                dot={{ fill: '#2E86AB', r: 3 }}
                name="Recovery (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Manual Heal Dialog ──────────────────────────────────────

function ManualHealDialog({ onHeal, healing }: { onHeal: (error: string, componentId?: string, componentType?: string) => void; healing: boolean }) {
  const [error, setError] = useState('');
  const [componentId, setComponentId] = useState('');
  const [componentType, setComponentType] = useState('');
  const [open, setOpen] = useState(false);

  const handleHeal = () => {
    if (!error.trim()) return;
    onHeal(error.trim(), componentId.trim() || undefined, componentType.trim() || undefined);
    setError('');
    setComponentId('');
    setComponentType('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-[#E8751A]/15 text-[#E8751A] hover:bg-[#E8751A]/25 border border-[#E8751A]/30"
        >
          <Wrench className="w-3.5 h-3.5 mr-1.5" />
          Manual Heal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#12122a] border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#E8751A]" />
            Trigger Manual Healing
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Error Message *</label>
            <Input
              value={error}
              onChange={(e) => setError(e.target.value)}
              placeholder="e.g., Agent unresponsive timeout"
              className="bg-muted/20 border-border text-foreground text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Component ID</label>
              <Input
                value={componentId}
                onChange={(e) => setComponentId(e.target.value)}
                placeholder="e.g., agent-planner-01"
                className="bg-muted/20 border-border text-foreground text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Component Type</label>
              <Select value={componentType} onValueChange={setComponentType}>
                <SelectTrigger className="bg-muted/20 border-border text-foreground text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#12122a] border-border">
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="memory">Memory</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="ui">UI</SelectItem>
                  <SelectItem value="route">Route</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleHeal}
            disabled={!error.trim() || healing}
            className="w-full bg-[#E8751A]/15 text-[#E8751A] hover:bg-[#E8751A]/25 border border-[#E8751A]/30"
          >
            {healing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Healing...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Trigger Heal
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard Component ────────────────────────────────

export function SelfHealingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoHeal, setAutoHeal] = useState(false);
  const [healing, setHealing] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/self-healing');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoHeal) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoHeal, fetchData]);

  // Manual heal handler
  const handleManualHeal = useCallback(async (errorMsg: string, componentId?: string, componentType?: string) => {
    setHealing(true);
    try {
      const res = await fetch('/api/self-healing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorMsg, componentId, componentType }),
      });
      if (!res.ok) throw new Error(`Heal failed with status ${res.status}`);
      // Refresh data after healing
      await fetchData();
    } catch (err) {
      console.error('Manual heal error:', err);
    } finally {
      setHealing(false);
    }
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9d4edd] mx-auto" />
          <div className="text-sm text-muted-foreground">Loading Self-Healing Dashboard...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <XCircle className="w-8 h-8 text-[#E6394A] mx-auto" />
          <div className="text-sm text-[#E6394A]">Failed to load dashboard</div>
          <div className="text-xs text-muted-foreground">{error}</div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RotateCcw className="w-3 h-3 mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const health = data?.health ?? {
    totalEvents: 0, resolvedEvents: 0, unresolvedEvents: 0,
    recentErrors: 0, avgRecoveryMs: 0, topCategories: [],
    topStrategies: [], componentHealth: [],
  };
  const events = data?.events ?? [];
  const patterns = data?.patterns ?? [];
  const healthChecks = data?.healthChecks ?? data?.health?.componentHealth ?? [];

  const overallStatus = getOverallStatus(health);
  const successRate = health.totalEvents > 0
    ? Math.round((health.resolvedEvents / health.totalEvents) * 100)
    : 0;
  const activeChecks = healthChecks.length;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[#E8751A]" />
          <h2 className="text-xl font-bold text-foreground">Self-Healing Engine</h2>
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              borderColor: `${CATEGORY_COLORS[overallStatus === 'healthy' ? 'ui_failure' : overallStatus === 'degraded' ? 'api_failure' : 'route_failure']}40`,
              color: overallStatus === 'healthy' ? '#00ff88' : overallStatus === 'degraded' ? '#FFB627' : '#E6394A',
              backgroundColor: `${overallStatus === 'healthy' ? '#00ff88' : overallStatus === 'degraded' ? '#FFB627' : '#E6394A'}10`,
            }}
          >
            {overallStatus.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-Heal Toggle */}
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Auto-Heal</span>
            <Switch
              checked={autoHeal}
              onCheckedChange={setAutoHeal}
            />
            {autoHeal && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              </motion.div>
            )}
          </div>

          {/* Manual Heal */}
          <ManualHealDialog onHeal={handleManualHeal} healing={healing} />

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Pulse indicator */}
              <HealthPulseIndicator status={overallStatus} />

              <Separator orientation="vertical" className="hidden md:block h-16" />

              {/* Component health grid */}
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-2">Subsystem Health</div>
                <ComponentHealthGrid health={health} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <StatCard
          icon={<Activity className="w-4 h-4 text-[#9d4edd]" />}
          label="Total Events"
          value={health.totalEvents}
          subtext="all time"
          color="#9d4edd"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-[#00ff88]" />}
          label="Success Rate"
          value={`${successRate}%`}
          subtext={`${health.resolvedEvents} resolved`}
          color="#00ff88"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-[#2E86AB]" />}
          label="Avg Recovery"
          value={formatTime(health.avgRecoveryMs)}
          subtext="mean time"
          color="#2E86AB"
        />
        <StatCard
          icon={<HeartPulse className="w-4 h-4 text-[#FFB627]" />}
          label="Active Checks"
          value={activeChecks}
          subtext="registered"
          color="#FFB627"
        />
        <StatCard
          icon={<XCircle className="w-4 h-4 text-[#E6394A]" />}
          label="Unresolved"
          value={health.unresolvedEvents}
          subtext="need attention"
          color="#E6394A"
        />
      </motion.div>

      {/* Tabs for detailed sections */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="health-checks">Health Checks</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4 space-y-4">
          <EventTimeline events={events} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ErrorCategoryChart health={health} />
            <StrategySuccessChart health={health} />
          </div>
          <RecoveryTimeChart events={events} />
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="mt-4">
          <LearnedPatternsTable patterns={patterns} />
        </TabsContent>

        {/* Health Checks Tab */}
        <TabsContent value="health-checks" className="mt-4">
          <HealthCheckCards healthChecks={healthChecks} />
        </TabsContent>
      </Tabs>

      {/* Footer info */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>Last updated: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'N/A'}</span>
          {autoHeal && (
            <>
              <span className="text-[#00ff88]">● Auto-healing active</span>
              <span>(polling every 5s)</span>
            </>
          )}
        </div>
        <div>
          {health.recentErrors > 0 && (
            <span className="text-[#FFB627]">{health.recentErrors} errors in the last hour</span>
          )}
        </div>
      </div>
    </div>
  );
}
