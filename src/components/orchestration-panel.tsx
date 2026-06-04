'use client';

import { useOSStore } from '@/lib/store';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Cpu, Brain, GitBranch, Activity, CheckCircle2, XCircle, RefreshCw, Zap, Shield, ArrowRight, Gauge, Wrench } from 'lucide-react';
import { type RegisteredModel, type ModelRole, assignRole, getLeadModel, getAvailableWorkers, autoSelectWorkers, DEFAULT_REGISTRY } from '@/lib/model-registry';

const ROLE_COLORS: Record<string, string> = { lead: '#FFB627', worker: '#4285f4', planner: '#9d4edd', coder: '#00ff88', researcher: '#FFB627', reviewer: '#00ffff', verifier: '#f97316', architect: '#e879f9', coordinator: '#ffffff', custom: '#8888aa' };
const ROLE_ICONS: Record<string, string> = { lead: '👑', worker: '🔧', planner: '📋', coder: '💻', researcher: '🔍', reviewer: '✅', verifier: '🔬', architect: '🏗️', coordinator: '🌐', custom: '⚡' };

export function OrchestrationPanel() {
  const { providers, modelRegistry: storeRegistry, leadModel, workerModels, setLeadModel, addWorkerModel, removeWorkerModel } = useOSStore();
  const [expanded, setExpanded] = useState(true);
  const [taskDescription, setTaskDescription] = useState('');
  const [assignedWorkers, setAssignedWorkers] = useState<RegisteredModel[]>([]);

  // Merge registry
  const allModels = [...DEFAULT_REGISTRY];
  for (const p of providers.filter(x => x.enabled)) {
    for (const m of (p.models || [])) {
      if (!allModels.find(x => x.id === m)) allModels.push({ id: m, name: m, providerId: p.id, providerName: p.name, contextWindow: p.maxContextTokens || 128000, capabilities: [], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'worker', assigned: false, lastCheck: Date.now() });
    }
  }

  const lead = allModels.find(m => m.id === leadModel) || allModels.find(m => m.role === 'lead') || allModels[0];
  const workers = allModels.filter(m => workerModels.includes(m.id));
  const available = allModels.filter(m => m.available && m.id !== leadModel);

  const handleAutoAssign = useCallback(() => {
    const selected = autoSelectWorkers(allModels, taskDescription, 3);
    setAssignedWorkers(selected);
    selected.forEach(w => addWorkerModel(w.id));
  }, [taskDescription, allModels, addWorkerModel]);

  const handleSetLead = (modelId: string) => {
    setLeadModel(modelId);
  };

  if (!expanded) {
    return (
      <div className="px-4 py-1.5 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(255,182,39,0.02)]">
        <button onClick={() => setExpanded(true)} className="flex items-center gap-2 text-[9px] text-[#8888aa] hover:text-white">
          <Users size={10} style={{ color: '#FFB627' }} />
          Orchestration: {lead?.name || 'None'} (Lead) + {workers.length} workers
          <span className="text-[#FFB627]">▸</span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)]">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[rgba(255,182,39,0.03)]">
        <div className="flex items-center gap-2">
          <Users size={10} style={{ color: '#FFB627' }} />
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">Orchestration</span>
        </div>
        <button onClick={() => setExpanded(false)} className="text-[8px] text-[#8888aa] hover:text-white">Collapse ▾</button>
      </div>

      <div className="p-3 space-y-3 text-[9px]">
        {/* Lead Model */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[#8888aa] uppercase tracking-wider">Lead Model</span>
            <span className="text-[7px] px-1.5 py-0.5 rounded bg-[rgba(255,182,39,0.1)] text-[#FFB627] font-bold">PRIMARY</span>
          </div>
          <select value={leadModel || ''} onChange={e => handleSetLead(e.target.value)}
            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(255,182,39,0.2)] rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
            <option value="">Auto-Select</option>
            {allModels.slice(0, 30).map(m => (
              <option key={m.id} value={m.id}>{ROLE_ICONS[m.role] || '🤖'} {m.name} ({m.providerName})</option>
            ))}
          </select>
        </div>

        {/* Task Input + Auto Assign */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[#8888aa] uppercase tracking-wider">Task Context</span>
          </div>
          <div className="flex gap-2">
            <input value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Describe task for worker assignment..."
              className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-[#8888aa] outline-none" />
            <button onClick={handleAutoAssign} className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-[rgba(157,78,221,0.15)] border border-[rgba(157,78,221,0.3)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.25)] whitespace-nowrap">
              <Zap size={8} className="inline mr-1" /> Auto-Assign
            </button>
          </div>
        </div>

        {/* Worker Models */}
        {workers.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[#8888aa] uppercase tracking-wider">Workers ({workers.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {workers.map(w => (
                <div key={w.id} className="flex items-center gap-1.5 px-2 py-1 rounded border text-[8px]" style={{ borderColor: `${ROLE_COLORS[w.role]}30`, background: `${ROLE_COLORS[w.role]}08`, color: ROLE_COLORS[w.role] }}>
                  <span>{ROLE_ICONS[w.role]}</span>
                  <span className="truncate max-w-[100px]">{w.name.slice(0, 20)}</span>
                  <button onClick={() => removeWorkerModel(w.id)} className="text-[#8888aa] hover:text-[#ff4444]">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Pool */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[#8888aa] uppercase tracking-wider">Available ({available.length})</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
            {available.slice(0, 15).map(m => (
              <button key={m.id} onClick={() => addWorkerModel(m.id)}
                className="text-[7px] px-1.5 py-0.5 rounded border border-[rgba(136,136,170,0.1)] text-[#8888aa] hover:border-[rgba(66,133,244,0.3)] hover:text-white transition-colors">
                + {m.name.slice(0, 25)}
              </button>
            ))}
          </div>
        </div>

        {/* Health Monitor */}
        <div className="flex gap-3 pt-1.5 border-t border-[rgba(157,78,221,0.1)]">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00ff88]" /><span className="text-[7px] text-[#8888aa]">{allModels.filter(m => m.health === 'healthy').length} OK</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FFB627]" /><span className="text-[7px] text-[#8888aa]">{allModels.filter(m => m.health === 'degraded').length} Degraded</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ff4444]" /><span className="text-[7px] text-[#8888aa]">{allModels.filter(m => m.health === 'offline').length} Offline</span></div>
        </div>
      </div>
    </div>
  );
}
