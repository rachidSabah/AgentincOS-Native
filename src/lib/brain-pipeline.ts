// ═══════════════════════════════════════════════════════
// AGENTIC OS — 7-Brain Layer Distributed Execution Pipeline
// Each brain layer processes a specialized cognitive function.
// Supports sequential, parallel, and hybrid execution modes.
// ═══════════════════════════════════════════════════════

import { swarmKernel } from './swarm-kernel';
import { modelLoadBalancer } from './model-load-balancer';

// ─── Brain Layer Definitions ───────────────────────────

/** The 7 brain layers with their visual identities */
export const BRAIN_LAYERS = [
  { id: 1, name: 'Planning', color: '#4285f4', icon: '🎯' },
  { id: 2, name: 'Architecture', color: '#9d4edd', icon: '🏗️' },
  { id: 3, name: 'Coding', color: '#00ff88', icon: '💻' },
  { id: 4, name: 'Research', color: '#FFB627', icon: '🔬' },
  { id: 5, name: 'Analysis', color: '#00ffff', icon: '📊' },
  { id: 6, name: 'Execution', color: '#E63946', icon: '⚡' },
  { id: 7, name: 'Optimization', color: '#10b981', icon: '🚀' },
] as const;

/** Total number of brain layers */
export const BRAIN_COUNT = 7;

// ─── Core Types ────────────────────────────────────────

/** Execution state of a single brain layer */
export interface BrainLayerExecution {
  brainId: number;
  brainName: string;
  input: string;
  output: string;
  model: string;
  latency: number;
  tokensUsed: number;
  quality: number;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
}

/** Complete result of a brain pipeline execution */
export interface BrainPipelineResult {
  taskId: string;
  layers: BrainLayerExecution[];
  finalOutput: string;
  totalLatency: number;
  totalTokens: number;
  qualityScore: number;
  modelsUsed: string[];
  executionMode: 'sequential' | 'parallel' | 'hybrid';
}

// ─── Brain System Prompts ──────────────────────────────

const BRAIN_PROMPTS: Record<number, string> = {
  1: `You are the Planning Brain. Your role is to:
- Decompose the task into clear, actionable steps
- Identify dependencies between steps
- Estimate complexity and resource requirements
- Define success criteria for each step
- Create an execution timeline
Output a structured plan with numbered steps, dependencies, and success criteria.`,

  2: `You are the Architecture Brain. Your role is to:
- Design the system architecture based on the plan
- Define component boundaries and interfaces
- Choose appropriate patterns and principles
- Identify potential scalability concerns
- Specify data flow and communication patterns
Output a clear architecture description with component diagrams (text-based) and interface definitions.`,

  3: `You are the Coding Brain. Your role is to:
- Implement the solution based on the architecture design
- Write clean, well-structured, production-quality code
- Follow best practices and design patterns
- Include proper error handling and edge cases
- Add meaningful comments where necessary
Output the complete implementation with all necessary code files.`,

  4: `You are the Research Brain. Your role is to:
- Gather relevant context and information
- Find best practices and known solutions
- Identify potential pitfalls and alternatives
- Verify assumptions with available evidence
- Synthesize findings into actionable insights
Output a research summary with sources, key findings, and recommendations.`,

  5: `You are the Analysis Brain. Your role is to:
- Analyze the output from previous brain layers
- Evaluate correctness, completeness, and quality
- Identify gaps, inconsistencies, or errors
- Measure against success criteria
- Provide quantitative and qualitative assessment
Output a detailed analysis with scores, findings, and improvement suggestions.`,

  6: `You are the Execution Brain. Your role is to:
- Execute the implementation with precision
- Apply all findings from analysis
- Resolve any identified issues
- Ensure all code runs correctly
- Produce the final deliverable
Output the final execution result with all resolved code and artifacts.`,

  7: `You are the Optimization Brain. Your role is to:
- Review the final output for optimization opportunities
- Improve performance, readability, and maintainability
- Reduce redundancy and complexity
- Enhance error handling and robustness
- Apply final polish and refinements
Output the optimized final result with a summary of improvements made.`,
};

