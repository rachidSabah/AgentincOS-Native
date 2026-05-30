import { NextRequest, NextResponse } from "next/server";
import {
  getHermesApiEndpointCached,
  hermesFetchProtected,
  isHermesProcessRunningAsync,
  findHermesBinaryAsync,
} from "@/lib/hermes";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// SEO Prompt Templates (for Hermes Chat AI)
// ---------------------------------------------------------------------------

const SEO_SYSTEM_PROMPT = `You are an expert SEO analyst and content strategist specializing in AI/ML/SaaS technology. 
You generate search-optimized content, keyword strategies, meta descriptions, and competitive analyses.
Always respond in valid JSON format when asked for structured data.
Focus on: keyword density, semantic clustering, intent mapping, content gaps, and technical SEO best practices.`;

function keywordResearchPrompt(layerName: string, layerDescription: string, capabilities: string[]): string {
  return `Analyze the following AI agent layer for SEO keyword opportunities. Return a JSON object with this exact structure:
{
  "primaryKeywords": ["keyword1", "keyword2", "keyword3"],
  "longTailKeywords": ["long tail keyword 1", "long tail keyword 2", "long tail keyword 3", "long tail keyword 4", "long tail keyword 5"],
  "lsiKeywords": ["semantic keyword 1", "semantic keyword 2", "semantic keyword 3", "semantic keyword 4"],
  "searchIntent": "informational|commercial|navigational|transactional",
  "difficultyScore": 1-100,
  "estimatedVolume": "low|medium|high",
  "contentGaps": ["gap1", "gap2", "gap3"],
  "titleTag": "optimized title tag under 60 chars",
  "metaDescription": "optimized meta description under 155 chars",
  "h1Tag": "optimized H1 heading",
  "schemaType": "WebPage|SoftwareApplication|HowTo|FAQPage|Article"
}

Layer: ${layerName}
Description: ${layerDescription}
Capabilities: ${capabilities.join(", ")}`;
}

function contentGenerationPrompt(layerName: string, layerDescription: string, keywords: string[], agent: string): string {
  return `Generate search-optimized content for the following AI agent layer. Return a JSON object:
{
  "headline": "compelling H1 headline",
  "subheadline": "supporting H2 subheadline",
  "introduction": "2-3 sentence introduction incorporating primary keywords naturally",
  "keyPoints": [
    {"title": "point title", "content": "2-3 sentence explanation with keyword usage"},
    {"title": "point title", "content": "2-3 sentence explanation"},
    {"title": "point title", "content": "2-3 sentence explanation"},
    {"title": "point title", "content": "2-3 sentence explanation"}
  ],
  "faqSection": [
    {"question": "common search query", "answer": "concise authoritative answer"},
    {"question": "common search query", "answer": "concise authoritative answer"},
    {"question": "common search query", "answer": "concise authoritative answer"}
  ],
  "cta": "call to action text",
  "internalLinks": ["suggested internal page 1", "suggested internal page 2"],
  "agentIntegration": "how ${agent} powers this layer - 2 sentences"
}

Layer: ${layerName}
Description: ${layerDescription}
Target Keywords: ${keywords.join(", ")}`;
}

function competitorAnalysisPrompt(layerName: string, keywords: string[]): string {
  return `Analyze competitors for the following AI technology layer's SEO positioning. Return a JSON object:
{
  "competitors": [
    {"name": "competitor name", "strength": "their SEO strength", "weakness": "their SEO weakness", "rankingKeywords": ["kw1", "kw2"]},
    {"name": "competitor name", "strength": "their SEO strength", "weakness": "their SEO weakness", "rankingKeywords": ["kw1", "kw2"]},
    {"name": "competitor name", "strength": "their SEO strength", "weakness": "their SEO weakness", "rankingKeywords": ["kw1", "kw2"]}
  ],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "threats": ["threat 1", "threat 2"],
  "recommendedStrategy": "overall SEO strategy recommendation in 2-3 sentences"
}

Layer: ${layerName}
Target Keywords: ${keywords.join(", ")}`;
}

function seoScoringPrompt(layerData: {
  title: string;
  description: string;
  keywords: string[];
  content: string;
}): string {
  return `Score the following SEO configuration on a 0-100 scale. Return a JSON object:
{
  "overallScore": 0-100,
  "titleScore": 0-100,
  "metaScore": 0-100,
  "keywordScore": 0-100,
  "contentScore": 0-100,
  "technicalScore": 0-100,
  "issues": [
    {"severity": "critical|warning|info", "category": "title|meta|keywords|content|technical", "description": "issue description", "fix": "how to fix it"}
  ],
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}

Title: ${layerData.title}
Description: ${layerData.description}
Keywords: ${layerData.keywords.join(", ")}
Content excerpt: ${layerData.content.slice(0, 500)}`;
}

