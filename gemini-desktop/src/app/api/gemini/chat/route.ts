import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { spawn, exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 120;

const LOCAL_SYSTEM_INSTRUCTIONS = `
[LOCAL AGENT CAPABILITIES]
You are a highly capable Local AI Assistant with direct access to the user's local operating system, files, and terminal. You can autonomously execute commands, read/write files, and list directories.

To perform a local action, you MUST use one of the following XML tool tags in your response. Keep commands brief and explain to the user what you are doing before executing.

1. Execute a command in the Windows terminal (CMD/Powershell):
<local_cmd>command_here</local_cmd>
Example: <local_cmd>dir C:\\Users\\piopi\\Desktop</local_cmd>

2. List files and folders in a directory:
<list_files>directory_path_here</list_files>
Example: <list_files>C:\\Users\\piopi\\Desktop</list_files>

3. Read the content of a file:
<read_file>file_path_here</read_file>
Example: <read_file>C:\\Users\\piopi\\Desktop\\notes.txt</read_file>

4. Create or overwrite a file:
<write_file path="file_path_here">file_content_here</write_file>
Example: <write_file path="C:\\Users\\piopi\\Desktop\\script.py">print("Hello from AI")</write_file>

When you run a command or access a file, wait for the system to return the output. The system will automatically execute your tool tag, append the result to the conversation, and trigger your next turn.
`;

async function runTools(text: string, workspacePath?: string): Promise<{ toolRun: boolean; result: string }> {
  const cmdRegex = /<local_cmd>([\s\S]*?)<\/local_cmd>/;
  const listRegex = /<list_files>([\s\S]*?)<\/list_files>/;
  const readRegex = /<read_file>([\s\S]*?)<\/read_file>/;
  const writeRegex = /<write_file\s+path="([\s\S]*?)">([\s\S]*?)<\/write_file>/;

  let toolRun = false;
  let result = "";

  const cmdMatch = text.match(cmdRegex);
  const listMatch = text.match(listRegex);
  const readMatch = text.match(readRegex);
  const writeMatch = text.match(writeRegex);

  const desktopPath = path.join(os.homedir(), "Desktop");
  const activeDir = (workspacePath && fs.existsSync(workspacePath)) ? path.resolve(workspacePath) : desktopPath;

  if (cmdMatch) {
    toolRun = true;
    const command = cmdMatch[1].trim();
    console.log(`Executing Local Command: ${command} in ${activeDir}`);
    result = await new Promise<string>((resolve) => {
      exec(command, { cwd: activeDir }, (error, stdout, stderr) => {
        resolve(`[Command stdout]:\n${stdout || "(no stdout)"}\n[Command stderr]:\n${stderr || "(no stderr)"}\n[Status Code]: ${error ? error.code : 0}`);
      });
    });
  } else if (listMatch) {
    toolRun = true;
    const targetDir = listMatch[1].trim() || "";
    console.log(`Listing Local Files in: ${targetDir || activeDir}`);
    try {
      const resolved = targetDir ? path.resolve(activeDir, targetDir) : activeDir;
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        const files = fs.readdirSync(resolved);
        result = `Files/folders inside ${resolved}:\n` + files.map(f => {
          try {
            const stats = fs.statSync(path.join(resolved, f));
            return `- ${stats.isDirectory() ? "[DIR]" : "[FILE]"} ${f}`;
          } catch {
            return `- [UNKNOWN] ${f}`;
          }
        }).join("\n");
      } else {
        result = `Error: Path is not a directory or does not exist: ${resolved}`;
      }
    } catch (e: any) {
      result = `Error listing files: ${e.message}`;
    }
  } else if (readMatch) {
    toolRun = true;
    const targetFile = readMatch[1].trim();
    console.log(`Reading Local File: ${targetFile}`);
    try {
      const resolved = path.resolve(activeDir, targetFile);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        result = fs.readFileSync(resolved, "utf-8");
      } else {
        result = `Error: File not found or is a directory: ${resolved}`;
      }
    } catch (e: any) {
      result = `Error reading file: ${e.message}`;
    }
  } else if (writeMatch) {
    toolRun = true;
    const targetFile = writeMatch[1].trim();
    const content = writeMatch[2];
    console.log(`Writing Local File to: ${targetFile}`);
    try {
      const resolved = path.resolve(activeDir, targetFile);
      const parentDir = path.dirname(resolved);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(resolved, content, "utf-8");
      result = `Successfully wrote file to ${resolved}`;
    } catch (e: any) {
      result = `Error writing file: ${e.message}`;
    }
  }

  return { toolRun, result };
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

          const baseSystemPrompt = agentSystemPrompt || manualSystemPrompt || "";
          const assignedSkillsText = agentSkills.length > 0 ? `[Assigned Skills]: ${agentSkills.join(", ")}` : "";
          const basePromptWithSkills = assignedSkillsText ? `${baseSystemPrompt}\n${assignedSkillsText}` : baseSystemPrompt;

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

            // Execute any tool outputs in responseText
            const { toolRun, result } = await runTools(responseText, workspacePath);

            if (!toolRun) {
              break; // Done!
            }

            // Stream progress update to UI
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: "chunk", 
              content: `\n\n⚙️ **[Executed System Action]**:\n\`\`\`\n${result}\n\`\`\`\n` 
            })}\n\n`));

            // Append assistant response and system response to history
            currentHistory.push({ role: "user", content: currentPrompt });
            currentHistory.push({ role: "assistant", content: responseText });

            // Next turn prompt
            currentPrompt = `Here is the result of the local tool execution you requested:\n${result}\n\nPlease proceed with the next steps or give your final answer based on this result.`;
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", duration: 0 })}\n\n`));
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
