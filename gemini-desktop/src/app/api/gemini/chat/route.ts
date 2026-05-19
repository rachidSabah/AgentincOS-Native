import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { spawn, exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { parseToolCalls, executeToolCall, getToolsPrompt, type ToolCallResult } from "@/lib/tools";
import { countTokens, estimateCost } from "@/lib/tokens";

async function extractMemoriesFromText(
  assistantText: string,
  model: string,
  targetModel: string,
  isCustomProvider: boolean,
  providerData: any,
  providerEnv: any,
  apiKey: string | undefined,
  sourceId: string
) {
  if (!assistantText || assistantText.length <= 200) return;

  const extractionPrompt = `Extract any important facts, preferences, or memories from this conversation that should be remembered for future interactions. Respond with ONLY a JSON array of { "key": string, "content": string } objects. If there's nothing worth remembering, respond with an empty array [].

Conversation text:
${assistantText.slice(0, 4000)}`;

  try {
    let responseText = "";
    const controller = new ReadableStream({
      start(c) { c.close(); }
    });
    const encoder = new TextEncoder();

    if (isCustomProvider && providerData) {
      const baseUrl = (providerData.baseUrl?.replace(/\/$/, "") || "https://api.openai.com/v1").replace("://localhost", "://127.0.0.1");
      const url = `${baseUrl}/chat/completions`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerData.apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: extractionPrompt }],
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || "";
      }
    } else {
      const cliArgs = model.includes("/") && !model.startsWith("openai/") && !model.startsWith("anthropic/") && !model.startsWith("google/") && !model.startsWith("vertex/")
        ? ["--model", model.split("/")[1]]
        : model === "auto" ? [] : ["--model", model];

      responseText = await new Promise<string>((resolve, reject) => {
        const proc = spawn("gemini", [...cliArgs, "--no-stream"], {
          env: { ...process.env, ...providerEnv, ...(apiKey ? { GEMINI_API_KEY: apiKey } : {}) },
          shell: true,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let output = "";
        proc.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
        let errOut = "";
        proc.stderr.on("data", (chunk: Buffer) => { errOut += chunk.toString(); });

        proc.on("close", (code) => {
          if (code === 0) resolve(output);
          else { console.error(`Memory extraction CLI error ${code}: ${errOut}`); resolve(""); }
        });
        proc.on("error", () => resolve(""));

        proc.stdin?.write(extractionPrompt);
        proc.stdin?.end();
      });
    }

    if (!responseText) return;

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const extracted: { key: string; content: string }[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(extracted) || extracted.length === 0) return;

    for (const item of extracted) {
      if (item.key && item.content) {
        await db.memory.create({
          data: { key: item.key, content: item.content, source: sourceId },
        });
        console.log(`[Memory] Saved: ${item.key}`);
      }
    }
  } catch (error) {
    console.error("[Memory Extraction Error]:", error);
  }
}
import { countTokens, estimateCost } from "@/lib/tokens";

export const maxDuration = 120;

const TOOLS_DESCRIPTION = getToolsPrompt();

const LOCAL_SYSTEM_INSTRUCTIONS = `
[LOCAL AGENT CAPABILITIES]
You are a highly capable Local AI Assistant with direct access to the user's local operating system, files, and terminal. You can autonomously execute commands, read/write files, and list directories.

${TOOLS_DESCRIPTION}

You can also use XML tool tags for backward compatibility:

1. Execute a command in the terminal:
<local_cmd>command_here</local_cmd>

2. List files and folders:
<list_files>directory_path_here</list_files>

3. Read file content:
<read_file>file_path_here</read_file>

4. Create or overwrite a file:
<write_file path="file_path_here">file_content_here</write_file>

When you call a tool, the system will automatically execute it, append the result to the conversation, and trigger your next turn.
`;

async function parseAndExecuteTools(
  text: string,
  workspacePath: string | undefined,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  requestId: string,
  allToolCalls: ToolCallResult[]
): Promise<{ toolRun: boolean; resultSummary: string }> {
  const calls = parseToolCalls(text);

  if (calls.length === 0) {
    return { toolRun: false, resultSummary: "" };
  }

  console.log(`[${requestId}] Found ${calls.length} tool call(s) in response`);
  const results: string[] = [];

  for (const call of calls) {
    console.log(`[${requestId}] Executing tool: ${call.name}`);

    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "tool_call", toolName: call.name, id: `tc_${allToolCalls.length + 1}` })}\n\n`
      )
    );

    const result = await executeToolCall(call, workspacePath);

    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "tool_result", toolName: result.name, result: result.result, status: result.status, timestamp: result.timestamp })}\n\n`
      )
    );

    allToolCalls.push(result);

    let formattedResult: string;
    try {
      const parsed = JSON.parse(result.result);
      formattedResult = JSON.stringify(parsed, null, 2);
    } catch {
      formattedResult = result.result;
    }

    results.push(
      `Tool: ${result.name}\nStatus: ${result.status}\nResult:\n${formattedResult}`
    );
  }

  return {
    toolRun: true,
    resultSummary: results.join("\n\n---\n\n"),
  };
}

