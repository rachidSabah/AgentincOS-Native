// ═══════════════════════════════════════════════════════
// AGENTIC OS — Failure Recovery System
// State-preserving recovery with guaranteed completion.
// Never aborts — always finds a path forward through
// model failover, stage retry, checkpoint restart,
// and internal analysis fallback.
// ═══════════════════════════════════════════════════════

import { modelLoadBalancer } from './model-load-balancer';
import { swarmKernel } from './swarm-kernel';
import { modelExecutor as realModelExecutor } from './model-executor';

// ─── Core Types ────────────────────────────────────────

/** Preserved execution state for recovery */
export interface ExecutionState {
  taskId: string;
  currentStage: string;
  completedStages: string[];
  failedStage: string;
  partialOutput: Map<string, string>;
  modelChain: string[];
  currentModelIndex: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/** A recovery action to take after a failure */
export interface RecoveryAction {
  type: 'switch-model' | 'retry-stage' | 'skip-stage' | 'restart-from-checkpoint' | 'escalate';
  targetModel?: string;
  targetStage?: string;
  reason: string;
  estimatedSuccessRate: number;
}

/** Recovery statistics */
export interface RecoveryStats {
  totalRecoveries: number;
  successRate: number;
  avgRecoveryTime: number;
}

// ─── Error Classification ──────────────────────────────

type ErrorClass =
  | 'rate-limit'
  | 'timeout'
  | 'auth-failure'
  | 'model-error'
  | 'network-error'
  | 'validation-failure'
  | 'unknown';

/**
 * Classify an error to determine the best recovery strategy
 */
function classifyError(error: Error): ErrorClass {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Rate limiting
  if (/rate.?limit|too many requests|429|throttl/i.test(message)) {
    return 'rate-limit';
  }

  // Timeout
  if (/timeout|timed out|deadline exceeded|etimedout/i.test(message)) {
    return 'timeout';
  }

  // Authentication failure
  if (/unauthorized|forbidden|401|403|invalid api key|authentication/i.test(message)) {
    return 'auth-failure';
  }

  // Model-specific error
  if (/model not found|invalid model|context.?length|token limit|max tokens/i.test(message)) {
    return 'model-error';
  }

  // Network error
  if (/network|econnrefused|econnreset|enotfound|fetch failed|dns/i.test(message)) {
    return 'network-error';
  }

  // Validation failure
  if (/validation|invalid input|schema|zod|type.?error/i.test(message)) {
    return 'validation-failure';
  }

  return 'unknown';
}

// ─── Model Chain Definitions ───────────────────────────

const DEFAULT_MODEL_CHAIN = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'claude-sonnet-4-20250514',
  'gpt-4o',
  'deepseek-chat',
  'gemini-2.5-flash-lite',
  'internal-reasoning',
];

const SIMPLIFIED_PROMPT_SUFFIX = `
IMPORTANT: Simplify your response. Focus on the core answer only.
Do not include extensive explanations, examples, or edge cases.
Provide a direct, concise response.`;

// ─── FailureRecoverySystem Class ───────────────────────

/**
 * Failure recovery system with state preservation.
 * Guarantees completion through multiple recovery strategies:
 *
 * 1. Switch model — Try the next model in the chain
 * 2. Retry stage — Retry the same model with the same input
 * 3. Skip stage — Skip a non-essential stage
 * 4. Restart from checkpoint — Go back to last known good state
 * 5. Escalate — Use internal analysis as final fallback
 *
 * The `ensureCompletion` method is the core guarantee — it MUST
 * always return a result, even if it falls back to internal analysis.
 */
export class FailureRecoverySystem {
  private states: Map<string, ExecutionState> = new Map();
  private recoveryHistory: RecoveryAction[] = [];
  private recoveryStats: { total: number; successes: number; totalTime: number } = {
    total: 0,
    successes: 0,
    totalTime: 0,
  };

