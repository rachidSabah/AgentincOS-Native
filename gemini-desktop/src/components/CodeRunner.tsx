"use client";

import { useState } from "react";
import { Play, Code, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CodeRunnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
] as const;

export function CodeRunner({ open, onOpenChange }: CodeRunnerProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "javascript" | "typescript" | "python"
  >("javascript");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleRun = async () => {
    if (!code.trim()) return;

    setIsRunning(true);
    setOutput("");
    setError(null);
    setExecutionTime(null);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      const data = await res.json();

      if (data.output) setOutput(data.output);
      if (data.error) setError(data.error);
      if (data.executionTime !== undefined)
        setExecutionTime(data.executionTime);
    } catch (err: any) {
      setError(err.message || "Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Code Runner
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as typeof language)
              }
              className="h-8 px-2 rounded-md border border-border bg-background text-xs"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            {executionTime !== null && (
              <span className="text-[10px] text-muted-foreground">
                {executionTime}ms
              </span>
            )}

            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleRun}
              disabled={isRunning || !code.trim()}
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </Button>
          </div>

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// Write your code here..."
            className="flex-1 min-h-[200px] font-mono text-sm resize-none bg-background border-border"
            spellCheck={false}
          />

          <div className="flex-1 min-h-[120px] rounded-lg border border-border bg-muted/30 p-3 overflow-auto">
            {isRunning ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running...
              </div>
            ) : output || error ? (
              <div className="space-y-2">
                {output && (
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
                    {output}
                  </pre>
                )}
                {error && (
                  <pre className="text-xs font-mono text-red-500 dark:text-red-400 whitespace-pre-wrap break-all">
                    {error}
                  </pre>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Output will appear here
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
