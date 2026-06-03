import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Provider registry with model fetching endpoints
const PROVIDERS: Record<string, { name: string; baseUrl: string; defaultModel: string; models: string[]; keyPrefix?: string }> = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'], keyPrefix: 'sk-' },
  openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini', models: ['nvidia/owl-alpha', 'google/gemini-2.5-flash', 'deepseek/deepseek-r1', 'meta-llama/llama-4-maverick', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku'], keyPrefix: 'sk-or-' },
  nvidia: { name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', defaultModel: 'stepfun-ai/step-3-7-flash', models: ['stepfun-ai/step-3-7-flash', 'nvidia/nemotron-4-340b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct', 'meta/llama-3.3-70b-instruct'], keyPrefix: 'nvapi-' },
  gemini: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.5-flash', models: ['auto', 'pro', 'flash', 'flash-lite', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], keyPrefix: 'AIza' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner', 'deepseek-r1'], keyPrefix: 'sk-' },
  groq: { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'], keyPrefix: 'gsk_' },
  ollama: { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.2:latest', models: ['llama3.2:latest', 'llama3.1:70b', 'deepseek-r1:latest', 'mistral:latest', 'qwen2.5:latest'], keyPrefix: '' },
  cerebras: { name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'llama-3.3-70b', models: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b'], keyPrefix: 'csk-' },
  mistral: { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest', models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'pixtral-large-latest', 'ministral-3b-latest', 'open-mixtral-8x7b', 'open-mixtral-8x22b'], keyPrefix: '' },
  together: { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct-Turbo'], keyPrefix: '' },
  bigmodel: { name: 'BigModel (ZhipuAI)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4-flash', models: ['glm-4-plus', 'glm-4-flash', 'glm-4-air', 'glm-4v-plus', 'glm-4v-flash'], keyPrefix: '' },
};

function detectProvider(apiKey: string, providerName?: string): string | null {
  if (providerName) {
    const normalized = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of Object.keys(PROVIDERS)) {
      if (normalized.includes(key) || key.includes(normalized)) return key;
    }
  }
  if (apiKey) {
    if (apiKey.startsWith('sk-or-')) return 'openrouter';
    if (apiKey.startsWith('gsk_')) return 'groq';
    if (apiKey.startsWith('csk-')) return 'cerebras';
    if (apiKey.startsWith('nvapi-')) return 'nvidia';
    if (apiKey.startsWith('AIza')) return 'gemini';
    if (apiKey.startsWith('sk-')) return 'openai';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, apiKey, provider: providerName, message, model: clientModel, baseUrl } = body;

    // Support chat action for provider-based chatting
    if (action === 'chat') {
      if (!apiKey) return NextResponse.json({ error: 'API key is required' }, { status: 400 });
      if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });

      const provider = detectProvider(apiKey, providerName);
      if (!provider) return NextResponse.json({ error: 'Could not detect provider from API key' }, { status: 400 });

      const config = PROVIDERS[provider];
      const endpoint = baseUrl || config.baseUrl;

      // Model chain fallback
      const modelChain = [clientModel || config.defaultModel, ...config.models.filter(m => m !== (clientModel || config.defaultModel)).slice(0, 3)];

      for (const tryModel of modelChain) {
        try {
          const res = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: tryModel, messages: [{ role: 'user', content: message }], max_tokens: 4096 }),
            signal: AbortSignal.timeout(60000),
          });
          if (res.ok) {
            const data = await res.json();
            return NextResponse.json({ response: data.choices?.[0]?.message?.content || JSON.stringify(data), provider: config.name, model: tryModel, fallback: tryModel !== (clientModel || config.defaultModel) });
          }
          if (res.status === 401 || res.status === 403) break; // Don't retry auth errors
        } catch { /* try next model */ }
      }
      return NextResponse.json({ response: `All models failed for ${config.name}. Check your API key and try again.`, error: true });
    }

    if (action !== 'fetch-models') {
      return NextResponse.json({ error: 'Invalid action. Use: fetch-models' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const provider = detectProvider(apiKey, providerName);
    if (!provider) {
      return NextResponse.json({ error: 'Could not detect provider from API key' }, { status: 400 });
    }

    const config = PROVIDERS[provider];

    // Try to fetch real models from the provider's /models endpoint
    try {
      const res = await fetch(`${config.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data?.data && Array.isArray(data.data)) {
            const fetchedModels = data.data.map((m: any) => ({ id: m.id || m.name, name: m.id || m.name || 'Unknown' }));
            if (fetchedModels.length > 0) {
              return NextResponse.json({ success: true, provider: config.name, detectedProvider: provider, models: fetchedModels, source: 'api' });
            }
          }
        }
      }
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ error: `Invalid ${config.name} API key` }, { status: 401 });
      }
    } catch {
      // /models not available - use defaults
    }

    // Return default models for this provider
    const defaultModels = config.models.map(m => ({ id: m, name: m }));
    return NextResponse.json({ success: true, provider: config.name, detectedProvider: provider, models: defaultModels, source: 'default' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
