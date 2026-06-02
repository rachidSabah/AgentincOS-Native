// ═══════════════════════════════════════════════════════
// AGENTIC OS — Intelligence Layer
// Non-destructive enhancement for all agents
// ═══════════════════════════════════════════════════════

// Brain modes that can be assigned to any agent
export type BrainMode = 
  | 'claude-brain'      // Deep reasoning, analysis
  | 'gemini-brain'      // Multimodal, fast response
  | 'hermes-brain'      // Autonomous planning, long-horizon
  | 'coding-brain'      // Code generation, debugging
  | 'architect-brain'   // System design, architecture
  | 'research-brain'    // Research, synthesis
  | 'analyst-brain';    // Data analysis, metrics

// Cognitive role mapping
export interface BrainModeConfig {
  id: BrainMode;
  name: string;
  description: string;
  strengths: string[];
  systemPromptAddition: string;
  temperature: number;
  reasoningStyle: 'chain-of-thought' | 'tree-of-thought' | 'react' | 'plan-and-execute';
  planningHorizon: 'short' | 'medium' | 'long';
  autonomyLevel: number; // 0-100
}

// Autonomy capabilities
export interface AutonomyCapabilities {
  longHorizonPlanning: boolean;
  multiStepReasoning: boolean;
  autonomousExecution: boolean;
  goalDecomposition: boolean;
  contextExpansion: boolean;
  selfCorrection: boolean;
  continuousTaskCompletion: boolean;
  iterativeRefinement: boolean;
}

// Engineering capabilities (Claude Code layer)
export interface EngineeringCapabilities {
  repositoryUnderstanding: boolean;
  multiFileReasoning: boolean;
  architectureAnalysis: boolean;
  codeRefactoring: boolean;
  debuggingAutonomy: boolean;
  cicdAwareness: boolean;
  terminalNativeExecution: boolean;
  dependencyMapping: boolean;
}

// Intelligence configuration for an agent
export interface AgentIntelligence {
  agentId: string;
  brainMode: BrainMode;
  autonomyEnabled: boolean;
  autonomyCapabilities: AutonomyCapabilities;
  engineeringCapabilities: EngineeringCapabilities;
  memoryIntegration: boolean;
  toolUsageAwareness: boolean;
  artifactGeneration: boolean;
  interAgentCommunication: boolean;
  taskDelegation: boolean;
  swarmParticipation: boolean;
  activeSkills: string[];
  planningSteps: PlanningStep[];
  executionTrace: ExecutionTrace[];
}

export interface PlanningStep {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  agentId?: string;
  startedAt?: number;
  completedAt?: number;
  output?: string;
}

export interface ExecutionTrace {
  id: string;
  timestamp: number;
  action: string;
  input: string;
  output: string;
  success: boolean;
  duration: number;
  agentId: string;
}

