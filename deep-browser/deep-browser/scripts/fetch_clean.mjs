import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

async function fetchAndClean(urls) {
  const browser = await chromium.launch({ headless: true });
  const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const results = [];

  for (const url of urls) {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    // Bypass basic navigator webdriver checks
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await context.newPage();
    try {
      console.log(`Fetching: ${url}`);
      // Wait for network idle to ensure SPA rendering is complete
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Extract full HTML
      const html = await page.content();
      
      // Parse with jsdom
      const doc = new JSDOM(html, { url });
      
      // Clean with Readability (removes ads, boilerplate, navigation)
      const reader = new Readability(doc.window.document);
      const article = reader.parse();
      
      if (article) {
        // Convert HTML to Markdown
        const markdown = turndownService.turndown(article.content);
        results.push({ url, title: article.title, content: markdown });
      } else {
        results.push({ url, error: 'Readability failed to extract main content.' });
      }
    } catch (error) {
      results.push({ url, error: error.message });
    } finally {
      await context.close();
    }
  }

  await browser.close();
  
  // Output JSON for the agent to parse
  console.log(JSON.stringify(results, null, 2));
}

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Usage: node fetch_clean.mjs <url1> <url2> ...");
  process.exit(1);
}

fetchAndClean(urls);
