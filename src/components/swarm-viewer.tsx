'use client';

// ============================================================
// Agentic OS V2 — Enhanced Swarm Viewer
// SVG Force-Directed Graph with Animated Topology
// ============================================================
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Play,
  Crown,
  Link2,
  Cog,
  Eye,
  Shield,
  Database,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Activity,
  Clock,
  Bot,
  X,
  TrendingUp,
  BarChart3,
  Hexagon,
  Diamond,
  Circle,
} from 'lucide-react';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import type {
  SwarmRoleType,
  SwarmLevel,
  SwarmMapData,
  SwarmMapNode,
  SwarmMapEdge,
  TaskComplexity,
  SwarmStatus,
} from '@/lib/types';

// ─── Color & Style Constants ──────────────────────────────────

const ROLE_CONFIG: Record<
  SwarmRoleType,
  {
    color: string;
    bgClass: string;
    icon: typeof Crown;
    size: number;
    ringWidth: number;
    shape: 'circle' | 'hexagon' | 'diamond';
    label: string;
  }
> = {
  leader: {
    color: '#FFD700',
    bgClass: 'bg-[#FFD700]/10',
    icon: Crown,
    size: 38,
    ringWidth: 4,
    shape: 'circle',
    label: 'Leader',
  },
  coordinator: {
    color: '#9d4edd',
    bgClass: 'bg-[#9d4edd]/10',
    icon: Link2,
    size: 32,
    ringWidth: 3,
    shape: 'circle',
    label: 'Coordinator',
  },
  worker: {
    color: '#00ff88',
    bgClass: 'bg-[#00ff88]/10',
    icon: Cog,
    size: 28,
    ringWidth: 3,
    shape: 'circle',
    label: 'Worker',
  },
  reviewer: {
    color: '#3b82f6',
    bgClass: 'bg-[#3b82f6]/10',
    icon: Eye,
    size: 28,
    ringWidth: 3,
    shape: 'circle',
    label: 'Reviewer',
  },
  verifier: {
    color: '#E8751A',
    bgClass: 'bg-[#E8751A]/10',
    icon: Shield,
    size: 28,
    ringWidth: 3,
    shape: 'circle',
    label: 'Verifier',
  },
  memory_agent: {
    color: '#1B998B',
    bgClass: 'bg-[#1B998B]/10',
    icon: Database,
    size: 28,
    ringWidth: 3,
    shape: 'hexagon',
    label: 'Memory',
  },
  knowledge_agent: {
    color: '#6366f1',
    bgClass: 'bg-[#6366f1]/10',
    icon: BookOpen,
    size: 28,
    ringWidth: 3,
    shape: 'diamond',
    label: 'Knowledge',
  },
};

const EDGE_COLORS: Record<SwarmMapEdge['type'], string> = {
  task_assignment: '#FFD700',
  result_delivery: '#00ff88',
  memory_access: '#1B998B',
  coordination: '#9d4edd',
  review: '#3b82f6',
};

const LEVEL_COLORS: Record<SwarmLevel, string> = {
  single_agent: '#888888',
  light: '#00ff88',
  standard: '#FFB627',
  enterprise: '#E8751A',
  multi_swarm: '#9d4edd',
};

const COMPLEXITY_COLORS: Record<TaskComplexity, string> = {
  simple: '#888888',
  medium: '#00ff88',
  complex: '#FFB627',
  enterprise: '#E8751A',
  multi_swarm: '#9d4edd',
};

type SwarmPhase = 'forming' | 'executing' | 'reviewing' | 'verifying' | 'completed';

function statusToPhase(status: SwarmStatus): SwarmPhase {
  switch (status) {
    case 'forming':
      return 'forming';
    case 'active':
      return 'executing';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'completed';
    default:
      return 'forming';
  }
}

// ─── Types ────────────────────────────────────────────────────

interface SwarmResult {
  agentId: string;
  agentType: string;
  role: SwarmRoleType;
  result: string;
  success: boolean;
  phase: number;
  durationMs: number;
}

interface SwarmData {
  id: string;
  task: string;
  complexity: TaskComplexity;
  level: SwarmLevel;
  agentIds: string[];
  roles: Array<{ agentId: string; role: SwarmRoleType }>;
  status: SwarmStatus;
  createdAt: number;
  completedAt?: number;
  parentSwarmId?: string;
  childSwarmIds: string[];
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  role?: SwarmRoleType;
  nodeType: 'agent' | 'model' | 'memory' | 'artifact';
  label: string;
  status: string;
  agentType?: string;
  fixed?: boolean;
  swarmId?: string;
}

