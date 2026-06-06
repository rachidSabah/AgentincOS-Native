'use client';

// ============================================================
// Agentic OS V2 — Enhanced Artifact Panel (Right Side)
// ============================================================
import { useOSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  X, Copy, Download, ChevronLeft, ChevronRight, Code, FileText,
  Braces, Image, ZoomIn, ZoomOut, Maximize, Eye, Clock, Tag,
  Share2, Trash2, ExternalLink, GitCompare, History, Layers,
  Check, ChevronDown, ChevronRight as ChevronRightIcon, AlertCircle,
  FileCode, FileType, Sparkles, Hash, Calendar, MessageSquare,
  ArrowLeft, ArrowRight, Columns, Rows, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Types ───

interface VersionEntry {
  version: number;
  timestamp: number;
  author: string;
  changeDescription: string;
  content: string;
}

// ─── Helper Functions ───

function getLanguageForType(type: string): string {
  const map: Record<string, string> = {
    code: 'typescript', markdown: 'markdown', json: 'json',
    yaml: 'yaml', python: 'python', rust: 'rust', go: 'go', sql: 'sql',
  };
  return map[type] ?? 'text';
}

function formatFileSize(content: string): string {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Unknown';
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'code': return <Code className="w-4 h-4 text-[#3178c6]" />;
    case 'markdown': return <FileText className="w-4 h-4 text-[#00ff88]" />;
    case 'json': return <Braces className="w-4 h-4 text-[#9d4edd]" />;
    case 'yaml': return <FileCode className="w-4 h-4 text-[#cb171e]" />;
    case 'image': return <Image className="w-4 h-4 text-[#2E86AB]" />;
    default: return <FileType className="w-4 h-4 text-muted-foreground" />;
  }
}

function getTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    code: '#3178c6', markdown: '#00ff88', json: '#9d4edd',
    yaml: '#cb171e', image: '#2E86AB', pdf: '#E6394A',
    docx: '#1B998B', pptx: '#E8751A', repo: '#FFB627',
  };
  return map[type] ?? '#888888';
}

// ─── JSON Tree View Component ───

