'use client';

// ============================================================
// Agentic OS V2 — Memory Browser
// ============================================================
import { cn } from '@/lib/utils';
import type { MemoryType } from '@/lib/types';
import { Database, Search, Star, GitBranch, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';

interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  summary?: string;
  importance: number;
  metadata: Record<string, unknown>;
  workspaceId?: string;
  createdAt: string;
}

const MEMORY_COLORS: Record<MemoryType, string> = {
  session: '#5BC0EB',
  workspace: '#2E86AB',
  agent: '#FFB627',
  artifact: '#E8751A',
  knowledge: '#9d4edd',
};

export function MemoryBrowser() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [activeType, setActiveType] = useState<MemoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGraph, setShowGraph] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (activeType !== 'all') params.set('type', activeType);
        if (searchQuery) params.set('query', searchQuery);
        const response = await fetch(`/api/memory?${params.toString()}`);
        const data = await response.json() as { memories: MemoryItem[] };
        setMemories(data.memories ?? []);
      } catch {
        setMemories([]);
      }
    };
    load();
  }, [activeType, searchQuery]);

  const memoryTypes: Array<{ value: MemoryType | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'session', label: 'Session' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'agent', label: 'Agent' },
    { value: 'artifact', label: 'Artifact' },
    { value: 'knowledge', label: 'Knowledge' },
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-[#2E86AB]" />
        <h2 className="text-xl font-bold text-foreground">Memory Engine</h2>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-9 bg-card border-border"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowGraph(!showGraph)}
          className={cn(showGraph && 'border-[#9d4edd]/50 text-[#9d4edd]')}
        >
          <GitBranch className="w-4 h-4 mr-2" />
          Graph
        </Button>
      </div>

      {/* Type tabs */}
      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as MemoryType | 'all')}>
        <TabsList className="bg-muted/20">
          {memoryTypes.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeType} className="mt-4">
          {showGraph ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Memory Graph</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Graph visualization — {memories.length} nodes</p>
                    <p className="text-xs mt-1">Edges represent relationships between memories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
              {memories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No memories found</p>
                  <p className="text-xs mt-1">Start chatting to create memories</p>
                </div>
              ) : (
                memories.map((memory) => (
                  <Card
                    key={memory.id}
                    className="bg-card border-border cursor-pointer hover:border-[#9d4edd]/30 transition-colors"
                    onClick={() => setSelectedMemory(memory)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: `${MEMORY_COLORS[memory.type]}15`, color: MEMORY_COLORS[memory.type] }}
                        >
                          {memory.type[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1.5 capitalize"
                              style={{ borderColor: `${MEMORY_COLORS[memory.type]}30`, color: MEMORY_COLORS[memory.type] }}
                            >
                              {memory.type}
                            </Badge>
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-[#FFB627]" />
                              <span className="text-[10px] text-muted-foreground">{memory.importance.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-foreground line-clamp-2">{memory.content}</p>
                          {memory.summary && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{memory.summary}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Memory detail drawer */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-end" onClick={() => setSelectedMemory(null)}>
          <div
            className="w-96 h-full bg-[#12122a] border-l border-border p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Memory Detail</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMemory(null)} className="h-6 w-6 p-0">
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">Type</div>
                <Badge
                  variant="outline"
                  className="text-xs capitalize"
                  style={{ borderColor: `${MEMORY_COLORS[selectedMemory.type]}30`, color: MEMORY_COLORS[selectedMemory.type] }}
                >
                  {selectedMemory.type}
                </Badge>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">Content</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedMemory.content}</p>
              </div>
              {selectedMemory.summary && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Summary</div>
                  <p className="text-sm text-foreground">{selectedMemory.summary}</p>
                </div>
              )}
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">Importance</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FFB627]"
                      style={{ width: `${selectedMemory.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedMemory.importance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
