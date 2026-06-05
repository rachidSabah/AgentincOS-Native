'use client';

// ============================================================
// Agentic OS V2 — Chat Workspace
// ============================================================
import { useOSStore } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';
import { BrainVisualizer } from './brain-visualizer';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Loader2, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRef, useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

export function ChatWorkspace() {
  const {
    chatMessages, addChatMessage, isProcessing, setIsProcessing,
    activeBrain, setActiveBrain, setBrainOutputs, setArtifactPanelOpen, setActiveArtifact,
  } = useOSStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isProcessing]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });

      const data = await response.json() as {
        response: string;
        brainResults: ChatMessage['brainResults'];
        artifacts: ChatMessage['artifacts'];
      };

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: data.response ?? 'No response received.',
        timestamp: Date.now(),
        brainResults: data.brainResults,
        artifacts: data.artifacts,
      };

      addChatMessage(assistantMessage);

      if (data.brainResults) {
        setBrainOutputs(data.brainResults);
      }

      if (data.artifacts?.length) {
        setActiveArtifact(data.artifacts[0]);
        setArtifactPanelOpen(true);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please check that your AI provider is configured in Settings.',
        timestamp: Date.now(),
      };
      addChatMessage(errorMessage);
    } finally {
      setIsProcessing(false);
      setActiveBrain(null);
    }
  }, [input, isProcessing, addChatMessage, setIsProcessing, setActiveBrain, setBrainOutputs, setArtifactPanelOpen, setActiveArtifact]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brain Visualizer */}
      <BrainVisualizer />

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Bot className="w-12 h-12 mb-4 text-[#9d4edd]/50" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm mt-1">Ask me anything — I&apos;ll process it through the 7-brain pipeline</p>
            </div>
          )}

          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 p-4 rounded-xl',
                msg.role === 'user'
                  ? 'bg-[#E8751A]/5 border border-[#E8751A]/10'
                  : 'bg-card border border-border'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                msg.role === 'user'
                  ? 'bg-[#E8751A]/20 text-[#E8751A]'
                  : 'bg-[#9d4edd]/20 text-[#9d4edd]'
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  {msg.role === 'user' ? 'You' : 'Agentic OS'}
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.artifacts && msg.artifacts.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {msg.artifacts.map((artifact) => (
                      <button
                        key={artifact.id}
                        onClick={() => { setActiveArtifact(artifact); setArtifactPanelOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9d4edd]/10 border border-[#9d4edd]/20 text-[#9d4edd] text-xs hover:bg-[#9d4edd]/20 transition-colors"
                      >
                        <FileCode className="w-3 h-3" />
                        {artifact.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#9d4edd]/20 text-[#9d4edd]">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Agentic OS</div>
                <div className="text-sm text-muted-foreground animate-pulse">
                  Processing through brain pipeline...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-32 resize-none bg-card border-border"
            rows={1}
            disabled={isProcessing}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
            className="bg-[#E8751A] hover:bg-[#E8751A]/80 text-white shrink-0 px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