  /**
   * Save execution state before each stage.
   * This creates a checkpoint that can be restored if the stage fails.
   *
   * @param taskId - The task ID to save state for
   * @param state - Partial execution state to save/merge
   */
  saveState(taskId: string, state: Partial<ExecutionState>): void {
    const existing = this.states.get(taskId);
    if (existing) {
      // Merge with existing state
      const merged: ExecutionState = {
        ...existing,
        ...state,
        partialOutput: new Map([
          ...existing.partialOutput,
          ...(state.partialOutput ?? new Map()),
        ]),
        completedStages: state.completedStages
          ? [...new Set([...existing.completedStages, ...state.completedStages])]
          : existing.completedStages,
        modelChain: state.modelChain ?? existing.modelChain,
        currentModelIndex: state.currentModelIndex ?? existing.currentModelIndex,
        timestamp: Date.now(),
        retryCount: state.retryCount ?? existing.retryCount,
        maxRetries: state.maxRetries ?? existing.maxRetries,
      };
      this.states.set(taskId, merged);
    } else {
      // Create new state
      this.states.set(taskId, {
        taskId,
        currentStage: state.currentStage ?? 'init',
        completedStages: state.completedStages ?? [],
        failedStage: state.failedStage ?? '',
        partialOutput: state.partialOutput ?? new Map(),
        modelChain: state.modelChain ?? DEFAULT_MODEL_CHAIN,
        currentModelIndex: state.currentModelIndex ?? 0,
        timestamp: Date.now(),
        retryCount: state.retryCount ?? 0,
        maxRetries: state.maxRetries ?? 3,
      });
    }
  }

  /**
   * Get saved execution state for a task
   *
   * @param taskId - The task ID to retrieve state for
   * @returns The saved execution state, or undefined if not found
   */
  getState(taskId: string): ExecutionState | undefined {
    return this.states.get(taskId);
  }

  /**
   * Determine the best recovery action for a failure.
   * Analyzes the error type, current state, and available models
   * to choose the strategy with the highest estimated success rate.
   *
   * @param taskId - The task ID that failed
   * @param error - The error that caused the failure
   * @returns The recommended recovery action
   */
  determineRecovery(taskId: string, error: Error): RecoveryAction {
    const state = this.states.get(taskId);
    const errorClass = classifyError(error);

    // Track recovery attempt
    this.recoveryStats.total++;

    // Based on error class, determine best recovery strategy
    switch (errorClass) {
      case 'rate-limit': {
        // Rate limited — switch to a different model/provider
        const nextModel = this.getNextAvailableModel(state, error);
        return {
          type: 'switch-model',
          targetModel: nextModel,
          reason: `Rate limit hit on current model — switching to ${nextModel}`,
          estimatedSuccessRate: 0.85,
        };
      }

      case 'timeout': {
        // Timeout — try a faster model or retry
        if (state && state.retryCount < state.maxRetries) {
          return {
            type: 'retry-stage',
            reason: 'Request timed out — retrying with same model',
            estimatedSuccessRate: 0.6,
          };
        }
        // Switch to a faster model
        const fastModel = this.getFastestModel();
        return {
          type: 'switch-model',
          targetModel: fastModel,
          reason: `Timeout after ${state?.retryCount ?? 0} retries — switching to faster model ${fastModel}`,
          estimatedSuccessRate: 0.75,
        };
      }

      case 'auth-failure': {
        // Auth failure — must switch to a different provider
        const alternativeModel = this.getModelFromDifferentProvider(state);
        if (alternativeModel) {
          return {
            type: 'switch-model',
            targetModel: alternativeModel,
            reason: `Authentication failed — switching to model from different provider: ${alternativeModel}`,
            estimatedSuccessRate: 0.8,
          };
        }
        // No alternative — escalate to internal
        return {
          type: 'escalate',
          reason: 'Authentication failure with no available alternative models — using internal analysis',
          estimatedSuccessRate: 0.5,
        };
      }

      case 'model-error': {
        // Model-specific error — switch model
        const nextModel = this.getNextAvailableModel(state, error);
        return {
          type: 'switch-model',
          targetModel: nextModel,
          reason: `Model error — switching to ${nextModel}`,
          estimatedSuccessRate: 0.8,
        };
      }

      case 'network-error': {
        // Network error — retry first, then switch
        if (state && state.retryCount < 2) {
          return {
            type: 'retry-stage',
            reason: 'Network error — retrying (transient issue)',
            estimatedSuccessRate: 0.65,
          };
        }
        return {
          type: 'switch-model',
          targetModel: 'internal-reasoning',
          reason: 'Persistent network errors — falling back to internal reasoning',
          estimatedSuccessRate: 0.6,
        };
      }

      case 'validation-failure': {
        // Validation failure — retry with simplified prompt
        if (state && state.retryCount < state.maxRetries) {
          return {
            type: 'retry-stage',
            targetStage: state.currentStage,
            reason: 'Output validation failed — retrying with simplified approach',
            estimatedSuccessRate: 0.55,
          };
        }
        // If retried enough, try a different model
        const nextModel = this.getNextAvailableModel(state, error);
        return {
          type: 'switch-model',
          targetModel: nextModel,
          reason: `Validation failures persist — switching model to ${nextModel}`,
          estimatedSuccessRate: 0.65,
        };
      }

      default: {
        // Unknown error — try model switch first
        if (state && state.retryCount < state.maxRetries) {
          const nextModel = this.getNextAvailableModel(state, error);
          if (nextModel !== (state.modelChain[state.currentModelIndex] ?? 'unknown')) {
            return {
              type: 'switch-model',
              targetModel: nextModel,
              reason: `Unknown error — trying different model: ${nextModel}`,
              estimatedSuccessRate: 0.6,
            };
          }
          return {
            type: 'retry-stage',
            reason: 'Unknown error — retrying current stage',
            estimatedSuccessRate: 0.4,
          };
        }

        // Exhausted retries — try checkpoint restart
        if (state && state.completedStages.length > 0) {
          return {
            type: 'restart-from-checkpoint',
            targetStage: state.completedStages[state.completedStages.length - 1],
            reason: 'All retries exhausted — restarting from last checkpoint',
            estimatedSuccessRate: 0.45,
          };
        }

        // Last resort — escalate to internal analysis
        return {
          type: 'escalate',
          reason: 'All recovery options exhausted — using internal analysis',
          estimatedSuccessRate: 0.4,
        };
      }
    }
  }

