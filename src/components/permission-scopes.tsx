'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, Unlock, Eye, Key, Database, FileText,
  Globe, DollarSign, Share2, Download, Check, X, AlertTriangle,
  Clock, User, Settings, Zap, Brain, Search, Filter,
  ChevronDown, RotateCcw, Save, Info,
} from 'lucide-react';

// ─── Types ───

type AgentId = 'claude' | 'openclaw' | 'hermes' | 'vault';
type CapabilityCategory = 'memory' | 'files' | 'apis' | 'budget' | 'sharing';
type CapabilityAction = 'read' | 'write' | 'delete' | 'call' | 'revoke' | 'spend' | 'approve' | 'share' | 'export';
type PermissionPreset = 'full_access' | 'read_only' | 'sandbox' | 'custom';

interface Permission {
  agentId: AgentId;
  category: CapabilityCategory;
  action: CapabilityAction;
  granted: boolean;
}

interface PermissionChangeLog {
  id: string;
  timestamp: number;
  agentId: AgentId;
  change: string;
  from: boolean;
  to: boolean;
  changedBy: string;
}

// ─── Color Constants ───

const AGENT_COLORS: Record<AgentId, string> = {
  claude: '#E63946',
  openclaw: '#E8751A',
  hermes: '#FFB627',
  vault: '#2E86AB',
};

const AGENT_NAMES: Record<AgentId, string> = {
  claude: 'Claude',
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  vault: 'Self Vault',
};

const CATEGORY_COLORS: Record<CapabilityCategory, string> = {
  memory: '#2E86AB',
  files: '#9d4edd',
  apis: '#00ff88',
  budget: '#FFB627',
  sharing: '#E8751A',
};

const CATEGORY_ICONS: Record<CapabilityCategory, React.ReactNode> = {
  memory: <Database size={14} />,
  files: <FileText size={14} />,
  apis: <Globe size={14} />,
  budget: <DollarSign size={14} />,
  sharing: <Share2 size={14} />,
};

// Capability matrix: which actions belong to which category
const CAPABILITY_MATRIX: Record<CapabilityCategory, CapabilityAction[]> = {
  memory: ['read', 'write', 'delete'],
  files: ['read', 'write'],
  apis: ['call', 'revoke'],
  budget: ['spend', 'approve'],
  sharing: ['share', 'export'],
};

// Preset definitions
const PRESETS: Record<PermissionPreset, { label: string; description: string; color: string; icon: React.ReactNode; grants: (category: CapabilityCategory, action: CapabilityAction) => boolean }> = {
  full_access: {
    label: 'Full Access',
    description: 'All capabilities enabled. Use only for trusted agents.',
    color: '#E63946',
    icon: <Unlock size={16} />,
    grants: () => true,
  },
  read_only: {
    label: 'Read Only',
    description: 'Can only read data, no write or delete access.',
    color: '#2E86AB',
    icon: <Eye size={16} />,
    grants: (cat, action) => action === 'read',
  },
  sandbox: {
    label: 'Sandbox',
    description: 'Restricted execution with limited API and no budget access.',
    color: '#FFB627',
    icon: <Lock size={16} />,
    grants: (cat, action) => {
      if (cat === 'budget') return false;
      if (cat === 'apis' && action === 'revoke') return false;
      if (cat === 'memory' && action === 'delete') return false;
      if (cat === 'sharing' && action === 'export') return false;
      return true;
    },
  },
  custom: {
    label: 'Custom',
    description: 'Manually configured permissions.',
    color: '#9d4edd',
    icon: <Settings size={16} />,
    grants: () => false, // not used directly
  },
};

// Default permissions (sandbox-like starting point)
function getDefaultPermissions(): Permission[] {
  const perms: Permission[] = [];
  const agents: AgentId[] = ['claude', 'openclaw', 'hermes', 'vault'];
  for (const agentId of agents) {
    for (const [cat, actions] of Object.entries(CAPABILITY_MATRIX)) {
      for (const action of actions) {
        // Start with a reasonable default: most things enabled except delete/budget
        const granted = PRESETS.sandbox.grants(cat as CapabilityCategory, action);
        perms.push({ agentId, category: cat as CapabilityCategory, action, granted });
      }
    }
  }
  return perms;
}

