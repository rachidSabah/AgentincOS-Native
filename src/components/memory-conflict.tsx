'use client';

import { useMemoryStore, type MemoryNode } from '@/lib/memory-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, GitMerge, Eye, CheckCircle, XCircle,
  ArrowRightLeft, Clock, Shield, Brain, Sparkles,
  ChevronDown, ChevronUp, Scale, AlertCircle, Copy,
  ThumbsUp, ThumbsDown, MinusCircle, History,
} from 'lucide-react';
import { useState, useCallback } from 'react';

/* ─── Constants ─── */
const AGENT_COLORS: Record<string, string> = {
  claude: '#E63946',
  hermes: '#FFB627',
  openclaw: '#E8751A',
  vault: '#2E86AB',
};

const AGENT_NAMES: Record<string, string> = {
  claude: 'Claude',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
  vault: 'Vault',
};

type ResolutionOption = 'keep-both' | 'merge' | 'prefer-a' | 'prefer-b' | 'unresolvable';
type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

const RESOLUTION_META: Record<ResolutionOption, { label: string; color: string; icon: typeof GitMerge; desc: string }> = {
  'keep-both': { label: 'Keep Both', color: '#7B2CBF', icon: Copy, desc: 'Retain both memories with conflict flag' },
  'merge': { label: 'Merge', color: '#00ffff', icon: GitMerge, desc: 'Intelligently combine both memories' },
  'prefer-a': { label: 'Prefer A', color: '#00ff88', icon: ThumbsUp, desc: 'Keep memory A, archive memory B' },
  'prefer-b': { label: 'Prefer B', color: '#FFB627', icon: ThumbsUp, desc: 'Keep memory B, archive memory A' },
  'unresolvable': { label: 'Unresolvable', color: '#E63946', icon: AlertCircle, desc: 'Mark as requiring human review' },
};

/* ─── Types ─── */
interface ConflictEntry {
  id: string;
  memoryA: {
    id: string;
    agentId: string;
    content: string;
    confidence: number;
    timestamp: number;
    source: string;
  };
  memoryB: {
    id: string;
    agentId: string;
    content: string;
    confidence: number;
    timestamp: number;
    source: string;
  };
  topic: string;
  detectionScore: number; // 0-1, how likely a real conflict exists
  severity: ConflictSeverity;
  resolved: boolean;
  resolution?: ResolutionOption;
  resolvedBy?: string;
  resolvedAt?: number;
}

interface ResolutionHistoryEntry {
  id: string;
  topic: string;
  agentA: string;
  agentB: string;
  resolution: ResolutionOption;
  resolvedBy: string;
  resolvedAt: number;
}