  /**
   * Execute a recovery action. Handles each recovery type
   * and returns the result of the recovery attempt.
   *
   * @param taskId - The task ID to recover
   * @param action - The recovery action to execute
   * @returns The output from the recovery attempt
   */
  async executeRecovery(taskId: string, action: RecoveryAction): Promise<string> {
    const state = this.states.get(taskId);
    if (!state) {
      return this.internalAnalysis('Recovery requested but no state found for task');
    }

    const recoveryStart = Date.now();

    // Record the recovery action
    this.recoveryHistory.push(action);

    try {
      switch (action.type) {
        case 'switch-model': {
          const model = action.targetModel ?? this.getNextAvailableModel(state);
          state.currentModelIndex = state.modelChain.indexOf(model);
          if (state.currentModelIndex === -1) {
            state.modelChain.push(model);
            state.currentModelIndex = state.modelChain.length - 1;
          }

          this.saveState(taskId, {
            currentModelIndex: state.currentModelIndex,
            retryCount: 0,
          });

          const result = await this.executeWithModel(taskId, model);
          this.recordRecoverySuccess(recoveryStart);
          return result;
        }

        case 'retry-stage': {
          const currentModel = state.modelChain[state.currentModelIndex] ?? 'gemini-2.5-flash';
          state.retryCount++;

          this.saveState(taskId, {
            retryCount: state.retryCount,
          });

          const retryResult = await this.executeWithModel(taskId, currentModel);
          this.recordRecoverySuccess(recoveryStart);
          return retryResult;
        }

        case 'skip-stage': {
          const stage = action.targetStage ?? state.currentStage;
          state.completedStages.push(stage);

          this.saveState(taskId, {
            completedStages: state.completedStages,
            partialOutput: new Map([
              ...state.partialOutput,
              [stage, `[Stage ${stage} skipped due to persistent failure]`],
            ]),
          });

          this.recordRecoverySuccess(recoveryStart);
          return `[Stage ${stage} was skipped — continuing with remaining stages]`;
        }

        case 'restart-from-checkpoint': {
          const checkpointStage = action.targetStage ?? state.completedStages[state.completedStages.length - 1] ?? 'init';
          const checkpointOutput = state.partialOutput.get(checkpointStage) ?? '';

          this.saveState(taskId, {
            currentStage: checkpointStage,
            retryCount: 0,
          });

          const restartResult = await this.executeWithModel(taskId, 'gemini-2.5-flash');
          this.recordRecoverySuccess(recoveryStart);
          return restartResult;
        }

        case 'escalate': {
          // Final fallback — internal analysis
          const task = state.partialOutput.get('original-task') ?? 'unknown task';
          const partialResults = Array.from(state.partialOutput.entries())
            .filter(([key]) => key !== 'original-task')
            .map(([key, value]) => `${key}: ${value.substring(0, 200)}`)
            .join('\n');

          const result = this.internalAnalysis(`Task: ${task}\n\nPartial results:\n${partialResults}`);
          this.recordRecoverySuccess(recoveryStart);
          return result;
        }

        default:
          return this.internalAnalysis('Unknown recovery action type');
      }
    } catch (error) {
      // Recovery itself failed — try next strategy
      const nextAction = this.determineRecovery(taskId, error instanceof Error ? error : new Error('Recovery failed'));

      // Prevent infinite recursion
      if (nextAction.type === action.type && nextAction.targetModel === action.targetModel) {
        // Same action would be taken — escalate directly
        return this.internalAnalysis(
          `Recovery failed and would loop. Original error: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }

      return this.executeRecovery(taskId, nextAction);
    }
  }

  /**
   * The core guarantee — NEVER abort, ALWAYS return a result.
   * This method implements a multi-level fallback chain:
   *
   * 1. Try current model → if fail, try next model in chain
   * 2. If all models fail, retry with simpler prompt
   * 3. If still failing, use internal analysis
   * 4. Never throw, never abort
   *
   * @param taskId - The task ID to ensure completion for
   * @param task - The original task description
   * @returns A guaranteed result string (never throws)
   */
  async ensureCompletion(taskId: string, task: string): Promise<string> {
    // Save the original task for potential escalation
    this.saveState(taskId, {
      currentStage: 'execution',
      partialOutput: new Map([['original-task', task]]),
    });

    const state = this.states.get(taskId)!;

    // Level 1: Try each model in the chain
    for (let modelIndex = state.currentModelIndex; modelIndex < state.modelChain.length; modelIndex++) {
      const model = state.modelChain[modelIndex]!;

      try {
        this.saveState(taskId, { currentModelIndex: modelIndex });
        const result = await this.executeWithModel(taskId, model);
        this.saveState(taskId, {
          completedStages: [...state.completedStages, 'execution'],
          partialOutput: new Map([...state.partialOutput, ['execution', result]]),
        });
        return result;
      } catch (error) {
        const recoveryError = error instanceof Error ? error : new Error(String(error));
        this.saveState(taskId, { failedStage: 'execution' });

        // Determine and try recovery
        const action = this.determineRecovery(taskId, recoveryError);
        if (action.type === 'switch-model' && action.targetModel) {
          // Skip to the suggested model in our chain
          const targetIndex = state.modelChain.indexOf(action.targetModel);
          if (targetIndex > modelIndex) {
            modelIndex = targetIndex - 1; // Will be incremented by loop
            continue;
          }
        }
        // Try the next model in chain
        continue;
      }
    }

    // Level 2: All models failed — retry with simplified prompt
    this.saveState(taskId, { retryCount: 0 });

    for (let retry = 0; retry < 2; retry++) {
      try {
        const simplifiedTask = this.simplifyTask(task);
        const result = await this.executeWithModel(taskId, 'gemini-2.5-flash-lite', simplifiedTask);
        this.saveState(taskId, {
          completedStages: [...state.completedStages, 'execution'],
          partialOutput: new Map([...state.partialOutput, ['execution', result]]),
        });
        return result;
      } catch {
        // Continue to next retry
        continue;
      }
    }

    // Level 3: Internal analysis fallback
    const internalResult = this.internalAnalysis(task);
    this.saveState(taskId, {
      completedStages: [...state.completedStages, 'execution'],
      partialOutput: new Map([...state.partialOutput, ['execution', internalResult]]),
    });
    return internalResult;
  }

  // ─── Model Execution (Real) ─────────────────────────

  /**
   * Execute a task with a specific model using the real model executor.
   * Falls back through CLI → API → Internal analysis.
   * Throws on failure to trigger recovery mechanisms.
   */
  private async executeWithModel(taskId: string, model: string, overrideTask?: string): Promise<string> {
    const state = this.states.get(taskId);
    const task = overrideTask ?? state?.partialOutput.get('original-task') ?? 'unknown task';

    // Track load on the model
    modelLoadBalancer.incrementLoad(model);

    // Resolve model alias (e.g., 'internal-reasoning' → gemini flash-lite)
    const result = await realModelExecutor.execute(task, model);

    modelLoadBalancer.decrementLoad(model, result.success, result.latency);

    if (!result.success) {
      throw new Error(`Model ${model} failed to produce output (provider: ${result.provider})`);
    }

    return result.output;
  }

  /**
   * [Kept for reference] Original simulated model execution.
   * Replaced by the real model executor above.
   * @deprecated Use the real executeWithModel instead.
   */
  private async executeWithModelSimulated(taskId: string, model: string, overrideTask?: string): Promise<string> {
    const state = this.states.get(taskId);
    const task = overrideTask ?? state?.partialOutput.get('original-task') ?? 'unknown task';

    // Track load on the model
    modelLoadBalancer.incrementLoad(model);

    // Simulate execution with model health check
    const node = modelLoadBalancer.getNode(model);
    if (node && node.health === 'offline') {
      modelLoadBalancer.decrementLoad(model, false, 0);
      throw new Error(`Model ${model} is offline`);
    }

    // Simulate latency
    const latency = node?.latency ?? 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, Math.min(latency, 100)));

    // Simulate success based on model health and success rate
    const successRate = node?.successRate ?? 0.85;
    const isSuccess = Math.random() < successRate;

    modelLoadBalancer.decrementLoad(model, isSuccess, latency);

    if (!isSuccess) {
      throw new Error(`Model ${model} failed to produce output (simulated failure)`);
    }

    // Generate output based on the task
    const taskSummary = task.length > 100 ? task.substring(0, 100) + '...' : task;
    return `[Generated by ${model}]

Analysis of: ${taskSummary}

Based on the task requirements, here is the analysis:

1. The task involves processing the described input
2. Key considerations have been identified
3. A solution approach has been determined
4. Implementation details are provided below

Result: The task has been processed successfully by ${model}.
All relevant aspects have been considered and addressed.`;
  }

  // ─── Internal Analysis Fallback ─────────────────────

  /**
   * Internal analysis — the ultimate fallback.
   * Uses local logic to produce a basic result without any external model.
   * This is always available and never fails.
   */
  private internalAnalysis(task: string): string {
    // Analyze the task locally using pattern matching and heuristics
    const taskLower = task.toLowerCase();
    const sections: string[] = [];

    sections.push('[Internal Analysis — No external model available]');

    // Task type detection
    const taskTypes: string[] = [];
    if (/code|build|implement/i.test(taskLower)) taskTypes.push('code generation');
    if (/research|analyze|investigate/i.test(taskLower)) taskTypes.push('research');
    if (/design|architect|system/i.test(taskLower)) taskTypes.push('architecture');
    if (/debug|fix|error|bug/i.test(taskLower)) taskTypes.push('debugging');
    if (/test|verify|validate/i.test(taskLower)) taskTypes.push('testing');
    if (/deploy|ci.?cd|release/i.test(taskLower)) taskTypes.push('deployment');
    if (taskTypes.length === 0) taskTypes.push('general processing');

    sections.push(`\nDetected task type(s): ${taskTypes.join(', ')}`);

    // Provide basic analysis based on task type
    for (const type of taskTypes) {
      switch (type) {
        case 'code generation':
          sections.push('\nCode Generation Guidance:');
          sections.push('- Define clear interfaces and types');
          sections.push('- Follow established patterns in the codebase');
          sections.push('- Include error handling and input validation');
          sections.push('- Write testable, modular code');
          break;
        case 'research':
          sections.push('\nResearch Summary:');
          sections.push('- Key concepts identified from task description');
          sections.push('- Standard practices apply to this domain');
          sections.push('- Consider consulting documentation for specifics');
          break;
        case 'architecture':
          sections.push('\nArchitecture Considerations:');
          sections.push('- Follow separation of concerns');
          sections.push('- Design for scalability and maintainability');
          sections.push('- Use established design patterns');
          break;
        case 'debugging':
          sections.push('\nDebugging Approach:');
          sections.push('- Reproduce the issue consistently');
          sections.push('- Isolate the failing component');
          sections.push('- Check error logs and stack traces');
          sections.push('- Verify input data and edge cases');
          break;
        case 'testing':
          sections.push('\nTesting Strategy:');
          sections.push('- Cover happy path and error cases');
          sections.push('- Test boundary conditions');
          sections.push('- Verify integration points');
          break;
        case 'deployment':
          sections.push('\nDeployment Checklist:');
          sections.push('- Verify build succeeds');
          sections.push('- Run all tests');
          sections.push('- Check environment configuration');
          sections.push('- Validate deployment target');
          break;
      }
    }

    sections.push('\n---');
    sections.push('Note: This is an internal analysis produced without external model assistance.');
    sections.push('For more detailed results, ensure model connectivity is available.');

    return sections.join('\n');
  }

  // ─── Helper Methods ─────────────────────────────────

  /**
   * Get the next available model from the chain
   */
  private getNextAvailableModel(state: ExecutionState | undefined, _error?: Error): string {
    const chain = state?.modelChain ?? DEFAULT_MODEL_CHAIN;
    const currentIndex = state?.currentModelIndex ?? 0;

    // Try next models in the chain
    for (let i = currentIndex + 1; i < chain.length; i++) {
      const model = chain[i]!;
      const node = modelLoadBalancer.getNode(model);
      if (!node || node.health !== 'offline') {
        return model;
      }
    }

    // All models in chain are unavailable — try from the beginning
    for (const model of chain) {
      const node = modelLoadBalancer.getNode(model);
      if (!node || node.health !== 'offline') {
        return model;
      }
    }

    // Absolute fallback
    return 'internal-reasoning';
  }

  /**
   * Get the fastest available model
   */
  private getFastestModel(): string {
    const nodes = modelLoadBalancer.getNodes();
    const healthy = nodes.filter(n => n.health !== 'offline');
    if (healthy.length === 0) return 'internal-reasoning';

    healthy.sort((a, b) => a.latency - b.latency);
    return healthy[0]!.id;
  }

  /**
   * Get a model from a different provider than the current one
   */
  private getModelFromDifferentProvider(state: ExecutionState | undefined): string | null {
    const currentModel = state?.modelChain[state?.currentModelIndex] ?? '';
    const currentNode = modelLoadBalancer.getNode(currentModel);
    const currentProvider = currentNode?.provider ?? '';

    const nodes = modelLoadBalancer.getNodes()
      .filter(n => n.health !== 'offline' && n.provider !== currentProvider && n.id !== currentModel)
      .sort((a, b) => b.capabilityScore - a.capabilityScore);

    return nodes[0]?.id ?? null;
  }

  /**
   * Simplify a task prompt for retry after failures
   */
  private simplifyTask(task: string): string {
    // Remove complex instructions and keep only the core request
    let simplified = task;

    // Remove markdown formatting
    simplified = simplified.replace(/```[\s\S]*?```/g, '[code block removed]');

    // Remove multi-line explanations
    const lines = simplified.split('\n');
    if (lines.length > 5) {
      simplified = lines.slice(0, 3).join('\n');
    }

    // Add simplification hint
    simplified += SIMPLIFIED_PROMPT_SUFFIX;

    return simplified;
  }

  /**
   * Record a successful recovery
   */
  private recordRecoverySuccess(recoveryStart: number): void {
    this.recoveryStats.successes++;
    this.recoveryStats.totalTime += Date.now() - recoveryStart;
  }

  /**
   * Get recovery statistics
   */
  getStats(): RecoveryStats {
    return {
      totalRecoveries: this.recoveryStats.total,
      successRate: this.recoveryStats.total > 0
        ? Math.round((this.recoveryStats.successes / this.recoveryStats.total) * 100) / 100
        : 0,
      avgRecoveryTime: this.recoveryStats.successes > 0
        ? Math.round(this.recoveryStats.totalTime / this.recoveryStats.successes)
        : 0,
    };
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(): RecoveryAction[] {
    return [...this.recoveryHistory];
  }

  /**
   * Get all saved states
   */
  getAllStates(): ExecutionState[] {
    return Array.from(this.states.values());
  }

  /**
   * Clear state for a specific task
   */
  clearState(taskId: string): void {
    this.states.delete(taskId);
  }

  /**
   * Clear all states and history
   */
  clearAll(): void {
    this.states.clear();
    this.recoveryHistory = [];
    this.recoveryStats = { total: 0, successes: 0, totalTime: 0 };
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global failure recovery system — guarantees completion with state preservation and never aborts */
export const failureRecovery = new FailureRecoverySystem();
