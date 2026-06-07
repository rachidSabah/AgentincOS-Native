'use client';

// ============================================================
// Agentic OS V2 — Cursor-Style File Editor
// ============================================================
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useOSStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode, FileText, Braces, ChevronDown, ChevronRight, X, Search,
  Folder, FolderOpen, Copy, Download, GitBranch, Sparkles, Eye, EyeOff,
  Replace, Check, ArrowUp, ArrowDown, Hash, Type, Space, Terminal,
  ChevronLeft, Command, Redo, Undo, MoreHorizontal, PanelLeftClose,
  PanelLeftOpen, Split, Code2, MessageSquare, FoldVertical, UnfoldVertical,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ─── Types ───

interface FileEntry {
  path: string;
  content: string;
  language: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  expanded?: boolean;
}

interface Breakpoint {
  line: number;
  enabled: boolean;
}

interface FoldedRange {
  startLine: number;
  endLine: number;
}

// ─── Demo Files ───

const DEMO_FILES: FileEntry[] = [
  {
    path: 'src/engine/kernel.ts',
    content: `// Agentic Kernel — Core orchestrator for the autonomous AI OS
// Handles task scheduling, event routing, and system lifecycle

export type KernelStatus = 'initializing' | 'running' | 'shutting_down' | 'stopped';

export interface KernelState {
  status: KernelStatus;
  uptime: number;
  totalEvents: number;
  activeTasks: number;
  registryCounts: {
    agents: number;
    brains: number;
    models: number;
    tools: number;
    skills: number;
    artifacts: number;
  };
}

export class AgenticKernel {
  private status: KernelStatus = 'stopped';
  private startTime: number = 0;
  private eventCount: number = 0;
  private taskQueue: ScheduledTask[] = [];

  constructor(private config: KernelConfig) {
    this.initialize();
  }

  async initialize(): Promise<void> {
    this.status = 'initializing';
    this.startTime = Date.now();

    try {
      await this.loadRegistries();
      await this.startEventLoop();
      await this.initializeBrains();

      this.status = 'running';
      this.emit('kernel:ready', { timestamp: Date.now() });
    } catch (error) {
      this.status = 'stopped';
      this.emit('kernel:error', { error: String(error) });
      throw error;
    }
  }

  private async loadRegistries(): Promise<void> {
    // Load agent, model, and skill registries
    const registries = ['agents', 'brains', 'models', 'tools', 'skills'];
    for (const reg of registries) {
      await this.discoverRegistry(reg);
    }
  }

  private async startEventLoop(): Promise<void> {
    // Start the main event processing loop
    setInterval(() => {
      this.processEvents();
      this.eventCount++;
    }, 1000);
  }

  private async initializeBrains(): Promise<void> {
    // Initialize the 7-brain pipeline
    const brains = [
      'planner', 'architect', 'researcher',
      'coder', 'reviewer', 'verifier', 'memory'
    ];

    for (const brain of brains) {
      await this.activateBrain(brain);
    }
  }

  async shutdown(): Promise<void> {
    this.status = 'shutting_down';
    await this.drainTaskQueue();
    await this.stopEventLoop();
    this.status = 'stopped';
    this.emit('kernel:shutdown', { timestamp: Date.now() });
  }

  getState(): KernelState {
    return {
      status: this.status,
      uptime: this.status === 'running' ? Date.now() - this.startTime : 0,
      totalEvents: this.eventCount,
      activeTasks: this.taskQueue.filter(t => t.status === 'running').length,
      registryCounts: this.getRegistryCounts(),
    };
  }

  private processEvents(): void {
    // Process queued events
  }

  private emit(event: string, data: unknown): void {
    // Emit kernel event
    console.log(\`[Kernel] \${event}\`, data);
  }

  private async discoverRegistry(name: string): Promise<void> {
    // Discover and load registry entries
  }

  private async activateBrain(name: string): Promise<void> {
    // Activate a brain in the pipeline
  }

  private async drainTaskQueue(): Promise<void> {
    // Wait for all tasks to complete
  }

  private async stopEventLoop(): Promise<void> {
    // Stop the event loop
  }

  private getRegistryCounts(): KernelState['registryCounts'] {
    return {
      agents: 0, brains: 7, models: 3,
      tools: 5, skills: 12, artifacts: 0,
    };
  }
}`,
    language: 'typescript',
  },
  {
    path: 'src/engine/brain-engine.ts',
    content: `// 7-Brain Pipeline — Multi-brain reasoning engine
// Each brain specializes in a different cognitive function

export interface BrainInput {
  message: string;
  conversationId?: string;
  workspaceId?: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: string; content: string }>;
}

export interface BrainOutput {
  brainId: number;
  name: string;
  result: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface BrainConfig {
  id: number;
  name: string;
  specialty: string;
  priority: number;
  modelProvider: string;
  temperature: number;
  maxTokens: number;
}

const BRAIN_CONFIGS: BrainConfig[] = [
  { id: 1, name: 'Planner', specialty: 'Task decomposition', priority: 1, modelProvider: 'openai', temperature: 0.7, maxTokens: 2048 },
  { id: 2, name: 'Architect', specialty: 'System design', priority: 2, modelProvider: 'claude', temperature: 0.5, maxTokens: 4096 },
  { id: 3, name: 'Researcher', specialty: 'Information gathering', priority: 3, modelProvider: 'gemini', temperature: 0.6, maxTokens: 2048 },
  { id: 4, name: 'Coder', specialty: 'Code generation', priority: 4, modelProvider: 'openai', temperature: 0.3, maxTokens: 8192 },
  { id: 5, name: 'Reviewer', specialty: 'Quality assurance', priority: 5, modelProvider: 'claude', temperature: 0.2, maxTokens: 2048 },
  { id: 6, name: 'Verifier', specialty: 'Testing & validation', priority: 6, modelProvider: 'openai', temperature: 0.1, maxTokens: 2048 },
  { id: 7, name: 'Memory', specialty: 'Context management', priority: 7, modelProvider: 'glm', temperature: 0.4, maxTokens: 1024 },
];

export class BrainEngine {
  private brains: Map<number, BrainConfig> = new Map();
  private activePipeline: BrainOutput[] = [];

  constructor() {
    for (const config of BRAIN_CONFIGS) {
      this.brains.set(config.id, config);
    }
  }

  async executePipeline(
    input: BrainInput,
    overlays?: string[],
  ): Promise<{ outputs: BrainOutput[]; finalResponse: string; totalDurationMs: number; status: string; artifacts: unknown[] }> {
    const startTime = Date.now();
    const outputs: BrainOutput[] = [];

    // Route to appropriate brains based on input
    const routedBrains = this.routeToBrains(input, overlays);

    for (const brainConfig of routedBrains) {
      const brainStart = Date.now();
      try {
        const result = await this.executeBrain(brainConfig, input, outputs);
        outputs.push({
          brainId: brainConfig.id,
          name: brainConfig.name,
          result,
          durationMs: Date.now() - brainStart,
          success: true,
        });
      } catch (error) {
        outputs.push({
          brainId: brainConfig.id,
          name: brainConfig.name,
          result: {},
          durationMs: Date.now() - brainStart,
          success: false,
          error: String(error),
        });
      }
    }

    this.activePipeline = outputs;

    return {
      outputs,
      finalResponse: this.mergeResults(outputs, input),
      totalDurationMs: Date.now() - startTime,
      status: outputs.every(o => o.success) ? 'completed' : 'partial',
      artifacts: [],
    };
  }

  private routeToBrains(input: BrainInput, overlays?: string[]): BrainConfig[] {
    // Simple routing: use all brains, filtered by overlays
    if (!overlays || overlays.length === 0) {
      return Array.from(this.brains.values());
    }
    return Array.from(this.brains.values()).filter(b =>
      overlays.some(o => b.name.toLowerCase().includes(o))
    );
  }

  private async executeBrain(config: BrainConfig, input: BrainInput, previousOutputs: BrainOutput[]): Promise<Record<string, unknown>> {
    // Execute a single brain with model routing
    return { specialty: config.specialty, processed: true };
  }

  private mergeResults(outputs: BrainOutput[], input: BrainInput): string {
    const successful = outputs.filter(o => o.success);
    return \`Processed through \${successful.length} brains: \${successful.map(o => o.name).join(', ')}\`;
  }
}`,
    language: 'typescript',
  },
  {
    path: 'src/lib/types.ts',
    content: `// Type Definitions — Core type system for Agentic OS V2

// ─── Brain Types ───
export type BrainID = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BrainInput {
  message: string;
  conversationId?: string;
  workspaceId?: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: string; content: string }>;
}

export interface BrainOutput {
  brainId: BrainID;
  name: string;
  result: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

// ─── Agent Types ───
export type AgentType = 'planner' | 'architect' | 'researcher' | 'coder' | 'reviewer' | 'verifier' | 'memory';

export type AgentStatus = 'idle' | 'active' | 'error';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  config: Record<string, unknown>;
  currentTask?: string;
}

// ─── Swarm Types ───
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'enterprise' | 'multi_swarm';

export interface SwarmConfig {
  id: string;
  task: string;
  complexity: TaskComplexity;
  agentIds: string[];
  status: SwarmStatus;
}

export type SwarmStatus = 'forming' | 'active' | 'completed' | 'failed' | 'cancelled';

// ─── Model Types ───
export type ModelProviderType =
  | 'openai' | 'claude' | 'gemini' | 'gemini-cli' | 'glm' | 'mistral' | 'qwen' | 'deepseek'
  | 'openrouter' | 'ollama' | 'lmstudio';

export interface ModelResponse {
  content: string;
  provider: ModelProviderType;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// ─── Artifact Types ───
export type ArtifactType = 'code' | 'markdown' | 'pdf' | 'docx' | 'image' | 'json' | 'yaml' | 'repo';

export interface ArtifactData {
  id: string;
  name: string;
  type: ArtifactType;
  content: string;
  language?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Navigation Types ───
export type ViewType = 'home' | 'chat' | 'agents' | 'swarm' | 'memory' | 'knowledge' | 'artifacts' | 'terminal' | 'settings';
`,
    language: 'typescript',
  },
  {
    path: 'src/app/api/chat/route.ts',
    content: `// Chat API Route — Main chat endpoint with brain pipeline
import { NextRequest, NextResponse } from 'next/server';
import { brainEngine } from '@/lib/brain-engine';
import { modelRouter } from '@/lib/model-router';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message: string;
      conversationId?: string;
      workspaceId?: string;
      overlays?: string[];
      useMultiModel?: boolean;
    };

    const { message, conversationId, workspaceId, overlays, useMultiModel } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Run Brain Engine pipeline
    const brainResult = await brainEngine.executePipeline(
      {
        message,
        conversationId,
        workspaceId,
      },
      overlays,
    );

    // Execute with model failover
    const modelResponse = await modelRouter.executeWithFailover({
      prompt: message,
      systemPrompt: 'You are Agentic OS, an advanced AI operating system.',
    });

    const finalResponse = modelResponse.success
      ? modelResponse.content
      : brainResult.finalResponse;

    return NextResponse.json({
      response: finalResponse,
      conversationId,
      brainResults: brainResult.outputs,
      durationMs: Date.now() - startTime,
      modelProvider: modelResponse.provider,
      tokensUsed: modelResponse.tokensUsed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
`,
    language: 'typescript',
  },
  {
    path: 'README.md',
    content: `# Agentic OS V2

Autonomous AI Operating System with 7-Brain Reasoning, Agent Swarms, and Multi-Model Failover.

## Features

- **7-Brain Pipeline**: Multi-brain reasoning architecture
  - Planner: Task decomposition
  - Architect: System design
  - Researcher: Information gathering
  - Coder: Code generation
  - Reviewer: Quality assurance
  - Verifier: Testing & validation
  - Memory: Context management

- **Agent Swarms**: Dynamic agent orchestration
  - Single agent for simple tasks
  - Light swarm for medium tasks
  - Standard swarm for complex tasks
  - Enterprise swarm for large projects
  - Multi-swarm for cross-domain tasks

- **Multi-Model Failover**: Automatic provider switching
  - OpenAI, Claude, Gemini, GLM
  - Circuit breaker pattern
  - Cost-optimized routing

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Start the kernel
bun run dev

# Open in browser
open http://localhost:3000
\`\`\`

## Architecture

The system is built around a central **Agentic Kernel** that orchestrates:
- Brain routing and execution
- Agent lifecycle management
- Memory and knowledge systems
- Model provider failover
- Self-healing and recovery

## License

MIT
`,
    language: 'markdown',
  },
  {
    path: 'src/lib/config.json',
    content: `{
  "kernel": {
    "maxConcurrentTasks": 10,
    "eventLoopInterval": 1000,
    "healthCheckInterval": 30000
  },
  "brains": [
    { "id": 1, "name": "Planner", "temperature": 0.7 },
    { "id": 2, "name": "Architect", "temperature": 0.5 },
    { "id": 3, "name": "Researcher", "temperature": 0.6 },
    { "id": 4, "name": "Coder", "temperature": 0.3 },
    { "id": 5, "name": "Reviewer", "temperature": 0.2 },
    { "id": 6, "name": "Verifier", "temperature": 0.1 },
    { "id": 7, "name": "Memory", "temperature": 0.4 }
  ],
  "models": {
    "primary": "openai",
    "fallback": ["claude", "gemini", "glm"],
    "circuitBreaker": {
      "failureThreshold": 3,
      "resetTimeout": 30000
    }
  }
}`,
    language: 'json',
  },
];