function JsonTreeNode({ data, name, depth = 0, defaultExpanded = true }: {
  data: unknown;
  name: string;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded && depth < 3);

  if (data === null || data === undefined) {
    return (
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        <span className="text-[#9d4edd] font-mono text-xs">{name}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-muted-foreground/60 text-xs italic">null</span>
      </div>
    );
  }

  if (typeof data === 'string') {
    return (
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        <span className="text-[#9d4edd] font-mono text-xs">{name}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-[#00ff88] text-xs">&quot;{data.length > 100 ? data.slice(0, 100) + '...' : data}&quot;</span>
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        <span className="text-[#9d4edd] font-mono text-xs">{name}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-[#FFB627] text-xs">{data}</span>
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
        <span className="text-[#9d4edd] font-mono text-xs">{name}</span>
        <span className="text-muted-foreground">:</span>
        <span className="text-[#E8751A] text-xs">{String(data)}</span>
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
        <div
          className="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-muted/20 rounded px-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />}
          <span className="text-[#9d4edd] font-mono text-xs">{name}</span>
          <span className="text-muted-foreground text-[10px]">Array({data.length})</span>
        </div>
        {expanded && data.map((item, i) => (
          <JsonTreeNode key={i} data={item} name={`[${i}]`} depth={depth + 1} defaultExpanded={false} />
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <div style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
        <div
          className="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-muted/20 rounded px-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />}
          <span className="text-[#9d4edd] font-mono text-xs">{name}</span>
          <span className="text-muted-foreground text-[10px]">{`{${entries.length}}`}</span>
        </div>
        {expanded && entries.map(([key, value]) => (
          <JsonTreeNode key={key} data={value} name={key} depth={depth + 1} defaultExpanded={false} />
        ))}
      </div>
    );
  }

  return null;
}

// ─── Diff View Component ───

function DiffView({
  original,
  modified,
  mode,
}: {
  original: string;
  modified: string;
  mode: 'unified' | 'side-by-side';
}) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const maxLen = Math.max(origLines.length, modLines.length);

  const diffResult = useMemo(() => {
    const result: Array<{
      type: 'same' | 'add' | 'del';
      origLine?: string;
      modLine?: string;
      origNum?: number;
      modNum?: number;
    }> = [];

    let oi = 0, mi = 0;
    while (oi < origLines.length || mi < modLines.length) {
      if (oi < origLines.length && mi < modLines.length && origLines[oi] === modLines[mi]) {
        result.push({ type: 'same', origLine: origLines[oi], modLine: modLines[mi], origNum: oi + 1, modNum: mi + 1 });
        oi++; mi++;
      } else {
        // Check if the current mod line appears later in orig (additions)
        const modInOrig = origLines.indexOf(modLines[mi] ?? '', oi + 1);
        const origInMod = modLines.indexOf(origLines[oi] ?? '', mi + 1);

        if (mi < modLines.length && (modInOrig === -1 || (origInMod !== -1 && origInMod <= modInOrig))) {
          // Additions in modified
          if (oi < origLines.length && origLines[oi] !== modLines[mi]) {
            result.push({ type: 'del', origLine: origLines[oi], origNum: oi + 1 });
            result.push({ type: 'add', modLine: modLines[mi], modNum: mi + 1 });
            oi++; mi++;
          } else {
            result.push({ type: 'add', modLine: modLines[mi], modNum: mi + 1 });
            mi++;
          }
        } else if (oi < origLines.length) {
          result.push({ type: 'del', origLine: origLines[oi], origNum: oi + 1 });
          oi++;
        } else if (mi < modLines.length) {
          result.push({ type: 'add', modLine: modLines[mi], modNum: mi + 1 });
          mi++;
        }
      }
    }
    return result;
  }, [origLines, modLines]);

  // Count changes
  const additions = diffResult.filter(d => d.type === 'add').length;
  const deletions = diffResult.filter(d => d.type === 'del').length;

  // Change navigation
  const changes = diffResult.filter(d => d.type !== 'same');
  const [currentChange, setCurrentChange] = useState(0);

  const nextChange = () => setCurrentChange(i => Math.min(i + 1, changes.length - 1));
  const prevChange = () => setCurrentChange(i => Math.max(i - 1, 0));

  if (mode === 'side-by-side') {
    return (
      <div>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <Badge variant="outline" className="text-[10px] border-[#00ff88]/30 text-[#00ff88]">+{additions}</Badge>
          <Badge variant="outline" className="text-[10px] border-[#E6394A]/30 text-[#E6394A]">-{deletions}</Badge>
          <span className="text-[10px] text-muted-foreground">{changes.length} changes</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={prevChange} disabled={currentChange <= 0}>
            <ArrowLeft className="w-3 h-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground">{currentChange + 1}/{changes.length}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={nextChange} disabled={currentChange >= changes.length - 1}>
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex">
          <div className="flex-1 border-r border-border/30">
            <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/10 border-b border-border/20">Original</div>
            <div className="font-mono text-xs">
              {diffResult.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-2 py-0.5 leading-5',
                    d.type === 'del' && 'bg-[#E6394A]/10 text-[#E6394A]',
                    d.type === 'same' && 'text-foreground/70',
                  )}
                >
                  {d.origLine !== undefined ? (
                    <><span className="text-muted-foreground/40 w-6 inline-block text-right mr-2 select-none">{d.origNum}</span>{d.origLine}</>
                  ) : (
                    <span className="text-muted-foreground/20">&nbsp;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/10 border-b border-border/20">Modified</div>
            <div className="font-mono text-xs">
              {diffResult.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-2 py-0.5 leading-5',
                    d.type === 'add' && 'bg-[#00ff88]/10 text-[#00ff88]',
                    d.type === 'same' && 'text-foreground/70',
                  )}
                >
                  {d.modLine !== undefined ? (
                    <><span className="text-muted-foreground/40 w-6 inline-block text-right mr-2 select-none">{d.modNum}</span>{d.modLine}</>
                  ) : (
                    <span className="text-muted-foreground/20">&nbsp;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unified view
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <Badge variant="outline" className="text-[10px] border-[#00ff88]/30 text-[#00ff88]">+{additions}</Badge>
        <Badge variant="outline" className="text-[10px] border-[#E6394A]/30 text-[#E6394A]">-{deletions}</Badge>
        <span className="text-[10px] text-muted-foreground">{changes.length} changes</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={prevChange} disabled={currentChange <= 0}>
          <ArrowLeft className="w-3 h-3" />
        </Button>
        <span className="text-[10px] text-muted-foreground">{currentChange + 1}/{changes.length}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={nextChange} disabled={currentChange >= changes.length - 1}>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
      <div className="font-mono text-xs">
        {diffResult.map((d, i) => (
          <div
            key={i}
            className={cn(
              'px-3 py-0.5 leading-5',
              d.type === 'add' && 'bg-[#00ff88]/10 text-[#00ff88]',
              d.type === 'del' && 'bg-[#E6394A]/10 text-[#E6394A]',
              d.type === 'same' && 'text-foreground/70',
            )}
          >
            <span className="text-muted-foreground/40 w-4 inline-block mr-1 select-none">
              {d.type === 'add' ? '+' : d.type === 'del' ? '-' : ' '}
            </span>
            <span className="text-muted-foreground/40 w-6 inline-block text-right mr-2 select-none">
              {d.origNum ?? d.modNum ?? ''}
            </span>
            {d.origLine ?? d.modLine}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Markdown TOC Component ───

function MarkdownTOC({ content }: { content: string }) {
  const headings = useMemo(() => {
    const regex = /^(#{1,3})\s+(.+)$/gm;
    const result: Array<{ level: number; text: string; id: string }> = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      result.push({ level, text, id });
    }
    return result;
  }, [content]);

  if (headings.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
        Table of Contents
      </div>
      {headings.map((h, i) => (
        <div
          key={i}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors truncate"
          style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
          onClick={() => {
            // Try to scroll to the heading in the preview
            const el = document.getElementById(h.id);
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {h.text}
        </div>
      ))}
    </div>
  );
}

// ─── Image Preview Component ───

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState<'fit' | 'actual'>('fit');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 shrink-0">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.max(25, z - 25))}>
          <ZoomOut className="w-3 h-3" />
        </Button>
        <span className="text-[10px] text-muted-foreground min-w-[40px] text-center">{zoom}%</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(z => Math.min(400, z + 25))}>
          <ZoomIn className="w-3 h-3" />
        </Button>
        <div className="w-px h-4 bg-border/50" />
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setFitMode('fit'); setZoom(100); }}>
          Fit
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setFitMode('actual'); setZoom(100); }}>
          Actual Size
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center',
          }}
        />
      </div>
    </div>
  );
}

// ─── Main ArtifactPanel Component ───

export function ArtifactPanel() {
  const { artifactPanelOpen, setArtifactPanelOpen, activeArtifact, setActiveArtifact } = useOSStore();
  const [activeTab, setActiveTab] = useState('preview');
  const [currentVersion, setCurrentVersion] = useState(1);
  const [diffMode, setDiffMode] = useState<'unified' | 'side-by-side'>('unified');
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [searchInContent, setSearchInContent] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);

  // Simulated version history
  const versions: VersionEntry[] = useMemo(() => {
    if (!activeArtifact) return [];
    return Array.from({ length: activeArtifact.version }, (_, i) => ({
      version: i + 1,
      timestamp: new Date(activeArtifact.createdAt).getTime() + i * 3600000,
      author: i === 0 ? 'system' : i % 2 === 0 ? 'brain-coder' : 'brain-architect',
      changeDescription: i === 0 ? 'Initial creation' :
        i === 1 ? 'Added core logic' :
        i === 2 ? 'Refactored structure' :
        `Version ${i + 1} update`,
      content: activeArtifact.content + (i > 0 ? `\n// Updated in v${i + 1}` : ''),
    }));
  }, [activeArtifact]);

  // Formatted content
  const displayContent = useMemo(() => {
    if (!activeArtifact) return '';
    if (activeArtifact.type === 'json') {
      try {
        return JSON.stringify(JSON.parse(activeArtifact.content), null, 2);
      } catch {
        return activeArtifact.content;
      }
    }
    return activeArtifact.content;
  }, [activeArtifact]);

  const language = useMemo(() => {
    if (!activeArtifact) return 'text';
    return activeArtifact.language ?? getLanguageForType(activeArtifact.type);
  }, [activeArtifact]);

  // Parse JSON for tree view
  const parsedJson = useMemo(() => {
    if (!activeArtifact || activeArtifact.type !== 'json') return null;
    try {
      return JSON.parse(activeArtifact.content);
    } catch {
      return null;
    }
  }, [activeArtifact]);

  // Search highlighting in content
  const highlightedContent = useMemo(() => {
    if (!searchInContent || !displayContent) return displayContent;
    try {
      const regex = new RegExp(`(${searchInContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return displayContent.replace(regex, '<<<MARK>>>$1<<</MARK>>>');
    } catch {
      return displayContent;
    }
  }, [displayContent, searchInContent]);

  // Copy handler
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!activeArtifact) return;
    const blob = new Blob([displayContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeArtifact.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeArtifact, displayContent]);

  // Share handler
  const handleShare = useCallback(() => {
    if (!activeArtifact) return;
    const shareUrl = `${window.location.origin}?artifact=${activeArtifact.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeArtifact]);

  // Delete handler
  const handleDelete = useCallback(() => {
    setArtifactPanelOpen(false);
    setActiveArtifact(null);
  }, [setArtifactPanelOpen, setActiveArtifact]);

  // Tags
  const tags = useMemo(() => {
    if (!activeArtifact) return [];
    const t = activeArtifact.metadata?.tags;
    if (Array.isArray(t)) return t as string[];
    return [activeArtifact.type];
  }, [activeArtifact]);

  if (!artifactPanelOpen || !activeArtifact) return null;

  const typeColor = getTypeBadgeColor(activeArtifact.type);

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 480, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full border-l border-border bg-[#0d0d20] flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {getTypeIcon(activeArtifact.type)}
          <span className="text-sm font-medium truncate">{activeArtifact.name}</span>
          <Badge
            variant="outline"
            className="text-[9px] shrink-0"
            style={{ borderColor: `${typeColor}40`, color: typeColor, backgroundColor: `${typeColor}10` }}
          >
            {activeArtifact.type}
          </Badge>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Action Bar */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Copy content</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Download file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Share (copy link)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Open in file editor - store action
                    setArtifactPanelOpen(false);
                  }}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Open in File Editor</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-[#E6394A]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Delete artifact</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setArtifactPanelOpen(false); setActiveArtifact(null); }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="px-4 py-2 border-b border-border/50 shrink-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            <span>v{activeArtifact.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>{formatFileSize(displayContent)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(activeArtifact.createdAt)}</span>
          </div>
          {activeArtifact.conversationId && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{activeArtifact.conversationId}</span>
            </div>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5 border-border/50">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-9 px-2 shrink-0">
          <TabsTrigger value="preview" className="text-xs data-[state=active]:text-[#E8751A]">
            <Eye className="w-3 h-3 mr-1" /> Preview
          </TabsTrigger>
          <TabsTrigger value="diff" className="text-xs data-[state=active]:text-[#E8751A]">
            <GitCompare className="w-3 h-3 mr-1" /> Diff
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:text-[#E8751A]">
            <History className="w-3 h-3 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 overflow-auto mt-0">
          {activeArtifact.type === 'markdown' ? (
            <div className="flex h-full">
              {/* TOC Sidebar */}
              <div className="w-40 shrink-0 border-r border-border/20 p-3 overflow-y-auto custom-scrollbar hidden md:block">
                <MarkdownTOC content={displayContent} />
              </div>
              {/* Markdown content */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-code:text-[#00ff88] prose-a:text-[#E8751A] prose-strong:text-foreground prose-pre:bg-[#0a0a18] prose-pre:border prose-pre:border-border/30">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {displayContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : activeArtifact.type === 'json' && parsedJson !== null ? (
            <ScrollArea className="h-full">
              <div className="flex items-center gap-2 p-2 border-b border-border/30">
                <Button
                  variant="ghost" size="sm"
                  className="text-[10px] h-6 px-2 text-[#9d4edd]"
                  onClick={() => {
                    // Toggle between tree and raw
                    setActiveArtifact({ ...activeArtifact, type: 'code' } as never);
                  }}
                >
                  <Code className="w-3 h-3 mr-1" /> Raw View
                </Button>
              </div>
              <div className="p-3 font-mono text-xs">
                <JsonTreeNode data={parsedJson} name="root" defaultExpanded={true} />
              </div>
            </ScrollArea>
          ) : activeArtifact.type === 'image' ? (
            <ImagePreview src={activeArtifact.content} alt={activeArtifact.name} />
          ) : (
            /* Code / other types */
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
                <Button
                  variant="ghost" size="sm"
                  className={cn('text-[10px] h-6 px-2', wordWrap && 'text-[#E8751A]')}
                  onClick={() => setWordWrap(!wordWrap)}
                >
                  Word Wrap
                </Button>
                <div className="flex-1" />
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchInContent}
                    onChange={(e) => setSearchInContent(e.target.value)}
                    placeholder="Find..."
                    className="h-6 text-[10px] pl-6 pr-2 bg-muted/20 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-[#E8751A]/50"
                  />
                </div>
                {activeArtifact.type === 'json' && (
                  <Button
                    variant="ghost" size="sm"
                    className="text-[10px] h-6 px-2 text-[#9d4edd]"
                    onClick={() => {
                      setActiveArtifact({ ...activeArtifact, type: 'json' } as never);
                    }}
                  >
                    <Braces className="w-3 h-3 mr-1" /> Tree View
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="relative">
                  {/* Line numbers */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#0a0a18] border-r border-border/20 select-none z-10">
                    {displayContent.split('\n').map((_, i) => (
                      <div key={i} className="h-[20px] flex items-center justify-end pr-2 text-[11px] text-muted-foreground/40 font-mono">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  {/* Code */}
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    showLineNumbers={false}
                    wrapLines={true}
                    customStyle={{
                      background: 'transparent',
                      margin: 0,
                      padding: '0 16px 0 48px',
                      fontSize: '12px',
                      lineHeight: '20px',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                      wordBreak: wordWrap ? 'break-all' : 'normal',
                    }}
                  >
                    {displayContent}
                  </SyntaxHighlighter>
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* Diff Tab */}
        <TabsContent value="diff" className="flex-1 overflow-auto mt-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 shrink-0">
            <span className="text-[10px] text-muted-foreground">Compare versions:</span>
            <Button
              variant="ghost" size="sm"
              className={cn('text-[10px] h-6 px-2', diffMode === 'unified' && 'text-[#E8751A]')}
              onClick={() => setDiffMode('unified')}
            >
              <Rows className="w-3 h-3 mr-1" /> Unified
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn('text-[10px] h-6 px-2', diffMode === 'side-by-side' && 'text-[#E8751A]')}
              onClick={() => setDiffMode('side-by-side')}
            >
              <Columns className="w-3 h-3 mr-1" /> Side by Side
            </Button>
          </div>

          {/* Version selector */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 shrink-0">
            <span className="text-[10px] text-muted-foreground">From:</span>
            <select
              className="h-6 text-[10px] bg-muted/20 border border-border/50 rounded px-1 text-foreground"
              value={selectedVersions ? selectedVersions[0] : Math.max(1, activeArtifact.version - 1)}
              onChange={(e) => {
                const from = parseInt(e.target.value);
                const to = selectedVersions ? selectedVersions[1] : activeArtifact.version;
                setSelectedVersions([from, to]);
              }}
            >
              {versions.map(v => (
                <option key={v.version} value={v.version}>v{v.version}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">→</span>
            <span className="text-[10px] text-muted-foreground">To:</span>
            <select
              className="h-6 text-[10px] bg-muted/20 border border-border/50 rounded px-1 text-foreground"
              value={selectedVersions ? selectedVersions[1] : activeArtifact.version}
              onChange={(e) => {
                const from = selectedVersions ? selectedVersions[0] : Math.max(1, activeArtifact.version - 1);
                const to = parseInt(e.target.value);
                setSelectedVersions([from, to]);
              }}
            >
              {versions.map(v => (
                <option key={v.version} value={v.version}>v{v.version}</option>
              ))}
            </select>
          </div>

          <ScrollArea className="flex-1">
            <DiffView
              original={versions[(selectedVersions ? selectedVersions[0] : Math.max(1, activeArtifact.version - 1)) - 1]?.content ?? ''}
              modified={versions[(selectedVersions ? selectedVersions[1] : activeArtifact.version) - 1]?.content ?? displayContent}
              mode={diffMode}
            />
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-auto mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {/* Timeline */}
              <div className="text-sm font-medium text-foreground mb-4">Version Timeline</div>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border/50" />

                {versions.slice().reverse().map((v) => {
                  const isCurrent = v.version === currentVersion;
                  const isLatest = v.version === activeArtifact.version;
                  const authorColors: Record<string, string> = {
                    'system': '#9d4edd',
                    'brain-coder': '#00ff88',
                    'brain-architect': '#00ffff',
                    'brain-planner': '#FFB627',
                  };
                  const authorColor = authorColors[v.author] ?? '#888';

                  return (
                    <motion.div
                      key={v.version}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: v.version * 0.05 }}
                      className={cn(
                        'relative pl-10 pb-4 cursor-pointer group',
                      )}
                      onClick={() => setCurrentVersion(v.version)}
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 transition-colors',
                          isCurrent ? 'border-[#E8751A] bg-[#E8751A]' : 'border-border bg-[#0d0d20] group-hover:border-[#E8751A]/50'
                        )}
                      />

                      {/* Version card */}
                      <div className={cn(
                        'p-3 rounded-lg border transition-colors',
                        isCurrent
                          ? 'bg-[#E8751A]/5 border-[#E8751A]/20'
                          : 'bg-card/30 border-border/50 hover:border-border'
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">v{v.version}</span>
                            {isLatest && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1 border-[#00ff88]/30 text-[#00ff88]">
                                LATEST
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(v.timestamp)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{v.changeDescription}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: authorColor }} />
                          <span className="text-[10px]" style={{ color: authorColor }}>{v.author}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Compare button */}
              {versions.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setActiveTab('diff');
                      setSelectedVersions([1, activeArtifact.version]);
                    }}
                  >
                    <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                    Compare First and Latest Version
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Bottom version nav */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border shrink-0">
        <span className="text-xs text-muted-foreground">
          Version {currentVersion} of {activeArtifact.version}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={currentVersion <= 1}
            onClick={() => setCurrentVersion(v => Math.max(1, v - 1))}>
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={currentVersion >= activeArtifact.version}
            onClick={() => setCurrentVersion(v => v + 1)}>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