async function queryLLM(
  model: string,
  targetModel: string,
  prompt: string,
  conversationHistory: any[],
  finalSystemPrompt: string,
  isCustomProvider: boolean,
  providerData: any,
  providerEnv: any,
  apiKey: string | undefined,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  requestId: string
): Promise<string> {
  let accumulatedText = "";

  if (isCustomProvider && providerData) {
    const baseUrl = (providerData.baseUrl?.replace(/\/$/, "") || "https://api.openai.com/v1").replace("://localhost", "://127.0.0.1");
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${providerData.apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          ...(finalSystemPrompt ? [{ role: "system", content: finalSystemPrompt }] : []),
          ...conversationHistory.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          })),
          { role: "user", content: prompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Failed to get reader from response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            if (content) {
              accumulatedText += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`));
            }
          } catch (e) {
            console.error(`[${requestId}] Error parsing SSE line: ${trimmed}`, e);
          }
        }
      }
    }
  } else {
    // Spawn Gemini CLI
    let fullPrompt = "";
    if (finalSystemPrompt) {
      fullPrompt += `[System Instructions]: ${finalSystemPrompt}\n`;
    }
    if (conversationHistory.length > 0) {
      fullPrompt += "[Previous Conversation]:\n";
      for (const msg of conversationHistory.slice(-10)) {
        const role = msg.role === "user" ? "User" : "Assistant";
        fullPrompt += `${role}: ${msg.content}\n\n`;
      }
    }
    fullPrompt += prompt;

    const getCliArgs = (m: string) => {
      if (m.includes("/") && !m.startsWith("openai/") && !m.startsWith("anthropic/") && !m.startsWith("google/") && !m.startsWith("vertex/")) {
        const [_, modelName] = m.split("/");
        return ["--model", modelName];
      }
      switch (m) {
        case "auto": return [];
        case "auto-gemini-3": return ["--model", "auto"];
        case "auto-gemini-2.5": return ["--model", "auto-gemini-2.5"];
        default: return ["--model", m];
      }
    };

    const cliArgs = getCliArgs(model);
    console.log(`[${requestId}] Spawning: gemini ${cliArgs.join(" ")}`);

    const geminiProcess = spawn("gemini", cliArgs, {
      env: {
        ...process.env,
        ...providerEnv,
        ...(apiKey ? { GEMINI_API_KEY: apiKey } : {}),
      },
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    geminiProcess.stdin?.write(fullPrompt);
    geminiProcess.stdin?.end();

    const processComplete = new Promise<void>((resolve, reject) => {
      geminiProcess.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        accumulatedText += text;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`));
      });

      let stderrData = "";
      geminiProcess.stderr.on("data", (chunk: Buffer) => {
        stderrData += chunk.toString();
      });

      geminiProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`CLI error ${code}: ${stderrData.trim()}`));
        }
      });

      geminiProcess.on("error", (err) => {
        reject(err);
      });
    });

    await processComplete;
  }

  return accumulatedText;
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Chat Request Started`);

  try {
    const body = await req.json();
    const {
      prompt,
      model = "gemini-2.0-flash",
      systemPrompt: manualSystemPrompt,
      agentId,
      conversationHistory = [],
      files = [],
      jsonMode = false,
      apiKey,
      workspacePath,
    } = body;

    console.log(`[${requestId}] Model: ${model}`);
    console.log(`[${requestId}] Prompt Length: ${prompt?.length || 0}`);

    if (!prompt && files.length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Agent lookup
    let agentSystemPrompt = "";
    let agentSkills: string[] = [];
    if (agentId) {
      const agent = await db.agent.findUnique({
        where: { id: agentId },
      });
      if (agent) {
        console.log(`[${requestId}] Using Agent: ${agent.name}`);
        agentSystemPrompt = agent.systemPrompt;
        try {
          agentSkills = JSON.parse(agent.skills || "[]");
        } catch (e) {}
      }
    }

    // Environment variables for provider
    let providerEnv: Record<string, string> = {
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      PAGER: "cat"
    };

    // Determine if we should bypass the CLI (custom providers)
    let isCustomProvider = false;
    let providerData: any = null;
    let targetModel = model;

    if (model.includes("/")) {
      const [providerSlug, modelName] = model.split("/");
      targetModel = modelName;
      console.log(`[${requestId}] Detected Provider Slug: ${providerSlug}, Model: ${targetModel}`);

      if (providerSlug === "proxima") {
        isCustomProvider = true;
        providerData = {
          name: "Proxima",
          baseUrl: "http://127.0.0.1:3210/v1",
          apiKey: "proxima-local",
          isActive: true
        };
        console.log(`[${requestId}] Routing to Proxima Local Gateway`);
      } else {
        const providers = await db.provider.findMany({ where: { isActive: true } });
        let provider = providers.find(p => p.name.toLowerCase().replace(/\s+/g, "-") === providerSlug);

        if (!provider && providerSlug === "deepseek") {
          console.log(`[${requestId}] DeepSeek provider not found in DB, checking Antigravity config...`);
          try {
            const appDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming");
            const configPath = path.join(appDataPath, "Antigravity", "config.json");
            if (fs.existsSync(configPath)) {
              const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
              const dsConfig = config.customProviders?.deepseek;
              if (dsConfig) {
                provider = {
                  name: "DeepSeek",
                  baseUrl: dsConfig.apiBase || "https://api.deepseek.com/v1",
                  apiKey: dsConfig.apiKey,
                  isActive: true
                } as any;
                console.log(`[${requestId}] Loaded DeepSeek credentials from Antigravity config`);
              }
            }
          } catch (e) {
            console.error(`[${requestId}] Failed to read Antigravity config:`, e);
          }
        }

        if (provider) {
          isCustomProvider = true;
          providerData = provider;
          console.log(`[${requestId}] Mapping Provider: ${provider.name}`);
          const envPrefix = provider.name.toUpperCase().replace(/\s+/g, "_");

          providerEnv[`${envPrefix}_API_KEY`] = provider.apiKey || "";
          providerEnv[`${envPrefix}_BASE_URL`] = provider.baseUrl || "";
          providerEnv["OPENAI_API_KEY"] = provider.apiKey || "";
          providerEnv["OPENAI_BASE_URL"] = provider.baseUrl || "";
          providerEnv["API_KEY"] = provider.apiKey || "";
          providerEnv["BASE_URL"] = provider.baseUrl || "";
        }
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          let currentPrompt = prompt;
          let currentHistory = [...conversationHistory];
          let iteration = 0;
          const maxIterations = 5;
          let totalResponseText = "";
          const allToolCalls: ToolCallResult[] = [];

          const baseSystemPrompt = agentSystemPrompt || manualSystemPrompt || "";
          const assignedSkillsText = agentSkills.length > 0 ? `[Assigned Skills]: ${agentSkills.join(", ")}` : "";
          const basePromptWithSkills = assignedSkillsText ? `${baseSystemPrompt}\n${assignedSkillsText}` : baseSystemPrompt;

          let lastAssistantText = "";
          const conversationId = (body as any).conversationId || "unknown";

          while (iteration < maxIterations) {
            iteration++;
            console.log(`[${requestId}] Agent Loop Iteration ${iteration}`);

            const enhancedSystemPrompt = `${basePromptWithSkills}\n\n${LOCAL_SYSTEM_INSTRUCTIONS}`;

            const responseText = await queryLLM(
              model,
              targetModel,
              currentPrompt,
              currentHistory,
              enhancedSystemPrompt,
              isCustomProvider,
              providerData,
              providerEnv,
              apiKey,
              controller,
              encoder,
              requestId
            );

            totalResponseText += responseText;

            const { toolRun, resultSummary } = await parseAndExecuteTools(
              responseText,
              workspacePath,
              controller,
              encoder,
              requestId,
              allToolCalls
            );

            if (!toolRun) {
              lastAssistantText = responseText;
              break;
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: "chunk", 
              content: `\n\n⚙️ **[Executed System Action]**:\n\`\`\`\n${resultSummary}\n\`\`\`\n` 
            })}\n\n`));

            currentHistory.push({ role: "user", content: currentPrompt });
            currentHistory.push({ role: "assistant", content: responseText });

            currentPrompt = `Here is the result of the tool execution:\n${resultSummary}\n\nPlease proceed with the next steps or give your final answer based on this result.`;
          }

          const promptContext = [
            basePromptWithSkills,
            LOCAL_SYSTEM_INSTRUCTIONS,
            ...conversationHistory.map((m: any) => m.content),
            prompt,
          ].join(" ");
          const promptTokens = countTokens(promptContext);
          const completionTokens = countTokens(totalResponseText);
          const totalTokens = promptTokens + completionTokens;
          const { cost } = estimateCost(model, promptTokens, completionTokens);

          extractMemoriesFromText(
            totalResponseText,
            model,
            targetModel,
            isCustomProvider,
            providerData,
            providerEnv,
            apiKey,
            conversationId
          ).catch((err) => console.error("[Memory Extraction Failed]:", err));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", duration: 0, tokens: { prompt: promptTokens, completion: completionTokens, total: totalTokens }, cost, toolCalls: allToolCalls })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error(`[${requestId}] Stream Error:`, error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error(`[${requestId}] Fatal API Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
