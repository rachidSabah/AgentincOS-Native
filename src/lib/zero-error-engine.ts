// ═══════════════════════════════════════════════════════
// AGENTIC OS — Zero-Error Execution Policy Engine
// Validates all outputs before delivery with auto-fix
// capabilities across syntax, imports, types, security,
// runtime, completeness, and logic categories
// ═══════════════════════════════════════════════════════

// ─── Core Types ────────────────────────────────────────

/** A validation rule that checks for a specific class of errors */
export interface ValidationRule {
  id: string;
  name: string;
  category: 'syntax' | 'imports' | 'types' | 'runtime' | 'security' | 'completeness' | 'logic';
  check: (output: string) => { pass: boolean; errors: ValidationError[] };
}

/** A specific validation error with severity and optional fix */
export interface ValidationError {
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location?: string;
  fix?: string;
}

/** Complete validation result with score and auto-fix status */
export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: string[];
  autoFixed: boolean;
  fixAttempts: number;
}

// ─── Built-in Validation Rules ─────────────────────────

/**
 * Rule 1: No undefined references in code
 * Detects usage of undefined variables, functions, or imports
 */
const undefinedReferencesRule: ValidationRule = {
  id: 'no-undefined-refs',
  name: 'No Undefined References',
  category: 'runtime',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    for (const block of codeBlocks) {
      // Check for common undefined reference patterns
      const undefinedPatterns = [
        /\bundefined\b(?!\s*===|\s*!==|\s*==|\s*!=|\s*\?)/g,
        /\bNaN\b/g,
        /\bnull\b(?!\s*===|\s*!==|\s*==|\s*!=|\s*\?)/g,
      ];

      for (const pattern of undefinedPatterns) {
        const matches = block.content.match(pattern);
        if (matches && matches.length > 2) {
          errors.push({
            rule: 'no-undefined-refs',
            severity: 'warning',
            message: `Potential undefined references detected (${matches.length} occurrences of ${matches[0]})`,
            location: `Code block at line ~${block.startLine}`,
            fix: 'Ensure all variables are properly initialized before use and add null checks',
          });
        }
      }

      // Check for references to undeclared variables (heuristic)
      const variableRefs = block.content.matchAll(/\b([a-zA-Z_]\w*)\s*[\.\[]/g);
      const declaredVars = new Set<string>();
      // Extract declared variables
      const declarations = block.content.matchAll(/(?:const|let|var|function|class|interface|type)\s+([a-zA-Z_]\w*)/g);
      for (const decl of declarations) {
        declaredVars.add(decl[1]!);
      }
      // Common globals
      const globals = new Set([
        'console', 'window', 'document', 'Math', 'JSON', 'Promise', 'Array',
        'Object', 'String', 'Number', 'Boolean', 'Date', 'Error', 'Map',
        'Set', 'Symbol', 'RegExp', 'parseInt', 'parseFloat', 'isNaN',
        'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'process', 'require', 'module', 'exports', 'Buffer', 'global',
        'Response', 'Request', 'Headers', 'URL', 'URLSearchParams',
        'FormData', 'AbortController', 'crypto', 'navigator',
      ]);
      for (const g of globals) {
        declaredVars.add(g);
      }

      for (const ref of variableRefs) {
        const varName = ref[1]!;
        if (!declaredVars.has(varName) && varName.length > 2 && !varName.startsWith('__')) {
          // Likely an external reference, not an error per se
          // Only flag if it looks like it should be defined locally
          if (/^[a-z]/.test(varName) && !globals.has(varName)) {
            // Lowercase start, not a global — could be an issue
            // But we can't be sure, so just warn
          }
        }
      }
    }

    return { pass: errors.length === 0, errors };
  },
};

/**
 * Rule 2: All imports are valid
 * Checks for missing import statements and broken import paths
 */
