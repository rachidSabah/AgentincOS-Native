"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface CitationResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchCitationProps {
  results: CitationResult[];
  source?: string;
  className?: string;
}

export function SearchCitation({ results, source, className }: SearchCitationProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className={cn("mt-2 border border-border/60 rounded-lg overflow-hidden bg-background/50", className)}>
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          Search Results
          {source && (
            <span className="text-[10px] text-muted-foreground/60 ml-1">
              via {source}
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground/50">{results.length} results</span>
      </div>
      <div className="divide-y divide-border/30">
        {results.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 px-3 py-2 hover:bg-accent/30 transition-colors group"
          >
            <span className="text-[10px] font-medium text-muted-foreground/50 mt-0.5 shrink-0">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {r.title || "Untitled"}
              </p>
              {r.snippet && (
                <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                  {r.snippet}
                </p>
              )}
            </div>
            <ExternalLink className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
