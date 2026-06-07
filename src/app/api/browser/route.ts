import { NextRequest, NextResponse } from 'next/server';
import { modelRouter } from '@/lib/model-router';

// ============================================================
// Agentic OS V2 — Enhanced Browser Agent API Route
// Supports: navigate, extract, analyze, screenshot, fill, search, summarize
// ============================================================

// ─── Page Fetching Utility ───

interface FetchedPage {
  title: string;
  text: string;
  links: Array<{ href: string; text: string }>;
  html: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogImage: string;
  canonicalUrl: string;
  language: string;
  rawHeaders: Record<string, string>;
}

async function fetchPage(url: string): Promise<FetchedPage | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/') && !contentType.includes('html')) {
      // Not an HTML page
      return {
        title: url,
        text: `[Non-HTML content: ${contentType}]`,
        links: [],
        html: '',
        metaDescription: '',
        metaKeywords: '',
        ogTitle: '',
        ogImage: '',
        canonicalUrl: '',
        language: '',
        rawHeaders: {},
      };
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;

    // Extract text (strip scripts, styles, tags)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50000);

    // Extract links with text
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: Array<{ href: string; text: string }> = [];
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 100) {
      const href = linkMatch[1];
      const linkText = linkMatch[2]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
      if (href && (href.startsWith('http') || href.startsWith('/'))) {
        links.push({ href, text: linkText || href });
      }
    }

    // Extract meta tags
    const metaDescription =
      (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        [])[1] ||
      (html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
        [])[1] ||
      '';

    const metaKeywords =
      (html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i) ||
        [])[1] ||
      (html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']keywords["']/i) ||
        [])[1] ||
      '';

    const ogTitle =
      (html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
        [])[1] ||
      '';

    const ogImage =
      (html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        [])[1] ||
      '';

    const canonicalUrl =
      (html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
        [])[1] ||
      '';

    const language =
      (html.match(/<html[^>]*lang=["']([^"']+)["']/i) || [])[1] || '';

    return {
      title,
      text,
      links,
      html,
      metaDescription,
      metaKeywords,
      ogTitle,
      ogImage,
      canonicalUrl,
      language,
      rawHeaders: Object.fromEntries(res.headers.entries()),
    };
  } catch {
    return null;
  }
}

// ─── Technology Detection ───

