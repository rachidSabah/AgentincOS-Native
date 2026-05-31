'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Cloud, CloudOff, HardDrive, Laptop, Smartphone, Tablet,
  RefreshCw, Download, Upload, Lock, Unlock, Link2, GitBranch,
  Database, Shield, Check, AlertCircle, Zap, Brain, Layers,
  Activity, ChevronRight, Eye, Wifi, Server, Cpu, Globe,
  ArrowRightLeft, Copy, FileJson, Trash2, Plus,
} from 'lucide-react';
import { useState, useCallback } from 'react';

/* ─── Types ─── */
interface Session {
  id: string;
  title: string;
  timestamp: string;
  agent: string;
  messageCount: number;
  memoryCount: number;
  status: 'active' | 'archived' | 'synced';
  color: string;
}

interface SyncDevice {
  id: string;
  name: string;
  type: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'server';
  lastSync: string;
  status: 'synced' | 'syncing' | 'offline' | 'conflict';
  memorySize: string;
  icon: typeof Laptop;
}

interface MemoryNode {
  id: string;
  sessionId: string;
  label: string;
  type: 'fact' | 'preference' | 'context' | 'skill';
  synced: boolean;
  encrypted: boolean;
}

/* ─── Mock Data ─── */
const SESSIONS: Session[] = [
  { id: 's1', title: 'RAG Pipeline Architecture', timestamp: '2 min ago', agent: 'Claude', messageCount: 47, memoryCount: 12, status: 'active', color: '#E63946' },
  { id: 's2', title: 'Hermes MCP Integration', timestamp: '1h ago', agent: 'Hermes', messageCount: 32, memoryCount: 8, status: 'synced', color: '#FFB627' },
  { id: 's3', title: 'Swarm Consensus Protocol', timestamp: '3h ago', agent: 'OpenClaw', messageCount: 56, memoryCount: 15, status: 'synced', color: '#E8751A' },
  { id: 's4', title: 'Vault Memory Compaction', timestamp: 'Yesterday', agent: 'Vault', messageCount: 23, memoryCount: 6, status: 'archived', color: '#2E86AB' },
  { id: 's5', title: 'Cost Optimization Sprint', timestamp: '2 days ago', agent: 'Hermes', messageCount: 41, memoryCount: 9, status: 'synced', color: '#FFB627' },
  { id: 's6', title: 'Security Audit Review', timestamp: '3 days ago', agent: 'OpenClaw', messageCount: 28, memoryCount: 7, status: 'archived', color: '#E8751A' },
];

const DEVICES: SyncDevice[] = [
  { id: 'd1', name: 'MacBook Pro', type: 'laptop', lastSync: '2s ago', status: 'synced', memorySize: '2.4 GB', icon: Laptop },
  { id: 'd2', name: 'Home Server', type: 'server', lastSync: '5m ago', status: 'syncing', memorySize: '2.4 GB', icon: Server },
  { id: 'd3', name: 'iPhone 16 Pro', type: 'mobile', lastSync: '1h ago', status: 'synced', memorySize: '1.8 GB', icon: Smartphone },
  { id: 'd4', name: 'iPad Air', type: 'tablet', lastSync: '3h ago', status: 'offline', memorySize: '1.2 GB', icon: Tablet },
  { id: 'd5', name: 'Work Desktop', type: 'desktop', lastSync: '1d ago', status: 'conflict', memorySize: '2.1 GB', icon: HardDrive },
];

const MEMORY_NODES: MemoryNode[] = [
  { id: 'mn1', sessionId: 's1', label: 'RAG chunking strategy', type: 'fact', synced: true, encrypted: false },
  { id: 'mn2', sessionId: 's1', label: 'User prefers recursive splitting', type: 'preference', synced: true, encrypted: true },
  { id: 'mn3', sessionId: 's2', label: 'MCP transport config', type: 'context', synced: true, encrypted: false },
  { id: 'mn4', sessionId: 's3', label: 'Consensus voting protocol', type: 'skill', synced: true, encrypted: false },
  { id: 'mn5', sessionId: 's3', label: 'Delegation workflow pattern', type: 'fact', synced: false, encrypted: false },
  { id: 'mn6', sessionId: 's4', label: 'Memory decay threshold', type: 'preference', synced: true, encrypted: true },
  { id: 'mn7', sessionId: 's5', label: 'Budget alert threshold', type: 'context', synced: true, encrypted: false },
  { id: 'mn8', sessionId: 's5', label: 'Cost per token mapping', type: 'fact', synced: false, encrypted: false },
];

