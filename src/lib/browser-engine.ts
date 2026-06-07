// ============================================================
// Agentic OS V2 — Browser Engine
// Manages browsing state, history, and provides high-level
// navigation / extraction / analysis APIs
// ============================================================

export interface PageData {
  url: string;
  title: string;
  content: string;        // extracted text
  html: string;           // raw HTML
  links: PageLink[];
  metaDescription: string;
  loadTimeMs: number;
  fetchedAt: number;
}

export interface PageLink {
  href: string;
  text: string;
}

export interface PageAnalysis {
  url: string;
  title: string;
  wordCount: number;
  charCount: number;
  headings: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
  hasForms: boolean;
  formCount: number;
  imageCount: number;
  videoCount: number;
  linkCount: number;
  externalLinkCount: number;
  internalLinkCount: number;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogImage: string;
  canonicalUrl: string;
  language: string;
  technologies: string[];
  accessibilityHints: string[];
  seoScore: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ConsoleEntry {
  id: string;
  type: 'navigate' | 'extract' | 'analyze' | 'search' | 'summarize' | 'error' | 'info' | 'screenshot' | 'fill';
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ExtractedData {
  selector: string;
  items: string[];
  count: number;
}

const API_ENDPOINT = '/api/browser';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class BrowserEngine {
  private history: string[] = [];
  private historyIndex: number = -1;
  private currentPage: PageData | null = null;
  private consoleEntries: ConsoleEntry[] = [];
  private pageCache: Map<string, PageData> = new Map();

  // ─── Navigation ───

  async navigate(url: string): Promise<PageData> {
    const start = Date.now();
    this.addConsole('navigate', `Navigating to ${url}`);

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url: normalizedUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const loadTimeMs = Date.now() - start;

      const pageData: PageData = {
        url: data.url || normalizedUrl,
        title: data.title || normalizedUrl,
        content: data.content || '',
        html: data.html || '',
        links: (data.links || []).map((l: string | { href: string; text: string }) =>
          typeof l === 'string' ? { href: l, text: l } : l
        ),
        metaDescription: data.metaDescription || '',
        loadTimeMs,
        fetchedAt: Date.now(),
      };

      this.currentPage = pageData;
      this.pageCache.set(normalizedUrl, pageData);

      // Update history
      // If we navigated from somewhere in the middle of history, truncate forward entries
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      this.history.push(normalizedUrl);
      this.historyIndex = this.history.length - 1;

      this.addConsole('navigate', `Loaded: ${pageData.title} (${loadTimeMs}ms)`, {
        url: normalizedUrl,
        loadTimeMs,
        linkCount: pageData.links.length,
      });

      return pageData;
    } catch (err: any) {
      this.addConsole('error', `Navigation failed: ${err.message}`, { url: normalizedUrl });
      throw err;
    }
  }

  // ─── Extract ───

  async extract(selector: string): Promise<ExtractedData> {
    if (!this.currentPage) {
      throw new Error('No page loaded. Navigate to a page first.');
    }

    this.addConsole('extract', `Extracting content with selector: ${selector}`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract',
          url: this.currentPage.url,
          cssSelector: selector,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const items: string[] = data.items || [data.content || ''];

      this.addConsole('extract', `Extracted ${items.length} items with selector: ${selector}`, {
        selector,
        itemCount: items.length,
      });

      return {
        selector,
        items,
        count: items.length,
      };
    } catch (err: any) {
      this.addConsole('error', `Extraction failed: ${err.message}`, { selector });
      throw err;
    }
  }

  // ─── Analyze ───

  async analyze(): Promise<PageAnalysis> {
    if (!this.currentPage) {
      throw new Error('No page loaded. Navigate to a page first.');
    }

    this.addConsole('analyze', `Analyzing page: ${this.currentPage.title}`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          url: this.currentPage.url,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const analysis: PageAnalysis = data.analysis || data;

      this.addConsole('analyze', `Analysis complete: ${analysis.wordCount} words, SEO score ${analysis.seoScore}`, {
        wordCount: analysis.wordCount,
        seoScore: analysis.seoScore,
        technologies: analysis.technologies,
      });

      return analysis;
    } catch (err: any) {
      this.addConsole('error', `Analysis failed: ${err.message}`);
      throw err;
    }
  }

  // ─── Search ───

  async search(query: string): Promise<SearchResult[]> {
    this.addConsole('search', `Searching: ${query}`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const results: SearchResult[] = data.results || [];

      this.addConsole('search', `Found ${results.length} results for: ${query}`, {
        query,
        resultCount: results.length,
      });

      return results;
    } catch (err: any) {
      this.addConsole('error', `Search failed: ${err.message}`, { query });
      throw err;
    }
  }

  // ─── Summarize ───

  async summarize(): Promise<string> {
    if (!this.currentPage) {
      throw new Error('No page loaded. Navigate to a page first.');
    }

    this.addConsole('summarize', `Summarizing: ${this.currentPage.title}`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', url: this.currentPage.url }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Summarization failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const summary: string = data.summary || 'No summary available.';

      this.addConsole('summarize', `Summary generated (${summary.length} chars)`, {
        summaryLength: summary.length,
      });

      return summary;
    } catch (err: any) {
      this.addConsole('error', `Summarization failed: ${err.message}`);
      throw err;
    }
  }

  // ─── Screenshot ───

  async screenshot(): Promise<string> {
    if (!this.currentPage) {
      throw new Error('No page loaded. Navigate to a page first.');
    }

    this.addConsole('screenshot', `Capturing screenshot: ${this.currentPage.title}`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screenshot', url: this.currentPage.url }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Screenshot failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const screenshotData: string = data.screenshot || data.html || '';

      this.addConsole('screenshot', `Screenshot captured`, {
        dataSize: screenshotData.length,
      });

      return screenshotData;
    } catch (err: any) {
      this.addConsole('error', `Screenshot failed: ${err.message}`);
      throw err;
    }
  }

  // ─── Fill Form ───

  async fillForm(formData: Record<string, string>): Promise<{ success: boolean; message: string }> {
    if (!this.currentPage) {
      throw new Error('No page loaded. Navigate to a page first.');
    }

    this.addConsole('fill', `Filling form with ${Object.keys(formData).length} fields`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fill',
          url: this.currentPage.url,
          formData,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Form fill failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      this.addConsole('fill', `Form filled: ${data.message || 'Success'}`, { formData });

      return { success: data.success ?? true, message: data.message || 'Form filled successfully' };
    } catch (err: any) {
      this.addConsole('error', `Form fill failed: ${err.message}`, { formData });
      throw err;
    }
  }

  // ─── History Navigation ───

  async goBack(): Promise<PageData | null> {
    if (this.historyIndex <= 0) return null;
    this.historyIndex--;
    const url = this.history[this.historyIndex];
    this.addConsole('navigate', `Going back to ${url}`);

    // Check cache first
    if (this.pageCache.has(url)) {
      this.currentPage = this.pageCache.get(url)!;
      return this.currentPage;
    }

    // Otherwise re-fetch
    return this.navigate(url);
  }

  async goForward(): Promise<PageData | null> {
    if (this.historyIndex >= this.history.length - 1) return null;
    this.historyIndex++;
    const url = this.history[this.historyIndex];
    this.addConsole('navigate', `Going forward to ${url}`);

    if (this.pageCache.has(url)) {
      this.currentPage = this.pageCache.get(url)!;
      return this.currentPage;
    }

    return this.navigate(url);
  }

  // ─── Getters ───

  getCurrentPage(): PageData | null {
    return this.currentPage;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  getHistoryIndex(): number {
    return this.historyIndex;
  }

  canGoBack(): boolean {
    return this.historyIndex > 0;
  }

  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  getConsole(): ConsoleEntry[] {
    return [...this.consoleEntries];
  }

  // ─── Internal ───

  private addConsole(
    type: ConsoleEntry['type'],
    message: string,
    metadata?: Record<string, unknown>
  ) {
    this.consoleEntries.push({
      id: generateId(),
      type,
      message,
      timestamp: Date.now(),
      metadata,
    });

    // Keep console entries manageable
    if (this.consoleEntries.length > 200) {
      this.consoleEntries = this.consoleEntries.slice(-100);
    }
  }
}

// Singleton export
export const browserEngine = new BrowserEngine();
