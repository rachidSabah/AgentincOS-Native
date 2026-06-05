"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Wrench,
  Terminal,
  Search,
  Calculator,
  FileText,
  Clock,
  Monitor,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface DisplayToolCall {
  name: string;
  arguments: Record<string, any>;
  result: string;
  status: "success" | "error";
  timestamp: string;
}

function getToolIcon(name: string) {
  switch (name) {
    case "calculator":
      return <Calculator className="h-3.5 w-3.5" />;
    case "read_file":
    case "write_file":
    case "list_files":
      return <FileText className="h-3.5 w-3.5" />;
    case "web_search":
      return <Search className="h-3.5 w-3.5" />;
    case "local_cmd":
      return <Terminal className="h-3.5 w-3.5" />;
    case "get_current_time":
      return <Clock className="h-3.5 w-3.5" />;
    case "get_system_info":
      return <Monitor className="h-3.5 w-3.5" />;
    default:
      return <Wrench className="h-3.5 w-3.5" />;
  }
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  } catch {
    return ts;
  }
}

function formatArgs(args: Record<string, any>): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function formatResult(result: string): string {
  try {
    const parsed = JSON.parse(result);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return result;
  }
}

function ToolCallCard({ call }: { call: DisplayToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const isSuccess = call.status === "success";

  return (
    <div
      className={cn(
        "my-1.5 rounded-lg border text-xs overflow-hidden",
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      )}
    >
      <button
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn(isSuccess ? "text-emerald-500" : "text-red-500")}>
          {getToolIcon(call.name)}
        </span>
        <span className="font-medium flex-1">{call.name}</span>
        <span className="text-muted-foreground/70 text-[10px]">
          {formatTimestamp(call.timestamp)}
        </span>
        {isSuccess ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        ) : (
          <XCircle className="h-3 w-3 text-red-500" />
        )}
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2">
          {Object.keys(call.arguments).length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">
                Arguments
              </p>
              <pre className="p-2 rounded bg-muted/50 text-[11px] overflow-auto max-h-32">
                {formatArgs(call.arguments)}
              </pre>
            </div>
          )}
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5">
              Result
            </p>
            <pre
              className={cn(
                "p-2 rounded text-[11px] overflow-auto max-h-48 whitespace-pre-wrap break-all",
                isSuccess ? "bg-emerald-500/5" : "bg-red-500/5"
              )}
            >
              {formatResult(call.result)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolCallDisplayProps {
  toolCalls?: string | null;
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (!toolCalls) return null;

  let calls: DisplayToolCall[] = [];
  try {
    calls = JSON.parse(toolCalls);
    if (!Array.isArray(calls) || calls.length === 0) return null;
  } catch {
    return null;
  }

  return (
    <div className="mt-1">
      {calls.map((call, i) => (
        <ToolCallCard key={i} call={call} />
      ))}
    </div>
  );
}
