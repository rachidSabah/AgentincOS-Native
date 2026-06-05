"use client";

import { useRef, useEffect } from "react";
import { useChatStore, useUIStore, useSettingsStore, useAgentStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Sparkles,
  FileText,
  Check,
  Volume2,
  VolumeX,
  Pencil,
  GitBranch,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Attachment, Message, MessageMetadata } from "@/lib/types";
import { ReadAloud } from "@/components/ReadAloud";
import { ToolCallDisplay } from "@/components/ToolCallDisplay";
import { formatTokens, getTokenColor } from "@/lib/tokens";

export function ChatWindow() {
  const {
    activeConversationId,
    messages,
    streamingContent,
  } = useChatStore();
  const uiStore = useUIStore();
  const { isGenerating, setIsGenerating } = uiStore;
  const { settings } = useSettingsStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Auto-scroll to bottom when new messages or chunks arrive
  useEffect(() => {
    if (!showScrollButton) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, showScrollButton]);

  // Handle scroll events to show/hide the scroll button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleEdit = async (messageId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;

    useChatStore.getState().editMessage(messageId, trimmed);

    try {
      await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
    } catch (error) {
      console.error("Failed to save edit:", error);
    }

    setEditingMessageId(null);
    setEditContent("");
  };

  const handleBranch = async (messageId: string) => {
    const state = useChatStore.getState();
    const conv = state.getActiveConversation();
    if (!conv) return;

    const msgIndex = state.messages.findIndex((m) => m.id === messageId);
    const messagesToCopy = state.messages.slice(0, msgIndex + 1);

    try {
      const newConvRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${conv.title} (fork)`,
          model: conv.model,
          systemPrompt: conv.systemPrompt,
        }),
      });
      if (!newConvRes.ok) throw new Error("Failed to create fork conversation");
      const newConv = await newConvRes.json();

      for (const msg of messagesToCopy) {
        await fetch(`/api/conversations/${newConv.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: msg.role,
            content: msg.content,
            agentId: msg.agentId,
            attachments: msg.attachments,
            metadata: msg.metadata,
          }),
        });
      }

      useChatStore.getState().addConversation(newConv);
      state.setActiveConversationId(newConv.id);
    } catch (error) {
      console.error("Failed to branch conversation:", error);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the user message before this assistant message and resend
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 1) return;

    const prevUserMsg = messages[msgIndex - 1];
    if (prevUserMsg.role !== "user") return;

    // Remove the last assistant message
    useChatStore.getState().removeMessage(messageId);
    uiStore.setIsGenerating(true);

    try {
      const conv = useChatStore.getState().getActiveConversation();
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prevUserMsg.content,
          model: conv?.model || settings.defaultModel,
          systemPrompt: conv?.systemPrompt || settings.systemPrompt,
          conversationHistory: messages.slice(0, msgIndex - 1),
        }),
      });

      if (!response.ok) throw new Error("Failed to regenerate");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let collectedToolCalls: any[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                fullContent += data.content;
                useChatStore.getState().setStreamingContent(fullContent);
              } else if (data.type === "tool_call") {
                useChatStore.getState().setStreamingContent(fullContent + `\n\n*Running tool: ${data.toolName}...*`);
              } else if (data.type === "tool_result") {
                useChatStore.getState().setStreamingContent(fullContent);
                collectedToolCalls.push({
                  name: data.toolName,
                  result: data.result,
                  status: data.status,
                  timestamp: data.timestamp,
                });
              } else if (data.type === "done") {
                useChatStore.getState().clearStreamingContent();
                const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    role: "assistant",
                    content: fullContent,
                    metadata: { model: conv?.model, duration: data.duration },
                    toolCalls: data.toolCalls || collectedToolCalls,
                  }),
                });
                if (!res.ok) throw new Error("Failed to save regenerated message");
                const newMsg = await res.json();
                useChatStore.getState().addMessage(newMsg);
              } else if (data.type === "error") {
                useChatStore.getState().clearStreamingContent();
              }
            } catch {}
          }
        }
      }
            } catch {}
          }
        }
      }
    } catch {
      useChatStore.getState().clearStreamingContent();
    } finally {
      uiStore.setIsGenerating(false);
    }
  };

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div 
        className="flex-1 overflow-y-auto pr-1 scroll-smooth"
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
          {/* ... existing message rendering ... */}
          {messages.length === 0 && !streamingContent && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Start a conversation with Gemini
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  Type a message below or attach files to get started
                </p>
              </div>
            </div>
          )}

          {messages.map((message, idx) => (
            <MessageBubble
              key={message.id}
              message={message}
              copiedId={copiedId}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              isGenerating={false}
              isEditing={editingMessageId === message.id}
              editContent={editingMessageId === message.id ? editContent : ""}
              hasSubsequentMessages={message.role === "user" && idx < messages.length - 1}
              onStartEdit={(msg) => {
                setEditingMessageId(msg.id);
                setEditContent(msg.content);
              }}
              onCancelEdit={() => {
                setEditingMessageId(null);
                setEditContent("");
              }}
              onEditContentChange={setEditContent}
              onSaveEdit={handleEdit}
              onBranch={handleBranch}
            />
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <MessageBubble
              message={{
                id: "streaming",
                conversationId: activeConversationId,
                role: "assistant",
                content: streamingContent,
                attachments: null,
                metadata: null,
                edited: false,
                createdAt: new Date().toISOString(),
              }}
              copiedId={null}
              onCopy={handleCopy}
              onRegenerate={() => {}}
              isGenerating={true}
              isEditing={false}
              editContent=""
              hasSubsequentMessages={false}
              onStartEdit={() => {}}
              onCancelEdit={() => {}}
              onEditContentChange={() => {}}
              onSaveEdit={() => {}}
              onBranch={() => {}}
            />
          )}

          {uiStore.isGenerating && !streamingContent && (
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 py-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Bottom anchor for auto-scroll */}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-6 right-8 rounded-full shadow-lg border animate-in fade-in slide-in-from-bottom-2 duration-300 z-10"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onRegenerate: (id: string) => void;
  isGenerating: boolean;
  isEditing: boolean;
  editContent: string;
  hasSubsequentMessages: boolean;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onSaveEdit: (messageId: string) => void;
  onBranch: (messageId: string) => void;
}

function MessageBubble({ message, copiedId, onCopy, onRegenerate, isGenerating, isEditing, editContent, hasSubsequentMessages, onStartEdit, onCancelEdit, onEditContentChange, onSaveEdit, onBranch }: MessageBubbleProps) {
  const [showRaw, setShowRaw] = useState(false);
  const { agents } = useAgentStore();
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const agent = message.agentId ? agents.find(a => a.id === message.agentId) : null;

  let attachments: Attachment[] = [];
  try {
    attachments = message.attachments ? JSON.parse(message.attachments) : [];
  } catch {}

  let messageMetadata: MessageMetadata | null = null;
  try {
    messageMetadata = message.metadata ? JSON.parse(message.metadata) : null;
  } catch {}

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSaveEdit(message.id);
    }
    if (e.key === "Escape") {
      onCancelEdit();
    }
  };

  return (
    <div className={cn("flex items-start gap-3 group", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full shrink-0 overflow-hidden",
          isUser ? "bg-primary text-primary-foreground" : (agent ? "bg-primary/20" : "bg-primary/10")
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          agent ? (
            <span className="text-[10px]">{agent.avatar || agent.name.charAt(0)}</span>
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          )
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 max-w-[85%]", isUser && "flex flex-col items-end")}>
        {isAssistant && agent && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-[10px] font-bold text-primary">{agent.name}</span>
            <span className="text-[9px] text-muted-foreground opacity-70">({agent.role})</span>
          </div>
        )}
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-2 mb-2", isUser && "justify-end")}>
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground"
              >
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{att.name}</span>
                <span className="text-[10px]">
                  {(att.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted/50 rounded-tl-md"
          )}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                className="w-full bg-background/80 text-foreground rounded-md p-2 text-sm resize-none min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                onKeyDown={handleEditKeyDown}
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => onSaveEdit(message.id)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                  onClick={onCancelEdit}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isGenerating && (
                <span className="inline-block w-1.5 h-4 bg-current/70 animate-pulse ml-0.5" />
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Tool calls */}
        {isAssistant && <ToolCallDisplay toolCalls={message.toolCalls} />}

        {/* Action buttons */}
        {isAssistant && !isGenerating && (
          <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCopy(message.content, message.id)}
            >
              {copiedId === message.id ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRegenerate(message.id)}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <ReadAloud text={message.content} />
            {messageMetadata?.tokens?.total != null && (
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-muted/60",
                  getTokenColor(messageMetadata.tokens.total)
                )}
                title={`Prompt: ${formatTokens(messageMetadata.tokens.prompt || 0)} / Completion: ${formatTokens(messageMetadata.tokens.completion || 0)}`}
              >
                {formatTokens(messageMetadata.tokens.total)}
              </span>
            )}
          </div>
        )}

        {isUser && !isGenerating && !isEditing && (
          <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onStartEdit(message)}
              title="Edit message"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {hasSubsequentMessages && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onBranch(message.id)}
                title="Fork conversation"
              >
                <GitBranch className="h-3 w-3" />
              </Button>
            )}
            {message.edited && (
              <span className="text-[10px] text-muted-foreground/70">(edited)</span>
            )}
          </div>
        )}

        {showRaw && isAssistant && (
          <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-auto max-h-60">
            {message.content}
          </pre>
        )}
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const suggestions = [
    {
      title: "Explain a concept",
      prompt: "Explain quantum computing in simple terms",
    },
    {
      title: "Write code",
      prompt: "Write a Python script to sort a list of numbers using merge sort",
    },
    {
      title: "Analyze data",
      prompt: "Help me analyze my sales data and identify trends",
    },
    {
      title: "Creative writing",
      prompt: "Write a short story about a robot learning to paint",
    },
  ];

  return (
    <div className="max-w-xl mx-auto w-full px-4 text-center space-y-8">
      <div className="space-y-3 py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Gemini Desktop</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Your AI assistant powered by Gemini CLI. Ask anything, attach files, or try one of the suggestions below.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {suggestions.map((s) => (
          <button
            key={s.title}
            className="flex flex-col items-start gap-1.5 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left group"
            onClick={() => {
              const input = document.querySelector<HTMLTextAreaElement>("textarea.chat-input");
              if (input) {
                // Dispatch input event to trigger the send handler
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(input, s.prompt);
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }}
          >
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              {s.title}
            </span>
            <span className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
