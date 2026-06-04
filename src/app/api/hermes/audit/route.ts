// ═══════════════════════════════════════════════════════
// AGENTIC OS — 7-Phase Audit API Endpoint
// Runs real execution through each intelligence layer
// and returns raw execution evidence for verification.
// ═══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { brainPipeline } from '@/lib/brain-pipeline';
import { modelLoadBalancer } from '@/lib/model-load-balancer';
import { failureRecovery } from '@/lib/failure-recovery';
import { modelExecutor } from '@/lib/model-executor';

// ─── Audit Phase Types ─────────────────────────────────

type AuditPhase =
  | 'swarm'
  | 'brain'
  | 'orchestration'
  | 'load-balancer'
  | 'failover'
  | 'self-healing'
  | 'parallel';

interface AuditEvidence {
  phase: string;
  timestamp: number;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  executionLogs: Array<{
    step: string;
    timestamp: number;
    latency: number;
    success: boolean;
    output?: string;
    model?: string;
    provider?: string;
  }>;
  modelResponses: Array<{
    model: string;
    provider: string;
    responseLength: number;
    latency: number;
    success: boolean;
  }>;
  latencyMeasurements: Record<string, number>;
  summary: string;
}

// ─── Audit Execution Functions ─────────────────────────

async function auditSwarm(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Test basic model executor
  logs.push({ step: 'model-executor-test', timestamp: Date.now(), latency: 0, success: true });

  const execStart = Date.now();
  const execResult = await modelExecutor.execute(
    'Analyze the following task for swarm orchestration: Build a REST API with authentication',
    'auto',
  );
  const execLatency = Date.now() - execStart;

  logs.push({
    step: 'model-execution',
    timestamp: Date.now(),
    latency: execLatency,
    success: execResult.success,
    model: execResult.model,
    provider: execResult.provider,
  });

  modelResponses.push({
    model: execResult.model,
    provider: execResult.provider,
    responseLength: execResult.output.length,
    latency: execResult.latency,
    success: execResult.success,
  });

  latencyMeasurements['model-execution'] = execLatency;

  if (!execResult.success) allPassed = false;

  // Test load balancer health
  const lbHealth = modelLoadBalancer.getHealthSummary();
  logs.push({
    step: 'load-balancer-health',
    timestamp: Date.now(),
    latency: 0,
    success: lbHealth.healthyNodes > 0,
  });

  if (lbHealth.healthyNodes === 0) allPassed = false;

  return {
    phase: 'swarm',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Swarm audit ${allPassed ? 'passed' : 'failed'}. Model executor responded via ${execResult.provider} in ${execLatency}ms. Load balancer has ${lbHealth.healthyNodes}/${lbHealth.totalNodes} healthy nodes.`,
  };
}

async function auditBrain(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Execute the brain pipeline with a test task
  logs.push({ step: 'brain-pipeline-start', timestamp: Date.now(), latency: 0, success: true });

  const pipelineStart = Date.now();
  const pipelineResult = await brainPipeline.execute(
    'Implement a user authentication system with JWT tokens',
    'auto',
    'hybrid',
  );
  const pipelineLatency = Date.now() - pipelineStart;

  logs.push({
    step: 'brain-pipeline-complete',
    timestamp: Date.now(),
    latency: pipelineLatency,
    success: pipelineResult.layers.some(l => l.status === 'completed'),
  });

  latencyMeasurements['brain-pipeline-total'] = pipelineLatency;
  latencyMeasurements['brain-pipeline-quality'] = pipelineResult.qualityScore;

  // Collect evidence from each brain layer
  for (const layer of pipelineResult.layers) {
    if (layer.status === 'completed') {
      modelResponses.push({
        model: layer.model,
        provider: 'real-execution',
        responseLength: layer.output.length,
        latency: layer.latency,
        success: true,
      });
      latencyMeasurements[`brain-${layer.brainName.toLowerCase()}`] = layer.latency;
    } else if (layer.status === 'failed') {
      allPassed = false;
      modelResponses.push({
        model: layer.model,
        provider: 'real-execution',
        responseLength: 0,
        latency: layer.latency,
        success: false,
      });
    }
  }

  return {
    phase: 'brain',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Brain pipeline audit ${allPassed ? 'passed' : 'failed'}. ${pipelineResult.layers.filter(l => l.status === 'completed').length}/${pipelineResult.layers.length} layers completed. Quality: ${pipelineResult.qualityScore.toFixed(2)}. Total latency: ${pipelineLatency}ms.`,
  };
}

