'use client';

import { useOSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  MessageSquare, Search, CheckSquare, BarChart3,
  Activity, Clock, Zap, ArrowUpRight, ArrowDownRight,
  TrendingUp, DollarSign, FolderKanban,
  ChevronRight,
  Database, Network, Cpu,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// ─── Simulated Data ───

interface ActivityItem {
  id: string; agent: string; action: string; time: string; type: string; color: string;
}
const recentActivities: ActivityItem[] = [];

interface ProjectItem {
  id: string; name: string; progress: number; tasks: number; team: string[]; color: string;
}
const projectsData: ProjectItem[] = [];

interface AutomationItem {
  id: string; name: string; trigger: string; status: boolean; lastRun: string;
}
const automationsData: AutomationItem[] = [];

const memoryGrowthData: number[] = [];

interface KnowledgeNode {
  id: string; label: string; x: number; y: number; color: string; size: number;
}
const knowledgeNodes: KnowledgeNode[] = [];

const knowledgeEdges: [string, string][] = [];

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

// ─── Welcome Banner ───

function WelcomeBanner() {
  const { setActiveView } = useOSStore();
  const [time, setTime] = useState<Date | null>(null);
  const [particles, setParticles] = useState<Array<{id: number; x: number; y: number; size: number; duration: number; delay: number; color: string}>>([]);

  useEffect(() => {
    // Generate particles only on client to avoid hydration mismatch
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      color: Math.random() > 0.5 ? '#00ffff' : '#9d4edd',
    })));
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    { label: 'New Chat', icon: MessageSquare, color: '#00ffff', view: 'mission-control' as const },
    { label: 'Search Memory', icon: Search, color: '#9d4edd', view: 'memory-search' as const },
    { label: 'Create Task', icon: CheckSquare, color: '#00ff88', view: 'workflows' as const },
    { label: 'View Analytics', icon: BarChart3, color: '#FFB627', view: 'observability' as const },
  ];

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
              <span className="text-[10px] text-[#00ff88] font-medium">All 7 Layers Operational</span>
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

// ─── Agent Status Row ───

