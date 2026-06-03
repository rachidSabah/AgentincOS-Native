import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { message, selectedModel, providers } = body;

    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const modelsUsed: string[] = [];
    const errors: string[] = [];
    let primaryResponse = '';
    let cliResponse = '';

    // 1. Call Gemini CLI chat API (always runs as co-pilot)
    try {
      const cliRes = await fetch(`${request.nextUrl.origin}/api/hermes/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: `Plan and analyze: ${message.slice(0, 500)}`, model: selectedModel || 'gemini-2.5-flash-lite' }),
        signal: AbortSignal.timeout(30000),
      });
      if (cliRes.ok) {
        const data = await cliRes.json();
        cliResponse = data.response || '';
        modelsUsed.push('gemini-cli');
      }
    } catch (e: any) {
      errors.push(`CLI: ${e.message?.slice(0, 60)}`);
    }

    // 2. Call primary provider if available
    const activeProvider = providers?.find((p: any) => p.enabled && p.apiKey);
    if (activeProvider && activeProvider.apiKey) {
      try {
        const res = await fetch(`${activeProvider.apiEndpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${activeProvider.apiKey}` },
          body: JSON.stringify({ model: selectedModel || activeProvider.defaultModel, messages: [{ role: 'user', content: message }], max_tokens: 4096 }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const data = await res.json();
          primaryResponse = data.choices?.[0]?.message?.content || '';
          modelsUsed.push(selectedModel || activeProvider.defaultModel);
        } else {
          const cause = res.status === 401 ? 'Invalid API key' : res.status === 429 ? 'Rate limited' : `HTTP ${res.status}`;
          errors.push(`${activeProvider.name}: ${cause}`);
          primaryResponse = cliResponse; // Fallback to CLI
        }
      } catch (e: any) {
        errors.push(`${activeProvider.name}: ${e.message?.slice(0, 60)}`);
        primaryResponse = cliResponse;
      }
    } else {
      primaryResponse = cliResponse; // Only CLI available
    }

    const finalSynthesis = primaryResponse || 'No engines available. Check Settings > Providers.';
    return NextResponse.json({ success: true, finalSynthesis, primaryResponse, cliResponse, modelsUsed, errors: errors.slice(0, 5), latency: Date.now() - startTime, brainActive: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, success: false }, { status: 500 });
  }
}
