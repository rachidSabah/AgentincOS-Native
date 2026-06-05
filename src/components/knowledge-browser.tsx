'use client';

// ============================================================
// Agentic OS V2 — Knowledge Browser
// ============================================================
import { cn } from '@/lib/utils';
import { BookOpen, Upload, Search, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface KnowledgeSource {
  id: string;
  name: string;
  type: string;
  chunkCount: number;
  createdAt: string;
}

export function KnowledgeBrowser() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; content: string; tokenCount: number }>>([]);
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [chunks, setChunks] = useState<Array<{ id: string; content: string; index: number }>>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'knowledge',
          content,
          summary: `Source: ${file.name} (${file.type || 'text'})`,
          importance: 0.7,
          metadata: { sourceName: file.name, sourceType: file.type ?? 'text', chunked: true },
        }),
      });
      setSources((prev) => [...prev, {
        id: `src-${Date.now()}`,
        name: file.name,
        type: file.type ?? 'text',
        chunkCount: 0,
        createdAt: new Date().toISOString(),
      }]);
    } catch {
      // Error handling
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(`/api/memory?type=knowledge&query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json() as { memories: Array<{ id: string; content: string; metadata: string }> };
      setSearchResults(data.memories?.map((m) => ({
        id: m.id,
        content: m.content.slice(0, 200),
        tokenCount: 0,
      })) ?? []);
    } catch {
      setSearchResults([]);
    }
  };

  const sourceTypes = [
    { label: 'PDF', accept: '.pdf', icon: '📄' },
    { label: 'DOCX', accept: '.docx', icon: '📝' },
    { label: 'TXT', accept: '.txt', icon: '📃' },
    { label: 'MD', accept: '.md', icon: '📋' },
    { label: 'CSV', accept: '.csv', icon: '📊' },
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-[#9d4edd]" />
        <h2 className="text-xl font-bold text-foreground">Knowledge Engine</h2>
      </div>

      {/* Upload */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#E8751A]" />
            Upload Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {sourceTypes.map((st) => (
              <label key={st.label}>
                <input
                  type="file"
                  accept={st.accept}
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs cursor-pointer"
                  onClick={() => {}}
                  asChild
                >
                  <span>
                    <span className="mr-1">{st.icon}</span>
                    {st.label}
                  </span>
                </Button>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RAG Query */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-[#00ffff]" />
            RAG Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search knowledge base..."
              className="bg-muted/20 border-border"
            />
            <Button onClick={handleSearch} className="bg-[#9d4edd] hover:bg-[#9d4edd]/80 text-white shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {searchResults.map((result, i) => (
                <div key={result.id} className="px-3 py-2 rounded-lg bg-muted/20 border border-border text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] h-4 px-1">Chunk {i + 1}</Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{result.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sources list */}
      <Card className="bg-card border-border flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No knowledge sources</p>
              <p className="text-xs mt-1">Upload documents to build your knowledge base</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-[#9d4edd] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{source.name}</div>
                    <div className="text-[10px] text-muted-foreground">{source.type}</div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