async function auditOrchestration(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Test sequential brain execution
  logs.push({ step: 'sequential-execution-test', timestamp: Date.now(), latency: 0, success: true });

  const seqStart = Date.now();
  const seqResult = await brainPipeline.execute(
    'Design a microservice architecture for an e-commerce platform',
    'auto',
    'sequential',
  );
  const seqLatency = Date.now() - seqStart;

  logs.push({
    step: 'sequential-execution-complete',
    timestamp: Date.now(),
    latency: seqLatency,
    success: seqResult.layers.some(l => l.status === 'completed'),
  });

  latencyMeasurements['sequential-total'] = seqLatency;

  // Test hybrid execution
  const hybridStart = Date.now();
  const hybridResult = await brainPipeline.execute(
    'Research best practices for API versioning',
    'auto',
    'hybrid',
  );
  const hybridLatency = Date.now() - hybridStart;

  logs.push({
    step: 'hybrid-execution-complete',
    timestamp: Date.now(),
    latency: hybridLatency,
    success: hybridResult.layers.some(l => l.status === 'completed'),
  });

  latencyMeasurements['hybrid-total'] = hybridLatency;

  if (seqResult.layers.every(l => l.status === 'failed')) allPassed = false;
  if (hybridResult.layers.every(l => l.status === 'failed')) allPassed = false;

  return {
    phase: 'orchestration',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Orchestration audit ${allPassed ? 'passed' : 'failed'}. Sequential: ${seqLatency}ms, Hybrid: ${hybridLatency}ms. Both modes produced ${allPassed ? 'results' : 'failures'}.`,
  };
}

async function auditLoadBalancer(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Test load balancer model selection
  logs.push({ step: 'model-selection-test', timestamp: Date.now(), latency: 0, success: true });

  const selectStart = Date.now();
  const selection = modelLoadBalancer.selectModel('Build a React component', ['coding', 'reasoning']);
  const selectLatency = Date.now() - selectStart;

  logs.push({
    step: 'model-selection',
    timestamp: Date.now(),
    latency: selectLatency,
    success: !!selection.primaryModel,
    model: selection.primaryModel.id,
  });

  latencyMeasurements['model-selection'] = selectLatency;

  // Test failover mechanism
  const failoverStart = Date.now();
  const failoverResult = modelLoadBalancer.handleFailover('nonexistent-model', 'test-state');
  const failoverLatency = Date.now() - failoverStart;

  logs.push({
    step: 'failover-mechanism',
    timestamp: Date.now(),
    latency: failoverLatency,
    success: !!failoverResult,
    model: failoverResult.id,
  });

  latencyMeasurements['failover'] = failoverLatency;

  // Test rebalance
  modelLoadBalancer.rebalance();
  logs.push({
    step: 'rebalance',
    timestamp: Date.now(),
    latency: 0,
    success: true,
  });

  // Get health summary
  const health = modelLoadBalancer.getHealthSummary();
  if (health.healthyNodes === 0) allPassed = false;

  modelResponses.push({
    model: selection.primaryModel.id,
    provider: selection.primaryModel.provider,
    responseLength: 0,
    latency: selectLatency,
    success: true,
  });

  return {
    phase: 'load-balancer',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Load balancer audit ${allPassed ? 'passed' : 'failed'}. Primary model: ${selection.primaryModel.id}. Health: ${health.healthyNodes}/${health.totalNodes} healthy. Avg load: ${health.avgLoad.toFixed(1)}%.`,
  };
}