interface SimEdge {
  source: string;
  target: string;
  type: SwarmMapEdge['type'];
  label?: string;
}

// ─── Force Simulation ─────────────────────────────────────────

function runForceSimulation(
  nodes: SimNode[],
  edges: SimEdge[],
  width: number,
  height: number,
  iterations: number = 80,
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Initial placement in concentric circles by role hierarchy
  const roleOrder: SwarmRoleType[] = [
    'leader',
    'coordinator',
    'memory_agent',
    'knowledge_agent',
    'worker',
    'reviewer',
    'verifier',
  ];
  const agentNodes = nodes.filter((n) => n.nodeType === 'agent');
  const otherNodes = nodes.filter((n) => n.nodeType !== 'agent');

  // Place agent nodes in rings by role importance
  const leaders = agentNodes.filter((n) => n.role === 'leader');
  const rest = agentNodes.filter((n) => n.role !== 'leader');

  // Leaders near center
  leaders.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(leaders.length, 1) - Math.PI / 2;
    n.x = centerX + 60 * Math.cos(angle);
    n.y = centerY + 60 * Math.sin(angle);
  });

  // Other agents in outer ring
  const sorted = [...rest].sort((a, b) => {
    const ai = roleOrder.indexOf(a.role ?? 'worker');
    const bi = roleOrder.indexOf(b.role ?? 'worker');
    return ai - bi;
  });
  sorted.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(sorted.length, 1) - Math.PI / 2;
    const radius = Math.min(width, height) * 0.3;
    n.x = centerX + radius * Math.cos(angle);
    n.y = centerY + radius * Math.sin(angle);
  });

  // Memory/artifact nodes in between
  otherNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(otherNodes.length, 1) + Math.PI / 6;
    n.x = centerX + 120 * Math.cos(angle);
    n.y = centerY + 120 * Math.sin(angle);
  });

  // Spring physics iterations
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations; // Cooling factor

    // Repulsive force between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = 100;
        const force = ((minDist * minDist) / dist) * 0.05 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx = (a.vx ?? 0) - fx;
        a.vy = (a.vy ?? 0) - fy;
        b.vx = (b.vx ?? 0) + fx;
        b.vy = (b.vy ?? 0) + fy;
      }
    }

    // Attractive force along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 160;
      const force = (dist - idealDist) * 0.01 * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx = (source.vx ?? 0) + fx;
      source.vy = (source.vy ?? 0) + fy;
      target.vx = (target.vx ?? 0) - fx;
      target.vy = (target.vy ?? 0) - fy;
    }

    // Center gravity
    for (const node of nodes) {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx = (node.vx ?? 0) + dx * 0.002 * alpha;
      node.vy = (node.vy ?? 0) + dy * 0.002 * alpha;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      node.vx = (node.vx ?? 0) * 0.6;
      node.vy = (node.vy ?? 0) * 0.6;
      node.x += node.vx;
      node.y += node.vy;
      // Keep in bounds
      node.x = Math.max(50, Math.min(width - 50, node.x));
      node.y = Math.max(50, Math.min(height - 50, node.y));
    }
  }
}

// ─── SVG Shape Generators ─────────────────────────────────────

function hexagonPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function diamondPoints(cx: number, cy: number, r: number): string {
  const s = r * 1.2;
  return `${cx},${cy - s} ${cx + s * 0.8},${cy} ${cx},${cy + s} ${cx - s * 0.8},${cy}`;
}

// ─── Mini Sparkline Component ─────────────────────────────────

function MiniSparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Node Shape Renderer ──────────────────────────────────────

