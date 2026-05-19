import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchDuckDuckGoAPI(query: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "GeminiDesktop/1.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const results: SearchResult[] = [];

  if (data.AbstractURL && data.Abstract) {
    results.push({
      title: data.Heading || "Result",
      url: data.AbstractURL,
      snippet: data.Abstract,
    });
  }

  if (Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics) {
      if (topic && typeof topic === "object") {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.replace(/ - .*$/, "").trim(),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        } else if (Array.isArray(topic.Topics)) {
          for (const subtopic of topic.Topics) {
            if (subtopic.Text && subtopic.FirstURL) {
              results.push({
                title: subtopic.Text.replace(/ - .*$/, "").trim(),
                url: subtopic.FirstURL,
                snippet: subtopic.Text,
              });
            }
          }
        }
      }
    }
  }

  return results;
}

async function searchDuckDuckGoHTML(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  });

  if (!res.ok) return [];

  const html = await res.text();
  const results: SearchResult[] = [];

  const blockRegex = /class="result__body"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1];
    const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

    if (linkMatch) {
      const rawUrl = linkMatch[1];
      const title = linkMatch[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").trim();
      let snippet = "";
      if (snippetMatch) {
        snippet = snippetMatch[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").trim();
      }

      let decodedUrl = rawUrl;
      const uddgMatch = rawUrl.match(/uddg=([^&\]]*)/);
      if (uddgMatch) {
        try {
          decodedUrl = decodeURIComponent(uddgMatch[1]);
        } catch {
          decodedUrl = rawUrl;
        }
      }

      if (title && decodedUrl && decodedUrl.startsWith("http")) {
        results.push({ title, url: decodedUrl, snippet });
      }
    }
    if (results.length >= 10) break;
  }

  return results;
}

async function searchSearXNG(query: string): Promise<SearchResult[]> {
  const instances = [
    "https://searx.be",
    "https://search.sapti.me",
    "https://searx.tiekoetter.com",
  ];

  for (const instance of instances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "GeminiDesktop/1.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const results: SearchResult[] = [];

      if (Array.isArray(data.results)) {
        for (const r of data.results) {
          if (r.title && r.url) {
            results.push({
              title: r.title,
              url: r.url,
              snippet: r.content || r.snippet || "",
            });
          }
        }
      }

      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query?.trim();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query string is required" }, { status: 400 });
    }

    let results: SearchResult[] = [];
    let source = "";

    results = await searchDuckDuckGoAPI(query);
    if (results.length > 0) {
      source = "duckduckgo-api";
    } else {
      results = await searchDuckDuckGoHTML(query);
      if (results.length > 0) {
        source = "duckduckgo-html";
      }
    }

    if (results.length === 0) {
      results = await searchSearXNG(query);
      if (results.length > 0) {
        source = "searxng";
      }
    }

    return NextResponse.json({
      results: results.slice(0, 10),
      source: source || "none",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
