import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('providerId');

  if (!providerId) {
    return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
  }

  // Provider health check - test API connectivity
  const providerEndpoints: {[key: string]: { endpoint: string; testPath: string }} = {
    'openai': { endpoint: 'https://api.openai.com/v1', testPath: '/models' },
    'anthropic': { endpoint: 'https://api.anthropic.com/v1', testPath: '/messages' },
    'google': { endpoint: 'https://generativelanguage.googleapis.com/v1beta', testPath: '/models' },
    'openrouter': { endpoint: 'https://openrouter.ai/api/v1', testPath: '/models' },
    'deepseek': { endpoint: 'https://api.deepseek.com/v1', testPath: '/models' },
    'glm': { endpoint: 'https://open.bigmodel.cn/api/paas/v4', testPath: '/models' },
    'qwen': { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', testPath: '/models' },
    'mistral': { endpoint: 'https://api.mistral.ai/v1', testPath: '/models' },
    'grok': { endpoint: 'https://api.x.ai/v1', testPath: '/models' },
    'ollama': { endpoint: 'http://localhost:11434/v1', testPath: '/models' },
    'gemini-cli': { endpoint: 'http://localhost:3100/api/gemini', testPath: '/health' },
  };

  const provider = providerEndpoints[providerId];
  if (!provider) {
    return NextResponse.json({ error: 'Unknown provider', healthStatus: 'offline' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${provider.endpoint}${provider.testPath}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (response.ok || response.status === 401) {
      // 401 means the API is reachable but needs auth - still "healthy"
      return NextResponse.json({
        providerId,
        healthStatus: response.ok ? 'healthy' : 'degraded',
        reachable: true,
        latency: 0,
        checkedAt: Date.now(),
        message: response.ok ? 'Provider is healthy' : 'Provider reachable (authentication required)',
      });
    }

    return NextResponse.json({
      providerId,
      healthStatus: 'degraded',
      reachable: true,
      checkedAt: Date.now(),
      message: `Provider returned status ${response.status}`,
    });
  } catch (error) {
    return NextResponse.json({
      providerId,
      healthStatus: 'offline',
      reachable: false,
      checkedAt: Date.now(),
      message: 'Provider unreachable',
    });
  }
}