function NodeShape({
  node,
  isHighlighted,
  isActive,
  phase,
  onClick,
}: {
  node: SimNode;
  isHighlighted: boolean;
  isActive: boolean;
  phase: SwarmPhase;
  onClick: () => void;
}) {
  const config = node.role ? ROLE_CONFIG[node.role] : null;
  const color = config?.color ?? '#888';
  const size = config?.size ?? 28;
  const shape = config?.shape ?? 'circle';
  const Icon = config?.icon ?? Bot;
  const isCompleted = phase === 'completed';
  const isForming = phase === 'forming';

  const nodeColor = isCompleted ? '#00ff88' : color;
  const glowOpacity = isActive ? 0.4 : isHighlighted ? 0.25 : 0.1;

  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      style={{ transition: 'transform 0.3s ease' }}
    >
      {/* Glow ring */}
      <circle
        cx={node.x}
        cy={node.y}
        r={size + 8}
        fill="none"
        stroke={nodeColor}
        strokeWidth={2}
        opacity={glowOpacity}
      >
        {isActive && (
          <animate
            attributeName="r"
            values={`${size + 6};${size + 14};${size + 6}`}
            dur="2s"
            repeatCount="indefinite"
          />
        )}
        {isActive && (
          <animate
            attributeName="opacity"
            values="0.4;0.1;0.4"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Completed celebration pulse */}
      {isCompleted && (
        <circle
          cx={node.x}
          cy={node.y}
          r={size + 4}
          fill="none"
          stroke="#00ff88"
          strokeWidth={2}
        >
          <animate
            attributeName="r"
            values={`${size + 4};${size + 20}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Shape background */}
      {shape === 'circle' && (
        <circle
          cx={node.x}
          cy={node.y}
          r={size}
          fill={`${nodeColor}15`}
          stroke={nodeColor}
          strokeWidth={config?.ringWidth ?? 3}
        />
      )}
      {shape === 'hexagon' && (
        <polygon
          points={hexagonPoints(node.x, node.y, size)}
          fill={`${nodeColor}15`}
          stroke={nodeColor}
          strokeWidth={config?.ringWidth ?? 3}
        />
      )}
      {shape === 'diamond' && (
        <polygon
          points={diamondPoints(node.x, node.y, size)}
          fill={`${nodeColor}15`}
          stroke={nodeColor}
          strokeWidth={config?.ringWidth ?? 3}
        />
      )}

      {/* Forming pulse */}
      {isForming && (
        <circle
          cx={node.x}
          cy={node.y}
          r={size}
          fill="none"
          stroke={nodeColor}
          strokeWidth={2}
        >
          <animate
            attributeName="opacity"
            values="1;0.2;1"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Icon */}
      <foreignObject
        x={node.x - 10}
        y={node.y - 10}
        width={20}
        height={20}
      >
        <div className="flex items-center justify-center w-full h-full">
          <Icon
            size={14}
            style={{ color: nodeColor }}
          />
        </div>
      </foreignObject>

      {/* Label */}
      <text
        x={node.x}
        y={node.y + size + 14}
        textAnchor="middle"
        fill={nodeColor}
        fontSize={10}
        fontFamily="system-ui"
        fontWeight={500}
      >
        {node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label}
      </text>

      {/* Role badge */}
      {config && (
        <text
          x={node.x}
          y={node.y + size + 24}
          textAnchor="middle"
          fill={`${nodeColor}88`}
          fontSize={8}
          fontFamily="system-ui"
        >
          {config.label}
        </text>
      )}

      {/* Status dot */}
      <circle
        cx={node.x + size - 4}
        cy={node.y - size + 4}
        r={4}
        fill={
          node.status === 'active' || node.status === 'running'
            ? '#00ff88'
            : node.status === 'error'
              ? '#E6394A'
              : node.status === 'completed'
                ? '#00ff88'
                : '#FFB627'
        }
      />
      {node.status === 'active' && (
        <circle
          cx={node.x + size - 4}
          cy={node.y - size + 4}
          r={4}
          fill="#00ff88"
        >
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  );
}

// ─── Animated Edge Renderer ───────────────────────────────────

function AnimatedEdge({
  source,
  target,
  type,
  isActive,
}: {
  source: SimNode;
  target: SimNode;
  type: SwarmMapEdge['type'];
  isActive: boolean;
}) {
  const color = EDGE_COLORS[type] ?? '#888';
  const dashArray = isActive ? '8 4' : '4 4';

  return (
    <g>
      {/* Edge line */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={color}
        strokeWidth={isActive ? 2 : 1.5}
        strokeDasharray={dashArray}
        opacity={isActive ? 0.7 : 0.3}
      >
        {isActive && (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-24"
            dur="1s"
            repeatCount="indefinite"
          />
        )}
      </line>

      {/* Flowing dot for active edges */}
      {isActive && (
        <circle r={3} fill={color} opacity={0.8}>
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={`M${source.x},${source.y} L${target.x},${target.y}`}
          />
          <animate
            attributeName="opacity"
            values="0.9;0.3;0.9"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Arrow head */}
      {isActive && (
        <polygon
          points="0,-3 6,0 0,3"
          fill={color}
          opacity={0.6}
          transform={`translate(${target.x},${target.y}) rotate(${
            (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI
          })`}
        />
      )}
    </g>
  );
}

// ─── Child Swarm Cluster ──────────────────────────────────────

function ChildSwarmCluster({
  childSwarm,
  nodes,
  edges,
  phase,
  selectedNodeId,
  onNodeClick,
}: {
  childSwarm: SwarmData;
  nodes: SimNode[];
  edges: SimEdge[];
  phase: SwarmPhase;
  selectedNodeId: string | null;
  onNodeClick: (node: SimNode) => void;
}) {
  const childNodes = nodes.filter((n) => n.swarmId === childSwarm.id);
  if (childNodes.length === 0) return null;

  const minX = Math.min(...childNodes.map((n) => n.x)) - 50;
  const minY = Math.min(...childNodes.map((n) => n.y)) - 50;
  const maxX = Math.max(...childNodes.map((n) => n.x)) + 50;
  const maxY = Math.max(...childNodes.map((n) => n.y)) + 70;

  return (
    <g>
      {/* Cluster boundary */}
      <rect
        x={minX}
        y={minY}
        width={maxX - minX}
        height={maxY - minY}
        rx={16}
        fill={`${LEVEL_COLORS[childSwarm.level] ?? '#9d4edd'}08`}
        stroke={`${LEVEL_COLORS[childSwarm.level] ?? '#9d4edd'}30`}
        strokeWidth={1}
        strokeDasharray="6 3"
      />
      <text
        x={minX + 12}
        y={minY + 16}
        fill={`${LEVEL_COLORS[childSwarm.level] ?? '#9d4edd'}88`}
        fontSize={9}
        fontFamily="system-ui"
      >
        Child: {childSwarm.task.slice(0, 30)}…
      </text>

      {/* Nodes within child swarm */}
      {childNodes.map((node) => {
        const role = node.role ?? 'worker';
        const isHighlighted =
          (phase === 'reviewing' && role === 'reviewer') ||
          (phase === 'verifying' && role === 'verifier');
        return (
          <NodeShape
            key={node.id}
            node={node}
            isHighlighted={isHighlighted}
            isActive={phase === 'executing'}
            phase={phase}
            onClick={() => onNodeClick(node)}
          />
        );
      })}
    </g>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────

function DetailPanel({
  node,
  result,
  onClose,
}: {
  node: SimNode | null;
  result: SwarmResult | undefined;
  onClose: () => void;
}) {
  // Generate fake performance data for sparkline
  const perfData = useMemo(() => {
    if (!result) return [];
    const base = result.success ? 75 : 40;
    return Array.from({ length: 12 }, (_, i) =>
      Math.max(0, base + Math.sin(i * 0.8) * 15 + (Math.random() - 0.5) * 10),
    );
  }, [result]);

  if (!node) return null;
  const config = node.role ? ROLE_CONFIG[node.role] : null;
  const color = config?.color ?? '#888';
  const Icon = config?.icon ?? Bot;
  const label = config?.label ?? node.nodeType;

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-80 bg-[#0d0d20]/95 backdrop-blur-lg border-l border-border z-20 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{node.label}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{label}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Role & Type */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Role</div>
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: `${color}40`,
                color,
                backgroundColor: `${color}10`,
              }}
            >
              {label}
            </Badge>
          </div>

          {/* Agent Type */}
          {node.agentType && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Agent Type</div>
              <div className="text-sm text-foreground capitalize">{node.agentType}</div>
            </div>
          )}

          {/* Current Task / Result */}
          {result && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {result.success ? 'Task Result' : 'Task Error'}
              </div>
              <div
                className={cn(
                  'text-xs p-3 rounded-lg border',
                  result.success
                    ? 'bg-[#00ff88]/5 border-[#00ff88]/20 text-foreground'
                    : 'bg-[#E6394A]/5 border-[#E6394A]/20 text-foreground',
                )}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {result.success ? (
                    <CheckCircle2 size={12} className="text-[#00ff88]" />
                  ) : (
                    <XCircle size={12} className="text-[#E6394A]" />
                  )}
                  <span className="font-medium">
                    {result.success ? 'Completed' : 'Failed'}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {result.durationMs}ms
                  </span>
                </div>
                <div className="text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {result.result.slice(0, 500)}
                </div>
              </div>
            </div>
          )}

          {/* DNA Stats */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">DNA Stats</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted/10 border border-border/50">
                <div className="text-[9px] text-muted-foreground uppercase">Success Rate</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: '#00ff88' }}>
                  {result?.success ? '98.2%' : '72.1%'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/10 border border-border/50">
                <div className="text-[9px] text-muted-foreground uppercase">Experience</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: '#FFB627' }}>
                  {Math.floor(Math.random() * 50 + 10)} tasks
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/10 border border-border/50">
                <div className="text-[9px] text-muted-foreground uppercase">Memory</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: '#1B998B' }}>
                  {Math.floor(Math.random() * 40 + 5)} entries
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/10 border border-border/50">
                <div className="text-[9px] text-muted-foreground uppercase">Phase</div>
                <div className="text-sm font-bold mt-0.5" style={{ color }}>
                  {result?.phase ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Sparkline */}
          {perfData.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Performance</div>
              <div className="p-3 rounded-lg bg-muted/10 border border-border/50">
                <MiniSparkline data={perfData} color={color} width={240} height={40} />
                <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
                  <span>Avg: {Math.round(perfData.reduce((a, b) => a + b, 0) / perfData.length)}%</span>
                  <span>Peak: {Math.round(Math.max(...perfData))}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    node.status === 'active' || node.status === 'running'
                      ? '#00ff88'
                      : node.status === 'error'
                        ? '#E6394A'
                        : '#FFB627',
                }}
              />
              <span className="text-sm text-foreground capitalize">{node.status}</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────

function StatsBar({
  swarm,
  phase,
  activeSwarmsCount,
}: {
  swarm: SwarmData | null;
  phase: SwarmPhase;
  activeSwarmsCount: number;
}) {
  if (!swarm) return null;

  const totalAgents = swarm.agentIds.length;
  const levelColor = LEVEL_COLORS[swarm.level] ?? '#888';
  const phaseProgress: Record<SwarmPhase, number> = {
    forming: 15,
    executing: 45,
    reviewing: 70,
    verifying: 90,
    completed: 100,
  };

  const estimatedCompletion = swarm.completedAt
    ? 'Done'
    : phase === 'completed'
      ? 'Done'
      : phase === 'forming'
        ? '~30s'
        : phase === 'executing'
          ? '~15s'
          : '~5s';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/10 border-b border-border/30 rounded-t-lg flex-wrap">
      <div className="flex items-center gap-1.5">
        <Network size={13} className="text-[#9d4edd]" />
        <span className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-medium">{activeSwarmsCount}</span> active
        </span>
      </div>

      <div className="w-px h-3.5 bg-border/50" />

      <div className="flex items-center gap-1.5">
        <Bot size={13} style={{ color: levelColor }} />
        <span className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-medium">{totalAgents}</span> agents
        </span>
      </div>

      <div className="w-px h-3.5 bg-border/50" />

      <div className="flex items-center gap-1.5">
        <Activity size={13} className="text-[#FFB627]" />
        <span className="text-[11px] text-muted-foreground">
          Phase:{' '}
          <span className="font-medium capitalize" style={{ color: phaseProgress[phase] === 100 ? '#00ff88' : '#FFB627' }}>
            {phase}
          </span>
        </span>
        {/* Phase progress bar */}
        <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: phaseProgress[phase] === 100 ? '#00ff88' : '#FFB627' }}
            initial={{ width: 0 }}
            animate={{ width: `${phaseProgress[phase]}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="w-px h-3.5 bg-border/50" />

      <div className="flex items-center gap-1.5">
        <Clock size={13} className="text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">
          ETA: <span className="text-foreground font-medium">{estimatedCompletion}</span>
        </span>
      </div>

      <div className="w-px h-3.5 bg-border/50" />

      <Badge
        variant="outline"
        className="text-[9px] px-2 h-5"
        style={{
          borderColor: `${levelColor}40`,
          color: levelColor,
          backgroundColor: `${levelColor}10`,
        }}
      >
        {swarm.level.replace('_', ' ')}
      </Badge>

      <Badge
        variant="outline"
        className="text-[9px] px-2 h-5"
        style={{
          borderColor: `${COMPLEXITY_COLORS[swarm.complexity]}40`,
          color: COMPLEXITY_COLORS[swarm.complexity],
          backgroundColor: `${COMPLEXITY_COLORS[swarm.complexity]}10`,
        }}
      >
        {swarm.complexity}
      </Badge>
    </div>
  );
}

// ─── Phase Indicator ──────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: SwarmPhase }) {
  const phaseConfig: Record<SwarmPhase, { color: string; icon: typeof Activity; label: string }> = {
    forming: { color: '#FFB627', icon: Zap, label: 'Forming Swarm' },
    executing: { color: '#00ff88', icon: Activity, label: 'Executing Tasks' },
    reviewing: { color: '#3b82f6', icon: Eye, label: 'Reviewing Results' },
    verifying: { color: '#E8751A', icon: Shield, label: 'Verifying Output' },
    completed: { color: '#00ff88', icon: CheckCircle2, label: 'Completed' },
  };

  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        backgroundColor: `${config.color}10`,
        border: `1px solid ${config.color}30`,
      }}
    >
      {phase === 'executing' || phase === 'forming' ? (
        <Loader2 size={14} className="animate-spin" style={{ color: config.color }} />
      ) : (
        <Icon size={14} style={{ color: config.color }} />
      )}
      <span className="text-xs font-medium" style={{ color: config.color }}>
        {config.label}
      </span>
    </motion.div>
  );
}

