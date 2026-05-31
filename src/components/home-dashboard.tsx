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

const recentActivities = [
  { id: '1', agent: 'Claude', action: 'Completed cognitive reasoning pipeline for task delegation', time: '2m ago', type: 'reasoning', color: '#E63946' },
  { id: '2', agent: 'Hermes', action: 'Web research completed — 3 competitor reports generated', time: '5m ago', type: 'research', color: '#FFB627' },
  { id: '3', agent: 'Self Vault', action: 'OMI recording exported — 47 notes synced to Obsidian', time: '8m ago', type: 'memory', color: '#2E86AB' },
  { id: '4', agent: 'OpenClaw', action: 'Routing table refreshed — 4 agents connected, 0 conflicts', time: '12m ago', type: 'routing', color: '#E8751A' },
  { id: '5', agent: 'Hermes', action: 'Skill execution: seo-audit completed in 6.8s', time: '15m ago', type: 'execution', color: '#FFB627' },
  { id: '6', agent: 'Claude', action: 'Vision pipeline analyzed 3 screenshots from user', time: '22m ago', type: 'perception', color: '#E63946' },
  { id: '7', agent: 'Self Vault', action: 'Goal progress updated — 3 goals advanced this week', time: '30m ago', type: 'memory', color: '#2E86AB' },
  { id: '8', agent: 'OpenClaw', action: 'Governance: session permissions verified for all agents', time: '35m ago', type: 'governance', color: '#E8751A' },
  { id: '9', agent: 'Hermes', action: 'Kanban task completed: competitor-analysis-q2', time: '42m ago', type: 'execution', color: '#FFB627' },
  { id: '10', agent: 'Claude', action: 'Pulled 23 memory entries for context-rich response', time: '55m ago', type: 'reasoning', color: '#E63946' },
];

const projectsData = [
  { id: 'p1', name: 'Agent OS v2.0 Launch', progress: 72, tasks: 24, team: ['Claude', 'Hermes', 'OpenClaw'], color: '#E63946' },
  { id: 'p2', name: 'Hermes Skill Registry 3K+', progress: 85, tasks: 18, team: ['Hermes'], color: '#FFB627' },
  { id: 'p3', name: 'Cross-Agent Memory Protocol', progress: 30, tasks: 12, team: ['OpenClaw', 'Self Vault'], color: '#9d4edd' },
  { id: 'p4', name: 'Obsidian Vault 15K Growth', progress: 91, tasks: 8, team: ['Self Vault'], color: '#2E86AB' },
];

const automationsData = [
  { id: 'a1', name: 'Daily Competitor Scan', trigger: 'Every day at 6:00 AM', status: true, lastRun: '6h ago' },
  { id: 'a2', name: 'Memory Auto-Sync', trigger: 'Every 30 minutes', status: true, lastRun: '12m ago' },
  { id: 'a3', name: 'Weekly Performance Report', trigger: 'Every Monday 9:00 AM', status: true, lastRun: '3d ago' },
  { id: 'a4', name: 'Cost Alert Pipeline', trigger: 'When budget > 80%', status: false, lastRun: '2d ago' },
];

const memoryGrowthData = [4200, 4600, 5100, 5800, 6400, 7200, 7800, 8500, 9200, 9800, 10400, 11100, 11800, 12847];

const knowledgeNodes = [
  { id: 'n1', label: 'Agent OS', x: 50, y: 40, color: '#00ffff', size: 18 },
  { id: 'n2', label: 'Claude', x: 20, y: 25, color: '#E63946', size: 12 },
  { id: 'n3', label: 'Hermes', x: 80, y: 20, color: '#FFB627', size: 12 },
  { id: 'n4', label: 'OpenClaw', x: 25, y: 65, color: '#E8751A', size: 12 },
  { id: 'n5', label: 'Vault', x: 75, y: 70, color: '#2E86AB', size: 12 },
  { id: 'n6', label: 'Skills', x: 55, y: 80, color: '#9d4edd', size: 10 },
  { id: 'n7', label: 'Memory', x: 45, y: 15, color: '#00ff88', size: 10 },
  { id: 'n8', label: 'Governance', x: 15, y: 50, color: '#FFB627', size: 10 },
];

const knowledgeEdges = [
  ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'],
  ['n2', 'n7'], ['n3', 'n6'], ['n4', 'n8'], ['n5', 'n6'],
];

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
    { label: 'New Chat', icon: MessageSquare, color: '#00ffff' },
    { label: 'Search Memory', icon: Search, color: '#9d4edd' },
    { label: 'Create Task', icon: CheckSquare, color: '#00ff88' },
    { label: 'View Analytics', icon: BarChart3, color: '#FFB627' },
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
  const width = 240;
  const height = 60;
  const max = Math.max(...memoryGrowthData, 1);
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
          <div className="text-white font-mono font-bold text-sm">{systemMetrics.vaultEntries.toLocaleString()}</div>
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

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

      <button className="mt-3 w-full text-center text-[10px] py-2 rounded-lg border border-[rgba(0,255,255,0.2)] text-[#00ffff] bg-[rgba(0,255,255,0.05)] hover:bg-[rgba(0,255,255,0.1)] transition-colors flex items-center justify-center gap-1">
        <Network size={11} /> Open Full Graph
      </button>
    </GlassCard>
  );
}

// ─── Recent Activities ───

function RecentActivities() {
  const agentIcons: Record<string, string> = {
    Claude: '🧠',
    Hermes: '🔍',
    'Self Vault': '💾',
    OpenClaw: '👥',
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#00ff88]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Recent Activity</span>
        </div>
        <span className="text-[9px] text-[#8888aa]">{recentActivities.length} events</span>
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {recentActivities.map((activity, i) => (
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
                    style={{ backgroundColor: `${member === 'Claude' ? '#E63946' : member === 'Hermes' ? '#FFB627' : member === 'OpenClaw' ? '#E8751A' : '#2E86AB'}30`, marginLeft: mi > 0 ? '-4px' : '0' }}>
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
            const agentColors: Record<string, string> = { claude: '#E63946', hermes: '#FFB627', openclaw: '#E8751A', vault: '#2E86AB' };
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

  const totalSessions = Object.values(agentAnalytics).reduce((s, a) => s + a.totalSessions, 0);
  const avgResponseTime = Object.values(agentAnalytics).reduce((s, a) => s + a.avgResponseTime, 0) / Object.keys(agentAnalytics).length;
  const totalTokens = Object.values(agentAnalytics).reduce((s, a) => s + a.totalTokens, 0) + totalTokensUsed;

  const stats = [
    { label: 'Sessions', value: totalSessions.toLocaleString(), change: '+12%', up: true, icon: Activity, color: '#00ffff' },
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
              <span className={`text-[9px] font-mono font-bold flex items-center gap-0.5 ${stat.up ? 'text-[#00ff88]' : 'text-[#00ff88]'}`}>
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
