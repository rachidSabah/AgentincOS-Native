'use client';

// ============================================================
// Agentic OS V2 — Settings Panel
// ============================================================
import { cn } from '@/lib/utils';
import type { ModelProviderType } from '@/lib/types';
import { Settings, Key, Globe, Server, Database, Bot, Brain, Search, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useCallback } from 'react';

const PROVIDERS: Array<{ id: ModelProviderType; name: string; baseUrl: string }> = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'claude', name: 'Claude (Anthropic)', baseUrl: 'https://api.anthropic.com' },
  { id: 'gemini', name: 'Gemini (Google API)', baseUrl: 'https://generativelanguage.googleapis.com' },
  { id: 'gemini-cli', name: 'Gemini CLI (Local)', baseUrl: '' },
  { id: 'glm', name: 'GLM (Zhipu)', baseUrl: 'https://open.bigmodel.cn/api/paas' },
  { id: 'mistral', name: 'Mistral', baseUrl: 'https://api.mistral.ai' },
  { id: 'qwen', name: 'Qwen (Alibaba)', baseUrl: 'https://dashscope.aliyuncs.com/api' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'ollama', name: 'Ollama (Local)', baseUrl: 'http://localhost:11434' },
  { id: 'lmstudio', name: 'LM Studio (Local)', baseUrl: 'http://localhost:1234/v1' },
  { id: 'llamacpp', name: 'llama.cpp (Local)', baseUrl: 'http://localhost:8080' },
  { id: 'vllm', name: 'vLLM (Local)', baseUrl: 'http://localhost:8000/v1' },
  { id: 'grok', name: 'Grok (xAI)', baseUrl: 'https://api.x.ai' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1' },
];