/* ─── Mock Data ─── */
const MOCK_CONFLICTS: ConflictEntry[] = [
  {
    id: 'conf1',
    memoryA: {
      id: 'mem-a1',
      agentId: 'hermes',
      content: 'Browser pool supports 8 concurrent sessions for web research tasks. This was verified during stress testing last week.',
      confidence: 0.87,
      timestamp: Date.now() - 86400000,
      source: 'chat',
    },
    memoryB: {
      id: 'mem-b1',
      agentId: 'hermes',
      content: 'Browser pool limit is 5 concurrent sessions. Browserbase enterprise plan caps at 5 sessions per account.',
      confidence: 0.95,
      timestamp: Date.now() - 259200000,
      source: 'file',
    },
    topic: 'Browser session limit',
    detectionScore: 0.92,
    severity: 'high',
    resolved: false,
  },
  {
    id: 'conf2',
    memoryA: {
      id: 'mem-a2',
      agentId: 'claude',
      content: 'MCMC sampling improves reasoning quality by 35% on multi-step problems. Use for all complex reasoning tasks.',
      confidence: 0.91,
      timestamp: Date.now() - 172800000,
      source: 'file',
    },
    memoryB: {
      id: 'mem-b2',
      agentId: 'openclaw',
      content: 'MCMC mode should only be used for complex reasoning — simple queries waste tokens at 3x cost with minimal benefit.',
      confidence: 0.88,
      timestamp: Date.now() - 43200000,
      source: 'chat',
    },
    topic: 'MCMC usage policy',
    detectionScore: 0.65,
    severity: 'medium',
    resolved: false,
  },
  {
    id: 'conf3',
    memoryA: {
      id: 'mem-a3',
      agentId: 'openclaw',
      content: 'All agent routing must go through OpenClaw. No direct agent-to-agent communication is permitted under any circumstances.',
      confidence: 0.97,
      timestamp: Date.now() - 864000000,
      source: 'document',
    },
    memoryB: {
      id: 'mem-b3',
      agentId: 'hermes',
      content: 'Hermes can communicate directly with Vault for memory retrieval operations without routing through OpenClaw.',
      confidence: 0.78,
      timestamp: Date.now() - 3600000,
      source: 'chat',
    },
    topic: 'Agent communication protocol',
    detectionScore: 0.88,
    severity: 'critical',
    resolved: false,
  },
  {
    id: 'conf4',
    memoryA: {
      id: 'mem-a4',
      agentId: 'vault',
      content: 'Auto-pruning runs weekly for entries older than 90 days with accessCount < 2. This keeps the vault performant.',
      confidence: 0.96,
      timestamp: Date.now() - 1209600000,
      source: 'file',
    },
    memoryB: {
      id: 'mem-b4',
      agentId: 'claude',
      content: 'Important memories should never be auto-pruned regardless of access count. The 90-day threshold is too aggressive for insights.',
      confidence: 0.82,
      timestamp: Date.now() - 7200000,
      source: 'chat',
    },
    topic: 'Memory pruning policy',
    detectionScore: 0.71,
    severity: 'medium',
    resolved: false,
  },
];

const MOCK_HISTORY: ResolutionHistoryEntry[] = [
  {
    id: 'rh1',
    topic: 'Default LLM provider for research',
    agentA: 'claude',
    agentB: 'hermes',
    resolution: 'merge',
    resolvedBy: 'Claude',
    resolvedAt: Date.now() - 7200000,
  },
  {
    id: 'rh2',
    topic: 'Budget alert threshold',
    agentA: 'openclaw',
    agentB: 'hermes',
    resolution: 'prefer-b',
    resolvedBy: 'User',
    resolvedAt: Date.now() - 86400000,
  },
  {
    id: 'rh3',
    topic: 'Kanban task priority system',
    agentA: 'hermes',
    agentB: 'openclaw',
    resolution: 'keep-both',
    resolvedBy: 'OpenClaw',
    resolvedAt: Date.now() - 172800000,
  },
  {
    id: 'rh4',
    topic: 'Memory sharing permissions',
    agentA: 'vault',
    agentB: 'openclaw',
    resolution: 'unresolvable',
    resolvedBy: 'User',
    resolvedAt: Date.now() - 259200000,
  },
];

/* ─── Helpers ─── */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getSeverityColor(severity: ConflictSeverity): string {
  switch (severity) {
    case 'critical': return '#E63946';
    case 'high': return '#E8751A';
    case 'medium': return '#FFB627';
    case 'low': return '#2E86AB';
  }
}

function getDetectionColor(score: number): string {
  if (score >= 0.8) return '#E63946';
  if (score >= 0.6) return '#FFB627';
  if (score >= 0.4) return '#E8751A';
  return '#00ff88';
}

/* ═══════════════════════════════════════════════════════════
   CONFLICT CARD — Split View
   ═══════════════════════════════════════════════════════════ */
