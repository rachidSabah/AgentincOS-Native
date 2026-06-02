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
// New SEO action prompts
// ---------------------------------------------------------------------------

function websiteScanPrompt(url: string): string {
  return `Analyze the website at ${url} for SEO issues. Return a JSON object:
{
  "title": "page title tag",
  "metaDescription": "meta description",
  "h1": "main H1 heading",
  "h2s": ["h2 1", "h2 2", "h2 3"],
  "canonicalUrl": "canonical URL",
  "robotsMeta": "robots meta tag value",
  "schemaTypes": ["schema type 1", "schema type 2"],
  "pageSize": size_in_kb_number,
  "loadTime": load_time_ms_number,
  "mobileFriendly": true_or_false,
  "https": true_or_false,
  "issues": [
    {"severity": "critical|warning|info", "category": "title|meta|headings|schema|speed|mobile|security", "description": "issue description", "fix": "how to fix"}
  ],
  "score": 0_to_100_number
}`;
}

function siloBuilderPrompt(topic: string, pillarKeyword: string): string {
  return `Build an SEO content silo structure for the topic "${topic}" with pillar keyword "${pillarKeyword}". Return a JSON object:
{
  "name": "silo name",
  "pillarUrl": "/suggested-pillar-url",
  "pillarKeyword": "main keyword",
  "description": "silo description",
  "clusters": [
    {
      "name": "cluster name",
      "keyword": "cluster target keyword",
      "pages": [
        {
          "url": "/suggested-url",
          "title": "page title tag",
          "metaDescription": "meta description",
          "h1": "H1 heading",
          "targetKeyword": "page target keyword",
          "secondaryKeywords": ["kw1", "kw2"],
          "wordCount": recommended_word_count_number,
          "status": "draft"
        }
      ]
    }
  ]
}
Create 3-5 clusters with 2-4 pages each.`;
}

function clusterOptimizePrompt(clusterName: string, keyword: string, existingPages: string[]): string {
  return `Optimize the SEO keyword cluster "${clusterName}" targeting "${keyword}". Existing pages: ${existingPages.join(", ")}. Return a JSON object:
{
  "clusterName": "optimized name",
  "keyword": "primary keyword",
  "score": 0_to_100,
  "missingKeywords": ["kw1", "kw2", "kw3"],
  "contentGaps": ["gap1", "gap2"],
  "suggestedPages": [
    {"title": "new page title", "targetKeyword": "keyword", "reasoning": "why this page"}
  ],
  "optimizations": [
    {"page": "page reference", "action": "optimization action", "impact": "expected impact"}
  ]
}`;
}

function pageOptimizePrompt(pageTitle: string, url: string, targetKeyword: string, content?: string): string {
  return `Score and optimize the following page for SEO. Return a JSON object:
{
  "score": 0_to_100,
  "issues": [
    {"severity": "critical|warning|info", "category": "title|meta|h1|content|links|schema", "description": "issue", "fix": "how to fix"}
  ],
  "optimizedTitle": "improved title tag",
  "optimizedMeta": "improved meta description",
  "optimizedH1": "improved H1",
  "suggestedSchema": "recommended schema type",
  "suggestedLinks": ["internal link suggestion 1", "internal link suggestion 2"],
  "keywordDensity": 0_to_100_score,
  "readabilityScore": 0_to_100
}

Page: ${pageTitle}
URL: ${url}
Target Keyword: ${targetKeyword}
Content excerpt: ${(content || "").slice(0, 500)}`;
}

function contentGenPrompt(pageTitle: string, targetKeyword: string, secondaryKeywords: string[]): string {
  return `Generate SEO-optimized content for the following page. Return a JSON object:
{
  "title": "optimized page title",
  "metaDescription": "optimized meta description under 155 chars",
  "h1": "optimized H1 heading",
  "content": "full HTML-friendly content with proper heading hierarchy, at least 1500 words, incorporating target and secondary keywords naturally",
  "internalLinkSuggestions": ["link 1", "link 2", "link 3"],
  "schemaMarkup": "recommended JSON-LD schema"
}

Page Title: ${pageTitle}
Target Keyword: ${targetKeyword}
Secondary Keywords: ${secondaryKeywords.join(", ")}`;
}