export function SettingsPanel() {
  const [apiKeys, setApiKeys] = useState<Record<ModelProviderType, string>>({
    openai: '', claude: '', gemini: '', 'gemini-cli': '', glm: '', mistral: '', qwen: '', deepseek: '',
    openrouter: '', ollama: '', lmstudio: '', llamacpp: '', vllm: '', grok: '', moonshot: '',
  });
  const [baseUrls, setBaseUrls] = useState<Record<ModelProviderType, string>>(
    Object.fromEntries(PROVIDERS.map((p) => [p.id, p.baseUrl])) as Record<ModelProviderType, string>
  );
  const [enabledProviders, setEnabledProviders] = useState<Record<ModelProviderType, boolean>>(
    Object.fromEntries(PROVIDERS.map((p) => [p.id, true])) as Record<ModelProviderType, boolean>
  );
  const [memoryDecayRate, setMemoryDecayRate] = useState('0.01');
  const [importanceThreshold, setImportanceThreshold] = useState('0.3');
  const [saved, setSaved] = useState(false);
  const [geminiCliState, setGeminiCliState] = useState<{
    status: string;
    version: string | null;
    executablePath: string | null;
    models: string[];
    healthScore: number;
    mode: string;
  } | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const fetchGeminiCliState = useCallback(async () => {
    try {
      const response = await fetch('/api/gemini-cli');
      const data = await response.json();
      setGeminiCliState({
        status: data.status,
        version: data.discovery?.version ?? null,
        executablePath: data.discovery?.executablePath ?? null,
        models: data.models?.map((m: { id: string }) => m.id) ?? [],
        healthScore: data.health?.healthScore ?? 0,
        mode: data.mode ?? 'api',
      });
    } catch {
      setGeminiCliState(null);
    }
  }, []);

  useEffect(() => {
    fetchGeminiCliState();
  }, [fetchGeminiCliState]);

  const handleRediscover = async () => {
    setIsDiscovering(true);
    try {
      await fetch('/api/gemini-cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rediscover' }),
      });
      await fetchGeminiCliState();
    } catch {
      // Continue
    }
    setIsDiscovering(false);
  };

  const saveSettings = async () => {
    for (const provider of PROVIDERS) {
      if (apiKeys[provider.id] || enabledProviders[provider.id]) {
        try {
          await fetch('/api/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: provider.name,
              provider: provider.id,
              apiKey: apiKeys[provider.id] || undefined,
              baseUrl: baseUrls[provider.id] || undefined,
              enabled: enabledProviders[provider.id],
              priority: PROVIDERS.indexOf(provider),
            }),
          });
        } catch {
          // Continue saving others
        }
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4 custom-scrollbar">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-[#9d4edd]" />
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
      </div>

      {/* Gemini CLI Auto-Discovery */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#4285f4]" />
            Gemini CLI Discovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {geminiCliState ? (
            <>
              {/* Status indicator */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5">
                  {geminiCliState.status === 'available' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-[#00ff88]" />
                  ) : geminiCliState.status === 'degraded' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-[#E6394A]" />
                  )}
                  <span className={cn(
                    'text-xs font-medium',
                    geminiCliState.status === 'available' && 'text-[#00ff88]',
                    geminiCliState.status === 'degraded' && 'text-yellow-500',
                    geminiCliState.status !== 'available' && geminiCliState.status !== 'degraded' && 'text-[#E6394A]',
                  )}>
                    {geminiCliState.status === 'available' ? 'Available' : geminiCliState.status === 'degraded' ? 'Degraded' : 'Not Found'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">Mode</div>
                <div className="text-foreground">{geminiCliState.mode === 'cli' ? 'CLI (Local)' : 'API (Cloud)'}</div>
                {geminiCliState.version && (
                  <>
                    <div className="text-muted-foreground">Version</div>
                    <div className="text-foreground">{geminiCliState.version}</div>
                  </>
                )}
                {geminiCliState.executablePath && (
                  <>
                    <div className="text-muted-foreground">Path</div>
                    <div className="text-foreground truncate" title={geminiCliState.executablePath}>
                      {geminiCliState.executablePath}
                    </div>
                  </>
                )}
                <div className="text-muted-foreground">Health Score</div>
                <div className="text-foreground">{geminiCliState.healthScore}/100</div>
                {geminiCliState.models.length > 0 && (
                  <>
                    <div className="text-muted-foreground">Models</div>
                    <div className="text-foreground text-[10px]">{geminiCliState.models.join(', ')}</div>
                  </>
                )}
              </div>

              {/* Re-discover button */}
              <Button
                onClick={handleRediscover}
                disabled={isDiscovering}
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
              >
                <RefreshCw className={cn('w-3 h-3 mr-1', isDiscovering && 'animate-spin')} />
                {isDiscovering ? 'Discovering...' : 'Re-discover Gemini CLI'}
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              Loading Gemini CLI status...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-[#E8751A]" />
            Provider Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => (
            <div key={provider.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium capitalize flex items-center gap-2">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  {provider.name}
                </Label>
                <Switch
                  checked={enabledProviders[provider.id]}
                  onCheckedChange={(checked) =>
                    setEnabledProviders((prev) => ({ ...prev, [provider.id]: checked }))
                  }
                />
              </div>
              {enabledProviders[provider.id] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    type="password"
                    placeholder="API Key"
                    value={apiKeys[provider.id]}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                    className="h-8 text-xs bg-muted/20 border-border"
                  />
                  <Input
                    placeholder="Base URL"
                    value={baseUrls[provider.id]}
                    onChange={(e) => setBaseUrls((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                    className="h-8 text-xs bg-muted/20 border-border"
                  />
                </div>
              )}
              <Separator className="bg-border" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Memory Settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-[#2E86AB]" />
            Memory Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Decay Rate</Label>
              <Input
                type="number"
                step="0.001"
                value={memoryDecayRate}
                onChange={(e) => setMemoryDecayRate(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Importance Threshold</Label>
              <Input
                type="number"
                step="0.1"
                value={importanceThreshold}
                onChange={(e) => setImportanceThreshold(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00ff88]" />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted-foreground">Version</div>
            <div className="text-foreground">2.0.0</div>
            <div className="text-muted-foreground">Brain Pipeline</div>
            <div className="text-foreground">7-Stage Sequential</div>
            <div className="text-muted-foreground">Agent Types</div>
            <div className="text-foreground">7 (Planner → Memory)</div>
            <div className="text-muted-foreground">Database</div>
            <div className="text-foreground">SQLite / Prisma</div>
            <div className="text-muted-foreground">Framework</div>
            <div className="text-foreground">Next.js 16</div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={saveSettings}
        className="w-full bg-[#E8751A] hover:bg-[#E8751A]/80 text-white"
      >
        {saved ? '✓ Settings Saved' : 'Save Settings'}
      </Button>
    </div>
  );
}
