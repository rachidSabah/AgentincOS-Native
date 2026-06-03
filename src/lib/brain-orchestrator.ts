// ═══════════════════════════════════════════════════════
// AGENTIC OS — Brain Orchestrator (v6.0)
// Multi-model orchestration layer.
// Selected model = Primary execution model ONLY.
// Agentic OS Brain + Gemini CLI remain permanent controllers.
// ═══════════════════════════════════════════════════════

export interface ProviderHealth {
  id: string;
  name: string;
  status: 'connected' | 'degraded' | 'disconnected';
  latency: number;
  healthScore: number;
  errorRate: number;
  lastCheck: number;
}

export interface TaskAssignment {
  role: string;
  model: string;
  provider: string;
  priority: number;
}

export interface OrchestrationResult {
  primaryResponse: string;
  cliResponse?: string;
  knowledgeResults?: string[];
  memoryResults?: string[];
  skillResults?: string[];
  swarmResults?: string[];
  finalSynthesis: string;
  modelsUsed: string[];
  errors: string[];
  latency: number;
}

// ─── Provider health registry ───
const providerHealth = new Map<string, ProviderHealth>();

export function updateProviderHealth(id: string, updates: Partial<ProviderHealth>) {
  const existing = providerHealth.get(id) || {
    id, name: id, status: 'disconnected' as const, latency: 0, healthScore: 0, errorRate: 0, lastCheck: 0,
  };
  providerHealth.set(id, { ...existing, ...updates, lastCheck: Date.now() });
}

export function getProviderHealth(id: string): ProviderHealth | undefined {
  return providerHealth.get(id);
}

export function getAllProviderHealth(): ProviderHealth[] {
  return Array.from(providerHealth.values());
}

// ─── Task decomposition ───
export function decomposeTask(task: string, selectedModel: string): TaskAssignment[] {
  const assignments: TaskAssignment[] = [];
  const lower = task.toLowerCase();

  // Gemini CLI always gets planning + execution roles
  assignments.push({ role: 'planner', model: 'gemini-2.5-flash-lite', provider: 'gemini-cli', priority: 1 });
  assignments.push({ role: 'executor', model: 'gemini-2.5-flash-lite', provider: 'gemini-cli', priority: 2 });

  // Selected model gets primary generation role
  if (selectedModel && selectedModel !== 'gemini-cli') {
    assignments.push({ role: 'primary', model: selectedModel, provider: 'selected', priority: 0 });
  }

  // Context-specific roles
  if (lower.includes('code') || lower.includes('build') || lower.includes('develop')) {
    assignments.push({ role: 'coder', model: selectedModel, provider: 'selected', priority: 3 });
    assignments.push({ role: 'reviewer', model: 'gemini-2.5-flash-lite', provider: 'gemini-cli', priority: 4 });
  }
  if (lower.includes('research') || lower.includes('analyze') || lower.includes('scan')) {
    assignments.push({ role: 'researcher', model: 'gemini-2.5-flash', provider: 'gemini-cli', priority: 3 });
    assignments.push({ role: 'synthesizer', model: selectedModel, provider: 'selected', priority: 4 });
  }
  if (lower.includes('write') || lower.includes('document') || lower.includes('content')) {
    assignments.push({ role: 'writer', model: selectedModel, provider: 'selected', priority: 3 });
    assignments.push({ role: 'editor', model: 'gemini-2.5-flash', provider: 'gemini-cli', priority: 4 });
  }

  return assignments.sort((a, b) => a.priority - b.priority);
}

// ─── Model failure recovery ───
const fallbackChain: Record<string, string[]> = {
  'mistral': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'openai': ['gemini-2.5-pro', 'gemini-2.5-flash'],
  'anthropic': ['gemini-2.5-pro', 'gemini-2.5-flash'],
  'deepseek': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'openrouter': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'nvidia': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'bigmodel': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'gemini-cli': ['gemini-2.5-flash-lite', 'flash-lite'],
};

export function getFallbackModel(provider: string): string | null {
  const chain = fallbackChain[provider] || fallbackChain['gemini-cli']!;
  return chain[0] || null;
}

// ─── Error analysis ───
export function analyzeError(status: number, provider: string): { cause: string; fix: string } {
  switch (status) {
    case 400: return { cause: 'Invalid request — check model name or parameters', fix: 'Verify model name and request format' };
    case 401: return { cause: 'Invalid API key', fix: `Update your ${provider} API key in Settings → Providers` };
    case 403: return { cause: 'Access denied — key may lack permissions', fix: 'Check API key permissions in provider dashboard' };
    case 404: return { cause: 'Endpoint or model not found', fix: 'Verify the model name exists for this provider' };
    case 429: return { cause: 'Rate limit exceeded', fix: 'Wait and retry, or switch to another provider' };
    case 500: case 502: case 503: return { cause: 'Provider server error', fix: 'Provider may be experiencing issues. Retry or use fallback.' };
    default: return { cause: `Unexpected error (${status})`, fix: 'Check network connection and try again' };
  }
}