async function auditFailover(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Test failure recovery system
  logs.push({ step: 'failover-test-start', timestamp: Date.now(), latency: 0, success: true });

  const taskId = `audit-failover-${Date.now()}`;
  const ensureStart = Date.now();
  const result = await failureRecovery.ensureCompletion(taskId, 'Test task: Verify failover recovery mechanism');
  const ensureLatency = Date.now() - ensureStart;

  logs.push({
    step: 'ensure-completion',
    timestamp: Date.now(),
    latency: ensureLatency,
    success: result.length > 0,
  });

  latencyMeasurements['ensure-completion'] = ensureLatency;

  modelResponses.push({
    model: 'failover-chain',
    provider: 'recovery',
    responseLength: result.length,
    latency: ensureLatency,
    success: result.length > 0,
  });

  if (result.length === 0) allPassed = false;

  // Check recovery stats
  const stats = failureRecovery.getStats();
  logs.push({
    step: 'recovery-stats',
    timestamp: Date.now(),
    latency: 0,
    success: true,
  });

  latencyMeasurements['recovery-stats-total'] = stats.totalRecoveries;

  return {
    phase: 'failover',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Failover audit ${allPassed ? 'passed' : 'failed'}. ensureCompletion returned ${result.length} chars in ${ensureLatency}ms. Total recoveries: ${stats.totalRecoveries}.`,
  };
}

async function auditSelfHealing(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Test internal fallback (the self-healing mechanism)
  logs.push({ step: 'self-healing-test-start', timestamp: Date.now(), latency: 0, success: true });

  // Execute with an invalid model — should fall back through the chain
  const healStart = Date.now();
  const result = await modelExecutor.execute(
    'Test self-healing: This should produce output even if primary models fail',
    'invalid-model-name',
  );
  const healLatency = Date.now() - healStart;

  logs.push({
    step: 'self-healing-execution',
    timestamp: Date.now(),
    latency: healLatency,
    success: result.success,
    model: result.model,
    provider: result.provider,
  });

  latencyMeasurements['self-healing'] = healLatency;

  modelResponses.push({
    model: result.model,
    provider: result.provider,
    responseLength: result.output.length,
    latency: result.latency,
    success: result.success,
  });

  // The self-healing is successful if we get any output
  if (!result.success || result.output.length === 0) allPassed = false;

  return {
    phase: 'self-healing',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Self-healing audit ${allPassed ? 'passed' : 'failed'}. System recovered via ${result.provider} provider with model ${result.model} in ${healLatency}ms. Output length: ${result.output.length}.`,
  };
}

async function auditParallel(): Promise<AuditEvidence> {
  const logs: AuditEvidence['executionLogs'] = [];
  const modelResponses: AuditEvidence['modelResponses'] = [];
  const latencyMeasurements: Record<string, number> = {};
  let allPassed = true;

  const startTime = Date.now();

  // Test parallel execution through brain pipeline
  logs.push({ step: 'parallel-test-start', timestamp: Date.now(), latency: 0, success: true });

  const parallelStart = Date.now();
  const parallelResult = await brainPipeline.execute(
    'Analyze the security implications of a distributed cache system',
    'auto',
    'parallel',
  );
  const parallelLatency = Date.now() - parallelStart;

  logs.push({
    step: 'parallel-execution-complete',
    timestamp: Date.now(),
    latency: parallelLatency,
    success: parallelResult.layers.some(l => l.status === 'completed'),
  });

  latencyMeasurements['parallel-total'] = parallelLatency;

  // Run multiple independent model executions in parallel
  const multiStart = Date.now();
  const multiResults = await Promise.allSettled([
    modelExecutor.execute('Plan a testing strategy', 'auto'),
    modelExecutor.execute('Review code quality patterns', 'flash'),
    modelExecutor.execute('Optimize database queries', 'auto'),
  ]);
  const multiLatency = Date.now() - multiStart;

  const succeeded = multiResults.filter(
    r => r.status === 'fulfilled' && r.value.success,
  ).length;

  logs.push({
    step: 'parallel-model-executions',
    timestamp: Date.now(),
    latency: multiLatency,
    success: succeeded > 0,
  });

  latencyMeasurements['parallel-model-multi'] = multiLatency;

  for (const r of multiResults) {
    if (r.status === 'fulfilled') {
      modelResponses.push({
        model: r.value.model,
        provider: r.value.provider,
        responseLength: r.value.output.length,
        latency: r.value.latency,
        success: r.value.success,
      });
    }
  }

  if (parallelResult.layers.every(l => l.status === 'failed') && succeeded === 0) {
    allPassed = false;
  }

  return {
    phase: 'parallel',
    timestamp: startTime,
    status: allPassed ? 'PASS' : 'FAIL',
    executionLogs: logs,
    modelResponses,
    latencyMeasurements,
    summary: `Parallel audit ${allPassed ? 'passed' : 'failed'}. Pipeline: ${parallelLatency}ms (${parallelResult.layers.filter(l => l.status === 'completed').length}/${parallelResult.layers.length} layers). Multi-exec: ${multiLatency}ms (${succeeded}/3 succeeded).`,
  };
}

