'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  GitBranch,
  Clock,
  Sparkles,
  Users,
  Link2,
  X,
  ChevronRight,
  Eye,
  Check,
  AlertTriangle,
  MessageSquare,
  FileText,
  Mail,
  Globe,
  File,
  BookOpen,
  Zap,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Shield,
  Database,
  BarChart3,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  Tag,
  Hash,
  Star,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Info,
} from 'lucide-react';
import { useMemoryStore } from '@/lib/memory-store';
import type {
  MemoryType,
  MemorySource,
  SearchType,
  MemoryNode,
  GraphNode,
  GraphEdge,
  MemoryTimelineEvent,
  MemoryExtraction,
  MemoryRelation,
  TimelineEventType,
  ExtractionStatus,
  ExtractedType,
  RelationType,
  GraphNodeType,
} from '@/lib/memory-store';

// ─── Color Constants ───

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  'long-term': '#2E86AB',
  'short-term': '#5BC0EB',
  episodic: '#E63946',
  semantic: '#7B2CBF',
  context: '#FFB627',
  project: '#E8751A',
  user: '#1B998B',
  team: '#FF8C42',
  conversation: '#D62828',
};

const MEMORY_TYPE_ICONS: Record<MemoryType, React.ReactNode> = {
  'long-term': <Database className="w-4 h-4" />,
  'short-term': <Zap className="w-4 h-4" />,
  episodic: <BookOpen className="w-4 h-4" />,
  semantic: <Brain className="w-4 h-4" />,
  context: <Layers className="w-4 h-4" />,
  project: <BarChart3 className="w-4 h-4" />,
  user: <Users className="w-4 h-4" />,
  team: <Shield className="w-4 h-4" />,
  conversation: <MessageSquare className="w-4 h-4" />,
};

const GRAPH_COLORS: Record<GraphNodeType, string> = {
  memory: '#2E86AB',
  person: '#E63946',
  company: '#FFB627',
  project: '#7B2CBF',
  task: '#E8751A',
  document: '#1B998B',
  concept: '#FF8C42',
  decision: '#D62828',
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  created: '#00ff88',
  updated: '#00ffff',
  referenced: '#9d4edd',
  shared: '#FFB627',
  extracted: '#00ffff',
  deleted: '#E63946',
};

const EXTRACTION_STATUS_COLORS: Record<ExtractionStatus, string> = {
  pending: '#FFB627',
  confirmed: '#00ff88',
  rejected: '#E63946',
};

// ─── Glass Card Component ───

