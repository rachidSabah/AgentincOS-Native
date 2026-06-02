'use client';

import { useOSStore, type BrainProfile, type Agent, type AgentStatus } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Plus, Trash2, Edit3, Check, X, Search, Brain,
  Sparkles, Code2, FlaskConical, PenTool, Database,
  Server, FileText, TrendingUp, Briefcase, Bug,
  Headphones, Shield, GitBranch, Rocket, Workflow,
  Users, Layers, Settings2, ChevronRight, Copy,
  Thermometer, Gauge, Hash, Lock, Unlock, Wifi,
  HardDrive, Terminal, Eye, EyeOff, Wand2,
  Zap, Star, ArrowRight, Package, AlertCircle,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════════ */

const NEON_COLORS = [
  '#9d4edd', '#00ffff', '#00ff88', '#FFB627', '#E63946', '#E8751A',
  '#7B2CBF', '#2E86AB', '#1B998B', '#c084fc', '#f472b6', '#38bdf8',
];

const EMOJI_OPTIONS = [
  '🤖', '🧠', '💻', '🔍', '⚡', '🚀', '📊', '✍️', '🛡️',
  '🎯', '🔮', '💡', '🔬', '⚙️', '🦾', '🐙', '🦊', '🐉',
  '🌟', '💎', '🔧', '🧪', '📝', '🎨', '🎪', '🦅', '🐺',
];

type AgentCategory = 'business' | 'coding' | 'research' | 'marketing' | 'education' | 'custom' | 'recruitment' | 'seo' | 'devops' | 'data' | 'writing' | 'productivity';

interface CategoryMeta {
  id: AgentCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'business', label: 'Business', icon: <Briefcase size={12} />, color: '#7B2CBF' },
  { id: 'coding', label: 'Coding', icon: <Code2 size={12} />, color: '#00ff88' },
  { id: 'research', label: 'Research', icon: <FlaskConical size={12} />, color: '#FFB627' },
  { id: 'marketing', label: 'Marketing', icon: <PenTool size={12} />, color: '#E8751A' },
  { id: 'education', label: 'Education', icon: <Sparkles size={12} />, color: '#c084fc' },
  { id: 'custom', label: 'Custom', icon: <Settings2 size={12} />, color: '#8888aa' },
  { id: 'recruitment', label: 'Recruitment', icon: <Users size={12} />, color: '#2E86AB' },
  { id: 'seo', label: 'SEO', icon: <TrendingUp size={12} />, color: '#FFB627' },
  { id: 'devops', label: 'DevOps', icon: <Server size={12} />, color: '#E63946' },
  { id: 'data', label: 'Data', icon: <Database size={12} />, color: '#38bdf8' },
  { id: 'writing', label: 'Writing', icon: <FileText size={12} />, color: '#1B998B' },
  { id: 'productivity', label: 'Productivity', icon: <Zap size={12} />, color: '#f472b6' },
];

const BRAIN_META: Record<BrainProfile, { label: string; color: string; icon: string; desc: string }> = {
  claude: { label: 'Claude', color: '#E63946', icon: '🧠', desc: 'Strong reasoning & safety' },
  gemini: { label: 'Gemini', color: '#4285F4', icon: '💎', desc: 'Multimodal & long context' },
  hermes: { label: 'Hermes', color: '#FFB627', icon: '⚡', desc: 'Fast & creative generation' },
  openclaw: { label: 'OpenClaw', color: '#E8751A', icon: '🐾', desc: 'Open-source & flexible' },
  vault: { label: 'Vault', color: '#2E86AB', icon: '🔐', desc: 'Secure & enterprise-grade' },
  opencode: { label: 'OpenCode', color: '#00ff88', icon: '💻', desc: 'Code-specialized reasoning' },
  custom: { label: 'Custom', color: '#c084fc', icon: '⚙️', desc: 'Your own configuration' },
};

type ToolPermission = 'read' | 'write' | 'execute' | 'network' | 'filesystem';

const TOOL_PERMISSIONS: { id: ToolPermission; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'read', label: 'Read', icon: <Eye size={11} />, color: '#00ff88' },
  { id: 'write', label: 'Write', icon: <Edit3 size={11} />, color: '#FFB627' },
  { id: 'execute', label: 'Execute', icon: <Terminal size={11} />, color: '#E63946' },
  { id: 'network', label: 'Network', icon: <Wifi size={11} />, color: '#38bdf8' },
  { id: 'filesystem', label: 'Filesystem', icon: <HardDrive size={11} />, color: '#c084fc' },
];

const LAYER_OPTIONS = [
  { num: 1, name: 'Brain', color: '#9d4edd' },
  { num: 2, name: 'Provider', color: '#00ffff' },
  { num: 3, name: 'Agent', color: '#00ff88' },
  { num: 4, name: 'Knowledge', color: '#FFB627' },
  { num: 5, name: 'Execution', color: '#E8751A' },
  { num: 6, name: 'Memory', color: '#2E86AB' },
  { num: 7, name: 'Governance', color: '#1B998B' },
];

/* ─── Prebuilt Agent Templates ─── */
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: AgentCategory;
  brainProfile: BrainProfile;
  tags: string[];
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  toolPermissions: ToolPermission[];
  layer: number;
}