// ─── Task Type → Required Brains Mapping ───────────────

const TASK_BRAIN_REQUIREMENTS: Record<string, number[]> = {
  coding: [1, 2, 3, 5, 6, 7],
  research: [1, 4, 5, 7],
  architecture: [1, 2, 5, 7],
  review: [1, 5, 7],
  deployment: [1, 2, 6, 7],
  security: [1, 4, 5, 7],
  testing: [1, 3, 5, 7],
  analysis: [1, 4, 5, 7],
  general: [1, 3, 5, 6, 7],
  full: [1, 2, 3, 4, 5, 6, 7],
};

// ─── Simulated Processing Functions ────────────────────

/**
 * Simulate processing by a brain layer. In production, this would
 * call the actual model API. Here we generate structured output
 * based on the brain's specialty and input context.
 */
function simulateBrainProcessing(
  brainId: number,
  input: string,
  model: string,
): { output: string; latency: number; tokensUsed: number; quality: number } {
  const startTime = Date.now();
  const brain = BRAIN_LAYERS.find(b => b.id === brainId);
  const brainName = brain?.name ?? 'Unknown';

  // Simulate latency based on brain complexity
  const baseLatency = brainId === 3 ? 2000 : brainId === 6 ? 1500 : 800;
  const latency = baseLatency + Math.random() * 1000;

  // Simulate token usage based on input length
  const inputTokens = Math.ceil(input.length / 4);
  const outputTokens = 200 + Math.floor(Math.random() * 300);
  const tokensUsed = inputTokens + outputTokens;

  // Simulate quality (higher for well-matched models)
  const baseQuality = 0.75 + Math.random() * 0.2;

  // Generate structured output based on brain type
  const output = generateBrainOutput(brainId, brainName, input);

  return {
    output,
    latency: Math.round(latency),
    tokensUsed,
    quality: Math.round(baseQuality * 100) / 100,
  };
}

/**
 * Generate structured output for a brain layer based on its specialty
 */
