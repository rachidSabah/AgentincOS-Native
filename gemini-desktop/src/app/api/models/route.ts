import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const FALLBACK_MODELS: Record<string, { id: string; name: string; description: string }[]> = {
  bigmodel: [
    { id: "glm-4", name: "GLM-4", description: "Zhipu's flagship high-performance model" },
    { id: "glm-4-flash", name: "GLM-4 Flash", description: "Fast, lightweight and cost-effective" },
    { id: "glm-4-air", name: "GLM-4 Air", description: "Balanced performance and speed" },
  ],
  proxima: [
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (Proxima)", description: "Anthropic's state-of-the-art model via Proxima" },
    { id: "gpt-4o", name: "GPT-4o (Proxima)", description: "OpenAI's flagship model via Proxima" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Proxima)", description: "Google's smart model via Proxima" },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek Chat (V3)", description: "Highly capable conversational model" },
    { id: "deepseek-coder", name: "DeepSeek Coder", description: "Advanced code generation and reasoning" },
  ],
  openrouter: [
    { id: "google/gemini-2.0-flash-thinking-exp:free", name: "Gemini 2.0 Flash Thinking (Free)", description: "Google's reasoning model via OpenRouter" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3", description: "DeepSeek Chat via OpenRouter" },
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", description: "Meta's powerful open model via OpenRouter" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", description: "Meta's extremely capable model on Groq" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "High quality MoE model on Groq" },
  ],
};

export async function GET() {
  try {
    const providers = await db.provider.findMany({
      where: { isActive: true },
    });

    const results: any[] = [];

    for (const provider of providers) {
      // Normalize provider name for ID use
      const providerSlug = provider.name.toLowerCase().replace(/\s+/g, "-");

      let models: { id: string; name: string; description: string }[] = [];
      let success = false;

      // Only attempt live fetch if baseUrl is configured and apiKey is set/not blank
      if (provider.baseUrl && provider.apiKey && provider.apiKey !== "none") {
        // Try multiple potential endpoints
        const base = provider.baseUrl.replace(/\/$/, "");
        const endpoints = [
          `${base}/models`,
          `${base}/v1/models`
        ];

        for (const url of endpoints) {
          if (success) break;

          try {
            const res = await fetch(url, {
              headers: {
                "Authorization": `Bearer ${provider.apiKey}`,
                "Content-Type": "application/json",
              },
              cache: "no-store"
            });

            if (res.ok) {
              const data = await res.json();
              
              let fetchedModels: any[] = [];
              if (data.data && Array.isArray(data.data)) {
                fetchedModels = data.data;
              } else if (Array.isArray(data)) {
                fetchedModels = data;
              }

              if (fetchedModels.length > 0) {
                models = fetchedModels.map((m: any) => {
                  const modelId = typeof m === 'string' ? m : m.id || m.name;
                  const modelName = typeof m === 'string' ? m : m.name || m.id;
                  return {
                    id: `${providerSlug}/${modelId}`,
                    name: modelName,
                    description: m.description || m.owned_by || `Model from ${provider.name}`
                  };
                });
                success = true;
              }
            }
          } catch (err) {
            console.error(`Error fetching from ${url}:`, err);
          }
        }
      }

      // If live fetch failed, is offline, or was skipped (e.g. key is placeholder), use fallback models
      if (models.length === 0) {
        const fallbacks = FALLBACK_MODELS[providerSlug];
        if (fallbacks) {
          models = fallbacks.map(m => ({
            id: `${providerSlug}/${m.id}`,
            name: m.name,
            description: m.description
          }));
          success = true;
        }
      }

      if (success && models.length > 0) {
        results.push({
          name: provider.name,
          models: models
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