function AgentStatusRow() {
  const { agents, setActiveView } = useOSStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {agents.map((agent, i) => (
        <motion.button key={agent.id}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          onClick={() => setActiveView('mission-control')}
          className="GlassCard bg-[rgba(18,18,42,0.6)] backdrop-blur-sm border border-[rgba(157,78,221,0.15)] rounded-xl p-3 text-left transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.08)] group">
          <div className="flex items-center gap-2 mb-2">
            <StatusDot status={agent.status} color={agent.color} />
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

// ─── Memory Growth Widget ───

function MemoryGrowthWidget() {
  const { systemMetrics } = useOSStore();

  if (memoryGrowthData.length === 0) {
    return (
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-[#9d4edd]" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">Memory Growth</span>
          </div>
        </div>
        <div className="flex items-center justify-center h-20 text-[#8888aa] text-xs">
          No memory data yet
        </div>
      </GlassCard>
    );
  }

  const width = 240;
  const height = 60;
  const max = Math.max(...memoryGrowthData);
  const min = Math.min(...memoryGrowthData);
  const range = max - min || 1;

  const points = memoryGrowthData.map((v, i) => {
    const x = (i / (memoryGrowthData.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-[#9d4edd]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Memory Growth</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">30 days</span>
      </div>

      <svg width={width} height={height} className="overflow-visible w-full" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9d4edd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9d4edd" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#memGrad)" />
        <polyline points={points} fill="none" stroke="#9d4edd" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={width} cy={height - ((memoryGrowthData[memoryGrowthData.length - 1] - min) / range) * (height - 8) - 4}
          r="3" fill="#9d4edd" stroke="#0a0a1a" strokeWidth="1.5" />
      </svg>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Total</div>
          <div className="text-white font-mono font-bold text-sm">{(systemMetrics.vaultEntries ?? 0).toLocaleString('en-US')}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Growth</div>
          <div className="text-[#00ff88] font-mono font-bold text-sm flex items-center gap-0.5">
            <ArrowUpRight size={10} /> +12%
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#8888aa] uppercase">Top Type</div>
          <div className="text-[#ccccdd] font-bold text-sm">Chat</div>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Knowledge Graph Preview ───

function KnowledgeGraphPreview() {
  const { setActiveView } = useOSStore();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  if (knowledgeNodes.length === 0) {
    return (
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network size={14} className="text-[#00ffff]" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">Knowledge Graph</span>
          </div>
        </div>
        <div className="flex items-center justify-center h-44 text-[#8888aa] text-xs">
          No knowledge graph data yet
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-[#00ffff]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Knowledge Graph</span>
        </div>
      </div>

      <div className="relative bg-[rgba(10,10,26,0.5)] rounded-lg overflow-hidden" style={{ height: 180 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
          {/* Edges */}
          {knowledgeEdges.map(([from, to], i) => {
            const fromNode = knowledgeNodes.find(n => n.id === from);
            const toNode = knowledgeNodes.find(n => n.id === to);
            if (!fromNode || !toNode) return null;
            return (
              <motion.line key={i}
                x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y}
                stroke={hoveredNode === from || hoveredNode === to ? '#00ffff' : 'rgba(157,78,221,0.25)'}
                strokeWidth={hoveredNode === from || hoveredNode === to ? 0.4 : 0.2}
                animate={{
                  strokeDashoffset: [0, 10],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Nodes */}
          {knowledgeNodes.map(node => (
            <g key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}>
              <motion.circle
                cx={node.x} cy={node.y}
                r={hoveredNode === node.id ? node.size / 100 * 4 : node.size / 100 * 2.5}
                fill={`${node.color}40`}
                stroke={node.color}
                strokeWidth={0.3}
                animate={{ r: hoveredNode === node.id ? node.size / 100 * 4 : node.size / 100 * 2.5 }}
                transition={{ duration: 0.3 }}
              />
              <text x={node.x} y={node.y + node.size / 100 * 4 + 3}
                textAnchor="middle" fill={hoveredNode === node.id ? '#ffffff' : '#8888aa'}
                fontSize="2.5" fontFamily="monospace" className="pointer-events-none">
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <button onClick={() => setActiveView('memory-graph')}
        className="mt-3 w-full text-center text-[10px] py-2 rounded-lg border border-[rgba(0,255,255,0.2)] text-[#00ffff] bg-[rgba(0,255,255,0.05)] hover:bg-[rgba(0,255,255,0.1)] transition-colors flex items-center justify-center gap-1">
        <Network size={11} /> Open Full Graph
      </button>
    </GlassCard>
  );
}

// ─── Recent Activities ───

function RecentActivities() {
  const { logs, agents } = useOSStore();
  const agentIcons: {[key: string]: string} = {
    Claude: '🧠',
    Hermes: '🔍',
    'Self Vault': '💾',
    OpenClaw: '👥',
    Gemini: '✨',
  };
  const agentColorMap: {[key: string]: string} = {};
  agents.forEach(a => { agentColorMap[a.name] = a.color; });

  // Use live logs from store, fallback to recentActivities
  const displayLogs = logs.length > 0 ? logs.slice(0, 12).map((log, i) => ({
    id: log.id,
    agent: log.agent,
    action: log.message,
    time: log.timestamp,
    type: log.level,
    color: agentColorMap[log.agent] || '#8888aa',
  })) : recentActivities;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#00ff88]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Recent Activity</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">{displayLogs.length} events</span>
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {displayLogs.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No recent activity yet
          </div>
        )}
        {displayLogs.map((activity, i) => (
          <motion.div key={activity.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[rgba(10,10,26,0.4)] transition-colors">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm mt-0.5"
              style={{ backgroundColor: `${activity.color}15`, border: `1px solid ${activity.color}25` }}>
              {agentIcons[activity.agent] || '🤖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold" style={{ color: activity.color }}>{activity.agent}</span>
                <span className="text-[8px] text-[#8888aa]">{activity.time}</span>
              </div>
              <p className="text-[10px] text-[#ccccdd] leading-relaxed line-clamp-2">{activity.action}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Active Projects ───

function ActiveProjects() {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderKanban size={14} className="text-[#FFB627]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Active Projects</span>
        </div>
      </div>

      <div className="space-y-2">
        {projectsData.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No active projects yet
          </div>
        )}
        {projectsData.map((project, i) => (
          <motion.div key={project.id}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-[rgba(10,10,26,0.4)] rounded-lg p-3 hover:bg-[rgba(10,10,26,0.6)] transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white font-medium">{project.name}</span>
              <span className="text-[9px] font-mono" style={{ color: project.color }}>{project.progress}%</span>
            </div>
            <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden mb-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${project.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                className="h-full rounded-full" style={{ backgroundColor: project.color }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <CheckSquare size={9} className="text-[#8888aa]" />
                <span className="text-[9px] text-[#8888aa]">{project.tasks} tasks</span>
              </div>
              <div className="flex items-center gap-1">
                {project.team.slice(0, 3).map((member, mi) => (
                  <div key={mi} className="w-5 h-5 rounded-full border border-[#0a0a1a] flex items-center justify-center text-[8px]"
                    style={{ backgroundColor: `${member === 'Claude' ? '#E63946' : member === 'Hermes' ? '#FFB627' : member === 'OpenClaw' ? '#E8751A' : member === 'Gemini' ? '#4285F4' : '#2E86AB'}30`, marginLeft: mi > 0 ? '-4px' : '0' }}>
                    {member[0]}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Tasks Overview ───

function TasksOverview() {
  const { kanbanTasks } = useOSStore();
  const todo = kanbanTasks.filter(t => t.status === 'todo');
  const inProgress = kanbanTasks.filter(t => t.status === 'in_progress');
  const done = kanbanTasks.filter(t => t.status === 'done');

  const columns = [
    { label: 'To Do', count: todo.length, color: '#8888aa', tasks: todo },
    { label: 'In Progress', count: inProgress.length, color: '#FFB627', tasks: inProgress },
    { label: 'Done', count: done.length, color: '#00ff88', tasks: done },
  ];

  const urgentTasks = kanbanTasks
    .filter(t => t.priority === 'high')
    .slice(0, 3);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={14} className="text-[#00ff88]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Tasks</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">{kanbanTasks.length} total</span>
      </div>

      {/* Kanban mini columns */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {columns.map(col => (
          <div key={col.label} className="bg-[rgba(10,10,26,0.4)] rounded-lg p-2.5 text-center">
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">{col.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: col.color }}>{col.count}</div>
          </div>
        ))}
      </div>

      {/* Urgent tasks */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2">Top Urgent</div>
        <div className="space-y-1.5">
          {urgentTasks.map((task, i) => {
            const agentColors: {[key: string]: string} = { claude: '#E63946', hermes: '#FFB627', openclaw: '#E8751A', vault: '#2E86AB', gemini: '#4285F4' };
            return (
              <motion.div key={task.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 bg-[rgba(10,10,26,0.4)] rounded-lg p-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: agentColors[task.assignedTo] || '#8888aa' }} />
                <span className="text-[10px] text-[#ccccdd] truncate flex-1">{task.title}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#E63946]/15 text-[#E63946] font-bold">HIGH</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Analytics Summary ───

function AnalyticsSummary() {
  const { agentAnalytics, totalTokensUsed } = useOSStore();

  const agentValues = Object.values(agentAnalytics);
  const totalSessions = agentValues.reduce((s, a) => s + a.totalSessions, 0);
  const avgResponseTime = agentValues.length > 0 ? agentValues.reduce((s, a) => s + a.avgResponseTime, 0) / agentValues.length : 0;
  const totalTokens = Object.values(agentAnalytics).reduce((s, a) => s + a.totalTokens, 0) + totalTokensUsed;

  const stats = [
    { label: 'Sessions', value: (totalSessions ?? 0).toLocaleString('en-US'), change: '+12%', up: true, icon: Activity, color: '#00ffff' },
    { label: 'Avg Response', value: `${(avgResponseTime / 1000).toFixed(1)}s`, change: '-8%', up: false, icon: Clock, color: '#00ff88' },
    { label: 'Tokens Used', value: `${(totalTokens / 1_000_000).toFixed(1)}M`, change: '+23%', up: true, icon: Cpu, color: '#9d4edd' },
    { label: 'Cost', value: '$50.80', change: '+5%', up: true, icon: DollarSign, color: '#FFB627' },
  ];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-[#00ffff]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Analytics</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">vs last period</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={11} style={{ color: stat.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-white font-mono font-bold text-base">{stat.value}</span>
              <span className={`text-[9px] font-mono font-bold flex items-center gap-0.5 ${stat.up ? 'text-[#00ff88]' : 'text-[#ff5555]'}`}>
                {stat.up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                {stat.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Automations Widget ───

function AutomationsWidget() {
  const [automations, setAutomations] = useState(automationsData);

  const toggleAutomation = (id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: !a.status } : a));
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#FFB627]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Automations</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">{automations.filter(a => a.status).length} active</span>
      </div>

      <div className="space-y-2">
        {automations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[#8888aa] text-xs">
            No automations configured yet
          </div>
        )}
        {automations.map((auto, i) => (
          <motion.div key={auto.id}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-[rgba(10,10,26,0.4)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-white font-medium">{auto.name}</span>
              <button
                onClick={() => toggleAutomation(auto.id)}
                className={`w-8 h-4 rounded-full transition-all duration-200 flex items-center px-0.5 ${
                  auto.status ? 'bg-[#00ff88]' : 'bg-[rgba(136,136,170,0.3)]'
                }`}>
                <motion.div
                  className="w-3 h-3 rounded-full bg-white"
                  animate={{ x: auto.status ? 16 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#8888aa]">{auto.trigger}</span>
              <span className="text-[8px] text-[#8888aa]">•</span>
              <span className="text-[9px] text-[#8888aa]">Last: {auto.lastRun}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Main Component ───

export function HomeDashboard() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Agent Status Row */}
      <AgentStatusRow />

      {/* Memory Growth + Knowledge Graph */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MemoryGrowthWidget />
        <KnowledgeGraphPreview />
      </div>

      {/* Recent Activities + Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivities />
        <ActiveProjects />
      </div>

      {/* Tasks + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TasksOverview />
        <AnalyticsSummary />
      </div>

      {/* Automations */}
      <AutomationsWidget />
    </div>
  );
}
