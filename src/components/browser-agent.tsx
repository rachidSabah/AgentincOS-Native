'use client';

// ============================================================
// Agentic OS V2 — Browser Agent Component
// Full browser agent UI with chrome, preview, sidebar, actions,
// history, and status bar
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Lock,
  Unlock,
  Globe,
  FileText,
  Link2,
  BarChart3,
  Terminal,
  Database,
  Camera,
  Bot,
  Clock,
  ChevronRight,
  Monitor,
  Tablet,
  Smartphone,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  ExternalLink,
  Copy,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types ───

interface PageData {
  url: string;
  title: string;
  content: string;
  html: string;
  links: Array<{ href: string; text: string }>;
  metaDescription: string;
  loadTimeMs: number;
  fetchedAt: number;
}

interface PageAnalysis {
  url: string;
  title: string;
  wordCount: number;
  charCount: number;
  headings: Record<string, number>;
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

interface ConsoleEntry {
  id: string;
  type: 'navigate' | 'extract' | 'analyze' | 'search' | 'summarize' | 'error' | 'info' | 'screenshot' | 'fill';
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ExtractedData {
  selector: string;
  items: string[];
  count: number;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

// ─── Helper Functions ───

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

function isHttps(url: string): boolean {
  return url.startsWith('https://');
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function truncateUrl(url: string, maxLen: number = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '...';
}

const consoleTypeColors: Record<string, string> = {
  navigate: '#00ff88',
  extract: '#2E86AB',
  analyze: '#9d4edd',
  search: '#FFB627',
  summarize: '#E8751A',
  error: '#E6394A',
  info: '#8888aa',
  screenshot: '#1B998B',
  fill: '#6B5B95',
};

const consoleTypeIcons: Record<string, React.ElementType> = {
  navigate: Globe,
  extract: FileText,
  analyze: BarChart3,
  search: Search,
  summarize: Bot,
  error: AlertTriangle,
  info: Info,
  screenshot: Camera,
  fill: Database,
};

// ─── Main Component ───

export function BrowserAgent() {
  // State
  const [urlInput, setUrlInput] = useState('');
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [analysis, setAnalysis] = useState<PageAnalysis | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [activeTab, setActiveTab] = useState('content');

  // Action states
  const [extractSelector, setExtractSelector] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const pageCacheRef = useRef<Map<string, PageData>>(new Map());

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleEntries]);

  // ─── Console Logger ───

  const addConsole = useCallback(
    (type: ConsoleEntry['type'], message: string, metadata?: Record<string, unknown>) => {
      setConsoleEntries((prev) => [
        ...prev.slice(-199),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          message,
          timestamp: Date.now(),
          metadata,
        },
      ]);
    },
    []
  );

  // ─── Navigate ───

  const navigate = useCallback(
    async (url?: string) => {
      const targetUrl = url || urlInput;
      if (!targetUrl.trim()) return;

      const normalizedUrl = normalizeUrl(targetUrl);
      setUrlInput(normalizedUrl);
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setExtractedData(null);
      setSummary(null);
      setActionLoading('navigate');
      addConsole('navigate', `Navigating to ${normalizedUrl}`);

      const startTime = Date.now();

      try {
        const res = await fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'navigate', url: normalizedUrl }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const pageData: PageData = {
          url: data.url || normalizedUrl,
          title: data.title || normalizedUrl,
          content: data.content || '',
          html: data.html || '',
          links: data.links || [],
          metaDescription: data.metaDescription || '',
          loadTimeMs: Date.now() - startTime,
          fetchedAt: Date.now(),
        };

        setCurrentPage(pageData);
        pageCacheRef.current.set(normalizedUrl, pageData);

        // Update history
        setHistory((prev) => {
          // Truncate forward history if we're not at the end
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push({ url: normalizedUrl, title: pageData.title, timestamp: Date.now() });
          return newHistory;
        });
        setHistoryIndex((prev) => prev + 1);

        addConsole('navigate', `Loaded: ${pageData.title} (${formatTime(pageData.loadTimeMs)})`, {
          url: normalizedUrl,
          loadTimeMs: pageData.loadTimeMs,
          linkCount: pageData.links.length,
        });
      } catch (err: any) {
        setError(err.message || 'Navigation failed');
        addConsole('error', `Navigation failed: ${err.message}`, { url: normalizedUrl });
      } finally {
        setLoading(false);
        setActionLoading(null);
      }
    },
    [urlInput, historyIndex, addConsole]
  );