const PREBUILT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'tpl-code-assistant',
    name: 'Code Assistant',
    description: 'Full-stack code generation, debugging, review, and refactoring with multi-language support.',
    icon: '💻', color: '#00ff88', category: 'coding', brainProfile: 'claude',
    tags: ['CODE', 'DEBUG', 'REVIEW', 'REFACTOR'],
    systemPrompt: 'You are an expert code assistant. Write clean, efficient, well-documented code. Follow best practices, suggest improvements, and catch bugs before they happen.',
    temperature: 0.3, topP: 0.9, maxTokens: 8192,
    toolPermissions: ['read', 'write', 'execute', 'filesystem'],
    layer: 3,
  },
  {
    id: 'tpl-research-analyst',
    name: 'Research Analyst',
    description: 'Deep research agent that synthesizes information from multiple sources and produces comprehensive analyses.',
    icon: '🔍', color: '#FFB627', category: 'research', brainProfile: 'gemini',
    tags: ['RESEARCH', 'ANALYSIS', 'SYNTHESIS'],
    systemPrompt: 'You are a research analyst. Conduct thorough research, verify facts from multiple sources, and synthesize findings into clear, actionable insights.',
    temperature: 0.5, topP: 0.85, maxTokens: 8192,
    toolPermissions: ['read', 'network'],
    layer: 4,
  },
  {
    id: 'tpl-marketing-copywriter',
    name: 'Marketing Copywriter',
    description: 'Creates compelling marketing copy, ad campaigns, and brand messaging with creative flair.',
    icon: '✍️', color: '#E8751A', category: 'marketing', brainProfile: 'hermes',
    tags: ['MARKETING', 'COPY', 'CREATIVE', 'BRAND'],
    systemPrompt: 'You are a creative marketing copywriter. Craft compelling, persuasive copy that resonates with target audiences. Adapt tone and style for different platforms and demographics.',
    temperature: 0.8, topP: 0.95, maxTokens: 4096,
    toolPermissions: ['read', 'write'],
    layer: 3,
  },
  {
    id: 'tpl-data-scientist',
    name: 'Data Scientist',
    description: 'Analyzes datasets, builds models, creates visualizations, and extracts actionable insights from data.',
    icon: '📊', color: '#38bdf8', category: 'data', brainProfile: 'openclaw',
    tags: ['DATA', 'ML', 'ANALYTICS', 'VISUALIZATION'],
    systemPrompt: 'You are a data scientist. Analyze data methodically, build statistical models, create clear visualizations, and communicate findings in accessible language.',
    temperature: 0.4, topP: 0.9, maxTokens: 8192,
    toolPermissions: ['read', 'write', 'execute', 'filesystem'],
    layer: 4,
  },
  {
    id: 'tpl-devops-engineer',
    name: 'DevOps Engineer',
    description: 'Manages CI/CD pipelines, infrastructure, deployment, monitoring, and incident response.',
    icon: '🚀', color: '#E63946', category: 'devops', brainProfile: 'vault',
    tags: ['DEVOPS', 'CI/CD', 'INFRASTRUCTURE', 'DEPLOY'],
    systemPrompt: 'You are a DevOps engineer. Automate infrastructure, optimize CI/CD pipelines, ensure system reliability, and respond to incidents with precision.',
    temperature: 0.2, topP: 0.85, maxTokens: 4096,
    toolPermissions: ['read', 'write', 'execute', 'network', 'filesystem'],
    layer: 5,
  },
  {
    id: 'tpl-content-writer',
    name: 'Content Writer',
    description: 'Produces high-quality long-form content, articles, documentation, and educational material.',
    icon: '📝', color: '#1B998B', category: 'writing', brainProfile: 'gemini',
    tags: ['WRITING', 'CONTENT', 'ARTICLES', 'DOCS'],
    systemPrompt: 'You are a skilled content writer. Create engaging, well-structured content that educates and informs. Adapt complexity for the target audience.',
    temperature: 0.7, topP: 0.9, maxTokens: 8192,
    toolPermissions: ['read', 'write'],
    layer: 3,
  },
  {
    id: 'tpl-seo-specialist',
    name: 'SEO Specialist',
    description: 'Optimizes content for search engines with keyword research, technical SEO, and content strategy.',
    icon: '📈', color: '#FFB627', category: 'seo', brainProfile: 'hermes',
    tags: ['SEO', 'KEYWORDS', 'OPTIMIZATION', 'RANKING'],
    systemPrompt: 'You are an SEO specialist. Optimize content for search visibility, conduct keyword research, analyze competitors, and implement technical SEO best practices.',
    temperature: 0.5, topP: 0.9, maxTokens: 4096,
    toolPermissions: ['read', 'write', 'network'],
    layer: 3,
  },
  {
    id: 'tpl-product-manager',
    name: 'Product Manager',
    description: 'Drives product strategy, roadmap planning, user research, and cross-functional coordination.',
    icon: '💼', color: '#7B2CBF', category: 'business', brainProfile: 'claude',
    tags: ['PRODUCT', 'STRATEGY', 'ROADMAP', 'PRIORITIZATION'],
    systemPrompt: 'You are a product manager. Prioritize features based on impact and effort, create clear product specifications, and coordinate between stakeholders.',
    temperature: 0.5, topP: 0.9, maxTokens: 4096,
    toolPermissions: ['read', 'write'],
    layer: 3,
  },
  {
    id: 'tpl-qa-tester',
    name: 'QA Tester',
    description: 'Creates test plans, writes automated tests, identifies edge cases, and ensures software quality.',
    icon: '🐛', color: '#2E86AB', category: 'coding', brainProfile: 'opencode',
    tags: ['TESTING', 'QA', 'AUTOMATION', 'BUGS'],
    systemPrompt: 'You are a QA engineer. Write comprehensive test plans, identify edge cases, create automated test suites, and ensure software meets quality standards.',
    temperature: 0.3, topP: 0.85, maxTokens: 4096,
    toolPermissions: ['read', 'write', 'execute', 'filesystem'],
    layer: 5,
  },
  {
    id: 'tpl-customer-support',
    name: 'Customer Support',
    description: 'Handles customer inquiries, troubleshoots issues, and provides helpful, empathetic responses.',
    icon: '🎧', color: '#f472b6', category: 'productivity', brainProfile: 'gemini',
    tags: ['SUPPORT', 'HELP', 'TROUBLESHOOT', 'EMPATHY'],
    systemPrompt: 'You are a customer support specialist. Provide helpful, empathetic, and accurate responses. Escalate complex issues appropriately and document solutions.',
    temperature: 0.6, topP: 0.9, maxTokens: 2048,
    toolPermissions: ['read', 'write'],
    layer: 5,
  },
  {
    id: 'tpl-devops-engineer',
    name: 'DevOps Engineer',
    description: 'CI/CD pipeline automation, infrastructure-as-code, container orchestration, and deployment strategy.',
    icon: '⚙️', color: '#06b6d4', category: 'devops', brainProfile: 'openclaw',
    tags: ['DEVOPS', 'CI/CD', 'INFRASTRUCTURE', 'CONTAINERS'],
    systemPrompt: 'You are a senior DevOps engineer. Design and implement robust CI/CD pipelines, manage cloud infrastructure, and ensure deployment reliability. Use Infrastructure-as-Code principles.',
    temperature: 0.3, topP: 0.85, maxTokens: 8192,
    toolPermissions: ['read', 'write', 'execute', 'filesystem', 'network'],
    layer: 5,
  },
  {
    id: 'tpl-finance-analyst',
    name: 'Finance Analyst',
    description: 'Financial modeling, portfolio analysis, risk assessment, and investment strategy recommendations.',
    icon: '📊', color: '#22c55e', category: 'business', brainProfile: 'gemini',
    tags: ['FINANCE', 'ANALYSIS', 'PORTFOLIO', 'INVESTMENT'],
    systemPrompt: 'You are a quantitative finance analyst. Build financial models, analyze market data, assess risk factors, and provide data-driven investment insights with clear reasoning.',
    temperature: 0.2, topP: 0.8, maxTokens: 8192,
    toolPermissions: ['read', 'network'],
    layer: 4,
  },
  {
    id: 'tpl-legal-researcher',
    name: 'Legal Researcher',
    description: 'Case law research, contract analysis, compliance checking, and legal document drafting assistance.',
    icon: '⚖️', color: '#64748b', category: 'legal', brainProfile: 'claude',
    tags: ['LEGAL', 'CONTRACTS', 'COMPLIANCE', 'RESEARCH'],
    systemPrompt: 'You are a legal research assistant. Analyze case law, review contracts for risk, check regulatory compliance, and draft legal documents with precision and attention to jurisdiction.',
    temperature: 0.1, topP: 0.7, maxTokens: 16384,
    toolPermissions: ['read', 'write'],
    layer: 4,
  },
  {
    id: 'tpl-medical-assistant',
    name: 'Medical Assistant',
    description: 'Medical literature review, patient record summarization, drug interaction checking, and clinical decision support.',
    icon: '🏥', color: '#ef4444', category: 'medical', brainProfile: 'gemini',
    tags: ['MEDICAL', 'CLINICAL', 'RESEARCH', 'DIAGNOSIS'],
    systemPrompt: 'You are a medical AI assistant. Summarize patient records, review medical literature, check drug interactions, and provide clinical decision support. Always note that you are not a substitute for professional medical judgment.',
    temperature: 0.1, topP: 0.7, maxTokens: 8192,
    toolPermissions: ['read'],
    layer: 4,
  },
  {
    id: 'tpl-ux-designer',
    name: 'UX Designer',
    description: 'User experience design, wireframing, usability analysis, design system creation, and accessibility auditing.',
    icon: '🎨', color: '#d946ef', category: 'productivity', brainProfile: 'claude',
    tags: ['UX', 'DESIGN', 'WIREFRAME', 'ACCESSIBILITY'],
    systemPrompt: 'You are a senior UX designer. Create wireframes, analyze usability, design component systems, and ensure WCAG accessibility compliance. Think in terms of user journeys and interaction patterns.',
    temperature: 0.6, topP: 0.9, maxTokens: 4096,
    toolPermissions: ['read', 'write'],
    layer: 3,
  },
  {
    id: 'tpl-data-engineer',
    name: 'Data Engineer',
    description: 'ETL pipeline design, data warehouse architecture, SQL optimization, and big data processing workflows.',
    icon: '🗄️', color: '#0ea5e9', category: 'data', brainProfile: 'openclaw',
    tags: ['DATA', 'ETL', 'SQL', 'WAREHOUSE'],
    systemPrompt: 'You are a data engineer. Design efficient ETL pipelines, architect data warehouses, optimize SQL queries, and manage big data processing workflows. Focus on scalability and data quality.',
    temperature: 0.2, topP: 0.85, maxTokens: 8192,
    toolPermissions: ['read', 'write', 'execute', 'filesystem'],
    layer: 5,
  },
  {
    id: 'tpl-security-analyst',
    name: 'Security Analyst',
    description: 'Vulnerability assessment, threat hunting, incident response planning, and security audit automation.',
    icon: '🔐', color: '#dc2626', category: 'devops', brainProfile: 'openclaw',
    tags: ['SECURITY', 'THREAT', 'AUDIT', 'INCIDENT'],
    systemPrompt: 'You are a cybersecurity analyst. Perform vulnerability assessments, hunt for threats, plan incident responses, and automate security audits. Follow OWASP and NIST frameworks.',
    temperature: 0.2, topP: 0.8, maxTokens: 8192,
    toolPermissions: ['read', 'network'],
    layer: 5,
  },
  {
    id: 'tpl-seo-specialist',
    name: 'SEO Specialist',
    description: 'Keyword research, on-page optimization, technical SEO audits, link building strategy, and content gap analysis.',
    icon: '🎯', color: '#f97316', category: 'seo', brainProfile: 'gemini',
    tags: ['SEO', 'KEYWORDS', 'OPTIMIZATION', 'ANALYTICS'],
    systemPrompt: 'You are an SEO specialist. Conduct keyword research, perform technical SEO audits, develop content strategies, analyze competitor backlinks, and track ranking performance with actionable recommendations.',
    temperature: 0.5, topP: 0.9, maxTokens: 4096,
    toolPermissions: ['read', 'network'],
    layer: 3,
  },
  {
    id: 'tpl-sales-automator',
    name: 'Sales Automator',
    description: 'Lead qualification, email sequence automation, CRM enrichment, meeting scheduling, and pipeline analytics.',
    icon: '📈', color: '#84cc16', category: 'business', brainProfile: 'hermes',
    tags: ['SALES', 'LEADS', 'CRM', 'AUTOMATION'],
    systemPrompt: 'You are a sales automation agent. Qualify leads, craft personalized outreach sequences, enrich CRM data, schedule meetings, and analyze pipeline metrics for conversion optimization.',
    temperature: 0.4, topP: 0.9, maxTokens: 4096,
    toolPermissions: ['read', 'write', 'network'],
    layer: 3,
  },
  {
    id: 'tpl-video-producer',
    name: 'Video Producer',
    description: 'Scriptwriting, storyboard creation, editing guidance, caption generation, and thumbnail optimization.',
    icon: '🎬', color: '#ec4899', category: 'writing', brainProfile: 'gemini',
    tags: ['VIDEO', 'SCRIPTING', 'EDITING', 'CAPTIONS'],
    systemPrompt: 'You are a video production assistant. Write compelling scripts, create storyboards, guide editing decisions, generate accurate captions, and optimize thumbnails for engagement.',
    temperature: 0.7, topP: 0.95, maxTokens: 4096,
    toolPermissions: ['read', 'write'],
    layer: 3,
  },
];

