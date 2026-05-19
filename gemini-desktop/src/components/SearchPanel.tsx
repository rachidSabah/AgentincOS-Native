"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  ExternalLink,
  Loader2,
  Globe,
} from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SearchPanel({ open, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
        setSource(data.source || "");
      } else {
        setResults([]);
        setSource("");
      }
    } catch {
      setResults([]);
      setSource("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (!open) return null;

  return (
    <div className="border-t border-border bg-card/30 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
      <div className="max-w-3xl mx-auto w-full px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Web Search</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 mb-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className="h-9 flex-1 text-sm"
            disabled={loading}
          />
          <Button
            size="sm"
            className="h-9 px-3"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {source && (
          <p className="text-[10px] text-muted-foreground/60 mb-2">
            Results from {source}
          </p>
        )}

        <ScrollArea className="max-h-[280px]">
          <div className="space-y-2 pr-2">
            {results.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-accent/50 transition-colors group"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {r.title || "Untitled"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {r.url}
                    </p>
                    {r.snippet && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                        {r.snippet}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-0.5" />
                </div>
              </a>
            ))}

            {hasSearched && !loading && results.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try a different search query
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
