'use client';

import {
  useOSStore,
  type ProviderConfig,
  type BrainConfig,
  type BrainProfile,
  type ModelRouterConfig,
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Server, Brain, Cpu, Shield, Route, Plus, X, Check,
  Eye, EyeOff, RefreshCw, Trash2, Save, ChevronDown, ChevronRight,
  Globe, Cloud, HardDrive, Zap, DollarSign, Activity, ArrowUpDown,
  GripVertical, Star, Layers, Award, Radio, Users, AlertTriangle,
  Sparkles, Thermometer, Search as SearchIcon, Wrench, Database,
  Lock, Code, FlaskConical, BookOpen,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const TAB_ITEMS = [
  { id: 'providers', label: 'Providers', icon: Server },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'brain', label: 'Brain Emulation', icon: Brain },
  { id: 'fallback', label: 'Agent Fallback', icon: Shield },
  { id: 'router', label: 'Model Router', icon: Route },
] as const;

type TabId = (typeof TAB_ITEMS)[number]['id'];

const HEALTH_COLORS: Record<string, string> = {
  healthy: '#00ff88',
  degraded: '#FFB627',
  offline: '#ff4444',
  unknown: '#8888aa',
};

const LAYER_META: Record<string, { name: string; icon: typeof Eye; color: string; number: number }> = {
  interaction: { name: 'Interaction & Perception', icon: Eye, color: '#FF8C42', number: 1 },
  knowledge: { name: 'Knowledge Acquisition', icon: SearchIcon, color: '#FFB627', number: 2 },
  orchestration: { name: 'Agent Orchestration', icon: Users, color: '#E8751A', number: 3 },
  cognition: { name: 'Cognitive Reasoning', icon: Brain, color: '#E63946', number: 4 },
  execution: { name: 'Execution & Integration', icon: Wrench, color: '#7B2CBF', number: 5 },
  memory: { name: 'Memory, Learning & Context', icon: Database, color: '#2E86AB', number: 6 },
  governance: { name: 'Deployment, Governance & Infra', icon: Lock, color: '#1B998B', number: 7 },
};

const AGENT_COLORS: Record<string, string> = {
  claude: '#E63946',
  hermes: '#FFB627',
  openclaw: '#E8751A',
  vault: '#2E86AB',
  gemini: '#4285F4',
};

const AGENT_NAMES: Record<string, string> = {
  claude: 'Claude',
  hermes: 'Hermes',
  openclaw: 'OpenClaw',
  vault: 'Vault',
  gemini: 'Gemini',
};

const ROUTING_MODES: ModelRouterConfig['mode'][] = [
  'automatic', 'fastest', 'cheapest', 'highest-quality',
  'reasoning-first', 'coding-first', 'research-first',
  'vision-first', 'multi-agent-consensus',
];

