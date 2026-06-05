'use client';

// ============================================================
// Agentic OS V2 — Model Monitor (Floating Panel)
// ============================================================
import { useOSStore } from '@/lib/store';
import type { ModelProviderType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { X, Activity, Zap, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ProviderInfo {
  provider: ModelProviderType;
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  status: 'healthy' | 'degraded' | 'down';
}

const PROVIDER_NAMES: Record<ModelProviderType, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
  glm: 'GLM',
  mistral: 'Mistral',
  qwen: 'Qwen',
  deepseek: 'DeepSeek',
};

export function ModelMonitor() {
  const { modelMonitorVisible, setModelMonitorVisible } = useOSStore();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ModelProviderType>('openai');

  useEffect(() => {
    if (!modelMonitorVisible) return;
    const load = async () => {
      try {
        const response = await fetch('/api/models');
        const data = await response.json() as { providers: ProviderInfo[] };
        setProviders(data.providers ?? []);
      } catch {
        setProviders([
          { provider: 'openai', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
          { provider: 'claude', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
          { provider: 'gemini', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
          { provider: 'glm', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
          { provider: 'mistral', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
          { provider: 'qwen', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
          { provider: 'deepseek', healthy: true, latencyMs: 0, successRate: 1.0, status: 'healthy' },
        ]);
      }
    };
    load();
    const interval = setInterval(() => { load(); }, 5000);
    return () => clearInterval(interval);
  }, [modelMonitorVisible]);

  if (!modelMonitorVisible) return null;

  const totalTokens = 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute top-2 right-2 w-72 bg-[#12122a]/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#9d4edd]" />
            <span className="text-xs font-medium text-foreground">Model Monitor</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModelMonitorVisible(false)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Provider list */}
        <div className="p-2 space-y-1">
          {providers.map((p) => (
            <button
              key={p.provider}
              onClick={() => setSelectedProvider(p.provider)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors text-left"
            >
              {/* Health dot */}
              <div className={cn(
                'w-2 h-2 rounded-full shrink-0',
                p.status === 'healthy' && 'bg-[#00ff88]',
                p.status === 'degraded' && 'bg-yellow-500',
                p.status === 'down' && 'bg-[#E6394A]',
              )} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{PROVIDER_NAMES[p.provider]}</div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {p.latencyMs > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    {p.latencyMs}ms
                  </span>
                )}
                <span>{Math.round(p.successRate * 100)}%</span>
              </div>
            </button>
          ))}
        </div>

        {/* Cost tracking */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Est. Cost
            </span>
            <span className="text-foreground">${(totalTokens * 0.00002).toFixed(4)}</span>
          </div>
        </div>

        {/* Failover chain */}
        <div className="px-3 py-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground mb-1">Failover Chain</div>
          <div className="flex items-center gap-1 flex-wrap">
            {providers.sort((a, b) => {
              const order: ModelProviderType[] = ['openai', 'claude', 'gemini', 'glm', 'mistral', 'qwen', 'deepseek'];
              return order.indexOf(a.provider) - order.indexOf(b.provider);
            }).map((p, i) => (
              <span key={p.provider} className="flex items-center gap-0.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] h-4 px-1',
                    p.status === 'healthy' && 'border-[#00ff88]/30 text-[#00ff88]',
                    p.status === 'degraded' && 'border-yellow-500/30 text-yellow-500',
                    p.status === 'down' && 'border-[#E6394A]/30 text-[#E6394A]',
                  )}
                >
                  {PROVIDER_NAMES[p.provider]}
                </Badge>
                {i < providers.length - 1 && <span className="text-muted-foreground text-[8px]">→</span>}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