/* ─── Swarm Configurations ─── */
interface SwarmConfig {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  strategy: 'consensus' | 'majority' | 'delegation' | 'race';
  agents: string[];
  color: string;
  icon: string;
}

const SWARM_CONFIGS: SwarmConfig[] = [
  { id: 'sw-code-review', name: 'Code Review Swarm', description: 'Multi-agent code review with diverse perspectives catching more issues.', agentCount: 3, strategy: 'consensus', agents: ['Claude Reviewer', 'Security Scanner', 'Style Enforcer'], color: '#00ff88', icon: '🔍' },
  { id: 'sw-research-sprint', name: 'Research Sprint', description: 'Parallel research agents covering different angles for comprehensive analysis.', agentCount: 4, strategy: 'majority', agents: ['Deep Researcher', 'Fact Checker', 'Synthesizer', 'Critic'], color: '#FFB627', icon: '🔬' },
  { id: 'sw-security-audit', name: 'Security Audit', description: 'Delegated security review with specialized vulnerability scanners.', agentCount: 3, strategy: 'delegation', agents: ['Lead Auditor', 'Pen Tester', 'Compliance Checker'], color: '#E63946', icon: '🛡️' },
  { id: 'sw-product-launch', name: 'Product Launch', description: 'Full product launch coordination across all disciplines.', agentCount: 5, strategy: 'consensus', agents: ['Product Lead', 'Marketing', 'Engineering', 'Design', 'QA'], color: '#7B2CBF', icon: '🚀' },
  { id: 'sw-bug-triage', name: 'Bug Triage', description: 'Race to diagnose and prioritize bugs for fastest resolution.', agentCount: 3, strategy: 'race', agents: ['Bug Hunter', 'Root Analyzer', 'Fix Suggester'], color: '#E8751A', icon: '🐛' },
  { id: 'sw-data-pipeline', name: 'Data Pipeline', description: 'Delegated data processing with specialized transformation agents.', agentCount: 4, strategy: 'delegation', agents: ['Pipeline Lead', 'ETL Worker', 'Quality Gate', 'Schema Validator'], color: '#38bdf8', icon: '🔄' },
];

