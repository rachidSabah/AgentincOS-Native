'use client';

import { useOSStore, type Workspace, type WorkspaceFile } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Plus, X, Check, Trash2, Edit3, Star,
  Upload, FileText, FileCode, File, FileSpreadsheet,
  Bot, Cpu, Database, Zap, ChevronDown, ChevronUp,
  Search, GripVertical, Sparkles, Palette, Tag,
  FolderKanban, Building2, Users, Briefcase, Layers,
  MoreVertical, Eye, Power, Hash, Image as ImageIcon,
} from 'lucide-react';
import { useState, useCallback, useRef } from 'react';

/* ─── Constants ─── */
const PRESET_COLORS = [
  '#7B2CBF', '#E63946', '#FFB627', '#1B998B', '#2E86AB',
  '#E8751A', '#00ff88', '#ff4444', '#FF8C42', '#c084fc',
  '#f472b6', '#38bdf8', '#a3e635', '#fbbf24', '#818cf8',
];

const WORKSPACE_ICONS = [
  '📁', '🏢', '👥', '🔬', '🚀', '💡', '🛡️', '🎯',
  '📊', '⚙️', '🧪', '📋', '🏗️', '🌐', '🤖', '💎',
];

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  project: { label: 'Project', color: '#7B2CBF', icon: <FolderKanban size={10} /> },
  organization: { label: 'Organization', color: '#1B998B', icon: <Building2 size={10} /> },
  team: { label: 'Team', color: '#FFB627', icon: <Users size={10} /> },
  department: { label: 'Department', color: '#2E86AB', icon: <Briefcase size={10} /> },
};

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText size={12} className="text-[#E63946]" />,
  docx: <FileText size={12} className="text-[#2E86AB]" />,
  xlsx: <FileSpreadsheet size={12} className="text-[#1B998B]" />,
  csv: <FileSpreadsheet size={12} className="text-[#1B998B]" />,
  pptx: <FileText size={12} className="text-[#E8751A]" />,
  txt: <FileText size={12} className="text-[#8888aa]" />,
  json: <FileCode size={12} className="text-[#FFB627]" />,
  xml: <FileCode size={12} className="text-[#E8751A]" />,
  yaml: <FileCode size={12} className="text-[#c084fc]" />,
  html: <FileCode size={12} className="text-[#E63946]" />,
  image: <ImageIcon size={12} className="text-[#f472b6]" />,
  code: <FileCode size={12} className="text-[#00ff88]" />,
  repo: <Layers size={12} className="text-[#7B2CBF]" />,
  default: <File size={12} className="text-[#8888aa]" />,
};

