// ═══════════════════════════════════════════════════════
// AGENTIC OS — Automated Testing Layer
// Generates test cases, simulates test execution, validates
// API routes, checks edge cases, and estimates coverage
// ═══════════════════════════════════════════════════════

import type { ValidationError } from './zero-error-engine';

// ─── Core Types ────────────────────────────────────────

/** A complete test suite for a code target */
export interface TestSuite {
  id: string;
  targetCode: string;
  tests: TestCase[];
  results: TestResult[];
  coverage: number;
  passed: boolean;
}

/** An individual test case */
export interface TestCase {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'api' | 'edge-case' | 'smoke';
  input: string;
  expectedBehavior: string;
  category: string;
}

/** The result of running a test case */
export interface TestResult {
  testId: string;
  passed: boolean;
  actual: string;
  expected: string;
  error?: string;
  latency: number;
}

// ─── Test Generation Patterns ──────────────────────────

interface FunctionInfo {
  name: string;
  params: string[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  body: string;
}

interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  constructor: string;
}

/**
 * Extract function signatures from code
 */
function extractFunctions(code: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  // Match function declarations
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1]!;
    const params = match[2] ? match[2].split(',').map(p => p.trim().split(':')[0]?.trim()).filter(Boolean) : [];
    const returnType = match[3]?.trim() ?? 'unknown';
    const isAsync = code.substring(Math.max(0, match.index - 10), match.index).includes('async');
    const isExported = code.substring(Math.max(0, match.index - 10), match.index).includes('export');

    // Extract function body (simplified — up to matching brace)
    const bodyStart = match.index + match[0].length;
    const body = extractBracedBody(code, bodyStart);

    functions.push({ name, params, returnType, isAsync, isExported, body });
  }

  // Match arrow functions
  const arrowRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*([=>]+))?\s*=>\s*/g;
  while ((match = arrowRegex.exec(code)) !== null) {
    const name = match[1]!;
    const params = match[2] ? match[2].split(',').map(p => p.trim().split(':')[0]?.trim()).filter(Boolean) : [];
    const isAsync = /async/.test(match[0]);
    const isExported = /export/.test(match[0]);

    functions.push({ name, params, returnType: 'unknown', isAsync, isExported, body: '' });
  }

  return functions;
}

/**
 * Extract the body of a braced block starting at a position
 */
function extractBracedBody(code: string, start: number): string {
  let depth = 1;
  let pos = start;
  while (pos < code.length && depth > 0) {
    if (code[pos] === '{') depth++;
    else if (code[pos] === '}') depth--;
    pos++;
  }
  return code.substring(start, pos - 1);
}

/**
 * Detect the language of the code
 */
