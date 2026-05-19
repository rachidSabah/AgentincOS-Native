"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { useChatStore, useUIStore, useSettingsStore, useAgentStore, usePromptStore } from "@/lib/stores";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Paperclip,
  Square,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Play,
  Globe,
} from "lucide-react";
import { SearchPanel } from "@/components/SearchPanel";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";
import { VoiceInput } from "@/components/VoiceInput";
import { CodeRunner } from "@/components/CodeRunner";

const STANDARD_PROMPTS = [
  { title: "💡 Explain Code", content: "Can you explain this code in detail and break down how it works?" },
  { title: "🧪 Write Unit Tests", content: "Please write robust unit tests for this code using standard best practices." },
  { title: "♻️ Refactor Code", content: "How would you refactor this code to make it more elegant, clean, and performant?" },
  { title: "🐞 Fix Bug", content: "I am experiencing an issue. Can you help me find the bug in this code and fix it?" },
  { title: "🚀 Optimize Performance", content: "Can you optimize this code for maximum efficiency and speed?" },
  { title: "📚 Document Code", content: "Please add clear, concise, and helpful docstrings/comments to this code." }
];

export function ChatInput() {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [codeRunnerOpen, setCodeRunnerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    activeConversationId,
    addConversation,
    addMessage,
    appendStreamingContent,
    clearStreamingContent,
    setStreamingContent,
    messages,
  } = useChatStore();
  const uiStore = useUIStore();
  const { settings } = useSettingsStore();
  const { activeAgentId } = useAgentStore();
  const { prompts } = usePromptStore();
  const activeConversation = useChatStore.getState().getActiveConversation();

  const allPrompts = [...prompts.map(p => ({ title: `⭐ ${p.title}`, content: p.content })), ...STANDARD_PROMPTS];

  const promptsScrollRef = useRef<HTMLDivElement>(null);
  const scrollPrompts = (direction: "left" | "right") => {
    if (promptsScrollRef.current) {
      const amount = direction === "left" ? -200 : 200;
      promptsScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;
    if (uiStore.isGenerating) return;

    let convId = activeConversationId;
    const model = activeConversation?.model || settings.defaultModel;
    const systemPrompt = activeConversation?.systemPrompt || settings.systemPrompt || undefined;

    // Create conversation if none active
    if (!convId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmed.substring(0, 60) || "New Chat",
            model,
            systemPrompt: systemPrompt || null,
          }),
        });
        const newConv = await res.json();
        convId = newConv.id;
        addConversation(newConv);
        useChatStore.getState().setActiveConversationId(convId);
      } catch {
        return;
      }
    }

    // Save user message
    const userMessage = {
      id: crypto.randomUUID(),
      conversationId: convId!,
      role: "user" as const,
      content: trimmed,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: trimmed,
          agentId: activeAgentId,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save user message");
      const savedMsg = await res.json();
      addMessage(savedMsg);
    } catch {
      addMessage(userMessage);
    }

    // Clear input
    setInput("");
    setAttachments([]);
    uiStore.setIsGenerating(true);
    abortRef.current = false;

    try {
      // Build conversation history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          model,
          systemPrompt,
          agentId: activeAgentId,
          conversationHistory: history,
          files: attachments,
          apiKey: settings.apiKey || undefined,
          workspacePath: settings.workspacePath || "",
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader && !abortRef.current) {
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
                setStreamingContent(fullContent);
              } else if (data.type === "done") {
                clearStreamingContent();
                // Save assistant message to DB
                try {
                  const res = await fetch(`/api/conversations/${convId}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      role: "assistant",
                      content: fullContent,
                      agentId: activeAgentId,
                      metadata: { model, duration: data.duration },
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to save assistant message");
                  const assistantMsg = await res.json();
                  addMessage(assistantMsg);
                } catch {
                  addMessage({
                    id: crypto.randomUUID(),
                    conversationId: convId!,
                    role: "assistant",
                    content: fullContent,
                    attachments: null,
                    metadata: null,
                    createdAt: new Date().toISOString(),
                  });
                }
              } else if (data.type === "error") {
                clearStreamingContent();
                addMessage({
                  id: crypto.randomUUID(),
                  conversationId: convId!,
                  role: "assistant",
                  content: `**Error:** ${data.error}`,
                  attachments: null,
                  metadata: null,
                  createdAt: new Date().toISOString(),
                });
              }
            } catch {}
          }
        }
      }

      // Handle abort
      if (abortRef.current) {
        clearStreamingContent();
        if (fullContent) {
          addMessage({
            id: crypto.randomUUID(),
            conversationId: convId!,
            role: "assistant",
            content: fullContent + "\n\n*[Generation stopped]*",
            attachments: null,
            metadata: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      clearStreamingContent();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addMessage({
        id: crypto.randomUUID(),
        conversationId: convId!,
        role: "assistant",
        content: `**Error:** Failed to get response. ${errorMsg}`,
        attachments: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      });
    } finally {
      uiStore.setIsGenerating(false);
    }
  }, [input, attachments, activeConversationId, messages, settings, uiStore, activeConversation]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && settings.sendOnEnter) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.files) {
        setAttachments((prev) => [...prev, ...data.files]);
        toast.success(`${files.length} file(s) attached successfully`);
      } else {
        toast.error("Failed to upload files");
      }
    } catch {
      toast.error("Error uploading files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          {/* Horizontal Scrolling Quick Prompts Bar */}
          <div className="flex items-center gap-1 mb-1.5 border-b border-border/40 pb-1.5 select-none relative group/prompts">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary"
              onClick={() => scrollPrompts("left")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div 
              ref={promptsScrollRef}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth"
            >
              {allPrompts.map((p, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px] rounded-full shrink-0 font-medium bg-background/50 hover:bg-primary/10 hover:text-primary transition-all duration-200 border-border/60 hover:border-primary/20"
                  onClick={() => {
                    setInput((prev) => (prev ? prev + "\n" + p.content : p.content));
                    textareaRef.current?.focus();
                  }}
                >
                  {p.title}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary"
              onClick={() => scrollPrompts("right")}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs"
                >
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || uiStore.isGenerating}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Attach files</TooltipContent>
            </Tooltip>

            <VoiceInput
              onTranscript={(text) =>
                setInput((prev) => (prev ? prev + " " + text : text))
              }
              disabled={uiStore.isGenerating}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setCodeRunnerOpen(true)}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Code runner</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9 shrink-0", searchOpen && "text-primary")}
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Search web</TooltipContent>
            </Tooltip>

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Gemini..."
                className="chat-input min-h-[40px] max-h-[200px] resize-none rounded-xl px-4 py-2.5 text-sm bg-background border-border pr-12"
                rows={1}
                disabled={uiStore.isGenerating}
              />
            </div>

            {uiStore.isGenerating ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl"
                    onClick={handleStop}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Stop generation</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl"
                    onClick={handleSend}
                    disabled={!input.trim() && attachments.length === 0}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Send message (Enter)</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center justify-center mt-1.5">
            <p className="text-[10px] text-muted-foreground/60">
              {settings.sendOnEnter ? "Enter to send, Shift+Enter for new line" : "Ctrl+Enter to send"}
            </p>
          </div>
        </div>

        <SearchPanel
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
        />

        <CodeRunner open={codeRunnerOpen} onOpenChange={setCodeRunnerOpen} />
      </div>
    </TooltipProvider>
  );
}
