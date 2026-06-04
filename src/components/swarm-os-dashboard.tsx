'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Brain, Cpu, GitBranch, Layers, Network,
  Play, RefreshCw, Shield, Zap, AlertTriangle,
  CheckCircle2, XCircle, Clock, TrendingUp, Server,
  Cog, FileCode, Rocket, Bug, Eye,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

// ─── Color Constants ───
const CYBER_GREEN = '#00ff88';
const CYBER_RED = '#E63946';
const CYBER_AMBER = '#FFB627';
const CYBER_CYAN = '#00ffff';
const CYBER_PURPLE = '#9d4edd';
const GOOGLE_BLUE = '#4285f4';

// ─── Types ───
interface ModelNode {
  id: string;
  name: string;
  health: 'healthy' | 'degraded' | 'offline';
  load: number;
  latency: number;
  successRate: number;
  activeRequests: number;
}

interface BrainLayerStatus {
  id: number;
  name: string;
  color: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  model: string;
  latency: number;
  quality: number;
}

interface DashboardData {
  timestamp: number;
  swarm: { executions: number; avgQuality: number; avgLatency: number; topModel: string; evolutionCount: number };
  models: {
    total: number; healthy: number; degraded: number; offline: number;
    nodes: ModelNode[];
  };
  recovery: { totalRecoveries: number; successRate: number; avgRecoveryTime: number };
  cicd: { total: number; completed: number; failed: number; running: number };
}

type SubView = 'overview' | 'models' | 'brains' | 'cicd' | 'recovery';

// ─── BRAIN_LAYERS constant (mirrors brain-pipeline.ts) ───
const BRAIN_LAYERS = [
  { id: 1, name: 'Planning', color: '#4285f4' },
  { id: 2, name: 'Architecture', color: '#9d4edd' },
  { id: 3, name: 'Coding', color: '#00ff88' },
  { id: 4, name: 'Research', color: '#FFB627' },
  { id: 5, name: 'Analysis', color: '#00ffff' },
  { id: 6, name: 'Execution', color: '#E63946' },
  { id: 7, name: 'Optimization', color: '#10b981' },
];

/* ═══════════════════════════════════════════════════════
   SWARM OS OBSERVABILITY DASHBOARD — Main Export
   ═══════════════════════════════════════════════════════ */
