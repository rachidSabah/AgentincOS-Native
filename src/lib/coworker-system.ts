// ═══════════════════════════════════════════════════════
// AGENTIC OS — Coworker System
// Multi-agent team collaboration with per-agent memory,
// automatic delegation, and self-learning retry logic.
// ═══════════════════════════════════════════════════════

export type CoworkerRole = 'architect' | 'coder' | 'researcher' | 'analyst' | 'reviewer' | 'executor' | 'coordinator' | 'writer' | 'designer' | 'devops';

export type TaskStatus = 'queued' | 'assigned' | 'in-progress' | 'completed' | 'failed' | 'retrying' | 'delegated';

export type CoworkerStatus = 'idle' | 'working' | 'learning' | 'error';

export interface CoworkerMemory {
  id: string;
  taskId: string;
  role: CoworkerRole;
  input: string;
  output: string;
  success: boolean;
  lessonsLearned: string[];
  skillsUsed: string[];
  coworkersDelegated: string[];
  timestamp: number;
}

export interface Coworker {
  id: string;
  name: string;
  role: CoworkerRole;
  model: string;
  providerId: string;
  status: CoworkerStatus;
  expertise: string[];
  skills: string[];
  memory: CoworkerMemory[];
  successCount: number;
  failureCount: number;
  delegationCount: number;
  createdAt: number;
  lastActiveAt: number;
  color: string;
  icon: string;
}

export interface TeamTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedCoworkers: string[];
  subtasks: SubTask[];
  createdAt: number;
  completedAt?: number;
  result?: string;
}

export interface SubTask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  role: CoworkerRole;
  assignedTo?: string;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  result?: string;
  delegatedFrom?: string;
  createdAt: number;
  completedAt?: number;
}

// ─── Role capabilities ───
const ROLE_CAPABILITIES: Record<CoworkerRole, { skills: string[]; preferredModel: string; strengths: string[] }> = {
  architect:    { skills: ['system-design', 'architecture', 'planning'], preferredModel: 'gemini-3-pro-preview', strengths: ['planning', 'decomposition', 'structure'] },
  coder:        { skills: ['coding', 'debugging', 'refactoring', 'testing'], preferredModel: 'gemini-2.5-pro', strengths: ['implementation', 'logic', 'syntax'] },
  researcher:   { skills: ['research', 'analysis', 'synthesis'], preferredModel: 'gemini-2.5-flash', strengths: ['knowledge', 'search', 'synthesis'] },
  analyst:      { skills: ['data-analysis', 'metrics', 'reporting'], preferredModel: 'gemini-2.5-flash-lite', strengths: ['data', 'patterns', 'insights'] },
  reviewer:     { skills: ['code-review', 'quality-check', 'auditing'], preferredModel: 'gemini-2.5-pro', strengths: ['validation', 'quality', 'standards'] },
  executor:     { skills: ['execution', 'deployment', 'automation'], preferredModel: 'gemini-2.5-flash', strengths: ['action', 'delivery', 'speed'] },
  coordinator:  { skills: ['orchestration', 'delegation', 'communication'], preferredModel: 'gemini-3-pro-preview', strengths: ['coordination', 'routing', 'teamwork'] },
  writer:       { skills: ['writing', 'editing', 'content-creation'], preferredModel: 'gemini-2.5-flash', strengths: ['clarity', 'creativity', 'communication'] },
  designer:     { skills: ['ui-design', 'ux-design', 'visual-design'], preferredModel: 'gemini-2.5-pro', strengths: ['aesthetics', 'usability', 'creativity'] },
  devops:       { skills: ['ci-cd', 'infrastructure', 'monitoring'], preferredModel: 'gemini-2.5-flash-lite', strengths: ['automation', 'reliability', 'scalability'] },
};

