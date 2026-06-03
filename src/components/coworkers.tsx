'use client';

import { useOSStore, type Coworker, type CoworkerRole } from '@/lib/store';
import { decomposeTask as decomposeTaskFn } from '@/lib/coworker-system';
import { motion } from 'framer-motion';
import { Users, Brain, Play, CheckCircle2, XCircle, RefreshCw, ArrowRight, History, Wrench, Plus, Zap, Activity, AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';

const ROLE_COLORS: Record<string, string> = {
  architect: '#9d4edd', coder: '#00ff88', researcher: '#FFB627', analyst: '#a3e635',
  reviewer: '#00ffff', executor: '#f97316', coordinator: '#ffffff', writer: '#e879f9',
  designer: '#f472b6', devops: '#06b6d4',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#8888aa', working: '#FFB627', learning: '#00ff88', error: '#ff4444',
};

export function CoworkersPanel() {
  const { coworkers, teamTasks, addTeamTask, executeTeamTask, updateCoworker, model: globalModel } = useOSStore();
  const [newTask, setNewTask] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [selectedCoworker, setSelectedCoworker] = useState<string | null>(null);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  const handleCreateTask = useCallback(() => {
    if (!newTask.trim()) return;
    const { subtasks } = decomposeTaskFn(newTask, newTaskDesc || newTask);
    const taskId = `tt-${Date.now()}`;
    addTeamTask({
      id: taskId, title: newTask, description: newTaskDesc, status: 'queued',
      assignedCoworkers: [], subtasks: subtasks.map((st, i) => ({
        ...st, id: `${taskId}-st-${i}`, parentTaskId: taskId,
        status: 'queued', attempts: 0, maxAttempts: 3, createdAt: Date.now(),
      })), createdAt: Date.now(),
    });
    setNewTask(''); setNewTaskDesc('');
  }, [newTask, newTaskDesc, addTeamTask]);

  const handleExecute = useCallback(async (taskId: string) => {
    setExecutingTaskId(taskId);
    await executeTeamTask(taskId, globalModel);
    setExecutingTaskId(null);
  }, [executeTeamTask, globalModel]);

  const selectedCoworkerData = coworkers.find(c => c.id === selectedCoworker);

  return (
    <div className="h-full flex gap-3 p-3 overflow-hidden">
      {/* Left: Coworkers List */}
      <div className="w-56 flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-shrink-0">
        <div className="text-[9px] text-[#8888aa] uppercase tracking-wider px-1">Team (8)</div>
        {coworkers.map((cw) => (
          <motion.div key={cw.id} whileHover={{ scale: 1.02 }} onClick={() => setSelectedCoworker(cw.id)}
            className={`p-2 rounded-lg border cursor-pointer transition-all ${selectedCoworker === cw.id ? 'ring-1' : ''}`}
            style={{ borderColor: selectedCoworker === cw.id ? `${ROLE_COLORS[cw.role]}40` : `${ROLE_COLORS[cw.role]}15`, background: selectedCoworker === cw.id ? `${ROLE_COLORS[cw.role]}08` : 'transparent' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{cw.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white font-medium truncate">{cw.name}</div>
                <div className="text-[8px] text-[#8888aa] uppercase">{cw.role}</div>
              </div>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[cw.status] }} />
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[8px]">
              <span className="text-[#00ff88]">✓{cw.successCount}</span>
              <span className="text-[#ff4444]">✗{cw.failureCount}</span>
              <span className="text-[#8888aa] ml-auto">{cw.memory.length} memories</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Center: Tasks */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* New Task */}
        <div className="mb-3 p-3 rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)]">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={12} style={{ color: '#9d4edd' }} />
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">New Team Task</span>
          </div>
          <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Task title (e.g., Build a landing page)" className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder-[#8888aa] mb-2 outline-none" />
          <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Description (optional)" className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder-[#8888aa] mb-2 outline-none" />
          <button onClick={handleCreateTask} disabled={!newTask.trim()} className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold bg-[rgba(157,78,221,0.15)] border border-[rgba(157,78,221,0.3)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.25)] disabled:opacity-30 transition-colors">
            <Plus size={10} /> Decompose & Assign to Team
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {teamTasks.length === 0 && (
            <div className="text-center py-8 text-[#8888aa] text-[10px]">No team tasks yet. Create one above to see the full team collaborate.</div>
          )}
          {teamTasks.map(task => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border p-3" style={{ borderColor: `rgba(157,78,221,0.15)`, background: 'rgba(18,18,42,0.5)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users size={12} style={{ color: '#9d4edd' }} />
                  <span className="text-[11px] text-white font-medium truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{
                    backgroundColor: task.status === 'completed' ? 'rgba(0,255,136,0.1)' : task.status === 'failed' ? 'rgba(255,68,68,0.1)' : task.status === 'in-progress' ? 'rgba(255,182,39,0.1)' : 'rgba(136,136,170,0.1)',
                    color: task.status === 'completed' ? '#00ff88' : task.status === 'failed' ? '#ff4444' : task.status === 'in-progress' ? '#FFB627' : '#8888aa',
                  }}>{task.status.toUpperCase()}</span>
                  {task.status === 'queued' && (
                    <button onClick={() => handleExecute(task.id)} disabled={!!executingTaskId}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] disabled:opacity-30">
                      {executingTaskId === task.id ? <RefreshCw size={8} className="animate-spin" /> : <Play size={8} />} Execute
                    </button>
                  )}
                </div>
              </div>
              {/* Subtasks */}
              <div className="space-y-1">
                {task.subtasks.map(st => {
                  const assignedCw = coworkers.find(c => c.id === st.assignedTo);
                  return (
                    <div key={st.id} className="flex items-center gap-2 p-1.5 rounded text-[9px]" style={{ background: 'rgba(10,10,26,0.3)' }}>
                      {st.status === 'completed' ? <CheckCircle2 size={10} style={{ color: '#00ff88' }} /> :
                       st.status === 'failed' ? <XCircle size={10} style={{ color: '#ff4444' }} /> :
                       st.status === 'in-progress' || st.status === 'assigned' ? <RefreshCw size={10} className="animate-spin" style={{ color: '#FFB627' }} /> :
                       <AlertCircle size={10} style={{ color: '#8888aa' }} />}
                      <span className="text-[#8888aa] uppercase w-14 flex-shrink-0">{st.role}</span>
                      <span className="text-[#ccccdd] truncate flex-1">{st.title}</span>
                      {assignedCw && <span className="text-[8px] text-[#8888aa] flex-shrink-0">{assignedCw.icon} {assignedCw.name}</span>}
                      {st.delegatedFrom && <ArrowRight size={8} style={{ color: '#FFB627' }} />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: Coworker Detail */}
      <div className="w-64 flex-shrink-0 overflow-y-auto custom-scrollbar">
        {selectedCoworkerData ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border" style={{ borderColor: `${ROLE_COLORS[selectedCoworkerData.role]}20`, background: `${ROLE_COLORS[selectedCoworkerData.role]}08` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{selectedCoworkerData.icon}</span>
                <div>
                  <div className="text-white font-bold text-xs">{selectedCoworkerData.name}</div>
                  <div className="text-[9px] uppercase font-mono" style={{ color: ROLE_COLORS[selectedCoworkerData.role] }}>{selectedCoworkerData.role}</div>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[selectedCoworkerData.status] }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <div className="bg-[rgba(10,10,26,0.5)] rounded p-1"><div className="text-[#00ff88] text-xs font-bold">{selectedCoworkerData.successCount}</div><div className="text-[7px] text-[#8888aa]">Success</div></div>
                <div className="bg-[rgba(10,10,26,0.5)] rounded p-1"><div className="text-[#ff4444] text-xs font-bold">{selectedCoworkerData.failureCount}</div><div className="text-[7px] text-[#8888aa]">Failed</div></div>
                <div className="bg-[rgba(10,10,26,0.5)] rounded p-1"><div className="text-white text-xs font-bold">{selectedCoworkerData.memory.length}</div><div className="text-[7px] text-[#8888aa]">Memories</div></div>
              </div>
              <div className="space-y-1">
                <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Expertise</div>
                <div className="flex flex-wrap gap-1">{selectedCoworkerData.expertise.map((e, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${ROLE_COLORS[selectedCoworkerData.role]}10`, color: ROLE_COLORS[selectedCoworkerData.role] }}>{e}</span>
                ))}</div>
              </div>
              <div className="space-y-1 mt-2">
                <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">Skills</div>
                <div className="flex flex-wrap gap-1">{selectedCoworkerData.skills.map((s, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-[rgba(10,10,26,0.5)] text-[#8888aa]">{s}</span>
                ))}</div>
              </div>
            </div>

            {/* Memory / Learnings */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <History size={10} style={{ color: '#9d4edd' }} />
                <span className="text-[9px] text-white font-bold uppercase tracking-wider">Learned Memory</span>
              </div>
              <div className="space-y-1.5">
                {selectedCoworkerData.memory.slice(0, 10).map((mem, i) => (
                  <div key={i} className="p-2 rounded-lg text-[8px]" style={{ background: mem.success ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,68,0.05)', border: `1px solid ${mem.success ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)'}` }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      {mem.success ? <CheckCircle2 size={8} style={{ color: '#00ff88' }} /> : <XCircle size={8} style={{ color: '#ff4444' }} />}
                      <span className="text-[#ccccdd]">{mem.lessonsLearned[0]?.slice(0, 80)}</span>
                    </div>
                    <div className="text-[#8888aa]">{new Date(mem.timestamp).toLocaleDateString()}</div>
                  </div>
                ))}
                {selectedCoworkerData.memory.length === 0 && <div className="text-[8px] text-[#8888aa] text-center py-3">No memories yet. Execute tasks to build knowledge.</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#8888aa]">
            <Users size={32} className="mb-2 opacity-20" />
            <div className="text-[10px]">Select a coworker to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}