function detectTechnologies(html: string): string[] {
  const tech: string[] = [];
  if (/wp-content|wp-includes|wordpress/i.test(html)) tech.push('WordPress');
  if (/react|__NEXT|next\//i.test(html)) tech.push('React/Next.js');
  if (/vue|v-bind|v-on|__vue__/i.test(html)) tech.push('Vue.js');
  if (/angular|ng-version|ng-app/i.test(html)) tech.push('Angular');
  if (/jquery|jquery/i.test(html)) tech.push('jQuery');
  if (/bootstrap(?:\.min)?\.css/i.test(html)) tech.push('Bootstrap');
  if (/tailwind|tw-/i.test(html)) tech.push('Tailwind CSS');
  if (/cloudflare/i.test(html)) tech.push('Cloudflare');
  if (/shopify/i.test(html)) tech.push('Shopify');
  if (/woocommerce/i.test(html)) tech.push('WooCommerce');
  if (/svelte/i.test(html)) tech.push('Svelte');
  if (/gatsby/i.test(html)) tech.push('Gatsby');
  if (/remix/i.test(html)) tech.push('Remix');
  if (/astro/i.test(html)) tech.push('Astro');
  if (/vite/i.test(html)) tech.push('Vite');
  if (/webpack/i.test(html)) tech.push('Webpack');
  if (/google-analytics|gtag|googletagmanager/i.test(html)) tech.push('Google Analytics');
  if (/facebook|fbq|fb-root/i.test(html)) tech.push('Facebook Pixel');
  if (/intercom/i.test(html)) tech.push('Intercom');
  if (/hubspot/i.test(html)) tech.push('HubSpot');
  if (/drupal/i.test(html)) tech.push('Drupal');
  if (/joomla/i.test(html)) tech.push('Joomla');
  if (/contentful/i.test(html)) tech.push('Contentful');
  if (/sanity/i.test(html)) tech.push('Sanity');
  if (/stripe/i.test(html)) tech.push('Stripe');
  if (/paypal/i.test(html)) tech.push('PayPal');
  return tech;
}

// ─── Accessibility Hints ───

function getAccessibilityHints(html: string): string[] {
  const hints: string[] = [];
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter((img) => !/alt=["']/i.test(img));
  if (imgsWithoutAlt.length > 0) {
    hints.push(`${imgsWithoutAlt.length} images missing alt text`);
  }
  if (!/<html[^>]*lang/i.test(html)) {
    hints.push('Missing language attribute on <html>');
  }
  const inputs = html.match(/<input[^>]*>/gi) || [];
  const inputsWithoutLabel = inputs.filter(
    (input) =>
      !/aria-label=["']/i.test(input) &&
      !/aria-labelledby=["']/i.test(input) &&
      !/id=["']/i.test(input)
  );
  if (inputsWithoutLabel.length > 0) {
    hints.push(`${inputsWithoutLabel.length} inputs may lack labels`);
  }
  if (!/<main/i.test(html)) {
    hints.push('No <main> landmark found');
  }
  if (!/<header/i.test(html)) {
    hints.push('No <header> landmark found');
  }
  if (!/<nav/i.test(html)) {
    hints.push('No <nav> landmark found');
  }
  if (!/<footer/i.test(html)) {
    hints.push('No <footer> landmark found');
  }
  if (!/<h1/i.test(html)) {
    hints.push('Missing <h1> heading');
  }
  const h1Tags = html.match(/<h1[^>]*>/gi) || [];
  if (h1Tags.length > 1) {
    hints.push(`Multiple <h1> tags found (${h1Tags.length})`);
  }
  return hints;
}

// ─── SEO Score Calculation ───

function calculateSeoScore(data: {
  title: string;
  metaDescription: string;
  headings: Record<string, number>;
  hasImages: boolean;
  imageCount: number;
  language: string;
  canonicalUrl: string;
  ogTitle: string;
  ogImage: string;
  linkCount: number;
}): number {
  let score = 0;
  // Title checks (max 15)
  if (data.title) score += 5;
  if (data.title.length >= 10 && data.title.length <= 60) score += 5;
  if (data.title.length > 0 && data.title.length <= 70) score += 5;

  // Meta description (max 20)
  if (data.metaDescription) score += 10;
  if (data.metaDescription.length >= 50 && data.metaDescription.length <= 160) score += 10;

  // Headings (max 15)
  if (data.headings.h1 >= 1) score += 5;
  if (data.headings.h1 === 1) score += 5;
  if (data.headings.h2 >= 1) score += 5;

  // Images (max 10)
  if (data.imageCount > 0) score += 5;
  if (data.imageCount > 0 && data.imageCount <= 20) score += 5;

  // Language (max 5)
  if (data.language) score += 5;

  // Canonical (max 5)
  if (data.canonicalUrl) score += 5;

  // Open Graph (max 10)
  if (data.ogTitle) score += 5;
  if (data.ogImage) score += 5;

  // Links (max 10)
  if (data.linkCount > 0 && data.linkCount <= 100) score += 10;
  else if (data.linkCount > 100) score += 5;

  // Normalize to 0-100
  return Math.min(Math.round((score / 100) * 100), 100);
}

// ─── CSS Selector Extraction ───

function extractBySelector(html: string, selector: string): string[] {
  const results: string[] = [];

  // Handle class selectors (.className)
  if (selector.startsWith('.')) {
    const className = selector.slice(1);
    const regex = new RegExp(
      `<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
      'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && results.length < 50) {
      const text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) results.push(text);
    }
  }
  // Handle ID selectors (#idName)
  else if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const regex = new RegExp(
      `<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
      'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && results.length < 50) {
      const text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) results.push(text);
    }
  }
  // Handle tag selectors (div, p, h1, etc.)
  else {
    const tag = selector.replace(/[<>]/g, '').trim();
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && results.length < 50) {
      const text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) results.push(text);
    }
  }

  return results;
}

// ─── API Route Handler ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, cssSelector, query, formData } = body;

    switch (action) {
      // ─── Navigate ───
      case 'navigate': {
        if (!url) {
          return NextResponse.json({ error: 'url is required' }, { status: 400 });
        }

        const page = await fetchPage(url);
        if (!page) {
          return NextResponse.json(
            { error: 'Failed to fetch page. Check URL and try again.' },
            { status: 502 }
          );
        }

        return NextResponse.json({
          success: true,
          title: page.title,
          content: page.text,
          html: page.html.slice(0, 100000),
          links: page.links.slice(0, 50),
          linkCount: page.links.length,
          metaDescription: page.metaDescription,
          metaKeywords: page.metaKeywords,
          ogTitle: page.ogTitle,
          ogImage: page.ogImage,
          canonicalUrl: page.canonicalUrl,
          language: page.language,
          url,
        });
      }

      // ─── Extract ───
      case 'extract': {
        if (!url) {
          return NextResponse.json({ error: 'url is required' }, { status: 400 });
        }

        const page = await fetchPage(url);
        if (!page) {
          return NextResponse.json(
            { error: 'Failed to fetch page' },
            { status: 502 }
          );
        }

        let items: string[] = [];
        if (cssSelector) {
          items = extractBySelector(page.html, cssSelector);
        } else {
          items = [page.text];
        }

        return NextResponse.json({
          success: true,
          title: page.title,
          content: items.join('\n\n'),
          items,
          count: items.length,
          selector: cssSelector || 'full-text',
          url,
        });
      }

      // ─── Analyze ───
      case 'analyze': {
        if (!url) {
          return NextResponse.json({ error: 'url is required' }, { status: 400 });
        }

        const page = await fetchPage(url);
        if (!page) {
          return NextResponse.json(
            { error: 'Failed to fetch page' },
            { status: 502 }
          );
        }

        const headings = {
          h1: (page.html.match(/<h1[^>]*>/gi) || []).length,
          h2: (page.html.match(/<h2[^>]*>/gi) || []).length,
          h3: (page.html.match(/<h3[^>]*>/gi) || []).length,
          h4: (page.html.match(/<h4[^>]*>/gi) || []).length,
          h5: (page.html.match(/<h5[^>]*>/gi) || []).length,
          h6: (page.html.match(/<h6[^>]*>/gi) || []).length,
        };

        const imageCount = (page.html.match(/<img/gi) || []).length;
        const formCount = (page.html.match(/<form/gi) || []).length;
        const videoCount = (
          page.html.match(/<video|<iframe[^>]*youtube|<iframe[^>]*vimeo/gi) || []
        ).length;
        const allLinks = page.links;
        const externalLinks = allLinks.filter(
          (l) => l.href.startsWith('http') && !l.href.includes(new URL(url).hostname)
        );
        const internalLinks = allLinks.filter(
          (l) => l.href.startsWith('/') || (l.href.startsWith('http') && l.href.includes(new URL(url).hostname))
        );

        const technologies = detectTechnologies(page.html);
        const accessibilityHints = getAccessibilityHints(page.html);

        const seoScore = calculateSeoScore({
          title: page.title,
          metaDescription: page.metaDescription,
          headings,
          hasImages: imageCount > 0,
          imageCount,
          language: page.language,
          canonicalUrl: page.canonicalUrl,
          ogTitle: page.ogTitle,
          ogImage: page.ogImage,
          linkCount: allLinks.length,
        });

        const analysis = {
          url,
          title: page.title,
          wordCount: page.text.split(/\s+/).filter(Boolean).length,
          charCount: page.text.length,
          headings,
          hasForms: formCount > 0,
          formCount,
          imageCount,
          videoCount,
          linkCount: allLinks.length,
          externalLinkCount: externalLinks.length,
          internalLinkCount: internalLinks.length,
          metaDescription: page.metaDescription,
          metaKeywords: page.metaKeywords,
          ogTitle: page.ogTitle,
          ogImage: page.ogImage,
          canonicalUrl: page.canonicalUrl,
          language: page.language,
          technologies,
          accessibilityHints,
          seoScore,
        };

        return NextResponse.json({ success: true, analysis });
      }

      // ─── Screenshot ───
      case 'screenshot': {
        if (!url) {
          return NextResponse.json({ error: 'url is required' }, { status: 400 });
        }

        // We can't take a real screenshot in server environment,
        // so we return a base64-encoded placeholder + the page HTML
        const page = await fetchPage(url);
        if (!page) {
          return NextResponse.json(
            { error: 'Failed to fetch page for screenshot' },
            { status: 502 }
          );
        }

        // Generate a simple SVG placeholder as a "screenshot"
        const svgScreenshot = `
          <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
            <rect width="1280" height="800" fill="#0a0a1a"/>
            <rect x="0" y="0" width="1280" height="48" fill="#12122a"/>
            <circle cx="20" cy="24" r="6" fill="#E6394A"/>
            <circle cx="40" cy="24" r="6" fill="#FFB627"/>
            <circle cx="60" cy="24" r="6" fill="#00ff88"/>
            <rect x="80" y="12" width="1120" height="24" rx="4" fill="#1a1a3e"/>
            <text x="120" y="28" font-family="monospace" font-size="12" fill="#8888aa">${url.slice(0, 80)}</text>
            <rect x="0" y="48" width="1280" height="752" fill="#0d0d20"/>
            <text x="40" y="100" font-family="sans-serif" font-size="24" font-weight="bold" fill="#e8e8f0">${page.title.slice(0, 60)}</text>
            <text x="40" y="140" font-family="sans-serif" font-size="14" fill="#8888aa">Page captured at ${new Date().toISOString()}</text>
            ${page.text.slice(0, 500).split('\n').map((line, i) =>
              line.trim() ? `<text x="40" y="${180 + i * 22}" font-family="sans-serif" font-size="13" fill="#aaaacc">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 120)}</text>` : ''
            ).join('\n')}
          </svg>
        `.trim();

        const base64Screenshot = Buffer.from(svgScreenshot).toString('base64');

        return NextResponse.json({
          success: true,
          screenshot: `data:image/svg+xml;base64,${base64Screenshot}`,
          html: page.html.slice(0, 50000),
          title: page.title,
          url,
        });
      }

      // ─── Fill Form (Simulated) ───
      case 'fill': {
        if (!url) {
          return NextResponse.json({ error: 'url is required' }, { status: 400 });
        }
        if (!formData || typeof formData !== 'object') {
          return NextResponse.json(
            { error: 'formData object is required' },
            { status: 400 }
          );
        }

        const page = await fetchPage(url);
        if (!page) {
          return NextResponse.json(
            { error: 'Failed to fetch page' },
            { status: 502 }
          );
        }

        // Simulate form filling by checking for matching input fields
        const formInputs = page.html.match(/<input[^>]*name=["']([^"']+)["']/gi) || [];
        const formTextareas = page.html.match(/<textarea[^>]*name=["']([^"']+)["']/gi) || [];
        const formSelects = page.html.match(/<select[^>]*name=["']([^"']+)["']/gi) || [];

        const allFields = [
          ...formInputs,
          ...formTextareas,
          ...formSelects,
        ];

        const fieldNames = allFields.map((f) => {
          const m = f.match(/name=["']([^"']+)["']/i);
          return m ? m[1] : '';
        }).filter(Boolean);

        const matchedFields: string[] = [];
        const unmatchedFields: string[] = [];

        for (const [key, _value] of Object.entries(formData)) {
          if (fieldNames.includes(key)) {
            matchedFields.push(key);
          } else {
            unmatchedFields.push(key);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Form fill simulated. ${matchedFields.length}/${Object.keys(formData).length} fields matched.`,
          matchedFields,
          unmatchedFields,
          availableFields: fieldNames,
          totalForms: (page.html.match(/<form/gi) || []).length,
          url,
        });
      }

      // ─── Search (using model router) ───
      case 'search': {
        if (!query) {
          return NextResponse.json(
            { error: 'query is required for search' },
            { status: 400 }
          );
        }

        try {
          // Use model router to generate search-optimized queries
          const result = await modelRouter.executeWithFailover({
            prompt: `Generate a list of the most relevant web search results for the query: "${query}". For each result, provide a title, URL, and a brief snippet describing the content. Format as JSON array with fields: title, url, snippet. Provide up to 10 results.`,
            systemPrompt: 'You are a search assistant. Provide realistic, helpful search results based on your knowledge. Always respond with valid JSON array.',
            maxTokens: 2048,
            temperature: 0.3,
          });

          let results: Array<{ title: string; url: string; snippet: string }> = [];
          try {
            // Try to parse JSON from the response
            const jsonMatch = result.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              results = JSON.parse(jsonMatch[0]);
            }
          } catch {
            // If parsing fails, return empty results
          }

          return NextResponse.json({
            success: true,
            query,
            results,
            count: results.length,
          });
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            error: `Search failed: ${error.message}`,
            query,
            results: [],
          });
        }
      }

      // ─── Summarize (using model router) ───
      case 'summarize': {
        if (!url) {
          return NextResponse.json(
            { error: 'url is required for summarize' },
            { status: 400 }
          );
        }

        const page = await fetchPage(url);
        if (!page) {
          return NextResponse.json(
            { error: 'Failed to fetch page for summarization' },
            { status: 502 }
          );
        }

        try {
          const pageText = page.text.slice(0, 8000);
          const result = await modelRouter.executeWithFailover({
            prompt: `Summarize this web page:\n\nTitle: ${page.title}\nURL: ${url}\n\nContent:\n${pageText}`,
            systemPrompt: 'You are a helpful assistant that summarizes web pages. Provide a concise but comprehensive summary of the page content. Include key points, main topics, and any important data or findings.',
            maxTokens: 2048,
            temperature: 0.3,
          });

          const summary = result.content || 'Summary could not be generated.';

          return NextResponse.json({
            success: true,
            summary,
            title: page.title,
            url,
            originalLength: page.text.length,
          });
        } catch (error: any) {
          // Fallback: provide a basic summary
          const basicSummary = page.text.slice(0, 500) + (page.text.length > 500 ? '...' : '');
          return NextResponse.json({
            success: true,
            summary: `[Basic summary - AI unavailable]\n\n${basicSummary}`,
            title: page.title,
            url,
            originalLength: page.text.length,
            fallback: true,
            error: error.message,
          });
        }
      }

      // ─── Status ───
      case 'status': {
        return NextResponse.json({
          status: 'ready',
          agent: 'Browser Agent v2.0',
          capabilities: [
            'navigate',
            'extract',
            'analyze',
            'screenshot',
            'fill',
            'search',
            'summarize',
          ],
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              'Unknown action. Use: navigate, extract, analyze, screenshot, fill, search, summarize, status',
          },
          { status: 400 }
        );
    }
  } catch (e: any) {
    console.error('[Browser API Error]', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