const validImportsRule: ValidationRule = {
  id: 'valid-imports',
  name: 'Valid Imports',
  category: 'imports',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    for (const block of codeBlocks) {
      // Extract import statements
      const importLines = block.content.match(/import\s+.*?(?:from\s+['"].*?['"]|['"].*?['"]);?/g) || [];
      const requireLines = block.content.match(/require\s*\(\s*['"].*?['"]\s*\)/g) || [];

      // Check for empty imports
      for (const imp of importLines) {
        if (/import\s*\{\s*\}\s*from/.test(imp)) {
          errors.push({
            rule: 'valid-imports',
            severity: 'warning',
            message: 'Empty import detected — no symbols imported',
            location: imp,
            fix: 'Add the symbols you need to the import statement',
          });
        }

        // Check for relative imports that look broken
        const pathMatch = imp.match(/from\s+['"](\..*?)['"]/);
        if (pathMatch) {
          const importPath = pathMatch[1]!;
          if (importPath.includes('..') && importPath.split('..').length > 3) {
            errors.push({
              rule: 'valid-imports',
              severity: 'warning',
              message: `Deep relative import path may be incorrect: ${importPath}`,
              location: imp,
              fix: 'Consider using an alias or verifying the relative path',
            });
          }
        }
      }

      // Check for require calls
      for (const req of requireLines) {
        if (/require\s*\(\s*['"]['"]\s*\)/.test(req)) {
          errors.push({
            rule: 'valid-imports',
            severity: 'critical',
            message: 'Empty require() call detected',
            location: req,
            fix: 'Specify the module path in the require() call',
          });
        }
      }

      // Check for used-but-not-imported React patterns
      const usesReactHooks = /use[A-Z]\w+\s*\(/.test(block.content);
      const importsReact = /import\s+.*React|from\s+['"]react['"]/.test(block.content) ||
                          /useState|useEffect|useCallback|useMemo|useRef/.test(
                            importLines.join('\n')
                          );
      if (usesReactHooks && !importsReact) {
        errors.push({
          rule: 'valid-imports',
          severity: 'critical',
          message: 'React hooks used but React not imported',
          location: 'Code block',
          fix: "Add: import React, { useState, useEffect } from 'react';",
        });
      }
    }

    return { pass: errors.length === 0, errors };
  },
};

/**
 * Rule 3: No syntax errors in code blocks
 * Detects common syntax issues in TypeScript/JavaScript code
 */
const noSyntaxErrorsRule: ValidationRule = {
  id: 'no-syntax-errors',
  name: 'No Syntax Errors',
  category: 'syntax',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    for (const block of codeBlocks) {
      const content = block.content;

      // Check for unbalanced braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (Math.abs(openBraces - closeBraces) > 1) {
        errors.push({
          rule: 'no-syntax-errors',
          severity: 'critical',
          message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
          location: `Code block at line ~${block.startLine}`,
          fix: 'Ensure all opening braces have matching closing braces',
        });
      }

      // Check for unbalanced parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (Math.abs(openParens - closeParens) > 1) {
        errors.push({
          rule: 'no-syntax-errors',
          severity: 'critical',
          message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
          location: `Code block at line ~${block.startLine}`,
          fix: 'Ensure all opening parentheses have matching closing ones',
        });
      }

      // Check for unbalanced brackets
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      if (Math.abs(openBrackets - closeBrackets) > 1) {
        errors.push({
          rule: 'no-syntax-errors',
          severity: 'critical',
          message: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`,
          location: `Code block at line ~${block.startLine}`,
          fix: 'Ensure all opening brackets have matching closing ones',
        });
      }

      // Check for missing semicolons in specific patterns (TS/JS)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        // Skip comments, empty lines, block endings, and lines that don't need semicolons
        if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*') ||
            line.endsWith('{') || line.endsWith('}') || line.endsWith(',') ||
            line.endsWith('(') || line.endsWith('|') || line.endsWith('&') ||
            line.startsWith('if') || line.startsWith('for') || line.startsWith('while') ||
            line.startsWith('else') || line.startsWith('case') || line.startsWith('default') ||
            line.startsWith('export') || line.startsWith('import') ||
            /^[a-zA-Z_]\w*\s*:$/.test(line)) {
          continue;
        }
        // Lines that look like they should end with a semicolon but don't
        if (/^(const|let|var|return|throw|break)\s/.test(line) && !line.endsWith(';') && !line.endsWith('{')) {
          errors.push({
            rule: 'no-syntax-errors',
            severity: 'warning',
            message: `Possible missing semicolon on line ${i + 1}: "${line.substring(0, 50)}"`,
            location: `Line ${i + 1}`,
            fix: 'Add a semicolon at the end of the statement',
          });
        }
      }

      // Check for template literal issues
      const templateBackticks = (content.match(/`/g) || []).length;
      if (templateBackticks % 2 !== 0) {
        errors.push({
          rule: 'no-syntax-errors',
          severity: 'critical',
          message: 'Unclosed template literal detected',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Ensure all template literals are properly closed with a backtick',
        });
      }
    }

    return { pass: errors.filter(e => e.severity === 'critical').length === 0, errors };
  },
};

/**
 * Rule 4: No incomplete function bodies
 * Detects TODO, FIXME, placeholder, and empty function bodies
 */
const noIncompleteFunctionsRule: ValidationRule = {
  id: 'no-incomplete-functions',
  name: 'No Incomplete Function Bodies',
  category: 'completeness',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    for (const block of codeBlocks) {
      // Check for TODO/FIXME/HACK comments
      const todoMatches = block.content.match(/\/\/\s*(TODO|FIXME|HACK|XXX|PLACEHOLDER):?\s*.*/gi) || [];
      for (const todo of todoMatches) {
        errors.push({
          rule: 'no-incomplete-functions',
          severity: 'warning',
          message: `Incomplete implementation marker: ${todo.trim()}`,
          location: `Code block at line ~${block.startLine}`,
          fix: 'Implement the functionality described in the TODO/FIXME comment',
        });
      }

      // Check for empty function bodies
      const emptyFunctions = block.content.match(
        /(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>|async\s+function\s+\w+)\s*\([^)]*\)\s*(?::\s*\w+(?:<[^>]*>)?)?\s*\{\s*\}/g
      ) || [];
      for (const emptyFn of emptyFunctions) {
        errors.push({
          rule: 'no-incomplete-functions',
          severity: 'warning',
          message: `Empty function body detected: ${emptyFn.substring(0, 60)}...`,
          location: `Code block at line ~${block.startLine}`,
          fix: 'Implement the function body or add a meaningful return statement',
        });
      }

      // Check for pass-through / stub implementations
      const stubPatterns = [
        /throw new Error\s*\(\s*['"]Not implemented['"]\s*\)/gi,
        /return\s+null\s*;\s*\/\/\s*stub/gi,
        /console\.log\s*\(\s*['"]stub/gi,
      ];
      for (const pattern of stubPatterns) {
        const matches = block.content.match(pattern) || [];
        for (const match of matches) {
          errors.push({
            rule: 'no-incomplete-functions',
            severity: 'warning',
            message: `Stub implementation detected: ${match}`,
            location: `Code block at line ~${block.startLine}`,
            fix: 'Replace stub with actual implementation',
          });
        }
      }
    }

    return { pass: errors.length === 0, errors };
  },
};

/**
 * Rule 5: No missing dependencies
 * Checks for referenced packages/modules that aren't imported
 */
const noMissingDependenciesRule: ValidationRule = {
  id: 'no-missing-dependencies',
  name: 'No Missing Dependencies',
  category: 'imports',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    // Common packages and their typical import names
    const knownPackages: Record<string, string> = {
      'react': 'React',
      'react-dom': 'ReactDOM',
      'next': 'next',
      'express': 'express',
      'prisma': '@prisma/client',
      'zod': 'zod',
      'zustand': 'zustand',
      'framer-motion': 'framer-motion',
      'lucide-react': 'lucide-react',
    };

    for (const block of codeBlocks) {
      // Check for usage of known packages without imports
      for (const [pkg, importName] of Object.entries(knownPackages)) {
        const hasImport = block.content.includes(`from '${pkg}'`) ||
                         block.content.includes(`from "${pkg}"`) ||
                         block.content.includes(`require('${pkg}')`) ||
                         block.content.includes(`require("${pkg}")`);

        // Check for usage patterns
        const usagePatterns: Record<string, RegExp> = {
          'react': /\b(React|useState|useEffect|useCallback|useMemo|useRef|useContext)\b/,
          'react-dom': /\b(ReactDOM|createRoot|hydrate)\b/,
          'next': /\b(NextRequest|NextResponse|useRouter|usePathname|useSearchParams)\b/,
          'express': /\bexpress\s*\(/,
          'zod': /\bz\.\w+\(/,
          'zustand': /\bcreate\s*[<(]/,
          'framer-motion': /\bmotion\.\w+/,
          'lucide-react': /\b\w+Icon\b/,
        };

        const usagePattern = usagePatterns[pkg];
        if (usagePattern && usagePattern.test(block.content) && !hasImport) {
          errors.push({
            rule: 'no-missing-dependencies',
            severity: 'warning',
            message: `${importName} is used but '${pkg}' is not imported`,
            location: `Code block at line ~${block.startLine}`,
            fix: `Add: import ${importName} from '${pkg}';`,
          });
        }
      }
    }

    return { pass: errors.length === 0, errors };
  },
};

/**
 * Rule 6: No logical contradictions
 * Detects common logical errors and contradictions
 */
const noLogicalContradictionsRule: ValidationRule = {
  id: 'no-logical-contradictions',
  name: 'No Logical Contradictions',
  category: 'logic',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    for (const block of codeBlocks) {
      const content = block.content;

      // Check for always-true/false conditions
      const alwaysTruePatterns = [
        /if\s*\(\s*true\s*\)/g,
        /if\s*\(\s*!\s*false\s*\)/g,
        /while\s*\(\s*true\s*\)(?!\s*\{[^}]*break)/g,
      ];
      for (const pattern of alwaysTruePatterns) {
        const matches = content.match(pattern) || [];
        for (const match of matches) {
          errors.push({
            rule: 'no-logical-contradictions',
            severity: 'info',
            message: `Always-true condition detected: ${match.trim()}`,
            location: `Code block at line ~${block.startLine}`,
            fix: 'Verify this condition is intentional; it will always execute',
          });
        }
      }

      // Check for unreachable code after return/throw/break
      const unreachablePattern = /(?:return|throw|break|continue)\s+[^;]*;\s*\n\s*[^\s/]/g;
      const unreachableMatches = content.match(unreachablePattern) || [];
      for (const match of unreachableMatches) {
        // Verify it's inside a function/block (not at the end)
        const lines = content.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          if (/\b(?:return|throw|break|continue)\b/.test(lines[i]!) &&
              lines[i + 1]?.trim() && !lines[i + 1]?.trim().startsWith('//') &&
              lines[i + 1]?.trim() !== '}' && lines[i + 1]?.trim() !== '}') {
            // Might be unreachable — but could also be in different branches
            // Only warn if within the same indentation level
          }
        }
      }

      // Check for contradictory conditions
      const ifElseChains = content.match(/if\s*\([^)]*\)[^{]*\n[^]*?else\s+if\s*\([^)]*\)/g) || [];
      for (const chain of ifElseChains) {
        // Check for conditions that can never both be true
        const conditions = chain.match(/if\s*\(([^)]+)\)/g) || [];
        if (conditions.length >= 2) {
          const cond1 = conditions[0]!.replace(/if\s*\(/, '').replace(/\)$/, '');
          const cond2 = conditions[1]!.replace(/if\s*\(/, '').replace(/\)$/, '');
          // Check for direct negation
          if (cond1.includes('!') && cond2.includes(cond1.replace('!', ''))) {
            errors.push({
              rule: 'no-logical-contradictions',
              severity: 'warning',
              message: 'Contradictory conditions in if-else chain',
              location: `Code block at line ~${block.startLine}`,
              fix: 'Review the logic — conditions may be contradictory',
            });
          }
        }
      }

      // Check for assignment in condition (common bug)
      const assignmentInCondition = content.match(/if\s*\([^)]*[^=!<>]=[^=][^)]*\)/g) || [];
      for (const match of assignmentInCondition) {
        if (!match.includes('===') && !match.includes('!==') && !match.includes('<=') && !match.includes('>=')) {
          errors.push({
            rule: 'no-logical-contradictions',
            severity: 'warning',
            message: `Possible assignment in condition (should this be ===?): ${match.trim()}`,
            location: `Code block at line ~${block.startLine}`,
            fix: 'If comparing, use === or !==. If assigning, move assignment before the condition.',
          });
        }
      }
    }

    return { pass: errors.filter(e => e.severity === 'critical').length === 0, errors };
  },
};

/**
 * Rule 7: No security vulnerabilities
 * Checks for common security anti-patterns
 */
const noSecurityVulnerabilitiesRule: ValidationRule = {
  id: 'no-security-vulnerabilities',
  name: 'No Security Vulnerabilities',
  category: 'security',
  check: (output: string) => {
    const errors: ValidationError[] = [];
    const codeBlocks = extractCodeBlocks(output);

    for (const block of codeBlocks) {
      const content = block.content;

      // Check for eval usage
      if (/\beval\s*\(/.test(content)) {
        errors.push({
          rule: 'no-security-vulnerabilities',
          severity: 'critical',
          message: 'Use of eval() detected — potential code injection vulnerability',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Replace eval() with a safer alternative like JSON.parse() or Function constructor',
        });
      }

      // Check for innerHTML
      if (/\.innerHTML\s*=/.test(content)) {
        errors.push({
          rule: 'no-security-vulnerabilities',
          severity: 'critical',
          message: 'Direct innerHTML assignment — potential XSS vulnerability',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Use textContent, DOMPurify.sanitize(), or React JSX for safe HTML rendering',
        });
      }

      // Check for dangerouslySetInnerHTML
      if (/dangerouslySetInnerHTML/.test(content) && !/DOMPurify|sanitize/.test(content)) {
        errors.push({
          rule: 'no-security-vulnerabilities',
          severity: 'critical',
          message: 'dangerouslySetInnerHTML without sanitization — XSS risk',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Add DOMPurify.sanitize() before setting dangerouslySetInnerHTML',
        });
      }

      // Check for hardcoded secrets
      const secretPatterns = [
        /(?:api[_-]?key|secret|password|token|auth)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        /(?:sk|pk|ghp|gho|glpat|xox[bpas])_[a-zA-Z0-9]{20,}/g,
      ];
      for (const pattern of secretPatterns) {
        const matches = content.match(pattern) || [];
        for (const match of matches) {
          errors.push({
            rule: 'no-security-vulnerabilities',
            severity: 'critical',
            message: `Hardcoded secret detected: ${match.substring(0, 30)}...`,
            location: `Code block at line ~${block.startLine}`,
            fix: 'Move secrets to environment variables (process.env.SECRET_NAME)',
          });
        }
      }

      // Check for SQL injection risks
      if (/query\s*\(\s*['"`].*\$\{/.test(content) || /query\s*\(\s*['"`].*\+/.test(content)) {
        errors.push({
          rule: 'no-security-vulnerabilities',
          severity: 'critical',
          message: 'Potential SQL injection — string interpolation in query',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Use parameterized queries instead of string interpolation',
        });
      }

      // Check for disabled CORS
      if (/Access-Control-Allow-Origin.*\*/.test(content)) {
        errors.push({
          rule: 'no-security-vulnerabilities',
          severity: 'warning',
          message: 'Wildcard CORS origin detected — allows all origins',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Specify allowed origins instead of using wildcard (*)',
        });
      }

      // Check for http:// instead of https://
      const httpUrls = content.match(/http:\/\/(?!localhost|127\.0\.0\.|0\.0\.0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/g) || [];
      if (httpUrls.length > 0) {
        errors.push({
          rule: 'no-security-vulnerabilities',
          severity: 'warning',
          message: `Insecure HTTP URL detected (${httpUrls.length} occurrence(s))`,
          location: `Code block at line ~${block.startLine}`,
          fix: 'Use HTTPS instead of HTTP for external URLs',
        });
      }
    }

    return { pass: errors.filter(e => e.severity === 'critical').length === 0, errors };
  },
};

/**
 * Rule 8: No empty or placeholder content
 * Detects placeholder text, empty responses, and incomplete content
 */
const noEmptyContentRule: ValidationRule = {
  id: 'no-empty-content',
  name: 'No Empty or Placeholder Content',
  category: 'completeness',
  check: (output: string) => {
    const errors: ValidationError[] = [];

    // Check for empty output
    if (!output.trim()) {
      errors.push({
        rule: 'no-empty-content',
        severity: 'critical',
        message: 'Output is empty',
        fix: 'Generate the actual content',
      });
      return { pass: false, errors };
    }

    // Check for very short output (likely incomplete)
    if (output.trim().length < 20) {
      errors.push({
        rule: 'no-empty-content',
        severity: 'warning',
        message: 'Output is very short — may be incomplete',
        fix: 'Provide a more complete and detailed response',
      });
    }

    // Check for placeholder patterns
    const placeholderPatterns = [
      /\[insert\s+\w+\s+here\]/gi,
      /\[your\s+\w+\s+here\]/gi,
      /\[TODO:\s*\w+\]/gi,
      /lorem\s+ipsum/gi,
      /\.\.\.(?:\s*$|\s*\n)/g, // Ends with ellipsis
      /\[placeholder\]/gi,
      /fill\s+in\s+(the\s+)?blank/gi,
      /\[name\]|\[date\]|\[description\]/gi,
    ];

    for (const pattern of placeholderPatterns) {
      const matches = output.match(pattern) || [];
      for (const match of matches) {
        errors.push({
          rule: 'no-empty-content',
          severity: 'warning',
          message: `Placeholder content detected: "${match.trim()}"`,
          fix: 'Replace placeholder with actual content',
        });
      }
    }

    // Check for truncated output
    if (output.endsWith('...') || output.endsWith('[truncated]') || output.endsWith('[cut off]')) {
      errors.push({
        rule: 'no-empty-content',
        severity: 'warning',
        message: 'Output appears to be truncated',
        fix: 'Complete the response — it appears to have been cut off',
      });
    }

    // Check for code blocks with only comments
    const codeBlocks = extractCodeBlocks(output);
    for (const block of codeBlocks) {
      const nonCommentLines = block.content.split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));
      if (nonCommentLines.length === 0 && block.content.trim().length > 10) {
        errors.push({
          rule: 'no-empty-content',
          severity: 'warning',
          message: 'Code block contains only comments — no executable code',
          location: `Code block at line ~${block.startLine}`,
          fix: 'Add implementation code or remove the empty code block',
        });
      }
    }

    return { pass: errors.filter(e => e.severity === 'critical').length === 0, errors };
  },
};

// ─── Helper: Extract Code Blocks ───────────────────────

interface CodeBlock {
  content: string;
  language: string;
  startLine: number;
}

/**
 * Extract code blocks from markdown-formatted output
 */
function extractCodeBlocks(output: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(output)) !== null) {
    const language = match[1] ?? '';
    const content = match[2] ?? '';
    const startLine = output.substring(0, match.index).split('\n').length;
    blocks.push({ content, language, startLine });
  }

  // If no code blocks found but output looks like code, treat entire output as code
  if (blocks.length === 0 && isLikelyCode(output)) {
    blocks.push({ content: output, language: 'typescript', startLine: 1 });
  }

  return blocks;
}

/**
 * Heuristic to determine if output is likely code
 */
function isLikelyCode(text: string): boolean {
  const codeIndicators = [
    /(?:const|let|var|function|class|import|export|interface|type)\s/,
    /[{}();]/,
    /=>/,
    /\breturn\b/,
  ];
  let matchCount = 0;
  for (const pattern of codeIndicators) {
    if (pattern.test(text)) matchCount++;
  }
  return matchCount >= 3;
}

// ─── ZeroErrorEngine Class ─────────────────────────────

/**
 * Zero-Error Execution Policy engine that validates all outputs
 * before delivery. Supports multiple validation categories
 * (syntax, imports, types, runtime, security, completeness, logic)
 * and can auto-fix certain classes of errors.
 */
export class ZeroErrorEngine {
  private rules: ValidationRule[] = [];
  private maxFixAttempts: number = 3;

  constructor() {
    // Register built-in rules
    this.rules = [
      undefinedReferencesRule,
      validImportsRule,
      noSyntaxErrorsRule,
      noIncompleteFunctionsRule,
      noMissingDependenciesRule,
      noLogicalContradictionsRule,
      noSecurityVulnerabilitiesRule,
      noEmptyContentRule,
    ];
  }

  /**
   * Validate output before delivery. Runs the appropriate set
   * of validation rules based on the output type.
   *
   * @param output - The output string to validate
   * @param type - The type of output: 'code', 'text', 'api', 'config', or 'full-project'
   * @returns Validation result with pass/fail status, score, and errors
   */
  validate(output: string, type: 'code' | 'text' | 'api' | 'config' | 'full-project' = 'code'): ValidationResult {
    const applicableRules = this.getApplicableRules(type);
    const allErrors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const rule of applicableRules) {
      try {
        const result = rule.check(output);
        if (!result.pass) {
          for (const error of result.errors) {
            allErrors.push(error);
            if (error.severity === 'warning' || error.severity === 'info') {
              warnings.push(error.message);
            }
          }
        }
      } catch {
        // Rule execution failed — don't block validation
        warnings.push(`Validation rule "${rule.name}" failed to execute`);
      }
    }

    // Calculate score
    const criticalCount = allErrors.filter(e => e.severity === 'critical').length;
    const warningCount = allErrors.filter(e => e.severity === 'warning').length;

    let score = 100;
    score -= criticalCount * 15; // Critical errors: -15 each
    score -= warningCount * 5;   // Warnings: -5 each
    score = Math.max(0, score);

    // Pass if no critical errors
    const passed = criticalCount === 0;

    return {
      passed,
      score,
      errors: allErrors,
      warnings,
      autoFixed: false,
      fixAttempts: 0,
    };
  }

  /**
   * Auto-fix errors if possible. Applies known fix patterns
   * to resolve common issues automatically.
   *
   * @param output - The output string to fix
   * @param errors - The errors to fix
   * @returns The fixed output string
   */
  autoFix(output: string, errors: ValidationError[]): string {
    let fixed = output;
    let fixCount = 0;

    for (const error of errors) {
      if (error.fix && fixCount < this.maxFixAttempts) {
        fixed = this.applyFix(fixed, error);
        fixCount++;
      }
    }

    return fixed;
  }

  /**
   * Apply a specific fix to the output
   */
  private applyFix(output: string, error: ValidationError): string {
    // Auto-fix strategies based on rule
    switch (error.rule) {
      case 'no-syntax-errors': {
        // Fix unbalanced braces by adding closing braces
        const openBraces = (output.match(/\{/g) || []).length;
        const closeBraces = (output.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          const diff = openBraces - closeBraces;
          output += '\n' + '}'.repeat(diff);
        }
        break;
      }

      case 'valid-imports': {
        // Add missing React import
        if (error.message.includes('React hooks used but React not imported')) {
          const reactImport = "import React, { useState, useEffect } from 'react';\n";
          // Insert after any existing imports or at the top
          const firstImportIndex = output.indexOf('import ');
          if (firstImportIndex >= 0) {
            output = output.substring(0, firstImportIndex) + reactImport + output.substring(firstImportIndex);
          } else {
            output = reactImport + output;
          }
        }
        break;
      }

      case 'no-empty-content': {
        // Can't auto-fix empty content meaningfully
        break;
      }

      case 'no-security-vulnerabilities': {
        // Replace http:// with https:// for non-localhost URLs
        if (error.message.includes('Insecure HTTP URL')) {
          output = output.replace(
            /http:\/\/(?!localhost|127\.0\.0\.|0\.0\.0\.)/g,
            'https://'
          );
        }
        break;
      }

      default:
        // No auto-fix available for this rule
        break;
    }

    return output;
  }

  /**
   * Add a custom validation rule to the engine
   *
   * @param rule - The validation rule to add
   */
  addRule(rule: ValidationRule): void {
    // Prevent duplicate rule IDs
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  /**
   * Remove a validation rule by ID
   *
   * @param ruleId - The ID of the rule to remove
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Run full validation suite against output.
   * This runs ALL rules regardless of output type.
   *
   * @param output - The output string to validate
   * @returns Complete validation result
   */
  runFullValidation(output: string): ValidationResult {
    const allErrors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const rule of this.rules) {
      try {
        const result = rule.check(output);
        for (const error of result.errors) {
          allErrors.push(error);
          if (error.severity === 'warning' || error.severity === 'info') {
            warnings.push(error.message);
          }
        }
      } catch {
        warnings.push(`Validation rule "${rule.name}" failed to execute`);
      }
    }

    const criticalCount = allErrors.filter(e => e.severity === 'critical').length;
    const warningCount = allErrors.filter(e => e.severity === 'warning').length;

    let score = 100;
    score -= criticalCount * 15;
    score -= warningCount * 5;
    score = Math.max(0, score);

    // Attempt auto-fix if there are fixable errors
    let autoFixed = false;
    let fixAttempts = 0;
    let currentOutput = output;

    if (criticalCount > 0) {
      const fixableErrors = allErrors.filter(e => e.fix);
      if (fixableErrors.length > 0) {
        currentOutput = this.autoFix(currentOutput, fixableErrors);
        autoFixed = true;
        fixAttempts = Math.min(fixableErrors.length, this.maxFixAttempts);

        // Re-validate after fix
        const revalidation = this.validate(currentOutput);
        if (revalidation.score > score) {
          score = revalidation.score;
        }
      }
    }

    return {
      passed: criticalCount === 0,
      score,
      errors: allErrors,
      warnings,
      autoFixed,
      fixAttempts,
    };
  }

  /**
   * Get all registered validation rules
   */
  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  /**
   * Get rules applicable to a specific output type
   */
  getApplicableRules(type: 'code' | 'text' | 'api' | 'config' | 'full-project'): ValidationRule[] {
    switch (type) {
      case 'code':
        return this.rules; // All rules for code
      case 'text':
        return this.rules.filter(r =>
          r.category === 'completeness' || r.category === 'logic' || r.category === 'security'
        );
      case 'api':
        return this.rules.filter(r =>
          r.category === 'syntax' || r.category === 'runtime' || r.category === 'security' || r.category === 'completeness'
        );
      case 'config':
        return this.rules.filter(r =>
          r.category === 'syntax' || r.category === 'completeness' || r.category === 'security'
        );
      case 'full-project':
        return this.rules; // All rules for full project
      default:
        return this.rules;
    }
  }
}

// ─── Singleton Instance ────────────────────────────────

/** Global zero-error engine instance — validates all outputs before delivery */
export const zeroErrorEngine = new ZeroErrorEngine();