/* ─── Helpers ─── */
const SYNC_STATUS_MAP: Record<string, { color: string; label: string }> = {
  synced: { color: '#00ff88', label: 'Synced' },
  syncing: { color: '#FFB627', label: 'Syncing' },
  offline: { color: '#8888aa', label: 'Offline' },
  conflict: { color: '#E63946', label: 'Conflict' },
};

const NODE_TYPE_COLORS: Record<string, string> = {
  fact: '#00ffff',
  preference: '#9d4edd',
  context: '#FFB627',
  skill: '#00ff88',
};

/* ═══════════════════════════════════════════════════════════
   SESSION TIMELINE
   ═══════════════════════════════════════════════════════════ */
function SessionTimeline() {
  const [selectedSession, setSelectedSession] = useState<string | null>('s1');

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Clock size={12} className="text-[#00ffff]" /> Session Timeline
          </h3>
          <span className="text-[9px] text-[#8888aa] font-mono">{SESSIONS.length} sessions</span>
        </div>
      </div>

      <div className="p-3 max-h-80 overflow-y-auto custom-scrollbar">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-[#00ffff30] via-[rgba(157,78,221,0.15)] to-transparent" />

          <div className="space-y-1.5">
            {SESSIONS.map((session, i) => {
              const isSelected = selectedSession === session.id;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex items-start gap-3 cursor-pointer group"
                  onClick={() => setSelectedSession(isSelected ? null : session.id)}
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-2 flex-shrink-0">
                    <motion.div
                      className="w-3 h-3 rounded-full border-2"
                      style={{
                        borderColor: session.color,
                        backgroundColor: isSelected ? session.color : '#0a0a1a',
                        boxShadow: isSelected ? `0 0 10px ${session.color}60` : 'none',
                      }}
                      animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>

                  {/* Session card */}
                  <div
                    className="flex-1 rounded-lg border p-2.5 transition-all group-hover:border-[rgba(0,255,255,0.2)]"
                    style={{
                      borderColor: isSelected ? `${session.color}30` : 'rgba(157,78,221,0.08)',
                      background: isSelected ? `${session.color}06` : 'rgba(10,10,26,0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white font-medium truncate">{session.title}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full border font-bold"
                          style={{ borderColor: `${session.color}30`, color: session.color, background: `${session.color}10` }}>
                          {session.agent}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-[#8888aa]">
                      <span className="flex items-center gap-1"><Clock size={7} /> {session.timestamp}</span>
                      <span className="flex items-center gap-1"><Activity size={7} /> {session.messageCount} msgs</span>
                      <span className="flex items-center gap-1"><Brain size={7} /> {session.memoryCount} memories</span>
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SYNC_STATUS_MAP[session.status].color }} />
                        <span className="text-[8px]" style={{ color: SYNC_STATUS_MAP[session.status].color }}>
                          {SYNC_STATUS_MAP[session.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SYNC STATUS PANEL
   ═══════════════════════════════════════════════════════════ */
function SyncStatusPanel() {
  const [cloudSync, setCloudSync] = useState(true);
  const [encryptionOn, setEncryptionOn] = useState(true);
  const localSize = '2.4 GB';
  const cloudSize = '2.4 GB';
  const lastSyncTime = '2s ago';

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Cloud size={12} className="text-[#00ffff]" /> Memory Sync
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Sync status indicator */}
        <div className="flex items-center justify-between p-3 rounded-lg border"
          style={{
            borderColor: cloudSync ? 'rgba(0,255,136,0.2)' : 'rgba(230,57,70,0.2)',
            background: cloudSync ? 'rgba(0,255,136,0.04)' : 'rgba(230,57,70,0.04)',
          }}>
          <div className="flex items-center gap-2">
            <motion.div
              animate={cloudSync ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={14} style={{ color: cloudSync ? '#00ff88' : '#E63946' }} />
            </motion.div>
            <div>
              <div className="text-[10px] font-medium" style={{ color: cloudSync ? '#00ff88' : '#E63946' }}>
                {cloudSync ? 'Cloud Sync Active' : 'Cloud Sync Paused'}
              </div>
              <div className="text-[8px] text-[#8888aa]">Last sync: {lastSyncTime}</div>
            </div>
          </div>
          <button
            onClick={() => setCloudSync(!cloudSync)}
            className="w-8 h-5 rounded-full flex items-center px-0.5 transition-all"
            style={{
              background: cloudSync ? 'rgba(0,255,136,0.2)' : 'rgba(230,57,70,0.2)',
              justifyContent: cloudSync ? 'flex-end' : 'flex-start',
            }}
          >
            <motion.div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: cloudSync ? '#00ff88' : '#E63946' }}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Local vs Cloud */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] text-center">
            <HardDrive size={16} className="text-[#9d4edd] mx-auto mb-1.5" />
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">Local</div>
            <div className="text-white font-mono font-bold text-sm">{localSize}</div>
            <div className="text-[7px] text-[#00ff88] mt-0.5 flex items-center justify-center gap-0.5">
              <Check size={7} /> Up to date
            </div>
          </div>
          <div className="p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] text-center">
            <Cloud size={16} className="text-[#00ffff] mx-auto mb-1.5" />
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">Cloud</div>
            <div className="text-white font-mono font-bold text-sm">{cloudSize}</div>
            <div className="text-[7px] text-[#00ff88] mt-0.5 flex items-center justify-center gap-0.5">
              <Check size={7} /> In sync
            </div>
          </div>
        </div>

        {/* Encryption toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
          <div className="flex items-center gap-2">
            {encryptionOn ? <Lock size={12} className="text-[#FFB627]" /> : <Unlock size={12} className="text-[#8888aa]" />}
            <div>
              <div className="text-[10px] text-white font-medium">End-to-End Encryption</div>
              <div className="text-[8px] text-[#8888aa]">AES-256-GCM · 2 keys active</div>
            </div>
          </div>
          <button
            onClick={() => setEncryptionOn(!encryptionOn)}
            className="w-8 h-5 rounded-full flex items-center px-0.5 transition-all"
            style={{
              background: encryptionOn ? 'rgba(255,182,39,0.2)' : 'rgba(136,136,170,0.2)',
              justifyContent: encryptionOn ? 'flex-end' : 'flex-start',
            }}
          >
            <motion.div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: encryptionOn ? '#FFB627' : '#8888aa' }}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEVICE LIST
   ═══════════════════════════════════════════════════════════ */
function DeviceList() {
  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Wifi size={12} className="text-[#00ffff]" /> Devices
          </h3>
          <button className="flex items-center gap-1 text-[9px] text-[#8888aa] hover:text-[#00ffff] transition-colors">
            <Plus size={9} /> Add
          </button>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        {DEVICES.map((device, i) => {
          const statusInfo = SYNC_STATUS_MAP[device.status];
          const IconComp = device.icon;
          return (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-[rgba(157,78,221,0.06)] bg-[rgba(10,10,26,0.2)] hover:border-[rgba(0,255,255,0.15)] transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.5)]">
                <IconComp size={14} className="text-[#8888aa] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white font-medium truncate">{device.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusInfo.color }} />
                </div>
                <div className="flex items-center gap-2 text-[8px] text-[#8888aa]">
                  <span>{device.memorySize}</span>
                  <span>·</span>
                  <span style={{ color: statusInfo.color }}>{statusInfo.label} {device.lastSync}</span>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8888aa] hover:text-[#00ffff]">
                <RefreshCw size={11} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONNECTED NODES VISUALIZATION
   ═══════════════════════════════════════════════════════════ */
function ConnectedNodesViz() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <GitBranch size={12} className="text-[#00ffff]" /> Memory Bridge
          </h3>
          <div className="flex items-center gap-2">
            {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[7px] text-[#8888aa] uppercase">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        <svg viewBox="0 0 400 220" className="w-full">
          <defs>
            <filter id="nodeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Connection lines between nodes across sessions */}
          {MEMORY_NODES.map((node, i) => {
            const sourceSession = SESSIONS.find(s => s.id === node.sessionId);
            const sessionIndex = SESSIONS.findIndex(s => s.id === node.sessionId);
            const x1 = 40 + sessionIndex * 60;
            const y1 = 30;
            const x2 = 30 + i * 48;
            const y2 = 160;
            const nodeColor = NODE_TYPE_COLORS[node.type];
            const isHovered = hoveredNode === node.id;

            return (
              <g key={`link-${node.id}`}>
                <motion.line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={nodeColor}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                  strokeOpacity={isHovered ? 0.6 : 0.15}
                  strokeDasharray={node.synced ? 'none' : '3 3'}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
                {/* Animated particle along the link */}
                {node.synced && (
                  <motion.circle r="1.5" fill={nodeColor} opacity="0.6">
                    <animateMotion dur={`${2 + i * 0.3}s`} repeatCount="indefinite"
                      path={`M${x1},${y1} L${x2},${y2}`} />
                  </motion.circle>
                )}
              </g>
            );
          })}

          {/* Session nodes (top row) */}
          {SESSIONS.slice(0, 6).map((session, i) => (
            <g key={session.id}>
              <circle
                cx={40 + i * 60} cy={30} r={12}
                fill={`${session.color}15`}
                stroke={session.color}
                strokeWidth={1}
                strokeOpacity={0.4}
                filter="url(#nodeGlow)"
              />
              <text x={40 + i * 60} y={33} textAnchor="middle" fill={session.color}
                fontSize="7" fontWeight="bold" fontFamily="monospace">
                {session.agent[0]}
              </text>
            </g>
          ))}

          {/* Memory nodes (bottom row) */}
          {MEMORY_NODES.map((node, i) => {
            const nodeColor = NODE_TYPE_COLORS[node.type];
            const isHovered = hoveredNode === node.id;
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={30 + i * 48} cy={160}
                  r={isHovered ? 8 : 6}
                  fill={`${nodeColor}${isHovered ? '25' : '12'}`}
                  stroke={nodeColor}
                  strokeWidth={isHovered ? 1.5 : 0.8}
                  strokeOpacity={isHovered ? 0.8 : 0.3}
                  filter={isHovered ? 'url(#nodeGlow)' : undefined}
                />
                {node.encrypted && (
                  <text x={30 + i * 48} y={163} textAnchor="middle" fill={nodeColor} fontSize="6">🔒</text>
                )}
                {isHovered && (
                  <text x={30 + i * 48} y={180} textAnchor="middle" fill="white" fontSize="7" fontFamily="monospace">
                    {node.label.slice(0, 15)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXPORT / IMPORT PANEL
   ═══════════════════════════════════════════════════════════ */
function ExportImportPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => setExporting(false), 1500);
  }, []);

  const handleImport = useCallback(() => {
    setImporting(true);
    setTimeout(() => setImporting(false), 1500);
  }, []);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
          <Database size={12} className="text-[#00ffff]" /> Export / Import
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Export */}
        <motion.button
          onClick={handleExport}
          disabled={exporting}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)] hover:bg-[rgba(0,255,136,0.08)] transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.08)]">
            <Download size={14} className="text-[#00ff88]" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-white font-medium">Export Memory State</div>
            <div className="text-[8px] text-[#8888aa]">
              {exporting ? 'Exporting...' : 'JSON · 2.4 GB · AES-256 encrypted'}
            </div>
          </div>
          <FileJson size={14} className="text-[#8888aa]" />
        </motion.button>

        {/* Import */}
        <motion.button
          onClick={handleImport}
          disabled={importing}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.04)] hover:bg-[rgba(0,255,255,0.08)] transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-[rgba(0,255,255,0.2)] bg-[rgba(0,255,255,0.08)]">
            <Upload size={14} className="text-[#00ffff]" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-white font-medium">Import Memory State</div>
            <div className="text-[8px] text-[#8888aa]">
              {importing ? 'Importing...' : 'Restore from backup · Merge or Replace'}
            </div>
          </div>
          <FileJson size={14} className="text-[#8888aa]" />
        </motion.button>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { icon: Copy, label: 'Copy Key', color: '#9d4edd' },
            { icon: Shield, label: 'Rotate Key', color: '#FFB627' },
            { icon: Trash2, label: 'Purge Old', color: '#E63946' },
          ].map(action => (
            <button
              key={action.label}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.2)] hover:border-[rgba(0,255,255,0.15)] transition-all"
            >
              <action.icon size={11} style={{ color: action.color }} />
              <span className="text-[8px] text-[#8888aa]">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CROSS-SESSION MEMORY — Main Export
   ═══════════════════════════════════════════════════════════ */
export function CrossSessionMemory() {
  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Link2 size={16} className="text-[#00ffff]" />
          Cross-Session Memory
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.06)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[9px] text-[#00ff88] font-mono">All synced</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.5)]">
            <Lock size={9} className="text-[#FFB627]" />
            <span className="text-[9px] text-[#FFB627] font-mono">E2E Encrypted</span>
          </div>
        </div>
      </div>

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Memories', value: '12,847', icon: Brain, color: '#00ffff' },
          { label: 'Sessions', value: String(SESSIONS.length), icon: Layers, color: '#9d4edd' },
          { label: 'Devices', value: String(DEVICES.length), icon: Wifi, color: '#00ff88' },
          { label: 'Sync Rate', value: '99.7%', icon: Activity, color: '#FFB627' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-3 backdrop-blur-sm"
            style={{ borderColor: `${s.color}18`, background: `${s.color}04` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={10} style={{ color: s.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* ─── Main grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SessionTimeline />
        <SyncStatusPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeviceList />
        <ConnectedNodesViz />
      </div>

      <ExportImportPanel />
    </div>
  );
}