// ─── Helper: Build file tree from paths ───

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isFolder: true, children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = {
          name: part,
          path,
          isFolder: !isFile,
          children: [],
          expanded: true,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: folders first, then files
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(root.children);

  return root;
}

// ─── Helper: File icon based on extension ───

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return <FileCode className="w-4 h-4 text-[#3178c6]" />;
    case 'js': case 'jsx': return <FileCode className="w-4 h-4 text-[#f7df1e]" />;
    case 'py': return <FileCode className="w-4 h-4 text-[#3572A5]" />;
    case 'json': return <Braces className="w-4 h-4 text-[#9d4edd]" />;
    case 'md': return <FileText className="w-4 h-4 text-[#00ff88]" />;
    case 'css': return <FileCode className="w-4 h-4 text-[#563d7c]" />;
    case 'yaml': case 'yml': return <FileText className="w-4 h-4 text-[#cb171e]" />;
    default: return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', json: 'json', md: 'markdown', css: 'css',
    yaml: 'yaml', yml: 'yaml', sql: 'sql', rs: 'rust', go: 'go',
  };
  return map[ext ?? ''] ?? 'text';
}

// ─── Minimap Component ───

function Minimap({ content, cursorLine, scrollPercent }: { content: string; cursorLine: number; scrollPercent: number }) {
  const lines = content.split('\n');
  const visibleLines = Math.min(lines.length, 40);
  const viewportStart = Math.floor(scrollPercent * Math.max(0, lines.length - visibleLines));

  return (
    <div className="w-14 h-full bg-[#0a0a18]/80 border-l border-border/30 overflow-hidden relative select-none shrink-0">
      <div className="py-1 px-0.5" style={{ fontSize: '1.5px', lineHeight: '2.5px', fontFamily: 'monospace' }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'h-[2.5px] rounded-[0.5px] mb-[0.5px]',
              i === cursorLine - 1 ? 'bg-[#E8751A]/60' :
              i >= viewportStart && i < viewportStart + visibleLines ? 'bg-foreground/15' : 'bg-foreground/8'
            )}
            style={{ width: `${Math.min(100, (line.length / 80) * 100)}%` }}
          />
        ))}
      </div>
      {/* Viewport indicator */}
      <div
        className="absolute left-0 right-0 bg-foreground/5 border-y border-foreground/10"
        style={{
          top: `${(viewportStart / Math.max(1, lines.length)) * 100}%`,
          height: `${(visibleLines / Math.max(1, lines.length)) * 100}%`,
        }}
      />
    </div>
  );
}

