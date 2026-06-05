import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

interface BrainOrchestrationRequest {
  prompt: string;
  model?: string;
  agentId?: string;
  conversationHistory?: any[];
  files?: any[];
  jsonMode?: boolean;
  apiKey?: string;
  workspacePath?: string;
  swarmLevel?: "single" | "light" | "full";
  leadModel?: string;
  workerModels?: string[];
}

interface BrainResponse {
  response: string;
  agentUsed?: string;
  modelsActivated: string[];
  executionTime: number;
  toolCalls: any[];
  swarmLevel: string;
  fallbackUsed?: boolean;
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Brain Orchestration Started`);

  try {
    const body: BrainOrchestrationRequest = await req.json();
    const {
      prompt,
      model = "gemini-2.0-flash",
      agentId,
      conversationHistory = [],
      files = [],
      jsonMode = false,
      apiKey,
      workspacePath,
      swarmLevel = "single",
      leadModel,
      workerModels = []
    } = body;

    console.log(`[${requestId}] Request Details:`, {
      model,
      swarmLevel,
      agentId,
      promptLength: prompt?.length || 0
    });

    const startTime = Date.now();
    const modelsActivated: string[] = [];
    const toolCalls: any[] = [];

    // Agent lookup
    let agentSystemPrompt = "";
    if (agentId) {
      const agent = await db.agent.findUnique({
        where: { id: agentId },
      });
      if (agent) {
        console.log(`[${requestId}] Using Agent: ${agent.name}`);
        agentSystemPrompt = agent.systemPrompt;
        modelsActivated.push(`Agent:${agent.name}`);
      }
    }

    // Determine swarm activation
    let finalLeadModel = leadModel || model;
    let finalWorkerModels = workerModels;
    
    if (swarmLevel === "single") {
      finalWorkerModels = [];
    } else if (swarmLevel === "light" && finalWorkerModels.length === 0) {
      finalWorkerModels = [model]; // Use same model for workers
    }

    modelsActivated.push(finalLeadModel, ...finalWorkerModels);

    // Execute lead model
    console.log(`[${requestId}] Executing Lead Model: ${finalLeadModel}`);
    const leadResponse = await executeModel(
      finalLeadModel,
      prompt,
      conversationHistory,
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
    const WORKER_TIMEOUT = 30000; // 30 seconds per worker

    if (swarmLevel !== "single" && finalWorkerModels.length > 0) {
      console.log(`[${requestId}] Executing Worker Models (Max ${MAX_WORKERS}):`, finalWorkerModels.slice(0, MAX_WORKERS));
      
      const workersToExecute = finalWorkerModels.slice(0, MAX_WORKERS);
      
      for (const workerModel of workersToExecute) {
        try {
          // Add timeout to worker execution
          const workerPromise = executeModel(
            workerModel,
            prompt,
            conversationHistory,
            agentSystemPrompt,
            files,
            jsonMode,
            apiKey,
            workspacePath,
            requestId
          );

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Worker ${workerModel} timed out after ${WORKER_TIMEOUT}ms`)), WORKER_TIMEOUT)
          );

          const workerResponse = await Promise.race([workerPromise, timeoutPromise]) as any;
          
          // Combine responses (simple approach for now)
          swarmResponse += `\n\n[Worker ${workerModel}]:\n${workerResponse}`;
          if (workerResponse.toolCalls) {
            toolCalls.push(...workerResponse.toolCalls);
          }
        } catch (error: any) {
          console.error(`[${requestId}] Worker model ${workerModel} failed or timed out:`, error.message);
          swarmResponse += `\n\n[Worker ${workerModel}]: Execution failed - ${error.message}`;
        }
      }
    }

    const executionTime = Date.now() - startTime;

    console.log(`[${requestId}] Orchestration Complete in ${executionTime}ms`);

    return NextResponse.json({
      response: swarmResponse,
      agentUsed: agentId || undefined,
      modelsActivated,
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
  conversationHistory: any[],
  agentSystemPrompt: string,
  files: any[],
  jsonMode: boolean,
  apiKey?: string,
  workspacePath?: string,
  requestId?: string
): Promise<any> {
  const modelKey = `model_${model.replace(/[^a-zA-Z0-9]/g, "_")}`;
  
  try {
    // Simulate model execution - in real implementation, this would call the appropriate model API
    const response = {
      content: `[${model}] Response to: ${prompt}`,
      toolCalls: [],
      timestamp: new Date().toISOString()
    };

    // Simulate tool execution if needed
    if (prompt.toLowerCase().includes("calculate") || prompt.toLowerCase().includes("math")) {
      response.toolCalls.push({
        name: "calculator",
        arguments: { expression: "2 + 2" },
        result: "4"
      });
    }

    return response;
  } catch (error: any) {
    console.error(`[${requestId}] Model ${model} execution failed:`, error);
    throw new Error(`Model ${model} execution failed: ${error.message}`);
  }
}