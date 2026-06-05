import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    let { baseUrl, apiKey } = await req.json();
    baseUrl = baseUrl?.trim();
    apiKey = apiKey?.trim();

    if (!baseUrl || !apiKey) {
      return NextResponse.json({ error: "Base URL and API Key are required" }, { status: 400 });
    }

    // Try standard OpenAI-compatible /models endpoint
    const url = baseUrl.endsWith("/") ? `${baseUrl}models` : `${baseUrl}/models`;
    
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Provider error: ${res.status} ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    
    // Standard OpenAI response is { data: [{ id: "model-name", ... }] }
    let models: any[] = [];
    if (data.data && Array.isArray(data.data)) {
      models = data.data.map((m: any) => ({
        id: m.id,
        name: m.id,
        description: m.owned_by || `Model from ${new URL(baseUrl).hostname}`
      }));
    } else if (Array.isArray(data)) {
      // Some providers return a flat array
      models = data.map((m: any) => ({
        id: typeof m === 'string' ? m : m.id || m.name,
        name: typeof m === 'string' ? m : m.name || m.id,
        description: `Model from ${new URL(baseUrl).hostname}`
      }));
    }

    return NextResponse.json(models);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
