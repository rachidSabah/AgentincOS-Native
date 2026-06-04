'use client';

import {
  useOSStore,
  type BrainConfig,
  type BrainTask,
  type ReasoningStyle,
  type MemoryMethod,
  type CodingWorkflow,
  type ResearchMethod,
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Activity, Target, Network, Sparkles, ChevronDown,
  ChevronRight, Play, Clock, CheckCircle2, XCircle, Loader2,
  Cpu, Lightbulb, GitBranch, BookOpen, Layers, ArrowRight,
  RefreshCw, Eye, Trash2, MessageSquare, Bot, Workflow,
  Search, Database, Settings2, ToggleLeft, ToggleRight,
  Thermometer, Scale, BarChart3, Route,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════
// BRAIN LAYER — Provider-Independent Intelligence
// ═══════════════════════════════════════════════════════════

const REASONING_OPTIONS: { value: ReasoningStyle; label: string; icon: typeof Brain; color: string; description: string }[] = [
  { value: 'chain-of-thought', label: 'Chain of Thought', icon: ArrowRight, color: '#9d4edd', description: 'Step-by-step linear reasoning' },
  { value: 'tree-of-thought', label: 'Tree of Thought', icon: GitBranch, color: '#00ffff', description: 'Branching exploration of possibilities' },
  { value: 'react', label: 'ReAct', icon: Zap, color: '#00ff88', description: 'Reason + Act interleaved execution' },
  { value: 'plan-and-execute', label: 'Plan & Execute', icon: Target, color: '#FFB627', description: 'Plan first, then execute steps' },
  { value: 'reflection', label: 'Reflection', icon: Lightbulb, color: '#E8751A', description: 'Self-critique and iterative refinement' },
];

const MEMORY_OPTIONS: { value: MemoryMethod; label: string; color: string; description: string }[] = [
  { value: 'short-term', label: 'Short-Term', color: '#00ffff', description: 'Current context only' },
  { value: 'long-term', label: 'Long-Term', color: '#9d4edd', description: 'Persistent cross-session memory' },
  { value: 'semantic', label: 'Semantic', color: '#FFB627', description: 'Meaning-based retrieval' },
  { value: 'episodic', label: 'Episodic', color: '#00ff88', description: 'Event-sequence memory' },
  { value: 'full', label: 'Full', color: '#E8751A', description: 'All memory types combined' },
];

const CODING_OPTIONS: { value: CodingWorkflow; label: string; color: string }[] = [
  { value: 'iterative', label: 'Iterative', color: '#00ffff' },
  { value: 'plan-first', label: 'Plan First', color: '#9d4edd' },
  { value: 'test-driven', label: 'Test-Driven', color: '#00ff88' },
  { value: 'debug-first', label: 'Debug First', color: '#E8751A' },
];

const RESEARCH_OPTIONS: { value: ResearchMethod; label: string; color: string }[] = [
  { value: 'depth-first', label: 'Depth-First', color: '#9d4edd' },
  { value: 'breadth-first', label: 'Breadth-First', color: '#FFB627' },
  { value: 'hybrid', label: 'Hybrid', color: '#00ffff' },
];

const CONTEXT_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'sliding', label: 'Sliding Window', color: '#00ffff' },
  { value: 'summarize', label: 'Summarize', color: '#FFB627' },
  { value: 'rag-augmented', label: 'RAG Augmented', color: '#9d4edd' },
];

const STATUS_CONFIG: {[key: string]: { color: string; icon: typeof CheckCircle2; label: string }} = {
  pending: { color: '#FFB627', icon: Clock, label: 'Pending' },
  running: { color: '#00ffff', icon: Loader2, label: 'Running' },
  completed: { color: '#00ff88', icon: CheckCircle2, label: 'Completed' },
  failed: { color: '#E63946', icon: XCircle, label: 'Failed' },
};

const TASK_TYPE_CONFIG: {[key: string]: { color: string; label: string }} = {
  planning: { color: '#9d4edd', label: 'Planning' },
  reasoning: { color: '#00ffff', label: 'Reasoning' },
  'tool-selection': { color: '#FFB627', label: 'Tool Selection' },
  'memory-retrieval': { color: '#2E86AB', label: 'Memory Retrieval' },
  'agent-delegation': { color: '#00ff88', label: 'Agent Delegation' },
  'workflow-generation': { color: '#E8751A', label: 'Workflow Generation' },
  'knowledge-interaction': { color: '#FFB627', label: 'Knowledge' },
  'context-management': { color: '#00ffff', label: 'Context' },
  'task-decomposition': { color: '#9d4edd', label: 'Decomposition' },
  'multi-agent-coordination': { color: '#E63946', label: 'Multi-Agent' },
};