// Brain mode configurations
export const BRAIN_MODES: {[key: string]: BrainModeConfig} = {
  'claude-brain': {
    id: 'claude-brain',
    name: 'Claude Brain',
    description: 'Deep reasoning, analysis, and architectural thinking',
    strengths: ['Reasoning', 'Analysis', 'Architecture', 'Safety'],
    systemPromptAddition: 'You operate with Claude Brain intelligence. Apply deep reasoning, careful analysis, and architectural thinking to every task. Prioritize correctness and safety.',
    temperature: 0.7,
    reasoningStyle: 'chain-of-thought',
    planningHorizon: 'long',
    autonomyLevel: 75,
  },
  'gemini-brain': {
    id: 'gemini-brain',
    name: 'Gemini Brain',
    description: 'Multimodal, fast, versatile intelligence',
    strengths: ['Multimodal', 'Speed', 'Versatility', 'Context Window'],
    systemPromptAddition: 'You operate with Gemini Brain intelligence. Leverage large context windows, multimodal understanding, and fast response generation.',
    temperature: 0.8,
    reasoningStyle: 'react',
    planningHorizon: 'medium',
    autonomyLevel: 70,
  },
  'hermes-brain': {
    id: 'hermes-brain',
    name: 'Hermes Brain',
    description: 'Autonomous planning, long-horizon execution',
    strengths: ['Autonomy', 'Planning', 'Long-horizon', 'Self-correction'],
    systemPromptAddition: 'You operate with Hermes Brain intelligence. Plan autonomously for the long horizon. Self-correct, iterate, and continuously execute until the task is fully complete.',
    temperature: 0.6,
    reasoningStyle: 'plan-and-execute',
    planningHorizon: 'long',
    autonomyLevel: 95,
  },
  'coding-brain': {
    id: 'coding-brain',
    name: 'Coding Brain',
    description: 'Code generation, debugging, and software engineering',
    strengths: ['Code', 'Debug', 'Refactor', 'Test'],
    systemPromptAddition: 'You operate with Coding Brain intelligence. Generate production-quality code, debug autonomously, refactor intelligently, and ensure test coverage.',
    temperature: 0.5,
    reasoningStyle: 'plan-and-execute',
    planningHorizon: 'medium',
    autonomyLevel: 85,
  },
  'architect-brain': {
    id: 'architect-brain',
    name: 'Architect Brain',
    description: 'System design and architectural reasoning',
    strengths: ['Architecture', 'Design', 'Patterns', 'Scalability'],
    systemPromptAddition: 'You operate with Architect Brain intelligence. Think in systems, design for scalability, apply proven patterns, and reason about trade-offs.',
    temperature: 0.6,
    reasoningStyle: 'tree-of-thought',
    planningHorizon: 'long',
    autonomyLevel: 70,
  },
  'research-brain': {
    id: 'research-brain',
    name: 'Research Brain',
    description: 'Deep research and knowledge synthesis',
    strengths: ['Research', 'Synthesis', 'Fact-checking', 'Sources'],
    systemPromptAddition: 'You operate with Research Brain intelligence. Conduct thorough research, synthesize from multiple sources, verify facts, and provide comprehensive analysis.',
    temperature: 0.7,
    reasoningStyle: 'chain-of-thought',
    planningHorizon: 'medium',
    autonomyLevel: 65,
  },
  'analyst-brain': {
    id: 'analyst-brain',
    name: 'Analyst Brain',
    description: 'Data analysis, metrics, and insights',
    strengths: ['Analysis', 'Metrics', 'Insights', 'Visualization'],
    systemPromptAddition: 'You operate with Analyst Brain intelligence. Analyze data rigorously, extract meaningful insights, compute metrics, and present clear conclusions.',
    temperature: 0.5,
    reasoningStyle: 'chain-of-thought',
    planningHorizon: 'short',
    autonomyLevel: 60,
  },
};

// Default intelligence for new agents
export function createDefaultAgentIntelligence(agentId: string): AgentIntelligence {
  return {
    agentId,
    brainMode: 'hermes-brain',
    autonomyEnabled: true,
    autonomyCapabilities: {
      longHorizonPlanning: true,
      multiStepReasoning: true,
      autonomousExecution: true,
      goalDecomposition: true,
      contextExpansion: true,
      selfCorrection: true,
      continuousTaskCompletion: true,
      iterativeRefinement: true,
    },
    engineeringCapabilities: {
      repositoryUnderstanding: true,
      multiFileReasoning: true,
      architectureAnalysis: true,
      codeRefactoring: true,
      debuggingAutonomy: true,
      cicdAwareness: true,
      terminalNativeExecution: true,
      dependencyMapping: true,
    },
    memoryIntegration: true,
    toolUsageAwareness: true,
    artifactGeneration: true,
    interAgentCommunication: true,
    taskDelegation: true,
    swarmParticipation: true,
    activeSkills: [],
    planningSteps: [],
    executionTrace: [],
  };
}