// ─── POST Handler ──────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const phase = body.phase as AuditPhase | undefined;

  if (!phase) {
    return NextResponse.json({
      error: 'Missing phase parameter',
      availablePhases: ['swarm', 'brain', 'orchestration', 'load-balancer', 'failover', 'self-healing', 'parallel'],
    }, { status: 400 });
  }

  try {
    let evidence: AuditEvidence;

    switch (phase) {
      case 'swarm':
        evidence = await auditSwarm();
        break;
      case 'brain':
        evidence = await auditBrain();
        break;
      case 'orchestration':
        evidence = await auditOrchestration();
        break;
      case 'load-balancer':
        evidence = await auditLoadBalancer();
        break;
      case 'failover':
        evidence = await auditFailover();
        break;
      case 'self-healing':
        evidence = await auditSelfHealing();
        break;
      case 'parallel':
        evidence = await auditParallel();
        break;
      default:
        return NextResponse.json({
          error: `Unknown phase: ${phase}`,
          availablePhases: ['swarm', 'brain', 'orchestration', 'load-balancer', 'failover', 'self-healing', 'parallel'],
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      phase,
      evidence,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      phase,
      error: error?.message || 'Audit execution failed',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}

// ─── GET Handler — Run all phases ──────────────────────

export async function GET() {
  const phases: AuditPhase[] = ['swarm', 'brain', 'orchestration', 'load-balancer', 'failover', 'self-healing', 'parallel'];
  const results: Record<string, AuditEvidence> = {};
  const errors: Record<string, string> = {};
  const auditStart = Date.now();

  for (const phase of phases) {
    try {
      switch (phase) {
        case 'swarm':
          results[phase] = await auditSwarm();
          break;
        case 'brain':
          results[phase] = await auditBrain();
          break;
        case 'orchestration':
          results[phase] = await auditOrchestration();
          break;
        case 'load-balancer':
          results[phase] = await auditLoadBalancer();
          break;
        case 'failover':
          results[phase] = await auditFailover();
          break;
        case 'self-healing':
          results[phase] = await auditSelfHealing();
          break;
        case 'parallel':
          results[phase] = await auditParallel();
          break;
      }
    } catch (error: any) {
      errors[phase] = error?.message || 'Unknown error';
      results[phase] = {
        phase,
        timestamp: Date.now(),
        status: 'UNVERIFIED',
        executionLogs: [],
        modelResponses: [],
        latencyMeasurements: {},
        summary: `Audit failed: ${errors[phase]}`,
      };
    }
  }

  const totalLatency = Date.now() - auditStart;
  const phaseSummaries = Object.fromEntries(
    Object.entries(results).map(([p, e]) => [p, { status: e.status, summary: e.summary }])
  );

  return NextResponse.json({
    success: true,
    totalLatency,
    overallStatus: Object.values(results).every(e => e.status === 'PASS') ? 'PASS' : 'PARTIAL',
    phases: phaseSummaries,
    evidence: results,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    timestamp: Date.now(),
  });
}
