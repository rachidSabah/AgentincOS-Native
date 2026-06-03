import { NextRequest, NextResponse } from 'next/server';
import { swarmKernel } from '@/lib/swarm-kernel';
import { modelLoadBalancer } from '@/lib/model-load-balancer';
import { brainPipeline } from '@/lib/brain-pipeline';
import { zeroErrorEngine } from '@/lib/zero-error-engine';
import { testingLayer } from '@/lib/testing-layer';
import { cicdEngine } from '@/lib/cicd-engine';
import { failureRecovery } from '@/lib/failure-recovery';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execAsync = promisify(exec);
const IS_WIN = platform() === 'win32';

// ─── NO ZAI SDK — Swarm OS API Route ───
// Provides endpoints for:
// - Swarm orchestration (execute, status, evolve)
// - Model load balancing (select, nodes, failover)
// - Brain pipeline (execute-layer, execute-pipeline)
// - Zero-error validation (validate, auto-fix)
// - Testing (generate-tests, simulate-tests)
// - CI/CD (create-pipeline, execute-pipeline, deploy)
// - Failure recovery (save-state, recover, ensure-completion)
// - Observability (dashboard, metrics, live)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    // ── Swarm Kernel ──
    case 'swarm-stats': {
      return NextResponse.json(swarmKernel.getStats());
    }

    // ── Model Load Balancer ──
    case 'model-nodes': {
      return NextResponse.json({
        nodes: modelLoadBalancer.getNodes(),
        failoverHistory: modelLoadBalancer.getFailoverHistory(),
      });
    }

    case 'select-model': {
      const task = searchParams.get('task') || '';
      const requirements = (searchParams.get('requirements') || '').split(',').filter(Boolean);
      const result = modelLoadBalancer.selectModel(task, requirements);
      return NextResponse.json(result);
    }

    // ── Brain Pipeline ──
    case 'brain-layers': {
      const { BRAIN_LAYERS } = await import('@/lib/brain-pipeline');
      return NextResponse.json({ layers: BRAIN_LAYERS });
    }

    case 'required-brains': {
      const task = searchParams.get('task') || '';
      const requiredBrains = brainPipeline.determineRequiredBrains(task);
      return NextResponse.json({ requiredBrains });
    }

    // ── CI/CD ──
    case 'cicd-pipelines': {
      return NextResponse.json({ pipelines: cicdEngine.listPipelines() });
    }

    case 'cicd-pipeline': {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const pipeline = cicdEngine.getPipeline(id);
      return NextResponse.json(pipeline || { error: 'Not found' }, { status: pipeline ? 200 : 404 });
    }

    // ── Failure Recovery ──
    case 'recovery-stats': {
      return NextResponse.json(failureRecovery.getStats());
    }

    // ── Observability Dashboard ──
    case 'dashboard': {
      const swarmStats = swarmKernel.getStats();
      const modelNodes = modelLoadBalancer.getNodes();
      const recoveryStats = failureRecovery.getStats();
      const pipelines = cicdEngine.listPipelines();

      return NextResponse.json({
        timestamp: Date.now(),
        swarm: swarmStats,
        models: {
          total: modelNodes.length,
          healthy: modelNodes.filter(n => n.health === 'healthy').length,
          degraded: modelNodes.filter(n => n.health === 'degraded').length,
          offline: modelNodes.filter(n => n.health === 'offline').length,
          nodes: modelNodes.map(n => ({
            id: n.id,
            name: n.name,
            health: n.health,
            load: n.currentLoad,
            latency: n.latency,
            successRate: n.successRate,
            activeRequests: n.activeRequests,
          })),
        },
        recovery: recoveryStats,
        cicd: {
          total: pipelines.length,
          completed: pipelines.filter(p => p.status === 'completed').length,
          failed: pipelines.filter(p => p.status === 'failed').length,
          running: pipelines.filter(p => ['building', 'testing', 'packaging', 'deploying'].includes(p.status)).length,
        },
      });
    }

    // ── Live Metrics ──
    case 'metrics': {
      const swarmStats = swarmKernel.getStats();
      const modelNodes = modelLoadBalancer.getNodes();

      return NextResponse.json({
        timestamp: Date.now(),
        uptime: process.uptime(),
        swarm: swarmStats,
        modelHealth: modelNodes.map(n => ({
          id: n.id,
          health: n.health,
          load: n.currentLoad,
          latency: n.latency,
          successRate: n.successRate,
        })),
        memory: process.memoryUsage(),
      });
    }

    default:
      return NextResponse.json({
        error: 'Unknown action',
        availableActions: [
          'swarm-stats', 'model-nodes', 'select-model', 'brain-layers',
          'required-brains', 'cicd-pipelines', 'cicd-pipeline', 'recovery-stats',
          'dashboard', 'metrics',
        ],
      }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action } = body;

  switch (action) {
    // ── Swarm: Execute Task ──
    case 'swarm-execute': {
      const { task, model, mode } = body;
      if (!task) return NextResponse.json({ error: 'Missing task' }, { status: 400 });

      try {
        // Use brain pipeline for 7-layer execution
        const result = await brainPipeline.execute(task, model || 'gemini-2.5-flash-lite', mode || 'hybrid');

        // Post-execution analysis for self-evolution
        const improvements = await swarmKernel.postExecutionAnalysis({
          id: `exec-${Date.now()}`,
          task,
          tier: 'standard',
          agents: result.layers.map(l => ({
            agentId: `brain-${l.brainId}`,
            role: l.brainName,
            model: l.model,
            brain: l.brainId,
            status: (l.status === 'skipped' ? 'pending' : l.status) as 'pending' | 'running' | 'completed' | 'failed',
            output: l.output,
            latency: l.latency,
            tokensUsed: l.tokensUsed,
            quality: l.quality,
          })),
          startTime: Date.now() - result.totalLatency,
          endTime: Date.now(),
          status: 'completed',
          result: result.finalOutput,
          metrics: {
            totalLatency: result.totalLatency,
            totalTokens: result.totalTokens,
            successRate: result.layers.filter(l => l.status === 'completed').length / result.layers.length,
            qualityScore: result.qualityScore,
            modelEfficiency: Object.fromEntries(result.modelsUsed.map(m => [m, 1])),
            brainUtilization: [1, 2, 3, 4, 5, 6, 7].map(id => {
              const layer = result.layers.find(l => l.brainId === id);
              return layer ? (layer.status === 'completed' ? 1 : 0) : 0;
            }),
          },
          improvements: [],
        });

        // Validate output with zero-error engine
        const validation = zeroErrorEngine.validate(result.finalOutput, 'text');

        return NextResponse.json({
          success: true,
          result: result.finalOutput,
          brainLayers: result.layers.map(l => ({
            brain: l.brainName,
            status: l.status,
            model: l.model,
            latency: l.latency,
            quality: l.quality,
          })),
          validation: {
            passed: validation.passed,
            score: validation.score,
            errors: validation.errors.length,
            warnings: validation.warnings.length,
          },
          improvements: improvements.length,
          totalLatency: result.totalLatency,
          modelsUsed: result.modelsUsed,
        });
      } catch (error: any) {
        // Failure recovery — NEVER ABORT
        const recoveredResult = await failureRecovery.ensureCompletion(
          `swarm-${Date.now()}`,
          task,
        );
        return NextResponse.json({
          success: true,
          result: recoveredResult,
          recovered: true,
          error: error?.message?.slice(0, 100),
        });
      }
    }

    // ── Brain Pipeline: Execute Single Layer ──
    case 'brain-execute-layer': {
      const { brainId, input, model } = body;
      if (!brainId || !input) return NextResponse.json({ error: 'Missing brainId or input' }, { status: 400 });

      try {
        const result = await brainPipeline.executeLayer(brainId, input, model || 'gemini-2.5-flash-lite');
        return NextResponse.json(result);
      } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Brain layer execution failed' }, { status: 500 });
      }
    }

    // ── Validate Output ──
    case 'validate': {
      const { output, type } = body;
      if (!output) return NextResponse.json({ error: 'Missing output' }, { status: 400 });

      const result = zeroErrorEngine.validate(output, type || 'text');
      return NextResponse.json(result);
    }

    // ── Auto-Fix ──
    case 'auto-fix': {
      const { output, errors } = body;
      if (!output) return NextResponse.json({ error: 'Missing output' }, { status: 400 });

      const fixed = zeroErrorEngine.autoFix(output, errors || []);
      return NextResponse.json({ fixed, original: output });
    }

    // ── Generate Tests ──
    case 'generate-tests': {
      const { code, language } = body;
      if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

      const tests = testingLayer.generateTests(code, language || 'typescript');
      const results = testingLayer.simulateTests(code, tests);
      const coverage = testingLayer.estimateCoverage(code, tests);

      return NextResponse.json({ tests, results, coverage });
    }

    // ── CI/CD: Create Pipeline ──
    case 'cicd-create': {
      const { name, projectStructure } = body;
      if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

      const pipeline = cicdEngine.createPipeline(name, projectStructure || {});
      return NextResponse.json(pipeline);
    }

    // ── CI/CD: Execute Pipeline ──
    case 'cicd-execute': {
      const { pipelineId, githubConfig } = body;
      if (!pipelineId) return NextResponse.json({ error: 'Missing pipelineId' }, { status: 400 });

      if (githubConfig) {
        cicdEngine.setGitHubConfig(githubConfig);
      }

      try {
        const result = await cicdEngine.executePipeline(pipelineId);
        return NextResponse.json(result);
      } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Pipeline execution failed' }, { status: 500 });
      }
    }

    // ── CI/CD: Deploy to GitHub ──
    case 'cicd-deploy': {
      const { pipelineId, config } = body;
      if (!pipelineId || !config) return NextResponse.json({ error: 'Missing pipelineId or config' }, { status: 400 });

      try {
        const result = await cicdEngine.deployToGitHub(pipelineId, config);
        return NextResponse.json(result);
      } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'GitHub deployment failed' }, { status: 500 });
      }
    }

    // ── Failure Recovery: Save State ──
    case 'recovery-save': {
      const { taskId, state } = body;
      if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

      failureRecovery.saveState(taskId, state || {});
      return NextResponse.json({ saved: true, taskId });
    }

    // ── Failure Recovery: Recover ──
    case 'recovery-recover': {
      const { taskId, error } = body;
      if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

      const action = failureRecovery.determineRecovery(taskId, new Error(error || 'Unknown error'));
      const result = await failureRecovery.executeRecovery(taskId, action);
      return NextResponse.json({ action, result });
    }

    // ── Model Load Balancer: Update Node ──
    case 'model-update': {
      const { modelId, updates } = body;
      if (!modelId) return NextResponse.json({ error: 'Missing modelId' }, { status: 400 });

      modelLoadBalancer.updateNode(modelId, updates || {});
      modelLoadBalancer.rebalance();
      return NextResponse.json({ updated: true, modelId });
    }

    // ── Swarm: Evolve ──
    case 'swarm-evolve': {
      swarmKernel.evolve();
      return NextResponse.json({ evolved: true, stats: swarmKernel.getStats() });
    }

    default:
      return NextResponse.json({
        error: 'Unknown action',
        availableActions: [
          'swarm-execute', 'swarm-evolve',
          'brain-execute-layer',
          'validate', 'auto-fix',
          'generate-tests',
          'cicd-create', 'cicd-execute', 'cicd-deploy',
          'recovery-save', 'recovery-recover',
          'model-update',
        ],
      }, { status: 400 });
  }
}