// ---------------------------------------------------------------------------
// Helper: Call Hermes Chat API for SEO tasks
// ---------------------------------------------------------------------------

async function callHermesSEOChat(prompt: string): Promise<Record<string, unknown> | null> {
  const endpoint = getHermesApiEndpointCached();

  try {
    const res = await hermesFetchProtected("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hermes-3",
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          return null;
        }
      }
      return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: Hermes Web Search for SEO
// ---------------------------------------------------------------------------

async function hermesWebSearch(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const res = await hermesFetchProtected("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hermes-3",
        messages: [
          {
            role: "system",
            content: "You are a web research assistant. Return search results as a JSON array of objects with title, url, and snippet fields.",
          },
          { role: "user", content: `Search for: ${query}` },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : parsed.results || [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helper: CLI fallback for SEO operations
// ---------------------------------------------------------------------------

async function cliSEOFallback(action: string, args: string[] = []): Promise<string | null> {
  const bin = await findHermesBinaryAsync();
  if (!bin) return null;

  try {
    const { stdout } = await execFileAsync(bin, ["chat", "--prompt", action, ...args], {
      timeout: 30000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET: Get SEO overview for all layers
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const running = await isHermesProcessRunningAsync();

  const layers = [
    {
      id: "interaction",
      name: "Interaction & Perception",
      number: 1,
      primaryKeywords: ["multimodal AI interaction", "voice AI perception", "intent detection AI", "adaptive user interface AI"],
      metaTitle: "Layer 1: Interaction & Perception — Multimodal AI Input Processing",
      metaDescription: "Turn voice, text, image, and video into usable AI signals. The front door of the 7-Layer Agentic AI Stack for adaptive user interaction.",
      seoScore: 72,
      lastAnalyzed: null as string | null,
    },
    {
      id: "knowledge",
      name: "Knowledge Acquisition",
      number: 2,
      primaryKeywords: ["AI knowledge retrieval", "hermes research agent", "AI fact checking", "data synthesis agent"],
      metaTitle: "Layer 2: Knowledge Acquisition — AI Research & Data Retrieval",
      metaDescription: "Find the right information from internal and external sources with Hermes. AI-powered search, synthesis, and fact-checking.",
      seoScore: 78,
      lastAnalyzed: null as string | null,
    },
    {
      id: "orchestration",
      name: "Agent Orchestration",
      number: 3,
      primaryKeywords: ["multi-agent orchestration", "AI task routing", "agent coordination platform", "OpenClaw gateway"],
      metaTitle: "Layer 3: Agent Orchestration — Multi-Agent Task Coordination",
      metaDescription: "Coordinate multiple AI agents, roles, and tasks toward one goal. Dynamic workflow coordination with the 7-Layer Agentic AI Stack.",
      seoScore: 65,
      lastAnalyzed: null as string | null,
    },
    {
      id: "cognition",
      name: "Cognitive Reasoning",
      number: 4,
      primaryKeywords: ["AI cognitive reasoning", "structured planning AI", "self-reflecting AI agent", "Claude reasoning engine"],
      metaTitle: "Layer 4: Cognitive Reasoning — AI Planning & Decision Engine",
      metaDescription: "Plan, evaluate options, and reason through multi-step problems with the Cognitive Reasoning layer. Powered by Claude AI.",
      seoScore: 70,
      lastAnalyzed: null as string | null,
    },
    {
      id: "execution",
      name: "Execution & Integration",
      number: 5,
      primaryKeywords: ["AI execution layer", "tool use automation", "API integration agent", "Hermes workflow automation"],
      metaTitle: "Layer 5: Execution & Integration — AI Tools, APIs & Workflows",
      metaDescription: "Take action using tools, APIs, and automated workflows. Bridge the gap between AI thinking and doing with Hermes execution.",
      seoScore: 74,
      lastAnalyzed: null as string | null,
    },
    {
      id: "memory",
      name: "Memory, Learning & Context",
      number: 6,
      primaryKeywords: ["AI memory layer", "personalization AI agent", "context-aware AI", "compound knowledge system"],
      metaTitle: "Layer 6: Memory, Learning & Context — Compound AI Knowledge",
      metaDescription: "Store context, preferences, and past interactions to improve future AI performance. Day 1 good, Day 30 wild with compound memory.",
      seoScore: 68,
      lastAnalyzed: null as string | null,
    },
    {
      id: "governance",
      name: "Deployment, Governance & Infrastructure",
      number: 7,
      primaryKeywords: ["AI governance platform", "secure AI deployment", "AI observability", "AI safety controls"],
      metaTitle: "Layer 7: Deployment & Governance — Secure AI Infrastructure",
      metaDescription: "Secure, scalable AI infrastructure with strong guardrails. Policies, safety controls, and observability for production AI systems.",
      seoScore: 62,
      lastAnalyzed: null as string | null,
    },
  ];

  if (running) {
    try {
      const searchResults = await hermesWebSearch(
        "agentic AI stack 7-layer architecture SEO trends 2025"
      );
      return NextResponse.json({
        hermesPowered: true,
        layers,
        searchInsights: searchResults.slice(0, 5),
        totalKeywords: layers.reduce((sum, l) => sum + l.primaryKeywords.length, 0),
        avgScore: Math.round(layers.reduce((sum, l) => sum + l.seoScore, 0) / layers.length),
      });
    } catch {
      // Fall through to static response
    }
  }

  return NextResponse.json({
    hermesPowered: false,
    layers,
    searchInsights: [],
    totalKeywords: layers.reduce((sum, l) => sum + l.primaryKeywords.length, 0),
    avgScore: Math.round(layers.reduce((sum, l) => sum + l.seoScore, 0) / layers.length),
  });
}

// ---------------------------------------------------------------------------
// POST: Execute SEO operations via Hermes
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const running = await isHermesProcessRunningAsync();

  const body = await req.json();
  const { action, layerId, layerName, layerDescription, capabilities, keywords, content, agent } = body;

  if (!running) {
    const cliResult = await cliSEOFallback(
      `SEO analysis for ${layerName}: ${action}`,
      capabilities || []
    );

    if (cliResult) {
      return NextResponse.json({
        hermesPowered: false,
        cliFallback: true,
        result: cliResult,
      });
    }

    return NextResponse.json({
      hermesPowered: false,
      cliFallback: false,
      result: generateMockSEOData(action, layerName, layerDescription, capabilities),
      message: "Hermes is offline. Showing estimated SEO data. Start Hermes for AI-powered analysis.",
    });
  }

  try {
    let result: Record<string, unknown> | null = null;

    switch (action) {
      case "keyword-research": {
        result = await callHermesSEOChat(
          keywordResearchPrompt(layerName, layerDescription, capabilities || [])
        );
        break;
      }

      case "generate-content": {
        result = await callHermesSEOChat(
          contentGenerationPrompt(layerName, layerDescription, keywords || [], agent || "hermes")
        );
        break;
      }

      case "competitor-analysis": {
        result = await callHermesSEOChat(
          competitorAnalysisPrompt(layerName, keywords || [])
        );
        break;
      }

      case "seo-scoring": {
        result = await callHermesSEOChat(
          seoScoringPrompt({
            title: layerName,
            description: layerDescription,
            keywords: keywords || [],
            content: content || layerDescription,
          })
        );
        break;
      }

      case "web-research": {
        const searchQuery = `${layerName} ${keywords?.join(" ") || "AI agent"} SEO trends best practices`;
        const searchResults = await hermesWebSearch(searchQuery);
        result = {
          query: searchQuery,
          results: searchResults,
          keywordOpportunities: searchResults.slice(0, 3).map((r: { title: string; snippet: string }) => ({
            source: r.title,
            insight: r.snippet?.slice(0, 150),
          })),
        };
        break;
      }

      case "full-audit": {
        const [keywords, contentRes, competitors, scoring] = await Promise.allSettled([
          callHermesSEOChat(keywordResearchPrompt(layerName, layerDescription, capabilities || [])),
          callHermesSEOChat(contentGenerationPrompt(layerName, layerDescription, keywords || [], agent || "hermes")),
          callHermesSEOChat(competitorAnalysisPrompt(layerName, keywords || [])),
          callHermesSEOChat(seoScoringPrompt({
            title: layerName,
            description: layerDescription,
            keywords: keywords || [],
            content: content || layerDescription,
          })),
        ]);

        result = {
          keywords: keywords.status === "fulfilled" ? keywords.value : null,
          content: contentRes.status === "fulfilled" ? contentRes.value : null,
          competitors: competitors.status === "fulfilled" ? competitors.value : null,
          scoring: scoring.status === "fulfilled" ? scoring.value : null,
          timestamp: Date.now(),
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown SEO action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      hermesPowered: true,
      layerId,
      action,
      result,
      timestamp: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `SEO analysis failed: ${message}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Mock SEO data generator (offline fallback)
// ---------------------------------------------------------------------------

function generateMockSEOData(
  action: string,
  layerName: string,
  layerDescription: string,
  capabilities: string[] = [],
): Record<string, unknown> {
  const baseKeywords = capabilities.length > 0
    ? capabilities
    : [layerName.toLowerCase(), "AI agent", "agentic stack"];

  switch (action) {
    case "keyword-research":
      return {
        primaryKeywords: baseKeywords.slice(0, 3),
        longTailKeywords: baseKeywords.map(k => `best ${k} platform 2025`).slice(0, 5),
        lsiKeywords: ["agentic AI", "multi-agent system", "AI automation", "agent orchestration"],
        searchIntent: "informational",
        difficultyScore: 45,
        estimatedVolume: "medium",
        contentGaps: ["practical implementation guide", "comparison with alternatives", "use case examples"],
        titleTag: `${layerName} — 7-Layer Agentic AI Stack`,
        metaDescription: `${layerDescription.slice(0, 150)}`,
        h1Tag: layerName,
        schemaType: "SoftwareApplication",
      };

    case "generate-content":
      return {
        headline: layerName,
        subheadline: `Unlock the power of ${layerName.toLowerCase()} in your AI agent stack`,
        introduction: `${layerDescription} This layer is a critical component of the 7-Layer Agentic AI Stack, enabling sophisticated multi-agent workflows that compound in value over time.`,
        keyPoints: baseKeywords.slice(0, 4).map(kw => ({
          title: `Advanced ${kw}`,
          content: `Leverage cutting-edge ${kw} capabilities to transform your AI workflows. The 7-Layer Stack ensures seamless integration across all components, from perception to governance.`,
        })),
        faqSection: [
          { question: `What is ${layerName}?`, answer: layerDescription },
          { question: `How does ${layerName} work in the 7-Layer Stack?`, answer: `It integrates with adjacent layers to provide end-to-end AI capabilities, ensuring seamless data flow and coordinated agent actions.` },
          { question: `What are the benefits of ${layerName}?`, answer: "It enables more intelligent, context-aware AI systems that improve continuously through compound learning." },
        ],
        cta: "Start building with the 7-Layer Agentic AI Stack today",
        internalLinks: ["7-layer architecture overview", "agent comparison guide"],
        agentIntegration: "This layer is powered by advanced AI agents within the Agentic OS ecosystem.",
      };

    case "competitor-analysis":
      return {
        competitors: [
          { name: "LangChain", strength: "Large community, extensive docs", weakness: "No visual dashboard, manual orchestration", rankingKeywords: ["AI chain", "langchain agents"] },
          { name: "AutoGPT", strength: "Autonomous execution concept", weakness: "Unreliable, no governance layer", rankingKeywords: ["autonomous AI", "auto GPT"] },
          { name: "CrewAI", strength: "Multi-agent framework", weakness: "No memory layer, limited execution", rankingKeywords: ["crew AI", "multi-agent"] },
        ],
        opportunities: [
          "Target long-tail queries around '7-layer AI stack' — low competition",
          "Create comparison content vs LangChain/AutoGPT — high search volume",
          "Build FAQ content for each layer — featured snippet opportunities",
        ],
        threats: [
          "LangChain dominates branded search for 'AI agent framework'",
          "AutoGPT has strong social media presence driving search volume",
        ],
        recommendedStrategy: "Focus on the unique 7-layer architecture differentiator. Create deep, technical content for each layer targeting long-tail queries. Build authority through the compound knowledge narrative that competitors lack.",
      };

    case "seo-scoring":
      return {
        overallScore: 68,
        titleScore: 72,
        metaScore: 65,
        keywordScore: 70,
        contentScore: 60,
        technicalScore: 75,
        issues: [
          { severity: "warning", category: "content", description: "Content depth needs improvement for each layer page", fix: "Add 1500+ words of detailed content per layer" },
          { severity: "info", category: "keywords", description: "Long-tail keyword opportunities not fully utilized", fix: "Target question-based queries in FAQ sections" },
          { severity: "warning", category: "technical", description: "Missing hreflang tags for multilingual support", fix: "Add hreflang tags if targeting multiple languages" },
        ],
        recommendations: [
          "Expand each layer page to 1500+ words with practical examples",
          "Add FAQ schema markup for rich snippet eligibility",
          "Create internal linking strategy across all 7 layers",
          "Build backlinks through technical comparison content",
        ],
      };

    default:
      return { message: "Mock data not available for this action" };
  }
}