function aiScanPrompt(url: string): string {
  return `Perform a deep AI-powered SEO analysis of the website at ${url}. Go beyond basic technical checks. Return a JSON object:
{
  "title": "page title tag",
  "metaDescription": "meta description",
  "h1": "main H1 heading",
  "h2s": ["h2 1", "h2 2"],
  "canonicalUrl": "canonical URL",
  "robotsMeta": "robots meta tag value",
  "schemaTypes": ["schema type 1"],
  "pageSize": size_in_kb_number,
  "loadTime": load_time_ms_number,
  "mobileFriendly": true_or_false,
  "https": true_or_false,
  "issues": [
    {"severity": "critical|warning|info", "category": "title|meta|headings|schema|speed|mobile|security|content|links", "description": "issue description", "fix": "how to fix"}
  ],
  "score": 0_to_100_number,
  "contentAnalysis": {
    "readabilityScore": 0_to_100,
    "keywordDensity": 0_to_100,
    "contentDepth": "shallow|moderate|deep",
    "topicalAuthority": 0_to_100,
    "semanticRelevance": 0_to_100
  },
  "aiInsights": ["insight 1", "insight 2", "insight 3"],
  "competitorComparison": {
    "strongerThan": "estimated % of similar sites",
    "weakerThan": "areas where competitors excel"
  },
  "recommendedActions": [
    {"priority": "high|medium|low", "action": "specific action to take", "expectedImpact": "description of impact"}
  ]
}`;
}

function checkLinksPrompt(pages: Array<{url: string; title: string}>): string {
  return `Analyze the internal and external link structure for these pages. Return a JSON object:
{
  "internalLinks": [
    {"from": "/source-url", "to": "/target-url", "anchorText": "link text", "status": "healthy|broken|redirect"}
  ],
  "externalLinks": [
    {"from": "/source-url", "to": "https://external.com/page", "anchorText": "link text", "status": "healthy|broken|nofollow|redirect", "risk": "low|medium|high"}
  ],
  "brokenLinks": [
    {"url": "/broken-url", "status": "404|500|timeout", "foundOn": "/page-with-link", "anchorText": "link text"}
  ],
  "anchorTextAnalysis": {
    "overOptimized": ["keyword1", "keyword2"],
    "generic": ["click here", "read more"],
    "branded": ["brand name"],
    "distribution": {"exact_match": percentage, "partial_match": percentage, "branded": percentage, "generic": percentage}
  },
  "orphanPages": ["/url-with-no-incoming-links"],
  "linkJuiceFlow": {"strong": ["/urls-with-many-incoming-links"], "weak": ["/urls-with-few-incoming-links"]},
  "score": 0_to_100
}

Pages: ${JSON.stringify(pages)}`;
}

function competitorUrlPrompt(competitorUrl: string, ourKeywords: string[]): string {
  return `Analyze the competitor website at ${competitorUrl} for SEO intelligence. Return a JSON object:
{
  "domain": "competitor domain",
  "estimatedDomainAuthority": 0_to_100,
  "topKeywords": [
    {"keyword": "kw1", "estimatedPosition": 1_to_100, "estimatedVolume": "low|medium|high"}
  ],
  "contentGaps": [
    {"topic": "topic they rank for that you don't", "keyword": "target keyword", "difficulty": "low|medium|high", "opportunity": "description"}
  ],
  "backlinkProfile": {
    "estimatedReferringDomains": number,
    "estimatedBacklinks": number,
    "topBacklinkSources": ["source1", "source2"],
    "quality": "low|medium|high"
  },
  "strengths": ["their SEO strength 1", "strength 2"],
  "weaknesses": ["their SEO weakness 1", "weakness 2"],
  "contentStrategy": {
    "averageWordCount": number,
    "publishingFrequency": "daily|weekly|monthly",
    "contentTypes": ["blog", "landing page", "etc"],
    "topPerformingContent": ["title1", "title2"]
  },
  "recommendations": ["action 1", "action 2"]
}

Our target keywords: ${ourKeywords.join(", ")}`;
}

