'use client';

// ============================================================
// Agentic OS V2 — Terminal Panel (Bottom)
// ============================================================
import { useOSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Terminal as TerminalIcon, X, Plus, Trash2, CornerUpLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'warning';
  content: string;
}

export function TerminalPanel() {
  const { terminalOpen, setTerminalOpen, terminalSessions, addTerminalSession, removeTerminalSession } = useOSStore();
  const [activeSession, setActiveSession] = useState('default');
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: '1', type: 'output', content: 'Agentic OS Terminal v2.0 — Type naturally or use commands...' },
    { id: '2', type: 'output', content: 'Ready.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = useCallback(async (cmd: string) => {
    const inputLine: TerminalLine = {
      id: uuidv4(),
      type: 'input',
      content: `$ ${cmd}`,
    };
    setLines((prev) => [...prev, inputLine]);
    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, sessionId: activeSession, naturalLanguage: true }),
      });
      const data = await response.json() as {
        result?: { output: string; exitCode: number };
        translatedCommand?: string;
      };

      if (data.translatedCommand && data.translatedCommand !== cmd) {
        setLines((prev) => [...prev, {
          id: uuidv4(),
          type: 'output',
          content: `→ ${data.translatedCommand}`,
        }]);
      }

      const output = data.result?.output ?? 'Command executed.';
      const exitCode = data.result?.exitCode ?? 0;
      setLines((prev) => [...prev, {
        id: uuidv4(),
        type: exitCode === 0 ? 'output' : 'error',
        content: output,
      }]);
    } catch (error) {
      setLines((prev) => [...prev, {
        id: uuidv4(),
        type: 'error',
        content: 'Error: Failed to execute command.',
      }]);
    }
  }, [activeSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      executeCommand(input.trim());
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] ?? '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] ?? '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  if (!terminalOpen) return null;

  return (
    <div className="border-t border-border bg-[#0a0a12] flex flex-col h-[200px] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[#00ff88]" />
          <span className="text-xs font-medium text-foreground">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const id = `session-${Date.now()}`;
              addTerminalSession(id);
              setActiveSession(id);
              setLines([{ id: uuidv4(), type: 'output', content: 'New session started.' }]);
            }}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setLines([]); }}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTerminalOpen(false)}
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Session tabs */}
      {terminalSessions.length > 0 && (
        <div className="flex items-center gap-1 px-2 h-7 border-b border-border shrink-0 overflow-x-auto">
          <button
            onClick={() => { setActiveSession('default'); setLines([{ id: uuidv4(), type: 'output', content: 'Switched to default session.' }]); }}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] shrink-0',
              activeSession === 'default' ? 'bg-[#E8751A]/20 text-[#E8751A]' : 'text-muted-foreground'
            )}
          >
            Default
          </button>
          {terminalSessions.map((sid) => (
            <button
              key={sid}
              onClick={() => { setActiveSession(sid); setLines([{ id: uuidv4(), type: 'output', content: 'Switched session.' }]); }}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] shrink-0',
                activeSession === sid ? 'bg-[#E8751A]/20 text-[#E8751A]' : 'text-muted-foreground'
              )}
            >
              {sid.slice(-6)}
            </button>
          ))}
        </div>
      )}

      {/* Output */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 font-mono text-xs space-y-0.5">
          {lines.map((line) => (
            <div
              key={line.id}
              className={cn(
                'whitespace-pre-wrap break-all',
                line.type === 'input' && 'text-[#00ff88]',
                line.type === 'output' && 'text-foreground',
                line.type === 'error' && 'text-[#E6394A]',
                line.type === 'warning' && 'text-yellow-500',
              )}
            >
              {line.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 h-8 border-t border-border shrink-0">
        <CornerUpLeft className="w-3 h-3 text-[#00ff88] shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type naturally or use commands..."
          className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