// ─── File Tree Node Component ───

function FileTreeNode({
  node,
  activePath,
  onFileClick,
  onToggle,
  depth,
  searchQuery,
}: {
  node: TreeNode;
  activePath: string;
  onFileClick: (path: string) => void;
  onToggle: (path: string) => void;
  depth: number;
  searchQuery: string;
}) {
  const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.path.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingChild = node.children.some(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (searchQuery && !matchesSearch && !hasMatchingChild) return null;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 cursor-pointer text-xs hover:bg-muted/30 transition-colors',
          !node.isFolder && node.path === activePath && 'bg-[#E8751A]/10 text-[#E8751A]',
          !node.isFolder && node.path !== activePath && 'text-muted-foreground hover:text-foreground',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (node.isFolder) {
            onToggle(node.path);
          } else {
            onFileClick(node.path);
          }
        }}
      >
        {node.isFolder ? (
          <>
            {node.expanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            {node.expanded ? (
              <FolderOpen className="w-4 h-4 text-[#FFB627] shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-[#FFB627] shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.isFolder && node.expanded && (
        <div>
          {node.children.map(child => (
            <FileTreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              onFileClick={onFileClick}
              onToggle={onToggle}
              depth={depth + 1}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search & Replace Bar ───

function SearchReplaceBar({
  searchQuery,
  setSearchQuery,
  replaceQuery,
  setReplaceQuery,
  isReplaceOpen,
  useRegex,
  setUseRegex,
  matchCount,
  currentMatch,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  replaceQuery: string;
  setReplaceQuery: (q: string) => void;
  isReplaceOpen: boolean;
  useRegex: boolean;
  setUseRegex: (r: boolean) => void;
  matchCount: number;
  currentMatch: number;
  onNext: () => void;
  onPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-2 right-4 z-20 bg-[#0d0d20] border border-border rounded-lg p-2 shadow-xl flex flex-col gap-1.5 min-w-[320px]"
    >
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-7 text-xs pl-7 pr-2 bg-muted/20 border-border/50"
            autoFocus
          />
        </div>
        <span className="text-[10px] text-muted-foreground min-w-[50px] text-center">
          {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No matches'}
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onPrev}>
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onNext}>
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost" size="sm"
          className={cn('h-7 w-7 p-0', useRegex && 'text-[#E8751A]')}
          onClick={() => setUseRegex(!useRegex)}
          title="Use Regex"
        >
          <Code2 className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>
      {isReplaceOpen && (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Replace className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace..."
              className="h-7 text-xs pl-7 pr-2 bg-muted/20 border-border/50"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={onReplace}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={onReplaceAll}>
            All
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Command Palette ───

function CommandPalette({
  isOpen,
  onClose,
  onCommand,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: 'rename', label: 'Rename Variable', icon: Type, description: 'Rename a variable across the file' },
    { id: 'extract', label: 'Extract Function', icon: Code2, description: 'Extract selection into a function' },
    { id: 'comment', label: 'Add Comment', icon: MessageSquare, description: 'AI-generated comment for selection' },
    { id: 'format', label: 'Format Code', icon: Redo, description: 'Format the current file' },
    { id: 'fold-all', label: 'Fold All', icon: FoldVertical, description: 'Fold all code blocks' },
    { id: 'unfold-all', label: 'Unfold All', icon: UnfoldVertical, description: 'Unfold all code blocks' },
    { id: 'diff', label: 'Toggle Diff View', icon: GitBranch, description: 'Show/hide git-style diff' },
    { id: 'ask-ai', label: 'Ask AI', icon: Sparkles, description: 'Get AI suggestions for current context' },
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute top-12 left-1/2 -translate-x-1/2 z-30 w-[420px] bg-[#0d0d20] border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Command className="w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="h-8 text-sm bg-transparent border-none focus:ring-0 focus:outline-none"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
        {filtered.map(cmd => {
          const Icon = cmd.icon;
          return (
            <div
              key={cmd.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => { onCommand(cmd.id); onClose(); }}
            >
              <Icon className="w-4 h-4 text-[#E8751A] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">{cmd.label}</div>
                <div className="text-[10px] text-muted-foreground">{cmd.description}</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">No matching commands</div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Context Menu ───

function TabContextMenu({
  x,
  y,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#0d0d20] border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {[
        { label: 'Close', action: onCloseTab, shortcut: '⌘W' },
        { label: 'Close Others', action: onCloseOthers },
        { label: 'Close All', action: onCloseAll },
      ].map(item => (
        <div
          key={item.label}
          className="flex items-center justify-between px-3 py-1.5 text-xs text-foreground hover:bg-muted/30 cursor-pointer transition-colors"
          onClick={() => { item.action(); onClose(); }}
        >
          <span>{item.label}</span>
          {item.shortcut && <span className="text-muted-foreground text-[10px]">{item.shortcut}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── AI Ghost Text ───

function AIGhostText({ text, onAccept, onDismiss }: { text: string; onAccept: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAccept, onDismiss]);

  return (
    <span className="text-foreground/30 italic select-none">{text}</span>
  );
}

// ─── Main FileEditor Component ───

export function FileEditor() {
  const { setArtifactPanelOpen, setActiveArtifact } = useOSStore();

  // Files state
  const [files, setFiles] = useState<FileEntry[]>(DEMO_FILES);
  const [activeFilePath, setActiveFilePath] = useState(DEMO_FILES[0].path);
  const [openTabs, setOpenTabs] = useState<string[]>([DEMO_FILES[0].path]);
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [originalContents, setOriginalContents] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    DEMO_FILES.forEach(f => { map[f.path] = f.content; });
    return map;
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const set = new Set<string>();
    DEMO_FILES.forEach(f => {
      const parts = f.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        set.add(parts.slice(0, i).join('/'));
      }
    });
    return set;
  });

  // Editor state
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [foldedRanges, setFoldedRanges] = useState<FoldedRange[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  // Search & Replace state
  const [searchOpen, setSearchOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Command palette
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);

  // AI suggestion
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);

  // Active file
  const activeFile = useMemo(() => files.find(f => f.path === activeFilePath), [files, activeFilePath]);

  // File tree
  const tree = useMemo(() => buildTree(files), [files]);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery || !activeFile) return [];
    try {
      const regex = useRegex ? new RegExp(searchQuery, 'gi') : new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches: number[] = [];
      const lines = activeFile.content.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) matches.push(i + 1);
      });
      return matches;
    } catch {
      return [];
    }
  }, [searchQuery, activeFile, useRegex]);

  // Diff computation
  const diffLines = useMemo(() => {
    if (!showDiff || !activeFile) return [];
    const original = originalContents[activeFile.path] ?? '';
    const originalLines = original.split('\n');
    const currentLines = activeFile.content.split('\n');
    const result: Array<{ type: 'same' | 'add' | 'del'; line: string; origLineNum?: number; newLineNum?: number }> = [];
    const maxLen = Math.max(originalLines.length, currentLines.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < originalLines.length && i < currentLines.length) {
        if (originalLines[i] === currentLines[i]) {
          result.push({ type: 'same', line: currentLines[i], origLineNum: i + 1, newLineNum: i + 1 });
        } else {
          result.push({ type: 'del', line: originalLines[i], origLineNum: i + 1 });
          result.push({ type: 'add', line: currentLines[i], newLineNum: i + 1 });
        }
      } else if (i < originalLines.length) {
        result.push({ type: 'del', line: originalLines[i], origLineNum: i + 1 });
      } else {
        result.push({ type: 'add', line: currentLines[i], newLineNum: i + 1 });
      }
    }
    return result;
  }, [showDiff, activeFile, originalContents]);

  // Handlers
  const openFile = useCallback((path: string) => {
    setActiveFilePath(path);
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
    setCursorLine(1);
    setCursorCol(1);
    setFoldedRanges([]);
  }, [openTabs]);

  const closeTab = useCallback((path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newTabs = openTabs.filter(t => t !== path);
    if (newTabs.length === 0) {
      setOpenTabs([]);
      setActiveFilePath('');
    } else {
      setOpenTabs(newTabs);
      if (activeFilePath === path) {
        setActiveFilePath(newTabs[newTabs.length - 1]);
      }
    }
    setModifiedFiles(prev => { const n = new Set(prev); n.delete(path); return n; });
  }, [openTabs, activeFilePath]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints(prev => {
      const existing = prev.find(b => b.line === line);
      if (existing) {
        return prev.filter(b => b.line !== line);
      }
      return [...prev, { line, enabled: true }];
    });
  }, []);

  const toggleFold = useCallback((line: number) => {
    const existing = foldedRanges.find(r => r.startLine === line);
    if (existing) {
      setFoldedRanges(prev => prev.filter(r => r.startLine !== line));
    } else {
      // Find end of block
      if (!activeFile) return;
      const lines = activeFile.content.split('\n');
      let depth = 0;
      let endLine = line;
      for (let i = line - 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.endsWith('{')) depth++;
        if (trimmed.startsWith('}') || trimmed === '}') depth--;
        if (depth <= 0 && i >= line - 1) {
          endLine = i + 1;
          break;
        }
      }
      setFoldedRanges(prev => [...prev, { startLine: line, endLine }]);
    }
  }, [foldedRanges, activeFile]);

  const handleAskAI = useCallback(async () => {
    if (!activeFile) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Suggest improvements for this ${activeFile.language} code. Current cursor is at line ${cursorLine}. File: ${activeFile.path}\n\nContent:\n${activeFile.content.slice(0, 2000)}`,
        }),
      });
      const data = await res.json();
      const suggestion = data.response ?? '// AI suggestion: Consider refactoring this section';
      setAiSuggestion(suggestion.slice(0, 120));
    } catch {
      setAiSuggestion('// AI suggestion: Consider refactoring this section');
    } finally {
      setAiLoading(false);
    }
  }, [activeFile, cursorLine]);

  const acceptAISuggestion = useCallback(() => {
    if (!aiSuggestion || !activeFile) return;
    const lines = activeFile.content.split('\n');
    lines.splice(cursorLine, 0, aiSuggestion);
    const newContent = lines.join('\n');
    setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: newContent } : f));
    setModifiedFiles(prev => new Set(prev).add(activeFilePath));
    setAiSuggestion(null);
  }, [aiSuggestion, activeFile, cursorLine, activeFilePath]);

  const handleCommand = useCallback((command: string) => {
    switch (command) {
      case 'ask-ai':
        handleAskAI();
        break;
      case 'format':
        // Simulate format
        if (activeFile) {
          const formatted = activeFile.content
            .split('\n')
            .map(l => l.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
          setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: formatted } : f));
          setModifiedFiles(prev => new Set(prev).add(activeFilePath));
        }
        break;
      case 'fold-all':
        if (activeFile) {
          const lines = activeFile.content.split('\n');
          const ranges: FoldedRange[] = [];
          let depth = 0;
          let startLine = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().endsWith('{')) {
              if (depth === 0) startLine = i + 1;
              depth++;
            }
            if (lines[i].trim().startsWith('}') || lines[i].trim() === '}') {
              depth--;
              if (depth <= 0 && startLine > 0) {
                ranges.push({ startLine, endLine: i + 1 });
                startLine = -1;
              }
            }
          }
          setFoldedRanges(ranges);
        }
        break;
      case 'unfold-all':
        setFoldedRanges([]);
        break;
      case 'diff':
        setShowDiff(prev => !prev);
        break;
      case 'comment':
        if (activeFile) {
          const lines = activeFile.content.split('\n');
          if (cursorLine > 0 && cursorLine <= lines.length) {
            lines[cursorLine - 1] = `// ${lines[cursorLine - 1]}`;
          }
          setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: lines.join('\n') } : f));
          setModifiedFiles(prev => new Set(prev).add(activeFilePath));
        }
        break;
    }
  }, [activeFile, activeFilePath, cursorLine, handleAskAI]);

  const handleSearchReplace = useCallback((replaceAll?: boolean) => {
    if (!searchQuery || !activeFile) return;
    try {
      const regex = useRegex ? new RegExp(searchQuery, 'g') : new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const newContent = activeFile.content.replace(regex, replaceQuery);
      setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: newContent } : f));
      setModifiedFiles(prev => new Set(prev).add(activeFilePath));
    } catch {
      // Invalid regex
    }
  }, [searchQuery, replaceQuery, activeFile, activeFilePath, useRegex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+F: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setReplaceOpen(false);
      }
      // Ctrl+H: Search & Replace
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setSearchOpen(true);
        setReplaceOpen(true);
      }
      // Ctrl+Shift+P: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // Ctrl+B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      // Ctrl+S: Save (mark as not modified)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setModifiedFiles(new Set());
      }
      // Escape: Close overlays
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setCommandPaletteOpen(false);
        setAiSuggestion(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  }, []);

  // Active file lines
  const activeLines = useMemo(() => activeFile?.content.split('\n') ?? [], [activeFile]);
  const lineCount = activeLines.length;

  // Visible lines (respecting folds)
  const visibleLines = useMemo(() => {
    const result: { lineNum: number; content: string; isFolded: boolean }[] = [];
    let skipUntil = 0;
    for (let i = 0; i < activeLines.length; i++) {
      const lineNum = i + 1;
      if (lineNum < skipUntil) continue;
      const folded = foldedRanges.find(r => r.startLine === lineNum);
      if (folded) {
        result.push({ lineNum, content: activeLines[i] + ' ...', isFolded: true });
        skipUntil = folded.endLine;
      } else {
        result.push({ lineNum, content: activeLines[i], isFolded: false });
      }
    }
    return result;
  }, [activeLines, foldedRanges]);

  const language = activeFile ? getLanguageFromPath(activeFile.path) : 'text';

  // Breadcrumbs
  const breadcrumbs = activeFilePath.split('/');

  return (
    <div className="h-full flex flex-col bg-[#0d0d20] overflow-hidden relative">
      {/* Command Palette */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onCommand={handleCommand}
          />
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => closeTab(contextMenu.path)}
          onCloseOthers={() => {
            setOpenTabs([contextMenu.path]);
            setActiveFilePath(contextMenu.path);
          }}
          onCloseAll={() => {
            setOpenTabs([]);
            setActiveFilePath('');
          }}
        />
      )}

      {/* Tab Bar + Breadcrumbs */}
      <div className="shrink-0">
        {/* Tab Bar */}
        <div className="flex items-center bg-[#0a0a18] border-b border-border h-9 overflow-x-auto custom-scrollbar">
          <Button
            variant="ghost" size="sm"
            className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </Button>

          {openTabs.map(tabPath => {
            const fileName = tabPath.split('/').pop() ?? tabPath;
            const isModified = modifiedFiles.has(tabPath);
            const isActive = tabPath === activeFilePath;

            return (
              <div
                key={tabPath}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-full cursor-pointer border-r border-border/30 shrink-0 text-xs transition-colors group',
                  isActive ? 'bg-[#0d0d20] text-foreground' : 'bg-[#0a0a18] text-muted-foreground hover:bg-[#0d0d20]/50'
                )}
                onClick={() => openFile(tabPath)}
                onContextMenu={(e) => handleContextMenu(e, tabPath)}
              >
                {getFileIcon(fileName)}
                <span className="truncate max-w-[100px]">{fileName}</span>
                {isModified && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E8751A] shrink-0" />
                )}
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-muted/30 rounded p-0.5"
                  onClick={(e) => closeTab(tabPath, e)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <div className="flex-1" />

          {/* Toolbar buttons */}
          <div className="flex items-center gap-0.5 px-2 shrink-0">
            <Button
              variant="ghost" size="sm"
              className={cn('h-7 w-7 p-0', showDiff && 'text-[#00ff88]')}
              onClick={() => setShowDiff(!showDiff)}
              title="Toggle Diff View"
            >
              <GitBranch className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-7 w-7 p-0"
              onClick={() => { setSearchOpen(true); setReplaceOpen(false); }}
              title="Search (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn('h-7 w-7 p-0', aiLoading && 'animate-pulse')}
              onClick={handleAskAI}
              title="Ask AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 px-3 h-7 bg-[#0d0d20]/50 border-b border-border/30 text-[11px] text-muted-foreground shrink-0 overflow-x-auto">
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={cn(
                i === breadcrumbs.length - 1 ? 'text-foreground' : 'hover:text-foreground cursor-pointer'
              )}>
                {part}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="h-full border-r border-border bg-[#0a0a18] flex flex-col shrink-0 overflow-hidden"
            >
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={treeSearch}
                    onChange={(e) => setTreeSearch(e.target.value)}
                    placeholder="Search files..."
                    className="h-7 text-xs pl-7 bg-muted/20 border-border/50"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-1">
                  {tree.children.map(node => (
                    <FileTreeNode
                      key={node.path}
                      node={{ ...node, expanded: expandedFolders.has(node.path) }}
                      activePath={activeFilePath}
                      onFileClick={openFile}
                      onToggle={toggleFolder}
                      depth={0}
                      searchQuery={treeSearch}
                    />
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden relative" ref={editorRef}>
          {/* Search & Replace Bar */}
          <AnimatePresence>
            {searchOpen && (
              <SearchReplaceBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                replaceQuery={replaceQuery}
                setReplaceQuery={setReplaceQuery}
                isReplaceOpen={replaceOpen}
                useRegex={useRegex}
                setUseRegex={setUseRegex}
                matchCount={searchMatches.length}
                currentMatch={Math.min(currentMatchIndex + 1, searchMatches.length)}
                onNext={() => setCurrentMatchIndex(i => (i + 1) % Math.max(1, searchMatches.length))}
                onPrev={() => setCurrentMatchIndex(i => (i - 1 + searchMatches.length) % Math.max(1, searchMatches.length))}
                onReplace={() => handleSearchReplace()}
                onReplaceAll={() => handleSearchReplace(true)}
                onClose={() => { setSearchOpen(false); setReplaceOpen(false); setSearchQuery(''); }}
              />
            )}
          </AnimatePresence>

          {activeFile ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Code area with line numbers */}
              <ScrollArea className="flex-1">
                <div className="flex min-h-full">
                  {/* Line numbers gutter */}
                  <div className="shrink-0 select-none bg-[#0a0a18] border-r border-border/20 py-3">
                    {visibleLines.map(({ lineNum, content: _content, isFolded }) => (
                      <div
                        key={lineNum}
                        className={cn(
                          'flex items-center justify-end px-2 h-[20px] text-[13px] font-mono cursor-pointer group transition-colors',
                          lineNum === cursorLine ? 'text-[#E8751A] bg-[#E8751A]/5' : 'text-muted-foreground/50 hover:text-muted-foreground',
                          searchMatches.includes(lineNum) && 'bg-[#FFB627]/10',
                          breakpoints.some(b => b.line === lineNum) && 'relative',
                        )}
                        onClick={() => toggleBreakpoint(lineNum)}
                      >
                        {breakpoints.some(b => b.line === lineNum) && (
                          <div className="absolute left-1 w-2 h-2 rounded-full bg-[#E6394A]" />
                        )}
                        <span className="pr-1">{lineNum}</span>
                        {isFolded ? (
                          <FoldVertical
                            className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-1"
                            onClick={(e) => { e.stopPropagation(); toggleFold(lineNum); }}
                          />
                        ) : (
                          activeLines[lineNum - 1]?.trim().endsWith('{') && (
                            <UnfoldVertical
                              className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-1"
                              onClick={(e) => { e.stopPropagation(); toggleFold(lineNum); }}
                            />
                          )
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Code content */}
                  <div className="flex-1 relative py-3">
                    {showDiff ? (
                      /* Diff View */
                      <div className="font-mono text-[13px]">
                        {diffLines.map((dl, i) => (
                          <div
                            key={i}
                            className={cn(
                              'px-4 h-[20px] leading-[20px] whitespace-pre',
                              dl.type === 'add' && 'bg-[#00ff88]/10 text-[#00ff88]',
                              dl.type === 'del' && 'bg-[#E6394A]/10 text-[#E6394A]',
                              dl.type === 'same' && 'text-foreground/80',
                            )}
                          >
                            <span className="inline-block w-6 text-muted-foreground/40 text-right mr-2 select-none">
                              {dl.type === 'add' ? '+' : dl.type === 'del' ? '-' : ' '}
                            </span>
                            {dl.line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Syntax Highlighted Code */
                      <div className="relative">
                        <SyntaxHighlighter
                          language={language}
                          style={oneDark}
                          showLineNumbers={false}
                          wrapLines={true}
                          lineNumberStyle={{ display: 'none' }}
                          customStyle={{
                            background: 'transparent',
                            margin: 0,
                            padding: '0 16px',
                            fontSize: '13px',
                            lineHeight: '20px',
                            fontFamily: 'var(--font-geist-mono), monospace',
                          }}
                          lineProps={(lineNumber) => {
                            const isCurrent = lineNumber === cursorLine;
                            const isSearchMatch = searchMatches.includes(lineNumber);
                            const isFolded = foldedRanges.some(r => lineNumber > r.startLine && lineNumber < r.endLine);
                            return {
                              className: cn(
                                isCurrent && 'bg-[#E8751A]/5',
                                isSearchMatch && 'bg-[#FFB627]/15',
                              ),
                              style: {
                                display: isFolded ? 'none' : undefined,
                                position: 'relative' as const,
                              },
                              onClick: () => {
                                setCursorLine(lineNumber);
                                setCursorCol(1);
                              },
                            };
                          }}
                        >
                          {activeFile.content}
                        </SyntaxHighlighter>

                        {/* AI Ghost Text */}
                        {aiSuggestion && cursorLine > 0 && (
                          <div
                            className="absolute left-4 pointer-events-auto"
                            style={{ top: `${(cursorLine) * 20}px` }}
                          >
                            <AIGhostText
                              text={aiSuggestion}
                              onAccept={acceptAISuggestion}
                              onDismiss={() => setAiSuggestion(null)}
                            />
                            <span className="text-[10px] text-muted-foreground ml-2">
                              Tab to accept · Esc to dismiss
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Minimap */}
              {!showDiff && (
                <Minimap
                  content={activeFile.content}
                  cursorLine={cursorLine}
                  scrollPercent={scrollPercent}
                />
              )}
            </div>
          ) : (
            /* No file open */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No file open</p>
                <p className="text-xs mt-1">Select a file from the sidebar or open a new tab</p>
                <div className="mt-4 flex flex-col gap-1 text-[11px] text-muted-foreground/60">
                  <span>Ctrl+B Toggle Sidebar</span>
                  <span>Ctrl+Shift+P Command Palette</span>
                  <span>Ctrl+F Search</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-7 bg-[#0a0a18] border-t border-border flex items-center px-3 gap-3 shrink-0 text-[11px] text-muted-foreground overflow-x-auto">
        {/* Language mode */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Code2 className="w-3 h-3" />
          <span className="capitalize">{language}</span>
        </div>

        <div className="w-px h-3 bg-border/50 shrink-0" />

        {/* Cursor position */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Hash className="w-3 h-3" />
          <span>Ln {cursorLine}, Col {cursorCol}</span>
        </div>

        <div className="w-px h-3 bg-border/50 shrink-0" />

        {/* Encoding */}
        <span className="shrink-0">UTF-8</span>

        <div className="w-px h-3 bg-border/50 shrink-0" />

        {/* Indentation */}
        <div className="flex items-center gap-1 shrink-0">
          <Space className="w-3 h-3" />
          <span>Spaces: 2</span>
        </div>

        <div className="w-px h-3 bg-border/50 shrink-0" />

        {/* Git branch */}
        <div className="flex items-center gap-1 shrink-0">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>

        <div className="flex-1" />

        {/* Modified indicator */}
        {modifiedFiles.size > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-[#E8751A]/30 text-[#E8751A]">
            {modifiedFiles.size} modified
          </Badge>
        )}

        {/* Line count */}
        <span className="shrink-0">{lineCount} lines</span>
      </div>
    </div>
  );
}
