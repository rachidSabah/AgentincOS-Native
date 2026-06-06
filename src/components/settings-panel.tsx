'use client';

// ============================================================
// Agentic OS V2 — Settings Panel
// ============================================================
import { cn } from '@/lib/utils';
import type { ModelProviderType } from '@/lib/types';
import { Settings, Key, Globe, Server, Database, Bot, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const PROVIDERS: Array<{ id: ModelProviderType; name: string; baseUrl: string }> = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'claude', name: 'Claude (Anthropic)', baseUrl: 'https://api.anthropic.com' },
  { id: 'gemini', name: 'Gemini (Google)', baseUrl: 'https://generativelanguage.googleapis.com' },
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
    openai: '', claude: '', gemini: '', glm: '', mistral: '', qwen: '', deepseek: '',
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
