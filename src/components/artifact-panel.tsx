'use client';

// ============================================================
// Agentic OS V2 — Artifact Panel (Right Side)
// ============================================================
import { useOSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { X, Copy, Download, ChevronLeft, ChevronRight, Code, FileText, Braces } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function getLanguageForType(type: string): string {
  const map: Record<string, string> = {
    code: 'typescript',
    markdown: 'markdown',
    json: 'json',
    yaml: 'yaml',
    python: 'python',
    rust: 'rust',
    go: 'go',
    sql: 'sql',
  };
  return map[type] ?? 'text';
}

export function ArtifactPanel() {
  const { artifactPanelOpen, setArtifactPanelOpen, activeArtifact, setActiveArtifact } = useOSStore();
  const [currentVersion, setCurrentVersion] = useState(1);
  const [activeTab, setActiveTab] = useState('preview');

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

  if (!artifactPanelOpen || !activeArtifact) return null;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full border-l border-border bg-[#0d0d20] flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#9d4edd] shrink-0" />
          <span className="text-sm font-medium truncate">{activeArtifact.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(displayContent);
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const blob = new Blob([displayContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = activeArtifact.name;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
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

      {/* Version nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground">Version {currentVersion}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={currentVersion <= 1}
            onClick={() => setCurrentVersion((v) => Math.max(1, v - 1))}>
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={currentVersion >= activeArtifact.version}
            onClick={() => setCurrentVersion((v) => v + 1)}>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-9 px-2">
          <TabsTrigger value="preview" className="text-xs data-[state=active]:text-[#E8751A]">Preview</TabsTrigger>
          <TabsTrigger value="code" className="text-xs data-[state=active]:text-[#E8751A]">Code</TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:text-[#E8751A]">History</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 overflow-auto mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {activeArtifact.type === 'markdown' ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                </div>
              ) : (
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                  {displayContent}
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="code" className="flex-1 overflow-auto mt-0">
          <ScrollArea className="h-full">
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                background: 'transparent',
                margin: 0,
                padding: '16px',
                fontSize: '13px',
              }}
            >
              {displayContent}
            </SyntaxHighlighter>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-4 h-4 text-[#9d4edd]" />
                  <span>Version History</span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: activeArtifact.version }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'px-3 py-2 rounded-lg text-xs',
                        i + 1 === currentVersion
                          ? 'bg-[#E8751A]/10 border border-[#E8751A]/20 text-[#E8751A]'
                          : 'bg-muted/20 border border-border'
                      )}
                    >
                      Version {i + 1} {i + 1 === activeArtifact.version ? '(current)' : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