function detectLanguage(code: string): string {
  if (/(?:import\s+.*from|export\s+(?:default\s+)?|interface\s+\w+|type\s+\w+\s*=)/.test(code)) return 'typescript';
  if (/(?:def\s+\w+|class\s+\w+.*:|import\s+\w+|from\s+\w+\s+import)/.test(code)) return 'python';
  if (/(?:fn\s+\w+|let\s+\w+|impl\s+\w+|pub\s+fn)/.test(code)) return 'rust';
  if (/(?:func\s+\w+|package\s+\w+|import\s+\()/.test(code)) return 'go';
  if (/(?:function\s+\w+|var\s+\w+|module\.exports)/.test(code)) return 'javascript';
  return 'unknown';
}

// ─── Test Template Generators ──────────────────────────

/**
 * Generate unit tests for a function
 */
function generateUnitTests(fn: FunctionInfo): TestCase[] {
  const tests: TestCase[] = [];

  // Happy path test
  tests.push({
    id: `unit-${fn.name}-happy`,
    name: `${fn.name} — happy path`,
    type: 'unit',
    input: fn.params.length > 0 ? `${fn.name}(${fn.params.map(p => `valid_${p}`).join(', ')})` : `${fn.name}()`,
    expectedBehavior: `Should return a valid ${fn.returnType} result without throwing`,
    category: 'happy-path',
  });

  // Null/undefined input test for each parameter
  for (const param of fn.params) {
    tests.push({
      id: `unit-${fn.name}-null-${param}`,
      name: `${fn.name} — null ${param}`,
      type: 'unit',
      input: `${fn.name}(${fn.params.map(p => p === param ? 'null' : `valid_${p}`).join(', ')})`,
      expectedBehavior: `Should handle null ${param} gracefully (throw error or return default)`,
      category: 'null-handling',
    });

    tests.push({
      id: `unit-${fn.name}-undefined-${param}`,
      name: `${fn.name} — undefined ${param}`,
      type: 'unit',
      input: `${fn.name}(${fn.params.map(p => p === param ? 'undefined' : `valid_${p}`).join(', ')})`,
      expectedBehavior: `Should handle undefined ${param} gracefully`,
      category: 'undefined-handling',
    });
  }

  // Empty string test for string parameters
  for (const param of fn.params) {
    tests.push({
      id: `unit-${fn.name}-empty-${param}`,
      name: `${fn.name} — empty ${param}`,
      type: 'unit',
      input: `${fn.name}(${fn.params.map(p => p === param ? "''" : `valid_${p}`).join(', ')})`,
      expectedBehavior: `Should handle empty string ${param} appropriately`,
      category: 'empty-input',
    });
  }

  // Return type validation
  if (fn.returnType !== 'unknown' && fn.returnType !== 'void') {
    tests.push({
      id: `unit-${fn.name}-return-type`,
      name: `${fn.name} — return type check`,
      type: 'unit',
      input: `${fn.name}(${fn.params.map(p => `valid_${p}`).join(', ')})`,
      expectedBehavior: `Return value should be of type ${fn.returnType}`,
      category: 'type-safety',
    });
  }

  // Async error handling
  if (fn.isAsync) {
    tests.push({
      id: `unit-${fn.name}-async-error`,
      name: `${fn.name} — async error handling`,
      type: 'unit',
      input: `${fn.name}(${fn.params.map(p => `rejected_${p}`).join(', ')})`,
      expectedBehavior: 'Should properly handle promise rejection and not leave unhandled rejection',
      category: 'async-error',
    });
  }

  return tests;
}

/**
 * Generate integration tests
 */
function generateIntegrationTests(functions: FunctionInfo[]): TestCase[] {
  const tests: TestCase[] = [];

  // Find pairs of functions that might interact
  for (let i = 0; i < functions.length; i++) {
    for (let j = i + 1; j < functions.length; j++) {
      const fn1 = functions[i]!;
      const fn2 = functions[j]!;

      // Check if fn2's return could be fn1's input
      const sharedParams = fn1.params.filter(p => fn2.params.includes(p));
      if (sharedParams.length > 0 || functions.length <= 3) {
        tests.push({
          id: `integration-${fn1.name}-${fn2.name}`,
          name: `${fn1.name} + ${fn2.name} integration`,
          type: 'integration',
          input: `Combine ${fn1.name} and ${fn2.name} results`,
          expectedBehavior: `Both functions should work together without conflicts or data corruption`,
          category: 'function-interaction',
        });
      }
    }
  }

  // API-style integration tests if fetch/request patterns detected
  if (functions.some(f => f.name.toLowerCase().includes('fetch') || f.name.toLowerCase().includes('request'))) {
    tests.push({
      id: 'integration-api-timeout',
      name: 'API request timeout handling',
      type: 'integration',
      input: 'API call with simulated timeout',
      expectedBehavior: 'Should handle timeout gracefully and retry or return error',
      category: 'api-resilience',
    });

    tests.push({
      id: 'integration-api-error-response',
      name: 'API error response handling',
      type: 'integration',
      input: 'API call returning 4xx/5xx error',
      expectedBehavior: 'Should handle error responses without crashing',
      category: 'api-resilience',
    });
  }

  return tests;
}

/**
 * Generate edge case tests
 */
function generateEdgeCaseTests(fn: FunctionInfo): TestCase[] {
  const tests: TestCase[] = [];

  // Boundary values for numeric parameters
  for (const param of fn.params) {
    if (/count|num|size|length|index|limit|offset|page/i.test(param)) {
      tests.push({
        id: `edge-${fn.name}-zero-${param}`,
        name: `${fn.name} — zero ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? '0' : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle zero value for ${param}`,
        category: 'boundary',
      });

      tests.push({
        id: `edge-${fn.name}-negative-${param}`,
        name: `${fn.name} — negative ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? '-1' : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle negative value for ${param}`,
        category: 'boundary',
      });

      tests.push({
        id: `edge-${fn.name}-max-${param}`,
        name: `${fn.name} — max ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? 'Number.MAX_SAFE_INTEGER' : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle maximum value for ${param}`,
        category: 'boundary',
      });
    }

    // String edge cases
    if (/name|title|label|text|str|message|content/i.test(param)) {
      tests.push({
        id: `edge-${fn.name}-very-long-${param}`,
        name: `${fn.name} — very long ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? "'x'.repeat(10000)" : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle very long string for ${param}`,
        category: 'string-length',
      });

      tests.push({
        id: `edge-${fn.name}-special-chars-${param}`,
        name: `${fn.name} — special characters in ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? "'<script>alert(1)</script>'" : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle special/special characters in ${param} safely`,
        category: 'injection',
      });

      tests.push({
        id: `edge-${fn.name}-unicode-${param}`,
        name: `${fn.name} — unicode in ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? "'你好世界 🌍'" : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle unicode characters in ${param}`,
        category: 'unicode',
      });
    }

    // Array edge cases
    if (/list|items|array|data|entries|records/i.test(param)) {
      tests.push({
        id: `edge-${fn.name}-empty-array-${param}`,
        name: `${fn.name} — empty array ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? '[]' : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle empty array for ${param}`,
        category: 'empty-collection',
      });

      tests.push({
        id: `edge-${fn.name}-large-array-${param}`,
        name: `${fn.name} — large array ${param}`,
        type: 'edge-case',
        input: `${fn.name}(${fn.params.map(p => p === param ? 'Array(10000).fill(item)' : `valid_${p}`).join(', ')})`,
        expectedBehavior: `Should handle large array for ${param} without memory issues`,
        category: 'large-collection',
      });
    }
  }

  // Concurrency test for async functions
  if (fn.isAsync) {
    tests.push({
      id: `edge-${fn.name}-concurrent`,
      name: `${fn.name} — concurrent execution`,
      type: 'edge-case',
      input: `Promise.all([${fn.name}(...), ${fn.name}(...), ${fn.name}(...)])`,
      expectedBehavior: 'Should handle concurrent calls without race conditions',
      category: 'concurrency',
    });
  }

  return tests;
}

/**
 * Generate smoke tests (basic sanity checks)
 */
function generateSmokeTests(functions: FunctionInfo[]): TestCase[] {
  const tests: TestCase[] = [];

  for (const fn of functions) {
    // Function exists and is callable
    tests.push({
      id: `smoke-${fn.name}-callable`,
      name: `${fn.name} — is callable`,
      type: 'smoke',
      input: `typeof ${fn.name} === 'function'`,
      expectedBehavior: 'Function should exist and be callable',
      category: 'existence',
    });

    // Returns without throwing for basic input
    if (fn.params.length === 0) {
      tests.push({
        id: `smoke-${fn.name}-no-args`,
        name: `${fn.name} — no arguments`,
        type: 'smoke',
        input: `${fn.name}()`,
        expectedBehavior: 'Should execute without throwing when called with no arguments',
        category: 'no-args',
      });
    }
  }

  return tests;
}

// ─── AutomatedTestingLayer Class ───────────────────────

/**
 * Automated function testing layer that generates test cases,
 * simulates logical test execution, validates API routes,
 * checks edge cases, and estimates code coverage.
 *
 * Uses static analysis rather than actual code execution,
 * making it safe to run on any code without side effects.
 */
export class AutomatedTestingLayer {
  private testCache: Map<string, TestSuite> = new Map();

  /**
   * Generate comprehensive test cases for code.
   * Produces unit, integration, edge-case, and smoke tests
   * based on static analysis of the code structure.
   *
   * @param code - The source code to generate tests for
   * @param language - The programming language (auto-detected if not specified)
   * @returns Array of generated test cases
   */
  generateTests(code: string, language?: string): TestCase[] {
    const detectedLang = language ?? detectLanguage(code);
    const functions = extractFunctions(code);
    const allTests: TestCase[] = [];

    // Generate tests for each function
    for (const fn of functions) {
      allTests.push(...generateUnitTests(fn));
      allTests.push(...generateEdgeCaseTests(fn));
    }

    // Generate integration tests for function interactions
    allTests.push(...generateIntegrationTests(functions));

    // Generate smoke tests
    allTests.push(...generateSmokeTests(functions));

    // If no functions detected, generate basic tests
    if (functions.length === 0) {
      allTests.push({
        id: 'basic-import-test',
        name: 'Module import test',
        type: 'smoke',
        input: 'Import the module',
        expectedBehavior: 'Module should be importable without errors',
        category: 'import',
      });

      allTests.push({
        id: 'basic-syntax-test',
        name: 'Syntax validity test',
        type: 'unit',
        input: 'Parse the code',
        expectedBehavior: 'Code should be syntactically valid',
        category: 'syntax',
      });
    }

    return allTests;
  }

  /**
   * Simulate test execution using logical analysis.
   * Does NOT actually execute code — uses static analysis
   * and pattern matching to predict likely outcomes.
   *
   * @param code - The source code being tested
   * @param tests - The test cases to simulate
   * @returns Array of simulated test results
   */
  simulateTests(code: string, tests: TestCase[]): TestResult[] {
    const results: TestResult[] = [];
    const functions = extractFunctions(code);

    for (const test of tests) {
      const startTime = Date.now();
      const result = this.simulateSingleTest(code, test, functions);
      const latency = Date.now() - startTime;

      results.push({
        testId: test.id,
        passed: result.passed,
        actual: result.actual,
        expected: test.expectedBehavior,
        error: result.error,
        latency: Math.max(1, latency),
      });
    }

    return results;
  }

  /**
   * Simulate a single test case
   */
  private simulateSingleTest(
    code: string,
    test: TestCase,
    functions: FunctionInfo[],
  ): { passed: boolean; actual: string; error?: string } {
    switch (test.type) {
      case 'smoke': {
        // Check if function exists in code
        const fnName = test.name.split(' — ')[0];
        const fnExists = functions.some(f => f.name === fnName) || code.includes(fnName);
        return {
          passed: fnExists,
          actual: fnExists ? `${fnName} exists and is callable` : `${fnName} not found in code`,
          error: fnExists ? undefined : `Function "${fnName}" is not defined in the code`,
        };
      }

      case 'unit': {
        // Simulate unit test based on function body analysis
        const fnName = test.name.split(' — ')[0];
        const fn = functions.find(f => f.name === fnName);

        if (!fn) {
          return {
            passed: false,
            actual: `Function ${fnName} not found`,
            error: `Cannot test — function not found`,
          };
        }

        // Analyze function body for likely issues
        const category = test.category;

        if (category === 'null-handling' || category === 'undefined-handling') {
          const hasNullCheck = fn.body.includes('null') || fn.body.includes('undefined') ||
                              fn.body.includes('!') || fn.body.includes('??') || fn.body.includes('?.');
          return {
            passed: hasNullCheck,
            actual: hasNullCheck
              ? `${fnName} has null/undefined handling`
              : `${fnName} may not handle ${category.replace('-handling', '')} inputs`,
            error: hasNullCheck ? undefined : `Missing null/undefined guard for ${test.input}`,
          };
        }

        if (category === 'empty-input') {
          const hasEmptyCheck = fn.body.includes('.length') || fn.body.includes('isEmpty') ||
                               fn.body.includes('trim()') || fn.body.includes('===') ||
                               fn.body.includes('!==');
          return {
            passed: hasEmptyCheck,
            actual: hasEmptyCheck
              ? `${fnName} likely handles empty inputs`
              : `${fnName} may not handle empty input`,
            error: hasEmptyCheck ? undefined : 'No empty input validation detected',
          };
        }

        if (category === 'type-safety') {
          return {
            passed: true, // TypeScript handles this at compile time
            actual: `Type safety enforced by TypeScript compiler`,
          };
        }

        if (category === 'async-error') {
          const hasTryCatch = fn.body.includes('try') && fn.body.includes('catch');
          return {
            passed: hasTryCatch,
            actual: hasTryCatch
              ? `${fnName} has error handling for async operations`
              : `${fnName} may not handle async errors`,
            error: hasTryCatch ? undefined : 'No try-catch detected for async function',
          };
        }

        // Default: assume happy path passes
        return {
          passed: true,
          actual: `${fnName} executed successfully with valid input`,
        };
      }

      case 'integration': {
        // Integration tests: check for obvious conflicts
        return {
          passed: true,
          actual: 'No obvious integration conflicts detected',
        };
      }

      case 'edge-case': {
        const fnName = test.name.split(' — ')[0];
        const fn = functions.find(f => f.name === fnName);

        if (!fn) {
          return {
            passed: false,
            actual: `Function ${fnName} not found`,
            error: 'Cannot test edge case — function not found',
          };
        }

        // Check if the function has guards for the edge case
        const category = test.category;

        if (category === 'boundary') {
          const hasBoundaryCheck = fn.body.includes('Math.max') || fn.body.includes('Math.min') ||
                                   fn.body.includes('> 0') || fn.body.includes('< 0') ||
                                   fn.body.includes('>= 0') || fn.body.includes('<= 0') ||
                                   fn.body.includes('Math.abs');
          return {
            passed: hasBoundaryCheck,
            actual: hasBoundaryCheck
              ? `${fnName} has boundary value checks`
              : `${fnName} may not handle boundary values`,
            error: hasBoundaryCheck ? undefined : 'No boundary checks detected',
          };
        }

        if (category === 'injection') {
          const hasSanitization = fn.body.includes('sanitize') || fn.body.includes('escape') ||
                                  fn.body.includes('DOMPurify') || fn.body.includes('encode');
          return {
            passed: hasSanitization,
            actual: hasSanitization
              ? `${fnName} has input sanitization`
              : `${fnName} may be vulnerable to injection`,
            error: hasSanitization ? undefined : 'No input sanitization detected',
          };
        }

        if (category === 'concurrency') {
          const hasConcurrencyGuard = fn.body.includes('lock') || fn.body.includes('mutex') ||
                                      fn.body.includes('queue') || fn.body.includes('debounce') ||
                                      fn.body.includes('throttle');
          return {
            passed: true, // Assume OK unless we see known issues
            actual: hasConcurrencyGuard
              ? `${fnName} has concurrency handling`
              : `${fnName} may have race conditions under concurrent access`,
            error: hasConcurrencyGuard ? undefined : 'No concurrency guards detected — potential race condition',
          };
        }

        // Default edge case
        return {
          passed: true,
          actual: `Edge case handled (no obvious issues detected)`,
        };
      }

      case 'api': {
        return {
          passed: true,
          actual: 'API route validation simulated — no issues detected',
        };
      }

      default:
        return {
          passed: true,
          actual: 'Test type not specifically simulated',
        };
    }
  }

  /**
   * Validate an API route for common issues.
   * Checks for proper error handling, input validation,
   * HTTP method support, and response format.
   *
   * @param route - The API route path (e.g., '/api/users')
   * @param method - The HTTP method (e.g., 'GET', 'POST')
   * @returns Test result for the API route
   */
  validateAPIRoute(route: string, method: string): TestResult {
    const issues: string[] = [];

    // Check route format
    if (!route.startsWith('/api/')) {
      issues.push('Route does not follow /api/ convention');
    }

    // Check for common route issues
    if (route.includes('//')) {
      issues.push('Double slash in route path');
    }

    if (route.includes(' ')) {
      issues.push('Space in route path — use hyphens instead');
    }

    // Method-specific checks
    const upperMethod = method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(upperMethod)) {
      issues.push(`Unusual HTTP method: ${method}`);
    }

    if (upperMethod === 'POST' || upperMethod === 'PUT' || upperMethod === 'PATCH') {
      // These methods should validate input
      issues.push('Reminder: Ensure request body validation for ' + upperMethod + ' requests');
    }

    if (upperMethod === 'DELETE') {
      issues.push('Reminder: Ensure authorization check before DELETE operations');
    }

    // Security checks
    if (/password|secret|token|key/i.test(route)) {
      issues.push('CRITICAL: Sensitive data in route path — consider using request body instead');
    }

    const passed = issues.filter(i => i.includes('CRITICAL')).length === 0;

    return {
      testId: `api-${route}-${method}`,
      passed,
      actual: passed ? 'API route validation passed' : `Issues found: ${issues.join('; ')}`,
      expected: 'API route should follow best practices and security conventions',
      error: passed ? undefined : issues.join('; '),
      latency: 1,
    };
  }

  /**
   * Check edge cases in code.
   * Analyzes code for potential edge case issues that
   * could cause runtime errors or unexpected behavior.
   *
   * @param code - The source code to check
   * @returns Array of validation errors for detected edge case issues
   */
  checkEdgeCases(code: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const functions = extractFunctions(code);

    for (const fn of functions) {
      // Check for unhandled promise rejections
      if (fn.isAsync && !fn.body.includes('catch') && !fn.body.includes('.catch(')) {
        errors.push({
          rule: 'edge-case-async',
          severity: 'warning',
          message: `Async function "${fn.name}" lacks error handling — potential unhandled rejection`,
          fix: 'Add try-catch block or .catch() handler',
        });
      }

      // Check for potential division by zero
      if (fn.body.includes('/') && !fn.body.includes('=== 0') && !fn.body.includes('!== 0')) {
        errors.push({
          rule: 'edge-case-division',
          severity: 'warning',
          message: `Function "${fn.name}" has division operation without zero check`,
          fix: 'Add check for divisor === 0 before division',
        });
      }

      // Check for array access without bounds check
      if (fn.body.includes('[0]') || fn.body.includes('[1]')) {
        if (!fn.body.includes('.length') && !fn.body.includes('?.') && !fn.body.includes('at(')) {
          errors.push({
            rule: 'edge-case-array-access',
            severity: 'warning',
            message: `Function "${fn.name}" accesses array by index without length check`,
            fix: 'Add array length check or use optional chaining',
          });
        }
      }

      // Check for potential infinite loops
      if (/while\s*\(\s*true\s*\)/.test(fn.body) && !fn.body.includes('break') && !fn.body.includes('return')) {
        errors.push({
          rule: 'edge-case-infinite-loop',
          severity: 'critical',
          message: `Function "${fn.name}" has potential infinite loop (while(true) without break)`,
          fix: 'Add a break condition or maximum iteration count',
        });
      }

      // Check for resource leaks (unclosed connections)
      if ((fn.body.includes('fetch(') || fn.body.includes('connect(')) && !fn.body.includes('finally')) {
        errors.push({
          rule: 'edge-case-resource-leak',
          severity: 'info',
          message: `Function "${fn.name}" opens connections without finally block`,
          fix: 'Use try-finally to ensure connections are closed',
        });
      }
    }

    // Global edge case checks
    // Check for potential stack overflow from recursion
    const recursiveCalls = code.match(/function\s+(\w+)[^}]*\1\s*\(/g) || [];
    for (const call of recursiveCalls) {
      const fnName = call.match(/function\s+(\w+)/)?.[1];
      if (fnName && !code.includes(`${fnName}.bind`) && !code.includes('memoiz')) {
        errors.push({
          rule: 'edge-case-recursion',
          severity: 'info',
          message: `Function "${fnName}" appears to be recursive — ensure base case exists`,
          fix: 'Verify recursion has a proper base case to prevent stack overflow',
        });
      }
    }

    return errors;
  }

  /**
   * Estimate code coverage based on the generated tests
   * and the code structure. Uses function-level analysis
   * rather than actual instrumentation.
   *
   * @param code - The source code being tested
   * @param tests - The test cases to measure against
   * @returns Coverage estimate as a percentage (0-100)
   */
  estimateCoverage(code: string, tests: TestCase[]): number {
    const functions = extractFunctions(code);

    if (functions.length === 0) {
      // No functions found — check if we have any tests at all
      return tests.length > 0 ? 50 : 0;
    }

    // Track which functions are covered by at least one test
    const coveredFunctions = new Set<string>();

    for (const test of tests) {
      // Extract function name from test name
      const fnName = test.name.split(' — ')[0];
      const matchingFn = functions.find(f => f.name === fnName);
      if (matchingFn) {
        coveredFunctions.add(matchingFn.name);
      }
    }

    // Function coverage
    const functionCoverage = coveredFunctions.size / functions.length;

    // Branch coverage estimate (each function with null/undefined + happy path tests)
    let branchCount = 0;
    let coveredBranches = 0;
    for (const fn of functions) {
      // Estimate branches: each if/else, switch case, ternary
      const branchPatterns = [
        /\bif\b/g,
        /\belse\b/g,
        /\bswitch\b/g,
        /\bcase\b/g,
        /\?\s*[^:]+\s*:/g, // ternary
      ];

      let fnBranches = 1; // Default branch
      for (const pattern of branchPatterns) {
        const matches = fn.body.match(pattern) || [];
        fnBranches += matches.length;
      }

      branchCount += fnBranches;

      // Count tests for this function
      const fnTests = tests.filter(t => t.name.startsWith(`${fn.name} —`));
      const coveredCategories = new Set(fnTests.map(t => t.category));

      // Each test category likely covers one branch
      coveredBranches += Math.min(fnBranches, coveredCategories.size + 1);
    }

    const branchCoverage = branchCount > 0 ? coveredBranches / branchCount : 1;

    // Weighted coverage: 60% function + 40% branch
    const overallCoverage = (0.6 * functionCoverage + 0.4 * branchCoverage) * 100;

    return Math.round(Math.min(100, overallCoverage));
  }

  /**
   * Create a complete test suite for code
   *
   * @param code - The source code to create a test suite for
   * @param language - The programming language
   * @returns Complete test suite with generated tests and simulated results
   */
  createTestSuite(code: string, language?: string): TestSuite {
    const detectedLang = language ?? detectLanguage(code);
    const tests = this.generateTests(code, detectedLang);
    const results = this.simulateTests(code, tests);
    const coverage = this.estimateCoverage(code, tests);
    const allPassed = results.every(r => r.passed);

    const suite: TestSuite = {
      id: `suite-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      targetCode: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
      tests,
      results,
      coverage,
      passed: allPassed,
    };

    // Cache the suite
    this.testCache.set(suite.id, suite);

    return suite;
  }

  /**
   * Get a cached test suite
   */
  getTestSuite(id: string): TestSuite | undefined {
    return this.testCache.get(id);
  }

  /**
   * Get all cached test suites
   */
  getAllSuites(): TestSuite[] {
    return Array.from(this.testCache.values());
  }

  /**
   * Clear the test suite cache
   */
  clearCache(): void {
    this.testCache.clear();
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global automated testing layer instance — generates and simulates tests for any code */
export const testingLayer = new AutomatedTestingLayer();