function generateBrainOutput(brainId: number, brainName: string, input: string): string {
  const taskSummary = input.length > 200 ? input.substring(0, 200) + '...' : input;

  switch (brainId) {
    case 1: // Planning
      return `[Planning Brain Output]
Task Analysis: ${taskSummary}

Step 1: Understand Requirements — Identify all functional and non-functional requirements
Step 2: Design Solution — Create high-level solution approach (depends on Step 1)
Step 3: Implement Core — Build the core functionality (depends on Step 2)
Step 4: Implement Edge Cases — Handle edge cases and error scenarios (depends on Step 3)
Step 5: Test & Validate — Verify all requirements are met (depends on Steps 3, 4)
Step 6: Optimize & Polish — Improve performance and code quality (depends on Step 5)

Success Criteria:
- All requirements addressed
- No syntax or runtime errors
- Test coverage ≥ 80%
- Performance within acceptable bounds`;

    case 2: // Architecture
      return `[Architecture Brain Output]
System Design for: ${taskSummary}

Components:
1. Core Module — Main business logic handler
2. Data Layer — Data access and persistence
3. API Interface — External communication layer
4. Utility Module — Shared helpers and utilities

Design Patterns:
- Strategy Pattern for algorithm selection
- Repository Pattern for data access
- Observer Pattern for event-driven updates

Data Flow: Input → Validation → Processing → Storage → Response
Interfaces: Clean API boundaries between all components
Scalability: Stateless design, horizontal scaling ready`;

    case 3: // Coding
      return `[Coding Brain Output]
Implementation for: ${taskSummary}

// Core implementation produced
// Following the architecture design
// With proper error handling and type safety
// Production-quality code with comments

The coding brain has generated the implementation based on the architectural design.
All components are implemented with proper TypeScript types, error handling, and
follow the patterns specified in the architecture layer.`;

    case 4: // Research
      return `[Research Brain Output]
Research Summary for: ${taskSummary}

Key Findings:
1. Best practices identified for the task domain
2. Common pitfalls documented with mitigation strategies
3. Performance benchmarks established for similar implementations
4. Security considerations catalogued

Recommendations:
- Follow established patterns for this type of task
- Implement comprehensive error handling
- Use type-safe approaches throughout
- Consider edge cases identified in research`;

    case 5: // Analysis
      return `[Analysis Brain Output]
Analysis of: ${taskSummary}

Quality Assessment:
- Completeness: 85% — Most requirements addressed
- Correctness: 90% — Logic is sound
- Performance: 80% — Some optimization opportunities exist
- Security: 88% — Good security practices followed

Identified Issues:
1. Minor: Error handling could be more granular
2. Minor: Some duplicate code patterns detected
3. Info: Consider caching for repeated computations

Overall Score: 86/100 — Good quality with room for optimization`;

    case 6: // Execution
      return `[Execution Brain Output]
Execution Result for: ${taskSummary}

All implementation steps completed successfully:
✓ Core functionality implemented
✓ Error handling in place
✓ Edge cases covered
✓ Integration points connected
✓ Output validated

The execution is complete and all identified issues from analysis
have been resolved. The implementation is ready for optimization.`;

    case 7: // Optimization
      return `[Optimization Brain Output]
Optimization Results for: ${taskSummary}

Improvements Applied:
1. Removed redundant code patterns (saved ~15 lines)
2. Improved error message clarity
3. Added memoization for expensive computations
4. Enhanced type narrowing for better type safety
5. Optimized data structure choices

Performance Impact:
- Estimated 20% reduction in execution time
- 10% reduction in memory usage
- Improved code readability score

Final output is optimized and production-ready.`;

    default:
      return `[${brainName} Brain] Processed: ${taskSummary}`;
  }
}

// ─── BrainPipeline Class ───────────────────────────────

/**
 * 7-Brain Layer distributed execution pipeline.
 * Each brain processes a specialized cognitive function and feeds
 * its output to subsequent layers. Supports three execution modes:
 *
 * - Sequential: Each brain feeds its output to the next (default)
 * - Parallel: Brains 3+4+5 run in parallel, then merge
 * - Hybrid: Brain 1→2 sequential, then 3+4+5 parallel, then 6→7 sequential
 */
export class BrainPipeline {
  private executionCache: Map<string, BrainPipelineResult> = new Map();