function generateId(): string {
  return `bt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(ts: number): string {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDuration(ms: number): string {
  if (!ms) return '--';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Glass Panel Wrapper ───
function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Section Header ───
function SectionHeader({ icon: Icon, title, color = '#9d4edd', badge }: { icon: typeof Brain; title: string; color?: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
        <Icon size={16} style={{ color }} /> {title}
      </h3>
      {badge && <span className="text-[9px] text-[#8888aa] font-mono tracking-wider">{badge}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN LAYER DASHBOARD
// ═══════════════════════════════════════════════════════════

export function BrainLayerDashboard() {
  const { brainConfig, updateBrainConfig, brainTasks, addBrainTask, updateBrainTask } = useOSStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoningInput, setReasoningInput] = useState('');
  const [activeSection, setActiveSection] = useState<'config' | 'tasks' | 'reasoning'>('config');

  const pendingCount = brainTasks.filter(t => t.status === 'pending').length;
  const runningCount = brainTasks.filter(t => t.status === 'running').length;
  const completedCount = brainTasks.filter(t => t.status === 'completed').length;
  const failedCount = brainTasks.filter(t => t.status === 'failed').length;

  // ─── Quick Actions ───
  const handlePlanTask = useCallback(() => {
    const task: BrainTask = {
      id: generateId(),
      type: 'planning',
      input: 'Plan a new task',
      status: 'running',
      tokensUsed: 0,
      latencyMs: 0,
      createdAt: Date.now(),
    };
    addBrainTask(task);
    // Simulate completion
    setTimeout(() => {
      updateBrainTask(task.id, {
        status: 'completed',
        output: `[Brain Layer] Task planned successfully using ${brainConfig.reasoningStyle} reasoning. Multi-step planning: ${brainConfig.multiStepPlanning ? 'enabled' : 'disabled'}. Context strategy: ${brainConfig.contextStrategy}.`,
        tokensUsed: Math.floor(Math.random() * 500 + 200),
        latencyMs: Math.floor(Math.random() * 1500 + 300),
        completedAt: Date.now(),
      });
    }, 2000);
  }, [brainConfig, addBrainTask, updateBrainTask]);

  const handleReasonAbout = useCallback(() => {
    if (!reasoningInput.trim()) {
      setReasoningInput('Analyze the current system state');
    }
    const input = reasoningInput.trim() || 'Analyze the current system state';
    const task: BrainTask = {
      id: generateId(),
      type: 'reasoning',
      input,
      status: 'running',
      tokensUsed: 0,
      latencyMs: 0,
      createdAt: Date.now(),
    };
    addBrainTask(task);
    setTimeout(() => {
      updateBrainTask(task.id, {
        status: 'completed',
        output: `[Brain Layer → ${brainConfig.reasoningStyle}] Analyzed: "${input.slice(0, 60)}...". Using ${brainConfig.memoryMethod} memory, ${brainConfig.contextStrategy} context. Temperature: ${brainConfig.temperature}. Self-reflection: ${brainConfig.selfReflection ? 'active' : 'inactive'}.`,
        tokensUsed: Math.floor(Math.random() * 800 + 300),
        latencyMs: Math.floor(Math.random() * 2000 + 500),
        completedAt: Date.now(),
      });
    }, 2500);
  }, [reasoningInput, brainConfig, addBrainTask, updateBrainTask]);

  const handleDelegateToAgent = useCallback(() => {
    const task: BrainTask = {
      id: generateId(),
      type: 'agent-delegation',
      input: 'Delegate task to specialized agent',
      status: 'running',
      tokensUsed: 0,
      latencyMs: 0,
      createdAt: Date.now(),
    };
    addBrainTask(task);
    setTimeout(() => {
      updateBrainTask(task.id, {
        status: 'completed',
        output: `[Brain Layer → Delegation] Task delegated. Agent delegation: ${brainConfig.agentDelegation ? 'enabled' : 'disabled'}. Selected best available agent for the task type. Monitoring execution progress.`,
        tokensUsed: Math.floor(Math.random() * 300 + 100),
        latencyMs: Math.floor(Math.random() * 800 + 200),
        completedAt: Date.now(),
      });
    }, 1500);
  }, [brainConfig, addBrainTask, updateBrainTask]);

  const handleGenerateWorkflow = useCallback(() => {
    const task: BrainTask = {
      id: generateId(),
      type: 'workflow-generation',
      input: 'Generate execution workflow',
      status: 'running',
      tokensUsed: 0,
      latencyMs: 0,
      createdAt: Date.now(),
    };
    addBrainTask(task);
    setTimeout(() => {
      updateBrainTask(task.id, {
        status: 'completed',
        output: `[Brain Layer → Workflow] Generated workflow with ${brainConfig.codingWorkflow} coding pattern. Research method: ${brainConfig.researchMethod}. Multi-step planning: ${brainConfig.multiStepPlanning ? 'active' : 'inactive'}. Workflow nodes: plan → reason → execute → verify → reflect.`,
        tokensUsed: Math.floor(Math.random() * 600 + 200),
        latencyMs: Math.floor(Math.random() * 1800 + 400),
        completedAt: Date.now(),
      });
    }, 2200);
  }, [brainConfig, addBrainTask, updateBrainTask]);

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <GlassPanel className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[rgba(157,78,221,0.08)] to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9d4edd] to-[#7B2CBF] flex items-center justify-center shadow-lg shadow-[#9d4edd]/20">
              <Brain size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl tracking-wide">{brainConfig.name}</h2>
              <p className="text-[#8888aa] text-xs mt-0.5">Provider-Independent Intelligence Layer</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pending', value: pendingCount, color: '#FFB627', icon: Clock },
              { label: 'Running', value: runningCount, color: '#00ffff', icon: Activity },
              { label: 'Completed', value: completedCount, color: '#00ff88', icon: CheckCircle2 },
              { label: 'Failed', value: failedCount, color: '#E63946', icon: XCircle },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-3 text-center"
                style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}
              >
                <stat.icon size={14} className="mx-auto mb-1" style={{ color: stat.color }} />
                <div className="text-white font-mono font-bold text-lg" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* ─── Tab Navigation ─── */}
      <div className="flex items-center gap-1">
        {[
          { id: 'config' as const, label: 'Configuration', icon: Settings2, color: '#9d4edd' },
          { id: 'tasks' as const, label: 'Active Tasks', icon: Activity, color: '#00ffff' },
          { id: 'reasoning' as const, label: 'Reasoning View', icon: Lightbulb, color: '#FFB627' },
        ].map(tab => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-medium transition-all ${
                isActive ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
              }`}
              style={isActive ? { background: `${tab.color}15`, border: `1px solid ${tab.color}30` } : { border: '1px solid transparent' }}
            >
              <tab.icon size={13} style={{ color: isActive ? tab.color : '#8888aa' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSection === 'config' && (
            <BrainConfigPanel />
          )}
          {activeSection === 'tasks' && (
            <BrainTasksPanel
              tasks={brainTasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          )}
          {activeSection === 'reasoning' && (
            <BrainReasoningView
              reasoningInput={reasoningInput}
              onReasoningInputChange={setReasoningInput}
              onReason={handleReasonAbout}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Quick Actions ─── */}
      <GlassPanel className="p-6">
        <SectionHeader icon={Zap} title="Quick Actions" color="#00ff88" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Plan Task', icon: Target, color: '#9d4edd', action: handlePlanTask, desc: 'Create a structured plan' },
            { label: 'Reason About', icon: Lightbulb, color: '#00ffff', action: handleReasonAbout, desc: 'Chain-of-thought analysis' },
            { label: 'Delegate to Agent', icon: Bot, color: '#00ff88', action: handleDelegateToAgent, desc: 'Assign to specialist agent' },
            { label: 'Generate Workflow', icon: Workflow, color: '#FFB627', action: handleGenerateWorkflow, desc: 'Create execution pipeline' },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.action}
              className="rounded-xl p-4 text-left transition-all group"
              style={{ background: `${action.color}08`, border: `1px solid ${action.color}20` }}
            >
              <action.icon size={20} className="mb-2 transition-colors" style={{ color: action.color }} />
              <div className="text-white text-xs font-semibold mb-1">{action.label}</div>
              <div className="text-[#8888aa] text-[9px]">{action.desc}</div>
            </motion.button>
          ))}
        </div>
      </GlassPanel>

      {/* ─── Brain Task History ─── */}
      {brainTasks.length > 0 && (
        <GlassPanel className="p-6">
          <SectionHeader icon={Clock} title="Task History" color="#00ffff" badge={`${brainTasks.length} TASKS`} />
          <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
            {brainTasks.slice(0, 20).map((task, i) => {
              const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const typeConf = TASK_TYPE_CONFIG[task.type] || { color: '#8888aa', label: task.type };
              const StatusIcon = statusConf.icon;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[rgba(157,78,221,0.05)] transition-colors cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <StatusIcon
                    size={14}
                    style={{ color: statusConf.color }}
                    className={task.status === 'running' ? 'animate-spin' : ''}
                  />
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ color: typeConf.color, background: `${typeConf.color}15`, border: `1px solid ${typeConf.color}25` }}
                  >
                    {typeConf.label}
                  </span>
                  <span className="text-[#ccccdd] text-[11px] flex-1 truncate">{task.input}</span>
                  <span className="text-[9px] text-[#8888aa] font-mono">{formatTime(task.createdAt)}</span>
                  {task.latencyMs > 0 && (
                    <span className="text-[8px] font-mono" style={{ color: task.latencyMs > 2000 ? '#E63946' : task.latencyMs > 1000 ? '#FFB627' : '#00ff88' }}>
                      {formatDuration(task.latencyMs)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>
      )}

      {/* ─── Selected Task Detail ─── */}
      <AnimatePresence>
        {selectedTaskId && (
          <BrainTaskPanel
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN CONFIG PANEL
// ═══════════════════════════════════════════════════════════

function BrainConfigPanel() {
  const { brainConfig, updateBrainConfig } = useOSStore();
  const [expandedSection, setExpandedSection] = useState<string>('reasoning');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  return (
    <div className="space-y-4">
      {/* ─── Identity ─── */}
      <GlassPanel className="p-6">
        <SectionHeader icon={Brain} title="Brain Identity" color="#9d4edd" />
        <div className="space-y-3">
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Name</label>
            <input
              type="text"
              value={brainConfig.name}
              onChange={(e) => updateBrainConfig({ name: e.target.value })}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[12px] text-white placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
            />
          </div>
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">System Prompt</label>
            <textarea
              value={brainConfig.systemPrompt}
              onChange={(e) => updateBrainConfig({ systemPrompt: e.target.value })}
              rows={3}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors resize-none"
            />
          </div>
        </div>
      </GlassPanel>

      {/* ─── Reasoning Style ─── */}
      <GlassPanel>
        <button
          onClick={() => toggleSection('reasoning')}
          className="w-full p-6 flex items-center justify-between hover:bg-[rgba(157,78,221,0.03)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-[#00ffff]" />
            <span className="text-white font-bold text-sm tracking-wider uppercase">Reasoning Style</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ color: '#00ffff', background: '#00ffff15', border: '1px solid #00ffff25' }}>
              {brainConfig.reasoningStyle}
            </span>
          </div>
          {expandedSection === 'reasoning' ? <ChevronDown size={14} className="text-[#8888aa]" /> : <ChevronRight size={14} className="text-[#8888aa]" />}
        </button>
        <AnimatePresence>
          {expandedSection === 'reasoning' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 space-y-2">
                {REASONING_OPTIONS.map((opt) => {
                  const isActive = brainConfig.reasoningStyle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateBrainConfig({ reasoningStyle: opt.value })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isActive ? 'ring-1' : 'hover:bg-[rgba(157,78,221,0.05)]'
                      }`}
                      style={isActive ? { background: `${opt.color}10`, ringColor: `${opt.color}40` } : {}}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${opt.color}15`, border: `1px solid ${opt.color}30` }}>
                        <opt.icon size={16} style={{ color: opt.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-xs font-semibold">{opt.label}</div>
                        <div className="text-[#8888aa] text-[9px]">{opt.description}</div>
                      </div>
                      {isActive && <CheckCircle2 size={14} style={{ color: opt.color }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>

      {/* ─── Memory Method ─── */}
      <GlassPanel>
        <button
          onClick={() => toggleSection('memory')}
          className="w-full p-6 flex items-center justify-between hover:bg-[rgba(157,78,221,0.03)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[#FFB627]" />
            <span className="text-white font-bold text-sm tracking-wider uppercase">Memory Method</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ color: '#FFB627', background: '#FFB62715', border: '1px solid #FFB62725' }}>
              {brainConfig.memoryMethod}
            </span>
          </div>
          {expandedSection === 'memory' ? <ChevronDown size={14} className="text-[#8888aa]" /> : <ChevronRight size={14} className="text-[#8888aa]" />}
        </button>
        <AnimatePresence>
          {expandedSection === 'memory' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MEMORY_OPTIONS.map((opt) => {
                  const isActive = brainConfig.memoryMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateBrainConfig({ memoryMethod: opt.value })}
                      className={`flex items-center gap-2 p-3 rounded-xl transition-all text-left ${isActive ? 'ring-1' : 'hover:bg-[rgba(157,78,221,0.05)]'}`}
                      style={isActive ? { background: `${opt.color}10`, ringColor: `${opt.color}40` } : {}}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      <div className="flex-1">
                        <div className="text-white text-xs font-semibold">{opt.label}</div>
                        <div className="text-[#8888aa] text-[8px]">{opt.description}</div>
                      </div>
                      {isActive && <CheckCircle2 size={12} style={{ color: opt.color }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>

      {/* ─── Coding & Research ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassPanel className="p-6">
          <SectionHeader icon={Route} title="Coding Workflow" color="#00ff88" badge={brainConfig.codingWorkflow} />
          <div className="space-y-1.5">
            {CODING_OPTIONS.map((opt) => {
              const isActive = brainConfig.codingWorkflow === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateBrainConfig({ codingWorkflow: opt.value })}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-all text-left ${isActive ? 'ring-1' : 'hover:bg-[rgba(157,78,221,0.05)]'}`}
                  style={isActive ? { background: `${opt.color}10`, ringColor: `${opt.color}40` } : {}}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                  <span className={`text-[11px] ${isActive ? 'text-white font-semibold' : 'text-[#ccccdd]'}`}>{opt.label}</span>
                  {isActive && <CheckCircle2 size={11} style={{ color: opt.color }} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <SectionHeader icon={Search} title="Research Method" color="#FFB627" badge={brainConfig.researchMethod} />
          <div className="space-y-1.5">
            {RESEARCH_OPTIONS.map((opt) => {
              const isActive = brainConfig.researchMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateBrainConfig({ researchMethod: opt.value })}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg transition-all text-left ${isActive ? 'ring-1' : 'hover:bg-[rgba(157,78,221,0.05)]'}`}
                  style={isActive ? { background: `${opt.color}10`, ringColor: `${opt.color}40` } : {}}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                  <span className={`text-[11px] ${isActive ? 'text-white font-semibold' : 'text-[#ccccdd]'}`}>{opt.label}</span>
                  {isActive && <CheckCircle2 size={11} style={{ color: opt.color }} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </GlassPanel>
      </div>

      {/* ─── Parameters ─── */}
      <GlassPanel className="p-6">
        <SectionHeader icon={Thermometer} title="Brain Parameters" color="#9d4edd" />
        <div className="space-y-5">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-[#ccccdd] font-medium flex items-center gap-1.5">
                <Thermometer size={12} className="text-[#E8751A]" /> Temperature
              </label>
              <span className="text-[11px] font-mono font-bold text-[#E8751A]">{brainConfig.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={brainConfig.temperature}
              onChange={(e) => updateBrainConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer accent-[#E8751A]"
            />
            <div className="flex justify-between text-[8px] text-[#8888aa] mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Top P */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-[#ccccdd] font-medium flex items-center gap-1.5">
                <Scale size={12} className="text-[#00ffff]" /> Top P
              </label>
              <span className="text-[11px] font-mono font-bold text-[#00ffff]">{brainConfig.topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={brainConfig.topP}
              onChange={(e) => updateBrainConfig({ topP: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer accent-[#00ffff]"
            />
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-[#ccccdd] font-medium">Max Tokens</label>
              <span className="text-[11px] font-mono font-bold text-[#9d4edd]">{brainConfig.maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="16384"
              step="256"
              value={brainConfig.maxTokens}
              onChange={(e) => updateBrainConfig({ maxTokens: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer accent-[#9d4edd]"
            />
          </div>

          {/* Context Strategy */}
          <div>
            <label className="text-[10px] text-[#ccccdd] font-medium block mb-2">Context Strategy</label>
            <div className="flex gap-2">
              {CONTEXT_OPTIONS.map((opt) => {
                const isActive = brainConfig.contextStrategy === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateBrainConfig({ contextStrategy: opt.value as BrainConfig['contextStrategy'] })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-medium transition-all ${isActive ? 'text-white' : 'text-[#8888aa] hover:text-white'}`}
                    style={isActive ? { background: `${opt.color}15`, border: `1px solid ${opt.color}30` } : { border: '1px solid rgba(157,78,221,0.1)' }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ─── Toggles ─── */}
      <GlassPanel className="p-6">
        <SectionHeader icon={ToggleLeft} title="Brain Capabilities" color="#00ff88" />
        <div className="space-y-3">
          {[
            { key: 'agentDelegation' as const, label: 'Agent Delegation', desc: 'Allow the Brain to delegate tasks to specialized agents', icon: Bot, color: '#00ff88' },
            { key: 'selfReflection' as const, label: 'Self Reflection', desc: 'Enable the Brain to critique and refine its own output', icon: Lightbulb, color: '#FFB627' },
            { key: 'multiStepPlanning' as const, label: 'Multi-Step Planning', desc: 'Plan complex tasks as a sequence of smaller steps', icon: Layers, color: '#9d4edd' },
          ].map((toggle) => (
            <div
              key={toggle.key}
              className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-[rgba(157,78,221,0.04)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${toggle.color}10`, border: `1px solid ${toggle.color}20` }}>
                  <toggle.icon size={14} style={{ color: toggle.color }} />
                </div>
                <div>
                  <div className="text-white text-xs font-semibold">{toggle.label}</div>
                  <div className="text-[#8888aa] text-[9px]">{toggle.desc}</div>
                </div>
              </div>
              <button
                onClick={() => updateBrainConfig({ [toggle.key]: !brainConfig[toggle.key] })}
                className="w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0"
                style={{ backgroundColor: brainConfig[toggle.key] ? toggle.color : 'rgba(136,136,170,0.3)' }}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${
                    brainConfig[toggle.key] ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN TASKS PANEL
// ═══════════════════════════════════════════════════════════

function BrainTasksPanel({
  tasks,
  selectedTaskId,
  onSelectTask,
}: {
  tasks: BrainTask[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}) {
  const { updateBrainTask } = useOSStore();

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const runningTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  const sections = [
    { label: 'Running', tasks: runningTasks, color: '#00ffff', emptyText: 'No running tasks' },
    { label: 'Pending', tasks: pendingTasks, color: '#FFB627', emptyText: 'No pending tasks' },
    { label: 'Completed', tasks: completedTasks, color: '#00ff88', emptyText: 'No completed tasks' },
    { label: 'Failed', tasks: failedTasks, color: '#E63946', emptyText: 'No failed tasks' },
  ];

  return (
    <GlassPanel className="p-6">
      <SectionHeader icon={Activity} title="Active Brain Tasks" color="#00ffff" badge={`${tasks.length} TOTAL`} />
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: section.color }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: section.color }}>{section.label}</span>
              <span className="text-[9px] text-[#8888aa] font-mono">({section.tasks.length})</span>
            </div>
            {section.tasks.length === 0 ? (
              <div className="text-[#8888aa] text-[10px] pl-4">{section.emptyText}</div>
            ) : (
              <div className="space-y-1.5 pl-4">
                {section.tasks.map((task) => {
                  const typeConf = TASK_TYPE_CONFIG[task.type] || { color: '#8888aa', label: task.type };
                  const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConf.icon;
                  const isSelected = selectedTaskId === task.id;
                  return (
                    <motion.div
                      key={task.id}
                      whileHover={{ x: 4 }}
                      onClick={() => onSelectTask(isSelected ? null : task.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-[rgba(157,78,221,0.1)] ring-1 ring-[rgba(157,78,221,0.3)]' : 'hover:bg-[rgba(157,78,221,0.05)]'
                      }`}
                    >
                      <StatusIcon size={12} style={{ color: statusConf.color }} className={task.status === 'running' ? 'animate-spin' : ''} />
                      <span
                        className="text-[7px] font-bold px-1 py-0.5 rounded uppercase tracking-wider"
                        style={{ color: typeConf.color, background: `${typeConf.color}15` }}
                      >
                        {typeConf.label}
                      </span>
                      <span className="text-[#ccccdd] text-[10px] flex-1 truncate">{task.input}</span>
                      {task.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateBrainTask(task.id, { status: 'running' }); }}
                          className="p-1 rounded hover:bg-[rgba(157,78,221,0.1)]"
                          aria-label="Run task"
                        >
                          <Play size={10} className="text-[#00ff88]" />
                        </button>
                      )}
                      <span className="text-[8px] text-[#8888aa] font-mono">{formatTime(task.createdAt)}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN TASK PANEL (Detail View)
// ═══════════════════════════════════════════════════════════

export function BrainTaskPanel({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { brainTasks, updateBrainTask } = useOSStore();
  const task = brainTasks.find(t => t.id === taskId);

  if (!task) {
    return (
      <GlassPanel className="p-6 text-center">
        <div className="text-[#8888aa] text-xs">Task not found</div>
        <button onClick={onClose} className="mt-2 text-[#9d4edd] text-xs hover:underline">Close</button>
      </GlassPanel>
    );
  }

  const typeConf = TASK_TYPE_CONFIG[task.type] || { color: '#8888aa', label: task.type };
  const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${typeConf.color}15`, border: `1px solid ${typeConf.color}30` }}>
              <StatusIcon size={18} style={{ color: statusConf.color }} className={task.status === 'running' ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">Task Detail</span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ color: typeConf.color, background: `${typeConf.color}15`, border: `1px solid ${typeConf.color}25` }}>
                  {typeConf.label}
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ color: statusConf.color, background: `${statusConf.color}15`, border: `1px solid ${statusConf.color}25` }}>
                  {statusConf.label}
                </span>
              </div>
              <div className="text-[9px] text-[#8888aa] font-mono mt-0.5">ID: {task.id}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors p-1" aria-label="Close">
            <XCircle size={16} />
          </button>
        </div>

        {/* Task details */}
        <div className="space-y-3">
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Input</label>
            <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-[11px] text-[#ccccdd]">{task.input}</div>
          </div>

          {task.output && (
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Output</label>
              <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-3 text-[11px] text-[#00ff88] font-mono whitespace-pre-wrap">{task.output}</div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg p-2.5 text-center" style={{ background: `${statusConf.color}08`, border: `1px solid ${statusConf.color}15` }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Tokens</div>
              <div className="text-white text-[11px] font-mono font-bold">{task.tokensUsed.toLocaleString()}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: '#00ffff08', border: '1px solid #00ffff15' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Latency</div>
              <div className="text-white text-[11px] font-mono font-bold">{formatDuration(task.latencyMs)}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: '#FFB62708', border: '1px solid #FFB62715' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Created</div>
              <div className="text-white text-[11px] font-mono font-bold">{formatTime(task.createdAt)}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: '#9d4edd08', border: '1px solid #9d4edd15' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Completed</div>
              <div className="text-white text-[11px] font-mono font-bold">{task.completedAt ? formatTime(task.completedAt) : '--'}</div>
            </div>
          </div>

          {task.providerUsed && (
            <div className="text-[9px] text-[#8888aa]">Provider: <span className="text-[#9d4edd]">{task.providerUsed}</span> | Model: <span className="text-[#00ffff]">{task.modelUsed}</span></div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {task.status === 'pending' && (
              <button
                onClick={() => updateBrainTask(task.id, { status: 'running' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-colors"
              >
                <Play size={10} /> Run
              </button>
            )}
            {task.status === 'running' && (
              <button
                onClick={() => updateBrainTask(task.id, { status: 'completed', completedAt: Date.now(), output: '[Manual] Task marked as completed' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-colors"
              >
                <CheckCircle2 size={10} /> Complete
              </button>
            )}
            {task.status === 'failed' && (
              <button
                onClick={() => updateBrainTask(task.id, { status: 'pending' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[rgba(157,78,221,0.1)] border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.15)] transition-colors"
              >
                <RefreshCw size={10} /> Retry
              </button>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// BRAIN REASONING VIEW
// ═══════════════════════════════════════════════════════════

export function BrainReasoningView({
  reasoningInput,
  onReasoningInputChange,
  onReason,
}: {
  reasoningInput: string;
  onReasoningInputChange: (v: string) => void;
  onReason: () => void;
}) {
  const { brainConfig, brainTasks } = useOSStore();
  const [steps, setSteps] = useState<{ text: string; color: string; icon: typeof Brain }[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const reasoningTasks = brainTasks.filter(t => t.type === 'reasoning');
  const latestReasoning = reasoningTasks[0];

  const handleReason = useCallback(() => {
    setIsThinking(true);
    const input = reasoningInput.trim() || 'Analyze the current system state';

    // Simulate chain-of-thought steps
    const styleSteps: {[key: string]: Array<{ text: string; color: string; icon: typeof Brain }>} = {
      'chain-of-thought': [
        { text: `Observing: "${input.slice(0, 50)}..."`, color: '#00ffff', icon: Eye },
        { text: 'Step 1: Identifying key concepts and relationships', color: '#9d4edd', icon: Search },
        { text: 'Step 2: Applying reasoning patterns', color: '#FFB627', icon: Lightbulb },
        { text: 'Step 3: Synthesizing conclusions', color: '#00ff88', icon: CheckCircle2 },
      ],
      'tree-of-thought': [
        { text: `Root: "${input.slice(0, 50)}..."`, color: '#9d4edd', icon: GitBranch },
        { text: 'Branch A: Exploring primary hypothesis', color: '#00ffff', icon: ArrowRight },
        { text: 'Branch B: Exploring alternative approach', color: '#FFB627', icon: ArrowRight },
        { text: 'Merging: Selecting best path', color: '#00ff88', icon: CheckCircle2 },
      ],
      'react': [
        { text: `Thought: Understanding "${input.slice(0, 50)}..."`, color: '#9d4edd', icon: Lightbulb },
        { text: 'Action: Retrieve relevant context', color: '#00ffff', icon: Zap },
        { text: 'Observation: Data gathered successfully', color: '#FFB627', icon: Eye },
        { text: 'Thought: Formulating response', color: '#00ff88', icon: CheckCircle2 },
      ],
      'plan-and-execute': [
        { text: `Planning: Breaking down "${input.slice(0, 50)}..."`, color: '#9d4edd', icon: Target },
        { text: 'Step 1/3: Gathering information', color: '#00ffff', icon: Search },
        { text: 'Step 2/3: Processing and analyzing', color: '#FFB627', icon: Cpu },
        { text: 'Step 3/3: Generating output', color: '#00ff88', icon: CheckCircle2 },
      ],
      'reflection': [
        { text: `Initial: Processing "${input.slice(0, 50)}..."`, color: '#9d4edd', icon: Brain },
        { text: 'Critique: Identifying weaknesses in reasoning', color: '#E63946', icon: Eye },
        { text: 'Revision: Improving analysis', color: '#FFB627', icon: RefreshCw },
        { text: 'Final: Refined conclusion', color: '#00ff88', icon: CheckCircle2 },
      ],
    };

    const selectedSteps = styleSteps[brainConfig.reasoningStyle] || styleSteps['chain-of-thought'];
    setSteps([]);

    selectedSteps.forEach((step, i) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (i === selectedSteps.length - 1) {
          setIsThinking(false);
          onReason();
        }
      }, (i + 1) * 800);
    });
  }, [reasoningInput, brainConfig.reasoningStyle, onReason]);

  return (
    <div className="space-y-4">
      {/* Input */}
      <GlassPanel className="p-6">
        <SectionHeader icon={Lightbulb} title="Interactive Reasoning" color="#FFB627" badge={brainConfig.reasoningStyle.toUpperCase()} />
        <div className="flex gap-2">
          <input
            type="text"
            value={reasoningInput}
            onChange={(e) => onReasoningInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isThinking && handleReason()}
            placeholder="What should the Brain reason about?"
            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2.5 text-[12px] text-white placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
          />
          <button
            onClick={handleReason}
            disabled={isThinking}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#9d4edd] to-[#7B2CBF] text-white text-[11px] font-semibold hover:from-[#7B2CBF] hover:to-[#6a25a8] transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isThinking ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
            {isThinking ? 'Thinking...' : 'Reason'}
          </button>
        </div>
      </GlassPanel>

      {/* Reasoning Steps */}
      {steps.length > 0 && (
        <GlassPanel className="p-6">
          <SectionHeader icon={GitBranch} title="Reasoning Chain" color="#9d4edd" />
          <div className="space-y-3">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3"
              >
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                    <step.icon size={12} style={{ color: step.color }} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-4 mt-1" style={{ backgroundColor: `${step.color}30` }} />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <span className="text-[11px] text-[#ccccdd]">{step.text}</span>
                </div>
              </motion.div>
            ))}
            {isThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 pl-10"
              >
                <Loader2 size={12} className="animate-spin text-[#9d4edd]" />
                <span className="text-[10px] text-[#8888aa]">Brain is thinking...</span>
              </motion.div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Latest Reasoning Result */}
      {latestReasoning && latestReasoning.output && (
        <GlassPanel className="p-6">
          <SectionHeader icon={CheckCircle2} title="Latest Reasoning Result" color="#00ff88" />
          <div className="bg-[rgba(10,10,26,0.5)] rounded-lg p-4 text-[11px] text-[#ccccdd] whitespace-pre-wrap border border-[rgba(0,255,136,0.1)]">
            {latestReasoning.output}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-[9px] text-[#8888aa]">Tokens: <span className="text-[#00ffff] font-mono">{latestReasoning.tokensUsed}</span></span>
            <span className="text-[9px] text-[#8888aa]">Latency: <span className="text-[#FFB627] font-mono">{formatDuration(latestReasoning.latencyMs)}</span></span>
            <span className="text-[9px] text-[#8888aa]">Time: <span className="text-[#9d4edd] font-mono">{formatTime(latestReasoning.createdAt)}</span></span>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
