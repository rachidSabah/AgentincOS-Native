// ═══════════════════════════════════════════════════════
// AGENTIC OS — Skill System
// Modular, composable, versioned skills
// ═══════════════════════════════════════════════════════

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'coding' | 'wordpress' | 'seo' | 'automation' | 'research' | 'data-analysis' | 'security' | 'custom';
  version: string;
  status: 'active' | 'inactive' | 'error';
  composable: boolean;
  dependencies: string[];  // other skill IDs
  capabilities: string[];
  systemPromptAddition: string;
  tools: string[];         // tool names this skill uses
  artifacts: string[];     // artifact types this skill produces
  usageCount: number;
  lastUsed: number;
}

export interface CompositeSkill {
  id: string;
  name: string;
  skills: string[];       // component skill IDs
  description: string;
  systemPromptAddition: string;
}

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'coding',
    name: 'Coding',
    description: 'Full-stack code generation, debugging, refactoring, and review',
    category: 'coding',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: [],
    capabilities: ['code-generation', 'debugging', 'refactoring', 'code-review', 'testing', 'documentation'],
    systemPromptAddition: 'You have the Coding skill active. Generate production-quality code, debug issues autonomously, refactor intelligently, review for quality, write tests, and document your work.',
    tools: ['terminal', 'file-system', 'git'],
    artifacts: ['code', 'documentation', 'tests'],
    usageCount: 0,
    lastUsed: 0,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'WordPress development, themes, plugins, and optimization',
    category: 'wordpress',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: ['coding'],
    capabilities: ['theme-development', 'plugin-development', 'optimization', 'security-hardening', 'migration'],
    systemPromptAddition: 'You have the WordPress skill active. Develop themes, create plugins, optimize performance, harden security, and manage migrations for WordPress sites.',
    tools: ['terminal', 'file-system', 'web-request'],
    artifacts: ['theme', 'plugin', 'config', 'migration-script'],
    usageCount: 0,
    lastUsed: 0,
  },
  {
    id: 'seo',
    name: 'SEO',
    description: 'Search engine optimization, content strategy, and ranking analysis',
    category: 'seo',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: ['research'],
    capabilities: ['keyword-analysis', 'content-optimization', 'technical-seo', 'link-strategy', 'ranking-analysis'],
    systemPromptAddition: 'You have the SEO skill active. Analyze keywords, optimize content, audit technical SEO, plan link strategies, and track rankings.',
    tools: ['web-request', 'analysis'],
    artifacts: ['seo-report', 'keyword-map', 'content-plan', 'technical-audit'],
    usageCount: 0,
    lastUsed: 0,
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Workflow automation, CI/CD, scheduled tasks, and event-driven pipelines',
    category: 'automation',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: ['coding'],
    capabilities: ['workflow-design', 'ci-cd', 'scheduled-tasks', 'event-driven', 'integration'],
    systemPromptAddition: 'You have the Automation skill active. Design workflows, configure CI/CD pipelines, create scheduled tasks, build event-driven systems, and integrate services.',
    tools: ['terminal', 'file-system', 'web-request', 'scheduler'],
    artifacts: ['workflow', 'pipeline-config', 'schedule', 'integration'],
    usageCount: 0,
    lastUsed: 0,
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Deep research, fact-checking, synthesis, and knowledge acquisition',
    category: 'research',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: [],
    capabilities: ['web-research', 'document-analysis', 'fact-checking', 'synthesis', 'source-verification'],
    systemPromptAddition: 'You have the Research skill active. Conduct thorough research, analyze documents, verify facts, synthesize findings, and validate sources.',
    tools: ['web-request', 'search', 'document-reader'],
    artifacts: ['research-report', 'fact-check', 'synthesis', 'source-list'],
    usageCount: 0,
    lastUsed: 0,
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    description: 'Statistical analysis, data visualization, and insight extraction',
    category: 'data-analysis',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: [],
    capabilities: ['statistical-analysis', 'visualization', 'insight-extraction', 'data-cleaning', 'prediction'],
    systemPromptAddition: 'You have the Data Analysis skill active. Perform statistical analysis, create visualizations, extract insights, clean data, and make predictions.',
    tools: ['data-processor', 'chart-generator', 'calculator'],
    artifacts: ['analysis-report', 'chart', 'dataset', 'prediction'],
    usageCount: 0,
    lastUsed: 0,
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security auditing, vulnerability scanning, penetration testing, and hardening',
    category: 'security',
    version: '1.0.0',
    status: 'active',
    composable: true,
    dependencies: ['coding'],
    capabilities: ['security-audit', 'vulnerability-scan', 'penetration-testing', 'hardening', 'compliance'],
    systemPromptAddition: 'You have the Security skill active. Audit security, scan vulnerabilities, test penetration, harden systems, and ensure compliance.',
    tools: ['terminal', 'scanner', 'web-request'],
    artifacts: ['audit-report', 'vulnerability-list', 'hardening-plan', 'compliance-report'],
    usageCount: 0,
    lastUsed: 0,
  },
];

export function composeSkills(skillIds: string[]): CompositeSkill {
  const skills = skillIds
    .map(id => BUILTIN_SKILLS.find(s => s.id === id))
    .filter(Boolean) as Skill[];
  
  return {
    id: `composite-${skillIds.join('-')}`,
    name: skills.map(s => s.name).join(' + '),
    skills: skillIds,
    description: `Composite skill combining: ${skills.map(s => s.name).join(', ')}`,
    systemPromptAddition: skills.map(s => s.systemPromptAddition).join('\n\n'),
  };
}