  /**
   * Execute all 7 brain layers for a task.
   *
   * @param task - The task description to process
   * @param model - The primary model to use for execution
   * @param mode - Execution mode: 'sequential', 'parallel', or 'hybrid'
   * @returns Complete pipeline result with all layer outputs
   */
  async execute(
    task: string,
    model: string,
    mode: 'sequential' | 'parallel' | 'hybrid' = 'hybrid',
  ): Promise<BrainPipelineResult> {
    const taskId = `brain-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const requiredBrains = this.determineRequiredBrains(task);
    const layers: BrainLayerExecution[] = [];

    // Initialize all layers
    for (let i = 1; i <= BRAIN_COUNT; i++) {
      const brainInfo = BRAIN_LAYERS[i - 1]!;
      layers.push({
        brainId: i,
        brainName: brainInfo.name,
        input: '',
        output: '',
        model,
        latency: 0,
        tokensUsed: 0,
        quality: 0,
        status: requiredBrains.includes(i) ? 'pending' : 'skipped',
      });
    }

    let currentInput = task;
    const modelsUsed: string[] = [];

    if (mode === 'sequential') {
      // Sequential execution: each brain feeds the next
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i]!;
        if (layer.status === 'skipped') continue;

        layer.status = 'running';
        layer.input = currentInput;

        // Get optimal model for this brain layer
        const optimalModel = swarmKernel.getOptimalModel(
          this.getBrainRole(layer.brainId),
          this.detectTaskType(task),
        );
        layer.model = optimalModel;
        if (!modelsUsed.includes(optimalModel)) {
          modelsUsed.push(optimalModel);
        }

        try {
          const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';

          // Feed output to next brain
          currentInput = result.output;
        } catch {
          layer.status = 'failed';
          // Continue with input as output for failed layers
          layer.output = `[Layer ${layer.brainName} failed] ${currentInput}`;
        }
      }
    } else if (mode === 'parallel') {
      // Parallel: Run brains 1→2 sequentially first (dependency)
      for (let i = 0; i < 2; i++) {
        const layer = layers[i]!;
        if (layer.status === 'skipped') continue;

        layer.status = 'running';
        layer.input = currentInput;

        const optimalModel = swarmKernel.getOptimalModel(
          this.getBrainRole(layer.brainId),
          this.detectTaskType(task),
        );
        layer.model = optimalModel;
        if (!modelsUsed.includes(optimalModel)) {
          modelsUsed.push(optimalModel);
        }

        try {
          const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';
          currentInput = result.output;
        } catch {
          layer.status = 'failed';
          layer.output = `[Layer ${layer.brainName} failed] ${currentInput}`;
        }
      }

      // Run brains 3, 4, 5 in parallel
      const parallelBrains = [2, 3, 4]; // indices for brains 3, 4, 5
      const parallelResults = await Promise.allSettled(
        parallelBrains.map(async (idx) => {
          const layer = layers[idx]!;
          if (layer.status === 'skipped') {
            return { idx, result: null };
          }

          layer.status = 'running';
          layer.input = currentInput;

          const optimalModel = swarmKernel.getOptimalModel(
            this.getBrainRole(layer.brainId),
            this.detectTaskType(task),
          );
          layer.model = optimalModel;

          try {
            const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
            return { idx, result };
          } catch {
            return { idx, result: null };
          }
        })
      );

      // Collect parallel results
      const parallelOutputs: string[] = [];
      for (const settled of parallelResults) {
        if (settled.status === 'fulfilled' && settled.value.result) {
          const { idx, result } = settled.value;
          const layer = layers[idx]!;
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';
          parallelOutputs.push(result.output);
          if (!modelsUsed.includes(layer.model)) {
            modelsUsed.push(layer.model);
          }
        } else if (settled.status === 'fulfilled') {
          const { idx } = settled.value;
          layers[idx]!.status = 'failed';
          layers[idx]!.output = `[Layer ${layers[idx]!.brainName} failed] ${currentInput}`;
        }
      }

      // Merge parallel outputs
      currentInput = parallelOutputs.length > 0
        ? parallelOutputs.join('\n\n---\n\n')
        : currentInput;

      // Run brains 6, 7 sequentially on merged output
      for (let i = 5; i < 7; i++) {
        const layer = layers[i]!;
        if (layer.status === 'skipped') continue;

        layer.status = 'running';
        layer.input = currentInput;

        const optimalModel = swarmKernel.getOptimalModel(
          this.getBrainRole(layer.brainId),
          this.detectTaskType(task),
        );
        layer.model = optimalModel;
        if (!modelsUsed.includes(optimalModel)) {
          modelsUsed.push(optimalModel);
        }

        try {
          const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';
          currentInput = result.output;
        } catch {
          layer.status = 'failed';
          layer.output = `[Layer ${layer.brainName} failed] ${currentInput}`;
        }
      }
    } else {
      // Hybrid mode: 1→2 sequential, 3+4+5 parallel, 6→7 sequential
      // Phase 1: Sequential 1→2
      for (let i = 0; i < 2; i++) {
        const layer = layers[i]!;
        if (layer.status === 'skipped') continue;

        layer.status = 'running';
        layer.input = currentInput;

        const optimalModel = swarmKernel.getOptimalModel(
          this.getBrainRole(layer.brainId),
          this.detectTaskType(task),
        );
        layer.model = optimalModel;
        if (!modelsUsed.includes(optimalModel)) {
          modelsUsed.push(optimalModel);
        }

        try {
          const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';
          currentInput = result.output;
        } catch {
          layer.status = 'failed';
          layer.output = `[Layer ${layer.brainName} failed] ${currentInput}`;
        }
      }

      // Phase 2: Parallel 3+4+5
      const parallelIndices = [2, 3, 4]; // brains 3, 4, 5
      const parallelPromises = parallelIndices.map(async (idx) => {
        const layer = layers[idx]!;
        if (layer.status === 'skipped') return { idx, result: null };

        layer.status = 'running';
        layer.input = currentInput;

        const optimalModel = swarmKernel.getOptimalModel(
          this.getBrainRole(layer.brainId),
          this.detectTaskType(task),
        );
        layer.model = optimalModel;

        try {
          const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
          return { idx, result };
        } catch {
          return { idx, result: null };
        }
      });

      const parallelSettled = await Promise.allSettled(parallelPromises);
      const mergedOutputs: string[] = [];

      for (const settled of parallelSettled) {
        if (settled.status === 'fulfilled' && settled.value.result) {
          const { idx, result } = settled.value;
          const layer = layers[idx]!;
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';
          mergedOutputs.push(result.output);
          if (!modelsUsed.includes(layer.model)) {
            modelsUsed.push(layer.model);
          }
        } else if (settled.status === 'fulfilled') {
          const { idx } = settled.value;
          layers[idx]!.status = 'failed';
          layers[idx]!.output = `[Layer ${layers[idx]!.brainName} failed]`;
        }
      }

      // Merge parallel outputs for next phase
      currentInput = mergedOutputs.length > 0
        ? `# Merged Parallel Results\n\n${mergedOutputs.join('\n\n---\n\n')}`
        : currentInput;

      // Phase 3: Sequential 6→7
      for (let i = 5; i < 7; i++) {
        const layer = layers[i]!;
        if (layer.status === 'skipped') continue;

        layer.status = 'running';
        layer.input = currentInput;

        const optimalModel = swarmKernel.getOptimalModel(
          this.getBrainRole(layer.brainId),
          this.detectTaskType(task),
        );
        layer.model = optimalModel;
        if (!modelsUsed.includes(optimalModel)) {
          modelsUsed.push(optimalModel);
        }

        try {
          const result = await this.executeLayer(layer.brainId, currentInput, optimalModel);
          layer.output = result.output;
          layer.latency = result.latency;
          layer.tokensUsed = result.tokensUsed;
          layer.quality = result.quality;
          layer.status = 'completed';
          currentInput = result.output;
        } catch {
          layer.status = 'failed';
          layer.output = `[Layer ${layer.brainName} failed] ${currentInput}`;
        }
      }
    }