/* ─── Workflow Configurations ─── */
interface WorkflowStep {
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  color: string;
  icon: React.ReactNode;
}

const WORKFLOW_CONFIGS: WorkflowConfig[] = [
  {
    id: 'wf-cicd',
    name: 'CI/CD Pipeline',
    description: 'Automated build, test, and deploy pipeline with quality gates.',
    steps: [
      { name: 'Build', icon: <Code2 size={10} />, color: '#00ff88' },
      { name: 'Test', icon: <Bug size={10} />, color: '#FFB627' },
      { name: 'Deploy', icon: <Rocket size={10} />, color: '#E63946' },
    ],
    color: '#00ff88', icon: <GitBranch size={14} />,
  },
  {
    id: 'wf-content-publishing',
    name: 'Content Publishing',
    description: 'End-to-end content workflow from creation to promotion.',
    steps: [
      { name: 'Write', icon: <FileText size={10} />, color: '#c084fc' },
      { name: 'Review', icon: <Eye size={10} />, color: '#FFB627' },
      { name: 'Publish', icon: <Rocket size={10} />, color: '#00ff88' },
      { name: 'Promote', icon: <TrendingUp size={10} />, color: '#E8751A' },
    ],
    color: '#c084fc', icon: <FileText size={14} />,
  },
  {
    id: 'wf-data-analysis',
    name: 'Data Analysis Pipeline',
    description: 'Structured data processing from collection to visualization.',
    steps: [
      { name: 'Collect', icon: <Database size={10} />, color: '#38bdf8' },
      { name: 'Clean', icon: <Sparkles size={10} />, color: '#FFB627' },
      { name: 'Analyze', icon: <FlaskConical size={10} />, color: '#7B2CBF' },
      { name: 'Visualize', icon: <TrendingUp size={10} />, color: '#00ff88' },
    ],
    color: '#38bdf8', icon: <Database size={14} />,
  },
  {
    id: 'wf-incident-response',
    name: 'Incident Response',
    description: 'Rapid incident detection, triage, resolution, and verification.',
    steps: [
      { name: 'Detect', icon: <AlertCircle size={10} />, color: '#E63946' },
      { name: 'Triage', icon: <Shield size={10} />, color: '#FFB627' },
      { name: 'Fix', icon: <Wand2 size={10} />, color: '#00ff88' },
      { name: 'Verify', icon: <Check size={10} />, color: '#1B998B' },
    ],
    color: '#E63946', icon: <Shield size={14} />,
  },
  {
    id: 'wf-feature-dev',
    name: 'Feature Development',
    description: 'Complete feature development lifecycle from planning to deployment.',
    steps: [
      { name: 'Plan', icon: <Briefcase size={10} />, color: '#7B2CBF' },
      { name: 'Code', icon: <Code2 size={10} />, color: '#00ff88' },
      { name: 'Review', icon: <Eye size={10} />, color: '#FFB627' },
      { name: 'Test', icon: <Bug size={10} />, color: '#38bdf8' },
      { name: 'Deploy', icon: <Rocket size={10} />, color: '#E63946' },
    ],
    color: '#9d4edd', icon: <Workflow size={14} />,
  },
  {
    id: 'wf-security-scan',
    name: 'Security Scan',
    description: 'Comprehensive security scanning, analysis, and remediation workflow.',
    steps: [
      { name: 'Scan', icon: <Search size={10} />, color: '#E63946' },
      { name: 'Analyze', icon: <FlaskConical size={10} />, color: '#FFB627' },
      { name: 'Report', icon: <FileText size={10} />, color: '#38bdf8' },
      { name: 'Remediate', icon: <Shield size={10} />, color: '#00ff88' },
    ],
    color: '#E63946', icon: <Lock size={14} />,
  },
];

/* ─── Strategy Colors ─── */
const STRATEGY_COLORS: Record<string, string> = {
  consensus: '#00ff88',
  majority: '#FFB627',
  delegation: '#7B2CBF',
  race: '#E63946',
};

/* ═══════════════════════════════════════════════════════════
   FORM STATE TYPE
   ═══════════════════════════════════════════════════════════ */

interface AgentFormState {
  name: string;
  description: string;
  icon: string;
  color: string;
  brainProfile: BrainProfile;
  category: AgentCategory;
  requiredProviders: string[];
  tags: string[];
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  toolPermissions: ToolPermission[];
  layer: number;
}

