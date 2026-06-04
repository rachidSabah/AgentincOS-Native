'use client';

import { useOSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Cpu, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Zap, Brain, Activity, Globe } from 'lucide-react';
import { useState, useCallback } from 'react';
import { DEFAULT_REGISTRY } from '@/lib/model-registry';

export function ModelsDashboard() {
  const { providers, modelRegistry } = useOSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Merge default Gemini CLI models with discovered provider models
  const allModels = [...DEFAULT_REGISTRY];
  for (const p of providers) {
    if (p.enabled && p.models) {
      for (const m of p.models) {
        if (!allModels.find(x => x.id === m)) {
          allModels.push({ id: m, name: m, providerId: p.id, providerName: p.name, contextWindow: p.maxContextTokens || 128000, capabilities: [], pricing: { input: 0, output: 0 }, health: p.healthStatus || 'healthy', latency: 0, available: true, role: 'worker', assigned: false, lastCheck: Date.now() });
        }
      }
    }
  }

  const filtered = searchQuery ? allModels.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.providerName.toLowerCase().includes(searchQuery.toLowerCase())) : allModels;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    for (const p of providers.filter(x => x.enabled && x.apiKey)) {
      try {
        const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch-models', apiKey: p.apiKey, provider: p.name }) });
      } catch { /* skip */ }
    }
    setIsRefreshing(false);
  }, [providers]);

  const byProvider: Record<string, typeof allModels> = {};
  for (const m of allModels) { if (!byProvider[m.providerName]) byProvider[m.providerName] = []; byProvider[m.providerName].push(m); }

  const healthStats = { healthy: allModels.filter(m => m.health === 'healthy').length, degraded: allModels.filter(m => m.health === 'degraded').length, offline: allModels.filter(m => m.health === 'offline').length };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={16} style={{ color: '#9d4edd' }} />
          <span className="text-white font-bold text-sm uppercase tracking-wider">Model Registry</span>
          <span className="text-[10px] text-[#8888aa]">{allModels.length} models · {Object.keys(byProvider).length} providers</span>
        </div>
        <div className="flex gap-2">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search models..." className="bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-1.5 text-[10px] text-white placeholder-[#8888aa] outline-none w-48" />
          <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[rgba(157,78,221,0.15)] border border-[rgba(157,78,221,0.3)] text-[#9d4edd] disabled:opacity-30">
            {isRefreshing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />} Refresh All
          </button>
        </div>
      </div>

      {/* Health Bar */}
      <div className="flex gap-2 text-[9px]">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00ff88]" /> {healthStats.healthy} Healthy</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FFB627]" /> {healthStats.degraded} Degraded</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ff4444]" /> {healthStats.offline} Offline</span>
      </div>

      {/* By Provider */}
      {Object.entries(byProvider).map(([provider, models]) => (
        <div key={provider} className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.5)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)]">
            <Globe size={12} style={{ color: '#9d4edd' }} />
            <span className="text-[10px] text-white font-bold uppercase">{provider}</span>
            <span className="text-[8px] text-[#8888aa]">{models.length} models</span>
            {providers.find(p => p.name === provider)?.enabled ? (
              <span className="text-[7px] px-2 py-0.5 rounded bg-[rgba(0,255,136,0.1)] text-[#00ff88] ml-auto">Connected</span>
            ) : (
              <span className="text-[7px] px-2 py-0.5 rounded bg-[rgba(255,68,68,0.1)] text-[#ff4444] ml-auto">Disabled</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-[rgba(157,78,221,0.05)]">
            {models.slice(0, 20).map(m => (
              <motion.div key={m.id} whileHover={{ scale: 1.01 }} className="p-2.5 bg-[rgba(18,18,42,0.6)]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.health === 'healthy' ? '#00ff88' : m.health === 'degraded' ? '#FFB627' : '#ff4444' }} />
                  <span className="text-[9px] text-white font-mono truncate">{m.name}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[7px] px-1.5 py-0.5 rounded bg-[rgba(10,10,26,0.5)] text-[#8888aa]">{m.contextWindow >= 1000000 ? `${(m.contextWindow/1000000).toFixed(0)}M ctx` : `${(m.contextWindow/1000).toFixed(0)}K ctx`}</span>
                  {m.role !== 'worker' && <span className="text-[7px] px-1.5 py-0.5 rounded bg-[rgba(157,78,221,0.1)] text-[#9d4edd]">{m.role}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {allModels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Cpu size={48} className="text-[#8888aa] opacity-20 mb-3" />
          <div className="text-[#8888aa] text-xs">No models discovered</div>
          <div className="text-[8px] text-[#8888aa] mt-1">Add API keys in Settings → Providers to auto-discover models</div>
        </div>
      )}
    </div>
  );
}