const ROUTING_LABELS: Record<string, string> = {
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

const ROUTING_ICONS: Record<string, typeof Zap> = {
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

const BRAIN_PROFILE_COLORS: Record<BrainProfile, string> = {
  claude: '#E63946',
  gemini: '#4285F4',
  hermes: '#FFB627',
  openclaw: '#E8751A',
  vault: '#2E86AB',
  opencode: '#7B2CBF',
  custom: '#00ff88',
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
    <button
      onClick={() => onChange(!checked)}
      className="w-10 h-5 rounded-full transition-all duration-200 relative flex-shrink-0"
      style={{ backgroundColor: checked ? color : 'rgba(136,136,170,0.3)' }}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
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
          {activeTab === 'models' && <ModelsTab />}
          {activeTab === 'brain' && <BrainEmulationTab />}
          {activeTab === 'fallback' && <AgentFallbackTab />}
          {activeTab === 'router' && <ModelRouterTab />}
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
      const res = await fetch('/api/hermes/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-provider',
          provider: {
            id: provider.id,
            name: provider.name,
            apiEndpoint: editDraft?.apiEndpoint ?? provider.apiEndpoint,
            apiKey: editDraft?.apiKey ?? provider.apiKey,
            defaultModel: editDraft?.defaultModel ?? provider.defaultModel,
          },
        }),
      });
      const data = await res.json();
      const ok = res.ok && data.status !== 'error';
      setTestResult(prev => ({
        ...prev,
        [provider.id]: { ok, msg: ok ? (data.message || 'Connection successful') : (data.error || 'Connection failed') },
      }));
      updateProvider(provider.id, {
        healthStatus: ok ? 'healthy' : 'offline',
        lastHealthCheck: Date.now(),
      });
    } catch {
      setTestResult(prev => ({
        ...prev,
        [provider.id]: { ok: false, msg: 'Network error — could not reach gateway' },
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
      costConfig: { alertThreshold: 50, hardStop: false },
      icon: '🔧',
      color: '#00ff88',
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
          const TypeIcon = provider.type === 'local' ? HardDrive : provider.type === 'custom' ? Wrench : Cloud;
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
              <button
                onClick={() => startEdit(provider)}
                className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(157,78,221,0.04)] transition-colors text-left"
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
                        color: provider.type === 'local' ? '#1B998B' : provider.type === 'custom' ? '#00ff88' : '#FFB627',
                        background: provider.type === 'local' ? '#1B998B15' : provider.type === 'custom' ? '#00ff8815' : '#FFB62715',
                        border: `1px solid ${provider.type === 'local' ? '#1B998B30' : provider.type === 'custom' ? '#00ff8830' : '#FFB62730'}`,
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
                    onClick={(e) => { e.stopPropagation(); updateProvider(provider.id, { enabled: !provider.enabled }); }}
                    className="flex items-center gap-1"
                  >
                    <ToggleSwitch
                      checked={provider.enabled}
                      onChange={(v) => updateProvider(provider.id, { enabled: v })}
                      color={provider.color || '#7B2CBF'}
                    />
                  </div>
                  {isExpanded ? <ChevronDown size={12} className="text-[#8888aa]" /> : <ChevronRight size={12} className="text-[#8888aa]" />}
                </div>
              </button>

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
                          <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Cost Alert Threshold ($)</label>
                          <input
                            type="number"
                            value={editDraft.costConfig?.alertThreshold ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, costConfig: { ...editDraft.costConfig!, alertThreshold: Number(e.target.value) } })}
                            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                            <div>
                              <span className="text-[10px] text-white font-medium">Hard Stop</span>
                              <p className="text-[8px] text-[#8888aa]">Block over-budget calls</p>
                            </div>
                            <ToggleSwitch
                              checked={editDraft.costConfig?.hardStop ?? false}
                              onChange={(v) => setEditDraft({ ...editDraft, costConfig: { ...editDraft.costConfig!, hardStop: v } })}
                              color="#ff4444"
                            />
                          </div>
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
   MODELS TAB
   ═══════════════════════════════════════════════════════════ */

function ModelsTab() {
  const { providers, brainConfigs, availableModels, setAvailableModels } = useOSStore();
  const [modelBrainMap, setModelBrainMap] = useState<{[key: string]: string}>({});
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);

  const enabledProviders = useMemo(() => providers.filter(p => p.enabled), [providers]);

  const allModels = useMemo(() => {
    const models: Array<{
      id: string;
      name: string;
      providerId: string;
      providerName: string;
      providerColor: string;
      contextWindow: number;
      costInput: number;
      costOutput: number;
      isDefault: boolean;
    }> = [];

    for (const provider of enabledProviders) {
      for (const modelId of provider.models) {
        const storeModel = availableModels.find(m => m.id === modelId);
        models.push({
          id: modelId,
          name: modelId,
          providerId: provider.id,
          providerName: provider.name,
          providerColor: provider.color || '#9d4edd',
          contextWindow: storeModel?.contextWindow ?? 0,
          costInput: storeModel?.costPer1kInput ?? 0,
          costOutput: storeModel?.costPer1kOutput ?? 0,
          isDefault: provider.defaultModel === modelId,
        });
      }
    }
    return models;
  }, [enabledProviders, availableModels]);

  const setDefault = (modelId: string, providerId: string) => {
    const { updateProvider } = useOSStore.getState();
    updateProvider(providerId, { defaultModel: modelId });
    setDefaultModelId(modelId);
  };

  if (enabledProviders.length === 0) {
    return (
      <GlassPanel className="p-6 text-center">
        <Server size={24} className="mx-auto text-[#8888aa] mb-2 opacity-50" />
        <p className="text-[11px] text-[#8888aa]">No providers enabled. Enable providers in the Providers tab to see models.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Enabled Providers', value: String(enabledProviders.length), color: '#9d4edd', icon: Server },
          { label: 'Total Models', value: String(allModels.length), color: '#FFB627', icon: Cpu },
          { label: 'Default Models', value: String(enabledProviders.filter(p => p.defaultModel).length), color: '#00ff88', icon: Star },
          { label: 'Brain Profiles', value: String(brainConfigs.length), color: '#E63946', icon: Brain },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-lg border p-3" style={{ borderColor: `${stat.color}20`, background: `${stat.color}06` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={10} style={{ color: stat.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Models List */}
      <GlassPanel className="overflow-hidden">
        <div className="p-3 border-b border-[rgba(157,78,221,0.1)] flex items-center gap-2">
          <Cpu size={12} className="text-[#FFB627]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Available Models</span>
          <span className="ml-auto text-[9px] font-mono text-[#FFB627]">{allModels.length} models</span>
        </div>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {allModels.map((model, i) => (
            <motion.div
              key={`${model.providerId}-${model.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(157,78,221,0.06)] hover:bg-[rgba(157,78,221,0.04)] transition-colors"
            >
              {/* Provider color dot */}
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: model.providerColor }} />

              {/* Model info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-[11px] font-mono font-medium truncate">{model.name}</span>
                  {model.isDefault && (
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] text-[#00ff88] font-bold border border-[rgba(0,255,136,0.2)]">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px]" style={{ color: model.providerColor }}>{model.providerName}</span>
                  {model.contextWindow > 0 && (
                    <span className="text-[8px] text-[#8888aa] font-mono">{(model.contextWindow / 1000).toFixed(0)}K ctx</span>
                  )}
                  {(model.costInput > 0 || model.costOutput > 0) && (
                    <span className="text-[8px] text-[#8888aa] font-mono">
                      ${model.costInput.toFixed(3)}/${model.costOutput.toFixed(3)} per 1K
                    </span>
                  )}
                </div>
              </div>

              {/* Brain Profile Assignment */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={modelBrainMap[`${model.providerId}-${model.id}`] ?? ''}
                  onChange={(e) => setModelBrainMap(prev => ({ ...prev, [`${model.providerId}-${model.id}`]: e.target.value }))}
                  className="bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg px-2 py-1 text-[9px] text-[#ccccdd] focus:outline-none focus:border-[rgba(157,78,221,0.3)] transition-colors max-w-[120px]"
                >
                  <option value="">No Brain</option>
                  {brainConfigs.map(bc => (
                    <option key={bc.id} value={bc.id}>{bc.name}</option>
                  ))}
                </select>

                {!model.isDefault && (
                  <button
                    onClick={() => setDefault(model.id, model.providerId)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[rgba(0,255,136,0.15)] text-[#00ff88] text-[8px] font-medium hover:bg-[rgba(0,255,136,0.06)] transition-colors"
                  >
                    <Star size={8} /> Use as Default
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {allModels.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-[10px] text-[#8888aa]">No models available from enabled providers.</p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BRAIN EMULATION TAB
   ═══════════════════════════════════════════════════════════ */

function BrainEmulationTab() {
  const {
    brainConfigs, activeBrainId, addBrainConfig, updateBrainConfig,
    removeBrainConfig, setActiveBrainId,
  } = useOSStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<BrainConfig> | null>(null);
  const [showCreateCustom, setShowCreateCustom] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customProfile, setCustomProfile] = useState<BrainProfile>('custom');

  const startEdit = (brain: BrainConfig) => {
    setEditDraft({ ...brain });
    setExpandedId(expandedId === brain.id ? null : brain.id);
  };

  const cancelEdit = () => {
    setEditDraft(null);
    setExpandedId(null);
  };

  const saveEdit = () => {
    if (!editDraft || !expandedId) return;
    updateBrainConfig(expandedId, editDraft);
    setEditDraft(null);
    setExpandedId(null);
  };

  const createCustomBrain = () => {
    if (!customName.trim()) return;
    addBrainConfig({
      id: `brain-custom-${Date.now()}`,
      name: customName.trim(),
      profile: customProfile,
      systemPrompt: '',
      reasoningStyle: 'chain-of-thought',
      toolUsagePattern: 'adaptive',
      memoryMethod: 'full',
      codingWorkflow: 'iterative',
      researchMethod: 'hybrid',
      temperature: 0.7,
      topP: 0.9,
    });
    setCustomName('');
    setShowCreateCustom(false);
  };

  const REASONING_LABELS: Record<string, string> = {
    'chain-of-thought': 'Chain of Thought',
    'tree-of-thought': 'Tree of Thought',
    'react': 'ReAct',
    'plan-and-execute': 'Plan & Execute',
    'reflection': 'Reflection',
  };

  const TOOL_LABELS: Record<string, string> = {
    'aggressive': 'Aggressive',
    'conservative': 'Conservative',
    'adaptive': 'Adaptive',
  };

  const MEMORY_LABELS: Record<string, string> = {
    'short-term': 'Short-Term',
    'long-term': 'Long-Term',
    'semantic': 'Semantic',
    'episodic': 'Episodic',
    'full': 'Full',
  };

  const CODING_LABELS: Record<string, string> = {
    'iterative': 'Iterative',
    'plan-first': 'Plan First',
    'test-driven': 'Test-Driven',
    'debug-first': 'Debug First',
  };

  const RESEARCH_LABELS: Record<string, string> = {
    'depth-first': 'Depth-First',
    'breadth-first': 'Breadth-First',
    'hybrid': 'Hybrid',
  };

  return (
    <div className="space-y-3">
      {/* Brain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {brainConfigs.map((brain, i) => {
          const isExpanded = expandedId === brain.id;
          const isActive = activeBrainId === brain.id;
          const profileColor = BRAIN_PROFILE_COLORS[brain.profile] || '#9d4edd';
          const ProfileIcon = brain.profile === 'claude' ? Brain : brain.profile === 'gemini' ? Sparkles : brain.profile === 'hermes' ? FlaskConical : brain.profile === 'openclaw' ? Route : brain.profile === 'vault' ? Database : Activity;

          return (
            <motion.div
              key={brain.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border overflow-hidden transition-all duration-300 ${isExpanded ? 'md:col-span-2' : ''}`}
              style={{
                borderColor: isActive ? '#FFB62760' : `${profileColor}25`,
                background: `linear-gradient(135deg, ${profileColor}06, ${profileColor}02)`,
                boxShadow: isActive ? '0 0 20px rgba(255,182,39,0.08)' : 'none',
              }}
            >
              {/* Card Header */}
              <button
                onClick={() => startEdit(brain)}
                className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(157,78,221,0.04)] transition-colors text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${profileColor}15`, border: `1px solid ${profileColor}30${isActive ? '' : ''}` }}
                >
                  <ProfileIcon size={14} style={{ color: profileColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-xs">{brain.name}</span>
                    {isActive && (
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(255,182,39,0.15)] text-[#FFB627] font-bold border border-[rgba(255,182,39,0.3)]">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-mono uppercase" style={{ color: profileColor }}>{brain.profile}</span>
                    <span className="text-[8px] text-[#8888aa]">·</span>
                    <span className="text-[8px] text-[#8888aa]">{REASONING_LABELS[brain.reasoningStyle]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-[#8888aa]">{brain.temperature} temp</div>
                    <div className="text-[9px] font-mono text-[#8888aa]">{brain.topP} topP</div>
                  </div>
                  {isExpanded ? <ChevronDown size={12} className="text-[#8888aa]" /> : <ChevronRight size={12} className="text-[#8888aa]" />}
                </div>
              </button>

              {/* Tags row (collapsed) */}
              {!isExpanded && (
                <div className="px-3 pb-2 flex flex-wrap gap-1">
                  {[
                    { label: TOOL_LABELS[brain.toolUsagePattern], color: '#FFB627' },
                    { label: MEMORY_LABELS[brain.memoryMethod], color: '#2E86AB' },
                    { label: CODING_LABELS[brain.codingWorkflow], color: '#7B2CBF' },
                    { label: RESEARCH_LABELS[brain.researchMethod], color: '#1B998B' },
                  ].map(tag => (
                    <span key={tag.label} className="text-[7px] px-1.5 py-0.5 rounded-full border font-medium"
                      style={{ borderColor: `${tag.color}25`, color: `${tag.color}aa`, background: `${tag.color}08` }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded Edit Form */}
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
                            onChange={(e) => setEditDraft({ ...editDraft, reasoningStyle: e.target.value as BrainConfig['reasoningStyle'] })}
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
                            onChange={(e) => setEditDraft({ ...editDraft, memoryMethod: e.target.value as BrainConfig['memoryMethod'] })}
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
                            onChange={(e) => setEditDraft({ ...editDraft, codingWorkflow: e.target.value as BrainConfig['codingWorkflow'] })}
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
                            onChange={(e) => setEditDraft({ ...editDraft, researchMethod: e.target.value as BrainConfig['researchMethod'] })}
                            className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                          >
                            {Object.entries(RESEARCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        {/* Temperature */}
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
                      </div>

                      {/* Top P */}
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

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {!isActive && (
                          <button
                            onClick={() => setActiveBrainId(brain.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(255,182,39,0.2)] text-[#FFB627] text-[10px] font-medium hover:bg-[rgba(255,182,39,0.06)] transition-colors"
                          >
                            <Star size={10} /> Set Active
                          </button>
                        )}
                        <div className="flex-1" />
                        {brain.profile === 'custom' && (
                          <button
                            onClick={() => { removeBrainConfig(brain.id); cancelEdit(); }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(255,68,68,0.2)] text-[#ff4444] text-[10px] font-medium hover:bg-[rgba(255,68,68,0.06)] transition-colors"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        )}
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[10px] font-medium hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors">
                          <X size={10} /> Cancel
                        </button>
                        <button onClick={saveEdit}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-medium text-white transition-all"
                          style={{ background: `linear-gradient(135deg, ${profileColor}cc, ${profileColor}88)`, border: `1px solid ${profileColor}40` }}>
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

      {/* Create Custom Brain */}
      <GlassPanel>
        {showCreateCustom ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
                <Plus size={12} className="text-[#00ff88]" /> Create Custom Brain
              </h3>
              <button onClick={() => setShowCreateCustom(false)} className="text-[#8888aa] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Brain Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="My Custom Brain"
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Base Profile</label>
                <select
                  value={customProfile}
                  onChange={(e) => setCustomProfile(e.target.value as BrainProfile)}
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                >
                  {Object.entries(BRAIN_PROFILE_COLORS).map(([k, v]) => (
                    <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={createCustomBrain}
              disabled={!customName.trim()}
              className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00ff88cc, #00ff8888)' }}
            >
              Create Custom Brain
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateCustom(true)}
            className="w-full p-3 flex items-center justify-center gap-2 text-[10px] text-[#8888aa] hover:text-[#00ff88] transition-colors"
          >
            <Plus size={12} /> Create Custom Brain
          </button>
        )}
      </GlassPanel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT FALLBACK TAB
   ═══════════════════════════════════════════════════════════ */

function AgentFallbackTab() {
  const { agentFallbackConfig, setAgentFallbackConfig, agents, stackLayers } = useOSStore();
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [draftChain, setDraftChain] = useState<string[]>([]);

  const startEditLayer = (layerId: string) => {
    const current = agentFallbackConfig.layerAssignments[layerId] || [];
    setDraftChain([...current]);
    setEditingLayer(editingLayer === layerId ? null : layerId);
  };

  const saveLayerChain = (layerId: string) => {
    setAgentFallbackConfig({
      layerAssignments: {
        ...agentFallbackConfig.layerAssignments,
        [layerId]: draftChain,
      },
      activeHandlers: {
        ...agentFallbackConfig.activeHandlers,
        [layerId]: draftChain[0] || agentFallbackConfig.activeHandlers[layerId],
      },
    });
    setEditingLayer(null);
    setDraftChain([]);
  };

  const moveAgent = (fromIndex: number, toIndex: number) => {
    const updated = [...draftChain];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setDraftChain(updated);
  };

  const toggleAgentInChain = (agentId: string) => {
    if (draftChain.includes(agentId)) {
      setDraftChain(draftChain.filter(a => a !== agentId));
    } else {
      setDraftChain([...draftChain, agentId]);
    }
  };

  const autoDetectAndAssign = () => {
    const liveAgents = agents.filter(a => a.status === 'live' || a.status === 'booting');
    const newAssignments: Record<string, string[]> = {};
    const newHandlers: Record<string, string> = {};

    for (const layer of stackLayers) {
      const capableAgents = liveAgents
        .filter(a => a.layers.includes(layer.number))
        .sort((a, b) => {
          const statusOrder = { live: 0, booting: 1, degraded: 2, offline: 3 };
          return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
        })
        .map(a => a.id);

      const fallbackChain = capableAgents.length > 0
        ? capableAgents
        : ['claude', 'hermes', 'gemini'];

      newAssignments[layer.id] = fallbackChain;
      newHandlers[layer.id] = fallbackChain[0];
    }

    setAgentFallbackConfig({
      layerAssignments: newAssignments,
      activeHandlers: newHandlers,
    });
  };

  const layerIds = Object.keys(LAYER_META);

  return (
    <div className="space-y-3">
      {/* 7-Layer Visual Diagram */}
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Layers size={12} className="text-[#FFB627]" /> 7-Layer Agent Assignment
          </h3>
          <button
            onClick={autoDetectAndAssign}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] text-[#00ff88] text-[9px] font-medium hover:bg-[rgba(0,255,136,0.06)] transition-colors"
          >
            <RefreshCw size={9} /> Auto-Detect &amp; Assign
          </button>
        </div>

        <div className="space-y-1.5">
          {layerIds.map((layerId, i) => {
            const meta = LAYER_META[layerId];
            const IconComp = meta.icon;
            const chain = agentFallbackConfig.layerAssignments[layerId] || [];
            const active = agentFallbackConfig.activeHandlers[layerId] || '';
            const isEditing = editingLayer === layerId;

            return (
              <motion.div
                key={layerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border overflow-hidden transition-all ${
                  isEditing ? 'border-[rgba(157,78,221,0.3)]' : 'border-[rgba(157,78,221,0.08)]'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${meta.color}06, ${meta.color}02)`,
                  borderColor: isEditing ? `${meta.color}40` : undefined,
                }}
              >
                {/* Layer Row */}
                <button
                  onClick={() => startEditLayer(layerId)}
                  className="w-full flex items-center gap-2.5 p-2.5 hover:bg-[rgba(157,78,221,0.04)] transition-colors text-left"
                >
                  {/* Layer Number */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
                  >
                    <span className="text-[9px] font-mono font-bold" style={{ color: meta.color }}>L{meta.number}</span>
                  </div>

                  {/* Layer Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white font-medium truncate">{meta.name}</div>
                  </div>

                  {/* Fallback Chain */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {chain.map((agentId, ci) => {
                      const color = AGENT_COLORS[agentId] || '#8888aa';
                      const name = AGENT_NAMES[agentId] || agentId;
                      const isActiveAgent = agentId === active;
                      return (
                        <div key={`${agentId}-${ci}`} className="flex items-center gap-0.5">
                          {ci > 0 && <span className="text-[8px] text-[#8888aa]">→</span>}
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${
                              isActiveAgent ? 'font-bold' : ''
                            }`}
                            style={{
                              color: isActiveAgent ? color : `${color}aa`,
                              background: isActiveAgent ? `${color}15` : `${color}08`,
                              border: `1px solid ${isActiveAgent ? color : `${color}20`}`,
                            }}
                          >
                            {name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {isEditing ? <ChevronDown size={10} className="text-[#8888aa]" /> : <ChevronRight size={10} className="text-[#8888aa]" />}
                </button>

                {/* Edit Fallback Order */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-[rgba(157,78,221,0.08)] space-y-2">
                        <span className="text-[9px] text-[#8888aa] uppercase tracking-wider block">Fallback Order (drag to reorder)</span>
                        {/* Current chain order */}
                        <div className="space-y-1">
                          {draftChain.map((agentId, ci) => {
                            const color = AGENT_COLORS[agentId] || '#8888aa';
                            const name = AGENT_NAMES[agentId] || agentId;
                            return (
                              <div key={`${agentId}-${ci}`} className="flex items-center gap-2 p-1.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                                <GripVertical size={10} className="text-[#8888aa] cursor-grab flex-shrink-0" />
                                <span className="text-[9px] font-mono" style={{ color }}>#{ci + 1}</span>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-[10px] text-white font-medium">{name}</span>
                                <div className="flex-1" />
                                {/* Move up/down buttons */}
                                <button
                                  onClick={() => ci > 0 && moveAgent(ci, ci - 1)}
                                  disabled={ci === 0}
                                  className="text-[#8888aa] hover:text-white disabled:opacity-30 transition-colors"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => ci < draftChain.length - 1 && moveAgent(ci, ci + 1)}
                                  disabled={ci === draftChain.length - 1}
                                  className="text-[#8888aa] hover:text-white disabled:opacity-30 transition-colors"
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => toggleAgentInChain(agentId)}
                                  className="text-[#ff4444] hover:text-[#ff6666] transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Available agents to add */}
                        {agents.filter(a => !draftChain.includes(a.id)).length > 0 && (
                          <div>
                            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-1">Available Agents</span>
                            <div className="flex flex-wrap gap-1">
                              {agents.filter(a => !draftChain.includes(a.id)).map(a => {
                                const color = AGENT_COLORS[a.id] || '#8888aa';
                                return (
                                  <button
                                    key={a.id}
                                    onClick={() => toggleAgentInChain(a.id)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[rgba(157,78,221,0.15)] text-[9px] hover:bg-[rgba(157,78,221,0.06)] transition-colors"
                                    style={{ color }}
                                  >
                                    <Plus size={8} /> {AGENT_NAMES[a.id] || a.id}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={() => { setEditingLayer(null); setDraftChain([]); }}
                            className="px-3 py-1.5 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[9px] hover:text-white transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => saveLayerChain(layerId)}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-medium text-white transition-all"
                            style={{ background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}88)` }}>
                            <Check size={9} className="inline mr-0.5" /> Save
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
      </GlassPanel>

      {/* Fallback History */}
      <GlassPanel className="overflow-hidden">
        <div className="p-3 border-b border-[rgba(157,78,221,0.1)] flex items-center gap-2">
          <Activity size={12} className="text-[#E8751A]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Fallback History</span>
          <span className="ml-auto text-[9px] font-mono text-[#8888aa]">{agentFallbackConfig.fallbackHistory.length} events</span>
        </div>
        <div className="max-h-48 overflow-y-auto custom-scrollbar">
          {agentFallbackConfig.fallbackHistory.length > 0 ? (
            agentFallbackConfig.fallbackHistory.map((entry, i) => {
              const fromColor = AGENT_COLORS[entry.from] || '#8888aa';
              const toColor = AGENT_COLORS[entry.to] || '#8888aa';
              const layerMeta = LAYER_META[entry.layer];
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-[rgba(157,78,221,0.06)] hover:bg-[rgba(157,78,221,0.04)] transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layerMeta?.color || '#8888aa' }} />
                  <span className="text-[9px] font-mono" style={{ color: layerMeta?.color || '#8888aa' }}>L{layerMeta?.number || '?'}</span>
                  <span className="text-[9px] font-medium" style={{ color: fromColor }}>{AGENT_NAMES[entry.from] || entry.from}</span>
                  <span className="text-[8px] text-[#8888aa]">→</span>
                  <span className="text-[9px] font-medium" style={{ color: toColor }}>{AGENT_NAMES[entry.to] || entry.to}</span>
                  <span className="text-[8px] text-[#8888aa] flex-1 truncate">{entry.reason}</span>
                  <span className="text-[8px] text-[#8888aa] font-mono flex-shrink-0">{formatTimestamp(entry.timestamp)}</span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center">
              <p className="text-[10px] text-[#8888aa]">No fallback events recorded yet</p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODEL ROUTER TAB
   ═══════════════════════════════════════════════════════════ */

function ModelRouterTab() {
  const { modelRouterConfig, setModelRouterConfig } = useOSStore();
  const [localConfig, setLocalConfig] = useState<ModelRouterConfig>({ ...modelRouterConfig });

  const saveConfig = useCallback(() => {
    setModelRouterConfig(localConfig);
  }, [localConfig, setModelRouterConfig]);

  const isConsensus = localConfig.mode === 'multi-agent-consensus';

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

      {/* Consensus Config */}
      <AnimatePresence>
        {isConsensus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <GlassPanel className="p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-[#FFB627]" />
                <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Consensus Configuration</span>
              </div>

              {/* Agent Count Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Agent Count</label>
                  <span className="text-[10px] font-mono text-[#FFB627]">{localConfig.consensusConfig.agentCount}</span>
                </div>
                <input
                  type="range" min={2} max={7} step={1}
                  value={localConfig.consensusConfig.agentCount}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    consensusConfig: {
                      ...localConfig.consensusConfig,
                      agentCount: Number(e.target.value),
                      enabled: true,
                    },
                  })}
                  className="w-full accent-[#FFB627] h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[8px] text-[#8888aa]">2</span>
                  <span className="text-[8px] text-[#8888aa]">7</span>
                </div>
              </div>

              {/* Strategy Selector */}
              <div>
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Strategy</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['consensus', 'majority', 'delegation', 'race'] as const).map(strategy => {
                    const isActive = localConfig.consensusConfig.strategy === strategy;
                    const stratLabels: Record<string, string> = {
                      consensus: 'Consensus',
                      majority: 'Majority',
                      delegation: 'Delegation',
                      race: 'Race',
                    };
                    const stratDescs: Record<string, string> = {
                      consensus: 'All agents must agree',
                      majority: 'Simple majority wins',
                      delegation: 'Lead agent decides',
                      race: 'First response wins',
                    };
                    return (
                      <button
                        key={strategy}
                        onClick={() => setLocalConfig({
                          ...localConfig,
                          consensusConfig: { ...localConfig.consensusConfig, strategy, enabled: true },
                        })}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isActive
                            ? 'border-[rgba(255,182,39,0.3)] bg-[rgba(255,182,39,0.08)]'
                            : 'border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] hover:border-[rgba(157,78,221,0.2)]'
                        }`}
                      >
                        <div className={`text-[10px] font-medium ${isActive ? 'text-[#FFB627]' : 'text-[#ccccdd]'}`}>
                          {stratLabels[strategy]}
                        </div>
                        <div className="text-[8px] text-[#8888aa] mt-0.5">{stratDescs[strategy]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parallel Routing & Weighted Voting */}
      <GlassPanel className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={12} className="text-[#7B2CBF]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Advanced Options</span>
        </div>

        <div className="space-y-2">
          {/* Parallel Routing */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
            <div>
              <span className="text-[10px] text-white font-medium">Parallel Routing</span>
              <p className="text-[8px] text-[#8888aa] mt-0.5">Send requests to multiple providers simultaneously and use the fastest response</p>
            </div>
            <ToggleSwitch
              checked={localConfig.parallelRouting}
              onChange={(v) => setLocalConfig({ ...localConfig, parallelRouting: v })}
              color="#7B2CBF"
            />
          </div>

          {/* Weighted Voting */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
            <div>
              <span className="text-[10px] text-white font-medium">Weighted Voting</span>
              <p className="text-[8px] text-[#8888aa] mt-0.5">Weight model responses by quality score and reliability when routing</p>
            </div>
            <ToggleSwitch
              checked={localConfig.weightedVoting}
              onChange={(v) => setLocalConfig({ ...localConfig, weightedVoting: v })}
              color="#7B2CBF"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Current Config Summary */}
      <GlassPanel className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={12} className="text-[#1B998B]" />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Current Configuration</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Mode', value: ROUTING_LABELS[localConfig.mode], color: '#9d4edd' },
            { label: 'Parallel', value: localConfig.parallelRouting ? 'ON' : 'OFF', color: localConfig.parallelRouting ? '#00ff88' : '#8888aa' },
            { label: 'Weighted', value: localConfig.weightedVoting ? 'ON' : 'OFF', color: localConfig.weightedVoting ? '#00ff88' : '#8888aa' },
            { label: 'Consensus', value: isConsensus ? `${localConfig.consensusConfig.agentCount} agents / ${localConfig.consensusConfig.strategy}` : 'N/A', color: '#FFB627' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5 text-center">
              <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">{item.label}</div>
              <div className="text-[10px] font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={saveConfig}
          className="w-full mt-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)' }}
        >
          Save Router Configuration
        </button>
      </GlassPanel>
    </div>
  );
}