// ─── GlassCard Component ───

function GlassCard({ children, className = '', glowColor }: {
  children: React.ReactNode; className?: string; glowColor?: string;
}) {
  return (
    <motion.div
      className={`rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm transition-all duration-300 hover:border-[rgba(157,78,221,0.3)] ${className}`}
      style={glowColor ? { boxShadow: `0 0 20px ${glowColor}20, inset 0 1px 0 ${glowColor}15` } : undefined}
    >
      {children}
    </motion.div>
  );
}

// ─── Toggle Cell ───

function ToggleCell({ granted, color, onToggle }: { granted: boolean; color: string; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 relative"
      style={{
        background: granted ? `${color}20` : 'rgba(10,10,26,0.5)',
        border: `1px solid ${granted ? `${color}40` : 'rgba(157,78,221,0.1)'}`,
        boxShadow: granted ? `0 0 8px ${color}30` : 'none',
      }}
      aria-label={granted ? 'Permission granted' : 'Permission denied'}
    >
      <AnimatePresence mode="wait">
        {granted ? (
          <motion.div key="on" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
            <Check size={14} style={{ color }} />
          </motion.div>
        ) : (
          <motion.div key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
            <X size={14} style={{ color: '#8888aa' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Main Component ───

export function PermissionScopes() {
  const [permissions, setPermissions] = useState<Permission[]>(() => getDefaultPermissions());
  const [changeLog, setChangeLog] = useState<PermissionChangeLog[]>([]);
  const [activePreset, setActivePreset] = useState<PermissionPreset>('sandbox');
  const [selectedAgent, setSelectedAgent] = useState<AgentId | 'all'>('all');
  const [logOpen, setLogOpen] = useState(false);

  const agents: AgentId[] = ['claude', 'openclaw', 'hermes', 'vault'];
  const categories: CapabilityCategory[] = ['memory', 'files', 'apis', 'budget', 'sharing'];

  // Toggle a single permission
  const togglePermission = useCallback((agentId: AgentId, category: CapabilityCategory, action: CapabilityAction) => {
    setPermissions(prev => {
      const idx = prev.findIndex(p => p.agentId === agentId && p.category === category && p.action === action);
      if (idx === -1) return prev;
      const newPerms = [...prev];
      const oldVal = newPerms[idx].granted;
      newPerms[idx] = { ...newPerms[idx], granted: !oldVal };
      // Log the change
      setChangeLog(logs => [{
        id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        agentId,
        change: `${category}.${action}`,
        from: oldVal,
        to: !oldVal,
        changedBy: 'admin',
      }, ...logs].slice(0, 50));
      return newPerms;
    });
    setActivePreset('custom');
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: PermissionPreset) => {
    if (preset === 'custom') return;
    setActivePreset(preset);
    const presetDef = PRESETS[preset];
    setPermissions(prev => prev.map(p => ({
      ...p,
      granted: presetDef.grants(p.category, p.action),
    })));
    setChangeLog(logs => [{
      id: `cl-${Date.now()}-preset`,
      timestamp: Date.now(),
      agentId: 'all' as AgentId,
      change: `Applied "${presetDef.label}" preset to all agents`,
      from: false,
      to: true,
      changedBy: 'admin',
    }, ...logs].slice(0, 50));
  }, []);

  // Reset to defaults
  const resetPermissions = useCallback(() => {
    setPermissions(getDefaultPermissions());
    setActivePreset('sandbox');
  }, []);

  // Computed: permission counts per agent
  const agentPermCounts = useMemo(() => {
    const counts: Record<AgentId, { granted: number; total: number }> = {} as any;
    for (const a of agents) {
      const perms = permissions.filter(p => p.agentId === a);
      counts[a] = { granted: perms.filter(p => p.granted).length, total: perms.length };
    }
    return counts;
  }, [permissions]);

  // Computed: overall stats
  const overallStats = useMemo(() => {
    const total = permissions.length;
    const granted = permissions.filter(p => p.granted).length;
    const denied = total - granted;
    const riskLevel = granted / total > 0.8 ? 'high' : granted / total > 0.5 ? 'medium' : 'low';
    const riskColor = riskLevel === 'high' ? '#E63946' : riskLevel === 'medium' ? '#FFB627' : '#00ff88';
    return { total, granted, denied, riskLevel, riskColor };
  }, [permissions]);

  // Get permissions for display (filtered by agent)
  const displayAgents = selectedAgent === 'all' ? agents : [selectedAgent];

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(157,78,221,0.1)', boxShadow: '0 0 15px rgba(157,78,221,0.3)' }}
          >
            <Shield className="w-5 h-5" style={{ color: '#9d4edd' }} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">Permission Scopes</h2>
            <p className="text-sm" style={{ color: '#8888aa' }}>
              <span className="font-mono" style={{ color: '#00ff88' }}>{overallStats.granted}</span>/{overallStats.total} granted · Risk: <span className="font-mono" style={{ color: overallStats.riskColor }}>{overallStats.riskLevel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Agent selector */}
          <div className="flex gap-1">
            <button onClick={() => setSelectedAgent('all')} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ background: selectedAgent === 'all' ? 'rgba(157,78,221,0.2)' : 'rgba(18,18,42,0.4)', color: selectedAgent === 'all' ? '#9d4edd' : '#8888aa', border: `1px solid ${selectedAgent === 'all' ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.1)'}` }}>All</button>
            {agents.map(id => (
              <button key={id} onClick={() => setSelectedAgent(id)} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ background: selectedAgent === id ? `${AGENT_COLORS[id]}20` : 'rgba(18,18,42,0.4)', color: selectedAgent === id ? AGENT_COLORS[id] : '#8888aa', border: `1px solid ${selectedAgent === id ? `${AGENT_COLORS[id]}40` : 'rgba(157,78,221,0.1)'}` }}>{AGENT_NAMES[id]}</button>
            ))}
          </div>

          <button onClick={resetPermissions} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-xs hover:bg-[rgba(157,78,221,0.1)] transition-colors" style={{ color: '#ccccdd' }}>
            <RotateCcw size={12} /> Reset
          </button>

          <button onClick={() => setLogOpen(!logOpen)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] text-xs hover:bg-[rgba(157,78,221,0.1)] transition-colors" style={{ color: '#ccccdd' }}>
            <Clock size={12} /> Log ({changeLog.length})
          </button>
        </div>
      </div>

      {/* Preset Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(PRESETS) as [PermissionPreset, typeof PRESETS[PermissionPreset]][]).map(([key, preset], i) => (
          <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard
              glowColor={activePreset === key ? preset.color : undefined}
              className="p-4 cursor-pointer"
            >
              <button onClick={() => key !== 'custom' && applyPreset(key)} className="w-full text-left" disabled={key === 'custom'}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${preset.color}20`, color: preset.color }}>
                    {preset.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{preset.label}</div>
                  </div>
                  {activePreset === key && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 rounded-full" style={{ background: preset.color, boxShadow: `0 0 8px ${preset.color}60` }} />
                  )}
                </div>
                <div className="text-[10px]" style={{ color: '#8888aa' }}>{preset.description}</div>
              </button>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Permission Matrix */}
      <GlassCard className="p-4 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <Key size={14} className="text-[#9d4edd]" />
          <span className="text-white text-xs font-bold uppercase tracking-wider">Permission Matrix</span>
        </div>

        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-24 shrink-0" />
            {displayAgents.map(agentId => (
              <div key={agentId} className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: AGENT_COLORS[agentId], boxShadow: `0 0 6px ${AGENT_COLORS[agentId]}60` }} />
                  <span className="text-[10px] font-semibold" style={{ color: AGENT_COLORS[agentId] }}>{AGENT_NAMES[agentId]}</span>
                  <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: `${AGENT_COLORS[agentId]}15`, color: AGENT_COLORS[agentId] }}>
                    {agentPermCounts[agentId].granted}/{agentPermCounts[agentId].total}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Category rows */}
          {categories.map(cat => {
            const actions = CAPABILITY_MATRIX[cat];
            const catColor = CATEGORY_COLORS[cat];

            return (
              <div key={cat} className="mb-3">
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${catColor}20`, color: catColor }}>
                    {CATEGORY_ICONS[cat]}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: catColor }}>{cat}</span>
                  <div className="flex-1 h-px" style={{ background: `${catColor}20` }} />
                </div>

                {/* Action rows */}
                {actions.map(action => (
                  <div key={`${cat}-${action}`} className="flex items-center gap-2 mb-1.5 ml-8">
                    <div className="w-16 text-[9px] capitalize text-right pr-2" style={{ color: '#8888aa' }}>
                      {action}
                    </div>
                    {displayAgents.map(agentId => {
                      const perm = permissions.find(p => p.agentId === agentId && p.category === cat && p.action === action);
                      const granted = perm?.granted ?? false;
                      return (
                        <div key={`${agentId}-${cat}-${action}`} className="flex-1 flex justify-center">
                          <ToggleCell
                            granted={granted}
                            color={catColor}
                            onToggle={() => togglePermission(agentId, cat, action)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Risk Overview */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} style={{ color: overallStats.riskColor }} />
            <span className="text-white text-xs font-bold uppercase tracking-wider">Risk Overview</span>
          </div>

          {/* Risk gauge */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-[#8888aa]">Permission Exposure</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: overallStats.riskColor }}>
                {Math.round((overallStats.granted / overallStats.total) * 100)}%
              </span>
            </div>
            <div className="h-2.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(overallStats.granted / overallStats.total) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${overallStats.riskColor}88, ${overallStats.riskColor})` }}
              />
            </div>
          </div>

          {/* Agent risk bars */}
          <div className="space-y-2">
            {agents.map(a => {
              const { granted, total } = agentPermCounts[a];
              const pct = total > 0 ? (granted / total) * 100 : 0;
              const risk = pct > 80 ? 'high' : pct > 50 ? 'medium' : 'low';
              const riskColor = risk === 'high' ? '#E63946' : risk === 'medium' ? '#FFB627' : '#00ff88';
              return (
                <div key={a}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: AGENT_COLORS[a] }}>{AGENT_NAMES[a]}</span>
                    <span className="text-[9px] font-mono" style={{ color: riskColor }}>{risk}</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: AGENT_COLORS[a] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Change Log */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#00ffff]" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Permission Changes</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,255,255,0.1)', color: '#00ffff' }}>{changeLog.length}</span>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1.5">
            {changeLog.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[10px] text-[#8888aa]">No permission changes yet</div>
                <div className="text-[9px] text-[#666680] mt-1">Toggle permissions above to see changes logged here</div>
              </div>
            ) : (
              <AnimatePresence>
                {changeLog.slice(0, 20).map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-2 bg-[rgba(10,10,26,0.4)] rounded-lg p-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: log.to ? 'rgba(0,255,136,0.15)' : 'rgba(230,57,70,0.15)', color: log.to ? '#00ff88' : '#E63946' }}>
                      {log.to ? <Check size={10} /> : <X size={10} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white truncate">
                        {log.change}
                        {log.agentId !== 'all' && <span style={{ color: AGENT_COLORS[log.agentId as AgentId] }}> — {AGENT_NAMES[log.agentId as AgentId]}</span>}
                      </div>
                      <div className="text-[8px] text-[#8888aa] font-mono">{formatTime(log.timestamp)}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: log.from ? 'rgba(230,57,70,0.1)' : 'transparent', color: log.from ? '#E63946' : 'transparent' }}>off</span>
                    <span className="text-[9px]">→</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: log.to ? 'rgba(0,255,136,0.1)' : 'transparent', color: log.to ? '#00ff88' : 'transparent' }}>on</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </GlassCard>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(18,18,42,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157,78,221,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}
