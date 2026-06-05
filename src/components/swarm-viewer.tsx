'use client';

// ============================================================
// Agentic OS V2 — Swarm Viewer
// ============================================================
import { cn } from '@/lib/utils';
import type { AgentType, TaskComplexity } from '@/lib/types';
import { Network, Play, Bot, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useCallback } from 'react';

const AGENT_COLORS: Record<AgentType, string> = {
  planner: '#FFB627',
  architect: '#00ffff',
  researcher: '#2E86AB',
  coder: '#00ff88',
  reviewer: '#9d4edd',
  verifier: '#E8751A',
  memory: '#1B998B',
};

interface SwarmResult {
  agentId: string;
  agentType: string;
  result: string;
  success: boolean;
}

interface SwarmData {
  id: string;
  task: string;
  complexity: TaskComplexity;
  agentIds: string[];
  status: string;
}

export function SwarmViewer() {
  const [swarm, setSwarm] = useState<SwarmData | null>(null);
  const [results, setResults] = useState<SwarmResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [taskInput, setTaskInput] = useState('');

  const autoFormSwarm = useCallback(async () => {
    if (!taskInput.trim()) return;
    setIsExecuting(true);
    try {
      const response = await fetch('/api/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput }),
      });
      const data = await response.json() as {
        swarm: SwarmData;
        result: { results: SwarmResult[] };
      };
      setSwarm(data.swarm);
      setResults(data.result?.results ?? []);
    } catch {
      // Error handling
    } finally {
      setIsExecuting(false);
    }
  }, [taskInput]);

  const complexityColors: Record<TaskComplexity, string> = {
    simple: '#00ff88',
    medium: '#FFB627',
    complex: '#E8751A',
    enterprise: '#E6394A',
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Network className="w-6 h-6 text-[#9d4edd]" />
        <h2 className="text-xl font-bold text-foreground">Swarm Intelligence</h2>
      </div>

      {/* Input */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && autoFormSwarm()}
              placeholder="Describe a task for the swarm..."
              className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[#E8751A]/50"
            />
            <Button
              onClick={autoFormSwarm}
              disabled={isExecuting || !taskInput.trim()}
              className="bg-[#E8751A] hover:bg-[#E8751A]/80 text-white"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="ml-2">Auto-Form</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Swarm topology */}
      {swarm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Swarm Topology</CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: `${complexityColors[swarm.complexity]}30`, color: complexityColors[swarm.complexity] }}
                >
                  {swarm.complexity}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    swarm.status === 'completed' && 'border-[#00ff88]/30 text-[#00ff88]',
                    swarm.status === 'active' && 'border-[#FFB627]/30 text-[#FFB627]',
                    swarm.status === 'failed' && 'border-[#E6394A]/30 text-[#E6394A]',
                  )}
                >
                  {swarm.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Agent nodes visualization */}
            <div className="flex flex-wrap gap-3 justify-center py-4">
              {swarm.agentIds.map((agentId, i) => {
                const result = results[i];
                const agentType = (result?.agentType ?? 'coder') as AgentType;
                const color = AGENT_COLORS[agentType];
                return (
                  <div
                    key={agentId}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all"
                      style={{
                        backgroundColor: `${color}10`,
                        borderColor: `${color}40`,
                        color,
                      }}
                    >
                      <Bot className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium capitalize" style={{ color }}>{agentType}</span>
                    {result && (
                      result.success
                        ? <CheckCircle2 className="w-3 h-3 text-[#00ff88]" />
                        : <XCircle className="w-3 h-3 text-[#E6394A]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Communication lines */}
            {swarm.agentIds.length > 1 && (
              <div className="flex items-center justify-center gap-1 py-2 text-[10px] text-muted-foreground">
                <Zap className="w-3 h-3 text-[#9d4edd]" />
                <span>Agents communicating via shared memory channel</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Agent Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {results.map((result, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-muted/20 border border-border text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 px-1.5 capitalize"
                      style={{
                        borderColor: `${AGENT_COLORS[result.agentType as AgentType] ?? '#888'}30`,
                        color: AGENT_COLORS[result.agentType as AgentType] ?? '#888',
                      }}
                    >
                      {result.agentType}
                    </Badge>
                    {result.success
                      ? <CheckCircle2 className="w-3 h-3 text-[#00ff88]" />
                      : <XCircle className="w-3 h-3 text-[#E6394A]" />
                    }
                  </div>
                  <div className="text-muted-foreground whitespace-pre-wrap">{result.result}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!swarm && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Network className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Describe a task to auto-form a swarm</p>
            <p className="text-xs mt-1">Simple: 1 agent · Medium: 3 agents · Complex: 7 agents</p>
          </div>
        </div>
      )}
    </div>
  );
}
