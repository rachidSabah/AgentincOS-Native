"use client";

import { useChatStore } from "@/lib/stores";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";

export function HistorySidebar() {
  const { conversations, activeConversationId, setActiveConversationId } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = filteredConversations.reduce(
    (groups, conv) => {
      const date = new Date(conv.updatedAt).toDateString();
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let label: string;
      if (date === today) label = "Today";
      else if (date === yesterday) label = "Yesterday";
      else label = formatDate(new Date(conv.updatedAt));
      if (!groups[label]) groups[label] = [];
      groups[label].push(conv);
      return groups;
    },
    {} as Record<string, typeof filteredConversations>
  );

  return (
    <div className="flex flex-col h-full bg-card/50 border-l border-border w-[280px]">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">History</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            className="pl-8 h-8 text-xs bg-background/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="py-2">
          {Object.entries(groupedConversations).map(([label, convs]) => (
            <div key={label} className="mb-4">
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                {label}
              </div>
              <div className="space-y-0.5 mt-1">
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200",
                      activeConversationId === conv.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100" />
                    <span className="flex-1 truncate text-xs font-medium">{conv.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredConversations.length === 0 && (
            <div className="px-4 py-12 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No matching history" : "No chat history yet"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
