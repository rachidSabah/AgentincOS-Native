import { NextRequest, NextResponse } from 'next/server';
import { shouldTriggerSwarm, composeSwarm, type SwarmScoreInput } from '@/lib/swarm-orchestrator';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execAsync = promisify(exec);
const IS_WIN = platform() === 'win32';

// ─── NO ZAI SDK — Uses Gemini CLI + Internal fallback only ───

// Gemini CLI execution for AI-powered decomposition/planning
async function executeWithGeminiCLI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const safePrompt = userPrompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
      .slice(0, 2000);

    const fullPrompt = `${systemPrompt}\n\n${safePrompt}`;
    const shellCmd = IS_WIN
      ? `gemini -p "${fullPrompt.replace(/"/g, '\\"')}" -m gemini-2.5-flash-lite -o json`
      : `gemini -p "${fullPrompt.replace(/"/g, '\\"')}" -m gemini-2.5-flash-lite -o json`;

    const execOpts: { timeout: number; shell: string; windowsHide?: boolean } = {
      timeout: 60000,
      shell: IS_WIN ? 'cmd.exe' : '/bin/sh',
      ...(IS_WIN ? { windowsHide: true } : {}),
    };

    const result = await execAsync(shellCmd, execOpts) as unknown as { stdout: string; stderr: string };
    const stdout = result.stdout?.trim();

    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        return parsed.response || parsed.content || parsed.text || stdout;
      } catch {
        return stdout;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Internal fallback decomposition (no CLI needed)
function decomposeInternally(task: string): string {
  const subtasks = [
    { id: 'sub-1', description: `Analyze requirements for: ${task.slice(0, 100)}`, domain: 'analysis', priority: 'high', dependencies: [], estimatedComplexity: 'medium' },
    { id: 'sub-2', description: 'Design solution architecture', domain: 'design', priority: 'high', dependencies: ['sub-1'], estimatedComplexity: 'medium' },
    { id: 'sub-3', description: 'Implement core functionality', domain: 'implementation', priority: 'high', dependencies: ['sub-2'], estimatedComplexity: 'high' },
    { id: 'sub-4', description: 'Test and validate', domain: 'testing', priority: 'medium', dependencies: ['sub-3'], estimatedComplexity: 'medium' },
    { id: 'sub-5', description: 'Review and optimize', domain: 'review', priority: 'low', dependencies: ['sub-4'], estimatedComplexity: 'low' },
  ];
  return JSON.stringify(subtasks, null, 2);
}

// Internal fallback planning (no CLI needed)
function planInternally(task: string, subtasks: string, swarmComposition: string): string {
  const plan = {
    executionOrder: ['sub-1', 'sub-2', 'sub-3', 'sub-4', 'sub-5'],
    parallelGroups: [['sub-1']],
    dependencies: { 'sub-2': ['sub-1'], 'sub-3': ['sub-2'], 'sub-4': ['sub-3'], 'sub-5': ['sub-4'] },
    estimatedTimeline: '5-15 minutes depending on complexity',
    strategy: 'Sequential with parallel optimization where possible',
  };
  return JSON.stringify(plan, null, 2);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'evaluate-swarm': {
        const { task, scores } = body as { task: string; scores: SwarmScoreInput };
        const result = shouldTriggerSwarm(task, scores);
        const composition = composeSwarm(result.tier);
        return NextResponse.json({
          success: true,
          ...result,
          composition,
        });
      }
      case 'decompose-task': {
        const { task } = body as { task: string };

        // Try Gemini CLI first
        const cliResult = await executeWithGeminiCLI(
          'You are an intelligent task decomposer. Break down the given task into clear, actionable subtasks. Return as JSON array with fields: id, description, domain, priority, dependencies, estimatedComplexity.',
          task
        );

        if (cliResult) {
          return NextResponse.json({ success: true, decomposition: cliResult, via: 'gemini-cli' });
        }

        // Fallback to internal decomposition
        return NextResponse.json({
          success: true,
          decomposition: decomposeInternally(task),
          via: 'internal-analysis',
        });
      }
      case 'plan-execution': {
        const { task, subtasks, swarmComposition } = body;

        // Try Gemini CLI first
        const cliResult = await executeWithGeminiCLI(
          'You are an execution planner. Given a task, its decomposition, and swarm composition, create an execution plan with: execution order, parallel groups, dependencies, and estimated timeline. Return as structured JSON.',
          `Task: ${task}\nSubtasks: ${JSON.stringify(subtasks)}\nSwarm: ${JSON.stringify(swarmComposition)}`
        );

        if (cliResult) {
          return NextResponse.json({ success: true, plan: cliResult, via: 'gemini-cli' });
        }

        // Fallback to internal planning
        return NextResponse.json({
          success: true,
          plan: planInternally(task, JSON.stringify(subtasks), JSON.stringify(swarmComposition)),
          via: 'internal-analysis',
        });
      }
      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