const DEFAULT_FORM: AgentFormState = {
  name: '',
  description: '',
  icon: '🤖',
  color: '#9d4edd',
  brainProfile: 'claude',
  category: 'custom',
  requiredProviders: [],
  tags: [],
  systemPrompt: '',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  toolPermissions: ['read'],
  layer: 3,
};

/* ═══════════════════════════════════════════════════════════
   SLIDER COMPONENT
   ═══════════════════════════════════════════════════════════ */

function NeonSlider({
  label, value, min, max, step, onChange, icon, color = '#9d4edd',
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; icon: React.ReactNode; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-[#8888aa]">
          {icon}
          <span className="uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="relative h-2 bg-[rgba(10,10,26,0.8)] rounded-full cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
          onChange(Math.round((min + x * (max - min)) / step) * step);
        }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 bg-[#0a0a1a] transition-all group-hover:scale-125"
          style={{ left: `calc(${pct}% - 7px)`, borderColor: color }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT BUILDER — Main Export
   ═══════════════════════════════════════════════════════════ */

type BuilderTab = 'create' | 'templates' | 'my-agents' | 'swarms' | 'workflows';

export function AgentBuilder() {
  const { agents, addAgent, updateAgent, removeAgent, providers, activeProviderId } = useOSStore();

  const [activeTab, setActiveTab] = useState<BuilderTab>('create');
  const [form, setForm] = useState<AgentFormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── My Agents ───
  const myAgents = useMemo(() =>
    agents.filter(a => a.createdFrom === 'custom'),
    [agents]
  );

  const filteredMyAgents = useMemo(() => {
    if (!searchQuery.trim()) return myAgents;
    const q = searchQuery.toLowerCase();
    return myAgents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [myAgents, searchQuery]);

  // ─── Toast helper ───
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Form handlers ───
  const updateForm = useCallback(<K extends keyof AgentFormState>(key: K, value: AgentFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toUpperCase();
    if (tag && !form.tags.includes(tag)) {
      updateForm('tags', [...form.tags, tag]);
    }
    setTagInput('');
  }, [tagInput, form.tags, updateForm]);

  const removeTag = useCallback((tag: string) => {
    updateForm('tags', form.tags.filter(t => t !== tag));
  }, [form.tags, updateForm]);

  const toggleToolPermission = useCallback((perm: ToolPermission) => {
    updateForm('toolPermissions',
      form.toolPermissions.includes(perm)
        ? form.toolPermissions.filter(p => p !== perm)
        : [...form.toolPermissions, perm]
    );
  }, [form.toolPermissions, updateForm]);

  const toggleProvider = useCallback((providerId: string) => {
    updateForm('requiredProviders',
      form.requiredProviders.includes(providerId)
        ? form.requiredProviders.filter(p => p !== providerId)
        : [...form.requiredProviders, providerId]
    );
  }, [form.requiredProviders, updateForm]);

  // ─── Save agent ───
  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      showToast('Agent name is required', 'error');
      return;
    }
    if (!form.systemPrompt.trim()) {
      showToast('System prompt is required', 'error');
      return;
    }

    const activeProvider = activeProviderId ? providers.find(p => p.id === activeProviderId && p.status) : providers.find(p => p.status);
    const providerModel = activeProvider?.model || '';

    const agentData: Agent = {
      id: editingId || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: form.name.trim(),
      description: form.description.trim(),
      status: 'offline' as AgentStatus,
      providerId: activeProvider?.id || form.requiredProviders[0] || '',
      model: providerModel,
      brainConfigId: `brain-${form.brainProfile}`,
      color: form.color,
      icon: form.icon,
      tags: form.tags,
      uptime: '0s',
      latency: 0,
      requests: 0,
      lastActive: 'never',
      capabilities: [...form.toolPermissions, `model:${providerModel}`].filter(Boolean),
      createdFrom: 'custom',
      version: '1.0.0',
      layer: form.layer,
      layers: [form.layer],
    };

    if (editingId) {
      updateAgent(editingId, agentData);
      showToast('Agent updated successfully!', 'success');
      setEditingId(null);
    } else {
      addAgent(agentData);
      showToast('Agent created successfully!', 'success');
    }

    setForm(DEFAULT_FORM);
    setActiveTab('my-agents');
  }, [form, editingId, addAgent, updateAgent, showToast]);

  // ─── Edit agent ───
  const handleEdit = useCallback((agent: Agent) => {
    setForm({
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      color: agent.color,
      brainProfile: (agent.brainConfigId.replace('brain-', '') || 'custom') as BrainProfile,
      category: 'custom',
      requiredProviders: agent.providerId ? [agent.providerId] : [],
      tags: agent.tags,
      systemPrompt: '',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 4096,
      toolPermissions: agent.capabilities as ToolPermission[],
      layer: agent.layer,
    });
    setEditingId(agent.id);
    setActiveTab('create');
  }, []);

  // ─── Delete agent ───
  const handleDelete = useCallback((id: string) => {
    removeAgent(id);
    showToast('Agent deleted', 'info');
  }, [removeAgent, showToast]);

  // ─── Use template ───
  const handleUseTemplate = useCallback((template: AgentTemplate) => {
    setForm({
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      brainProfile: template.brainProfile,
      category: template.category,
      requiredProviders: [],
      tags: template.tags,
      systemPrompt: template.systemPrompt,
      temperature: template.temperature,
      topP: template.topP,
      maxTokens: template.maxTokens,
      toolPermissions: template.toolPermissions,
      layer: template.layer,
    });
    setEditingId(null);
    setActiveTab('create');
    showToast('Template loaded — customize and save!', 'info');
  }, [showToast]);

  // ─── Tab metadata ───
  const tabs: { id: BuilderTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'create', label: 'Create Agent', icon: <Plus size={13} />, color: '#9d4edd' },
    { id: 'templates', label: 'Templates', icon: <Package size={13} />, color: '#FFB627' },
    { id: 'my-agents', label: 'My Agents', icon: <Bot size={13} />, color: '#00ff88' },
    { id: 'swarms', label: 'Swarm Configs', icon: <Users size={13} />, color: '#E63946' },
    { id: 'workflows', label: 'Workflows', icon: <Workflow size={13} />, color: '#2E86AB' },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-sm"
            style={{
              background: toast.type === 'success' ? 'rgba(0,255,136,0.1)' : toast.type === 'error' ? 'rgba(230,57,70,0.1)' : 'rgba(123,44,191,0.1)',
              borderColor: toast.type === 'success' ? 'rgba(0,255,136,0.3)' : toast.type === 'error' ? 'rgba(230,57,70,0.3)' : 'rgba(123,44,191,0.3)',
            }}
          >
            {toast.type === 'success' && <Check size={14} className="text-[#00ff88]" />}
            {toast.type === 'error' && <AlertCircle size={14} className="text-[#E63946]" />}
            {toast.type === 'info' && <Sparkles size={14} className="text-[#c084fc]" />}
            <span className="text-[11px] text-white font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-[#8888aa] hover:text-white transition-colors">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Wand2 size={16} className="text-[#9d4edd]" />
          Agent Builder
          <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-[rgba(157,78,221,0.15)] text-[#c084fc] border border-[rgba(157,78,221,0.3)]">
            {myAgents.length} custom
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[#00ff88] font-mono font-bold text-sm">{agents.length}</div>
            <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Total</div>
          </div>
          <div className="text-center">
            <div className="text-[#FFB627] font-mono font-bold text-sm">{PREBUILT_TEMPLATES.length}</div>
            <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Templates</div>
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap border"
            style={{
              borderColor: activeTab === tab.id ? `${tab.color}40` : 'rgba(157,78,221,0.1)',
              background: activeTab === tab.id ? `${tab.color}15` : 'transparent',
              color: activeTab === tab.id ? tab.color : '#8888aa',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
         TAB 1: CREATE AGENT
         ═══════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* ─── Section: Basic Info ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bot size={10} className="text-[#9d4edd]" /> Basic Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Agent Name *</div>
                  <input
                    value={form.name}
                    onChange={e => updateForm('name', e.target.value)}
                    placeholder="My Custom Agent"
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  />
                </div>

                {/* Icon + Color Row */}
                <div className="flex gap-2">
                  {/* Icon Picker */}
                  <div className="flex-shrink-0">
                    <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Icon</div>
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="w-10 h-10 rounded-lg border border-[rgba(157,78,221,0.2)] bg-[rgba(10,10,26,0.5)] text-lg flex items-center justify-center hover:border-[rgba(157,78,221,0.4)] transition-colors"
                      >
                        {form.icon}
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-12 left-0 z-30 p-2 rounded-xl border border-[rgba(157,78,221,0.2)] bg-[rgba(18,18,42,0.95)] backdrop-blur-sm shadow-xl"
                          >
                            <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                              {EMOJI_OPTIONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => { updateForm('icon', emoji); setShowEmojiPicker(false); }}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm hover:bg-[rgba(157,78,221,0.15)] transition-colors"
                                  style={form.icon === emoji ? { background: 'rgba(157,78,221,0.2)' } : undefined}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div className="flex-1">
                    <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Color</div>
                    <div className="flex flex-wrap gap-1.5">
                      {NEON_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateForm('color', c)}
                          className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: form.color === c ? '#fff' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-3">
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1">Description</div>
                <textarea
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  placeholder="Describe what this agent does..."
                  rows={2}
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors resize-none"
                />
              </div>
            </div>

            {/* ─── Section: Brain & Category ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Brain size={10} className="text-[#00ffff]" /> Brain & Category
              </div>

              {/* Brain Profile */}
              <div className="mb-3">
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Brain Profile</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(Object.keys(BRAIN_META) as BrainProfile[]).map(bp => {
                    const meta = BRAIN_META[bp];
                    const active = form.brainProfile === bp;
                    return (
                      <button
                        key={bp}
                        onClick={() => updateForm('brainProfile', bp)}
                        className="text-left p-2 rounded-lg border transition-all"
                        style={{
                          borderColor: active ? `${meta.color}40` : 'rgba(157,78,221,0.1)',
                          background: active ? `${meta.color}10` : 'transparent',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{meta.icon}</span>
                          <span className="text-[10px] font-bold" style={{ color: active ? meta.color : '#ccc' }}>{meta.label}</span>
                        </div>
                        <div className="text-[8px] text-[#8888aa] mt-0.5 leading-tight">{meta.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Category</div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm('category', cat.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border"
                      style={{
                        borderColor: form.category === cat.id ? `${cat.color}35` : 'rgba(157,78,221,0.1)',
                        background: form.category === cat.id ? `${cat.color}10` : 'transparent',
                        color: form.category === cat.id ? cat.color : '#8888aa',
                      }}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── Section: Providers & Tags ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Layers size={10} className="text-[#FFB627]" /> Providers & Tags
              </div>

              {/* Required Providers */}
              <div className="mb-3">
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Required Providers</div>
                <div className="flex flex-wrap gap-1.5">
                  {providers.map(p => {
                    const selected = form.requiredProviders.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProvider(p.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all border"
                        style={{
                          borderColor: selected ? `${p.color}35` : 'rgba(157,78,221,0.1)',
                          background: selected ? `${p.color}10` : 'transparent',
                          color: selected ? p.color : '#8888aa',
                        }}
                      >
                        <span className="text-[10px]">{p.icon}</span>
                        {p.name}
                        {selected && <Check size={8} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1.5">Tags</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {form.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-[rgba(157,78,221,0.1)] border border-[rgba(157,78,221,0.2)] text-[#c084fc]"
                    >
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                        <X size={8} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium border border-[rgba(157,78,221,0.3)] text-[#c084fc] bg-[rgba(157,78,221,0.1)] hover:bg-[rgba(157,78,221,0.2)] transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Section: System Prompt ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={10} className="text-[#00ff88]" /> System Prompt *
              </div>
              <textarea
                value={form.systemPrompt}
                onChange={e => updateForm('systemPrompt', e.target.value)}
                placeholder="Define the agent's behavior, personality, and instructions..."
                rows={4}
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors resize-none font-mono"
              />
            </div>

            {/* ─── Section: Parameters ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Gauge size={10} className="text-[#E8751A]" /> Parameters
              </div>

              <div className="space-y-4">
                <NeonSlider
                  label="Temperature"
                  value={form.temperature}
                  min={0} max={2} step={0.1}
                  onChange={v => updateForm('temperature', v)}
                  icon={<Thermometer size={10} />}
                  color={form.temperature > 1.2 ? '#E63946' : form.temperature > 0.6 ? '#FFB627' : '#00ff88'}
                />
                <NeonSlider
                  label="Top P"
                  value={form.topP}
                  min={0} max={1} step={0.05}
                  onChange={v => updateForm('topP', v)}
                  icon={<Gauge size={10} />}
                  color="#38bdf8"
                />
                <NeonSlider
                  label="Max Tokens"
                  value={form.maxTokens}
                  min={256} max={32768} step={256}
                  onChange={v => updateForm('maxTokens', v)}
                  icon={<Hash size={10} />}
                  color="#c084fc"
                />
              </div>
            </div>

            {/* ─── Section: Tool Permissions ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lock size={10} className="text-[#E63946]" /> Tool Permissions
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {TOOL_PERMISSIONS.map(perm => {
                  const active = form.toolPermissions.includes(perm.id);
                  return (
                    <button
                      key={perm.id}
                      onClick={() => toggleToolPermission(perm.id)}
                      className="flex items-center gap-1.5 p-2 rounded-lg border transition-all text-[10px]"
                      style={{
                        borderColor: active ? `${perm.color}35` : 'rgba(157,78,221,0.1)',
                        background: active ? `${perm.color}10` : 'transparent',
                        color: active ? perm.color : '#8888aa',
                      }}
                    >
                      {perm.icon}
                      <span className="font-medium">{perm.label}</span>
                      {active ? <Check size={9} className="ml-auto" /> : <X size={9} className="ml-auto opacity-40" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── Section: Layer Assignment ─── */}
            <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4">
              <div className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Layers size={10} className="text-[#2E86AB]" /> Layer Assignment (L1-L7)
              </div>

              <div className="flex flex-wrap gap-2">
                {LAYER_OPTIONS.map(layer => {
                  const active = form.layer === layer.num;
                  return (
                    <button
                      key={layer.num}
                      onClick={() => updateForm('layer', layer.num)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all"
                      style={{
                        borderColor: active ? `${layer.color}40` : 'rgba(157,78,221,0.1)',
                        background: active ? `${layer.color}15` : 'transparent',
                      }}
                    >
                      <span className="text-[10px] font-mono font-bold" style={{ color: active ? layer.color : '#8888aa' }}>
                        L{layer.num}
                      </span>
                      <span className="text-[9px]" style={{ color: active ? layer.color : '#8888aa' }}>
                        {layer.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── Save Button ─── */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[11px] font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #9d4edd88)', color: '#fff' }}
              >
                <Zap size={12} /> {editingId ? 'Update Agent' : 'Create Agent'}
              </button>
              {editingId && (
                <button
                  onClick={() => { setForm(DEFAULT_FORM); setEditingId(null); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-medium border border-[rgba(136,136,170,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(136,136,170,0.4)] transition-colors"
                >
                  <X size={10} /> Cancel Edit
                </button>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ background: `${form.color}15`, border: `1px solid ${form.color}30` }}>
                  {form.icon}
                </div>
                <div>
                  <div className="text-[10px] text-white font-medium">{form.name || 'New Agent'}</div>
                  <div className="text-[8px] text-[#8888aa]">
                    {BRAIN_META[form.brainProfile].label} · L{form.layer} · {form.category}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
           TAB 2: PREBUILT TEMPLATES
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
              <Package size={10} className="text-[#FFB627]" />
              Prebuilt Agent Templates — Click to use as a starting point
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {PREBUILT_TEMPLATES.map((template, idx) => {
                const catMeta = CATEGORIES.find(c => c.id === template.category) || CATEGORIES[5];
                const brainMeta = BRAIN_META[template.brainProfile];
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 flex flex-col hover:border-opacity-40 transition-colors cursor-pointer group"
                    style={{ borderColor: `${template.color}20` }}
                    onClick={() => handleUseTemplate(template)}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: `${template.color}12`, border: `1px solid ${template.color}25` }}>
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium">{template.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                            style={{ backgroundColor: `${catMeta.color}10`, color: catMeta.color, border: `1px solid ${catMeta.color}20` }}>
                            {catMeta.icon} {template.category}
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${brainMeta.color}08`, color: brainMeta.color, border: `1px solid ${brainMeta.color}20` }}>
                            {brainMeta.icon} {brainMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[#8888aa] text-[10px] leading-relaxed mb-3 flex-1">{template.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.map(tag => (
                        <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(136,136,170,0.08)] border border-[rgba(136,136,170,0.12)] text-[#8888aa]">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Params */}
                    <div className="flex items-center gap-3 text-[8px] text-[#8888aa] font-mono mb-3">
                      <span>T: {template.temperature}</span>
                      <span>P: {template.topP}</span>
                      <span>Tok: {template.maxTokens}</span>
                      <span>L{template.layer}</span>
                    </div>

                    {/* Use Template Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(157,78,221,0.08)]">
                      <div className="flex gap-1">
                        {template.toolPermissions.map(perm => (
                          <span key={perm} className="text-[7px] px-1 py-0.5 rounded font-medium uppercase"
                            style={{
                              backgroundColor: `${TOOL_PERMISSIONS.find(p => p.id === perm)?.color}10`,
                              color: TOOL_PERMISSIONS.find(p => p.id === perm)?.color,
                            }}>
                            {perm}
                          </span>
                        ))}
                      </div>
                      <span className="flex items-center gap-1 text-[9px] font-medium group-hover:text-white transition-colors"
                        style={{ color: template.color }}>
                        Use <ArrowRight size={8} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
           TAB 3: MY AGENTS
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'my-agents' && (
          <motion.div
            key="my-agents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search your agents..."
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888aa] hover:text-white transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>

            {filteredMyAgents.length === 0 ? (
              <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
                <Bot size={24} className="mx-auto text-[#8888aa] mb-2" />
                <p className="text-[#8888aa] text-xs mb-3">
                  {searchQuery ? 'No agents match your search.' : 'You haven\'t created any custom agents yet.'}
                </p>
                <button
                  onClick={() => { setActiveTab('create'); setSearchQuery(''); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold mx-auto"
                  style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)', color: '#fff' }}
                >
                  <Plus size={11} /> Create Your First Agent
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[rgba(0,255,136,0.12)] bg-[rgba(18,18,42,0.4)] overflow-hidden">
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {filteredMyAgents.map((agent, i) => {
                    const brainKey = agent.brainConfigId.replace('brain-', '') as BrainProfile;
                    const brainMeta = BRAIN_META[brainKey] || BRAIN_META.custom;
                    const layerMeta = LAYER_OPTIONS.find(l => l.num === agent.layer);
                    return (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(157,78,221,0.06)] last:border-0 hover:bg-[rgba(18,18,42,0.4)] transition-colors"
                      >
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}25` }}>
                          {agent.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-[11px] font-medium truncate">{agent.name}</span>
                            <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                              style={{ backgroundColor: `${brainMeta.color}08`, color: brainMeta.color, border: `1px solid ${brainMeta.color}20` }}>
                              {brainMeta.icon} {brainMeta.label}
                            </span>
                            {layerMeta && (
                              <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                                style={{ backgroundColor: `${layerMeta.color}10`, color: layerMeta.color, border: `1px solid ${layerMeta.color}20` }}>
                                L{layerMeta.num} {layerMeta.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-[#8888aa] mt-0.5 line-clamp-1">{agent.description}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(136,136,170,0.08)] border border-[rgba(136,136,170,0.12)] text-[#8888aa]">
                                #{tag}
                              </span>
                            ))}
                            {agent.tags.length > 4 && (
                              <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(136,136,170,0.08)] text-[#8888aa]">
                                +{agent.tags.length - 4}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-1.5 mr-2">
                          <div className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: agent.status === 'live' ? '#00ff88' : agent.status === 'offline' ? '#8888aa' : '#FFB627' }} />
                          <span className="text-[8px] text-[#8888aa] uppercase">{agent.status}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(agent)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(157,78,221,0.2)] text-[#c084fc] bg-[rgba(157,78,221,0.05)] hover:bg-[rgba(157,78,221,0.15)] transition-colors"
                            title="Edit agent"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] hover:bg-[rgba(230,57,70,0.15)] transition-colors"
                            title="Delete agent"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
           TAB 4: SWARM INTELLIGENCE CONFIGURATIONS
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'swarms' && (
          <motion.div
            key="swarms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
              <Users size={10} className="text-[#E63946]" />
              Prebuilt Swarm Configurations — Multi-agent collaborative intelligence
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {SWARM_CONFIGS.map((config, idx) => {
                const stratColor = STRATEGY_COLORS[config.strategy] || '#8888aa';
                return (
                  <motion.div
                    key={config.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
                    style={{ borderColor: `${config.color}20` }}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: `${config.color}12`, border: `1px solid ${config.color}25` }}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium">{config.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                            style={{ backgroundColor: `${stratColor}10`, color: stratColor, border: `1px solid ${stratColor}20` }}>
                            {config.strategy}
                          </span>
                          <span className="text-[8px] text-[#8888aa]">
                            {config.agentCount} agents
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[#8888aa] text-[10px] leading-relaxed mb-3">{config.description}</p>

                    {/* Agent Avatars */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {config.agents.map((agentName, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold border-2 border-[#0a0a1a]"
                            style={{ backgroundColor: NEON_COLORS[i % NEON_COLORS.length], color: '#fff' }}>
                            {agentName[0]}
                          </div>
                          <span className="text-[8px] text-[#8888aa]">{agentName}</span>
                        </div>
                      ))}
                    </div>

                    {/* Strategy Visualization */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[9px] text-[#8888aa] mb-1">
                        <span>Consensus Threshold</span>
                        <span className="font-mono" style={{ color: stratColor }}>
                          {config.strategy === 'consensus' ? '100%' : config.strategy === 'majority' ? '>50%' : config.strategy === 'delegation' ? 'Lead' : 'First'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${stratColor}88, ${stratColor})` }}
                          initial={{ width: 0 }}
                          animate={{ width: config.strategy === 'consensus' ? '100%' : config.strategy === 'majority' ? '55%' : config.strategy === 'delegation' ? '30%' : '15%' }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* Launch Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(157,78,221,0.08)]">
                      <div className="flex items-center gap-1 text-[8px] text-[#8888aa]">
                        <Zap size={8} /> Ready to deploy
                      </div>
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                        style={{ background: `linear-gradient(135deg, ${config.color}cc, ${config.color}88)`, color: '#fff' }}
                      >
                        <Rocket size={9} /> Launch Swarm
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
           TAB 5: WORKFLOW CONFIGURATIONS
           ═══════════════════════════════════════════════════ */}
        {activeTab === 'workflows' && (
          <motion.div
            key="workflows"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
              <Workflow size={10} className="text-[#2E86AB]" />
              Prebuilt Workflow Configurations — Automated multi-step processes
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WORKFLOW_CONFIGS.map((config, idx) => (
                <motion.div
                  key={config.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
                  style={{ borderColor: `${config.color}20` }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${config.color}12`, border: `1px solid ${config.color}25`, color: config.color }}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium">{config.name}</div>
                      <p className="text-[#8888aa] text-[9px] mt-0.5 line-clamp-2">{config.description}</p>
                    </div>
                  </div>

                  {/* Pipeline Steps */}
                  <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
                    {config.steps.map((step, stepIdx) => (
                      <div key={step.name} className="flex items-center gap-1 flex-shrink-0">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 + stepIdx * 0.08 }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border"
                          style={{
                            borderColor: `${step.color}30`,
                            background: `${step.color}08`,
                          }}
                        >
                          <span style={{ color: step.color }}>{step.icon}</span>
                          <span className="text-[9px] font-medium" style={{ color: step.color }}>{step.name}</span>
                        </motion.div>
                        {stepIdx < config.steps.length - 1 && (
                          <ChevronRight size={10} className="text-[#8888aa] flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pipeline Progress Bar */}
                  <div className="mb-3">
                    <div className="flex h-2 rounded-full overflow-hidden bg-[rgba(10,10,26,0.8)]">
                      {config.steps.map((step, stepIdx) => (
                        <motion.div
                          key={step.name}
                          className="h-full"
                          style={{ backgroundColor: step.color, width: `${100 / config.steps.length}%` }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.5, delay: idx * 0.05 + stepIdx * 0.1 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(157,78,221,0.08)]">
                    <div className="text-[8px] text-[#8888aa]">
                      {config.steps.length} steps · Automated pipeline
                    </div>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                      style={{ background: `linear-gradient(135deg, ${config.color}cc, ${config.color}88)`, color: '#fff' }}
                    >
                      <Copy size={9} /> Use Template
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