export function SwarmOSDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState<SubView>('overview');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [taskInput, setTaskInput] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/swarm?action=dashboard');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  // Execute a task through the 7-brain pipeline
  const executeTask = useCallback(async () => {
    if (!taskInput.trim() || isExecuting) return;
    setIsExecuting(true);
    setExecutionResult(null);
    try {
      const res = await fetch('/api/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'swarm-execute', task: taskInput, model: 'gemini-2.5-flash-lite', mode: 'hybrid' }),
      });
      if (res.ok) {
        const result = await res.json();
        setExecutionResult(result);
      }
    } catch (err) {
      setExecutionResult({ success: false, error: 'Execution failed' });
    } finally {
      setIsExecuting(false);
      fetchData();
    }
  }, [taskInput, isExecuting, fetchData]);

  // Trigger swarm evolution
  const evolveSwarm = useCallback(async () => {
    try {
      await fetch('/api/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'swarm-evolve' }),
      });
      fetchData();
    } catch { /* silent */ }
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-[#8888aa] text-xs">
          <RefreshCw size={14} className="animate-spin" />
          Loading Swarm OS...
        </div>
      </div>
    );
  }

  const swarm = data?.swarm || { executions: 0, avgQuality: 0, avgLatency: 0, topModel: '-', evolutionCount: 0 };
  const models = data?.models || { total: 0, healthy: 0, degraded: 0, offline: 0, nodes: [] };
  const recovery = data?.recovery || { totalRecoveries: 0, successRate: 0, avgRecoveryTime: 0 };
  const cicd = data?.cicd || { total: 0, completed: 0, failed: 0, running: 0 };

  const subViews: { id: SubView; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'models', label: 'Models', icon: Server },
    { id: 'brains', label: '7-Brain', icon: Brain },
    { id: 'cicd', label: 'CI/CD', icon: Rocket },
    { id: 'recovery', label: 'Recovery', icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CYBER_PURPLE}30, ${CYBER_PURPLE}10)`, border: `1px solid ${CYBER_PURPLE}30` }}>
            <Network size={16} style={{ color: CYBER_PURPLE }} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
              Swarm OS
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: CYBER_GREEN }} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: CYBER_GREEN }}>
                  Live
                </span>
              </span>
            </h2>
            <div className="text-[10px] text-[#8888aa]">
              {swarm.executions} executions · {swarm.evolutionCount} evolutions
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={evolveSwarm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:scale-105 active:scale-95"
            style={{ borderColor: `${CYBER_GREEN}30`, color: CYBER_GREEN, background: `${CYBER_GREEN}10` }}>
            <Zap size={10} />
            Evolve
          </button>
          <button onClick={fetchData}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all hover:scale-105 active:scale-95"
            style={{ borderColor: `${CYBER_CYAN}30`, color: CYBER_CYAN, background: `${CYBER_CYAN}10` }}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* ─── Sub-View Navigation ─── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)]">
        {subViews.map(sv => (
          <button key={sv.id} onClick={() => setSubView(sv.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              subView === sv.id ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.06)]'
            }`}
            style={subView === sv.id ? {
              background: `${CYBER_PURPLE}15`,
              border: `1px solid ${CYBER_PURPLE}30`,
            } : { border: '1px solid transparent' }}>
            <sv.icon size={12} style={{ color: subView === sv.id ? CYBER_PURPLE : '#8888aa' }} />
            {sv.label}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div key={subView} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {subView === 'overview' && (
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard icon={<Activity size={10} />} label="Executions" value={swarm.executions} color={GOOGLE_BLUE} />
                  <MetricCard icon={<TrendingUp size={10} />} label="Avg Quality" value={`${(swarm.avgQuality * 100).toFixed(0)}%`} color={CYBER_GREEN} />
                  <MetricCard icon={<Clock size={10} />} label="Avg Latency" value={`${swarm.avgLatency}ms`} color={CYBER_AMBER} />
                  <MetricCard icon={<Zap size={10} />} label="Evolutions" value={swarm.evolutionCount} color={CYBER_PURPLE} />
                </div>

                {/* Model Health Summary */}
                <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
                  <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Server size={10} /> Model Health
                  </h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CYBER_GREEN }} />
                      <span className="text-[9px] text-[#8888aa]">Healthy: <span className="text-white font-mono">{models.healthy}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CYBER_AMBER }} />
                      <span className="text-[9px] text-[#8888aa]">Degraded: <span className="text-white font-mono">{models.degraded}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CYBER_RED }} />
                      <span className="text-[9px] text-[#8888aa]">Offline: <span className="text-white font-mono">{models.offline}</span></span>
                    </div>
                  </div>
                  {/* Model nodes mini view */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {models.nodes.slice(0, 6).map(node => (
                      <div key={node.id} className="flex items-center gap-2 p-2 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: node.health === 'healthy' ? CYBER_GREEN : node.health === 'degraded' ? CYBER_AMBER : CYBER_RED }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] text-white font-medium truncate">{node.name}</div>
                          <div className="text-[8px] text-[#8888aa] font-mono">{node.latency}ms · {node.load}% load</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7-Brain Layer Status */}
                <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
                  <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Brain size={10} /> 7-Brain Pipeline
                  </h3>
                  <div className="flex items-center gap-1">
                    {BRAIN_LAYERS.map((layer, i) => (
                      <div key={layer.id} className="flex-1">
                        <div className="h-8 rounded-lg flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ backgroundColor: `${layer.color}25`, border: `1px solid ${layer.color}30` }}>
                          {layer.name.slice(0, 3)}
                        </div>
                        {i < BRAIN_LAYERS.length - 1 && (
                          <div className="flex justify-center mt-1">
                            <div className="w-0.5 h-2" style={{ backgroundColor: `${layer.color}30` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Execution */}
                <div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
                  <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Play size={10} /> Execute Task Through 7-Brain Pipeline
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && executeTask()}
                      placeholder="Enter a task for the 7-brain pipeline..."
                      disabled={isExecuting}
                      className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(0,255,136,0.15)] rounded-lg px-3 py-2.5 text-[11px] text-white placeholder:text-[#8888aa] outline-none focus:border-[rgba(0,255,136,0.4)] transition-colors disabled:opacity-50"
                    />
                    <button onClick={executeTask} disabled={isExecuting || !taskInput.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                      style={{ borderColor: `${CYBER_GREEN}30`, color: CYBER_GREEN, background: `${CYBER_GREEN}10` }}>
                      {isExecuting ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                      Execute
                    </button>
                  </div>

                  {/* Execution Result */}
                  {executionResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.03)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {executionResult.success ? (
                          <CheckCircle2 size={12} style={{ color: CYBER_GREEN }} />
                        ) : (
                          <XCircle size={12} style={{ color: CYBER_RED }} />
                        )}
                        <span className="text-[10px] font-bold" style={{ color: executionResult.success ? CYBER_GREEN : CYBER_RED }}>
                          {executionResult.success ? 'Completed' : 'Failed'}
                        </span>
                        {executionResult.recovered && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                            style={{ backgroundColor: `${CYBER_AMBER}15`, color: CYBER_AMBER, border: `1px solid ${CYBER_AMBER}30` }}>
                            Recovered
                          </span>
                        )}
                      </div>

                      {executionResult.brainLayers && (
                        <div className="flex items-center gap-1 mb-2">
                          {executionResult.brainLayers.map((layer: any, i: number) => (
                            <div key={i} className="flex-1 rounded p-1 text-center"
                              style={{ backgroundColor: `${BRAIN_LAYERS[i]?.color || '#888'}15`, border: `1px solid ${BRAIN_LAYERS[i]?.color || '#888'}20` }}>
                              <div className="text-[7px] text-white font-medium">{layer.brain?.slice(0, 3)}</div>
                              <div className="text-[6px] font-mono" style={{ color: layer.status === 'completed' ? CYBER_GREEN : CYBER_RED }}>
                                {layer.status === 'completed' ? 'OK' : 'ERR'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {executionResult.validation && (
                        <div className="flex items-center gap-3 text-[8px]">
                          <span style={{ color: executionResult.validation.passed ? CYBER_GREEN : CYBER_RED }}>
                            Validation: {executionResult.validation.passed ? 'PASSED' : 'ISSUES'}
                          </span>
                          <span className="text-[#8888aa]">Score: {executionResult.validation.score}/100</span>
                        </div>
                      )}

                      <div className="mt-2 text-[9px] text-[#ccccdd] whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                        {executionResult.result?.slice(0, 500)}{executionResult.result?.length > 500 ? '...' : ''}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* CI/CD + Recovery Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
                    <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Rocket size={10} /> CI/CD
                    </h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Pipelines</span>
                        <span className="text-[9px] text-white font-mono">{cicd.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Completed</span>
                        <span className="text-[9px] font-mono" style={{ color: CYBER_GREEN }}>{cicd.completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Failed</span>
                        <span className="text-[9px] font-mono" style={{ color: CYBER_RED }}>{cicd.failed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Running</span>
                        <span className="text-[9px] font-mono" style={{ color: CYBER_AMBER }}>{cicd.running}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
                    <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield size={10} /> Recovery
                    </h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Total Recoveries</span>
                        <span className="text-[9px] text-white font-mono">{recovery.totalRecoveries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Success Rate</span>
                        <span className="text-[9px] font-mono" style={{ color: CYBER_GREEN }}>{(recovery.successRate * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8888aa]">Avg Recovery Time</span>
                        <span className="text-[9px] font-mono" style={{ color: CYBER_AMBER }}>{recovery.avgRecoveryTime}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subView === 'models' && (
              <div className="space-y-3">
                <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Server size={10} /> Model Load Balancer
                </h3>
                {models.nodes.length > 0 ? (
                  <div className="space-y-2">
                    {models.nodes.map(node => (
                      <div key={node.id} className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: node.health === 'healthy' ? CYBER_GREEN : node.health === 'degraded' ? CYBER_AMBER : CYBER_RED }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium">{node.name}</div>
                            <div className="text-[9px] text-[#8888aa] font-mono">{node.id}</div>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                            style={{
                              backgroundColor: `${node.health === 'healthy' ? CYBER_GREEN : node.health === 'degraded' ? CYBER_AMBER : CYBER_RED}15`,
                              color: node.health === 'healthy' ? CYBER_GREEN : node.health === 'degraded' ? CYBER_AMBER : CYBER_RED,
                              border: `1px solid ${node.health === 'healthy' ? CYBER_GREEN : node.health === 'degraded' ? CYBER_AMBER : CYBER_RED}30`,
                            }}>
                            {node.health}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <div className="text-[8px] text-[#8888aa] uppercase">Load</div>
                            <div className="text-[10px] text-white font-mono">{node.load}%</div>
                            <div className="w-full h-1 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden mt-0.5">
                              <div className="h-full rounded-full" style={{ width: `${node.load}%`, backgroundColor: node.load > 80 ? CYBER_RED : node.load > 50 ? CYBER_AMBER : CYBER_GREEN }} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] text-[#8888aa] uppercase">Latency</div>
                            <div className="text-[10px] text-white font-mono">{node.latency}ms</div>
                          </div>
                          <div>
                            <div className="text-[8px] text-[#8888aa] uppercase">Success</div>
                            <div className="text-[10px] font-mono" style={{ color: node.successRate > 0.9 ? CYBER_GREEN : node.successRate > 0.7 ? CYBER_AMBER : CYBER_RED }}>
                              {(node.successRate * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] text-[#8888aa] uppercase">Active</div>
                            <div className="text-[10px] text-white font-mono">{node.activeRequests}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
                    <Server size={24} className="mx-auto text-[#8888aa] mb-2" />
                    <p className="text-[#8888aa] text-xs">No model nodes registered yet.</p>
                  </div>
                )}
              </div>
            )}

            {subView === 'brains' && (
              <div className="space-y-3">
                <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Brain size={10} /> 7-Brain Layer Pipeline
                </h3>
                <div className="space-y-2">
                  {BRAIN_LAYERS.map((layer) => (
                    <div key={layer.id} className="rounded-xl border bg-[rgba(18,18,42,0.4)] p-3"
                      style={{ borderColor: `${layer.color}20` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: `${layer.color}25`, border: `1px solid ${layer.color}30` }}>
                          {layer.id}
                        </div>
                        <div className="flex-1">
                          <div className="text-white text-xs font-medium">{layer.name}</div>
                          <div className="text-[9px] text-[#8888aa]">
                            {layer.id === 1 && 'Task decomposition, step planning, dependency mapping'}
                            {layer.id === 2 && 'System design, architecture decisions, pattern selection'}
                            {layer.id === 3 && 'Code implementation, file generation, module building'}
                            {layer.id === 4 && 'Context research, solution finding, knowledge retrieval'}
                            {layer.id === 5 && 'Output analysis, quality assessment, data evaluation'}
                            {layer.id === 6 && 'Action execution, command running, deployment steps'}
                            {layer.id === 7 && 'Performance tuning, output refinement, best-practice alignment'}
                          </div>
                        </div>
                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: `${layer.color}40` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subView === 'cicd' && (
              <div className="space-y-3">
                <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Rocket size={10} /> CI/CD Pipeline Engine
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {['Build', 'Test', 'Package', 'Deploy'].map((stage, i) => {
                    const colors = [GOOGLE_BLUE, CYBER_GREEN, CYBER_AMBER, CYBER_PURPLE];
                    const icons = [Cog, Bug, FileCode, GitBranch];
                    const IconComp = icons[i];
                    return (
                      <div key={stage} className="rounded-xl border bg-[rgba(18,18,42,0.4)] p-3 text-center"
                        style={{ borderColor: `${colors[i]}20` }}>
                        <IconComp size={16} className="mx-auto mb-1.5" style={{ color: colors[i] }} />
                        <div className="text-[9px] text-white font-medium">{stage}</div>
                        <div className="text-[8px] text-[#8888aa] mt-0.5">
                          {i === 0 && 'Validate & compile'}
                          {i === 1 && 'Run test suite'}
                          {i === 2 && 'Bundle artifact'}
                          {i === 3 && 'Push to GitHub'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white text-xs font-medium">Pipeline Stats</div>
                      <div className="text-[9px] text-[#8888aa]">Automated build → test → package → deploy</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-[#8888aa]">{cicd.total} total · {cicd.completed} passed</div>
                      <div className="text-[9px] font-mono" style={{ color: cicd.total > 0 ? CYBER_GREEN : '#8888aa' }}>
                        {cicd.total > 0 ? `${((cicd.completed / cicd.total) * 100).toFixed(0)}%` : 'No pipelines'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subView === 'recovery' && (
              <div className="space-y-3">
                <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={10} /> Failure Recovery System
                </h3>
                <div className="rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.4)] p-4">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-mono font-bold" style={{ color: CYBER_GREEN }}>
                      {recovery.totalRecoveries > 0 ? `${(recovery.successRate * 100).toFixed(0)}%` : '100%'}
                    </div>
                    <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Recovery Success Rate</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-white font-mono font-bold">{recovery.totalRecoveries}</div>
                      <div className="text-[8px] text-[#8888aa] uppercase">Recoveries</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold" style={{ color: CYBER_AMBER }}>{recovery.avgRecoveryTime}ms</div>
                      <div className="text-[8px] text-[#8888aa] uppercase">Avg Time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold" style={{ color: CYBER_GREEN }}>Never</div>
                      <div className="text-[8px] text-[#8888aa] uppercase">Task Abortions</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
                  <h4 className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Recovery Strategies</h4>
                  <div className="space-y-1.5">
                    {[
                      { name: 'Switch Model', desc: 'Instant failover to next best model', color: GOOGLE_BLUE },
                      { name: 'Retry Stage', desc: 'Re-run only the failed module', color: CYBER_AMBER },
                      { name: 'Skip Stage', desc: 'Continue without optional stage', color: CYBER_CYAN },
                      { name: 'Checkpoint Resume', desc: 'Resume from last saved state', color: CYBER_PURPLE },
                      { name: 'Escalate', desc: 'Switch to internal analysis', color: CYBER_GREEN },
                    ].map(strategy => (
                      <div key={strategy.name} className="flex items-center gap-2 p-2 rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: strategy.color }} />
                        <div>
                          <div className="text-[9px] text-white font-medium">{strategy.name}</div>
                          <div className="text-[8px] text-[#8888aa]">{strategy.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Metric Card Component ───
function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-[rgba(18,18,42,0.4)] p-3"
      style={{ borderColor: `${color}15` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-white font-mono font-bold text-lg">{value}</div>
    </motion.div>
  );
}