function GlassCard({
  children,
  className = '',
  glowColor,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={glowColor ? { scale: 1.01 } : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm ${className}`}
      style={
        glowColor
          ? { boxShadow: `0 0 20px ${glowColor}20, inset 0 1px 0 ${glowColor}15` }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

// ─── Helper: Format relative time ───

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDayKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── 1. MemoryEngineDashboard ───

function MemoryEngineDashboard() {
  const {
    memories,
    memoryRelations,
    memoryExtractions,
    memoryTimeline,
    graphNodes,
    setMemorySearchQuery,
    setSelectedMemoryId,
    searchMemories,
  } = useMemoryStore();
  const [searchInput, setSearchInput] = useState('');

  const memoryTypes: MemoryType[] = [
    'long-term',
    'short-term',
    'episodic',
    'semantic',
    'context',
    'project',
    'user',
    'team',
    'conversation',
  ];

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const type of memoryTypes) {
      counts[type] = memories.filter((m) => m.type === type).length;
    }
    return counts;
  }, [memories]);

  const recentMemories = useMemo(
    () =>
      [...memories]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    [memories]
  );

  const maxBarValue = useMemo(
    () => Math.max(...memoryTypes.map((t) => typeCounts[t] || 0), 1),
    [typeCounts, memoryTypes]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchInput(query);
      setMemorySearchQuery(query);
      if (query.trim()) searchMemories(query);
    },
    [setMemorySearchQuery, searchMemories]
  );

  const stats = useMemo(
    () => [
      {
        label: 'Total Memories',
        value: memories.length,
        icon: <Database className="w-5 h-5" />,
        color: '#00ffff',
      },
      {
        label: 'Active Relations',
        value: memoryRelations.length,
        icon: <GitBranch className="w-5 h-5" />,
        color: '#9d4edd',
      },
      {
        label: 'Extractions',
        value: memoryExtractions.length,
        icon: <Sparkles className="w-5 h-5" />,
        color: '#FFB627',
      },
      {
        label: 'Timeline Events',
        value: memoryTimeline.length,
        icon: <Clock className="w-5 h-5" />,
        color: '#00ff88',
      },
    ],
    [memories, memoryRelations, memoryExtractions, memoryTimeline]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(0,255,255,0.1)',
              boxShadow: '0 0 15px rgba(0,255,255,0.3)',
            }}
          >
            <Brain className="w-5 h-5" style={{ color: '#00ffff' }} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">Universal Memory Engine</h2>
            <p className="text-sm" style={{ color: '#8888aa' }}>
              <span className="font-mono" style={{ color: '#00ffff' }}>
                {memories.length}
              </span>{' '}
              memories across{' '}
              <span className="font-mono" style={{ color: '#9d4edd' }}>
                {memoryTypes.length}
              </span>{' '}
              types
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: '#8888aa' }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm text-white text-sm placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,255,0.3)] transition-colors"
            style={{ boxShadow: searchInput ? '0 0 10px rgba(0,255,255,0.15)' : 'none' }}
          />
        </div>
      </div>

      {/* Memory Type Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-3">
        {memoryTypes.map((type, i) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard
              glowColor={MEMORY_TYPE_COLORS[type]}
              className="p-3 text-center cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                style={{
                  background: `${MEMORY_TYPE_COLORS[type]}20`,
                  color: MEMORY_TYPE_COLORS[type],
                }}
              >
                {MEMORY_TYPE_ICONS[type]}
              </div>
              <div
                className="font-mono text-lg font-bold"
                style={{ color: MEMORY_TYPE_COLORS[type] }}
              >
                {typeCounts[type] || 0}
              </div>
              <div className="text-xs mt-1 capitalize" style={{ color: '#8888aa' }}>
                {type}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Growth Chart + Recent Memories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <GlassCard className="p-4">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: '#9d4edd' }} />
            Memory Distribution
          </h3>
          <div className="space-y-2.5">
            {memoryTypes.map((type) => (
              <div key={type} className="flex items-center gap-3">
                <div className="w-20 text-xs capitalize truncate" style={{ color: '#ccccdd' }}>
                  {type}
                </div>
                <div className="flex-1 h-6 rounded-md bg-[rgba(18,18,42,0.8)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((typeCounts[type] || 0) / maxBarValue) * 100}%`,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-md"
                    style={{
                      background: `linear-gradient(90deg, ${MEMORY_TYPE_COLORS[type]}60, ${MEMORY_TYPE_COLORS[type]})`,
                      boxShadow: `0 0 8px ${MEMORY_TYPE_COLORS[type]}40`,
                    }}
                  />
                </div>
                <div
                  className="w-6 text-right font-mono text-xs"
                  style={{ color: MEMORY_TYPE_COLORS[type] }}
                >
                  {typeCounts[type] || 0}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Memories */}
        <GlassCard className="p-4">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: '#00ff88' }} />
            Recent Memories
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {recentMemories.map((mem) => (
              <motion.div
                key={mem.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedMemoryId(mem.id)}
                className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-[rgba(157,78,221,0.08)]"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{
                    background: MEMORY_TYPE_COLORS[mem.type],
                    boxShadow: `0 0 6px ${MEMORY_TYPE_COLORS[mem.type]}60`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{mem.title}</div>
                  <div className="text-xs truncate" style={{ color: '#8888aa' }}>
                    {mem.summary}
                  </div>
                </div>
                <div className="text-xs shrink-0 font-mono" style={{ color: '#8888aa' }}>
                  {formatRelativeTime(mem.createdAt)}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard glowColor={stat.color} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <span className="text-xs" style={{ color: '#8888aa' }}>
                  {stat.label}
                </span>
              </div>
              <div className="font-mono text-2xl font-bold text-white">{stat.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(157, 78, 221, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── 2. MemoryGraph ───

function MemoryGraph() {
  const { graphNodes, graphEdges, memories, setSelectedMemoryId, selectedMemoryId } =
    useMemoryStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [animFrame, setAnimFrame] = useState(0);
  const animationRef = useRef<number>(0);

  // Initialize node positions (useMemo to avoid set-state-in-effect)
  const initializedNodes = useMemo(() => {
    if (graphNodes.length > 0 && nodes.length === 0) {
      const cx = 400;
      const cy = 300;
      return graphNodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / graphNodes.length;
        const radius = 180 + Math.random() * 60;
        return {
          ...node,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      });
    }
    return null;
  }, [graphNodes]);

  // Apply initialized nodes once
  useEffect(() => {
    if (initializedNodes && nodes.length === 0) {
      setNodes(initializedNodes);
    }
  }, [initializedNodes, nodes.length]);

  // Simple force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    let running = true;
    const simulate = () => {
      if (!running) return;

      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n, vx: 0, vy: 0 }));
        const cx = 400;
        const cy = 300;

        // Repulsion between all nodes
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = (next[j].x || cx) - (next[i].x || cx);
            const dy = (next[j].y || cy) - (next[i].y || cy);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 8000 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            next[i].vx = (next[i].vx || 0) - fx;
            next[i].vy = (next[i].vy || 0) - fy;
            next[j].vx = (next[j].vx || 0) + fx;
            next[j].vy = (next[j].vy || 0) + fy;
          }
        }

        // Attraction along edges
        for (const edge of graphEdges) {
          const srcIdx = next.findIndex((n) => n.id === edge.source);
          const tgtIdx = next.findIndex((n) => n.id === edge.target);
          if (srcIdx === -1 || tgtIdx === -1) continue;
          const dx = (next[tgtIdx].x || cx) - (next[srcIdx].x || cx);
          const dy = (next[tgtIdx].y || cy) - (next[srcIdx].y || cy);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 150) * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          next[srcIdx].vx = (next[srcIdx].vx || 0) + fx;
          next[srcIdx].vy = (next[srcIdx].vy || 0) + fy;
          next[tgtIdx].vx = (next[tgtIdx].vx || 0) - fx;
          next[tgtIdx].vy = (next[tgtIdx].vy || 0) - fy;
        }

        // Center gravity
        for (const n of next) {
          n.vx = (n.vx || 0) + (cx - (n.x || cx)) * 0.002;
          n.vy = (n.vy || 0) + (cy - (n.y || cy)) * 0.002;
        }

        // Apply velocity with damping
        for (const n of next) {
          n.x = (n.x || cx) + (n.vx || 0) * 0.3;
          n.y = (n.y || cy) + (n.vy || 0) * 0.3;
          n.vx = (n.vx || 0) * 0.6;
          n.vy = (n.vy || 0) * 0.6;
        }

        return next;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [nodes.length, graphEdges]);

  // Animate particles along edges
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame((f) => f + 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const filteredNodes = useMemo(() => {
    if (!searchFilter.trim()) return nodes;
    const q = searchFilter.toLowerCase();
    return nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        Object.values(n.properties).some((v) => v.toLowerCase().includes(q))
    );
  }, [nodes, searchFilter]);

  const highlightedNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const selectedNodeData = useMemo(
    () => nodes.find((n) => n.id === selectedNode),
    [nodes, selectedNode]
  );

  const relatedMemories = useMemo(() => {
    if (!selectedNodeData?.memoryId) return [];
    const mem = memories.find((m) => m.id === selectedNodeData.memoryId);
    return mem ? [mem] : [];
  }, [selectedNodeData, memories]);

  const legendItems: { type: GraphNodeType; color: string }[] = [
    { type: 'memory', color: GRAPH_COLORS.memory },
    { type: 'person', color: GRAPH_COLORS.person },
    { type: 'company', color: GRAPH_COLORS.company },
    { type: 'project', color: GRAPH_COLORS.project },
    { type: 'task', color: GRAPH_COLORS.task },
    { type: 'document', color: GRAPH_COLORS.document },
    { type: 'concept', color: GRAPH_COLORS.concept },
    { type: 'decision', color: GRAPH_COLORS.decision },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" style={{ color: '#9d4edd' }} />
          <h3 className="text-lg font-bold text-white">Memory Graph</h3>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{ color: '#8888aa', background: 'rgba(157,78,221,0.1)' }}>
            {nodes.length} nodes / {graphEdges.length} edges
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#8888aa' }} />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter nodes..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white text-xs placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,255,0.3)] w-44"
            />
          </div>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" style={{ color: '#ccccdd' }} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" style={{ color: '#ccccdd' }} />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" style={{ color: '#ccccdd' }} />
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* SVG Canvas */}
        <GlassCard className="flex-1 overflow-hidden" style={{ minHeight: 500 }}>
          <div
            ref={containerRef}
            className="relative w-full"
            style={{ height: 500, cursor: isDragging ? 'grabbing' : 'grab' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 800 600`}
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
            >
              {/* Edges */}
              {graphEdges.map((edge) => {
                const srcNode = nodes.find((n) => n.id === edge.source);
                const tgtNode = nodes.find((n) => n.id === edge.target);
                if (!srcNode?.x || !srcNode?.y || !tgtNode?.x || !tgtNode?.y) return null;

                const midX = ((srcNode.x + tgtNode.x) / 2) + ((srcNode.y - tgtNode.y) * 0.15);
                const midY = ((srcNode.y + tgtNode.y) / 2) + ((tgtNode.x - srcNode.x) * 0.15);

                // Animated particle
                const t = ((animFrame * 0.02 + parseInt(edge.id.replace(/\D/g, '')) * 0.3) % 1);
                const pt = 1 - t;
                const particleX = pt * pt * srcNode.x + 2 * pt * t * midX + t * t * tgtNode.x;
                const particleY = pt * pt * srcNode.y + 2 * pt * t * midY + t * t * tgtNode.y;

                const isHighlighted =
                  highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);

                return (
                  <g key={edge.id} opacity={isHighlighted || !searchFilter ? 1 : 0.15}>
                    <path
                      d={`M ${srcNode.x} ${srcNode.y} Q ${midX} ${midY} ${tgtNode.x} ${tgtNode.y}`}
                      fill="none"
                      stroke={edge.color || 'rgba(157,78,221,0.3)'}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                    <circle r={3} fill={edge.color || '#9d4edd'}>
                      <animate
                        attributeName="cx"
                        values={`${srcNode.x};${tgtNode.x}`}
                        dur="3s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        values={`${srcNode.y};${tgtNode.y}`}
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Edge label */}
                    <text
                      x={midX}
                      y={midY - 6}
                      fill="#8888aa"
                      fontSize="8"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                if (!node.x || !node.y) return null;
                const isHighlighted = highlightedNodeIds.has(node.id);
                const isSelected = selectedNode === node.id;
                const r = node.size * 4 + 8;

                return (
                  <g
                    key={node.id}
                    opacity={isHighlighted || !searchFilter ? 1 : 0.15}
                    onClick={() => {
                      setSelectedNode(node.id);
                      if (node.memoryId) setSelectedMemoryId(node.memoryId);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Glow */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={r + 8}
                        fill="none"
                        stroke={node.color}
                        strokeWidth={2}
                        opacity={0.5}
                      >
                        <animate
                          attributeName="r"
                          values={`${r + 4};${r + 12};${r + 4}`}
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.5;0.2;0.5"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r}
                      fill={`${node.color}25`}
                      stroke={node.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      style={{
                        filter: isSelected
                          ? `drop-shadow(0 0 8px ${node.color}80)`
                          : `drop-shadow(0 0 4px ${node.color}40)`,
                      }}
                    />
                    <text
                      x={node.x}
                      y={node.y + 1}
                      fill="white"
                      fontSize={Math.max(8, r * 0.6)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none select-none"
                      fontWeight="bold"
                    >
                      {node.label.charAt(0).toUpperCase()}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + r + 12}
                      fill="#ccccdd"
                      fontSize="8"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {node.label.length > 16 ? node.label.slice(0, 16) + '…' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </GlassCard>

        {/* Details Panel */}
        <AnimatePresence>
          {selectedNodeData && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-72 shrink-0"
            >
              <GlassCard glowColor={selectedNodeData.color} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{selectedNodeData.label}</h4>
                  <button onClick={() => setSelectedNode(null)} className="text-[#8888aa] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs capitalize"
                    style={{
                      background: `${selectedNodeData.color}20`,
                      color: selectedNodeData.color,
                    }}
                  >
                    {selectedNodeData.type}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(selectedNodeData.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span style={{ color: '#8888aa' }}>{key}</span>
                      <span className="text-white font-mono">{value}</span>
                    </div>
                  ))}
                </div>
                {relatedMemories.length > 0 && (
                  <div className="pt-2 border-t border-[rgba(157,78,221,0.15)]">
                    <div className="text-xs mb-1.5" style={{ color: '#8888aa' }}>
                      Linked Memory
                    </div>
                    <div className="text-xs text-white">{relatedMemories[0].title}</div>
                    <div className="text-xs mt-1" style={{ color: '#8888aa' }}>
                      {relatedMemories[0].summary}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: item.color,
                boxShadow: `0 0 6px ${item.color}60`,
              }}
            />
            <span className="text-xs capitalize" style={{ color: '#8888aa' }}>
              {item.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. MemoryTimeline ───

function MemoryTimeline() {
  const { memoryTimeline, memories, setSelectedMemoryId } = useMemoryStore();
  const [filterType, setFilterType] = useState<TimelineEventType | 'all'>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const events = useMemo(() => {
    let filtered = [...memoryTimeline].sort((a, b) => b.createdAt - a.createdAt);
    if (filterType !== 'all') {
      filtered = filtered.filter((e) => e.eventType === filterType);
    }
    if (filterAgent !== 'all') {
      filtered = filtered.filter((e) => e.agentId === filterAgent);
    }
    return filtered;
  }, [memoryTimeline, filterType, filterAgent]);

  const agents = useMemo(() => {
    const set = new Set(memoryTimeline.map((e) => e.agentId));
    return Array.from(set);
  }, [memoryTimeline]);

  const groupedByDay = useMemo(() => {
    const groups: Record<string, MemoryTimelineEvent[]> = {};
    for (const event of events) {
      const key = formatDayKey(event.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    }
    return groups;
  }, [events]);

  const eventTypes: TimelineEventType[] = [
    'created',
    'updated',
    'referenced',
    'shared',
    'extracted',
    'deleted',
  ];

  const agentIcons: Record<string, React.ReactNode> = {
    claude: <Brain className="w-3.5 h-3.5" />,
    openclaw: <Shield className="w-3.5 h-3.5" />,
    hermes: <Zap className="w-3.5 h-3.5" />,
    vault: <Database className="w-3.5 h-3.5" />,
  };

  const agentColors: Record<string, string> = {
    claude: '#E63946',
    openclaw: '#E8751A',
    hermes: '#FFB627',
    vault: '#2E86AB',
  };

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: '#00ff88' }} />
          <h3 className="text-lg font-bold text-white">Memory Timeline</h3>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{ color: '#8888aa', background: 'rgba(0,255,136,0.1)' }}>
            {events.length} events
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5" style={{ color: '#8888aa' }} />
          <div className="flex gap-1 flex-wrap">
            {(['all', ...eventTypes] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="px-2 py-1 rounded-lg text-xs capitalize transition-colors"
                style={{
                  background:
                    filterType === type
                      ? `${type === 'all' ? '#9d4edd' : EVENT_COLORS[type]}20`
                      : 'rgba(18,18,42,0.4)',
                  color:
                    filterType === type
                      ? type === 'all'
                        ? '#9d4edd'
                        : EVENT_COLORS[type]
                      : '#8888aa',
                  border: `1px solid ${
                    filterType === type
                      ? `${type === 'all' ? '#9d4edd' : EVENT_COLORS[type]}40`
                      : 'rgba(157,78,221,0.1)'
                  }`,
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white focus:outline-none"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
        {Object.entries(groupedByDay).map(([day, dayEvents]) => (
          <div key={day} className="mb-6">
            {/* Day separator */}
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs font-semibold" style={{ color: '#00ff88' }}>
                {day}
              </div>
              <div className="flex-1 h-px bg-[rgba(157,78,221,0.15)]" />
            </div>

            {/* Events */}
            <div className="space-y-1 ml-4 border-l-2 border-[rgba(157,78,221,0.15)] pl-6 relative">
              {dayEvents.map((event, i) => {
                const mem = memories.find((m) => m.id === event.memoryId);
                const color = EVENT_COLORS[event.eventType];

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[31px] top-3 w-3 h-3 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 8px ${color}60`,
                      }}
                    />

                    <GlassCard className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Agent icon */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: `${agentColors[event.agentId] || '#8888aa'}20`,
                            color: agentColors[event.agentId] || '#8888aa',
                          }}
                        >
                          {agentIcons[event.agentId] || <Users className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs capitalize font-medium" style={{ color: agentColors[event.agentId] || '#8888aa' }}>
                              {event.agentId}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] capitalize font-medium"
                              style={{
                                background: `${color}20`,
                                color,
                              }}
                            >
                              {event.eventType}
                            </span>
                            <span className="font-mono text-[10px]" style={{ color: '#8888aa' }}>
                              {formatRelativeTime(event.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs text-white mt-1">{event.description}</div>
                          {mem && (
                            <button
                              onClick={() => setSelectedMemoryId(mem.id)}
                              className="mt-1 text-[10px] flex items-center gap-1 hover:underline"
                              style={{ color: MEMORY_TYPE_COLORS[mem.type] }}
                            >
                              {mem.title}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(157, 78, 221, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── 4. MemorySearch ───

function MemorySearch() {
  const {
    memories,
    memorySearchResults,
    memorySearchQuery,
    memorySearchType,
    setMemorySearchQuery,
    setMemorySearchType,
    searchMemories,
    setSelectedMemoryId,
  } = useMemoryStore();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      setMemorySearchQuery(q);
      if (q.trim()) searchMemories(q);
    },
    [setMemorySearchQuery, searchMemories]
  );

  const handleTypeChange = useCallback(
    (type: SearchType) => {
      setSearchType(type);
      setMemorySearchType(type);
      if (query.trim()) searchMemories(query);
    },
    [query, setMemorySearchType, searchMemories]
  );

  const searchTypes: SearchType[] = ['all', 'vector', 'graph', 'semantic', 'keyword'];

  const enrichedResults = useMemo(() => {
    return memorySearchResults
      .map((r) => ({
        ...r,
        memory: memories.find((m) => m.id === r.memoryId),
      }))
      .filter((r) => r.memory);
  }, [memorySearchResults, memories]);

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of memorySearchResults) {
      const key = r.searchType;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [memorySearchResults]);

  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[rgba(0,255,255,0.2)] text-[#00ffff] px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  const examples = [
    'Show everything related to Hermes',
    'Find all conversations mentioning recruitment',
    'What are the user preferences?',
    'Agent OS launch plan details',
  ];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div
          className="relative rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
          style={{
            boxShadow: query
              ? '0 0 30px rgba(0,255,255,0.15), 0 0 60px rgba(157,78,221,0.1)'
              : 'none',
          }}
        >
          <div className="flex items-center px-4">
            <Search className="w-5 h-5 shrink-0" style={{ color: query ? '#00ffff' : '#8888aa' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search memories with natural language..."
              className="w-full px-3 py-4 bg-transparent text-white text-base placeholder-[#8888aa] focus:outline-none"
            />
            {query && (
              <button onClick={() => handleSearch('')} className="shrink-0">
                <X className="w-4 h-4" style={{ color: '#8888aa' }} />
              </button>
            )}
          </div>

          {/* Pulsing glow effect */}
          {query && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(0,255,255,0.1)',
                  '0 0 40px rgba(0,255,255,0.2)',
                  '0 0 20px rgba(0,255,255,0.1)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Search Type Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {searchTypes.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className="px-3 py-1.5 rounded-full text-xs capitalize transition-all"
            style={{
              background: searchType === type ? 'rgba(0,255,255,0.15)' : 'rgba(18,18,42,0.4)',
              color: searchType === type ? '#00ffff' : '#8888aa',
              border: `1px solid ${searchType === type ? 'rgba(0,255,255,0.3)' : 'rgba(157,78,221,0.1)'}`,
              boxShadow: searchType === type ? '0 0 10px rgba(0,255,255,0.1)' : 'none',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Examples */}
      {!query && (
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => handleSearch(ex)}
              className="px-3 py-1.5 rounded-xl text-xs border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.3)] hover:bg-[rgba(157,78,221,0.08)] transition-colors"
              style={{ color: '#8888aa' }}
            >
              &ldquo;{ex}&rdquo;
            </button>
          ))}
        </div>
      )}

      {/* Results Breakdown */}
      {memorySearchResults.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs" style={{ color: '#8888aa' }}>
            {memorySearchResults.length} results
          </span>
          {Object.entries(breakdown).map(([type, count]) => (
            <span
              key={type}
              className="px-2 py-0.5 rounded-full text-[10px] capitalize"
              style={{
                background: 'rgba(157,78,221,0.1)',
                color: '#9d4edd',
              }}
            >
              {type}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {enrichedResults.map((result, i) => {
            const mem = result.memory!;
            return (
              <motion.div
                key={result.memoryId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard
                  glowColor={MEMORY_TYPE_COLORS[mem.type]}
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedMemoryId(mem.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-semibold text-white">
                          {highlightMatch(mem.title, query)}
                        </h4>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                          style={{
                            background: `${MEMORY_TYPE_COLORS[mem.type]}20`,
                            color: MEMORY_TYPE_COLORS[mem.type],
                          }}
                        >
                          {mem.type}
                        </span>
                        <span
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(0,255,255,0.1)',
                            color: '#00ffff',
                          }}
                        >
                          {result.score.toFixed(0)}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                          style={{
                            background: 'rgba(157,78,221,0.1)',
                            color: '#9d4edd',
                          }}
                        >
                          {result.searchType}
                        </span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: '#ccccdd' }}>
                        {highlightMatch(result.snippet || mem.summary, query)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="flex items-center gap-1 text-[10px]"
                          style={{ color: '#8888aa' }}
                        >
                          <FileText className="w-3 h-3" /> {mem.source}
                        </span>
                        <span
                          className="flex items-center gap-1 text-[10px] capitalize"
                          style={{ color: '#8888aa' }}
                        >
                          <Users className="w-3 h-3" /> {mem.agentId}
                        </span>
                        {mem.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(157,78,221,0.08)',
                              color: '#9d4edd',
                            }}
                          >
                            <Hash className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 mt-1" style={{ color: '#8888aa' }} />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(157, 78, 221, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── 5. MemoryExtractor ───

function MemoryExtractor() {
  const { memoryExtractions, addExtraction, confirmExtraction, rejectExtraction, addMemory, addTimelineEvent } =
    useMemoryStore();
  const [sourceType, setSourceType] = useState<MemorySource>('chat');
  const [content, setContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const sourceTypes: MemorySource[] = ['chat', 'file', 'meeting', 'email', 'website', 'pdf', 'document'];
  const sourceIcons: Record<string, React.ReactNode> = {
    chat: <MessageSquare className="w-4 h-4" />,
    file: <File className="w-4 h-4" />,
    meeting: <Users className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    website: <Globe className="w-4 h-4" />,
    pdf: <FileText className="w-4 h-4" />,
    document: <BookOpen className="w-4 h-4" />,
  };

  const handleExtract = useCallback(() => {
    if (!content.trim()) return;
    setIsExtracting(true);

    // Simulate extraction with a brief delay
    setTimeout(() => {
      const extractTypes: ExtractedType[] = ['fact', 'task', 'preference', 'goal', 'contact', 'company', 'requirement', 'decision'];
      const randomType = extractTypes[Math.floor(Math.random() * extractTypes.length)];
      const confidence = 0.7 + Math.random() * 0.25;

      const extraction: MemoryExtraction = {
        id: `ext-${Date.now()}`,
        sourceType,
        sourceContent: content,
        sourceId: `source-${Date.now()}`,
        extractedType: randomType,
        extractedContent: `Extracted ${randomType}: ${content.slice(0, 100)}...`,
        confidence: Math.round(confidence * 100) / 100,
        status: 'pending',
        agentId: 'vault',
        createdAt: Date.now(),
      };

      addExtraction(extraction);
      setContent('');
      setIsExtracting(false);
    }, 1200);
  }, [content, sourceType, addExtraction]);

  const handleConfirm = useCallback(
    (id: string) => {
      confirmExtraction(id);
      const ext = memoryExtractions.find((e) => e.id === id);
      if (ext) {
        // Create a memory entry from the extraction
        const memoryTypes: MemoryType[] = ['long-term', 'short-term', 'semantic', 'context', 'episodic'];
        const newMemory: MemoryNode = {
          id: `mem-ext-${Date.now()}`,
          type: memoryTypes[Math.floor(Math.random() * memoryTypes.length)],
          title: ext.extractedContent.slice(0, 60),
          content: ext.extractedContent,
          summary: ext.extractedContent.slice(0, 120),
          source: ext.sourceType as MemorySource,
          sourceId: ext.sourceId,
          tags: [ext.extractedType, 'extracted'],
          concepts: [ext.extractedType],
          confidence: ext.confidence,
          importance: 0.7,
          accessCount: 0,
          agentId: ext.agentId,
          agentAccess: ['claude', 'openclaw', 'hermes', 'vault'],
          projectId: '',
          teamId: '',
          userId: 'user-1',
          vectorEmbedding: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastReferencedAt: Date.now(),
          metadata: { extractionId: ext.id },
        };
        addMemory(newMemory);
        addTimelineEvent({
          id: `tl-ext-${Date.now()}`,
          memoryId: newMemory.id,
          eventType: 'extracted',
          agentId: 'vault',
          description: `Extracted ${ext.extractedType} from ${ext.sourceType}`,
          metadata: { extractionId: ext.id },
          createdAt: Date.now(),
        });
      }
    },
    [confirmExtraction, memoryExtractions, addMemory, addTimelineEvent]
  );

  const handleReject = useCallback(
    (id: string) => {
      rejectExtraction(id);
    },
    [rejectExtraction]
  );

  const pendingExtractions = useMemo(
    () => memoryExtractions.filter((e) => e.status === 'pending'),
    [memoryExtractions]
  );

  const otherExtractions = useMemo(
    () => memoryExtractions.filter((e) => e.status !== 'pending'),
    [memoryExtractions]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" style={{ color: '#FFB627' }} />
        <h3 className="text-lg font-bold text-white">Memory Extractor</h3>
      </div>

      {/* Input Area */}
      <GlassCard glowColor="#FFB627" className="p-4 space-y-4">
        {/* Source Type Selector */}
        <div>
          <label className="text-xs block mb-2" style={{ color: '#8888aa' }}>
            Source Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {sourceTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSourceType(type)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                style={{
                  background: sourceType === type ? 'rgba(255,182,39,0.15)' : 'rgba(18,18,42,0.4)',
                  color: sourceType === type ? '#FFB627' : '#8888aa',
                  border: `1px solid ${sourceType === type ? 'rgba(255,182,39,0.3)' : 'rgba(157,78,221,0.1)'}`,
                }}
              >
                {sourceIcons[type]}
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Content Input */}
        <div>
          <label className="text-xs block mb-2" style={{ color: '#8888aa' }}>
            Content to Extract
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste content here to extract memories..."
            rows={4}
            className="w-full p-3 rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-white text-sm placeholder-[#8888aa] focus:outline-none focus:border-[rgba(255,182,39,0.3)] resize-none"
          />
        </div>

        {/* Extract Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExtract}
          disabled={!content.trim() || isExtracting}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: content.trim() && !isExtracting
              ? 'linear-gradient(135deg, #FFB627, #E8751A)'
              : 'rgba(18,18,42,0.6)',
            color: content.trim() && !isExtracting ? '#0a0a1a' : '#8888aa',
            border: `1px solid ${content.trim() && !isExtracting ? 'rgba(255,182,39,0.5)' : 'rgba(157,78,221,0.15)'}`,
            boxShadow: content.trim() && !isExtracting ? '0 0 20px rgba(255,182,39,0.2)' : 'none',
          }}
        >
          {isExtracting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Extract Memories
            </>
          )}
        </motion.button>
      </GlassCard>

      {/* Pending Extractions */}
      {pendingExtractions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-2" style={{ color: '#FFB627' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            Pending Review ({pendingExtractions.length})
          </h4>
          {pendingExtractions.map((ext) => (
            <motion.div
              key={ext.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard glowColor="#FFB627" className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                        style={{
                          background: `${EXTRACTION_STATUS_COLORS[ext.status]}20`,
                          color: EXTRACTION_STATUS_COLORS[ext.status],
                        }}
                      >
                        {ext.status}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                        style={{
                          background: 'rgba(157,78,221,0.1)',
                          color: '#9d4edd',
                        }}
                      >
                        {ext.extractedType}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: '#00ffff' }}>
                        {(ext.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-white">{ext.extractedContent}</p>
                    <p className="text-[10px] mt-1" style={{ color: '#8888aa' }}>
                      Source: {ext.sourceType} • {formatRelativeTime(ext.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleConfirm(ext.id)}
                      className="p-1.5 rounded-lg"
                      style={{
                        background: 'rgba(0,255,136,0.15)',
                        color: '#00ff88',
                        border: '1px solid rgba(0,255,136,0.2)',
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReject(ext.id)}
                      className="p-1.5 rounded-lg"
                      style={{
                        background: 'rgba(230,57,70,0.15)',
                        color: '#E63946',
                        border: '1px solid rgba(230,57,70,0.2)',
                      }}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Past Extractions */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold" style={{ color: '#8888aa' }}>
          Extraction History ({otherExtractions.length})
        </h4>
        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
          {otherExtractions.map((ext) => (
            <div key={ext.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[rgba(157,78,221,0.05)]">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${EXTRACTION_STATUS_COLORS[ext.status]}20`,
                  color: EXTRACTION_STATUS_COLORS[ext.status],
                }}
              >
                {ext.status === 'confirmed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{ext.extractedContent}</div>
                <div className="text-[10px]" style={{ color: '#8888aa' }}>
                  {ext.extractedType} • {(ext.confidence * 100).toFixed(0)}% • {formatRelativeTime(ext.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(157, 78, 221, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── 6. AgentMemorySharing ───

function AgentMemorySharing() {
  const { memories, memoryRelations, memoryTimeline } = useMemoryStore();
  const [agentAccess, setAgentAccess] = useState<Record<string, { read: boolean; write: boolean; admin: boolean }>>({
    claude: { read: true, write: true, admin: false },
    openclaw: { read: true, write: true, admin: true },
    hermes: { read: true, write: false, admin: false },
    vault: { read: true, write: true, admin: false },
  });

  const agents = useMemo(
    () => [
      {
        id: 'claude',
        name: 'Claude',
        color: '#E63946',
        icon: <Brain className="w-5 h-5" />,
        description: 'Cognitive Reasoning & Perception',
      },
      {
        id: 'openclaw',
        name: 'OpenClaw',
        color: '#E8751A',
        icon: <Shield className="w-5 h-5" />,
        description: 'Orchestration & Governance',
      },
      {
        id: 'hermes',
        name: 'Hermes',
        color: '#FFB627',
        icon: <Zap className="w-5 h-5" />,
        description: 'Research & Execution',
      },
      {
        id: 'vault',
        name: 'Self Vault',
        color: '#2E86AB',
        icon: <Database className="w-5 h-5" />,
        description: 'Memory & Personalization',
      },
    ],
    []
  );

  const agentStats = useMemo(() => {
    const stats: Record<string, { read: number; write: number; update: number; reference: number }> = {};
    for (const agent of agents) {
      const agentMems = memories.filter((m) => m.agentId === agent.id);
      const agentEvents = memoryTimeline.filter((e) => e.agentId === agent.id);
      stats[agent.id] = {
        read: agentEvents.filter((e) => e.eventType === 'referenced').length,
        write: agentEvents.filter((e) => e.eventType === 'created').length,
        update: agentEvents.filter((e) => e.eventType === 'updated').length,
        reference: agentMems.reduce((sum, m) => sum + m.accessCount, 0),
      };
    }
    return stats;
  }, [memories, memoryTimeline, agents]);

  const memoryTypes: MemoryType[] = [
    'long-term',
    'short-term',
    'episodic',
    'semantic',
    'context',
    'project',
    'user',
    'team',
    'conversation',
  ];

  const accessMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const agent of agents) {
      matrix[agent.id] = {};
      for (const type of memoryTypes) {
        const agentMems = memories.filter(
          (m) => m.type === type && m.agentAccess.includes(agent.id)
        );
        matrix[agent.id][type] = agentMems.length > 0;
      }
    }
    return matrix;
  }, [memories, agents]);

  const sharedMemories = useMemo(
    () =>
      memories
        .filter((m) => m.agentAccess.length > 2)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    [memories]
  );

  const toggleAccess = useCallback(
    (agentId: string, permission: 'read' | 'write' | 'admin') => {
      setAgentAccess((prev) => ({
        ...prev,
        [agentId]: {
          ...prev[agentId],
          [permission]: !prev[agentId]?.[permission],
        },
      }));
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" style={{ color: '#9d4edd' }} />
        <h3 className="text-lg font-bold text-white">Agent Memory Sharing</h3>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard glowColor={agent.color} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${agent.color}20`,
                    color: agent.color,
                  }}
                >
                  {agent.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{agent.name}</div>
                  <div className="text-[10px]" style={{ color: '#8888aa' }}>
                    {agent.description}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['read', 'write', 'update', 'reference'] as const).map((action) => (
                  <div key={action} className="text-center">
                    <div
                      className="font-mono text-lg font-bold"
                      style={{ color: agent.color }}
                    >
                      {agentStats[agent.id]?.[action] || 0}
                    </div>
                    <div className="text-[10px] capitalize" style={{ color: '#8888aa' }}>
                      {action}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Access Matrix */}
      <GlassCard className="p-4 overflow-x-auto">
        <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" style={{ color: '#9d4edd' }} />
          Memory Access Matrix
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-2" style={{ color: '#8888aa' }}>
                Agent
              </th>
              {memoryTypes.map((type) => (
                <th
                  key={type}
                  className="text-center py-1.5 px-1 capitalize"
                  style={{ color: MEMORY_TYPE_COLORS[type], fontSize: '9px' }}
                >
                  {type.split('-')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td className="py-1.5 px-2" style={{ color: agent.color }}>
                  {agent.name}
                </td>
                {memoryTypes.map((type) => (
                  <td key={type} className="text-center py-1.5 px-1">
                    <div
                      className="w-4 h-4 rounded mx-auto"
                      style={{
                        background: accessMatrix[agent.id]?.[type]
                          ? `${agent.color}40`
                          : 'rgba(18,18,42,0.3)',
                        border: `1px solid ${accessMatrix[agent.id]?.[type] ? agent.color + '60' : 'rgba(157,78,221,0.1)'}`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {/* Access Controls */}
      <GlassCard className="p-4">
        <h4 className="text-xs font-semibold text-white mb-3">Access Controls</h4>
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${agent.color}20`,
                  color: agent.color,
                }}
              >
                {agent.icon}
              </div>
              <span className="text-xs text-white w-20 shrink-0">{agent.name}</span>
              <div className="flex gap-2">
                {(['read', 'write', 'admin'] as const).map((perm) => (
                  <button
                    key={perm}
                    onClick={() => toggleAccess(agent.id, perm)}
                    className="px-2.5 py-1 rounded-lg text-[10px] capitalize transition-all"
                    style={{
                      background: agentAccess[agent.id]?.[perm]
                        ? `${agent.color}25`
                        : 'rgba(18,18,42,0.3)',
                      color: agentAccess[agent.id]?.[perm] ? agent.color : '#8888aa',
                      border: `1px solid ${agentAccess[agent.id]?.[perm] ? agent.color + '40' : 'rgba(157,78,221,0.1)'}`,
                    }}
                  >
                    {perm}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Shared Memories */}
      <GlassCard className="p-4">
        <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5" style={{ color: '#00ff88' }} />
          Recently Shared
        </h4>
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
          {sharedMemories.map((mem) => (
            <div
              key={mem.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(157,78,221,0.05)]"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: MEMORY_TYPE_COLORS[mem.type],
                  boxShadow: `0 0 6px ${MEMORY_TYPE_COLORS[mem.type]}60`,
                }}
              />
              <span className="text-xs text-white flex-1 truncate">{mem.title}</span>
              <div className="flex -space-x-1">
                {mem.agentAccess.map((a) => {
                  const ag = agents.find((ag) => ag.id === a);
                  return ag ? (
                    <div
                      key={a}
                      className="w-5 h-5 rounded-full border border-[#0a0a1a] flex items-center justify-center"
                      style={{ background: `${ag.color}30`, color: ag.color }}
                      title={ag.name}
                    >
                      <span className="text-[8px] font-bold">{ag.name[0]}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(157, 78, 221, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── 7. RelationshipEngine ───

function RelationshipEngine() {
  const { memories, memoryRelations, addMemoryRelation } = useMemoryStore();
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const entityTypes = [
    { id: 'people', label: 'People', icon: <Users className="w-4 h-4" />, color: '#E63946' },
    { id: 'companies', label: 'Companies', icon: <Globe className="w-4 h-4" />, color: '#FFB627' },
    { id: 'tasks', label: 'Tasks', icon: <Zap className="w-4 h-4" />, color: '#E8751A' },
    { id: 'projects', label: 'Projects', icon: <BarChart3 className="w-4 h-4" />, color: '#7B2CBF' },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" />, color: '#1B998B' },
    { id: 'conversations', label: 'Conversations', icon: <MessageSquare className="w-4 h-4" />, color: '#D62828' },
  ];

  const entityData: Record<string, { name: string; relations: { target: string; type: string }[] }[]> = useMemo(() => {
    return {
      people: [
        { name: 'Claude Agent', relations: [{ target: 'OpenClaw', type: 'coordinates_with' }, { target: 'Agent OS v2.0', type: 'works_on' }] },
        { name: 'Hermes Agent', relations: [{ target: 'Browserbase', type: 'uses' }, { target: 'Agent OS v2.0', type: 'works_on' }] },
        { name: 'Sarah (Browserbase)', relations: [{ target: 'Hermes Agent', type: 'contact_for' }] },
      ],
      companies: [
        { name: 'Agentic Inc.', relations: [{ target: 'Agent OS v2.0', type: 'owns' }] },
        { name: 'Browserbase', relations: [{ target: 'Hermes Agent', type: 'provides_service' }] },
        { name: 'AutoGPT', relations: [{ target: 'Competitor Analysis', type: 'competitor' }] },
        { name: 'CrewAI', relations: [{ target: 'Competitor Analysis', type: 'competitor' }] },
      ],
      tasks: [
        { name: 'Deploy Hermes v3.2', relations: [{ target: 'Agent OS v2.0', type: 'part_of' }] },
        { name: 'Cross-agent sharing', relations: [{ target: 'Agent OS v2.0', type: 'part_of' }] },
        { name: 'Optimize vault latency', relations: [{ target: 'Self Vault', type: 'owned_by' }] },
      ],
      projects: [
        { name: 'Agent OS v2.0', relations: [{ target: 'Agentic Inc.', type: 'owned_by' }, { target: 'Claude Agent', type: 'contributor' }] },
      ],
      documents: [
        { name: 'Hermes Config', relations: [{ target: 'Hermes Agent', type: 'configures' }] },
        { name: 'Comm Protocol v2.1', relations: [{ target: 'OpenClaw', type: 'defines' }] },
        { name: 'Memory Sharing Design', relations: [{ target: 'Agent OS v2.0', type: 'part_of' }] },
      ],
      conversations: [
        { name: 'MCP Integration', relations: [{ target: 'Hermes Agent', type: 'involved' }] },
        { name: 'Competitor Analysis', relations: [{ target: 'Hermes Agent', type: 'initiated_by' }] },
        { name: 'Vision Pipeline Upgrade', relations: [{ target: 'Claude Agent', type: 'initiated_by' }] },
      ],
    };
  }, []);

  const handleGenerateLinks = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      // Simulate generating new relationships
      const relationTypes: RelationType[] = ['relates_to', 'depends_on', 'supports', 'references'];
      const randomType = relationTypes[Math.floor(Math.random() * relationTypes.length)];
      const newRelation: MemoryRelation = {
        id: `rel-gen-${Date.now()}`,
        sourceId: memories[Math.floor(Math.random() * memories.length)]?.id || 'mem-001',
        targetId: memories[Math.floor(Math.random() * memories.length)]?.id || 'mem-002',
        relationType: randomType,
        strength: 0.5 + Math.random() * 0.4,
        autoGenerated: true,
        createdAt: Date.now(),
      };
      addMemoryRelation(newRelation);
      setIsGenerating(false);
    }, 2000);
  }, [memories, addMemoryRelation]);

  const selectedData = selectedEntityType ? entityData[selectedEntityType] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5" style={{ color: '#00ff88' }} />
          <h3 className="text-lg font-bold text-white">Relationship Engine</h3>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{ color: '#8888aa', background: 'rgba(0,255,136,0.1)' }}>
            {memoryRelations.length} links
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateLinks}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: isGenerating ? 'rgba(18,18,42,0.6)' : 'linear-gradient(135deg, #00ff88, #1B998B)',
            color: isGenerating ? '#8888aa' : '#0a0a1a',
            border: `1px solid ${isGenerating ? 'rgba(157,78,221,0.15)' : 'rgba(0,255,136,0.3)'}`,
            boxShadow: isGenerating ? 'none' : '0 0 15px rgba(0,255,136,0.2)',
          }}
        >
          {isGenerating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </motion.div>
              Scanning...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate Links
            </>
          )}
        </motion.button>
      </div>

      {/* Entity Types */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {entityTypes.map((entity, i) => (
          <motion.div
            key={entity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard
              glowColor={selectedEntityType === entity.id ? entity.color : undefined}
              className="p-3 text-center cursor-pointer"
              onClick={() => setSelectedEntityType(selectedEntityType === entity.id ? null : entity.id)}
            >
              <div
                className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center"
                style={{
                  background: `${entity.color}20`,
                  color: entity.color,
                }}
              >
                {entity.icon}
              </div>
              <div className="text-xs" style={{ color: selectedEntityType === entity.id ? entity.color : '#8888aa' }}>
                {entity.label}
              </div>
              <div className="font-mono text-xs font-bold" style={{ color: entity.color }}>
                {entityData[entity.id]?.length || 0}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Entity Details */}
      <AnimatePresence>
        {selectedData && selectedEntityType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                {entityTypes.find((e) => e.id === selectedEntityType)?.icon}
                {entityTypes.find((e) => e.id === selectedEntityType)?.label} Entities
              </h4>
              <div className="space-y-2">
                {selectedData.map((entity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.3)]"
                  >
                    <div className="text-xs font-semibold text-white mb-2">{entity.name}</div>
                    <div className="space-y-1">
                      {entity.relations.map((rel, j) => (
                        <div key={j} className="flex items-center gap-2 text-[10px]">
                          <span style={{ color: '#8888aa' }}>{entity.name}</span>
                          <ArrowRight className="w-3 h-3" style={{ color: '#9d4edd' }} />
                          <span style={{ color: '#9d4edd' }}>{rel.type.replace(/_/g, ' ')}</span>
                          <ArrowRight className="w-3 h-3" style={{ color: '#9d4edd' }} />
                          <span style={{ color: '#00ffff' }}>{rel.target}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Relations */}
      <GlassCard className="p-4">
        <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5" style={{ color: '#9d4edd' }} />
          Auto-Generated Relations
        </h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {memoryRelations
            .filter((r) => r.autoGenerated)
            .slice(0, 8)
            .map((rel) => {
              const src = memories.find((m) => m.id === rel.sourceId);
              const tgt = memories.find((m) => m.id === rel.targetId);
              return (
                <div
                  key={rel.id}
                  className="flex items-center gap-2 text-[10px] p-1.5 rounded-lg hover:bg-[rgba(157,78,221,0.05)]"
                >
                  <span className="text-white truncate max-w-28">{src?.title || rel.sourceId}</span>
                  <span style={{ color: '#9d4edd' }}>{rel.relationType.replace(/_/g, ' ')}</span>
                  <span className="text-white truncate max-w-28">{tgt?.title || rel.targetId}</span>
                  <span className="font-mono ml-auto" style={{ color: '#8888aa' }}>
                    {(rel.strength * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
        </div>
      </GlassCard>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 42, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(157, 78, 221, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── 8. MemoryDetail ───

function MemoryDetail() {
  const { selectedMemoryId, setSelectedMemoryId, memories, memoryRelations, memoryTimeline } =
    useMemoryStore();

  const memory = useMemo(
    () => memories.find((m) => m.id === selectedMemoryId),
    [memories, selectedMemoryId]
  );

  const relatedMemories = useMemo(() => {
    if (!memory) return [];
    const rels = memoryRelations.filter(
      (r) => r.sourceId === memory.id || r.targetId === memory.id
    );
    return rels.map((r) => {
      const relatedId = r.sourceId === memory.id ? r.targetId : r.sourceId;
      const relatedMem = memories.find((m) => m.id === relatedId);
      return { relation: r, memory: relatedMem };
    }).filter((r) => r.memory);
  }, [memory, memoryRelations, memories]);

  const memoryTimeline_events = useMemo(() => {
    if (!memory) return [];
    return memoryTimeline
      .filter((e) => e.memoryId === memory.id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [memory, memoryTimeline]);

  if (!memory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Eye className="w-10 h-10 mx-auto mb-3" style={{ color: '#8888aa' }} />
          <p className="text-sm" style={{ color: '#8888aa' }}>
            Select a memory to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key={memory.id}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2 py-0.5 rounded text-xs capitalize"
                style={{
                  background: `${MEMORY_TYPE_COLORS[memory.type]}20`,
                  color: MEMORY_TYPE_COLORS[memory.type],
                }}
              >
                {memory.type}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs capitalize"
                style={{
                  background: 'rgba(157,78,221,0.1)',
                  color: '#9d4edd',
                }}
              >
                {memory.source}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs capitalize"
                style={{
                  background: 'rgba(232,117,26,0.1)',
                  color: '#E8751A',
                }}
              >
                {memory.agentId}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{memory.title}</h3>
          </div>
          <button
            onClick={() => setSelectedMemoryId(null)}
            className="p-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] hover:bg-[rgba(157,78,221,0.1)] transition-colors"
          >
            <X className="w-4 h-4" style={{ color: '#8888aa' }} />
          </button>
        </div>

        {/* Content */}
        <GlassCard glowColor={MEMORY_TYPE_COLORS[memory.type]} className="p-4">
          <p className="text-sm leading-relaxed" style={{ color: '#ccccdd' }}>
            {memory.content}
          </p>
        </GlassCard>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="p-3 text-center">
            <div className="font-mono text-lg font-bold" style={{ color: '#00ffff' }}>
              {(memory.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-[10px]" style={{ color: '#8888aa' }}>
              Confidence
            </div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="font-mono text-lg font-bold" style={{ color: '#00ff88' }}>
              {(memory.importance * 100).toFixed(0)}%
            </div>
            <div className="text-[10px]" style={{ color: '#8888aa' }}>
              Importance
            </div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="font-mono text-lg font-bold" style={{ color: '#FFB627' }}>
              {memory.accessCount}
            </div>
            <div className="text-[10px]" style={{ color: '#8888aa' }}>
              Access Count
            </div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="font-mono text-lg font-bold" style={{ color: '#9d4edd' }}>
              {formatRelativeTime(memory.createdAt)}
            </div>
            <div className="text-[10px]" style={{ color: '#8888aa' }}>
              Created
            </div>
          </GlassCard>
        </div>

        {/* Tags & Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <GlassCard className="p-3">
            <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" style={{ color: '#9d4edd' }} />
              Tags
            </div>
            <div className="flex flex-wrap gap-1.5">
              {memory.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{
                    background: 'rgba(157,78,221,0.1)',
                    color: '#9d4edd',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" style={{ color: '#00ffff' }} />
              Concepts
            </div>
            <div className="flex flex-wrap gap-1.5">
              {memory.concepts.map((concept) => (
                <span
                  key={concept}
                  className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{
                    background: 'rgba(0,255,255,0.1)',
                    color: '#00ffff',
                  }}
                >
                  {concept}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Agent Access */}
        <GlassCard className="p-3">
          <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: '#E8751A' }} />
            Agent Access
          </div>
          <div className="flex flex-wrap gap-2">
            {memory.agentAccess.map((agent) => {
              const agentColors: Record<string, string> = {
                claude: '#E63946',
                openclaw: '#E8751A',
                hermes: '#FFB627',
                vault: '#2E86AB',
              };
              const agentIcons: Record<string, React.ReactNode> = {
                claude: <Brain className="w-3 h-3" />,
                openclaw: <Shield className="w-3 h-3" />,
                hermes: <Zap className="w-3 h-3" />,
                vault: <Database className="w-3 h-3" />,
              };
              return (
                <span
                  key={agent}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] capitalize"
                  style={{
                    background: `${agentColors[agent] || '#8888aa'}15`,
                    color: agentColors[agent] || '#8888aa',
                    border: `1px solid ${agentColors[agent] || '#8888aa'}25`,
                  }}
                >
                  {agentIcons[agent]}
                  {agent}
                </span>
              );
            })}
          </div>
        </GlassCard>

        {/* Related Memories */}
        {relatedMemories.length > 0 && (
          <GlassCard className="p-3">
            <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" style={{ color: '#00ff88' }} />
              Related Memories
            </div>
            <div className="space-y-1.5">
              {relatedMemories.map(({ relation, memory: relMem }) => (
                <div
                  key={relation.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(157,78,221,0.05)] cursor-pointer"
                  onClick={() => setSelectedMemoryId(relMem!.id)}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: MEMORY_TYPE_COLORS[relMem!.type],
                      boxShadow: `0 0 4px ${MEMORY_TYPE_COLORS[relMem!.type]}60`,
                    }}
                  />
                  <span className="text-xs text-white flex-1 truncate">{relMem!.title}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                    style={{
                      background: 'rgba(157,78,221,0.1)',
                      color: '#9d4edd',
                    }}
                  >
                    {relation.relationType.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: '#8888aa' }}>
                    {(relation.strength * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Timeline for this memory */}
        {memoryTimeline_events.length > 0 && (
          <GlassCard className="p-3">
            <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" style={{ color: '#FFB627' }} />
              Memory Timeline
            </div>
            <div className="space-y-1.5">
              {memoryTimeline_events.map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-[10px]">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: EVENT_COLORS[event.eventType],
                      boxShadow: `0 0 4px ${EVENT_COLORS[event.eventType]}60`,
                    }}
                  />
                  <span style={{ color: EVENT_COLORS[event.eventType] }} className="capitalize">
                    {event.eventType}
                  </span>
                  <span style={{ color: '#ccccdd' }}>{event.description}</span>
                  <span className="ml-auto font-mono" style={{ color: '#8888aa' }}>
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Edit Metadata */}
        <GlassCard className="p-3">
          <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" style={{ color: '#8888aa' }} />
            Metadata
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {Object.entries(memory.metadata).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span style={{ color: '#8888aa' }}>{key}:</span>
                <span className="font-mono text-white">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span style={{ color: '#8888aa' }}>projectId:</span>
              <span className="font-mono text-white">{memory.projectId || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#8888aa' }}>teamId:</span>
              <span className="font-mono text-white">{memory.teamId || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#8888aa' }}>created:</span>
              <span className="font-mono text-white">{formatDate(memory.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#8888aa' }}>updated:</span>
              <span className="font-mono text-white">{formatDate(memory.updatedAt)}</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Exports ───

export {
  MemoryEngineDashboard,
  MemoryGraph,
  MemoryTimeline,
  MemorySearch,
  MemoryExtractor,
  AgentMemorySharing,
  RelationshipEngine,
  MemoryDetail,
};