// ─── Main Swarm Viewer Component ──────────────────────────────

export function SwarmViewer() {
  // State
  const [swarm, setSwarm] = useState<SwarmData | null>(null);
  const [results, setResults] = useState<SwarmResult[]>([]);
  const [swarmMap, setSwarmMap] = useState<SwarmMapData | null>(null);
  const [childSwarms, setChildSwarms] = useState<SwarmData[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [activeSwarmsCount, setActiveSwarmsCount] = useState(0);
  const [formingNodes, setFormingNodes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgDims, setSvgDims] = useState({ width: 800, height: 500 });

  // Determine phase
  const phase = swarm ? statusToPhase(swarm.status) : 'forming';

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Formation animation: reveal nodes one by one
  useEffect(() => {
    if (!swarm || phase !== 'forming') {
      setFormingNodes(swarm?.agentIds.length ?? 0);
      return;
    }
    setFormingNodes(0);
    const total = swarm.agentIds.length;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setFormingNodes(count);
      if (count >= total) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [swarm, phase]);

  // Compute simulation nodes & edges
  const { simNodes, simEdges } = useMemo(() => {
    if (!swarmMap || !swarm) return { simNodes: [] as SimNode[], simEdges: [] as SimEdge[] };

    const nodes: SimNode[] = swarmMap.nodes.map((n, i) => ({
      id: n.id,
      x: n.x ?? svgDims.width / 2 + (i * 50) % 200,
      y: n.y ?? svgDims.height / 2 + (i * 50) % 200,
      vx: 0,
      vy: 0,
      role: n.role,
      nodeType: n.type,
      label: n.label,
      status: n.status,
      agentType: n.agentType,
      swarmId: swarm.id,
    }));

    const edges: SimEdge[] = swarmMap.edges.map((e) => ({
      source: e.sourceId,
      target: e.targetId,
      type: e.type,
      label: e.label,
    }));

    runForceSimulation(nodes, edges, svgDims.width, svgDims.height);

    return { simNodes: nodes, simEdges: edges };
  }, [swarmMap, swarm, svgDims.width, svgDims.height]);

  // Filter nodes for formation animation
  const visibleNodes = useMemo(() => {
    if (phase === 'forming' && swarm) {
      return simNodes.filter((n) => {
        if (n.nodeType !== 'agent') return true;
        const agentIndex = swarm.agentIds.indexOf(n.id);
        return agentIndex < formingNodes;
      });
    }
    return simNodes;
  }, [simNodes, phase, swarm, formingNodes]);

  const visibleEdges = useMemo(() => {
    if (phase === 'forming' && swarm) {
      const visibleIds = new Set(visibleNodes.map((n) => n.id));
      return simEdges.filter(
        (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
      );
    }
    return simEdges;
  }, [simEdges, phase, swarm, visibleNodes]);

  // Node map for edge lookup
  const nodeMap = useMemo(
    () => new Map(simNodes.map((n) => [n.id, n])),
    [simNodes],
  );

  // Auto-form swarm
  const autoFormSwarm = useCallback(async () => {
    if (!taskInput.trim()) return;
    setIsExecuting(true);
    setError(null);
    setSelectedNode(null);
    try {
      const response = await fetch('/api/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput }),
      });
      const data = (await response.json()) as {
        swarm: SwarmData;
        result: { results: SwarmResult[] };
        swarmMap?: SwarmMapData;
      };

      if (!response.ok) {
        setError((data as { error?: string }).error ?? 'Failed to form swarm');
        return;
      }

      setSwarm(data.swarm);
      setResults(data.result?.results ?? []);
      setSwarmMap(data.swarmMap ?? null);
      setChildSwarms([]);
      setActiveSwarmsCount(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to form swarm');
    } finally {
      setIsExecuting(false);
    }
  }, [taskInput]);

  // Poll active swarms
  useEffect(() => {
    if (!swarm || swarm.status === 'completed' || swarm.status === 'failed' || swarm.status === 'cancelled') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/swarm');
        const data = (await res.json()) as {
          activeSwarms: SwarmData[];
          swarmMaps: Array<{ swarmId: string; map: SwarmMapData }>;
        };
        setActiveSwarmsCount(data.activeSwarms?.length ?? 0);

        // Update current swarm data if found
        const updatedSwarm = data.activeSwarms?.find((s) => s.id === swarm.id);
        if (updatedSwarm) {
          setSwarm(updatedSwarm);
          const mapEntry = data.swarmMaps?.find((m) => m.swarmId === swarm.id);
          if (mapEntry) {
            setSwarmMap(mapEntry.map);
          }
        }

        // Find child swarms
        if (swarm.childSwarmIds?.length > 0) {
          const children = data.activeSwarms?.filter((s) =>
            swarm.childSwarmIds.includes(s.id),
          ) ?? [];
          setChildSwarms(children);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [swarm]);

  // Get result for a node
  const getResultForNode = useCallback(
    (node: SimNode): SwarmResult | undefined => {
      return results.find((r) => r.agentId === node.id);
    },
    [results],
  );

  // Determine highlighted roles for current phase
  const isRoleHighlighted = useCallback(
    (role?: SwarmRoleType): boolean => {
      if (!role) return false;
      if (phase === 'reviewing' && role === 'reviewer') return true;
      if (phase === 'verifying' && role === 'verifier') return true;
      return false;
    },
    [phase],
  );

  // Parent-child edges
  const parentChildEdges = useMemo(() => {
    if (!swarm || childSwarms.length === 0) return [];
    const leaderNode = simNodes.find(
      (n) => n.role === 'leader' && n.swarmId === swarm.id,
    );
    return childSwarms
      .map((child) => {
        const childLeader = simNodes.find(
          (n) => n.role === 'leader' && n.swarmId === child.id,
        );
        if (!leaderNode || !childLeader) return null;
        return {
          source: leaderNode,
          target: childLeader,
        };
      })
      .filter(Boolean) as Array<{ source: SimNode; target: SimNode }>;
  }, [swarm, childSwarms, simNodes]);

  return (
    <div className="h-full flex flex-col">
      {/* Task Input */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && autoFormSwarm()}
                placeholder="Describe a task for the swarm..."
                className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[#9d4edd]/50 transition-colors"
                disabled={isExecuting}
              />
              <Button
                onClick={autoFormSwarm}
                disabled={isExecuting || !taskInput.trim()}
                className="bg-[#9d4edd] hover:bg-[#9d4edd]/80 text-white"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span className="ml-2">Auto-Form</span>
              </Button>
            </div>
            {error && (
              <div className="mt-2 text-xs text-[#E6394A] bg-[#E6394A]/10 border border-[#E6394A]/20 rounded-lg px-3 py-1.5">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Bar */}
      {swarm && (
        <div className="shrink-0 px-4">
          <StatsBar
            swarm={swarm}
            phase={phase}
            activeSwarmsCount={activeSwarmsCount}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden px-4 pb-4 pt-2">
        {swarm && swarmMap && simNodes.length > 0 ? (
          <div className="h-full relative rounded-lg border border-border/50 bg-[#060612]/80 overflow-hidden">
            {/* Phase indicator overlay */}
            <div className="absolute top-3 left-3 z-10">
              <PhaseIndicator phase={phase} />
            </div>

            {/* SVG Canvas */}
            <div ref={containerRef} className="w-full h-full">
              <svg
                ref={svgRef}
                width={svgDims.width}
                height={svgDims.height}
                viewBox={`0 0 ${svgDims.width} ${svgDims.height}`}
                className="w-full h-full"
                style={{ background: 'transparent' }}
              >
                <defs>
                  {/* Glow filter for active nodes */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Grid pattern */}
                  <pattern
                    id="grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth={0.5}
                    />
                  </pattern>
                </defs>

                {/* Background grid */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Edges */}
                <g>
                  {visibleEdges.map((edge, i) => {
                    const source = nodeMap.get(edge.source);
                    const target = nodeMap.get(edge.target);
                    if (!source || !target) return null;
                    return (
                      <AnimatedEdge
                        key={`edge-${i}`}
                        source={source}
                        target={target}
                        type={edge.type}
                        isActive={
                          phase === 'executing' ||
                          phase === 'reviewing' ||
                          phase === 'verifying'
                        }
                      />
                    );
                  })}
                </g>

                {/* Parent-child edges */}
                {parentChildEdges.map((pce, i) => (
                  <g key={`pce-${i}`}>
                    <line
                      x1={pce.source.x}
                      y1={pce.source.y}
                      x2={pce.target.x}
                      y2={pce.target.y}
                      stroke="#9d4edd"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      opacity={0.5}
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="-24"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </line>
                  </g>
                ))}

                {/* Child swarm clusters */}
                {childSwarms.map((child) => (
                  <ChildSwarmCluster
                    key={child.id}
                    childSwarm={child}
                    nodes={simNodes}
                    edges={simEdges}
                    phase={phase}
                    selectedNodeId={selectedNode?.id ?? null}
                    onNodeClick={(node) => setSelectedNode(node)}
                  />
                ))}

                {/* Main swarm nodes */}
                {visibleNodes
                  .filter(
                    (n) =>
                      !childSwarms.some((c) => n.swarmId === c.id) ||
                      n.swarmId === swarm?.id,
                  )
                  .map((node) => {
                    const isHighlighted = isRoleHighlighted(node.role);
                    return (
                      <NodeShape
                        key={node.id}
                        node={node}
                        isHighlighted={isHighlighted}
                        isActive={
                          phase === 'executing' &&
                          (node.status === 'active' || node.status === 'running')
                        }
                        phase={phase}
                        onClick={() => setSelectedNode(node)}
                      />
                    );
                  })}
              </svg>
            </div>

            {/* Detail Panel */}
            <AnimatePresence>
              {selectedNode && (
                <DetailPanel
                  node={selectedNode}
                  result={getResultForNode(selectedNode)}
                  onClose={() => setSelectedNode(null)}
                />
              )}
            </AnimatePresence>
          </div>
        ) : swarm && isExecuting ? (
          /* Loading state */
          <div className="h-full flex items-center justify-center rounded-lg border border-border/50 bg-[#060612]/80">
            <div className="text-center">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Network className="w-12 h-12 mx-auto text-[#9d4edd]" />
              </motion.div>
              <p className="text-sm text-muted-foreground mt-3">
                Auto-forming swarm…
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Analyzing task complexity and assembling agents
              </p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="h-full flex items-center justify-center rounded-lg border border-border/50 bg-[#060612]/80">
            <div className="text-center">
              <Network className="w-16 h-16 mx-auto mb-4 opacity-15 text-[#9d4edd]" />
              <p className="text-sm text-muted-foreground">
                Describe a task to auto-form a swarm
              </p>
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground/60">
                <span>Simple: 1 agent</span>
                <span>·</span>
                <span>Medium: 3 agents</span>
                <span>·</span>
                <span>Complex: 5 agents</span>
                <span>·</span>
                <span>Enterprise: 8 agents</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary (below canvas) */}
      {results.length > 0 && (
        <div className="shrink-0 px-4 pb-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-[#9d4edd]" />
                <span className="text-xs font-medium text-foreground">
                  Agent Results
                </span>
                <Badge variant="outline" className="text-[9px] h-4 ml-auto">
                  {results.filter((r) => r.success).length}/{results.length} passed
                </Badge>
              </div>
              <ScrollArea className="max-h-40">
                <div className="space-y-1.5">
                  {results.map((result, i) => {
                    const config = ROLE_CONFIG[result.role];
                    const color = config?.color ?? '#888';
                    const Icon = config?.icon ?? Bot;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/10 border border-border/40 text-xs"
                      >
                        <Icon size={12} style={{ color }} />
                        <span className="font-medium capitalize" style={{ color }}>
                          {result.role}
                        </span>
                        <span className="text-muted-foreground truncate flex-1">
                          {result.result.slice(0, 80)}…
                        </span>
                        {result.success ? (
                          <CheckCircle2 size={12} className="text-[#00ff88] shrink-0" />
                        ) : (
                          <XCircle size={12} className="text-[#E6394A] shrink-0" />
                        )}
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          {result.durationMs}ms
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
