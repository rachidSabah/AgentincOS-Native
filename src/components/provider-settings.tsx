'use client';

import {
  useOSStore,
  type ProviderConfig,
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Brain, Cpu, Shield, Route, Plus, X, Check,
  Eye, EyeOff, RefreshCw, Trash2, Save, ChevronDown, ChevronRight,
  Globe, Cloud, HardDrive, Zap, DollarSign, Activity, ArrowUpDown,
  Sparkles, Thermometer, Search as SearchIcon, Wrench, Database,
  Lock, Code, Gem, ToggleLeft, Settings2, ChevronUp,
  Radio, Heart, Clock, AlertTriangle, Box,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════
// PROVIDER SETTINGS — Unified LLM Provider Management
// ═══════════════════════════════════════════════════════════

const HEALTH_COLORS: {[key: string]: string} = {
  healthy: '#00ff88',
  degraded: '#FFB627',
  offline: '#ff4444',
  unknown: '#8888aa',
};

const TYPE_ICONS: {[key: string]: typeof Cloud} = {
  cloud: Cloud,
  local: HardDrive,
  custom: Wrench,
  cli: Terminal,
};

const TYPE_COLORS: {[key: string]: string} = {
  cloud: '#FFB627',
  local: '#1B998B',
  custom: '#00ff88',
  cli: '#4285f4',
};

function Terminal(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function formatTimestamp(ts: number): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Glass Panel ───
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

// ─── Toggle Switch ───
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

// ═══════════════════════════════════════════════════════════
// PROVIDER SETTINGS PAGE
// ═══════════════════════════════════════════════════════════

export function ProviderSettingsPage() {
  const { providers, addProvider, updateProvider, removeProvider, activeProviderId, geminiCLI, updateGeminiCLI } = useOSStore();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{[key: string]: { ok: boolean; msg: string }}>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customProvider, setCustomProvider] = useState({
    name: '',
    apiEndpoint: '',
    apiKey: '',
    defaultModel: '',
    type: 'custom' as 'cloud' | 'local' | 'custom',
    maxContextTokens: 128000,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
  });

  const enabledProviders = useMemo(() => providers.filter(p => p.enabled), [providers]);
  const activeProvider = useMemo(() => providers.find(p => p.id === activeProviderId), [providers, activeProviderId]);

  // ─── Health Check ───
  const runHealthCheck = useCallback(async (providerId: string) => {
    setTestingId(providerId);
    setTestResult(prev => ({ ...prev, [providerId]: { ok: false, msg: 'Checking...' } }));
    try {
      const res = await fetch(`/api/providers/health?id=${providerId}`);
      const data = await res.json();
      const ok = res.ok && data.healthy !== false;
      setTestResult(prev => ({
        ...prev,
        [providerId]: { ok, msg: ok ? (data.message || 'Healthy') : (data.error || 'Unhealthy') },
      }));
      updateProvider(providerId, {
        healthStatus: ok ? 'healthy' : 'degraded',
        lastHealthCheck: Date.now(),
      });
    } catch {
      setTestResult(prev => ({
        ...prev,
        [providerId]: { ok: false, msg: 'Connection failed' },
      }));
      updateProvider(providerId, { healthStatus: 'offline', lastHealthCheck: Date.now() });
    } finally {
      setTimeout(() => setTestingId(null), 500);
    }
  }, [updateProvider]);

  // ─── Add Custom Provider ───
  const handleAddCustom = useCallback(() => {
    if (!customProvider.name.trim() || !customProvider.apiEndpoint.trim()) return;
    const id = generateId();
    addProvider({
      id,
      name: customProvider.name.trim(),
      type: customProvider.type,
      apiEndpoint: customProvider.apiEndpoint.trim(),
      apiKey: customProvider.apiKey,
      models: customProvider.defaultModel ? [customProvider.defaultModel] : [],
      defaultModel: customProvider.defaultModel || '',
      enabled: false,
      healthStatus: 'unknown',
      lastHealthCheck: 0,
      rateLimit: { rpm: 60, tpm: 100000 },
      costConfig: { alertThreshold: 50, hardStop: false, dailyLimit: 50, monthlyLimit: 500 },
      priority: providers.length + 1,
      icon: '🔧',
      color: '#00ff88',
      description: `Custom provider: ${customProvider.name}`,
      website: '',
      supportsStreaming: customProvider.supportsStreaming,
      supportsVision: customProvider.supportsVision,
      supportsTools: customProvider.supportsTools,
      maxContextTokens: customProvider.maxContextTokens,
    });
    setCustomProvider({
      name: '', apiEndpoint: '', apiKey: '', defaultModel: '',
      type: 'custom', maxContextTokens: 128000,
      supportsStreaming: true, supportsVision: false, supportsTools: true,
    });
    setShowCustomForm(false);
  }, [customProvider, providers.length, addProvider]);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <GlassPanel className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[rgba(0,255,255,0.06)] to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00ffff] to-[#0088aa] flex items-center justify-center shadow-lg shadow-[#00ffff]/20">
                <Server size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg tracking-wide">Provider Settings</h2>
                <p className="text-[#8888aa] text-xs">Manage all LLM providers and execution engines</p>
              </div>
            </div>
            <ActiveProviderBadge />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Providers', value: providers.length, color: '#9d4edd', icon: Server },
              { label: 'Enabled', value: enabledProviders.length, color: '#00ff88', icon: Check },
              { label: 'Healthy', value: providers.filter(p => p.healthStatus === 'healthy').length, color: '#00ffff', icon: Heart },
              { label: 'Custom', value: providers.filter(p => p.type === 'custom').length, color: '#FFB627', icon: Wrench },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-3 text-center"
                style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}
              >
                <stat.icon size={12} className="mx-auto mb-1" style={{ color: stat.color }} />
                <div className="text-white font-mono font-bold text-lg" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* ─── Provider Grid ─── */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={Server} title="Provider Registry" color="#9d4edd" badge={`${providers.length} PROVIDERS`} />
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-colors"
          >
            <Plus size={10} /> Add Custom
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {providers.map((provider, i) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isSelected={selectedProviderId === provider.id}
              onSelect={() => setSelectedProviderId(selectedProviderId === provider.id ? null : provider.id)}
              onToggle={() => updateProvider(provider.id, { enabled: !provider.enabled })}
              onHealthCheck={() => runHealthCheck(provider.id)}
              isTesting={testingId === provider.id}
              testResult={testResult[provider.id]}
              index={i}
            />
          ))}
        </div>
      </GlassPanel>

      {/* ─── Selected Provider Detail ─── */}
      <AnimatePresence>
        {selectedProvider && (
          <ProviderDetailPanel
            provider={selectedProvider}
            showApiKey={showApiKey[selectedProvider.id] || false}
            onToggleApiKey={() => setShowApiKey(prev => ({ ...prev, [selectedProvider.id]: !prev[selectedProvider.id] }))}
            onHealthCheck={() => runHealthCheck(selectedProvider.id)}
            isTesting={testingId === selectedProvider.id}
            testResult={testResult[selectedProvider.id]}
            onClose={() => setSelectedProviderId(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Custom Provider Form ─── */}
      <AnimatePresence>
        {showCustomForm && (
          <CustomProviderForm
            customProvider={customProvider}
            onCustomProviderChange={setCustomProvider}
            onSubmit={handleAddCustom}
            onCancel={() => setShowCustomForm(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Gemini CLI Setup ─── */}
      <GeminiCLISetup />

      {/* ─── Provider Health Overview ─── */}
      <GlassPanel className="p-6">
        <SectionHeader icon={Heart} title="Provider Health Overview" color="#00ff88" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.filter(p => p.enabled).map((provider) => (
            <ProviderHealthCard key={provider.id} provider={provider} />
          ))}
          {enabledProviders.length === 0 && (
            <div className="col-span-full text-center py-8 text-[#8888aa] text-xs">
              No providers enabled. Enable a provider to see health data.
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROVIDER CARD
// ═══════════════════════════════════════════════════════════

function ProviderCard({
  provider,
  isSelected,
  onSelect,
  onToggle,
  onHealthCheck,
  isTesting,
  testResult,
  index,
}: {
  provider: ProviderConfig;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onHealthCheck: () => void;
  isTesting: boolean;
  testResult?: { ok: boolean; msg: string };
  index: number;
}) {
  const healthColor = HEALTH_COLORS[provider.healthStatus] || '#8888aa';
  const TypeIcon = TYPE_ICONS[provider.type] || Cloud;
  const typeColor = TYPE_COLORS[provider.type] || '#8888aa';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${
        isSelected ? 'ring-1' : ''
      }`}
      style={{
        borderColor: isSelected ? `${provider.color}40` : `${provider.color}20`,
        background: isSelected ? `${provider.color}08` : `${provider.color}04`,
        ringColor: isSelected ? `${provider.color}60` : undefined,
      }}
      onClick={onSelect}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${provider.color}15`, border: `1px solid ${provider.color}30` }}
          >
            {provider.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-xs">{provider.name}</span>
              <span
                className="text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ color: typeColor, background: `${typeColor}12`, border: `1px solid ${typeColor}25` }}
              >
                <TypeIcon size={7} className="inline mr-0.5" style={{ color: typeColor }} />
                {provider.type}
              </span>
            </div>
            <div className="text-[9px] text-[#8888aa] truncate mt-0.5">{provider.defaultModel}</div>
          </div>
          <ToggleSwitch
            checked={provider.enabled}
            onChange={onToggle}
            color={provider.color}
          />
        </div>

        {/* Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${provider.healthStatus === 'healthy' ? 'animate-pulse' : ''}`} style={{ backgroundColor: healthColor }} />
            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: healthColor }}>{provider.healthStatus}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Feature badges */}
            {provider.supportsStreaming && <span className="text-[7px] px-1 py-0.5 rounded bg-[rgba(0,255,255,0.08)] text-[#00ffff] border border-[rgba(0,255,255,0.15)]">stream</span>}
            {provider.supportsVision && <span className="text-[7px] px-1 py-0.5 rounded bg-[rgba(157,78,221,0.08)] text-[#9d4edd] border border-[rgba(157,78,221,0.15)]">vision</span>}
            {provider.supportsTools && <span className="text-[7px] px-1 py-0.5 rounded bg-[rgba(0,255,136,0.08)] text-[#00ff88] border border-[rgba(0,255,136,0.15)]">tools</span>}
          </div>
        </div>

        {/* Context window */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(157,78,221,0.08)]">
          <span className="text-[8px] text-[#8888aa]">{formatTokens(provider.maxContextTokens)} ctx</span>
          <span className="text-[8px] text-[#8888aa]">Priority: {provider.priority}</span>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`flex items-center gap-1.5 mt-2 p-2 rounded-lg text-[9px] ${
            testResult.ok ? 'bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.15)]' : 'bg-[rgba(255,68,68,0.06)] border border-[rgba(255,68,68,0.15)]'
          }`}>
            {testResult.ok ? <Check size={10} className="text-[#00ff88]" /> : <AlertTriangle size={10} className="text-[#ff4444]" />}
            <span className={testResult.ok ? 'text-[#00ff88]' : 'text-[#ff4444]'}>{testResult.msg}</span>
          </div>
        )}

        {/* Quick health check */}
        <button
          onClick={(e) => { e.stopPropagation(); onHealthCheck(); }}
          disabled={isTesting}
          className="w-full mt-2 py-1.5 rounded-lg border border-[rgba(157,78,221,0.15)] text-[9px] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <RefreshCw size={9} className={isTesting ? 'animate-spin' : ''} />
          {isTesting ? 'Checking...' : 'Health Check'}
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROVIDER DETAIL PANEL
// ═══════════════════════════════════════════════════════════

function ProviderDetailPanel({
  provider,
  showApiKey,
  onToggleApiKey,
  onHealthCheck,
  isTesting,
  testResult,
  onClose,
}: {
  provider: ProviderConfig;
  showApiKey: boolean;
  onToggleApiKey: () => void;
  onHealthCheck: () => void;
  isTesting: boolean;
  testResult?: { ok: boolean; msg: string };
  onClose: () => void;
}) {
  const { updateProvider } = useOSStore();
  const [draft, setDraft] = useState<Partial<ProviderConfig>>({ ...provider });
  const [newModel, setNewModel] = useState('');

  const saveDraft = useCallback(() => {
    updateProvider(provider.id, draft);
  }, [provider.id, draft, updateProvider]);

  const addCustomModel = useCallback(() => {
    if (!newModel.trim()) return;
    const updatedModels = [...(draft.models || provider.models), newModel.trim()];
    setDraft(prev => ({ ...prev, models: updatedModels }));
    setNewModel('');
  }, [newModel, draft.models, provider.models]);

  const removeModel = useCallback((model: string) => {
    const updatedModels = (draft.models || provider.models).filter(m => m !== model);
    setDraft(prev => ({
      ...prev,
      models: updatedModels,
      defaultModel: draft.defaultModel === model ? (updatedModels[0] || '') : draft.defaultModel,
    }));
  }, [draft.models, draft.defaultModel, provider.models]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${provider.color}15`, border: `1px solid ${provider.color}30` }}
            >
              {provider.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-base">{provider.name}</h3>
              <p className="text-[9px] text-[#8888aa]">{provider.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8888aa] hover:text-white transition-colors p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left Column: Core Config ─── */}
          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={draft.apiKey ?? ''}
                  onChange={(e) => setDraft(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  placeholder="sk-..."
                />
                <button
                  onClick={onToggleApiKey}
                  className="p-2 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] transition-colors flex-shrink-0"
                >
                  {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!draft.apiKey) return;
                  try {
                    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch-models', apiKey: draft.apiKey, provider: provider.name }) });
                    const data = await res.json();
                    if (data.success && data.models?.length > 0) {
                      setDraft(prev => ({ ...prev, models: data.models.map((m: any) => m.id || m.name), defaultModel: data.models[0]?.id || data.models[0]?.name || prev.defaultModel }));
                    }
                  } catch { /* ignore */ }
                }}
                disabled={!draft.apiKey}
                className="mt-1.5 px-3 py-1 rounded text-[9px] font-medium bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] disabled:opacity-30 transition-colors"
              >
                Fetch Models
              </button>
            </div>

            {/* API Endpoint */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">API Endpoint</label>
              <input
                type="text"
                value={draft.apiEndpoint ?? ''}
                onChange={(e) => setDraft(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              />
            </div>

            {/* Default Model */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Default Model</label>
              <select
                value={draft.defaultModel ?? ''}
                onChange={(e) => setDraft(prev => ({ ...prev, defaultModel: e.target.value }))}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              >
                {(draft.models || provider.models).map((m, i) => (
                  <option key={`${m}-${i}`} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Add Custom Model */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Add Custom Model</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomModel()}
                  placeholder="model-name"
                  className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                />
                <button
                  onClick={addCustomModel}
                  className="px-3 py-2 rounded-lg border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.06)] transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              {/* Model list */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(draft.models || provider.models).map((m, i) => (
                  <div key={m} className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)]">
                    <span className={m === draft.defaultModel ? 'text-[#9d4edd] font-semibold' : 'text-[#ccccdd]'}>{m}</span>
                    <button onClick={() => removeModel(m)} className="text-[#8888aa] hover:text-[#E63946] transition-colors">
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Temperature & Top P */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Temperature</label>
                  <span className="text-[10px] font-mono text-[#E8751A]">0.70</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  defaultValue="0.7"
                  className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer accent-[#E8751A]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Top P</label>
                  <span className="text-[10px] font-mono text-[#00ffff]">0.90</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.9"
                  className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer accent-[#00ffff]"
                />
              </div>
            </div>

            {/* Reasoning Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(10,10,26,0.4)] border border-[rgba(157,78,221,0.1)]">
              <div>
                <span className="text-[10px] text-white font-medium">Reasoning Mode</span>
                <p className="text-[8px] text-[#8888aa]">Enable extended reasoning for complex tasks</p>
              </div>
              <ToggleSwitch
                checked={!!(draft as any).reasoningMode}
                onChange={(v) => setDraft((prev: any) => ({ ...prev, reasoningMode: v }))}
                color="#9d4edd"
              />
            </div>
          </div>

          {/* ─── Right Column: Limits & Features ─── */}
          <div className="space-y-4">
            {/* Context Window */}
            <div className="p-3 rounded-xl bg-[rgba(10,10,26,0.4)] border border-[rgba(157,78,221,0.1)]">
              <div className="flex items-center gap-2 mb-2">
                <Box size={12} className="text-[#00ffff]" />
                <span className="text-[10px] text-white font-medium">Context Window</span>
              </div>
              <div className="text-[20px] font-mono font-bold" style={{ color: provider.color }}>{formatTokens(provider.maxContextTokens)}</div>
              <div className="text-[8px] text-[#8888aa]">tokens</div>
            </div>

            {/* Rate Limits */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Rate Limits</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] text-[#8888aa] block mb-1">RPM</label>
                  <input
                    type="number"
                    value={draft.rateLimit?.rpm ?? provider.rateLimit.rpm}
                    onChange={(e) => setDraft(prev => ({ ...prev, rateLimit: { ...prev.rateLimit!, rpm: Number(e.target.value) } }))}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-[8px] text-[#8888aa] block mb-1">TPM</label>
                  <input
                    type="number"
                    value={draft.rateLimit?.tpm ?? provider.rateLimit.tpm}
                    onChange={(e) => setDraft(prev => ({ ...prev, rateLimit: { ...prev.rateLimit!, tpm: Number(e.target.value) } }))}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Cost Controls */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Cost Controls</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] text-[#8888aa] block mb-1">Daily Limit ($)</label>
                  <input
                    type="number"
                    value={draft.costConfig?.dailyLimit ?? provider.costConfig.dailyLimit}
                    onChange={(e) => setDraft(prev => ({ ...prev, costConfig: { ...prev.costConfig!, dailyLimit: Number(e.target.value) } }))}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-[8px] text-[#8888aa] block mb-1">Monthly Limit ($)</label>
                  <input
                    type="number"
                    value={draft.costConfig?.monthlyLimit ?? provider.costConfig.monthlyLimit}
                    onChange={(e) => setDraft(prev => ({ ...prev, costConfig: { ...prev.costConfig!, monthlyLimit: Number(e.target.value) } }))}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-[8px] text-[#8888aa] block mb-1">Alert Threshold ($)</label>
                  <input
                    type="number"
                    value={draft.costConfig?.alertThreshold ?? provider.costConfig.alertThreshold}
                    onChange={(e) => setDraft(prev => ({ ...prev, costConfig: { ...prev.costConfig!, alertThreshold: Number(e.target.value) } }))}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]"
                    min={0}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
                    <div>
                      <span className="text-[10px] text-white font-medium">Hard Stop</span>
                      <p className="text-[7px] text-[#8888aa]">Block over-budget calls</p>
                    </div>
                    <ToggleSwitch
                      checked={draft.costConfig?.hardStop ?? provider.costConfig.hardStop}
                      onChange={(v) => setDraft(prev => ({ ...prev, costConfig: { ...prev.costConfig!, hardStop: v } }))}
                      color="#E63946"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] text-[#8888aa] uppercase tracking-wider">Priority</label>
                <span className="text-[10px] font-mono font-bold" style={{ color: provider.color }}>{draft.priority ?? provider.priority}</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={draft.priority ?? provider.priority}
                onChange={(e) => setDraft(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full appearance-none cursor-pointer"
                style={{ accentColor: provider.color }}
              />
              <div className="flex justify-between text-[8px] text-[#8888aa] mt-1">
                <span>Highest</span>
                <span>Lowest</span>
              </div>
            </div>

            {/* Supported Features */}
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Supported Features</label>
              <div className="space-y-2">
                {[
                  { key: 'supportsStreaming' as const, label: 'Streaming', icon: Activity, color: '#00ffff' },
                  { key: 'supportsVision' as const, label: 'Vision', icon: Eye, color: '#9d4edd' },
                  { key: 'supportsTools' as const, label: 'Tool Calling', icon: Wrench, color: '#00ff88' },
                ].map(feature => (
                  <div key={feature.key} className="flex items-center justify-between p-2 rounded-lg bg-[rgba(10,10,26,0.4)] border border-[rgba(157,78,221,0.08)]">
                    <div className="flex items-center gap-2">
                      <feature.icon size={12} style={{ color: feature.color }} />
                      <span className="text-[10px] text-[#ccccdd]">{feature.label}</span>
                    </div>
                    <ToggleSwitch
                      checked={draft[feature.key] ?? provider[feature.key]}
                      onChange={(v) => setDraft(prev => ({ ...prev, [feature.key]: v }))}
                      color={feature.color}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(10,10,26,0.4)] border border-[rgba(157,78,221,0.1)]">
              <div>
                <span className="text-[10px] text-white font-medium">Provider Enabled</span>
                <p className="text-[8px] text-[#8888aa]">Toggle this provider on/off for routing</p>
              </div>
              <ToggleSwitch
                checked={draft.enabled ?? provider.enabled}
                onChange={(v) => setDraft(prev => ({ ...prev, enabled: v }))}
                color={provider.color}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => { onHealthCheck(); }}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-all disabled:opacity-50"
                style={{ borderColor: `${provider.color}30`, color: provider.color, background: `${provider.color}08`, border: `1px solid ${provider.color}30` }}
              >
                <RefreshCw size={10} className={isTesting ? 'animate-spin' : ''} />
                {isTesting ? 'Checking...' : 'Health Check'}
              </button>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[10px] font-medium hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors"
              >
                <X size={10} /> Cancel
              </button>
              <button
                onClick={saveDraft}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-medium text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${provider.color}cc, ${provider.color}88)`, border: `1px solid ${provider.color}40` }}
              >
                <Save size={10} /> Save
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-[10px] ${
                testResult.ok ? 'border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.06)]' : 'border-[rgba(255,68,68,0.2)] bg-[rgba(255,68,68,0.06)]'
              }`}>
                {testResult.ok ? <Check size={12} className="text-[#00ff88]" /> : <AlertTriangle size={12} className="text-[#ff4444]" />}
                <span className={testResult.ok ? 'text-[#00ff88]' : 'text-[#ff4444]'}>{testResult.msg}</span>
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOM PROVIDER FORM
// ═══════════════════════════════════════════════════════════

function CustomProviderForm({
  customProvider,
  onCustomProviderChange,
  onSubmit,
  onCancel,
}: {
  customProvider: {
    name: string;
    apiEndpoint: string;
    apiKey: string;
    defaultModel: string;
    type: 'cloud' | 'local' | 'custom';
    maxContextTokens: number;
    supportsStreaming: boolean;
    supportsVision: boolean;
    supportsTools: boolean;
  };
  onCustomProviderChange: (v: typeof customProvider) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <GlassPanel className="p-6">
        <SectionHeader icon={Plus} title="Add Custom Provider" color="#00ff88" badge="OpenAI-COMPATIBLE" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Provider Name</label>
            <input
              type="text"
              value={customProvider.name}
              onChange={(e) => onCustomProviderChange({ ...customProvider, name: e.target.value })}
              placeholder="My Custom API"
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['cloud', 'local', 'custom'] as const).map(type => {
                const isActive = customProvider.type === type;
                const color = TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => onCustomProviderChange({ ...customProvider, type })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-medium capitalize transition-all ${isActive ? 'text-white' : 'text-[#8888aa]'}`}
                    style={isActive ? { background: `${color}15`, border: `1px solid ${color}30` } : { border: '1px solid rgba(157,78,221,0.1)' }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Endpoint */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">API Endpoint</label>
            <input
              type="text"
              value={customProvider.apiEndpoint}
              onChange={(e) => onCustomProviderChange({ ...customProvider, apiEndpoint: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">API Key</label>
            <input
              type="password"
              value={customProvider.apiKey}
              onChange={(e) => onCustomProviderChange({ ...customProvider, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
            />
          </div>

          {/* Default Model */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Default Model</label>
            <input
              type="text"
              value={customProvider.defaultModel}
              onChange={(e) => onCustomProviderChange({ ...customProvider, defaultModel: e.target.value })}
              placeholder="my-model-v1"
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
            />
          </div>

          {/* Max Context Tokens */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Max Context Tokens</label>
            <input
              type="number"
              value={customProvider.maxContextTokens}
              onChange={(e) => onCustomProviderChange({ ...customProvider, maxContextTokens: Number(e.target.value) })}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              min={1024}
            />
          </div>

          {/* Feature Toggles */}
          <div className="md:col-span-2">
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Features</label>
            <div className="flex items-center gap-4">
              {[
                { key: 'supportsStreaming' as const, label: 'Streaming', color: '#00ffff' },
                { key: 'supportsVision' as const, label: 'Vision', color: '#9d4edd' },
                { key: 'supportsTools' as const, label: 'Tools', color: '#00ff88' },
              ].map(feature => (
                <div key={feature.key} className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={customProvider[feature.key]}
                    onChange={(v) => onCustomProviderChange({ ...customProvider, [feature.key]: v })}
                    color={feature.color}
                  />
                  <span className="text-[10px] text-[#ccccdd]">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(157,78,221,0.1)]">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[rgba(136,136,170,0.2)] text-[#8888aa] text-[10px] font-medium hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors"
          >
            <X size={10} /> Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={onSubmit}
            disabled={!customProvider.name.trim() || !customProvider.apiEndpoint.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00ff88cc, #00ff8888)' }}
          >
            <Plus size={10} /> Add Provider
          </button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROVIDER HEALTH CARD
// ═══════════════════════════════════════════════════════════

export function ProviderHealthCard({ provider }: { provider: ProviderConfig }) {
  const healthColor = HEALTH_COLORS[provider.healthStatus] || '#8888aa';

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: `${provider.color}06`, border: `1px solid ${provider.color}20` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: `${provider.color}15`, border: `1px solid ${provider.color}30` }}
        >
          {provider.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-semibold">{provider.name}</div>
          <div className="text-[8px] text-[#8888aa] font-mono truncate">{provider.defaultModel}</div>
        </div>
        <div className={`w-2 h-2 rounded-full ${provider.healthStatus === 'healthy' ? 'animate-pulse' : ''}`} style={{ backgroundColor: healthColor }} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg p-2 bg-[rgba(10,10,26,0.4)]">
          <div className="text-[7px] text-[#8888aa] uppercase">Status</div>
          <div className="text-[10px] font-mono font-bold" style={{ color: healthColor }}>{provider.healthStatus}</div>
        </div>
        <div className="rounded-lg p-2 bg-[rgba(10,10,26,0.4)]">
          <div className="text-[7px] text-[#8888aa] uppercase">Last Check</div>
          <div className="text-[10px] font-mono text-white">{provider.lastHealthCheck ? formatTimestamp(provider.lastHealthCheck) : 'Never'}</div>
        </div>
        <div className="rounded-lg p-2 bg-[rgba(10,10,26,0.4)]">
          <div className="text-[7px] text-[#8888aa] uppercase">RPM</div>
          <div className="text-[10px] font-mono text-white">{provider.rateLimit.rpm}</div>
        </div>
        <div className="rounded-lg p-2 bg-[rgba(10,10,26,0.4)]">
          <div className="text-[7px] text-[#8888aa] uppercase">Context</div>
          <div className="text-[10px] font-mono text-white">{formatTokens(provider.maxContextTokens)}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ACTIVE PROVIDER BADGE
// ═══════════════════════════════════════════════════════════

export function ActiveProviderBadge() {
  const { providers, activeProviderId } = useOSStore();
  const activeProvider = providers.find(p => p.id === activeProviderId) || providers.find(p => p.enabled && p.apiKey);

  if (!activeProvider) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(136,136,170,0.2)] bg-[rgba(136,136,170,0.05)]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#8888aa]" />
        <span className="text-[10px] text-[#8888aa] font-medium">No Active Provider</span>
      </div>
    );
  }

  const healthColor = HEALTH_COLORS[activeProvider.healthStatus] || '#8888aa';

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{ borderColor: `${activeProvider.color}30`, background: `${activeProvider.color}10` }}
    >
      <div className={`w-2 h-2 rounded-full ${activeProvider.healthStatus === 'healthy' ? 'animate-pulse' : ''}`} style={{ backgroundColor: healthColor }} />
      <span className="text-[10px] font-semibold" style={{ color: activeProvider.color }}>{activeProvider.name}</span>
      <span className="text-[8px] text-[#8888aa] font-mono">{activeProvider.defaultModel}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GEMINI CLI SETUP
// ═══════════════════════════════════════════════════════════

export function GeminiCLISetup() {
  const { geminiCLI, updateGeminiCLI, updateProvider } = useOSStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleAutoDetect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/gemini/health');
      if (res.ok) {
        const data = await res.json();
        updateGeminiCLI({
          installed: true,
          running: data.running ?? true,
          version: data.version ?? 'unknown',
          path: data.path ?? '',
          lastHealthCheck: Date.now(),
        });
        updateProvider('gemini-cli', {
          enabled: true,
          healthStatus: data.running ? 'healthy' : 'degraded',
          lastHealthCheck: Date.now(),
        });
      } else {
        updateGeminiCLI({ installed: false, running: false, lastHealthCheck: Date.now() });
        updateProvider('gemini-cli', { healthStatus: 'offline', lastHealthCheck: Date.now() });
      }
    } catch {
      updateGeminiCLI({ installed: false, running: false, lastHealthCheck: Date.now() });
      updateProvider('gemini-cli', { healthStatus: 'offline', lastHealthCheck: Date.now() });
    } finally {
      setIsDetecting(false);
    }
  }, [updateGeminiCLI, updateProvider]);

  const handleHealthCheck = useCallback(async () => {
    try {
      const res = await fetch('/api/gemini/health');
      if (res.ok) {
        const data = await res.json();
        updateGeminiCLI({
          running: data.running ?? true,
          lastHealthCheck: Date.now(),
        });
        updateProvider('gemini-cli', {
          healthStatus: data.running ? 'healthy' : 'degraded',
          lastHealthCheck: Date.now(),
        });
      }
    } catch {
      updateGeminiCLI({ running: false, lastHealthCheck: Date.now() });
      updateProvider('gemini-cli', { healthStatus: 'offline', lastHealthCheck: Date.now() });
    }
  }, [updateGeminiCLI, updateProvider]);

  const statusColor = geminiCLI.running ? '#00ff88' : geminiCLI.installed ? '#FFB627' : '#8888aa';
  const statusLabel = geminiCLI.running ? 'Running' : geminiCLI.installed ? 'Installed' : 'Not Detected';

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <SectionHeader icon={Gem} title="Gemini CLI" color="#4285f4" badge={statusLabel.toUpperCase()} />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${geminiCLI.running ? 'animate-pulse' : ''}`} style={{ backgroundColor: statusColor }} />
          <span className="text-[9px] font-mono font-bold" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Left: Status & Controls ─── */}
        <div className="space-y-4">
          {/* Installation Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: '#4285f408', border: '1px solid #4285f420' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Installed</div>
              <div className="text-[14px] font-mono font-bold" style={{ color: geminiCLI.installed ? '#00ff88' : '#E63946' }}>
                {geminiCLI.installed ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#4285f408', border: '1px solid #4285f420' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Version</div>
              <div className="text-[14px] font-mono font-bold text-white">{geminiCLI.version || '--'}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#4285f408', border: '1px solid #4285f420' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Running</div>
              <div className="text-[14px] font-mono font-bold" style={{ color: geminiCLI.running ? '#00ff88' : '#E63946' }}>
                {geminiCLI.running ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#4285f408', border: '1px solid #4285f420' }}>
              <div className="text-[8px] text-[#8888aa] uppercase">Last Check</div>
              <div className="text-[10px] font-mono text-white">
                {geminiCLI.lastHealthCheck ? formatTimestamp(geminiCLI.lastHealthCheck) : 'Never'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleAutoDetect}
              disabled={isDetecting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4285f4cc, #4285f488)', border: '1px solid #4285f440' }}
            >
              {isDetecting ? <RefreshCw size={12} className="animate-spin" /> : <SearchIcon size={12} />}
              {isDetecting ? 'Detecting...' : 'Auto-Detect Gemini CLI'}
            </button>
            <button
              onClick={handleHealthCheck}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[rgba(66,133,244,0.2)] text-[#4285f4] text-[10px] font-medium hover:bg-[rgba(66,133,244,0.06)] transition-colors"
            >
              <Heart size={10} /> Health Check
            </button>
          </div>

          {/* Install Instructions */}
          {!geminiCLI.installed && (
            <div className="p-3 rounded-xl bg-[rgba(10,10,26,0.5)] border border-[rgba(66,133,244,0.15)]">
              <div className="text-[9px] text-[#4285f4] font-semibold uppercase tracking-wider mb-2">Installation</div>
              <div className="bg-[rgba(10,10,26,0.8)] rounded-lg p-2.5 font-mono text-[9px] text-[#ccccdd]">
                <div className="text-[#8888aa]"># Install Gemini CLI globally</div>
                <div className="text-[#00ff88]">npm install -g @anthropic-ai/gemini-cli</div>
                <div className="text-[#8888aa] mt-1"># Or use the official installer</div>
                <div className="text-[#00ff88]">curl -fsSL https://cli.gemini.ai/install | bash</div>
              </div>
            </div>
          )}

          {/* Path */}
          {geminiCLI.installed && geminiCLI.path && (
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1">Path</label>
              <div className="bg-[rgba(10,10,26,0.5)] rounded-lg px-3 py-2 text-[10px] text-[#ccccdd] font-mono truncate">
                {geminiCLI.path}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: Configuration ─── */}
        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Model</label>
            <select
              value={geminiCLI.model}
              onChange={(e) => updateGeminiCLI({ model: e.target.value })}
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(66,133,244,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono focus:outline-none focus:border-[rgba(66,133,244,0.4)] transition-colors"
            >
              <option value="auto">auto (Default)</option>
              <option value="pro">pro (Deep Reasoning)</option>
              <option value="flash">flash (Balanced)</option>
              <option value="flash-lite">flash-lite (Fastest)</option>
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
            </select>
          </div>

          {/* Project Context */}
          <div>
            <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Project Context</label>
            <input
              type="text"
              value={geminiCLI.projectContext}
              onChange={(e) => updateGeminiCLI({ projectContext: e.target.value })}
              placeholder="/path/to/project"
              className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(66,133,244,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] focus:outline-none focus:border-[rgba(66,133,244,0.4)] transition-colors"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {[
              { key: 'sandboxEnabled' as const, label: 'Sandbox Mode', desc: 'Execute code in a sandboxed environment', color: '#E8751A' },
              { key: 'autoDetect' as const, label: 'Auto-Detect', desc: 'Automatically detect Gemini CLI on startup', color: '#4285f4' },
              { key: 'autoStart' as const, label: 'Auto-Start', desc: 'Start Gemini CLI automatically when available', color: '#00ff88' },
            ].map(toggle => (
              <div
                key={toggle.key}
                className="flex items-center justify-between p-3 rounded-xl bg-[rgba(10,10,26,0.4)] border border-[rgba(157,78,221,0.08)]"
              >
                <div>
                  <span className="text-[10px] text-white font-medium">{toggle.label}</span>
                  <p className="text-[7px] text-[#8888aa]">{toggle.desc}</p>
                </div>
                <ToggleSwitch
                  checked={geminiCLI[toggle.key]}
                  onChange={(v) => updateGeminiCLI({ [toggle.key]: v })}
                  color={toggle.color}
                />
              </div>
            ))}
          </div>

          {/* Projects */}
          {geminiCLI.projects.length > 0 && (
            <div>
              <label className="text-[9px] text-[#8888aa] uppercase tracking-wider block mb-1.5">Projects ({geminiCLI.projects.length})</label>
              <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                {geminiCLI.projects.map(project => (
                  <div key={project.id} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(10,10,26,0.4)]">
                    <span className="text-[10px] text-white font-medium">{project.name}</span>
                    <span className="text-[8px] text-[#8888aa] font-mono truncate">{project.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