    // Calculate aggregate metrics
    const completedLayers = layers.filter(l => l.status === 'completed');
    const totalLatency = layers.reduce((sum, l) => sum + l.latency, 0);
    const totalTokens = layers.reduce((sum, l) => sum + l.tokensUsed, 0);
    const qualityScore = completedLayers.length > 0
      ? completedLayers.reduce((sum, l) => sum + l.quality, 0) / completedLayers.length
      : 0;

    // Final output is the last completed layer's output
    const finalOutput = currentInput;

    const result: BrainPipelineResult = {
      taskId,
      layers,
      finalOutput,
      totalLatency,
      totalTokens,
      qualityScore: Math.round(qualityScore * 100) / 100,
      modelsUsed,
      executionMode: mode,
    };

    // Cache result
    this.executionCache.set(taskId, result);

    return result;
  }

  /**
   * Execute a single brain layer.
   *
   * @param brainId - The brain layer ID (1-7)
   * @param input - The input to process
   * @param model - The model to use for processing
   * @returns Brain layer execution result
   */
  async executeLayer(
    brainId: number,
    input: string,
    model: string,
  ): Promise<BrainLayerExecution> {
    const brain = BRAIN_LAYERS[brainId - 1];
    if (!brain) {
      throw new Error(`Invalid brain ID: ${brainId}`);
    }

    // Track load on the model
    modelLoadBalancer.incrementLoad(model);

    try {
      const result = simulateBrainProcessing(brainId, input, model);

      // Decrement load on completion
      modelLoadBalancer.decrementLoad(model, true, result.latency);

      return {
        brainId,
        brainName: brain.name,
        input,
        output: result.output,
        model,
        latency: result.latency,
        tokensUsed: result.tokensUsed,
        quality: result.quality,
        status: 'completed',
      };
    } catch (error) {
      // Decrement load on failure
      modelLoadBalancer.decrementLoad(model, false, 0);

      return {
        brainId,
        brainName: brain.name,
        input,
        output: '',
        model,
        latency: 0,
        tokensUsed: 0,
        quality: 0,
        status: 'failed',
      };
    }
  }

  /**
   * Determine which brain layers are needed for a given task.
   * Not all tasks require all 7 layers.
   *
   * @param task - The task description
   * @returns Array of required brain IDs (1-7)
   */
  determineRequiredBrains(task: string): number[] {
    const taskType = this.detectTaskType(task);

    // Check for explicit "full" request
    if (/full.*pipeline|all.*brains|complete.*analysis/i.test(task)) {
      return [1, 2, 3, 4, 5, 6, 7];
    }

    // Check for minimal request
    if (/quick|simple|fast|minimal/i.test(task)) {
      return [1, 3, 6]; // Planning, Coding, Execution only
    }

    // Use task type mapping
    const required = TASK_BRAIN_REQUIREMENTS[taskType] ?? TASK_BRAIN_REQUIREMENTS['general']!;

    return [...required];
  }

  /**
   * Get the system prompt for a specific brain layer.
   * Each brain has a specialized prompt that focuses its cognitive function.
   *
   * @param brainId - The brain layer ID (1-7)
   * @returns The system prompt string for the brain
   */
  getBrainPrompt(brainId: number): string {
    return BRAIN_PROMPTS[brainId] ?? `You are Brain Layer ${brainId}. Process the input according to your specialized function.`;
  }

  /**
   * Get all brain prompts
   */
  getAllBrainPrompts(): Record<number, string> {
    return { ...BRAIN_PROMPTS };
  }

  /**
   * Get cached pipeline result
   */
  getCachedResult(taskId: string): BrainPipelineResult | undefined {
    return this.executionCache.get(taskId);
  }

  /**
   * Clear execution cache
   */
  clearCache(): void {
    this.executionCache.clear();
  }

  // ─── Helper Methods ─────────────────────────────────

  /**
   * Detect the primary task type from description
   */
  private detectTaskType(task: string): string {
    const lower = task.toLowerCase();

    if (/code|build|implement|develop|program|function|debug|fix/i.test(lower)) return 'coding';
    if (/research|investigate|explore|study|find/i.test(lower)) return 'research';
    if (/architect|design|system|structure|pattern/i.test(lower)) return 'architecture';
    if (/review|audit|verify|validate|check/i.test(lower)) return 'review';
    if (/deploy|ci.?cd|pipeline|release|publish/i.test(lower)) return 'deployment';
    if (/security|vulnerability|penetration|exploit/i.test(lower)) return 'security';
    if (/test|spec|coverage|qa/i.test(lower)) return 'testing';
    if (/analyz|metric|dashboard|insight/i.test(lower)) return 'analysis';

    return 'general';
  }

  /**
   * Map brain ID to agent role for model selection
   */
  private getBrainRole(brainId: number): string {
    const roleMap: Record<number, string> = {
      1: 'planner',
      2: 'architect',
      3: 'coder',
      4: 'researcher',
      5: 'reviewer',
      6: 'executor',
      7: 'optimizer',
    };
    return roleMap[brainId] ?? 'worker';
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global brain pipeline instance — manages 7-layer cognitive execution */
export const brainPipeline = new BrainPipeline();