  // ─── Go Back ───

  const goBack = useCallback(async () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    if (!entry) return;

    setHistoryIndex(newIndex);
    setUrlInput(entry.url);
    addConsole('navigate', `Going back to ${entry.url}`);

    // Check cache
    if (pageCacheRef.current.has(entry.url)) {
      setCurrentPage(pageCacheRef.current.get(entry.url)!);
      return;
    }

    // Re-fetch
    await navigate(entry.url);
  }, [history, historyIndex, addConsole, navigate]);

  // ─── Go Forward ───

  const goForward = useCallback(async () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    if (!entry) return;

    setHistoryIndex(newIndex);
    setUrlInput(entry.url);
    addConsole('navigate', `Going forward to ${entry.url}`);

    if (pageCacheRef.current.has(entry.url)) {
      setCurrentPage(pageCacheRef.current.get(entry.url)!);
      return;
    }

    await navigate(entry.url);
  }, [history, historyIndex, addConsole, navigate]);

  // ─── Refresh ───

  const refresh = useCallback(async () => {
    if (!currentPage) return;
    pageCacheRef.current.delete(currentPage.url);
    await navigate(currentPage.url);
  }, [currentPage, navigate]);

  // ─── Extract ───

  const extractContent = useCallback(async () => {
    if (!currentPage) {
      addConsole('error', 'No page loaded. Navigate first.');
      return;
    }

    setActionLoading('extract');
    addConsole('extract', `Extracting with selector: ${extractSelector || 'full-text'}`);

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract',
          url: currentPage.url,
          cssSelector: extractSelector || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Extraction failed');

      setExtractedData({
        selector: data.selector || extractSelector || 'full-text',
        items: data.items || [data.content || ''],
        count: data.count || (data.items || []).length,
      });

      setActiveTab('data');
      addConsole('extract', `Extracted ${data.count || 0} items`, {
        selector: extractSelector,
        count: data.count,
      });
    } catch (err: any) {
      addConsole('error', `Extraction failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [currentPage, extractSelector, addConsole]);

  // ─── Analyze ───

  const analyzePage = useCallback(async () => {
    if (!currentPage) {
      addConsole('error', 'No page loaded. Navigate first.');
      return;
    }

    setActionLoading('analyze');
    addConsole('analyze', `Analyzing: ${currentPage.title}`);

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', url: currentPage.url }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');

      setAnalysis(data.analysis || data);
      setActiveTab('analysis');
      addConsole('analyze', `Analysis complete — SEO: ${data.analysis?.seoScore || 0}/100`, {
        wordCount: data.analysis?.wordCount,
        seoScore: data.analysis?.seoScore,
      });
    } catch (err: any) {
      addConsole('error', `Analysis failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [currentPage, addConsole]);

  // ─── Search ───

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setActionLoading('search');
    addConsole('search', `Searching: ${searchQuery}`);

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery }),
      });

      const data = await res.json();
      if (!data.success && data.results?.length === 0) throw new Error(data.error || 'Search failed');

      setSearchResults(data.results || []);
      setActiveTab('data');
      addConsole('search', `Found ${(data.results || []).length} results`, {
        query: searchQuery,
        count: (data.results || []).length,
      });
    } catch (err: any) {
      addConsole('error', `Search failed: ${err.message}`);
      setSearchResults([]);
    } finally {
      setActionLoading(null);
    }
  }, [searchQuery, addConsole]);

  // ─── Ask AI ───

  const askAI = useCallback(async () => {
    if (!currentPage) {
      addConsole('error', 'No page loaded. Navigate first.');
      return;
    }

    setActionLoading('summarize');
    addConsole('summarize', `Summarizing: ${currentPage.title}`);

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', url: currentPage.url }),
      });

      const data = await res.json();
      if (!data.success && !data.summary) throw new Error(data.error || 'Summarization failed');

      setSummary(data.summary || 'No summary available.');
      setActiveTab('content');
      addConsole('summarize', `Summary generated (${(data.summary || '').length} chars)`);
    } catch (err: any) {
      addConsole('error', `Summarization failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [currentPage, addConsole]);

  // ─── Screenshot ───

  const takeScreenshot = useCallback(async () => {
    if (!currentPage) {
      addConsole('error', 'No page loaded. Navigate first.');
      return;
    }

    setActionLoading('screenshot');
    addConsole('screenshot', `Capturing: ${currentPage.title}`);

    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screenshot', url: currentPage.url }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Screenshot failed');

      addConsole('screenshot', 'Screenshot captured', { dataSize: (data.screenshot || '').length });
    } catch (err: any) {
      addConsole('error', `Screenshot failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }, [currentPage, addConsole]);

  // ─── Navigate to link ───

  const navigateToLink = useCallback(
    (href: string) => {
      let fullUrl = href;
      if (href.startsWith('/') && currentPage) {
        try {
          const base = new URL(currentPage.url);
          fullUrl = `${base.origin}${href}`;
        } catch {
          fullUrl = href;
        }
      }
      setUrlInput(fullUrl);
      navigate(fullUrl);
    },
    [currentPage, navigate]
  );

  // ─── Viewport widths ───

  const viewportWidths: Record<ViewportSize, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  // ─── Render ───

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a] overflow-hidden">
      {/* ─── Browser Chrome ─── */}
      <div className="shrink-0 border-b border-border bg-[#0d0d20]/80 backdrop-blur-md">
        {/* Navigation bar */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Back / Forward / Refresh */}
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={goBack}
                    disabled={historyIndex <= 0 || loading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={goForward}
                    disabled={historyIndex >= history.length - 1 || loading}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Forward</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={refresh}
                    disabled={!currentPage || loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCw className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* URL bar */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex items-center bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5 gap-2">
              {/* SSL indicator */}
              {currentPage ? (
                isHttps(currentPage.url) ? (
                  <Lock className="w-3.5 h-3.5 text-[#00ff88] shrink-0" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-[#FFB627] shrink-0" />
                )
              ) : (
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}

              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate();
                }}
                placeholder="Enter URL to browse..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
              />

              {loading && (
                <Loader2 className="w-3.5 h-3.5 text-[#E8751A] animate-spin shrink-0" />
              )}
            </div>

            <Button
              size="sm"
              onClick={() => navigate()}
              disabled={loading || !urlInput.trim()}
              className="bg-[#E8751A]/15 text-[#E8751A] hover:bg-[#E8751A]/25 border border-[#E8751A]/30 shrink-0"
            >
              Go
            </Button>
          </div>

          {/* Viewport toggle */}
          <div className="flex items-center gap-1 shrink-0 border border-border/50 rounded-lg p-0.5">
            <Button
              variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewport('desktop')}
            >
              <Monitor className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewport('tablet')}
            >
              <Tablet className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewport('mobile')}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Agent Actions Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/30 bg-muted/10 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
            Actions
          </span>
          <Separator orientation="vertical" className="h-4 shrink-0" />

          {/* Extract */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              placeholder="CSS selector..."
              value={extractSelector}
              onChange={(e) => setExtractSelector(e.target.value)}
              className="h-7 w-32 text-xs font-mono bg-muted/20 border-border/50"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={extractContent}
              disabled={!currentPage || actionLoading === 'extract'}
              className="h-7 text-xs border-[#2E86AB]/30 text-[#2E86AB] hover:bg-[#2E86AB]/10"
            >
              {actionLoading === 'extract' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <FileText className="w-3 h-3 mr-1" />
              )}
              Extract
            </Button>
          </div>

          <Separator orientation="vertical" className="h-4 shrink-0" />

          {/* Analyze */}
          <Button
            size="sm"
            variant="outline"
            onClick={analyzePage}
            disabled={!currentPage || actionLoading === 'analyze'}
            className="h-7 text-xs shrink-0 border-[#9d4edd]/30 text-[#9d4edd] hover:bg-[#9d4edd]/10"
          >
            {actionLoading === 'analyze' ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <BarChart3 className="w-3 h-3 mr-1" />
            )}
            Analyze
          </Button>

          <Separator orientation="vertical" className="h-4 shrink-0" />

          {/* Ask AI */}
          <Button
            size="sm"
            variant="outline"
            onClick={askAI}
            disabled={!currentPage || actionLoading === 'summarize'}
            className="h-7 text-xs shrink-0 border-[#E8751A]/30 text-[#E8751A] hover:bg-[#E8751A]/10"
          >
            {actionLoading === 'summarize' ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Bot className="w-3 h-3 mr-1" />
            )}
            Ask AI
          </Button>

          <Separator orientation="vertical" className="h-4 shrink-0" />

          {/* Screenshot */}
          <Button
            size="sm"
            variant="outline"
            onClick={takeScreenshot}
            disabled={!currentPage || actionLoading === 'screenshot'}
            className="h-7 text-xs shrink-0 border-[#1B998B]/30 text-[#1B998B] hover:bg-[#1B998B]/10"
          >
            {actionLoading === 'screenshot' ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Camera className="w-3 h-3 mr-1" />
            )}
            Screenshot
          </Button>

          <Separator orientation="vertical" className="h-4 shrink-0" />

          {/* Search */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              placeholder="Search the web..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') performSearch();
              }}
              className="h-7 w-40 text-xs bg-muted/20 border-border/50"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={performSearch}
              disabled={actionLoading === 'search' || !searchQuery.trim()}
              className="h-7 text-xs shrink-0 border-[#FFB627]/30 text-[#FFB627] hover:bg-[#FFB627]/10"
            >
              {actionLoading === 'search' ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Search className="w-3 h-3 mr-1" />
              )}
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Page Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page title bar */}
          {currentPage && (
            <div className="shrink-0 px-4 py-2 bg-muted/10 border-b border-border/30 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {currentPage.title}
              </span>
              <Badge variant="outline" className="text-[9px] shrink-0 border-border/50">
                {isHttps(currentPage.url) ? 'HTTPS' : 'HTTP'}
              </Badge>
              <div className="flex-1" />
              <span className="text-[10px] text-muted-foreground shrink-0">
                {currentPage.content.length.toLocaleString()} chars
              </span>
            </div>
          )}

          {/* Page content */}
          <div className="flex-1 overflow-auto custom-scrollbar flex justify-center bg-muted/5">
            <div
              className="transition-all duration-300"
              style={{
                width: viewportWidths[viewport],
                maxWidth: '100%',
              }}
            >
              {!currentPage && !loading && !error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E8751A]/20 to-[#9d4edd]/20 flex items-center justify-center mx-auto">
                      <Globe className="w-10 h-10 text-[#E8751A]/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Browser Agent</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter a URL to start browsing
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                      {['example.com', 'news.ycombinator.com', 'github.com'].map((demo) => (
                        <Button
                          key={demo}
                          variant="outline"
                          size="sm"
                          className="text-xs border-border/50 text-muted-foreground"
                          onClick={() => {
                            setUrlInput(`https://${demo}`);
                            navigate(`https://${demo}`);
                          }}
                        >
                          {demo}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#E8751A] mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading page...</p>
                  </div>
                </div>
              )}

              {error && !loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3 max-w-md">
                    <AlertTriangle className="w-10 h-10 text-[#E6394A] mx-auto" />
                    <p className="text-sm text-[#E6394A] font-medium">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        navigate();
                      }}
                      className="text-xs"
                    >
                      <RotateCw className="w-3 h-3 mr-1" /> Retry
                    </Button>
                  </div>
                </div>
              )}

              {currentPage && !loading && (
                <div className="p-4">
                  {/* Summary from AI */}
                  {summary && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 rounded-xl border border-[#E8751A]/20 bg-[#E8751A]/5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-[#E8751A]" />
                        <span className="text-sm font-medium text-[#E8751A]">AI Summary</span>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {summary}
                      </p>
                    </motion.div>
                  )}

                  {/* Rendered HTML content */}
                  <div
                    className="prose prose-invert prose-sm max-w-none bg-card/30 rounded-xl border border-border/30 p-6 text-foreground/90"
                    dangerouslySetInnerHTML={{
                      __html: currentPage.html
                        ? currentPage.html
                            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                            .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
                            .replace(/on\w+="[^"]*"/gi, '')
                            .replace(/on\w+='[^']*'/gi, '')
                            .replace(/javascript:/gi, '')
                        : `<p>${currentPage.content.slice(0, 10000)}</p>`,
                    }}
                  />

                  {/* Fallback text content if HTML is too messy */}
                  {currentPage.html && currentPage.content && (
                    <details className="mt-4">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        View extracted text content
                      </summary>
                      <div className="mt-2 p-4 bg-muted/20 rounded-lg text-sm text-foreground/80 whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                        {currentPage.content}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="w-80 lg:w-96 shrink-0 border-l border-border bg-[#0d0d20]/50 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-2 h-9 shrink-0">
              <TabsTrigger
                value="content"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#00ff88] rounded-none pb-1.5"
              >
                <FileText className="w-3 h-3 mr-1" />
                Content
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#2E86AB] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#2E86AB] rounded-none pb-1.5"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Links
              </TabsTrigger>
              <TabsTrigger
                value="analysis"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#9d4edd] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#9d4edd] rounded-none pb-1.5"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Analysis
              </TabsTrigger>
              <TabsTrigger
                value="console"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#FFB627] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#FFB627] rounded-none pb-1.5"
              >
                <Terminal className="w-3 h-3 mr-1" />
                Console
              </TabsTrigger>
              <TabsTrigger
                value="data"
                className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-[#1B998B] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#1B998B] rounded-none pb-1.5"
              >
                <Database className="w-3 h-3 mr-1" />
                Data
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {currentPage ? (
                    <>
                      {/* Page info */}
                      <Card className="bg-card/30 border-border/50">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                            Page Info
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-14 shrink-0">Title</span>
                            <span className="text-xs text-foreground truncate">{currentPage.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-14 shrink-0">URL</span>
                            <span className="text-xs text-foreground/70 font-mono truncate">{truncateUrl(currentPage.url, 40)}</span>
                          </div>
                          {currentPage.metaDescription && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Meta</span>
                              <span className="text-xs text-foreground/70 line-clamp-3">{currentPage.metaDescription}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Text content */}
                      <Card className="bg-card/30 border-border/50">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                            Extracted Content
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                            {currentPage.content.slice(0, 5000)}
                            {currentPage.content.length > 5000 && '...'}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Quick stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                          <div className="text-[10px] text-muted-foreground">Words</div>
                          <div className="text-sm font-bold text-foreground">
                            {currentPage.content.split(/\s+/).filter(Boolean).length.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                          <div className="text-[10px] text-muted-foreground">Links</div>
                          <div className="text-sm font-bold text-foreground">
                            {currentPage.links.length}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Navigate to a page to see content</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1">
                  {currentPage && currentPage.links.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Page Links ({currentPage.links.length})
                        </span>
                        <Badge variant="outline" className="text-[9px] border-[#2E86AB]/30 text-[#2E86AB]">
                          {currentPage.links.length}
                        </Badge>
                      </div>
                      {currentPage.links.map((link, i) => (
                        <motion.div
                          key={`${link.href}-${i}`}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20 cursor-pointer group transition-colors"
                          onClick={() => navigateToLink(link.href)}
                        >
                          <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-[#2E86AB] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-foreground truncate group-hover:text-[#2E86AB]">
                              {link.text || 'Untitled'}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">
                              {truncateUrl(link.href, 45)}
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-[#2E86AB] shrink-0" />
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">No links found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {analysis ? (
                    <>
                      {/* SEO Score */}
                      <Card className="bg-card/30 border-border/50">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            SEO Score
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
                              style={{
                                backgroundColor:
                                  analysis.seoScore >= 70
                                    ? '#00ff8815'
                                    : analysis.seoScore >= 40
                                    ? '#FFB62715'
                                    : '#E6394A15',
                                color:
                                  analysis.seoScore >= 70
                                    ? '#00ff88'
                                    : analysis.seoScore >= 40
                                    ? '#FFB627'
                                    : '#E6394A',
                              }}
                            >
                              {analysis.seoScore}
                            </div>
                            <div className="flex-1">
                              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${analysis.seoScore}%`,
                                    backgroundColor:
                                      analysis.seoScore >= 70
                                        ? '#00ff88'
                                        : analysis.seoScore >= 40
                                        ? '#FFB627'
                                        : '#E6394A',
                                  }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {analysis.seoScore >= 70
                                  ? 'Good SEO'
                                  : analysis.seoScore >= 40
                                  ? 'Needs improvement'
                                  : 'Poor SEO'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Page metrics */}
                      <Card className="bg-card/30 border-border/50">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                            Page Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Words', value: analysis.wordCount.toLocaleString(), color: '#00ff88' },
                              { label: 'Characters', value: analysis.charCount.toLocaleString(), color: '#2E86AB' },
                              { label: 'Images', value: String(analysis.imageCount), color: '#9d4edd' },
                              { label: 'Videos', value: String(analysis.videoCount), color: '#E8751A' },
                              { label: 'Forms', value: String(analysis.formCount), color: '#FFB627' },
                              { label: 'Links', value: String(analysis.linkCount), color: '#1B998B' },
                              { label: 'External', value: String(analysis.externalLinkCount), color: '#E6394A' },
                              { label: 'Internal', value: String(analysis.internalLinkCount), color: '#6B5B95' },
                            ].map((metric) => (
                              <div
                                key={metric.label}
                                className="p-2 rounded-lg bg-muted/15 border border-border/30"
                              >
                                <div className="text-[9px] text-muted-foreground uppercase">
                                  {metric.label}
                                </div>
                                <div className="text-sm font-bold" style={{ color: metric.color }}>
                                  {metric.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Headings */}
                      <Card className="bg-card/30 border-border/50">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                            Headings
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(analysis.headings).map(([tag, count]) =>
                              count > 0 ? (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs border-border/50"
                                >
                                  &lt;{tag}&gt; × {count}
                                </Badge>
                              ) : null
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Technologies */}
                      {analysis.technologies.length > 0 && (
                        <Card className="bg-card/30 border-border/50">
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                              Technologies
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="flex flex-wrap gap-1.5">
                              {analysis.technologies.map((tech) => (
                                <Badge
                                  key={tech}
                                  variant="outline"
                                  className="text-[10px] border-[#9d4edd]/30 text-[#9d4edd]"
                                >
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Accessibility */}
                      {analysis.accessibilityHints.length > 0 && (
                        <Card className="bg-card/30 border-border/50">
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-[#FFB627]" />
                              Accessibility Hints
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 space-y-1.5">
                            {analysis.accessibilityHints.map((hint, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                                <AlertTriangle className="w-3 h-3 text-[#FFB627] shrink-0 mt-0.5" />
                                {hint}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Meta info */}
                      <Card className="bg-card/30 border-border/50">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                            Meta Tags
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-1.5">
                          {analysis.metaDescription && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">Desc</span>
                              <span className="text-xs text-foreground/70 line-clamp-3">{analysis.metaDescription}</span>
                            </div>
                          )}
                          {analysis.metaKeywords && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">Keywords</span>
                              <span className="text-xs text-foreground/70">{analysis.metaKeywords}</span>
                            </div>
                          )}
                          {analysis.ogTitle && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">OG Title</span>
                              <span className="text-xs text-foreground/70">{analysis.ogTitle}</span>
                            </div>
                          )}
                          {analysis.canonicalUrl && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">Canonical</span>
                              <span className="text-xs text-foreground/70 font-mono truncate">{analysis.canonicalUrl}</span>
                            </div>
                          )}
                          {analysis.language && (
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">Language</span>
                              <span className="text-xs text-foreground/70">{analysis.language}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Click &quot;Analyze&quot; to see page analysis</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Console Tab */}
            <TabsContent value="console" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-2 font-mono text-xs">
                  {consoleEntries.length > 0 ? (
                    consoleEntries.map((entry) => {
                      const Icon = consoleTypeIcons[entry.type] || Info;
                      const color = consoleTypeColors[entry.type] || '#8888aa';
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/10"
                        >
                          <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
                          <div className="flex-1 min-w-0">
                            <span style={{ color }} className="text-[10px] uppercase font-medium">
                              {entry.type}
                            </span>
                            <span className="text-foreground/80 ml-2">{entry.message}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Terminal className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Activity log will appear here</p>
                    </div>
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {/* Extracted Data */}
                  {extractedData && (
                    <Card className="bg-card/30 border-border/50">
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-3 h-3 text-[#2E86AB]" />
                          Extracted Data
                          <Badge variant="outline" className="text-[9px] ml-auto border-[#2E86AB]/30 text-[#2E86AB]">
                            {extractedData.count} items
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-1">
                        <div className="text-[10px] text-muted-foreground mb-2">
                          Selector: <code className="text-[#2E86AB]">{extractedData.selector}</code>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                          {extractedData.items.slice(0, 50).map((item, i) => (
                            <div
                              key={i}
                              className="p-2 rounded bg-muted/15 border border-border/20 text-xs text-foreground/80"
                            >
                              <span className="text-muted-foreground mr-2">#{i + 1}</span>
                              {item.slice(0, 200)}
                              {item.length > 200 && '...'}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <Card className="bg-card/30 border-border/50">
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Search className="w-3 h-3 text-[#FFB627]" />
                          Search Results
                          <Badge variant="outline" className="text-[9px] ml-auto border-[#FFB627]/30 text-[#FFB627]">
                            {searchResults.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        {searchResults.map((result, i) => (
                          <motion.div
                            key={`${result.url}-${i}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-2.5 rounded-lg bg-muted/15 border border-border/20 cursor-pointer hover:bg-muted/25 hover:border-[#FFB627]/20 transition-colors"
                            onClick={() => {
                              if (result.url) {
                                setUrlInput(result.url);
                                navigate(result.url);
                              }
                            }}
                          >
                            <div className="text-xs font-medium text-foreground truncate">
                              {result.title}
                            </div>
                            <div className="text-[10px] text-[#FFB627] font-mono truncate mt-0.5">
                              {truncateUrl(result.url, 50)}
                            </div>
                            {result.snippet && (
                              <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                {result.snippet}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Structured link data table */}
                  {currentPage && currentPage.links.length > 0 && !extractedData && searchResults.length === 0 && (
                    <Card className="bg-card/30 border-border/50">
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                          Link Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/30">
                                <th className="text-left text-[9px] text-muted-foreground uppercase py-1.5 pr-2">
                                  #
                                </th>
                                <th className="text-left text-[9px] text-muted-foreground uppercase py-1.5 pr-2">
                                  Text
                                </th>
                                <th className="text-left text-[9px] text-muted-foreground uppercase py-1.5">
                                  URL
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentPage.links.slice(0, 30).map((link, i) => (
                                <tr
                                  key={i}
                                  className="border-b border-border/10 hover:bg-muted/10 cursor-pointer"
                                  onClick={() => navigateToLink(link.href)}
                                >
                                  <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                                  <td className="py-1.5 pr-2 text-foreground/80 truncate max-w-[100px]">
                                    {link.text || '—'}
                                  </td>
                                  <td className="py-1.5 text-[#2E86AB] font-mono truncate max-w-[120px]">
                                    {truncateUrl(link.href, 30)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!extractedData && searchResults.length === 0 && !currentPage && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Extract data or search to see results</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── History Panel + Status Bar ─── */}
      <div className="shrink-0 border-t border-border bg-[#0d0d20]/80 backdrop-blur-md">
        {/* History strip (if we have history) */}
        {history.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 overflow-x-auto">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
              History
            </span>
            {history.slice(-10).map((entry, i) => {
              const globalIndex = Math.max(0, history.length - 10) + i;
              const isCurrent = globalIndex === historyIndex;
              return (
                <button
                  key={`${entry.url}-${i}`}
                  onClick={() => {
                    setHistoryIndex(globalIndex);
                    setUrlInput(entry.url);
                    if (pageCacheRef.current.has(entry.url)) {
                      setCurrentPage(pageCacheRef.current.get(entry.url)!);
                    } else {
                      navigate(entry.url);
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded shrink-0 transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#E8751A]/15 text-[#E8751A] border border-[#E8751A]/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent'
                  }`}
                >
                  {entry.title.slice(0, 20) || truncateUrl(entry.url, 20)}
                </button>
              );
            })}
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground">
          {currentPage ? (
            <>
              <div className="flex items-center gap-1.5">
                {isHttps(currentPage.url) ? (
                  <Lock className="w-3 h-3 text-[#00ff88]" />
                ) : (
                  <Unlock className="w-3 h-3 text-[#FFB627]" />
                )}
                <span className="font-mono truncate max-w-[300px]">{currentPage.url}</span>
              </div>
              <div className="w-px h-3 bg-border/50" />
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#FFB627]" />
                <span>{formatTime(currentPage.loadTimeMs)}</span>
              </div>
              <div className="w-px h-3 bg-border/50" />
              <span>{currentPage.content.length.toLocaleString()} chars</span>
              <div className="w-px h-3 bg-border/50" />
              <span>{currentPage.links.length} links</span>
              <div className="flex-1" />
              <span className="text-muted-foreground/50">
                {formatTimestamp(currentPage.fetchedAt)}
              </span>
            </>
          ) : (
            <>
              <Globe className="w-3 h-3" />
              <span>No page loaded</span>
              <div className="flex-1" />
              <span className="text-muted-foreground/50">Browser Agent v2.0</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
