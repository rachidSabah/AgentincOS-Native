// ============================================================
// Agentic OS V2 — Gemini CLI Discovery API Route
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { geminiCLIDiscovery } from '@/lib/gemini-cli-discovery';
import { modelRouter } from '@/lib/model-router';

/**
 * GET /api/gemini-cli
 * Returns the current Gemini CLI discovery state, models, and health.
 */
export async function GET() {
  try {
    const state = geminiCLIDiscovery.getState();
    const health = geminiCLIDiscovery.getHealth();
    const models = geminiCLIDiscovery.getModels();
    const searchResults = geminiCLIDiscovery.getSearchResults();
    const report = geminiCLIDiscovery.generateReport();

    return NextResponse.json({
      status: state.discovery.status,
      mode: state.mode,
      discovery: {
        executablePath: state.discovery.executablePath,
        version: state.discovery.version,
        installSource: state.discovery.installSource,
        platform: state.discovery.platform,
        discoveredAt: state.discovery.discoveredAt,
        lastValidatedAt: state.discovery.lastValidatedAt,
      },
      health: {
        available: health.available,
        executableLaunches: health.executableLaunches,
        authenticationValid: health.authenticationValid,
        modelDiscoveryWorks: health.modelDiscoveryWorks,
        testPromptSucceeded: health.testPromptSucceeded,
        lastLatencyMs: health.lastLatencyMs,
        successRate: health.successRate,
        healthScore: health.healthScore,
        degradationReason: health.degradationReason,
        lastChecked: health.lastChecked,
      },
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.contextWindow,
        status: m.status,
        capabilities: m.capabilities,
        discoveredAt: m.discoveredAt,
        lastValidatedAt: m.lastValidatedAt,
      })),
      routing: {
        priority: state.routingPriority,
        failoverChain: state.failoverChain,
        currentModel: modelRouter['dynamicModelMap']?.get('gemini-cli') ?? 'gemini-2.5-flash',
      },
      searchResults,
      report,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/gemini-cli
 * Actions:
 *   - discover: Run the full discovery sequence
 *   - rediscover: Force a re-discovery
 *   - validate: Re-validate the current CLI
 *   - execute: Execute a test prompt via CLI
 *   - select-model: Change the active CLI model
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      action: 'discover' | 'rediscover' | 'validate' | 'execute' | 'select-model';
      prompt?: string;
      modelId?: string;
    };

    switch (body.action) {
      case 'discover': {
        const state = await geminiCLIDiscovery.discover();

        // Update model router based on discovery results
        if (state.discovery.status === 'available' && state.health.available) {
          modelRouter.markProviderValidated('gemini-cli');
          const bestModel = geminiCLIDiscovery.selectBestModel('balanced');
          if (bestModel) {
            modelRouter.updateDynamicModel('gemini-cli', bestModel.id, bestModel.contextWindow);
          }
        } else {
          modelRouter.markProviderDegraded('gemini-cli', state.health.degradationReason ?? 'Discovery failed');
        }

        return NextResponse.json({
          success: true,
          status: state.discovery.status,
          mode: state.mode,
          models: state.models.map((m) => m.id),
          healthScore: state.health.healthScore,
        });
      }

      case 'rediscover': {
        const state = await geminiCLIDiscovery.rediscover();

        if (state.discovery.status === 'available' && state.health.available) {
          modelRouter.markProviderValidated('gemini-cli');
          const bestModel = geminiCLIDiscovery.selectBestModel('balanced');
          if (bestModel) {
            modelRouter.updateDynamicModel('gemini-cli', bestModel.id, bestModel.contextWindow);
          }
        } else {
          modelRouter.markProviderDegraded('gemini-cli', state.health.degradationReason ?? 'Rediscovery failed');
        }

        return NextResponse.json({
          success: true,
          status: state.discovery.status,
          mode: state.mode,
          models: state.models.map((m) => m.id),
          healthScore: state.health.healthScore,
        });
      }

      case 'validate': {
        // Re-run the test prompt to validate
        const result = await geminiCLIDiscovery.executePrompt('Respond with "OK"', 'gemini-2.5-flash');
        return NextResponse.json({
          success: result.success,
          latencyMs: result.latencyMs,
          error: result.error,
        });
      }

      case 'execute': {
        if (!body.prompt) {
          return NextResponse.json({ error: 'Prompt is required for execute action' }, { status: 400 });
        }
        const result = await geminiCLIDiscovery.executePrompt(body.prompt, body.modelId);
        return NextResponse.json({
          success: result.success,
          content: result.content,
          latencyMs: result.latencyMs,
          error: result.error,
        });
      }

      case 'select-model': {
        if (!body.modelId) {
          return NextResponse.json({ error: 'modelId is required for select-model action' }, { status: 400 });
        }
        modelRouter.updateDynamicModel('gemini-cli', body.modelId);
        return NextResponse.json({
          success: true,
          model: body.modelId,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
