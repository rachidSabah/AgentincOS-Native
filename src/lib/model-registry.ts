// ═══════════════════════════════════════════════════════
// AGENTIC OS — Model Registry v6.0
// Centralized model discovery, synchronization, and management
// ═══════════════════════════════════════════════════════

export type ModelRole = 'lead' | 'worker' | 'planner' | 'coder' | 'researcher' | 'reviewer' | 'verifier' | 'summarizer' | 'architect' | 'coordinator' | 'custom';

export type ModelCapability = 'reasoning' | 'coding' | 'research' | 'vision' | 'function-calling' | 'tool-use' | 'long-context' | 'agent-control' | 'workflow' | 'document-processing' | 'streaming';

export interface RegisteredModel {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  contextWindow: number;
  capabilities: ModelCapability[];
  pricing: { input: number; output: number };
  health: 'healthy' | 'degraded' | 'offline';
  latency: number;
  available: boolean;
  role: ModelRole;
  assigned: boolean;
  lastCheck: number;
}

export interface ModelRoleAssignment {
  modelId: string;
  role: ModelRole;
  task?: string;
  startedAt: number;
}

export const DEFAULT_REGISTRY: RegisteredModel[] = [
  // Gemini CLI models
  { id: 'gemini-cli-auto', name: 'Gemini CLI Auto', providerId: 'gemini-cli', providerName: 'Gemini CLI', contextWindow: 1048576, capabilities: ['reasoning','coding','research','tool-use','agent-control','workflow','streaming'], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'lead', assigned: false, lastCheck: 0 },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', providerId: 'gemini-cli', providerName: 'Gemini CLI', contextWindow: 1048576, capabilities: ['reasoning','coding','research','long-context'], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'worker', assigned: false, lastCheck: 0 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'gemini-cli', providerName: 'Gemini CLI', contextWindow: 1048576, capabilities: ['coding','reasoning','streaming'], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'worker', assigned: false, lastCheck: 0 },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', providerId: 'gemini-cli', providerName: 'Gemini CLI', contextWindow: 1048576, capabilities: ['coding','streaming'], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'worker', assigned: false, lastCheck: 0 },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', providerId: 'gemini-cli', providerName: 'Gemini CLI', contextWindow: 2000000, capabilities: ['reasoning','coding','research','long-context','tool-use','agent-control'], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'architect', assigned: false, lastCheck: 0 },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', providerId: 'gemini-cli', providerName: 'Gemini CLI', contextWindow: 1048576, capabilities: ['coding','streaming'], pricing: { input: 0, output: 0 }, health: 'healthy', latency: 0, available: true, role: 'worker', assigned: false, lastCheck: 0 },
];

export function getModelsByProvider(registry: RegisteredModel[], providerId: string): RegisteredModel[] {
  return registry.filter(m => m.providerId === providerId);
}

export function getAvailableWorkers(registry: RegisteredModel[], excludeModelId?: string): RegisteredModel[] {
  return registry.filter(m => m.available && m.id !== excludeModelId && m.role !== 'lead');
}

export function getLeadModel(registry: RegisteredModel[]): RegisteredModel | undefined {
  return registry.find(m => m.role === 'lead' && m.assigned);
}

export function assignRole(registry: RegisteredModel[], modelId: string, role: ModelRole): RegisteredModel[] {
  return registry.map(m => m.id === modelId ? { ...m, role, assigned: true } : m);
}

export function autoSelectWorkers(registry: RegisteredModel[], task: string, count: number = 2): RegisteredModel[] {
  const lower = task.toLowerCase();
  const workers = registry.filter(m => m.available && m.role !== 'lead');
  
  const scored = workers.map(m => {
    let score = 0;
    if (lower.includes('code') && m.capabilities.includes('coding')) score += 3;
    if (lower.includes('research') && m.capabilities.includes('research')) score += 3;
    if (lower.includes('reason') && m.capabilities.includes('reasoning')) score += 2;
    if (m.capabilities.includes('tool-use')) score += 1;
    if (m.capabilities.includes('long-context')) score += 1;
    return { ...m, _score: score };
  });
  
  scored.sort((a, b) => (b._score || 0) - (a._score || 0));
  return scored.slice(0, count).map(({ _score, ...m }) => ({ ...m, assigned: true }));
}

export function updateModelHealth(registry: RegisteredModel[], modelId: string, updates: Partial<RegisteredModel>): RegisteredModel[] {
  return registry.map(m => m.id === modelId ? { ...m, ...updates, lastCheck: Date.now() } : m);
}

export function mergeDiscoveredModels(registry: RegisteredModel[], discovered: RegisteredModel[]): RegisteredModel[] {
  const existingIds = new Set(registry.map(m => m.id));
  const newModels = discovered.filter(m => !existingIds.has(m.id));
  return [...registry, ...newModels];
}
