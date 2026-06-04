'use client';

import {
  useOSStore,
  type ProviderConfig,
  type BrainConfig,
  type ModelRouterConfig,
  type ReasoningStyle,
  type MemoryMethod,
  type CodingWorkflow,
  type ResearchMethod,
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Server, Brain, Cpu, Shield, Route, Plus, X, Check,
  Eye, EyeOff, RefreshCw, Trash2, Save, ChevronDown, ChevronRight,
  Cloud, HardDrive, Zap, DollarSign, Activity,
  Star, Layers, Award, Users, AlertTriangle,
  Sparkles, Search as SearchIcon, Wrench, Database,
  Lock, Code, BookOpen, Gem,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const TAB_ITEMS = [
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'brain', label: 'Brain Layer', icon: Brain },
  { id: 'gemini', label: 'Gemini CLI', icon: Gem },
  { id: 'router', label: 'Model Router', icon: Route },
  { id: 'budget', label: 'Budget', icon: DollarSign },
] as const;

type TabId = (typeof TAB_ITEMS)[number]['id'];

const HEALTH_COLORS: {[key: string]: string} = {
  healthy: '#00ff88',
  degraded: '#FFB627',
  offline: '#ff4444',
  unknown: '#8888aa',
};

const ROUTING_MODES: ModelRouterConfig['mode'][] = [
  'automatic', 'fastest', 'cheapest', 'highest-quality',
  'reasoning-first', 'coding-first', 'research-first',
  'vision-first', 'multi-agent-consensus',
];

const ROUTING_LABELS: {[key: string]: string} = {
  'automatic': 'Automatic',
  'fastest': 'Fastest',
  'cheapest': 'Cheapest',
  'highest-quality': 'Highest Quality',
  'reasoning-first': 'Reasoning First',
  'coding-first': 'Coding First',
  'research-first': 'Research First',
  'vision-first': 'Vision First',
  'multi-agent-consensus': 'Multi-Agent Consensus',
};

const ROUTING_ICONS: {[key: string]: typeof Zap} = {
  'automatic': Sparkles,
  'fastest': Zap,
  'cheapest': DollarSign,
  'highest-quality': Award,
  'reasoning-first': Brain,
  'coding-first': Code,
  'research-first': BookOpen,
  'vision-first': Eye,
  'multi-agent-consensus': Users,
};

const REASONING_LABELS: {[key: string]: string} = {
  'chain-of-thought': 'Chain of Thought',
  'tree-of-thought': 'Tree of Thought',
  'react': 'ReAct',
  'plan-and-execute': 'Plan & Execute',
  'reflection': 'Reflection',
};

const TOOL_LABELS: {[key: string]: string} = {
  'aggressive': 'Aggressive',
  'conservative': 'Conservative',
  'adaptive': 'Adaptive',
};

const MEMORY_LABELS: {[key: string]: string} = {
  'short-term': 'Short-Term',
  'long-term': 'Long-Term',
  'semantic': 'Semantic',
  'episodic': 'Episodic',
  'full': 'Full',
};

const CODING_LABELS: {[key: string]: string} = {
  'iterative': 'Iterative',
  'plan-first': 'Plan First',
  'test-driven': 'Test-Driven',
  'debug-first': 'Debug First',
};

const RESEARCH_LABELS: {[key: string]: string} = {
  'depth-first': 'Depth-First',
  'breadth-first': 'Breadth-First',
  'hybrid': 'Hybrid',
};