// ─── Default coworkers ───
export const DEFAULT_COWORKERS: Coworker[] = [
  { id: 'cw-1', name: 'Atlas', role: 'architect', model: 'gemini-3-pro-preview', providerId: 'gemini', status: 'idle', expertise: ['System Design', 'Task Decomposition', 'Architecture Planning'], skills: ROLE_CAPABILITIES.architect.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#9d4edd', icon: '🏗️' },
  { id: 'cw-2', name: 'Nova', role: 'coder', model: 'gemini-2.5-pro', providerId: 'gemini', status: 'idle', expertise: ['Full-Stack Development', 'Debugging', 'Code Optimization'], skills: ROLE_CAPABILITIES.coder.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#00ff88', icon: '💻' },
  { id: 'cw-3', name: 'Sage', role: 'researcher', model: 'gemini-2.5-flash', providerId: 'gemini', status: 'idle', expertise: ['Deep Research', 'Knowledge Synthesis', 'Fact-Checking'], skills: ROLE_CAPABILITIES.researcher.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#FFB627', icon: '🔍' },
  { id: 'cw-4', name: 'Pixel', role: 'designer', model: 'gemini-2.5-pro', providerId: 'gemini', status: 'idle', expertise: ['UI/UX Design', 'Design Systems', 'Accessibility'], skills: ROLE_CAPABILITIES.designer.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#e879f9', icon: '🎨' },
  { id: 'cw-5', name: 'Forge', role: 'devops', model: 'gemini-2.5-flash-lite', providerId: 'gemini', status: 'idle', expertise: ['CI/CD', 'Infrastructure', 'Deployment'], skills: ROLE_CAPABILITIES.devops.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#06b6d4', icon: '⚙️' },
  { id: 'cw-6', name: 'Quill', role: 'writer', model: 'gemini-2.5-flash', providerId: 'gemini', status: 'idle', expertise: ['Technical Writing', 'Documentation', 'Content Strategy'], skills: ROLE_CAPABILITIES.writer.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#f97316', icon: '✍️' },
  { id: 'cw-7', name: 'Prism', role: 'analyst', model: 'gemini-2.5-flash-lite', providerId: 'gemini', status: 'idle', expertise: ['Data Analysis', 'Metrics', 'Reporting'], skills: ROLE_CAPABILITIES.analyst.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#a3e635', icon: '📊' },
  { id: 'cw-8', name: 'Orion', role: 'coordinator', model: 'gemini-3-pro-preview', providerId: 'gemini', status: 'idle', expertise: ['Team Coordination', 'Task Routing', 'Progress Tracking'], skills: ROLE_CAPABILITIES.coordinator.skills, memory: [], successCount: 0, failureCount: 0, delegationCount: 0, createdAt: Date.now(), lastActiveAt: 0, color: '#ffffff', icon: '🌐' },
];

// ─── Task decomposition — break a goal into subtasks per role ───
export function decomposeTask(task: string, description: string): { subtasks: Omit<SubTask, 'id' | 'parentTaskId' | 'status' | 'attempts' | 'maxAttempts' | 'createdAt'>[] } {
  const lower = task.toLowerCase();
  let roles: CoworkerRole[] = ['executor'];

  if (lower.includes('build') || lower.includes('create') || lower.includes('develop') || lower.includes('code') || lower.includes('app') || lower.includes('website')) {
    roles = ['architect', 'coder', 'reviewer', 'devops'];
  } else if (lower.includes('research') || lower.includes('analyze') || lower.includes('study') || lower.includes('find')) {
    roles = ['researcher', 'analyst', 'writer'];
  } else if (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('interface')) {
    roles = ['designer', 'coder', 'reviewer'];
  } else if (lower.includes('write') || lower.includes('document') || lower.includes('content') || lower.includes('blog')) {
    roles = ['writer', 'reviewer', 'researcher'];
  } else if (lower.includes('deploy') || lower.includes('infrastructure') || lower.includes('server') || lower.includes('docker')) {
    roles = ['devops', 'architect', 'executor'];
  } else if (lower.includes('data') || lower.includes('metrics') || lower.includes('report') || lower.includes('dashboard')) {
    roles = ['analyst', 'researcher', 'writer'];
  } else {
    roles = ['architect', 'coder', 'reviewer', 'executor'];
  }

  return {
    subtasks: roles.map(role => ({
      title: `${role.charAt(0).toUpperCase() + role.slice(1)}: ${description.slice(0, 50)}`,
      description: `As ${role}, ${description}`,
      role,
    })),
  };
}

// ─── Find best coworker for a task ───
export function findBestCoworker(coworkers: Coworker[], role: CoworkerRole, subtask: string): Coworker | null {
  const candidates = coworkers.filter(c => c.role === role && c.status !== 'error');
  if (candidates.length === 0) return null;

  // Score candidates by success rate, recency, and skill match
  const scored = candidates.map(c => {
    let score = c.successCount - c.failureCount * 2;
    score += (Date.now() - c.lastActiveAt < 300000) ? 3 : 0; // recently active bonus
    const skillMatch = c.skills.filter(s => subtask.toLowerCase().includes(s)).length;
    score += skillMatch * 2;
    return { coworker: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.coworker || null;
}

// ─── Retry escalation — when a coworker fails, delegate to another or escalate ───
export function getEscalationPath(coworkers: Coworker[], failedCoworkerId: string, role: CoworkerRole): { escalate: boolean; delegateTo?: string; reason: string } {
  const failed = coworkers.find(c => c.id === failedCoworkerId);
  const alternates = coworkers.filter(c => c.id !== failedCoworkerId && c.role === role && c.status !== 'error');

  if (alternates.length > 0) {
    const best = alternates.sort((a, b) => (b.successCount - b.failureCount) - (a.successCount - a.failureCount))[0]!;
    return { escalate: false, delegateTo: best.id, reason: `Delegated from ${failed?.name} to ${best.name} for retry` };
  }

  // No same-role alternate — escalate to coordinator or architect
  const coordinator = coworkers.find(c => c.role === 'coordinator' && c.status !== 'error');
  if (coordinator) {
    return { escalate: true, delegateTo: coordinator.id, reason: `Escalated to ${coordinator.name} (${coordinator.role}) — no ${role} coworkers available` };
  }

  return { escalate: true, reason: `No coworkers available for role: ${role}` };
}

// ─── Learn from task completion ───
export function learnFromTask(coworker: Coworker, task: SubTask, output: string, success: boolean): Coworker {
  const lessonsLearned: string[] = [];
  if (success) {
    lessonsLearned.push(`Successfully completed ${task.role} task: "${task.title}"`);
    if (task.attempts > 1) lessonsLearned.push(`Required ${task.attempts} attempts — persistence pays off`);
  } else {
    lessonsLearned.push(`Failed at ${task.role} task: "${task.title}". Reason: ${output.slice(0, 100)}`);
    lessonsLearned.push(`Consider delegating ${task.role} tasks to another coworker next time`);
  }

  const memoryEntry: CoworkerMemory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taskId: task.id,
    role: task.role,
    input: task.description,
    output,
    success,
    lessonsLearned,
    skillsUsed: coworker.skills,
    coworkersDelegated: task.delegatedFrom ? [task.delegatedFrom] : [],
    timestamp: Date.now(),
  };

  return {
    ...coworker,
    memory: [memoryEntry, ...coworker.memory].slice(0, 100),
    successCount: coworker.successCount + (success ? 1 : 0),
    failureCount: coworker.failureCount + (success ? 0 : 1),
    lastActiveAt: Date.now(),
  };
}