function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: ConflictEntry;
  onResolve: (conflictId: string, resolution: ResolutionOption) => void;
}) {
  const [showResolution, setShowResolution] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption | null>(null);
  const severityColor = getSeverityColor(conflict.severity);
  const detectionColor = getDetectionColor(conflict.detectionScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
      style={{ borderColor: conflict.resolved ? 'rgba(0,255,136,0.2)' : `${severityColor}25` }}
    >
      {/* Conflict header */}
      <div className="p-4 border-b border-[rgba(157,78,221,0.1)]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={12} style={{ color: severityColor }} />
              <h3 className="text-white text-xs font-semibold">{conflict.topic}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                style={{ backgroundColor: `${severityColor}12`, color: severityColor, border: `1px solid ${severityColor}25` }}
              >
                {conflict.severity}
              </span>
              <div className="flex items-center gap-1">
                <Eye size={8} className="text-[#8888aa]" />
                <span className="text-[8px] font-mono" style={{ color: detectionColor }}>
                  {(conflict.detectionScore * 100).toFixed(0)}% conflict
                </span>
              </div>
              {conflict.resolved && (
                <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-[rgba(0,255,136,0.12)] text-[#00ff88] border border-[rgba(0,255,136,0.25)]">
                  resolved
                </span>
              )}
            </div>
          </div>
          {!conflict.resolved && (
            <button
              onClick={() => setShowResolution(!showResolution)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium border border-[rgba(123,44,191,0.2)] bg-[rgba(123,44,191,0.08)] text-[#c084fc] hover:bg-[rgba(123,44,191,0.15)] transition-colors"
            >
              <Scale size={9} /> Resolve
            </button>
          )}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 divide-x divide-[rgba(157,78,221,0.1)]">
        {/* Memory A */}
        <div className="p-4 relative">
          {/* Red conflict indicator */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: AGENT_COLORS[conflict.memoryA.agentId] }}
            animate={conflict.resolved ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="pl-2">
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: AGENT_COLORS[conflict.memoryA.agentId], color: '#fff' }}
              >
                {(AGENT_NAMES[conflict.memoryA.agentId] || conflict.memoryA.agentId)[0]}
              </div>
              <span className="text-[10px] font-bold" style={{ color: AGENT_COLORS[conflict.memoryA.agentId] }}>
                {AGENT_NAMES[conflict.memoryA.agentId] || conflict.memoryA.agentId}
              </span>
              <span className="text-[8px] font-mono text-[#8888aa] ml-auto">
                {(conflict.memoryA.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[9px] text-[#ccccdd] leading-relaxed mb-2">{conflict.memoryA.content}</p>
            <div className="flex items-center gap-2 text-[8px] text-[#8888aa]">
              <span className="font-mono">{conflict.memoryA.source}</span>
              <span>·</span>
              <span>{timeAgo(conflict.memoryA.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Memory B */}
        <div className="p-4 relative">
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: AGENT_COLORS[conflict.memoryB.agentId] }}
            animate={conflict.resolved ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <div className="pr-2">
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: AGENT_COLORS[conflict.memoryB.agentId], color: '#fff' }}
              >
                {(AGENT_NAMES[conflict.memoryB.agentId] || conflict.memoryB.agentId)[0]}
              </div>
              <span className="text-[10px] font-bold" style={{ color: AGENT_COLORS[conflict.memoryB.agentId] }}>
                {AGENT_NAMES[conflict.memoryB.agentId] || conflict.memoryB.agentId}
              </span>
              <span className="text-[8px] font-mono text-[#8888aa] ml-auto">
                {(conflict.memoryB.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[9px] text-[#ccccdd] leading-relaxed mb-2">{conflict.memoryB.content}</p>
            <div className="flex items-center gap-2 text-[8px] text-[#8888aa]">
              <span className="font-mono">{conflict.memoryB.source}</span>
              <span>·</span>
              <span>{timeAgo(conflict.memoryB.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VS divider */}
      <div className="relative h-0 flex items-center justify-center">
        <div className="absolute bg-[#0a0a1a] px-2 py-0.5 rounded-full border border-[rgba(230,57,70,0.3)] z-10">
          <span className="text-[8px] font-bold text-[#E63946]">VS</span>
        </div>
      </div>

      {/* Resolution panel */}
      <AnimatePresence>
        {showResolution && !conflict.resolved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[rgba(157,78,221,0.1)] overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Resolution Options</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {(Object.entries(RESOLUTION_META) as [ResolutionOption, typeof RESOLUTION_META[ResolutionOption]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedResolution(key)}
                    className="text-left p-2.5 rounded-lg border text-[10px] transition-all"
                    style={{
                      borderColor: selectedResolution === key ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                      background: selectedResolution === key ? `${meta.color}10` : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <meta.icon size={10} style={{ color: selectedResolution === key ? meta.color : '#8888aa' }} />
                      <span className="font-bold" style={{ color: selectedResolution === key ? meta.color : '#ccc' }}>{meta.label}</span>
                    </div>
                    <p className="text-[8px] text-[#8888aa] leading-tight">{meta.desc}</p>
                  </button>
                ))}
              </div>

              {selectedResolution && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between pt-2 border-t border-[rgba(157,78,221,0.08)]"
                >
                  <span className="text-[9px] text-[#8888aa]">
                    Selected: <span className="font-bold" style={{ color: RESOLUTION_META[selectedResolution].color }}>{RESOLUTION_META[selectedResolution].label}</span>
                  </span>
                  <button
                    onClick={() => onResolve(conflict.id, selectedResolution)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold text-white transition-all"
                    style={{ background: `linear-gradient(135deg, ${RESOLUTION_META[selectedResolution].color}cc, ${RESOLUTION_META[selectedResolution].color}88)` }}
                  >
                    <CheckCircle size={10} /> Apply Resolution
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolved indicator */}
      {conflict.resolved && conflict.resolution && (
        <div className="p-3 bg-[rgba(0,255,136,0.03)] border-t border-[rgba(0,255,136,0.1)]">
          <div className="flex items-center gap-2">
            <CheckCircle size={10} className="text-[#00ff88]" />
            <span className="text-[9px] text-[#00ff88] font-medium">
              Resolved: {RESOLUTION_META[conflict.resolution].label}
            </span>
            {conflict.resolvedBy && (
              <span className="text-[8px] text-[#8888aa]">by {conflict.resolvedBy}</span>
            )}
            {conflict.resolvedAt && (
              <span className="text-[8px] text-[#8888aa] ml-auto">{timeAgo(conflict.resolvedAt)}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MEMORY CONFLICT RESOLUTION — Main Export
   ═══════════════════════════════════════════════════════════ */
export function MemoryConflict() {
  const { memories } = useMemoryStore();

  const [conflicts, setConflicts] = useState<ConflictEntry[]>(MOCK_CONFLICTS);
  const [history, setHistory] = useState<ResolutionHistoryEntry[]>(MOCK_HISTORY);
  const [showHistory, setShowHistory] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const handleResolve = useCallback((conflictId: string, resolution: ResolutionOption) => {
    setConflicts(prev => prev.map(c => {
      if (c.id !== conflictId) return c;
      return {
        ...c,
        resolved: true,
        resolution,
        resolvedBy: 'User',
        resolvedAt: Date.now(),
      };
    }));

    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict) {
      setHistory(prev => [{
        id: `rh${Date.now()}`,
        topic: conflict.topic,
        agentA: conflict.memoryA.agentId,
        agentB: conflict.memoryB.agentId,
        resolution,
        resolvedBy: 'User',
        resolvedAt: Date.now(),
      }, ...prev]);
    }
  }, [conflicts]);

  const filteredConflicts = conflicts.filter(c => {
    if (filter === 'unresolved') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const unresolvedCount = conflicts.filter(c => !c.resolved).length;
  const resolvedCount = conflicts.filter(c => c.resolved).length;
  const criticalCount = conflicts.filter(c => c.severity === 'critical' && !c.resolved).length;
  const avgDetectionScore = conflicts.length > 0
    ? conflicts.reduce((s, c) => s + c.detectionScore, 0) / conflicts.length
    : 0;

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#E63946]" />
          Memory Conflict Resolution
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[#E63946] font-mono font-bold text-sm">{unresolvedCount}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Conflicts</div>
            </div>
            <div className="text-center">
              <div className="text-[#00ff88] font-mono font-bold text-sm">{resolvedCount}</div>
              <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Resolved</div>
            </div>
            {criticalCount > 0 && (
              <div className="text-center">
                <div className="font-mono font-bold text-sm text-[#E63946] animate-pulse-glow">{criticalCount}</div>
                <div className="text-[9px] text-[#E63946] uppercase tracking-wider">Critical</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Auto-Detection Score Panel ─── */}
      <motion.div
        className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Brain size={11} className="text-[#7B2CBF]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Conflict Detection Engine</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-[rgba(230,57,70,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={10} className="text-[#E63946]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Detection Score</span>
            </div>
            <div className="text-white font-mono font-bold text-lg" style={{ color: getDetectionColor(avgDetectionScore) }}>
              {(avgDetectionScore * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-lg border border-[rgba(230,57,70,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={10} className="text-[#E8751A]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Critical</span>
            </div>
            <div className="text-[#E63946] font-mono font-bold text-lg">{criticalCount}</div>
          </div>
          <div className="rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle size={10} className="text-[#00ff88]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Resolution Rate</span>
            </div>
            <div className="text-[#00ff88] font-mono font-bold text-lg">
              {conflicts.length > 0 ? ((resolvedCount / conflicts.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="rounded-lg border border-[rgba(123,44,191,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <History size={10} className="text-[#7B2CBF]" />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">History</span>
            </div>
            <div className="text-[#7B2CBF] font-mono font-bold text-lg">{history.length}</div>
          </div>
        </div>
      </motion.div>

      {/* ─── Filter Tabs ─── */}
      <div className="flex items-center gap-2">
        {(['all', 'unresolved', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border capitalize"
            style={{
              borderColor: filter === f ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.1)',
              background: filter === f ? 'rgba(157,78,221,0.1)' : 'transparent',
              color: filter === f ? '#c084fc' : '#8888aa',
            }}
          >
            {f}
            {f === 'unresolved' && unresolvedCount > 0 && (
              <span className="ml-1 text-[8px] font-mono px-1 py-0.5 rounded-full bg-[rgba(230,57,70,0.15)] text-[#E63946]">{unresolvedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Conflict Cards ─── */}
      <div className="space-y-3">
        {filteredConflicts.length > 0 ? (
          filteredConflicts.map(conflict => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={handleResolve}
            />
          ))
        ) : (
          <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
            <Sparkles size={24} className="mx-auto text-[#00ff88] mb-2" />
            <p className="text-[#00ff88] text-xs font-medium">No conflicts detected</p>
            <p className="text-[#8888aa] text-[10px] mt-1">All memories are in agreement across agents</p>
          </div>
        )}
      </div>

      {/* ─── Resolution History ─── */}
      <motion.div
        className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 hover:bg-[rgba(157,78,221,0.04)] transition-colors"
        >
          <span className="text-white text-xs font-semibold flex items-center gap-1.5">
            <History size={12} className="text-[#7B2CBF]" /> Resolution History
            <span className="text-[9px] font-mono text-[#8888aa] ml-1">{history.length} entries</span>
          </span>
          {showHistory ? <ChevronUp size={14} className="text-[#8888aa]" /> : <ChevronDown size={14} className="text-[#8888aa]" />}
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4"
            >
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {history.map((entry, i) => {
                  const resolutionMeta = RESOLUTION_META[entry.resolution];
                  const agentAColor = AGENT_COLORS[entry.agentA] || '#8888aa';
                  const agentBColor = AGENT_COLORS[entry.agentB] || '#8888aa';
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[rgba(157,78,221,0.06)] transition-colors"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: resolutionMeta.color }}
                      />
                      <span className="text-[10px] text-white font-medium flex-1 min-w-0 truncate">
                        {entry.topic}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${agentAColor}12`, color: agentAColor }}>
                          {AGENT_NAMES[entry.agentA] || entry.agentA}
                        </span>
                        <ArrowRightLeft size={8} className="text-[#8888aa]" />
                        <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${agentBColor}12`, color: agentBColor }}>
                          {AGENT_NAMES[entry.agentB] || entry.agentB}
                        </span>
                      </div>
                      <span
                        className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0"
                        style={{ backgroundColor: `${resolutionMeta.color}12`, color: resolutionMeta.color }}
                      >
                        {resolutionMeta.label}
                      </span>
                      <span className="text-[8px] text-[#8888aa] font-mono flex-shrink-0">{entry.resolvedBy}</span>
                      <span className="text-[8px] text-[#8888aa] flex-shrink-0">{timeAgo(entry.resolvedAt)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
