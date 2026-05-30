import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────

type PromptCategory =
  | "system"
  | "task"
  | "skill"
  | "seo"
  | "workflow"
  | "custom";

interface PromptVersion {
  version: number;
  content: string;
  timestamp: number;
  changelog?: string;
}

interface Prompt {
  id: string;
  name: string;
  category: PromptCategory;
  content: string;
  variables: string[];
  version: number;
  versions: PromptVersion[];
  performanceScore: number;
  usageCount: number;
  lastModified: number;
}

// ─── In-Memory Storage ───────────────────────────────────────────────────────

const prompts = new Map<string, Prompt>();

// ─── Pre-seeded Prompts ─────────────────────────────────────────────────────

const SEED_PROMPTS: Array<Omit<Prompt, "id">> = [
  {
    name: "SEO System Prompt",
    category: "seo",
    content:
      "You are an expert SEO analyst. Analyze the provided content and optimize it for search engines. Focus on:\n- Keyword density and placement\n- Meta description optimization\n- Header structure (H1-H6)\n- Internal and external linking suggestions\n- Content readability score\n\nTarget keyword: {{keyword}}\nContent to analyze: {{content}}",
    variables: ["keyword", "content"],
    version: 1,
    versions: [
      {
        version: 1,
        content:
          "You are an expert SEO analyst. Analyze the provided content and optimize it for search engines. Focus on:\n- Keyword density and placement\n- Meta description optimization\n- Header structure (H1-H6)\n- Internal and external linking suggestions\n- Content readability score\n\nTarget keyword: {{keyword}}\nContent to analyze: {{content}}",
        timestamp: Date.now() - 86400000 * 7,
        changelog: "Initial version",
      },
    ],
    performanceScore: 0.87,
    usageCount: 142,
    lastModified: Date.now() - 86400000 * 7,
  },
  {
    name: "Research Prompt",
    category: "task",
    content:
      "Conduct a thorough research analysis on the following topic:\n\nTopic: {{topic}}\nDepth level: {{depth}}\n\nProvide:\n1. Key findings and insights\n2. Supporting evidence and sources\n3. Contradictory viewpoints\n4. Knowledge gaps requiring further investigation\n5. Actionable recommendations\n\nFormat the output as a structured research brief.",
    variables: ["topic", "depth"],
    version: 3,
    versions: [
      {
        version: 1,
        content:
          "Research the following topic: {{topic}}. Provide key findings and recommendations.",
        timestamp: Date.now() - 86400000 * 14,
        changelog: "Initial version",
      },
      {
        version: 2,
        content:
          "Conduct research on: {{topic}}\nDepth level: {{depth}}\n\nProvide key findings, evidence, and recommendations.",
        timestamp: Date.now() - 86400000 * 5,
        changelog: "Added depth parameter and structured output",
      },
      {
        version: 3,
        content:
          "Conduct a thorough research analysis on the following topic:\n\nTopic: {{topic}}\nDepth level: {{depth}}\n\nProvide:\n1. Key findings and insights\n2. Supporting evidence and sources\n3. Contradictory viewpoints\n4. Knowledge gaps requiring further investigation\n5. Actionable recommendations\n\nFormat the output as a structured research brief.",
        timestamp: Date.now() - 86400000 * 2,
        changelog: "Enhanced with detailed structure, contradictory viewpoints, and knowledge gaps",
      },
    ],
    performanceScore: 0.92,
    usageCount: 287,
    lastModified: Date.now() - 86400000 * 2,
  },
  {
    name: "Summary Prompt",
    category: "task",
    content:
      "Summarize the following content concisely while preserving key information:\n\nContent: {{content}}\nMax length: {{maxLength}} words\nStyle: {{style}}\n\nRequirements:\n- Capture the main thesis and supporting arguments\n- Include critical data points and statistics\n- Maintain the original tone and intent\n- Remove fluff and redundancy\n- Ensure the summary is self-contained",
    variables: ["content", "maxLength", "style"],
    version: 2,
    versions: [
      {
        version: 1,
        content:
          "Summarize the following content: {{content}}. Keep it under {{maxLength}} words.",
        timestamp: Date.now() - 86400000 * 10,
        changelog: "Initial version",
      },
      {
        version: 2,
        content:
          "Summarize the following content concisely while preserving key information:\n\nContent: {{content}}\nMax length: {{maxLength}} words\nStyle: {{style}}\n\nRequirements:\n- Capture the main thesis and supporting arguments\n- Include critical data points and statistics\n- Maintain the original tone and intent\n- Remove fluff and redundancy\n- Ensure the summary is self-contained",
        timestamp: Date.now() - 86400000 * 3,
        changelog:
          "Added style parameter and detailed requirements for quality",
      },
    ],
    performanceScore: 0.89,
    usageCount: 456,
    lastModified: Date.now() - 86400000 * 3,
  },
  {
    name: "Code Review Prompt",
    category: "skill",
    content:
      "Perform a comprehensive code review on the following code:\n\nLanguage: {{language}}\nCode:\n```\n{{code}}\n```\n\nEvaluate the following aspects:\n1. **Correctness**: Does the code do what it's supposed to do?\n2. **Performance**: Are there any performance bottlenecks?\n3. **Security**: Any potential vulnerabilities or security issues?\n4. **Readability**: Is the code clean, well-named, and documented?\n5. **Best Practices**: Does it follow language-specific conventions?\n6. **Error Handling**: Are edge cases and errors properly handled?\n\nProvide specific line-by-line feedback and a summary with actionable improvements.",
    variables: ["language", "code"],
    version: 1,
    versions: [
      {
        version: 1,
        content:
          "Perform a comprehensive code review on the following code:\n\nLanguage: {{language}}\nCode:\n```\n{{code}}\n```\n\nEvaluate the following aspects:\n1. **Correctness**: Does the code do what it's supposed to do?\n2. **Performance**: Are there any performance bottlenecks?\n3. **Security**: Any potential vulnerabilities or security issues?\n4. **Readability**: Is the code clean, well-named, and documented?\n5. **Best Practices**: Does it follow language-specific conventions?\n6. **Error Handling**: Are edge cases and errors properly handled?\n\nProvide specific line-by-line feedback and a summary with actionable improvements.",
        timestamp: Date.now() - 86400000,
        changelog: "Initial version with comprehensive review criteria",
      },
    ],
    performanceScore: 0.94,
    usageCount: 198,
    lastModified: Date.now() - 86400000,
  },
  {
    name: "Daily Report Prompt",
    category: "workflow",
    content:
      "Generate a daily standup report based on the following inputs:\n\nTeam member: {{member}}\nDate: {{date}}\nYesterday's tasks: {{yesterdayTasks}}\nToday's plan: {{todayPlan}}\nBlockers: {{blockers}}\n\nFormat the report as:\n📋 **Daily Standup - {{date}}**\n👤 **{{member}}**\n\n✅ **Completed Yesterday:**\n{{yesterdayTasks}}\n\n🎯 **Planned for Today:**\n{{todayPlan}}\n\n🚧 **Blockers:**\n{{blockers}}\n\nKeep it concise, actionable, and highlight any items needing team attention.",
    variables: ["member", "date", "yesterdayTasks", "todayPlan", "blockers"],
    version: 2,
    versions: [
      {
        version: 1,
        content:
          "Create a daily report for {{member}}. Yesterday: {{yesterdayTasks}}. Today: {{todayPlan}}. Blockers: {{blockers}}.",
        timestamp: Date.now() - 86400000 * 6,
        changelog: "Initial version",
      },
      {
        version: 2,
        content:
          "Generate a daily standup report based on the following inputs:\n\nTeam member: {{member}}\nDate: {{date}}\nYesterday's tasks: {{yesterdayTasks}}\nToday's plan: {{todayPlan}}\nBlockers: {{blockers}}\n\nFormat the report as:\n📋 **Daily Standup - {{date}}**\n👤 **{{member}}**\n\n✅ **Completed Yesterday:**\n{{yesterdayTasks}}\n\n🎯 **Planned for Today:**\n{{todayPlan}}\n\n🚧 **Blockers:**\n{{blockers}}\n\nKeep it concise, actionable, and highlight any items needing team attention.",
        timestamp: Date.now() - 86400000 * 1,
        changelog:
          "Added date parameter, emoji formatting, and structured output template",
      },
    ],
    performanceScore: 0.85,
    usageCount: 523,
    lastModified: Date.now() - 86400000 * 1,
  },
];

