import { NextRequest, NextResponse } from 'next/server';

// Lightweight browser agent — navigate, extract, browse
async function fetchPage(url: string): Promise<{ title: string; text: string; links: string[]; html: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;
    
    // Extract text (basic)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000);
    
    // Extract links
    const linkMatches = html.match(/href=["']([^"']+)["']/gi) || [];
    const links = linkMatches
      .map(l => l.replace(/href=["']/i, '').replace(/["']$/, ''))
      .filter(l => l.startsWith('http') || l.startsWith('/'))
      .slice(0, 50);
    
    return { title, text, links, html };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, cssSelector } = body;

    if (!url && action !== 'status') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    switch (action) {
      case 'navigate': {
        const page = await fetchPage(url);
        if (!page) return NextResponse.json({ error: 'Failed to fetch page' }, { status: 502 });
        return NextResponse.json({
          success: true,
          title: page.title,
          content: page.text,
          links: page.links.slice(0, 20),
          linkCount: page.links.length,
          url,
        });
      }

      case 'extract': {
        const page = await fetchPage(url);
        if (!page) return NextResponse.json({ error: 'Failed to fetch page' }, { status: 502 });
        let extracted = page.text;
        if (cssSelector) {
          // Basic selector extraction
          const regex = new RegExp(`<${cssSelector}[^>]*>([\\s\\S]*?)</${cssSelector}>`, 'gi');
          const matches = page.html.match(regex) || [];
          extracted = matches.map(m => m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).join('\n').slice(0, 10000);
        }
        return NextResponse.json({ success: true, title: page.title, content: extracted, url });
      }

      case 'analyze': {
        const page = await fetchPage(url);
        if (!page) return NextResponse.json({ error: 'Failed to fetch page' }, { status: 502 });
        const analysis = {
          title: page.title,
          url,
          wordCount: page.text.split(/\s+/).length,
          hasForms: /<form/i.test(page.html),
          hasImages: (page.html.match(/<img/gi) || []).length,
          hasVideos: /<video|<iframe.*youtube/i.test(page.html),
          metaDescription: (page.html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || [])[1] || '',
          headings: {
            h1: (page.html.match(/<h1[^>]*>/gi) || []).length,
            h2: (page.html.match(/<h2[^>]*>/gi) || []).length,
            h3: (page.html.match(/<h3[^>]*>/gi) || []).length,
          },
          technologies: detectTechnologies(page.html),
        };
        return NextResponse.json({ success: true, analysis });
      }

      case 'status':
        return NextResponse.json({ status: 'ready', agent: 'Browser Agent v1.0', capabilities: ['navigate', 'extract', 'analyze'] });

      default:
        return NextResponse.json({ error: 'Unknown action. Use: navigate, extract, analyze, status' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function detectTechnologies(html: string): string[] {
  const tech: string[] = [];
  if (/wp-content|wp-includes|wordpress/i.test(html)) tech.push('WordPress');
  if (/react|__NEXT|next\//i.test(html)) tech.push('React/Next.js');
  if (/vue|v-bind|v-on/i.test(html)) tech.push('Vue.js');
  if (/angular|ng-version/i.test(html)) tech.push('Angular');
  if (/jquery/i.test(html)) tech.push('jQuery');
  if (/bootstrap/i.test(html)) tech.push('Bootstrap');
  if (/tailwind/i.test(html)) tech.push('Tailwind CSS');
  if (/cloudflare/i.test(html)) tech.push('Cloudflare');
  if (/shopify/i.test(html)) tech.push('Shopify');
  if (/woocommerce/i.test(html)) tech.push('WooCommerce');
  return tech;
}