const CONTEXT_LABELS: {[key: string]: string} = {
  'sliding': 'Sliding Window',
  'summarize': 'Summarize',
  'rag-augmented': 'RAG-Augmented',
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function formatTimestamp(ts: number): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ═══════════════════════════════════════════════════════════
   GLASS PANEL WRAPPER
   ═══════════════════════════════════════════════════════════ */

function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOGGLE SWITCH
   ═══════════════════════════════════════════════════════════ */

function ToggleSwitch({ checked, onChange, color = '#7B2CBF' }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked); } }}
      className="w-10 h-5 rounded-full transition-all duration-200 relative flex-shrink-0 cursor-pointer"
      style={{ backgroundColor: checked ? color : 'rgba(136,136,170,0.3)' }}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN SETTINGS PANEL
   ═══════════════════════════════════════════════════════════ */

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('providers');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Settings size={16} className="text-[#9d4edd]" />
          Settings
        </h2>
        <span className="text-[9px] text-[#8888aa] font-mono tracking-wider">SYSTEM CONFIGURATION</span>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {TAB_ITEMS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                isActive ? 'text-white' : 'text-[#8888aa] hover:text-white hover:bg-[rgba(157,78,221,0.08)]'
              }`}
              style={isActive ? { background: 'rgba(157,78,221,0.15)', border: '1px solid rgba(157,78,221,0.3)' } : { border: '1px solid transparent' }}
            >
              <tab.icon size={12} style={{ color: isActive ? '#9d4edd' : '#8888aa' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'providers' && <ProvidersTab />}
          {activeTab === 'brain' && <BrainLayerTab />}
          {activeTab === 'gemini' && <GeminiCLITab />}
          {activeTab === 'router' && <ModelRouterTab />}
          {activeTab === 'budget' && <BudgetTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROVIDERS TAB
   ═══════════════════════════════════════════════════════════ */

function ProvidersTab() {
  const { providers, addProvider, updateProvider, removeProvider } = useOSStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<ProviderConfig> | null>(null);
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{[key: string]: { ok: boolean; msg: string }}>({});

  const startEdit = (provider: ProviderConfig) => {
    setEditDraft({ ...provider });
    setExpandedId(expandedId === provider.id ? null : provider.id);
  };

  const cancelEdit = () => {
    setEditDraft(null);
    setExpandedId(null);
  };

  const saveEdit = () => {
    if (!editDraft || !expandedId) return;
    updateProvider(expandedId, editDraft);
    setEditDraft(null);
    setExpandedId(null);
  };

  const testConnection = async (provider: ProviderConfig) => {
    setTestingId(provider.id);
    setTestResult(prev => ({ ...prev, [provider.id]: { ok: false, msg: 'Testing...' } }));
    try {
      const endpoint = editDraft?.apiEndpoint ?? provider.apiEndpoint;
      const apiKey = editDraft?.apiKey ?? provider.apiKey;
      const model = editDraft?.defaultModel ?? provider.defaultModel;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });
      const ok = res.ok;
      let msg = ok ? 'Connection successful' : 'Connection failed';
      try {
        const data = await res.json();
        if (!ok && data.error?.message) msg = data.error.message;
      } catch {
        // ignore parse errors
      }
      setTestResult(prev => ({ ...prev, [provider.id]: { ok, msg } }));
      updateProvider(provider.id, {
        healthStatus: ok ? 'healthy' : 'offline',
        lastHealthCheck: Date.now(),
      });
    } catch {
      setTestResult(prev => ({
        ...prev,
        [provider.id]: { ok: false, msg: 'Network error — could not reach endpoint' },
      }));
      updateProvider(provider.id, { healthStatus: 'offline', lastHealthCheck: Date.now() });
    } finally {
      setTimeout(() => setTestingId(null), 500);
    }
  };

  /* Custom provider form state */
  const [customName, setCustomName] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');

  const addCustomProvider = () => {
    if (!customName.trim() || !customEndpoint.trim()) return;
    const id = `custom-${Date.now()}`;
    addProvider({
      id,
      name: customName.trim(),
      type: 'custom',
      apiEndpoint: customEndpoint.trim(),
      apiKey: customApiKey,
      models: customModel ? [customModel] : [],
      defaultModel: customModel || '',
      enabled: false,
      healthStatus: 'unknown',
      lastHealthCheck: 0,
      rateLimit: { rpm: 60, tpm: 100000 },
      costConfig: { alertThreshold: 50, hardStop: false, dailyLimit: 50, monthlyLimit: 500 },
      priority: 99,
      icon: '🔧',
      color: '#00ff88',
      description: 'Custom provider',
      website: '',
      supportsStreaming: true,
      supportsVision: false,
      supportsTools: true,
      maxContextTokens: 128000,
    });
    setCustomName('');
    setCustomEndpoint('');
    setCustomApiKey('');
    setCustomModel('');
    setShowAddCustom(false);
  };

  return (
    <div className="space-y-3">
      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {providers.map((provider, i) => {
          const isExpanded = expandedId === provider.id;
          const healthColor = HEALTH_COLORS[provider.healthStatus] || '#8888aa';
          const TypeIcon = provider.type === 'local' ? HardDrive : provider.type === 'cli' ? Zap : provider.type === 'custom' ? Wrench : Cloud;
          const result = testResult[provider.id];

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                isExpanded ? 'col-span-1 md:col-span-2 xl:col-span-3' : ''
              }`}
              style={{
                borderColor: `${provider.color || '#9d4edd'}25`,
                background: `linear-gradient(135deg, ${provider.color || '#9d4edd'}06, ${provider.color || '#9d4edd'}02)`,
              }}
            >
              {/* Provider Card Header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => startEdit(provider)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(provider); } }}
                className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(157,78,221,0.04)] transition-colors text-left cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: `${provider.color || '#9d4edd'}15`, border: `1px solid ${provider.color || '#9d4edd'}30` }}
                >
                  {provider.icon || '🔌'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-xs">{provider.name}</span>
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        color: provider.type === 'local' ? '#1B998B' : provider.type === 'custom' ? '#00ff88' : provider.type === 'cli' ? '#4285F4' : '#FFB627',
                        background: provider.type === 'local' ? '#1B998B15' : provider.type === 'custom' ? '#00ff8815' : provider.type === 'cli' ? '#4285F415' : '#FFB62715',
                        border: `1px solid ${provider.type === 'local' ? '#1B998B30' : provider.type === 'custom' ? '#00ff8830' : provider.type === 'cli' ? '#4285F430' : '#FFB62730'}`,
                      }}
                    >
                      <TypeIcon size={8} className="inline mr-0.5" />
                      {provider.type}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#8888aa] font-mono truncate mt-0.5">{provider.apiEndpoint}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Health Indicator */}
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${provider.healthStatus === 'healthy' ? 'animate-pulse-glow' : ''}`} style={{ backgroundColor: healthColor }} />
                    <span className="text-[8px] font-mono font-bold uppercase" style={{ color: healthColor }}>
                      {provider.healthStatus}
                    </span>
                  </div>
                  {/* Enabled Toggle */}
                  <div
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onKeyDown={(e) => { e.stopPropagation(); }}
                    className="flex items-center gap-1"
                  >
                    <ToggleSwitch
                      checked={provider.enabled}
                      onChange={(v) => { updateProvider(provider.id, { enabled: v }); }}
                      color={provider.color || '#7B2CBF'}
                    />
                  </div>
                  {isExpanded ? <ChevronDown size={12} className="text-[#8888aa]" /> : <ChevronRight size={12} className="text-[#8888aa]" />}
                </div>
              </div>

              {/* Expanded Inline Editor */}
              <AnimatePresence>
                {isExpanded && editDraft && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-[rgba(157,78,221,0.1)] space-y-3">
                      {/* API Endpoint */}
                      <div>
                        <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">API Endpoint</label>
                        <input
                          type="text"
                          value={editDraft.apiEndpoint ?? ''}
                          onChange={(e) => setEditDraft({ ...editDraft, apiEndpoint: e.target.value })}
                          className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                          placeholder="https://api.example.com/v1"
                        />
                      </div>

                      {/* API Key */}
                      <div>
                        <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">API Key</label>
                        <div className="flex items-center gap-2">
                          <input
                            type={showApiKey[provider.id] ? 'text' : 'password'}
                            value={editDraft.apiKey ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, apiKey: e.target.value })}
                            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                            placeholder="sk-..."
                          />
                          <button
                            onClick={() => setShowApiKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                            className="p-2 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] transition-colors flex-shrink-0"
                          >
                            {showApiKey[provider.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Default Model */}
                      <div>
                        <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Default Model</label>
                        <select
                          value={editDraft.defaultModel ?? ''}
                          onChange={(e) => setEditDraft({ ...editDraft, defaultModel: e.target.value })}
                          className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                        >
                          {(editDraft.models ?? provider.models).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rate Limit Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Rate Limit RPM</label>
                          <input
                            type="number"
                            value={editDraft.rateLimit?.rpm ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, rateLimit: { ...editDraft.rateLimit!, rpm: Number(e.target.value) } })}
                            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Rate Limit TPM</label>
                          <input
                            type="number"
                            value={editDraft.rateLimit?.tpm ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, rateLimit: { ...editDraft.rateLimit!, tpm: Number(e.target.value) } })}
                            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                            min={0}
                          />
                        </div>
                      </div>

                      {/* Cost Config Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Daily Limit ($)</label>
                          <input
                            type="number"
                            value={editDraft.costConfig?.dailyLimit ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, costConfig: { ...editDraft.costConfig!, dailyLimit: Number(e.target.value) } })}
                            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Monthly Limit ($)</label>
                          <input
                            type="number"
                            value={editDraft.costConfig?.monthlyLimit ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, costConfig: { ...editDraft.costConfig!, monthlyLimit: Number(e.target.value) } })}
                            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                            min={0}
                          />
                        </div>
                      </div>

                      {/* Test Result */}
                      {result && (
                        <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-[10px] ${
                          result.ok ? 'border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.06)]' : 'border-[rgba(255,68,68,0.2)] bg-[rgba(255,68,68,0.06)]'
                        }`}>
                          {result.ok ? <Check size={12} className="text-[#00ff88]" /> : <AlertTriangle size={12} className="text-[#ff4444]" />}
                          <span className={result.ok ? 'text-[#00ff88]' : 'text-[#ff4444]'}>{result.msg}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => testConnection(provider)}
                          disabled={testingId === provider.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all disabled:opacity-50"
                          style={{ borderColor: `${provider.color || '#9d4edd'}30`, color: provider.color || '#9d4edd', background: `${provider.color || '#9d4edd'}08` }}
                        >
                          <RefreshCw size={10} className={testingId === provider.id ? 'animate-spin' : ''} />
                          {testingId === provider.id ? 'Testing...' : 'Test Connection'}
                        </button>
                        <div className="flex-1" />
                        {provider.type === 'custom' && (
                          <button
                            onClick={() => { removeProvider(provider.id); cancelEdit(); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(255,68,68,0.2)] text-[#ff4444] text-[10px] font-medium hover:bg-[rgba(255,68,68,0.06)] transition-colors"
                          >
                            <Trash2 size={10} /> Remove
                          </button>
                        )}
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[10px] font-medium hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors"
                        >
                          <X size={10} /> Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border text-[10px] font-medium text-white transition-all"
                          style={{ background: `linear-gradient(135deg, ${provider.color || '#7B2CBF'}cc, ${provider.color || '#7B2CBF'}88)`, borderColor: `${provider.color || '#7B2CBF'}40` }}
                        >
                          <Save size={10} /> Save
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Add Custom Provider */}
      <GlassPanel>
        {showAddCustom ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
                <Plus size={12} className="text-[#00ff88]" /> Add Custom Provider
              </h3>
              <button onClick={() => setShowAddCustom(false)} className="text-[#8888aa] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Provider Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="My Custom API"
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">API Key</label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Default Model ID</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="my-model-v1"
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
              </div>
            </div>
            <button
              onClick={addCustomProvider}
              disabled={!customName.trim() || !customEndpoint.trim()}
              className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00ff88cc, #00ff8888)' }}
            >
              Add Custom Provider
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full p-3 flex items-center justify-center gap-2 text-[10px] text-[#8888aa] hover:text-[#00ff88] transition-colors"
          >
            <Plus size={12} /> Add Custom Provider (OpenAI-Compatible)
          </button>
        )}
      </GlassPanel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BRAIN LAYER TAB
   ═══════════════════════════════════════════════════════════ */

function BrainLayerTab() {
  const { brainConfig, updateBrainConfig, brainTasks } = useOSStore();
  const [editDraft, setEditDraft] = useState<Partial<BrainConfig>>({ ...brainConfig });
  const [isEditing, setIsEditing] = useState(false);

  const cancelEdit = () => {
    setEditDraft({ ...brainConfig });
    setIsEditing(false);
  };

  const saveEdit = () => {
    updateBrainConfig(editDraft);
    setIsEditing(false);
  };

  const recentTasks = brainTasks.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Brain Config Card */}
      <GlassPanel className="overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: '#9d4edd15', border: '1px solid #9d4edd30' }}>
                <Brain size={16} style={{ color: '#9d4edd' }} />
              </div>
              <div>
                <div className="text-white font-semibold text-xs">{isEditing ? editDraft.name : brainConfig.name}</div>
                <div className="text-[8px] text-[#8888aa] font-mono">Native Intelligence Layer</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] text-[#00ff88] font-bold border border-[rgba(0,255,136,0.2)]">
                ACTIVE
              </span>
              {!isEditing && (
                <button
                  onClick={() => { setEditDraft({ ...brainConfig }); setIsEditing(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#9d4edd] text-[9px] font-medium hover:bg-[rgba(157,78,221,0.06)] transition-colors"
                >
                  <Wrench size={9} /> Edit Config
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Name</label>
                <input
                  type="text"
                  value={editDraft.name ?? ''}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">System Prompt</label>
                <textarea
                  value={editDraft.systemPrompt ?? ''}
                  onChange={(e) => setEditDraft({ ...editDraft, systemPrompt: e.target.value })}
                  rows={3}
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors resize-none"
                />
              </div>

              {/* Config Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Reasoning Style */}
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Reasoning Style</label>
                  <select
                    value={editDraft.reasoningStyle ?? 'chain-of-thought'}
                    onChange={(e) => setEditDraft({ ...editDraft, reasoningStyle: e.target.value as ReasoningStyle })}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  >
                    {Object.entries(REASONING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* Tool Usage */}
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Tool Usage</label>
                  <select
                    value={editDraft.toolUsagePattern ?? 'adaptive'}
                    onChange={(e) => setEditDraft({ ...editDraft, toolUsagePattern: e.target.value as BrainConfig['toolUsagePattern'] })}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  >
                    {Object.entries(TOOL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* Memory Method */}
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Memory Method</label>
                  <select
                    value={editDraft.memoryMethod ?? 'full'}
                    onChange={(e) => setEditDraft({ ...editDraft, memoryMethod: e.target.value as MemoryMethod })}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  >
                    {Object.entries(MEMORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* Coding Workflow */}
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Coding Workflow</label>
                  <select
                    value={editDraft.codingWorkflow ?? 'iterative'}
                    onChange={(e) => setEditDraft({ ...editDraft, codingWorkflow: e.target.value as CodingWorkflow })}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  >
                    {Object.entries(CODING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* Research Method */}
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Research Method</label>
                  <select
                    value={editDraft.researchMethod ?? 'hybrid'}
                    onChange={(e) => setEditDraft({ ...editDraft, researchMethod: e.target.value as ResearchMethod })}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  >
                    {Object.entries(RESEARCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {/* Context Strategy */}
                <div>
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Context Strategy</label>
                  <select
                    value={editDraft.contextStrategy ?? 'rag-augmented'}
                    onChange={(e) => setEditDraft({ ...editDraft, contextStrategy: e.target.value as BrainConfig['contextStrategy'] })}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  >
                    {Object.entries(CONTEXT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Temperature & Top P */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Temperature</label>
                    <span className="text-[9px] font-mono text-[#FFB627]">{editDraft.temperature ?? 0.7}</span>
                  </div>
                  <input
                    type="range" min={0} max={2} step={0.1}
                    value={editDraft.temperature ?? 0.7}
                    onChange={(e) => setEditDraft({ ...editDraft, temperature: Number(e.target.value) })}
                    className="w-full accent-[#7B2CBF] h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Top P</label>
                    <span className="text-[9px] font-mono text-[#FFB627]">{editDraft.topP ?? 0.9}</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={editDraft.topP ?? 0.9}
                    onChange={(e) => setEditDraft({ ...editDraft, topP: Number(e.target.value) })}
                    className="w-full accent-[#7B2CBF] h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={editDraft.maxTokens ?? 4096}
                  onChange={(e) => setEditDraft({ ...editDraft, maxTokens: Number(e.target.value) })}
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  min={1}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { key: 'agentDelegation' as const, label: 'Agent Delegation', desc: 'Allow the Brain to delegate tasks to specialized agents', color: '#9d4edd' },
                  { key: 'selfReflection' as const, label: 'Self Reflection', desc: 'Enable the Brain to review and refine its own outputs', color: '#FFB627' },
                  { key: 'multiStepPlanning' as const, label: 'Multi-Step Planning', desc: 'Plan complex tasks as multi-step workflows', color: '#00ff88' },
                ].map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between p-2.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                    <div>
                      <span className="text-[10px] text-white font-medium">{toggle.label}</span>
                      <p className="text-[8px] text-[#8888aa]">{toggle.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={editDraft[toggle.key] ?? false}
                      onChange={(v) => setEditDraft({ ...editDraft, [toggle.key]: v })}
                      color={toggle.color}
                    />
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={cancelEdit}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[10px] font-medium hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors">
                  <X size={10} /> Cancel
                </button>
                <button onClick={saveEdit}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-medium text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #9d4eddcc, #9d4edd88)', border: '1px solid #9d4edd40' }}>
                  <Save size={10} /> Save
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Read-only view */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { label: REASONING_LABELS[brainConfig.reasoningStyle], color: '#E63946' },
                  { label: TOOL_LABELS[brainConfig.toolUsagePattern], color: '#FFB627' },
                  { label: MEMORY_LABELS[brainConfig.memoryMethod], color: '#2E86AB' },
                  { label: CODING_LABELS[brainConfig.codingWorkflow], color: '#7B2CBF' },
                  { label: RESEARCH_LABELS[brainConfig.researchMethod], color: '#1B998B' },
                  { label: CONTEXT_LABELS[brainConfig.contextStrategy], color: '#9d4edd' },
                ].map(tag => (
                  <span key={tag.label} className="text-[7px] px-1.5 py-0.5 rounded-full border font-medium"
                    style={{ borderColor: `${tag.color}25`, color: `${tag.color}aa`, background: `${tag.color}08` }}>
                    {tag.label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase">Temperature</div>
                  <div className="text-[11px] font-mono text-[#FFB627]">{brainConfig.temperature}</div>
                </div>
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase">Top P</div>
                  <div className="text-[11px] font-mono text-[#FFB627]">{brainConfig.topP}</div>
                </div>
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase">Max Tokens</div>
                  <div className="text-[11px] font-mono text-[#ccccdd]">{brainConfig.maxTokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase">Delegation</div>
                  <div className="text-[11px] font-mono" style={{ color: brainConfig.agentDelegation ? '#00ff88' : '#ff4444' }}>
                    {brainConfig.agentDelegation ? 'On' : 'Off'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Recent Brain Tasks */}
      {recentTasks.length > 0 && (
        <GlassPanel className="overflow-hidden">
          <div className="p-3 border-b border-[rgba(157,78,221,0.1)] flex items-center gap-2">
            <Activity size={12} className="text-[#9d4edd]" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Recent Brain Tasks</span>
            <span className="ml-auto text-[9px] font-mono text-[#9d4edd]">{brainTasks.length} tasks</span>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {recentTasks.map((task, i) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2 border-b border-[rgba(157,78,221,0.06)] hover:bg-[rgba(157,78,221,0.04)] transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  task.status === 'completed' ? 'bg-[#00ff88]' : task.status === 'running' ? 'bg-[#4285F4] animate-pulse' : task.status === 'failed' ? 'bg-[#E63946]' : 'bg-[#8888aa]'
                }`} />
                <span className="text-[9px] font-mono text-[#ccccdd] truncate flex-1">{task.type.replace(/-/g, ' ')}</span>
                {task.modelUsed && <span className="text-[8px] text-[#8888aa] font-mono">{task.modelUsed}</span>}
                <span className="text-[8px] text-[#8888aa] font-mono">{task.tokensUsed} tok</span>
                <span className="text-[8px] text-[#8888aa] font-mono">{task.latencyMs}ms</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GEMINI CLI TAB
   ═══════════════════════════════════════════════════════════ */

function GeminiCLITab() {
  const { geminiCLI, updateGeminiCLI, providers, updateProvider } = useOSStore();
  const [editDraft, setEditDraft] = useState({ ...geminiCLI });
  const [isEditing, setIsEditing] = useState(false);

  const cancelEdit = () => {
    setEditDraft({ ...geminiCLI });
    setIsEditing(false);
  };

  const saveEdit = () => {
    updateGeminiCLI(editDraft);
    // Also update the gemini-cli provider if it exists
    const geminiProvider = providers.find(p => p.id === 'gemini-cli');
    if (geminiProvider) {
      updateProvider('gemini-cli', {
        enabled: editDraft.running && geminiProvider.enabled,
        healthStatus: editDraft.running ? 'healthy' : 'unknown',
        defaultModel: editDraft.model,
        models: geminiProvider.models.includes(editDraft.model) ? geminiProvider.models : [...geminiProvider.models, editDraft.model],
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      {/* Status Card */}
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#4285F415', border: '1px solid #4285F430' }}>
              <Gem size={16} style={{ color: '#4285F4' }} />
            </div>
            <div>
              <div className="text-white font-semibold text-xs">Gemini CLI</div>
              <div className="text-[8px] text-[#8888aa] font-mono">Local Execution Agent</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${geminiCLI.running ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: geminiCLI.installed ? (geminiCLI.running ? '#00ff88' : '#FFB627') : '#ff4444' }} />
            <span className="text-[8px] font-mono uppercase" style={{
              color: geminiCLI.installed ? (geminiCLI.running ? '#00ff88' : '#FFB627') : '#ff4444'
            }}>
              {geminiCLI.installed ? (geminiCLI.running ? 'Running' : 'Installed') : 'Not Installed'}
            </span>
            {!isEditing && (
              <button
                onClick={() => { setEditDraft({ ...geminiCLI }); setIsEditing(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[rgba(66,133,244,0.2)] text-[#4285F4] text-[9px] font-medium hover:bg-[rgba(66,133,244,0.06)] transition-colors"
              >
                <Wrench size={9} /> Configure
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            {/* Model */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Model</label>
              <input
                type="text"
                value={editDraft.model}
                onChange={(e) => setEditDraft({ ...editDraft, model: e.target.value })}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              />
            </div>

            {/* Path */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">CLI Path</label>
              <input
                type="text"
                value={editDraft.path}
                onChange={(e) => setEditDraft({ ...editDraft, path: e.target.value })}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                placeholder="/usr/local/bin/gemini"
              />
            </div>

            {/* Project Context */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Project Context</label>
              <input
                type="text"
                value={editDraft.projectContext}
                onChange={(e) => setEditDraft({ ...editDraft, projectContext: e.target.value })}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              {[
                { key: 'autoDetect' as const, label: 'Auto-Detect', desc: 'Automatically detect Gemini CLI installation', color: '#4285F4' },
                { key: 'autoStart' as const, label: 'Auto-Start', desc: 'Start Gemini CLI automatically when available', color: '#00ff88' },
                { key: 'sandboxEnabled' as const, label: 'Sandbox Mode', desc: 'Run Gemini CLI in sandboxed environment', color: '#FFB627' },
              ].map(toggle => (
                <div key={toggle.key} className="flex items-center justify-between p-2.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                  <div>
                    <span className="text-[10px] text-white font-medium">{toggle.label}</span>
                    <p className="text-[8px] text-[#8888aa]">{toggle.desc}</p>
                  </div>
                  <ToggleSwitch
                    checked={editDraft[toggle.key] ?? false}
                    onChange={(v) => setEditDraft({ ...editDraft, [toggle.key]: v })}
                    color={toggle.color}
                  />
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[10px] font-medium hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors">
                <X size={10} /> Cancel
              </button>
              <button onClick={saveEdit}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #4285F4cc, #4285F488)', border: '1px solid #4285F440' }}>
                <Save size={10} /> Save
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase">Model</div>
              <div className="text-[11px] font-mono text-[#ccccdd]">{geminiCLI.model || '—'}</div>
            </div>
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase">Version</div>
              <div className="text-[11px] font-mono text-[#ccccdd]">{geminiCLI.version || '—'}</div>
            </div>
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase">Auto-Detect</div>
              <div className="text-[11px] font-mono" style={{ color: geminiCLI.autoDetect ? '#00ff88' : '#ff4444' }}>
                {geminiCLI.autoDetect ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div className="text-[8px] text-[#8888aa] uppercase">Sandbox</div>
              <div className="text-[11px] font-mono" style={{ color: geminiCLI.sandboxEnabled ? '#00ff88' : '#ff4444' }}>
                {geminiCLI.sandboxEnabled ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Projects */}
      {geminiCLI.projects.length > 0 && (
        <GlassPanel className="overflow-hidden">
          <div className="p-3 border-b border-[rgba(157,78,221,0.1)] flex items-center gap-2">
            <Layers size={12} className="text-[#4285F4]" />
            <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Projects</span>
            <span className="ml-auto text-[9px] font-mono text-[#4285F4]">{geminiCLI.projects.length}</span>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {geminiCLI.projects.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(157,78,221,0.06)] hover:bg-[rgba(157,78,221,0.04)] transition-colors">
                <Database size={10} className="text-[#4285F4] flex-shrink-0" />
                <span className="text-[10px] text-white font-medium truncate">{p.name}</span>
                <span className="text-[8px] text-[#8888aa] font-mono truncate ml-auto">{p.path}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODEL ROUTER TAB
   ═══════════════════════════════════════════════════════════ */

function ModelRouterTab() {
  const { modelRouterConfig, setModelRouterConfig, providers } = useOSStore();
  const [localConfig, setLocalConfig] = useState<ModelRouterConfig>({ ...modelRouterConfig });

  const saveConfig = useCallback(() => {
    setModelRouterConfig(localConfig);
  }, [localConfig, setModelRouterConfig]);

  const enabledProviders = useMemo(() => providers.filter(p => p.enabled), [providers]);

  return (
    <div className="space-y-4">
      {/* Routing Mode Selector */}
      <GlassPanel className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Route size={12} className="text-[#9d4edd]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Routing Mode</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ROUTING_MODES.map((mode) => {
            const IconComp = ROUTING_ICONS[mode] || Zap;
            const isActive = localConfig.mode === mode;
            const label = ROUTING_LABELS[mode];
            return (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocalConfig({ ...localConfig, mode })}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                  isActive
                    ? 'border-[rgba(157,78,221,0.4)] bg-[rgba(157,78,221,0.1)]'
                    : 'border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] hover:border-[rgba(157,78,221,0.2)] hover:bg-[rgba(157,78,221,0.04)]'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive ? 'rgba(157,78,221,0.2)' : 'rgba(136,136,170,0.08)',
                    border: `1px solid ${isActive ? 'rgba(157,78,221,0.3)' : 'rgba(136,136,170,0.1)'}`,
                  }}
                >
                  <IconComp size={14} style={{ color: isActive ? '#9d4edd' : '#8888aa' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-[#ccccdd]'}`}>
                    {label}
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse-glow" />
                      <span className="text-[8px] text-[#9d4edd] font-mono uppercase">Active</span>
                    </div>
                  )}
                </div>
                {isActive && <Check size={12} className="text-[#9d4edd] flex-shrink-0" />}
              </motion.button>
            );
          })}
        </div>
      </GlassPanel>

      {/* Advanced Options */}
      <GlassPanel className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={12} className="text-[#7B2CBF]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Advanced Options</span>
        </div>

        <div className="space-y-2">
          {/* Failover */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
            <div>
              <span className="text-[10px] text-white font-medium">Failover</span>
              <p className="text-[8px] text-[#8888aa] mt-0.5">Automatically try next provider if current fails</p>
            </div>
            <ToggleSwitch
              checked={localConfig.failoverEnabled}
              onChange={(v) => setLocalConfig({ ...localConfig, failoverEnabled: v })}
              color="#7B2CBF"
            />
          </div>

          {/* Parallel Routing */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
            <div>
              <span className="text-[10px] text-white font-medium">Parallel Routing</span>
              <p className="text-[8px] text-[#8888aa] mt-0.5">Send requests to multiple providers simultaneously</p>
            </div>
            <ToggleSwitch
              checked={localConfig.parallelRouting}
              onChange={(v) => setLocalConfig({ ...localConfig, parallelRouting: v })}
              color="#7B2CBF"
            />
          </div>

          {/* Cost Optimization */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
            <div>
              <span className="text-[10px] text-white font-medium">Cost Optimization</span>
              <p className="text-[8px] text-[#8888aa] mt-0.5">Prefer cheaper models when quality difference is minimal</p>
            </div>
            <ToggleSwitch
              checked={localConfig.costOptimization}
              onChange={(v) => setLocalConfig({ ...localConfig, costOptimization: v })}
              color="#FFB627"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Failover Order */}
      <GlassPanel className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Layers size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Failover Priority Order</span>
        </div>
        {enabledProviders.length > 0 ? (
          <div className="space-y-1.5">
            {enabledProviders
              .sort((a, b) => a.priority - b.priority)
              .map((provider, i) => (
                <div key={provider.id} className="flex items-center gap-2 p-2 rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
                  <span className="text-[9px] font-mono text-[#8888aa] w-4">#{i + 1}</span>
                  <span className="text-sm flex-shrink-0">{provider.icon}</span>
                  <span className="text-[10px] text-white font-medium">{provider.name}</span>
                  <span className="text-[8px] text-[#8888aa] font-mono ml-auto">Priority {provider.priority}</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#8888aa] text-center py-4">No providers enabled</div>
        )}
      </GlassPanel>

      {/* Current Config Summary + Save */}
      <GlassPanel className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={12} className="text-[#1B998B]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Current Configuration</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Mode', value: ROUTING_LABELS[localConfig.mode], color: '#9d4edd' },
            { label: 'Failover', value: localConfig.failoverEnabled ? 'On' : 'Off', color: localConfig.failoverEnabled ? '#00ff88' : '#ff4444' },
            { label: 'Parallel', value: localConfig.parallelRouting ? 'On' : 'Off', color: localConfig.parallelRouting ? '#00ff88' : '#ff4444' },
            { label: 'Cost Opt', value: localConfig.costOptimization ? 'On' : 'Off', color: localConfig.costOptimization ? '#FFB627' : '#ff4444' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[8px] text-[#8888aa] uppercase">{item.label}</div>
              <div className="text-[11px] font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        <button
          onClick={saveConfig}
          className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #9d4eddcc, #9d4edd88)' }}
        >
          Save Router Configuration
        </button>
      </GlassPanel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BUDGET TAB
   ═══════════════════════════════════════════════════════════ */

function BudgetTab() {
  const { budgetConfig, setBudgetConfig, totalCost, costTransactions, totalTokensUsed } = useOSStore();
  const [editDraft, setEditDraft] = useState({ ...budgetConfig });

  const saveConfig = () => {
    setBudgetConfig(editDraft);
  };

  const dailyUsagePercent = budgetConfig.dailyLimit > 0 ? Math.min((totalCost / budgetConfig.dailyLimit) * 100, 100) : 0;
  const monthlyUsagePercent = budgetConfig.monthlyLimit > 0 ? Math.min((totalCost / budgetConfig.monthlyLimit) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, color: '#FFB627' },
          { label: 'Total Tokens', value: totalTokensUsed > 1_000_000 ? `${(totalTokensUsed / 1_000_000).toFixed(1)}M` : totalTokensUsed > 1000 ? `${(totalTokensUsed / 1000).toFixed(1)}K` : String(totalTokensUsed), color: '#00ff88' },
          { label: 'Transactions', value: String(costTransactions.length), color: '#9d4edd' },
          { label: 'Daily Usage', value: `${dailyUsagePercent.toFixed(0)}%`, color: dailyUsagePercent > 80 ? '#E63946' : '#00ff88' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-lg border p-3" style={{ borderColor: `${stat.color}20`, background: `${stat.color}06` }}>
            <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</div>
            <div className="text-white font-mono font-bold text-sm mt-1" style={{ color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Budget Configuration */}
      <GlassPanel className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Budget Configuration</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Daily Limit ($)</label>
            <input
              type="number"
              value={editDraft.dailyLimit}
              onChange={(e) => setEditDraft({ ...editDraft, dailyLimit: Number(e.target.value) })}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              min={0}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Monthly Limit ($)</label>
            <input
              type="number"
              value={editDraft.monthlyLimit}
              onChange={(e) => setEditDraft({ ...editDraft, monthlyLimit: Number(e.target.value) })}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              min={0}
            />
          </div>
        </div>

        {/* Alert Threshold */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Alert Threshold</label>
            <span className="text-[9px] font-mono text-[#FFB627]">{(editDraft.alertThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.05}
            value={editDraft.alertThreshold}
            onChange={(e) => setEditDraft({ ...editDraft, alertThreshold: Number(e.target.value) })}
            className="w-full accent-[#FFB627] h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Hard Stop */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
          <div>
            <span className="text-[10px] text-white font-medium">Hard Stop</span>
            <p className="text-[8px] text-[#8888aa]">Block all API calls when budget is exceeded</p>
          </div>
          <ToggleSwitch
            checked={editDraft.hardStop}
            onChange={(v) => setEditDraft({ ...editDraft, hardStop: v })}
            color="#ff4444"
          />
        </div>

        {/* Usage Bars */}
        <div className="space-y-2 pt-2 border-t border-[rgba(157,78,221,0.1)]">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#8888aa] uppercase">Daily Usage</span>
              <span className="text-[9px] font-mono" style={{ color: dailyUsagePercent > 80 ? '#E63946' : '#00ff88' }}>
                ${totalCost.toFixed(2)} / ${budgetConfig.dailyLimit}
              </span>
            </div>
            <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${dailyUsagePercent}%`, backgroundColor: dailyUsagePercent > 80 ? '#E63946' : '#00ff88' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-[#8888aa] uppercase">Monthly Usage</span>
              <span className="text-[9px] font-mono" style={{ color: monthlyUsagePercent > 80 ? '#E63946' : '#00ff88' }}>
                ${totalCost.toFixed(2)} / ${budgetConfig.monthlyLimit}
              </span>
            </div>
            <div className="h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${monthlyUsagePercent}%`, backgroundColor: monthlyUsagePercent > 80 ? '#E63946' : '#00ff88' }} />
            </div>
          </div>
        </div>

        <button
          onClick={saveConfig}
          className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #FFB627cc, #FFB62788)' }}
        >
          Save Budget Configuration
        </button>
      </GlassPanel>

      {/* Recent Cost Transactions */}
      <GlassPanel className="overflow-hidden">
        <div className="p-3 border-b border-[rgba(157,78,221,0.1)] flex items-center gap-2">
          <DollarSign size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Recent Transactions</span>
          <span className="ml-auto text-[9px] font-mono text-[#FFB627]">{costTransactions.length}</span>
        </div>
        <div className="max-h-48 overflow-y-auto custom-scrollbar">
          {costTransactions.length > 0 ? (
            costTransactions.slice(0, 20).map((tx, i) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-2 border-b border-[rgba(157,78,221,0.06)] hover:bg-[rgba(157,78,221,0.04)] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFB627]" />
                <span className="text-[9px] text-[#ccccdd] truncate flex-1">{tx.taskName || tx.model}</span>
                <span className="text-[8px] text-[#8888aa] font-mono">{tx.inputTokens + tx.outputTokens} tok</span>
                <span className="text-[9px] font-mono text-[#FFB627]">${tx.cost.toFixed(4)}</span>
                <span className="text-[8px] text-[#8888aa] font-mono flex-shrink-0">{formatTimestamp(tx.timestamp)}</span>
              </div>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-[10px] text-[#8888aa]">No cost transactions yet</p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
