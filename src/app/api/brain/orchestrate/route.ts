import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const IS_WIN = process.platform === 'win32';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { message, selectedModel, selectedProvider, providers } = body;

    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const modelsUsed: string[] = [];
    const errors: string[] = [];
    let primaryResponse = '';
    let cliResponse = '';

    // 1. Fetch knowledge context (memory + knowledge layers)
    const knowledgeContext = providers ? `Active providers: ${providers.map((p: any) => p.name).join(', ')}. ` : '';

    // 2. CLI always runs as co-pilot (planning + execution)
    try {
      const escaped = message.replace(/"/g, '\\"').slice(0, 500);
      const cmd = IS_WIN
        ? `gemini -p "Plan and analyze: ${escaped}" -m gemini-2.5-flash-lite -o json`
        : `gemini -p "Plan and analyze: ${escaped}" -m gemini-2.5-flash-lite -o json`;
      const { stdout } = await execAsync(cmd, { timeout: 30000, shell: IS_WIN });
      if (stdout?.trim()) {
        try { cliResponse = JSON.parse(stdout).response || stdout.trim(); } catch { cliResponse = stdout.trim(); }
        modelsUsed.push('gemini-cli');
      }
    } catch (e: any) {
      errors.push(`CLI: ${e.message?.slice(0, 80)}`);
    }

    // 3. Primary model generation
    const activeProvider = providers?.find((p: any) => p.enabled && p.apiKey);
    if (activeProvider && activeProvider.apiKey && activeProvider.name !== 'Gemini CLI') {
      try {
        const res = await fetch(`${activeProvider.apiEndpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${activeProvider.apiKey}` },
          body: JSON.stringify({
            model: selectedModel || activeProvider.defaultModel,
            messages: [{ role: 'user', content: `${knowledgeContext}${message}` }],
            max_tokens: 4096,
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const data = await res.json();
          primaryResponse = data.choices?.[0]?.message?.content || '';
          modelsUsed.push(selectedModel || activeProvider.defaultModel);
        } else {
          const analysis = analyzeError(res.status, activeProvider.name);
          errors.push(`${activeProvider.name}: ${analysis.cause}`);
          // Fallback to Gemini CLI
          if (cliResponse) {
            primaryResponse = `[Fallback from ${activeProvider.name} to Gemini CLI]\n\n${cliResponse}`;
          }
        }
      } catch (e: any) {
        errors.push(`${activeProvider.name}: ${e.message?.slice(0, 80)}`);
        if (cliResponse) {
          primaryResponse = `[Provider offline — using Gemini CLI]\n\n${cliResponse}`;
        }
      }
    } else if (cliResponse) {
      primaryResponse = cliResponse;
    }

    const finalSynthesis = primaryResponse || cliResponse || 'All engines unavailable. Check your connections.';

    return NextResponse.json({
      success: true,
      finalSynthesis,
      primaryResponse,
      cliResponse,
      modelsUsed,
      errors: errors.slice(0, 5),
      latency: Date.now() - startTime,
      brainActive: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, success: false }, { status: 500 });
  }
}

function analyzeError(status: number, provider: string): { cause: string; fix: string } {
  switch (status) {
    case 401: return { cause: 'Invalid API key', fix: `Update ${provider} API key in Settings` };
    case 429: return { cause: 'Rate limited', fix: 'Wait or switch provider' };
    case 500: case 502: case 503: return { cause: 'Provider server error', fix: 'Retry or use fallback' };
    default: return { cause: `HTTP ${status}`, fix: 'Check connection' };
  }
}