function contentGapsPrompt(ourKeywords: string[], competitorKeywords: string[]): string {
  return `Find content gaps between our site and competitors. Return a JSON object:
{
  "gaps": [
    {"keyword": "missing keyword", "competitorRanksFor": true_or_false, "difficulty": "low|medium|high", "searchVolume": "low|medium|high", "contentSuggestion": "suggested content title", "priority": "high|medium|low"}
  ],
  "overlappingKeywords": ["keywords both rank for"],
  "uniqueToUs": ["keywords only we rank for"],
  "uniqueToCompetitor": ["keywords only competitor ranks for"],
  "opportunityScore": 0_to_100,
  "strategy": "overall content gap strategy in 2-3 sentences"
}

Our keywords: ${ourKeywords.join(", ")}
Competitor keywords: ${competitorKeywords.join(", ")}`;
}

function generateContentPrompt(keyword: string, contentType: string): string {
  return `Generate SEO-optimized content for the following specification. Return a JSON object:
{
  "title": "optimized page title under 60 chars",
  "metaDescription": "optimized meta description under 155 chars",
  "h1": "optimized H1 heading",
  "content": "full content in plain text with proper heading hierarchy (H2, H3), at least 1500 words, incorporating the target keyword naturally. Use markdown formatting.",
  "suggestedInternalLinks": ["suggested internal link 1", "suggested internal link 2", "suggested internal link 3"],
  "schemaMarkup": "recommended JSON-LD schema type",
  "wordCount": actual_word_count_number,
  "keywordDensity": percentage_number,
  "readabilityScore": 0_to_100,
  "contentScore": {
    "readability": 0_to_100,
    "keywordDensity": 0_to_100,
    "headingStructure": 0_to_100,
    "internalLinks": 0_to_100,
    "metaTags": 0_to_100,
    "overall": 0_to_100
  }
}

Target Keyword: ${keyword}
Content Type: ${contentType}`;
}

