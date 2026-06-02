// ═══════════════════════════════════════════════════════
// AGENTIC OS — Artifact Intelligence System
// Context-aware, agent-linked, memory-persistent artifacts
// ═══════════════════════════════════════════════════════

export interface Artifact {
  id: string;
  name: string;
  type: string;               // code, documentation, test, config, report, etc.
  content: string;
  language?: string;
  agentId: string;             // creator agent
  workspaceId?: string;
  version: number;
  versions: ArtifactVersion[];
  tags: string[];
  context: ArtifactContext;
  linkedMemories: string[];    // memory entry IDs
  linkedAgents: string[];      // agents that have worked on this
  workflowTriggers: string[];  // workflows triggered by changes
  changeHistory: ArtifactChange[];
  createdAt: number;
  updatedAt: number;
}

export interface ArtifactVersion {
  version: number;
  content: string;
  timestamp: number;
  agentId: string;
  changeDescription: string;
}

export interface ArtifactContext {
  repository?: string;
  filePath?: string;
  projectName?: string;
  relatedArtifacts: string[];
  reasoningTrace?: string;     // AI reasoning that produced this artifact
}

export interface ArtifactChange {
  id: string;
  timestamp: number;
  agentId: string;
  changeType: 'create' | 'modify' | 'delete' | 'rename' | 'move';
  description: string;
  diff?: string;
}