// Initialize seed data
SEED_PROMPTS.forEach((seed, index) => {
  const id = `prompt_seed_${index + 1}`;
  prompts.set(id, { ...seed, id });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePromptId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

function resolveVariables(
  content: string,
  variables: Record<string, string>
): string {
  let resolved = content;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replaceAll(`{{${key}}}`, value);
  }
  return resolved;
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const list = Array.from(prompts.values()).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    version: p.version,
    lastModified: p.lastModified,
    performanceScore: p.performanceScore,
    usageCount: p.usageCount,
  }));

  return NextResponse.json({ prompts: list, total: list.length });
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      // ── Create ──────────────────────────────────────────────────────────
      case "create": {
        const { name, category, content, variables } = body as {
          name: string;
          category: PromptCategory;
          content: string;
          variables?: string[];
        };

        if (!name || !category || !content) {
          return NextResponse.json(
            { error: "name, category, and content are required" },
            { status: 400 }
          );
        }

        const validCategories: PromptCategory[] = [
          "system",
          "task",
          "skill",
          "seo",
          "workflow",
          "custom",
        ];
        if (!validCategories.includes(category)) {
          return NextResponse.json(
            {
              error: `Invalid category. Valid: ${validCategories.join(", ")}`,
            },
            { status: 400 }
          );
        }

        const id = generatePromptId();
        const now = Date.now();
        const autoVariables = variables ?? extractVariables(content);

        const prompt: Prompt = {
          id,
          name,
          category,
          content,
          variables: autoVariables,
          version: 1,
          versions: [
            { version: 1, content, timestamp: now, changelog: "Initial version" },
          ],
          performanceScore: 0,
          usageCount: 0,
          lastModified: now,
        };

        prompts.set(id, prompt);

        return NextResponse.json({
          success: true,
          prompt: {
            id: prompt.id,
            name: prompt.name,
            category: prompt.category,
            version: prompt.version,
          },
        });
      }

      // ── Update ──────────────────────────────────────────────────────────
      case "update": {
        const { id, content, changelog } = body as {
          id: string;
          content: string;
          changelog?: string;
        };

        if (!id || !content) {
          return NextResponse.json(
            { error: "id and content are required" },
            { status: 400 }
          );
        }

        const prompt = prompts.get(id);
        if (!prompt) {
          return NextResponse.json(
            { error: "Prompt not found" },
            { status: 404 }
          );
        }

        const newVersion = prompt.version + 1;
        const now = Date.now();

        prompt.content = content;
        prompt.variables = extractVariables(content);
        prompt.version = newVersion;
        prompt.versions.push({
          version: newVersion,
          content,
          timestamp: now,
          changelog: changelog ?? `Updated to version ${newVersion}`,
        });
        prompt.lastModified = now;

        return NextResponse.json({
          success: true,
          prompt: {
            id: prompt.id,
            name: prompt.name,
            version: prompt.version,
            variables: prompt.variables,
          },
        });
      }

      // ── Delete ──────────────────────────────────────────────────────────
      case "delete": {
        const { id } = body as { id: string };

        if (!id) {
          return NextResponse.json(
            { error: "id is required" },
            { status: 400 }
          );
        }

        const deleted = prompts.delete(id);
        if (!deleted) {
          return NextResponse.json(
            { error: "Prompt not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Prompt deleted",
        });
      }

      // ── Test ────────────────────────────────────────────────────────────
      case "test": {
        const { id, variables, agentId } = body as {
          id: string;
          variables: Record<string, string>;
          agentId: string;
        };

        if (!id || !variables || !agentId) {
          return NextResponse.json(
            { error: "id, variables, and agentId are required" },
            { status: 400 }
          );
        }

        const prompt = prompts.get(id);
        if (!prompt) {
          return NextResponse.json(
            { error: "Prompt not found" },
            { status: 404 }
          );
        }

        // Increment usage count
        prompt.usageCount++;

        const resolvedContent = resolveVariables(
          prompt.content,
          variables
        );

        // Simulate a test execution with Hermes
        const testId = `test_${Date.now()}`;
        const testDuration = Math.floor(Math.random() * 2000 + 500);

        // Generate simulated test results
        const missingVars = prompt.variables.filter(
          (v) => !Object.keys(variables).includes(v)
        );
        const hasAllVars = missingVars.length === 0;

        const simulatedOutput = hasAllVars
          ? `[Test via ${agentId}] Successfully resolved prompt "${prompt.name}" (v${prompt.version}). ` +
            `Processed ${Object.keys(variables).length} variable(s). ` +
            `Estimated token usage: ${resolvedContent.length / 4} input, ~${resolvedContent.length / 2} output.`
          : `[Test via ${agentId}] Partial resolution of prompt "${prompt.name}". Missing variables: ${missingVars.join(", ")}. Output may be incomplete.`;

        // Adjust performance score slightly based on test
        if (hasAllVars) {
          prompt.performanceScore = Math.min(
            1,
            prompt.performanceScore + 0.01
          );
        }

        return NextResponse.json({
          success: true,
          test: {
            testId,
            promptId: id,
            promptName: prompt.name,
            agentId,
            resolvedContent,
            simulatedOutput,
            testDuration,
            variablesProvided: Object.keys(variables),
            missingVariables: missingVars,
            tokenEstimate: {
              input: Math.ceil(resolvedContent.length / 4),
              output: Math.ceil(resolvedContent.length / 2),
            },
          },
        });
      }

      // ── Compare ─────────────────────────────────────────────────────────
      case "compare": {
        const { id1, id2, testInput } = body as {
          id1: string;
          id2: string;
          testInput: string;
        };

        if (!id1 || !id2 || !testInput) {
          return NextResponse.json(
            { error: "id1, id2, and testInput are required" },
            { status: 400 }
          );
        }

        const prompt1 = prompts.get(id1);
        const prompt2 = prompts.get(id2);

        if (!prompt1) {
          return NextResponse.json(
            { error: `Prompt ${id1} not found` },
            { status: 404 }
          );
        }
        if (!prompt2) {
          return NextResponse.json(
            { error: `Prompt ${id2} not found` },
            { status: 404 }
          );
        }

        // Simulate A/B comparison
        const comparisonId = `cmp_${Date.now()}`;

        // Resolve testInput as a variable if the prompts have a standard variable
        const resolved1 = resolveVariables(prompt1.content, {
          input: testInput,
          content: testInput,
          topic: testInput,
          code: testInput,
        });
        const resolved2 = resolveVariables(prompt2.content, {
          input: testInput,
          content: testInput,
          topic: testInput,
          code: testInput,
        });

        const comparison = {
          comparisonId,
          promptA: {
            id: prompt1.id,
            name: prompt1.name,
            version: prompt1.version,
            category: prompt1.category,
            contentLength: resolved1.length,
            variableCount: prompt1.variables.length,
            performanceScore: prompt1.performanceScore,
            usageCount: prompt1.usageCount,
            tokenEstimate: Math.ceil(resolved1.length / 4),
          },
          promptB: {
            id: prompt2.id,
            name: prompt2.name,
            version: prompt2.version,
            category: prompt2.category,
            contentLength: resolved2.length,
            variableCount: prompt2.variables.length,
            performanceScore: prompt2.performanceScore,
            usageCount: prompt2.usageCount,
            tokenEstimate: Math.ceil(resolved2.length / 4),
          },
          analysis: {
            contentDiff: resolved2.length - resolved1.length,
            performanceDiff:
              Math.round(
                (prompt2.performanceScore - prompt1.performanceScore) * 100
              ) / 100,
            recommendation:
              prompt1.performanceScore >= prompt2.performanceScore
                ? `Prompt A ("${prompt1.name}") has a higher performance score and is recommended.`
                : `Prompt B ("${prompt2.name}") has a higher performance score and is recommended.`,
          },
          testInput,
        };

        return NextResponse.json({
          success: true,
          comparison,
        });
      }

      // ── History ─────────────────────────────────────────────────────────
      case "history": {
        const { id } = body as { id: string };

        if (!id) {
          return NextResponse.json(
            { error: "id is required" },
            { status: 400 }
          );
        }

        const prompt = prompts.get(id);
        if (!prompt) {
          return NextResponse.json(
            { error: "Prompt not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          history: {
            promptId: prompt.id,
            promptName: prompt.name,
            currentVersion: prompt.version,
            totalVersions: prompt.versions.length,
            versions: prompt.versions.map((v) => ({
              version: v.version,
              content: v.content,
              timestamp: v.timestamp,
              changelog: v.changelog,
            })),
          },
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Unknown action. Valid actions: create, update, delete, test, compare, history",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
