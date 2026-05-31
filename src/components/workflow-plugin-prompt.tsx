'use client';

import { useOSStore, type Workflow, type WorkflowNode, type WorkflowEdge, type Plugin, type PromptEntry } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow, Puzzle, FileText, Play, Pencil, Trash2, Plus,
  GitBranch, ToggleLeft, ToggleRight, Settings2, Search,
  ChevronDown, ChevronUp, Clock, Zap, Circle, ArrowRight,
  History, FlaskConical, GitCompare, X, Check,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

// ── Shared helpers ──────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  draft: '#8888aa', running: '#00ff88', completed: '#1B998B', failed: '#ff4444',
  active: '#00ff88', inactive: '#8888aa', error: '#ff4444',
};

const nodeTypeColor: Record<string, string> = {
  'agent-call': '#FFB627', condition: '#7B2CBF', loop: '#E8751A',
  transform: '#1B998B', webhook: '#E63946', delay: '#8888aa',
  'human-approval': '#2E86AB', output: '#00ff88',
};

const catColor: Record<string, string> = {
  system: '#E63946', task: '#FFB627', skill: '#7B2CBF',
  seo: '#1B998B', workflow: '#E8751A', custom: '#2E86AB',
};

function timeAgo(ts: number | undefined | null): string {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function perfRing(score: number, size = 28) {
  const c = score >= 0.8 ? '#00ff88' : score >= 0.5 ? '#FFB627' : '#ff4444';
  const pct = Math.round(score * 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(157,78,221,0.12)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={c} strokeWidth="3"
          strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold" style={{ color: c }}>{pct}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WorkflowBuilder
   ═══════════════════════════════════════════════════════════════════════════ */

interface WFData { id: string; name: string; description?: string; nodes: WorkflowNode[]; edges: WorkflowEdge[]; status: string; lastRun?: number | null; }
interface TemplateData { name: string; description: string; nodes: WorkflowNode[]; edges: WorkflowEdge[]; }

export function WorkflowBuilder() {
  const { workflows, addWorkflow, removeWorkflow, updateWorkflow } = useOSStore();
  const [list, setList] = useState<WFData[]>([]);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // form state
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [formNodes, setFormNodes] = useState<WorkflowNode[]>([]);
  const [formEdges, setFormEdges] = useState<WorkflowEdge[]>([]);
  const [newNodeType, setNewNodeType] = useState<WorkflowNode['type']>('agent-call');
  const [newNodeX, setNewNodeX] = useState('0');
  const [newNodeY, setNewNodeY] = useState('0');
  const [edgeSrc, setEdgeSrc] = useState('');
  const [edgeTgt, setEdgeTgt] = useState('');

  const fetchWf = useCallback(async () => {
    try {
      const r = await fetch('/api/hermes/workflows');
      const d = await r.json();
      setList(d.workflows ?? []);
    } catch { /* silent */ }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const r = await fetch('/api/hermes/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-templates' }) });
      const d = await r.json();
      setTemplates(d.templates ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchWf(); fetchTemplates(); }, [fetchWf, fetchTemplates]);

  const handleAction = async (action: string, payload: Record<string, unknown>) => {
    try {
      await fetch('/api/hermes/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
      fetchWf();
    } catch { /* silent */ }
  };

  const addNode = () => {
    const id = `n${formNodes.length + 1}_${Date.now()}`;
    setFormNodes([...formNodes, { id, type: newNodeType, position: { x: +newNodeX || 0, y: +newNodeY || 0 }, data: {} }]);
  };
  const addEdge = () => {
    if (!edgeSrc || !edgeTgt) return;
    setFormEdges([...formEdges, { id: `e${formEdges.length + 1}_${Date.now()}`, source: edgeSrc, target: edgeTgt }]);
  };

  const saveWf = async () => {
    if (!wfName.trim()) return;
    await handleAction('create', { name: wfName, description: wfDesc, nodes: formNodes, edges: formEdges });
    addWorkflow({ id: `wf_${Date.now()}`, name: wfName, description: wfDesc, nodes: formNodes, edges: formEdges, status: 'draft', createdAt: Date.now() });
    setWfName(''); setWfDesc(''); setFormNodes([]); setFormEdges([]); setShowCreate(false);
  };

  const applyTemplate = (t: TemplateData) => {
    setWfName(t.name); setWfDesc(t.description); setFormNodes(t.nodes); setFormEdges(t.edges); setShowCreate(true);
  };

  return (
    <section aria-label="Workflow Builder" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Workflow size={16} className="text-[#7B2CBF]" /> Workflow Builder
          <span className="text-[9px] font-mono text-[#8888aa] ml-1">{list.length}</span>
        </h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-medium transition-all"
          style={{ borderColor: '#7B2CBF35', color: '#7B2CBF', background: '#7B2CBF08' }}>
          <Plus size={11} /> New
        </button>
      </div>

      {/* Template Gallery */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={9} className="text-[#FFB627]" /> Templates</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {templates.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3">
              <h4 className="text-white text-[11px] font-semibold mb-1">{t.name}</h4>
              <p className="text-[9px] text-[#8888aa] leading-relaxed line-clamp-2 mb-2">{t.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono text-[#7B2CBF]">{t.nodes.length} nodes · {t.edges.length} edges</span>
                <button onClick={() => applyTemplate(t)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#7B2CBF30] text-[8px] font-medium text-[#7B2CBF] hover:bg-[#7B2CBF10] transition-colors">
                  Use Template
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Workflow List */}
      {list.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {list.map((wf) => (
            <motion.div key={wf.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3">
              <div className="flex items-start gap-3">
                {/* Mini-flow SVG */}
                <MiniFlow nodes={wf.nodes} edges={wf.edges} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-[11px] font-semibold truncate">{wf.name}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ color: statusColor[wf.status] ?? '#8888aa', backgroundColor: `${statusColor[wf.status] ?? '#8888aa'}15` }}>
                      {(wf.status ?? 'draft').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-[#8888aa]">
                    <span className="font-mono">{wf.nodes?.length ?? 0} nodes</span>
                    <span className="font-mono">{wf.edges?.length ?? 0} edges</span>
                    <span className="flex items-center gap-0.5"><Clock size={8} /> {timeAgo(wf.lastRun)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleAction('execute', { id: wf.id })}
                    className="p-1.5 rounded-lg border border-[#00ff8825] text-[#00ff88] hover:bg-[#00ff8808] transition-colors" title="Execute"><Play size={11} /></button>
                  <button className="p-1.5 rounded-lg border border-[#FFB62725] text-[#FFB627] hover:bg-[#FFB62708] transition-colors" title="Edit"><Pencil size={11} /></button>
                  <button onClick={async () => { await handleAction('delete', { id: wf.id }); removeWorkflow(wf.id); }}
                    className="p-1.5 rounded-lg border border-[#ff444425] text-[#ff4444] hover:bg-[#ff444408] transition-colors" title="Delete"><Trash2 size={11} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Workflow Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-[#7B2CBF25] bg-[rgba(18,18,42,0.8)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] text-[#7B2CBF] uppercase tracking-wider font-bold flex items-center gap-1"><GitBranch size={11} /> Create Workflow</h3>
                <button onClick={() => setShowCreate(false)} className="text-[#8888aa] hover:text-white"><X size={12} /></button>
              </div>
              <input value={wfName} onChange={e => setWfName(e.target.value)} placeholder="Workflow name"
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-[11px] placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
              <input value={wfDesc} onChange={e => setWfDesc(e.target.value)} placeholder="Description"
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-[11px] placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />

              {/* Add Node */}
              <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-3 space-y-2">
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Add Node</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={newNodeType} onChange={e => setNewNodeType(e.target.value as WorkflowNode['type'])}
                    className="bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-md px-2 py-1 text-[10px] text-white focus:outline-none">
                    {(['agent-call','condition','loop','transform','webhook','delay','human-approval','output'] as const).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input value={newNodeX} onChange={e => setNewNodeX(e.target.value)} placeholder="x" className="w-14 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-md px-2 py-1 text-[10px] text-white text-center focus:outline-none" />
                  <input value={newNodeY} onChange={e => setNewNodeY(e.target.value)} placeholder="y" className="w-14 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-md px-2 py-1 text-[10px] text-white text-center focus:outline-none" />
                  <button onClick={addNode} className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#00ff8830] text-[9px] text-[#00ff88] hover:bg-[#00ff8808]"><Plus size={9} /> Node</button>
                </div>
                {formNodes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formNodes.map(n => (
                      <span key={n.id} className="text-[8px] px-1.5 py-0.5 rounded-full border font-mono"
                        style={{ borderColor: `${nodeTypeColor[n.type] ?? '#8888aa'}30`, color: nodeTypeColor[n.type] ?? '#8888aa', background: `${nodeTypeColor[n.type] ?? '#8888aa'}08` }}>
                        {n.id}: {n.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Edge */}
              <div className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] p-3 space-y-2">
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Add Edge</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input value={edgeSrc} onChange={e => setEdgeSrc(e.target.value)} placeholder="Source node id" className="w-28 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-md px-2 py-1 text-[10px] text-white focus:outline-none" />
                  <ArrowRight size={10} className="text-[#8888aa]" />
                  <input value={edgeTgt} onChange={e => setEdgeTgt(e.target.value)} placeholder="Target node id" className="w-28 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-md px-2 py-1 text-[10px] text-white focus:outline-none" />
                  <button onClick={addEdge} className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#FFB62730] text-[9px] text-[#FFB627] hover:bg-[#FFB62708]"><Plus size={9} /> Edge</button>
                </div>
                {formEdges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formEdges.map(e => (
                      <span key={e.id} className="text-[8px] px-1.5 py-0.5 rounded-full border border-[rgba(157,78,221,0.15)] text-[#aaaacc] font-mono">
                        {e.source}→{e.target}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={saveWf} disabled={!wfName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}>
                <Check size={11} /> Save Workflow
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Mini-flow SVG diagram ── */
function MiniFlow({ nodes, edges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
  if (!nodes || nodes.length === 0) {
    return <div className="w-16 h-10 flex items-center justify-center text-[8px] text-[#8888aa] border border-dashed border-[rgba(157,78,221,0.15)] rounded-lg">∅</div>;
  }
  const W = 80, H = 40;
  const maxNodes = Math.min(nodes.length, 6);
  const visible = nodes.slice(0, maxNodes);
  const r = 5;
  const gap = (W - 2 * r) / Math.max(visible.length - 1, 1);
  const cx = (i: number) => r + i * gap;
  const cy = H / 2;

  return (
    <svg width={W} height={H} className="flex-shrink-0">
      {edges.filter(e => visible.some(n => n.id === e.source) && visible.some(n => n.id === e.target)).map((e, i) => {
        const si = visible.findIndex(n => n.id === e.source);
        const ti = visible.findIndex(n => n.id === e.target);
        if (si < 0 || ti < 0) return null;
        return <line key={i} x1={cx(si)} y1={cy} x2={cx(ti)} y2={cy} stroke="rgba(157,78,221,0.3)" strokeWidth={1} />;
      })}
      {visible.map((n, i) => (
        <circle key={n.id} cx={cx(i)} cy={cy} r={r} fill={`${nodeTypeColor[n.type] ?? '#7B2CBF'}30`}
          stroke={nodeTypeColor[n.type] ?? '#7B2CBF'} strokeWidth={1} />
      ))}
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   PluginManager
   ═══════════════════════════════════════════════════════════════════════════ */

interface AvailablePlugin { id: string; name: string; version: string; description: string; author: string; permissions: string[]; category: string; downloads: number; rating: number; }
interface InstalledPlugin { id: string; name: string; version: string; description: string; author: string; status: string; permissions: string[]; config: Record<string, unknown>; installedAt: number; }

const PLUGIN_ICONS: Record<string, string> = {
  'GitHub Integration': '🐙', 'Jira Connector': '📋', 'Slack Bot': '💬',
  'Custom LLM Provider': '🧠', 'Obsidian Sync': '💎', 'Stripe Monitor': '💳', 'Email Digest': '📧',
};

export function PluginManager() {
  const { plugins, setPlugins, updatePlugin } = useOSStore();
  const [available, setAvailable] = useState<AvailablePlugin[]>([]);
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [configKey, setConfigKey] = useState('');
  const [configVal, setConfigVal] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [avRes, instRes] = await Promise.all([
        fetch('/api/hermes/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-available' }) }),
        fetch('/api/hermes/plugins'),
      ]);
      const avData = await avRes.json();
      const instData = await instRes.json();
      setAvailable(avData.plugins ?? []);
      setInstalled(instData.plugins ?? []);
      setPlugins(instData.plugins ?? []);
    } catch { /* silent */ }
  }, [setPlugins]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pluginAction = async (action: string, name: string, extra?: Record<string, unknown>) => {
    try {
      await fetch('/api/hermes/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name, ...extra }) });
      fetchAll();
    } catch { /* silent */ }
  };

  const isInstalled = (name: string) => installed.some(p => p.name.toLowerCase() === name.toLowerCase());
  const getInstalled = (name: string) => installed.find(p => p.name.toLowerCase() === name.toLowerCase());

  return (
    <section aria-label="Plugin Manager" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Puzzle size={16} className="text-[#1B998B]" /> Plugin Manager
          <span className="text-[9px] font-mono text-[#8888aa] ml-1">{installed.length} installed</span>
        </h2>
      </div>

      {/* Available Plugins */}
      <div>
        <div className="text-[9px] text-[#8888aa] uppercase tracking-widest mb-2 flex items-center gap-1"><Search size={9} className="text-[#1B998B]" /> Available</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {available.map((p, i) => {
            const done = isInstalled(p.name);
            const inst = getInstalled(p.name);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'rgba(27,153,139,0.1)', border: '1px solid rgba(27,153,139,0.2)' }}>
                    {PLUGIN_ICONS[p.name] ?? '🔌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white text-[11px] font-semibold truncate">{p.name}</span>
                      <span className="text-[8px] font-mono text-[#8888aa]">v{p.version}</span>
                    </div>
                    <p className="text-[9px] text-[#8888aa] leading-relaxed line-clamp-2 mb-1.5">{p.description}</p>
                    <div className="text-[8px] text-[#8888aa]">by {p.author}</div>

                    <div className="flex items-center gap-1.5 mt-2">
                      {!done ? (
                        <button onClick={() => pluginAction('install', p.name, { source: p.id })}
                          className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#00ff8830] text-[8px] font-medium text-[#00ff88] hover:bg-[#00ff8808] transition-colors">
                          <Plus size={9} /> Install
                        </button>
                      ) : (
                        <>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ color: statusColor[inst?.status ?? 'inactive'], backgroundColor: `${statusColor[inst?.status ?? 'inactive']}15` }}>
                            {(inst?.status ?? 'inactive').toUpperCase()}
                          </span>
                          <button onClick={() => pluginAction(inst?.status === 'active' ? 'deactivate' : 'activate', p.name)}
                            className="p-1 rounded-md border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors"
                            title={inst?.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {inst?.status === 'active' ? <ToggleRight size={12} className="text-[#00ff88]" /> : <ToggleLeft size={12} />}
                          </button>
                          <button onClick={() => { setConfiguring(p.name); setConfigKey(''); setConfigVal(''); }}
                            className="p-1 rounded-md border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors" title="Configure">
                            <Settings2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {configuring && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfiguring(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="rounded-xl border border-[rgba(157,78,221,0.2)] bg-[#0a0a1a] p-4 w-80 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] text-[#1B998B] uppercase tracking-wider font-bold">Configure: {configuring}</h3>
                <button onClick={() => setConfiguring(null)} className="text-[#8888aa] hover:text-white"><X size={12} /></button>
              </div>
              <input value={configKey} onChange={e => setConfigKey(e.target.value)} placeholder="Key"
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-[#8888aa] focus:outline-none" />
              <input value={configVal} onChange={e => setConfigVal(e.target.value)} placeholder="Value"
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-[#8888aa] focus:outline-none" />
              <button onClick={() => { pluginAction('configure', configuring, { config: { [configKey]: configVal } }); setConfiguring(null); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1B998Bcc, #1B998B88)' }}>
                <Check size={10} /> Save Config
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Installed Plugins */}
      {installed.length > 0 && (
        <div>
          <div className="text-[9px] text-[#8888aa] uppercase tracking-widest mb-2">Installed</div>
          <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] overflow-hidden">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b border-[rgba(157,78,221,0.1)]">
                  <th className="text-left text-[#8888aa] uppercase tracking-wider px-3 py-2 font-medium">Plugin</th>
                  <th className="text-left text-[#8888aa] uppercase tracking-wider px-3 py-2 font-medium">Status</th>
                  <th className="text-left text-[#8888aa] uppercase tracking-wider px-3 py-2 font-medium">Version</th>
                  <th className="text-left text-[#8888aa] uppercase tracking-wider px-3 py-2 font-medium">Permissions</th>
                  <th className="text-left text-[#8888aa] uppercase tracking-wider px-3 py-2 font-medium">Configured</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {installed.map(p => (
                  <tr key={p.id} className="border-b border-[rgba(157,78,221,0.05)] hover:bg-[rgba(157,78,221,0.03)]">
                    <td className="px-3 py-2 text-white font-medium">{p.name}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded-full font-bold"
                        style={{ color: statusColor[p.status], backgroundColor: `${statusColor[p.status]}15`, fontSize: '8px' }}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[#8888aa]">{p.version}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {p.permissions.slice(0, 2).map(perm => (
                          <span key={perm} className="text-[7px] px-1 py-0.5 rounded border border-[rgba(157,78,221,0.15)] text-[#aaaacc]">{perm}</span>
                        ))}
                        {p.permissions.length > 2 && <span className="text-[7px] text-[#8888aa]">+{p.permissions.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[#8888aa] font-mono">{timeAgo(p.installedAt)}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => pluginAction('uninstall', p.name)}
                        className="p-1 rounded-md border border-[#ff444425] text-[#ff4444] hover:bg-[#ff444408] transition-colors" title="Uninstall"><Trash2 size={10} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   PromptLibrary
   ═══════════════════════════════════════════════════════════════════════════ */

interface PromptCard { id: string; name: string; category: string; version: number; performanceScore: number; usageCount: number; lastModified: number; }
interface PromptDetail extends PromptCard { content: string; variables: string[]; versions: Array<{ version: number; content: string; timestamp: number; changelog?: string }> }
type CatFilter = 'all' | 'system' | 'task' | 'skill' | 'seo' | 'workflow' | 'custom';

export function PromptLibrary() {
  const { prompts, setPrompts } = useOSStore();
  const [cards, setCards] = useState<PromptCard[]>([]);
  const [filter, setFilter] = useState<CatFilter>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<Record<string, PromptDetail>>({});

  // create form
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState<PromptEntry['category']>('task');
  const [pContent, setPContent] = useState('');

  const fetchPrompts = useCallback(async () => {
    try {
      const r = await fetch('/api/hermes/prompts');
      const d = await r.json();
      setCards(d.prompts ?? []);
      setPrompts(d.prompts ?? []);
    } catch { /* silent */ }
  }, [setPrompts]);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const filtered = filter === 'all' ? cards : cards.filter(p => p.category === filter);

  const loadHistory = async (id: string) => {
    try {
      const r = await fetch('/api/hermes/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'history', id }) });
      const d = await r.json();
      if (d.history) setVersionHistory(prev => ({ ...prev, [id]: d.history as PromptDetail }));
    } catch { /* silent */ }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!versionHistory[id]) loadHistory(id);
  };

  const promptAction = async (action: string, payload: Record<string, unknown>) => {
    try {
      const r = await fetch('/api/hermes/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
      const d = await r.json();
      if (action === 'test') return d; // return test result
      fetchPrompts();
      return d;
    } catch { return null; }
  };

  const savePrompt = async () => {
    if (!pName.trim() || !pContent.trim()) return;
    await promptAction('create', { name: pName, category: pCat, content: pContent });
    setPName(''); setPCat('task'); setPContent(''); setShowCreate(false);
  };

  // Variable highlighting in textarea — we show the content with {{vars}} highlighted below the textarea
  const extractedVars = [...new Set(Array.from(pContent.matchAll(/\{\{(\w+)\}\}/g), m => m[1]))];

  const categories: CatFilter[] = ['all', 'system', 'task', 'skill', 'seo', 'workflow', 'custom'];

  return (
    <section aria-label="Prompt Library" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <FileText size={16} className="text-[#E8751A]" /> Prompt Library
          <span className="text-[9px] font-mono text-[#8888aa] ml-1">{cards.length}</span>
        </h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-medium transition-all"
          style={{ borderColor: '#E8751A35', color: '#E8751A', background: '#E8751A08' }}>
          <Plus size={11} /> New Prompt
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all whitespace-nowrap ${
              filter === c ? 'text-white' : 'text-[#8888aa] hover:text-white'
            }`}
            style={filter === c ? { background: `${catColor[c] ?? '#8888aa'}15`, border: `1px solid ${catColor[c] ?? '#8888aa'}30` } : { border: '1px solid transparent' }}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Prompt Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map((p, i) => {
          const col = catColor[p.category] ?? '#8888aa';
          const isExpanded = expandedId === p.id;
          const detail = versionHistory[p.id];
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] overflow-hidden">
                {/* Card Content */}
                <div className="p-3">
                  <div className="flex items-start gap-2.5">
                    {perfRing(p.performanceScore, 32)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-white text-[11px] font-semibold truncate">{p.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: col, backgroundColor: `${col}15` }}>{p.category.toUpperCase()}</span>
                        <span className="text-[8px] font-mono text-[#8888aa]">v{p.version}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-[#8888aa] mt-1">
                        <span className="flex items-center gap-0.5"><Zap size={8} /> <span className="font-mono">{p.usageCount}</span> uses</span>
                        <span className="flex items-center gap-0.5"><Clock size={8} /> {timeAgo(p.lastModified)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <button onClick={() => promptAction('test', { id: p.id, variables: {}, agentId: 'hermes' })}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#1B998B30] text-[8px] text-[#1B998B] hover:bg-[#1B998B08] transition-colors">
                      <FlaskConical size={9} /> Test
                    </button>
                    <button onClick={() => toggleExpand(p.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#7B2CBF30] text-[8px] text-[#7B2CBF] hover:bg-[#7B2CBF08] transition-colors">
                      <History size={9} /> History
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#FFB62730] text-[8px] text-[#FFB627] hover:bg-[#FFB62708] transition-colors">
                      <GitCompare size={9} /> Compare
                    </button>
                    <button className="p-1 rounded-md border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors" title="Edit">
                      <Pencil size={9} />
                    </button>
                  </div>
                </div>

                {/* Version History (Collapsible) */}
                <AnimatePresence>
                  {isExpanded && detail && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[rgba(157,78,221,0.1)] overflow-hidden">
                      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">
                          {detail.totalVersions ?? detail.versions?.length ?? 0} versions
                        </div>
                        {(detail.versions ?? []).map((v, vi) => (
                          <div key={vi} className="rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)] p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[8px] font-mono font-bold text-[#7B2CBF]">v{v.version}</span>
                              <span className="text-[7px] text-[#8888aa] font-mono">{timeAgo(v.timestamp)}</span>
                              {v.changelog && <span className="text-[7px] text-[#aaaacc]">— {v.changelog}</span>}
                            </div>
                            <pre className="text-[8px] text-[#8888aa] font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">{v.content}</pre>
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

      {/* Create Prompt Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-[#E8751A25] bg-[rgba(18,18,42,0.8)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] text-[#E8751A] uppercase tracking-wider font-bold flex items-center gap-1"><FileText size={11} /> Create Prompt</h3>
                <button onClick={() => setShowCreate(false)} className="text-[#8888aa] hover:text-white"><X size={12} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Prompt name"
                  className="flex-1 min-w-[160px] bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)]" />
                <select value={pCat} onChange={e => setPCat(e.target.value as PromptEntry['category'])}
                  className="bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none">
                  {(['system','task','skill','seo','workflow','custom'] as const).map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <textarea value={pContent} onChange={e => setPContent(e.target.value)} rows={5}
                  placeholder="Prompt content... Use {{variable}} for dynamic values"
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] resize-y font-mono leading-relaxed" />
              </div>
              {/* Variable Chips */}
              {extractedVars.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Variables:</span>
                  {extractedVars.map(v => (
                    <span key={v} className="text-[8px] px-1.5 py-0.5 rounded-full border font-mono font-medium"
                      style={{ borderColor: `${catColor[pCat] ?? '#8888aa'}30`, color: catColor[pCat] ?? '#8888aa', background: `${catColor[pCat] ?? '#8888aa'}08` }}>
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
              <button onClick={savePrompt} disabled={!pName.trim() || !pContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #E8751Acc, #E8751A88)' }}>
                <Check size={11} /> Save Prompt
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