function getFileIcon(type: string) {
  return FILE_TYPE_ICONS[type] || FILE_TYPE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/* ═══════════════════════════════════════════════════════
   WORKSPACE MANAGER — Main Export
   ═══════════════════════════════════════════════════════ */
export function WorkspaceManager() {
  const {
    workspaces, activeWorkspaceId,
    addWorkspace, updateWorkspace, removeWorkspace, setActiveWorkspaceId,
    agents, providers,
  } = useOSStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<Workspace['type']>('project');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formIcon, setFormIcon] = useState(WORKSPACE_ICONS[0]);
  const [formAgentIds, setFormAgentIds] = useState<string[]>([]);
  const [formModelIds, setFormModelIds] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDescription('');
    setFormType('project');
    setFormColor(PRESET_COLORS[0]);
    setFormIcon(WORKSPACE_ICONS[0]);
    setFormAgentIds([]);
    setFormModelIds([]);
  }, []);

  const handleCreate = useCallback(() => {
    if (!formName.trim()) return;
    const now = Date.now();
    addWorkspace({
      id: generateId(),
      name: formName.trim(),
      description: formDescription.trim(),
      type: formType,
      agents: formAgentIds,
      models: formModelIds,
      files: [],
      memory: [],
      permissions: [],
      knowledge: [],
      automations: [],
      templates: [],
      createdAt: now,
      updatedAt: now,
      color: formColor,
      icon: formIcon,
    });
    resetForm();
    setShowCreateForm(false);
  }, [formName, formDescription, formType, formColor, formIcon, formAgentIds, formModelIds, addWorkspace, resetForm]);

  const handleDelete = useCallback((id: string) => {
    removeWorkspace(id);
    if (expandedWorkspaceId === id) setExpandedWorkspaceId(null);
    if (activeWorkspaceId === id) setActiveWorkspaceId(null);
  }, [removeWorkspace, expandedWorkspaceId, activeWorkspaceId, setActiveWorkspaceId]);

  const toggleAgent = useCallback((agentId: string) => {
    setFormAgentIds(prev =>
      prev.includes(agentId) ? prev.filter(a => a !== agentId) : [...prev, agentId]
    );
  }, []);

  const toggleModel = useCallback((modelId: string) => {
    setFormModelIds(prev =>
      prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
    );
  }, []);

  // Filter workspaces by search
  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <FolderOpen size={16} className="text-[#7B2CBF]" />
          Workspace Manager
          <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-[rgba(123,44,191,0.15)] text-[#c084fc] border border-[rgba(123,44,191,0.3)]">
            {workspaces.length}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {activeWorkspace && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-medium border"
              style={{ borderColor: `${activeWorkspace.color}30`, background: `${activeWorkspace.color}10`, color: activeWorkspace.color }}>
              <Power size={9} />
              Active: {activeWorkspace.icon} {activeWorkspace.name}
            </div>
          )}
          <button onClick={() => { setShowCreateForm(!showCreateForm); if (!showCreateForm) resetForm(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'rgba(123,44,191,0.15)', border: '1px solid rgba(123,44,191,0.3)', color: '#c084fc' }}>
            <Plus size={12} /> New Workspace
          </button>
        </div>
      </div>

      {/* ─── Search ─── */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search workspaces..."
          className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors" />
      </div>

      {/* ─── Create Workspace Form (collapsible) ─── */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[rgba(123,44,191,0.2)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 overflow-hidden">
            <div className="space-y-3">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Name</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="My Workspace"
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
                </div>
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Description</label>
                  <input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Describe this workspace..."
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
                </div>
              </div>

              {/* Type Dropdown */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <button key={key} onClick={() => setFormType(key as Workspace['type'])}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-all border"
                      style={{
                        borderColor: formType === key ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                        background: formType === key ? `${meta.color}10` : 'transparent',
                        color: formType === key ? meta.color : '#8888aa',
                      }}>
                      {meta.icon} {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Palette size={9} /> Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(color => (
                    <button key={color} onClick={() => setFormColor(color)}
                      className="w-6 h-6 rounded-lg border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: formColor === color ? '#fff' : 'transparent',
                        boxShadow: formColor === color ? `0 0 8px ${color}60` : 'none',
                      }}>
                      {formColor === color && <Check size={10} className="mx-auto text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles size={9} /> Icon
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WORKSPACE_ICONS.map(icon => (
                    <button key={icon} onClick={() => setFormIcon(icon)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all border"
                      style={{
                        borderColor: formIcon === icon ? 'rgba(157,78,221,0.4)' : 'rgba(157,78,221,0.1)',
                        background: formIcon === icon ? 'rgba(157,78,221,0.15)' : 'transparent',
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Assignment */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Bot size={9} /> Assign Agents
                </label>
                <div className="flex flex-wrap gap-2">
                  {agents.map(agent => (
                    <button key={agent.id} onClick={() => toggleAgent(agent.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                      style={{
                        borderColor: formAgentIds.includes(agent.id) ? `${agent.color}40` : 'rgba(157,78,221,0.1)',
                        background: formAgentIds.includes(agent.id) ? `${agent.color}10` : 'transparent',
                        color: formAgentIds.includes(agent.id) ? agent.color : '#8888aa',
                      }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ backgroundColor: agent.color, color: '#fff' }}>
                        {agent.name[0]}
                      </div>
                      {agent.name}
                      {formAgentIds.includes(agent.id) && <Check size={9} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Assignment */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Cpu size={9} /> Assign Models
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                  {providers.filter(p => p.enabled).map(provider =>
                    provider.models.map(model => {
                      const modelId = `${provider.id}:${model}`;
                      const isSelected = formModelIds.includes(modelId);
                      return (
                        <button key={modelId} onClick={() => toggleModel(modelId)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all border"
                          style={{
                            borderColor: isSelected ? `${provider.color || '#7B2CBF'}40` : 'rgba(157,78,221,0.1)',
                            background: isSelected ? `${provider.color || '#7B2CBF'}10` : 'transparent',
                            color: isSelected ? (provider.color || '#c084fc') : '#8888aa',
                          }}>
                          {provider.icon && <span className="text-[8px]">{provider.icon}</span>}
                          {model}
                          {isSelected && <Check size={8} />}
                        </button>
                      );
                    })
                  )}
                  {providers.filter(p => p.enabled).length === 0 && (
                    <span className="text-[9px] text-[#8888aa]">No enabled providers. Configure providers first.</span>
                  )}
                </div>
              </div>

              {/* Create Button */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleCreate} disabled={!formName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)', color: '#fff' }}>
                  <Plus size={11} /> Create Workspace
                </button>
                <button onClick={() => { setShowCreateForm(false); resetForm(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] text-[#8888aa] border border-[rgba(157,78,221,0.1)] hover:text-white transition-colors">
                  <X size={11} /> Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Workspace Grid ─── */}
      {filteredWorkspaces.length === 0 ? (
        <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
          <FolderOpen size={24} className="mx-auto text-[#8888aa] mb-2" />
          <p className="text-[#8888aa] text-xs">No workspaces yet. Create one to organize your agents and resources.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredWorkspaces.map((ws, idx) => {
            const isExpanded = expandedWorkspaceId === ws.id;
            const isActive = activeWorkspaceId === ws.id;
            const typeMeta = TYPE_META[ws.type] || TYPE_META.project;
            return (
              <motion.div key={ws.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
                style={{ borderColor: isExpanded ? `${ws.color}30` : 'rgba(157,78,221,0.15)' }}>

                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: `${ws.color}15`, border: `1px solid ${ws.color}25` }}>
                        {ws.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-xs font-medium truncate">{ws.name}</span>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse flex-shrink-0" title="Active workspace" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5"
                            style={{ backgroundColor: `${typeMeta.color}12`, color: typeMeta.color, border: `1px solid ${typeMeta.color}25` }}>
                            {typeMeta.icon} {ws.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setActiveWorkspaceId(isActive ? null : ws.id)}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                        style={{
                          borderColor: isActive ? '#00ff8830' : 'rgba(157,78,221,0.1)',
                          border: '1px solid',
                          background: isActive ? 'rgba(0,255,136,0.08)' : 'transparent',
                          color: isActive ? '#00ff88' : '#8888aa',
                        }}
                        title={isActive ? 'Unset active' : 'Set as active'}>
                        <Power size={10} />
                      </button>
                      <button onClick={() => setExpandedWorkspaceId(isExpanded ? null : ws.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#8888aa] hover:text-white transition-colors border border-[rgba(157,78,221,0.1)]">
                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {ws.description && (
                    <p className="text-[#8888aa] text-[10px] leading-relaxed mb-3 line-clamp-2">{ws.description}</p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 text-[9px]">
                    <div className="flex items-center gap-1 text-[#c084fc]">
                      <Bot size={9} /> <span className="font-mono">{ws.agents.length}</span> agents
                    </div>
                    <div className="flex items-center gap-1 text-[#FFB627]">
                      <File size={9} /> <span className="font-mono">{ws.files.length}</span> files
                    </div>
                    <div className="flex items-center gap-1 text-[#1B998B]">
                      <Cpu size={9} /> <span className="font-mono">{ws.models.length}</span> models
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[rgba(157,78,221,0.08)]">
                    <button onClick={() => setExpandedWorkspaceId(isExpanded ? null : ws.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium border border-[rgba(157,78,221,0.15)] text-[#c084fc] bg-[rgba(123,44,191,0.05)] hover:bg-[rgba(123,44,191,0.12)] transition-colors">
                      <Eye size={9} /> Open
                    </button>
                    <button onClick={() => setEditingWorkspaceId(editingWorkspaceId === ws.id ? null : ws.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium border border-[rgba(255,182,39,0.2)] text-[#FFB627] bg-[rgba(255,182,39,0.05)] hover:bg-[rgba(255,182,39,0.12)] transition-colors">
                      <Edit3 size={9} /> Edit
                    </button>
                    <button onClick={() => handleDelete(ws.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] hover:bg-[rgba(230,57,70,0.12)] transition-colors">
                      <Trash2 size={9} /> Delete
                    </button>
                    <button onClick={() => setActiveWorkspaceId(isActive ? null : ws.id)}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-colors"
                      style={{
                        border: `1px solid ${isActive ? '#00ff8830' : 'rgba(157,78,221,0.15)'}`,
                        color: isActive ? '#00ff88' : '#8888aa',
                        background: isActive ? 'rgba(0,255,136,0.08)' : 'transparent',
                      }}>
                      <Power size={9} /> {isActive ? 'Active' : 'Set Active'}
                    </button>
                  </div>
                </div>

                {/* ─── Expanded View ─── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[rgba(157,78,221,0.1)] overflow-hidden">
                      <ExpandedWorkspaceView workspace={ws} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── Edit View ─── */}
                <AnimatePresence>
                  {editingWorkspaceId === ws.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[rgba(255,182,39,0.15)] overflow-hidden">
                      <EditWorkspaceView workspace={ws} onClose={() => setEditingWorkspaceId(null)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EXPANDED WORKSPACE VIEW
   ═══════════════════════════════════════════════════════ */
function ExpandedWorkspaceView({ workspace }: { workspace: Workspace }) {
  const { agents, providers, updateWorkspace } = useOSStore();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((files: FileList) => {
    const newFiles: WorkspaceFile[] = Array.from(files).map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        type: ext,
        size: file.size,
        uploadedAt: Date.now(),
        processed: false,
        tags: [],
      };
    });

    updateWorkspace(workspace.id, {
      files: [...workspace.files, ...newFiles],
      updatedAt: Date.now(),
    });
  }, [workspace, updateWorkspace]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const removeFile = useCallback((fileId: string) => {
    updateWorkspace(workspace.id, {
      files: workspace.files.filter(f => f.id !== fileId),
      updatedAt: Date.now(),
    });
  }, [workspace, updateWorkspace]);

  const toggleAgentInWorkspace = useCallback((agentId: string) => {
    const newAgents = workspace.agents.includes(agentId)
      ? workspace.agents.filter(a => a !== agentId)
      : [...workspace.agents, agentId];
    updateWorkspace(workspace.id, { agents: newAgents, updatedAt: Date.now() });
  }, [workspace, updateWorkspace]);

  const toggleModelInWorkspace = useCallback((modelId: string) => {
    const newModels = workspace.models.includes(modelId)
      ? workspace.models.filter(m => m !== modelId)
      : [...workspace.models, modelId];
    updateWorkspace(workspace.id, { models: newModels, updatedAt: Date.now() });
  }, [workspace, updateWorkspace]);

  const wsAgents = agents.filter(a => workspace.agents.includes(a.id));

  return (
    <div className="p-4 space-y-4 bg-[rgba(10,10,26,0.3)]">
      {/* File Upload Area */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Upload size={9} /> Files ({workspace.files.length})
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-all"
          style={{
            borderColor: dragOver ? `${workspace.color}50` : 'rgba(157,78,221,0.15)',
            background: dragOver ? `${workspace.color}08` : 'rgba(10,10,26,0.3)',
          }}>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => e.target.files && handleFileUpload(e.target.files)} />
          <Upload size={16} className="mx-auto text-[#8888aa] mb-1" />
          <p className="text-[10px] text-[#8888aa]">Drag & drop files or click to upload</p>
          <p className="text-[8px] text-[#8888aa] mt-0.5">PDF, DOCX, XLSX, CSV, TXT, JSON, Code, Images</p>
        </div>

        {/* File List */}
        {workspace.files.length > 0 && (
          <div className="mt-2 max-h-36 overflow-y-auto custom-scrollbar space-y-1">
            {workspace.files.map(file => (
              <motion.div key={file.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(18,18,42,0.5)] border border-[rgba(157,78,221,0.08)]">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white truncate">{file.name}</div>
                  <div className="flex items-center gap-2 text-[8px] text-[#8888aa]">
                    <span>{formatFileSize(file.size)}</span>
                    <span className="flex items-center gap-0.5">
                      {file.processed ? <Check size={7} className="text-[#00ff88]" /> : <Zap size={7} className="text-[#FFB627]" />}
                      {file.processed ? 'Processed' : 'Pending'}
                    </span>
                  </div>
                </div>
                <button onClick={() => removeFile(file.id)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[#8888aa] hover:text-[#E63946] transition-colors">
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Assignment */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Bot size={9} /> Assigned Agents ({workspace.agents.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {agents.map(agent => {
            const isAssigned = workspace.agents.includes(agent.id);
            return (
              <button key={agent.id} onClick={() => toggleAgentInWorkspace(agent.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-medium transition-all border"
                style={{
                  borderColor: isAssigned ? `${agent.color}35` : 'rgba(157,78,221,0.08)',
                  background: isAssigned ? `${agent.color}10` : 'transparent',
                  color: isAssigned ? agent.color : '#8888aa',
                }}>
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                  style={{ backgroundColor: agent.color, color: '#fff' }}>
                  {agent.name[0]}
                </div>
                {agent.name}
                {isAssigned && <Check size={8} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Assignment */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Cpu size={9} /> Available Models ({workspace.models.length})
        </div>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
          {providers.filter(p => p.enabled).map(provider =>
            provider.models.map(model => {
              const modelId = `${provider.id}:${model}`;
              const isAssigned = workspace.models.includes(modelId);
              return (
                <button key={modelId} onClick={() => toggleModelInWorkspace(modelId)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium transition-all border"
                  style={{
                    borderColor: isAssigned ? `${provider.color || '#7B2CBF'}35` : 'rgba(157,78,221,0.08)',
                    background: isAssigned ? `${provider.color || '#7B2CBF'}10` : 'transparent',
                    color: isAssigned ? (provider.color || '#c084fc') : '#8888aa',
                  }}>
                  {provider.icon && <span className="text-[7px]">{provider.icon}</span>}
                  {model}
                </button>
              );
            })
          )}
          {providers.filter(p => p.enabled).length === 0 && (
            <span className="text-[9px] text-[#8888aa]">No enabled providers</span>
          )}
        </div>
      </div>

      {/* Knowledge Base */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Database size={9} /> Knowledge Base ({workspace.knowledge.length} entries)
        </div>
        {workspace.knowledge.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {workspace.knowledge.map(kId => (
              <span key={kId} className="text-[8px] px-2 py-1 rounded-lg bg-[rgba(46,134,171,0.1)] border border-[rgba(46,134,171,0.2)] text-[#2E86AB]">
                {kId}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[9px] text-[#8888aa] py-2 px-3 rounded-lg border border-dashed border-[rgba(157,78,221,0.1)]">
            No knowledge entries. Files will be processed into the knowledge base automatically.
          </div>
        )}
      </div>

      {/* Automations */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Zap size={9} /> Automations ({workspace.automations.length})
        </div>
        {workspace.automations.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {workspace.automations.map(aId => (
              <span key={aId} className="text-[8px] px-2 py-1 rounded-lg bg-[rgba(232,117,26,0.1)] border border-[rgba(232,117,26,0.2)] text-[#E8751A]">
                {aId}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[9px] text-[#8888aa] py-2 px-3 rounded-lg border border-dashed border-[rgba(157,78,221,0.1)]">
            No automations configured. Add workflows to automate tasks in this workspace.
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EDIT WORKSPACE VIEW
   ═══════════════════════════════════════════════════════ */
function EditWorkspaceView({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  const { updateWorkspace } = useOSStore();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [type, setType] = useState<Workspace['type']>(workspace.type);
  const [color, setColor] = useState(workspace.color);
  const [icon, setIcon] = useState(workspace.icon);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    updateWorkspace(workspace.id, {
      name: name.trim(),
      description: description.trim(),
      type,
      color,
      icon,
      updatedAt: Date.now(),
    });
    onClose();
  }, [name, description, type, color, icon, workspace.id, updateWorkspace, onClose]);

  return (
    <div className="p-4 space-y-3 bg-[rgba(255,182,39,0.03)]">
      <div className="text-[9px] text-[#FFB627] uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
        <Edit3 size={9} /> Edit Workspace
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(255,182,39,0.2)] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[rgba(255,182,39,0.4)]" />
        </div>
        <div>
          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(255,182,39,0.2)] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[rgba(255,182,39,0.4)]" />
        </div>
      </div>

      <div>
        <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <button key={key} onClick={() => setType(key as Workspace['type'])}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border"
              style={{
                borderColor: type === key ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                background: type === key ? `${meta.color}10` : 'transparent',
                color: type === key ? meta.color : '#8888aa',
              }}>
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1">
          <Palette size={9} /> Color
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-5 h-5 rounded-lg border-2 transition-all hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#fff' : 'transparent',
              }}>
              {color === c && <Check size={8} className="mx-auto text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 flex items-center gap-1">
          <Sparkles size={9} /> Icon
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WORKSPACE_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all border"
              style={{
                borderColor: icon === ic ? 'rgba(255,182,39,0.4)' : 'rgba(157,78,221,0.1)',
                background: icon === ic ? 'rgba(255,182,39,0.1)' : 'transparent',
              }}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSave} disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #FFB627cc, #FFB62788)', color: '#000' }}>
          <Check size={11} /> Save Changes
        </button>
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] text-[#8888aa] border border-[rgba(157,78,221,0.1)] hover:text-white transition-colors">
          <X size={11} /> Cancel
        </button>
      </div>
    </div>
  );
}
