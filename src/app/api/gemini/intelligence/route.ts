import { NextRequest, NextResponse } from 'next/server';
import { shouldTriggerSwarm, composeSwarm, type SwarmScoreInput } from '@/lib/swarm-orchestrator';

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
        // Use AI to decompose the task
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an intelligent task decomposer. Break down the given task into clear, actionable subtasks. Return as JSON array with fields: id, description, domain, priority, dependencies, estimatedComplexity.' },
            { role: 'user', content: task },
          ],
        });
        return NextResponse.json({
          success: true,
          decomposition: completion.choices?.[0]?.message?.content || '[]',
        });
      }
      case 'plan-execution': {
        const { task, subtasks, swarmComposition } = body;
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an execution planner. Given a task, its decomposition, and swarm composition, create an execution plan with: execution order, parallel groups, dependencies, and estimated timeline. Return as structured JSON.' },
            { role: 'user', content: `Task: ${task}\nSubtasks: ${JSON.stringify(subtasks)}\nSwarm: ${JSON.stringify(swarmComposition)}` },
          ],
        });
        return NextResponse.json({
          success: true,
          plan: completion.choices?.[0]?.message?.content || '',
        });
      }
      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
