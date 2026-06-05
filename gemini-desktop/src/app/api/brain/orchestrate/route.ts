import { NextRequest, NextResponse } from "next/server";
import { 
  getLeadModel, 
  getWorkerModels, 
  getFallbackModel,
  analyzeError,
  BrainResponse
} from "@/lib/brain-orchestrator";
import { spawn } from "child_process";

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      prompt,
      model = "auto",
      conversationHistory = [],
      agentId,
      agentSystemPrompt,
      files = [],
      jsonMode = false,
      swarmLevel = "single",
      apiKey,
      workspacePath
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const finalLeadModel = getLeadModel(model);
    let finalWorkerModels = getWorkerModels(swarmLevel, finalLeadModel);
    
    const modelsActivated: string[] = [];
    const toolCalls: any[] = [];
    
    // Memory Management: Prune history
    const MAX_HISTORY = 20;
    const prunedHistory = conversationHistory.slice(-MAX_HISTORY);

    // Execute lead model
    console.log(`[${requestId}] Executing Lead Model: ${finalLeadModel}`);
    const leadResponse = await executeModel(
      finalLeadModel,
      prompt,
      prunedHistory,
      agentSystemPrompt,
      files,
      jsonMode,
      apiKey,
      workspacePath,
      requestId
    );

    let swarmResponse = leadResponse;
    
    // Execute worker models if swarm level requires it
    const MAX_WORKERS = 5;
    const WORKER_TIMEOUT = 30000;

    if (swarmLevel !== "single" && finalWorkerModels.length > 0) {
      console.log(`[${requestId}] Executing Worker Models (Max ${MAX_WORKERS}):`, finalWorkerModels.slice(0, MAX_WORKERS));
      
      const workersToExecute = finalWorkerModels.slice(0, MAX_WORKERS);
      
      for (const workerModel of workersToExecute) {
        try {
          const workerPromise = executeModel(
            workerModel,
            prompt,
            prunedHistory,
            agentSystemPrompt,
            files,
            jsonMode,
            apiKey,
            workspacePath,
            requestId
          );

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Worker ${workerModel} timed out`)), WORKER_TIMEOUT)
          );

          const workerResponse = await Promise.race([workerPromise, timeoutPromise]) as any;
          
          swarmResponse += `\n\n[Worker ${workerModel}]:\n${workerResponse}`;
          if (workerResponse.toolCalls) {
            toolCalls.push(...workerResponse.toolCalls);
          }
        } catch (error: any) {
          console.error(`[${requestId}] Worker model ${workerModel} failed:`, error.message);
          swarmResponse += `\n\n[Worker ${workerModel}]: Execution failed - ${error.message}`;
        }
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      response: swarmResponse,
      agentUsed: agentId || undefined,
      modelsActivated: [finalLeadModel, ...finalWorkerModels],
      executionTime,
      toolCalls,
      swarmLevel,
      fallbackUsed: false
    } as BrainResponse);

  } catch (error: any) {
    console.error(`[${requestId}] Brain Orchestration Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function executeModel(
  model: string,
  prompt: string,
  history: any[],
  systemPrompt?: string,
  files: any[] = [],
  jsonMode: boolean = false,
  apiKey?: string,
  workspacePath?: string,
  requestId?: string
) {
  // Use CLI for execution (same logic as in chat route)
  // This is a simplified version for now
  return new Promise((resolve, reject) => {
    const args = ["-p", prompt, "-m", model];
    if (jsonMode) args.push("-o", "json");
    
    const proc = spawn("gemini", args, {
      env: { ...process.env, ...(apiKey ? { GEMINI_API_KEY: apiKey } : {}) },
      shell: true
    });

    let output = "";
    proc.stdout.on("data", (chunk) => output += chunk.toString());
    proc.on("close", (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`CLI error ${code}`));
    });
    proc.on("error", reject);
    
    // Set a hard timeout
    setTimeout(() => {
      if (proc.exitCode === null) {
        proc.kill();
        reject(new Error("Model execution timed out"));
      }
    }, 60000);
  });
}
