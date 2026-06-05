"use client";

import { useChatStore } from "@/lib/stores";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BarChart3, User, Sparkles, Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTokens, formatCost, getTokenColor } from "@/lib/tokens";
import type { MessageMetadata } from "@/lib/types";

interface TokenDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TokenDashboard({ open, onOpenChange }: TokenDashboardProps) {
  const { messages, getActiveConversation, activeConversationId } = useChatStore();
  const [showDetails, setShowDetails] = useState(true);

  const conversation = getActiveConversation();
  const model = conversation?.model || "unknown";

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const userMessages = messages.filter((m) => m.role === "user");

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCost = 0;

  const messagesWithTokens = assistantMessages.map((msg) => {
    let metadata: MessageMetadata | null = null;
    try {
      metadata = msg.metadata ? JSON.parse(msg.metadata) : null;
    } catch {}
    const t = metadata?.tokens;
    if (t?.prompt) totalPromptTokens += t.prompt;
    if (t?.completion) totalCompletionTokens += t.completion;
    if (metadata?.cost) totalCost += metadata.cost;
    return { message: msg, metadata };
  });

  const totalTokens = totalPromptTokens + totalCompletionTokens;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Token Usage
            </DialogTitle>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Summary Card */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{formatTokens(totalTokens)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Total Tokens</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className={cn("text-2xl font-bold", totalCost > 0 ? "text-amber-500" : "text-muted-foreground")}>
                {formatCost(totalCost)}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Est. Cost</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {assistantMessages.length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Responses</p>
            </div>
          </div>

          {/* Token Breakdown */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-blue-500" />
                Prompt
              </span>
              <span className={cn("font-mono font-semibold", getTokenColor(totalPromptTokens))}>
                {formatTokens(totalPromptTokens)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: totalTokens > 0 ? `${(totalPromptTokens / totalTokens) * 100}%` : "0%" }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-purple-500" />
                Completion
              </span>
              <span className={cn("font-mono font-semibold", getTokenColor(totalCompletionTokens))}>
                {formatTokens(totalCompletionTokens)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: totalTokens > 0 ? `${(totalCompletionTokens / totalTokens) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <Separator />

          {/* Per-Message Breakdown */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Per Response
              </p>
            </div>
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-2">
                {messagesWithTokens.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No token data available for this conversation
                  </p>
                )}
                {messagesWithTokens.map(({ message, metadata }) => (
                  <div
                    key={message.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate text-muted-foreground">
                        {message.content.substring(0, 80)}
                        {message.content.length > 80 ? "..." : ""}
                      </p>
                      {showDetails && metadata?.tokens && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-blue-500/80">
                            Prompt: {formatTokens(metadata.tokens.prompt || 0)}
                          </span>
                          <span className="text-[10px] text-purple-500/80">
                            Comp: {formatTokens(metadata.tokens.completion || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-mono font-bold", getTokenColor(metadata?.tokens?.total || 0))}>
                        {formatTokens(metadata?.tokens?.total || 0)}
                      </p>
                      {showDetails && metadata?.cost != null && (
                        <p className="text-[10px] text-amber-500/70">{formatCost(metadata.cost)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {userMessages.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] text-muted-foreground/60 text-center">
                      {userMessages.length} user message{userMessages.length !== 1 ? "s" : ""} (tokens not shown)
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