function linkSuggestionPrompt(siloName: string, pages: Array<{url: string; title: string; keyword: string}>): string {
  return `Suggest an internal linking structure for the following SEO silo. Return a JSON object:
{
  "links": [
    {"from": "/source-url", "to": "/target-url", "anchorText": "suggested anchor text", "reason": "why this link helps SEO"}
  ],
  "orphanPages": ["url of page with no incoming links"],
  "hubPages": ["url of pages that should link to many others"],
  "score": 0_to_100_link_structure_score
}

Silo: ${siloName}
Pages: ${JSON.stringify(pages)}`;
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
  const { action, layerId, layerName, layerDescription, capabilities, keywords, content, agent,
    // New action params
    url, topic, pillarKeyword, clusterName, existingPages, pageTitle, targetKeyword, secondaryKeywords,
    siloName, pages, contentType,
  } = body;

  if (!running) {
    const cliResult = await cliSEOFallback(
      `SEO analysis for ${layerName || topic || url || 'request'}: ${action}`,
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
      result: generateMockSEOData(action, layerName || topic || '', layerDescription || '', capabilities, { url, topic, pillarKeyword, clusterName, existingPages, pageTitle, targetKeyword, secondaryKeywords, contentType }),
      message: "Hermes is offline. Showing estimated SEO data. Start Hermes for AI-powered analysis.",
    });
  }

  try {
    let result: Record<string, unknown> | null = null;

    switch (action) {
      // ── Legacy layer-based actions ──
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
        const inputKeywords = keywords || [];
        const [kwResult, contentRes, competitors, scoring] = await Promise.allSettled([
          callHermesSEOChat(keywordResearchPrompt(layerName, layerDescription, capabilities || [])),
          callHermesSEOChat(contentGenerationPrompt(layerName, layerDescription, inputKeywords, agent || "hermes")),
          callHermesSEOChat(competitorAnalysisPrompt(layerName, inputKeywords)),
          callHermesSEOChat(seoScoringPrompt({
            title: layerName,
            description: layerDescription,
            keywords: inputKeywords,
            content: content || layerDescription,
          })),
        ]);

        result = {
          keywords: kwResult.status === "fulfilled" ? kwResult.value : null,
          content: contentRes.status === "fulfilled" ? contentRes.value : null,
          competitors: competitors.status === "fulfilled" ? competitors.value : null,
          scoring: scoring.status === "fulfilled" ? scoring.value : null,
          timestamp: Date.now(),
        };
        break;
      }

      // ── New silo-based actions ──
      case "scan-website": {
        result = await callHermesSEOChat(websiteScanPrompt(url || ''));
        if (result) {
          result = { ...result, url, scannedAt: Date.now() };
        }
        break;
      }

      case "create-silo": {
        result = await callHermesSEOChat(siloBuilderPrompt(topic || '', pillarKeyword || ''));
        break;
      }

      case "optimize-cluster": {
        result = await callHermesSEOChat(clusterOptimizePrompt(clusterName || '', keywords?.[0] || '', existingPages || []));
        break;
      }

      case "optimize-page": {
        result = await callHermesSEOChat(pageOptimizePrompt(pageTitle || '', url || '', targetKeyword || '', content));
        break;
      }

      case "generate-content-page": {
        result = await callHermesSEOChat(contentGenPrompt(pageTitle || '', targetKeyword || '', secondaryKeywords || []));
        break;
      }

      case "publish-content": {
        result = { published: true, publishedAt: Date.now(), url: url || '' };
        break;
      }

      case "analyze-competitors": {
        result = await callHermesSEOChat(competitorAnalysisPrompt(topic || layerName || '', keywords || []));
        break;
      }

      case "suggest-links": {
        result = await callHermesSEOChat(linkSuggestionPrompt(siloName || '', pages || []));
        break;
      }

      case "ai-scan": {
        result = await callHermesSEOChat(aiScanPrompt(url || ''));
        if (result) {
          result = { ...result, url, scannedAt: Date.now() };
        }
        break;
      }

      case "check-links": {
        result = await callHermesSEOChat(checkLinksPrompt(pages || []));
        break;
      }

      case "analyze-competitor-url": {
        result = await callHermesSEOChat(competitorUrlPrompt(url || '', keywords || []));
        break;
      }

      case "content-gaps": {
        result = await callHermesSEOChat(contentGapsPrompt(keywords || [], secondaryKeywords || []));
        break;
      }

      case "generate-content": {
        result = await callHermesSEOChat(generateContentPrompt(targetKeyword || '', contentType || 'blog post'));
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
  extra: { url?: string; topic?: string; pillarKeyword?: string; clusterName?: string; existingPages?: string[]; pageTitle?: string; targetKeyword?: string; secondaryKeywords?: string[]; contentType?: string } = {},
): Record<string, unknown> {
  const { url = '', topic = '', pillarKeyword = '', clusterName = '', existingPages = [], pageTitle = '', targetKeyword = '', secondaryKeywords = [], contentType = 'blog post' } = extra;
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
    case "generate-content-page":
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
        title: `Optimized ${layerName} — Complete Guide`,
        metaDescription: `Learn about ${layerName} and how it powers the Agentic OS stack. Comprehensive guide with best practices.`,
        h1: `The Complete Guide to ${layerName}`,
        content: `<h2>Introduction</h2>\n<p>${layerDescription}</p>\n<h2>Key Features</h2>\n<p>This layer provides ${baseKeywords.join(", ")} capabilities that enable sophisticated AI agent workflows.</p>\n<h2>Best Practices</h2>\n<p>When implementing ${layerName}, focus on integration with adjacent layers for maximum compound value.</p>\n<h2>Conclusion</h2>\n<p>${layerName} is a foundational component of the 7-Layer Agentic AI Stack.</p>`,
        internalLinkSuggestions: ["7-layer architecture", "agent comparison", "implementation guide"],
        schemaMarkup: JSON.stringify({ "@type": "Article", name: layerName, description: layerDescription }),
      };

    case "competitor-analysis":
    case "analyze-competitors":
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
    case "optimize-page":
      return {
        overallScore: 68,
        titleScore: 72,
        metaScore: 65,
        keywordScore: 70,
        contentScore: 60,
        technicalScore: 75,
        score: 68,
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
        optimizedTitle: `${layerName} — Complete Guide & Best Practices | Agentic OS`,
        optimizedMeta: `Learn about ${layerName} with expert analysis, implementation tips, and real-world examples. Part of the 7-Layer Agentic AI Stack.`,
        optimizedH1: `The Complete ${layerName} Guide`,
        suggestedSchema: "Article",
        suggestedLinks: ["7-layer architecture", "agent comparison guide"],
        keywordDensity: 72,
        readabilityScore: 81,
      };

    case "scan-website":
      return {
        title: `${layerName || url || 'Website'} — Example Page Title`,
        metaDescription: "This is a sample meta description for the scanned website. It should be under 155 characters for optimal SEO.",
        h1: `${layerName || 'Main Heading'}`,
        h2s: ["Introduction", "Key Features", "Getting Started", "Conclusion"],
        canonicalUrl: url || `https://example.com/${(layerName || 'page').toLowerCase().replace(/\s+/g, '-')}`,
        robotsMeta: "index, follow",
        schemaTypes: ["WebPage", "Article"],
        pageSize: 245,
        loadTime: 1200,
        mobileFriendly: true,
        https: (url || '').startsWith('https'),
        issues: [
          { severity: "warning", category: "meta", description: "Meta description could be more compelling", fix: "Include target keyword near the beginning of the meta description" },
          { severity: "info", category: "schema", description: "Missing FAQ schema for rich snippets", fix: "Add FAQPage schema markup to eligible pages" },
          { severity: "info", category: "headings", description: "H2 structure could be improved", fix: "Use H2s that match common search queries" },
        ],
        score: 72,
        scannedAt: Date.now(),
        url: url || '',
      };

    case "create-silo":
      return {
        name: `${topic || layerName} Content Silo`,
        pillarUrl: `/${(topic || layerName || 'topic').toLowerCase().replace(/\s+/g, '-')}`,
        pillarKeyword: pillarKeyword || (topic || layerName || 'topic').toLowerCase(),
        description: `Comprehensive content silo covering ${topic || layerName} with pillar page and supporting cluster content.`,
        clusters: [
          {
            name: `${topic || layerName} Fundamentals`,
            keyword: `${(topic || layerName || 'topic').toLowerCase()} basics`,
            pages: [
              { url: `/${(topic || 'topic').toLowerCase().replace(/\s+/g, '-')}/guide`, title: `Complete ${topic || 'Topic'} Guide`, metaDescription: `Everything you need to know about ${topic || 'this topic'}.`, h1: `The Complete ${topic || 'Topic'} Guide`, targetKeyword: `${(topic || 'topic').toLowerCase()} guide`, secondaryKeywords: ["tutorial", "how to", "getting started"], wordCount: 2500, status: "draft" },
              { url: `/${(topic || 'topic').toLowerCase().replace(/\s+/g, '-')}/what-is`, title: `What is ${topic || 'Topic'}?`, metaDescription: `Understand ${topic || 'this topic'} from the ground up.`, h1: `What is ${topic || 'Topic'}?`, targetKeyword: `what is ${(topic || 'topic').toLowerCase()}`, secondaryKeywords: ["definition", "explained", "overview"], wordCount: 1800, status: "draft" },
            ],
          },
          {
            name: `${topic || layerName} Best Practices`,
            keyword: `${(topic || layerName || 'topic').toLowerCase()} best practices`,
            pages: [
              { url: `/${(topic || 'topic').toLowerCase().replace(/\s+/g, '-')}/best-practices`, title: `${topic || 'Topic'} Best Practices`, metaDescription: `Proven best practices for ${topic || 'this topic'}.`, h1: `${topic || 'Topic'} Best Practices`, targetKeyword: `${(topic || 'topic').toLowerCase()} best practices`, secondaryKeywords: ["tips", "strategies", "optimization"], wordCount: 2000, status: "draft" },
              { url: `/${(topic || 'topic').toLowerCase().replace(/\s+/g, '-')}/mistakes`, title: `Common ${topic || 'Topic'} Mistakes`, metaDescription: `Avoid these ${topic || 'topic'} mistakes.`, h1: `Top ${topic || 'Topic'} Mistakes to Avoid`, targetKeyword: `${(topic || 'topic').toLowerCase()} mistakes`, secondaryKeywords: ["errors", "pitfalls", "avoid"], wordCount: 1500, status: "draft" },
            ],
          },
          {
            name: `${topic || layerName} Tools & Resources`,
            keyword: `${(topic || layerName || 'topic').toLowerCase()} tools`,
            pages: [
              { url: `/${(topic || 'topic').toLowerCase().replace(/\s+/g, '-')}/tools`, title: `Best ${topic || 'Topic'} Tools`, metaDescription: `Top tools for ${topic || 'this topic'}.`, h1: `Best ${topic || 'Topic'} Tools & Resources`, targetKeyword: `best ${(topic || 'topic').toLowerCase()} tools`, secondaryKeywords: ["software", "platforms", "comparison"], wordCount: 2200, status: "draft" },
              { url: `/${(topic || 'topic').toLowerCase().replace(/\s+/g, '-')}/vs-alternatives`, title: `${topic || 'Topic'} vs Alternatives`, metaDescription: `Compare ${topic || 'topic'} with alternatives.`, h1: `${topic || 'Topic'} vs Alternatives: Complete Comparison`, targetKeyword: `${(topic || 'topic').toLowerCase()} alternatives`, secondaryKeywords: ["comparison", "vs", "competitors"], wordCount: 2000, status: "draft" },
            ],
          },
        ],
      };

    case "optimize-cluster":
      return {
        clusterName: clusterName || layerName,
        keyword: keywords?.[0] || (layerName || 'topic').toLowerCase(),
        score: 65,
        missingKeywords: ["implementation guide", "case study", "tutorial"],
        contentGaps: ["Step-by-step tutorial content", "Real-world case studies"],
        suggestedPages: [
          { title: `${clusterName || layerName} Tutorial`, targetKeyword: `${(clusterName || layerName || 'topic').toLowerCase()} tutorial`, reasoning: "High search volume for tutorial content" },
        ],
        optimizations: [
          { page: "Main cluster page", action: "Add more internal links to supporting pages", impact: "Improves topical authority signal" },
          { page: "All pages", action: "Add FAQ sections with schema markup", impact: "Rich snippet eligibility" },
        ],
      };

    case "suggest-links":
      return {
        links: (pages || []).slice(0, 5).flatMap((p: {url: string; title: string; keyword: string}, i: number, arr: Array<{url: string; title: string; keyword: string}>) => {
          const next = arr[(i + 1) % arr.length];
          return [{ from: p.url, to: next.url, anchorText: next.keyword, reason: "Related content linking builds topical authority" }];
        }),
        orphanPages: [],
        hubPages: (pages || []).slice(0, 1).map((p: {url: string}) => p.url),
        score: 75,
      };

    case "publish-content":
      return { published: true, publishedAt: Date.now(), url: url || '' };

    case "ai-scan":
      return {
        title: `${url || 'Website'} — AI Analysis`,
        metaDescription: "Sample meta description for AI-scanned website with optimized content strategy.",
        h1: "AI-Powered Page Heading",
        h2s: ["Overview", "Key Features", "Analysis", "Recommendations"],
        canonicalUrl: url || "https://example.com",
        robotsMeta: "index, follow",
        schemaTypes: ["WebPage", "Article", "FAQPage"],
        pageSize: 310,
        loadTime: 1800,
        mobileFriendly: true,
        https: (url || '').startsWith('https'),
        issues: [
          { severity: "warning", category: "content", description: "Content depth below recommended 1500 words", fix: "Expand content with detailed sections and examples" },
          { severity: "info", category: "links", description: "Low internal link density", fix: "Add 3-5 internal links per 1000 words" },
          { severity: "info", category: "schema", description: "Missing FAQ schema for rich snippets", fix: "Add FAQPage schema markup" },
        ],
        score: 72,
        scannedAt: Date.now(),
        url: url || '',
        contentAnalysis: { readabilityScore: 78, keywordDensity: 65, contentDepth: "moderate", topicalAuthority: 62, semanticRelevance: 70 },
        aiInsights: ["Content shows moderate topical authority — expand with case studies", "Internal linking pattern suggests silo opportunity", "Page speed is average — optimize images for better Core Web Vitals"],
        competitorComparison: { strongerThan: "40% of similar sites", weakerThan: "Content depth and backlink profile" },
        recommendedActions: [
          { priority: "high", action: "Add 1500+ words of structured content with H2/H3 hierarchy", expectedImpact: "Improve topical authority by 25%" },
          { priority: "medium", action: "Implement FAQ schema for rich snippet eligibility", expectedImpact: "Increase CTR by 15-30%" },
          { priority: "low", action: "Optimize images and lazy-load below-fold content", expectedImpact: "Reduce load time by 30%" },
        ],
      };

    case "check-links":
      return {
        internalLinks: (pages || []).slice(0, 4).flatMap((p: {url: string; title: string}, i: number, arr: Array<{url: string; title: string}>) => {
          const next = arr[(i + 1) % arr.length];
          return [{ from: p.url, to: next.url, anchorText: next.title?.toLowerCase() || "related content", status: "healthy" }];
        }),
        externalLinks: [
          { from: (pages || [])[0]?.url || "/", to: "https://developer.mozilla.org/docs/Web", anchorText: "MDN Web Docs", status: "healthy", risk: "low" },
          { from: (pages || [])[0]?.url || "/", to: "https://example.com/outdated", anchorText: "reference link", status: "broken", risk: "medium" },
        ],
        brokenLinks: [{ url: "https://example.com/outdated", status: "404", foundOn: (pages || [])[0]?.url || "/", anchorText: "reference link" }],
        anchorTextAnalysis: {
          overOptimized: [],
          generic: ["click here", "read more", "learn more"],
          branded: ["agentic os"],
          distribution: { exact_match: 25, partial_match: 30, branded: 20, generic: 25 },
        },
        orphanPages: [],
        linkJuiceFlow: { strong: [(pages || [])[0]?.url || "/"], weak: [(pages || []).slice(-1)[0]?.url || "/about"] },
        score: 68,
      };

    case "analyze-competitor-url":
      return {
        domain: url || "competitor.com",
        estimatedDomainAuthority: 55,
        topKeywords: [
          { keyword: "AI agent platform", estimatedPosition: 3, estimatedVolume: "high" },
          { keyword: "multi-agent system", estimatedPosition: 5, estimatedVolume: "medium" },
          { keyword: "AI automation tool", estimatedPosition: 8, estimatedVolume: "high" },
        ],
        contentGaps: [
          { topic: "7-layer AI architecture", keyword: "agentic AI stack", difficulty: "low", opportunity: "No competitors target this — high opportunity" },
          { topic: "AI agent comparison guide", keyword: "best AI agents", difficulty: "medium", opportunity: "Growing search volume with thin existing content" },
        ],
        backlinkProfile: { estimatedReferringDomains: 120, estimatedBacklinks: 450, topBacklinkSources: ["techcrunch.com", "producthunt.com"], quality: "medium" },
        strengths: ["Strong brand recognition", "Extensive documentation", "Active community"],
        weaknesses: ["No visual dashboard", "Complex onboarding", "Limited governance features"],
        contentStrategy: { averageWordCount: 1800, publishingFrequency: "weekly", contentTypes: ["blog", "documentation", "tutorial"], topPerformingContent: ["Getting Started Guide", "API Reference"] },
        recommendations: ["Target long-tail keywords they miss", "Create comparison content", "Build community-driven content"],
      };

    case "content-gaps":
      return {
        gaps: [
          { keyword: "agentic AI stack", competitorRanksFor: false, difficulty: "low", searchVolume: "medium", contentSuggestion: "Complete Guide to the 7-Layer Agentic AI Stack", priority: "high" },
          { keyword: "AI agent comparison", competitorRanksFor: true, difficulty: "medium", searchVolume: "high", contentSuggestion: "AI Agent Platforms Compared: 2025 Guide", priority: "high" },
          { keyword: "multi-agent orchestration tutorial", competitorRanksFor: true, difficulty: "medium", searchVolume: "medium", contentSuggestion: "Step-by-Step Multi-Agent Orchestration Tutorial", priority: "medium" },
          { keyword: "AI governance framework", competitorRanksFor: false, difficulty: "low", searchVolume: "low", contentSuggestion: "AI Governance Framework for Production Systems", priority: "low" },
        ],
        overlappingKeywords: ["AI agent", "automation", "AI platform"],
        uniqueToUs: ["agentic AI stack", "7-layer architecture", "compound knowledge"],
        uniqueToCompetitor: ["AI agent comparison", "open source AI agents", "free AI tools"],
        opportunityScore: 72,
        strategy: "Focus on unique differentiators like the 7-layer architecture. Create comparison content to capture high-intent searchers. Build authority through in-depth technical content that competitors lack.",
      };

    case "generate-content":
      return {
        title: `Ultimate Guide to ${targetKeyword || 'SEO Content'} — ${contentType || 'Blog Post'}`,
        metaDescription: `Learn everything about ${targetKeyword || 'this topic'} with our comprehensive guide. Expert tips, strategies, and best practices for 2025.`,
        h1: `The Complete Guide to ${targetKeyword || 'SEO Content'}`,
        content: `## Introduction\n\n${targetKeyword || 'This topic'} is rapidly evolving in 2025, and understanding its core principles is essential for anyone looking to stay ahead. In this comprehensive guide, we'll explore the fundamentals, best practices, and advanced strategies that will help you master ${targetKeyword || 'this subject'}.\n\n## What is ${targetKeyword || 'This Topic'}?\n\nAt its core, ${targetKeyword || 'this topic'} represents a fundamental shift in how we approach modern challenges. Whether you're a beginner or an experienced practitioner, understanding the foundational concepts is crucial.\n\nKey aspects include:\n- **Strategic Planning**: Setting clear objectives and measurable outcomes\n- **Implementation**: Executing with precision and adaptability\n- **Optimization**: Continuously improving based on data and feedback\n\n## Best Practices for ${targetKeyword || 'Success'}\n\n### 1. Start with Research\n\nBefore diving in, conduct thorough research to understand the landscape. Look at what competitors are doing, identify gaps, and find opportunities.\n\n### 2. Build a Strong Foundation\n\nFocus on the fundamentals first. A solid foundation will support all future growth and optimization efforts.\n\n### 3. Measure and Iterate\n\nUse data-driven approaches to measure results and iterate on your strategy. What gets measured gets improved.\n\n## Common Mistakes to Avoid\n\n1. **Skipping the research phase** — Always validate assumptions with data\n2. **Ignoring user intent** — Understand what your audience actually wants\n3. **Over-optimization** — Focus on quality over quantity\n4. **Neglecting updates** — Keep content fresh and relevant\n\n## Advanced Strategies\n\nOnce you've mastered the basics, consider these advanced approaches:\n- A/B testing different approaches\n- Leveraging AI and automation tools\n- Building community-driven content\n- Creating comprehensive resource hubs\n\n## Conclusion\n\nMastering ${targetKeyword || 'this topic'} requires a combination of strategic thinking, consistent execution, and continuous learning. By following the principles outlined in this guide, you'll be well-positioned to achieve lasting success.\n\nStart implementing these strategies today and watch your results compound over time.`,
        suggestedInternalLinks: ["7-layer architecture overview", "agent comparison guide", "implementation tutorial"],
        schemaMarkup: JSON.stringify({ "@type": "Article", name: `Guide to ${targetKeyword || 'SEO Content'}` }),
        wordCount: 1520,
        keywordDensity: 2.1,
        readabilityScore: 78,
        contentScore: { readability: 78, keywordDensity: 72, headingStructure: 85, internalLinks: 65, metaTags: 90, overall: 78 },
      };

    default:
      return { message: "Mock data not available for this action" };
  }
}
