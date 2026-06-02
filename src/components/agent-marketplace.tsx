'use client';

import { useOSStore, type MarketplaceAgent, type BrainProfile } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Search, Star, Download, Tag, Check, Filter,
  Bot, Zap, Shield, Package, ArrowDownToLine, Sparkles,
  Brain, Users, FileCode, Briefcase, GraduationCap, Plane,
  Scale, Stethoscope, Microscope, Palette, Globe, Wrench,
  ChevronRight, X, TrendingUp, Award, BarChart3,
} from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';

/* ─── Constants ─── */
const CATEGORIES: Array<{
  id: MarketplaceAgent['category'];
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { id: 'business', label: 'Business', icon: <Briefcase size={12} />, color: '#7B2CBF' },
  { id: 'recruitment', label: 'Recruitment', icon: <Users size={12} />, color: '#2E86AB' },
  { id: 'wordpress', label: 'WordPress', icon: <Globe size={12} />, color: '#1B998B' },
  { id: 'seo', label: 'SEO', icon: <TrendingUp size={12} />, color: '#FFB627' },
  { id: 'marketing', label: 'Marketing', icon: <Palette size={12} />, color: '#E8751A' },
  { id: 'programming', label: 'Programming', icon: <FileCode size={12} />, color: '#00ff88' },
  { id: 'education', label: 'Education', icon: <GraduationCap size={12} />, color: '#c084fc' },
  { id: 'aviation', label: 'Aviation', icon: <Plane size={12} />, color: '#38bdf8' },
  { id: 'legal', label: 'Legal', icon: <Scale size={12} />, color: '#E63946' },
  { id: 'medical', label: 'Medical', icon: <Stethoscope size={12} />, color: '#f472b6' },
  { id: 'research', label: 'Research', icon: <Microscope size={12} />, color: '#a3e635' },
  { id: 'devops', label: 'DevOps', icon: <Shield size={12} />, color: '#00ffff' },
  { id: 'data', label: 'Data', icon: <BarChart3 size={12} />, color: '#00ffff' },
  { id: 'writing', label: 'Writing', icon: <Sparkles size={12} />, color: '#c084fc' },
  { id: 'productivity', label: 'Productivity', icon: <Zap size={12} />, color: '#FFB627' },
  { id: 'custom', label: 'Custom', icon: <Wrench size={12} />, color: '#8888aa' },
];

const BRAIN_META: Record<BrainProfile, { label: string; color: string; icon: string }> = {
  claude: { label: 'Claude', color: '#E63946', icon: '🧠' },
  gemini: { label: 'Gemini', color: '#4285F4', icon: '💎' },
  hermes: { label: 'Hermes', color: '#FFB627', icon: '⚡' },
  openclaw: { label: 'OpenClaw', color: '#E8751A', icon: '🐾' },
  vault: { label: 'Vault', color: '#2E86AB', icon: '🔐' },
  opencode: { label: 'OpenCode', color: '#00ff88', icon: '💻' },
  custom: { label: 'Custom', color: '#c084fc', icon: '⚙️' },
};

/* ─── Seed Marketplace Data (ALL FREE) ─── */
const SEED_AGENTS: MarketplaceAgent[] = [
  {
    id: 'ma-1', name: 'DealFlow Pro', description: 'Automates lead scoring, pipeline tracking, and deal analysis with real-time CRM integration and predictive insights.',
    category: 'business', author: 'AgenticOS Team', version: '2.1.0', rating: 4.8, downloads: 12450, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '💼', color: '#7B2CBF',
    tags: ['CRM', 'pipeline', 'analytics', 'scoring'],
  },
  {
    id: 'ma-2', name: 'TalentHunter AI', description: 'End-to-end recruitment agent: candidate sourcing, resume parsing, interview scheduling, and bias-aware screening.',
    category: 'recruitment', author: 'HR Labs', version: '1.5.2', rating: 4.6, downloads: 8930, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '🎯', color: '#2E86AB',
    tags: ['hiring', 'screening', 'sourcing', 'ATS'],
  },
  {
    id: 'ma-3', name: 'WP Guardian', description: 'Monitors WordPress sites for uptime, security vulnerabilities, performance, and auto-applies core/plugin updates.',
    category: 'wordpress', author: 'WP Wizards', version: '3.0.1', rating: 4.9, downloads: 18720, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai'], icon: '🛡️', color: '#1B998B',
    tags: ['security', 'monitoring', 'uptime', 'updates'],
  },
  {
    id: 'ma-4', name: 'SERP Dominator', description: 'Comprehensive SEO agent: keyword research, content optimization, backlink analysis, and technical SEO audits.',
    category: 'seo', author: 'SearchStack', version: '4.2.0', rating: 4.7, downloads: 15600, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '🔍', color: '#FFB627',
    tags: ['keywords', 'content', 'backlinks', 'audit'],
  },
  {
    id: 'ma-5', name: 'BrandPulse', description: 'Social media marketing agent with content creation, scheduling, engagement tracking, and sentiment analysis across all platforms.',
    category: 'marketing', author: 'SocialForge', version: '2.8.0', rating: 4.5, downloads: 9200, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '📱', color: '#E8751A',
    tags: ['social', 'content', 'scheduling', 'analytics'],
  },
  {
    id: 'ma-6', name: 'CodeForge', description: 'Full-stack code generation, review, and debugging agent with multi-language support, test generation, and documentation.',
    category: 'programming', author: 'DevStudio', version: '5.1.0', rating: 4.9, downloads: 31200, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic', 'openai'], icon: '⚡', color: '#00ff88',
    tags: ['code', 'review', 'debugging', 'tests'],
  },
  {
    id: 'ma-7', name: 'EduMentor', description: 'AI tutor and curriculum designer that adapts to learning styles, generates exercises, and tracks student progress over time.',
    category: 'education', author: 'LearnTech', version: '1.9.3', rating: 4.4, downloads: 6700, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '📚', color: '#c084fc',
    tags: ['tutoring', 'curriculum', 'adaptive', 'progress'],
  },
  {
    id: 'ma-8', name: 'SkyOps', description: 'Aviation operations agent: flight planning, weather analysis, compliance checking, and crew scheduling with real-time NOTAM monitoring.',
    category: 'aviation', author: 'AeroLogic', version: '1.2.0', rating: 4.3, downloads: 2100, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai', 'anthropic'], icon: '✈️', color: '#38bdf8',
    tags: ['flight', 'weather', 'compliance', 'scheduling'],
  },
  {
    id: 'ma-9', name: 'LegalEase', description: 'Contract analysis, legal research, compliance auditing, and risk assessment with jurisdiction-aware reasoning and citation tracking.',
    category: 'legal', author: 'JurisAI', version: '2.4.0', rating: 4.6, downloads: 5400, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '⚖️', color: '#E63946',
    tags: ['contracts', 'research', 'compliance', 'risk'],
  },
  {
    id: 'ma-10', name: 'MediAssist', description: 'Clinical decision support, literature review, diagnostic assistance, and patient data analysis with HIPAA-aware data handling.',
    category: 'medical', author: 'HealthAI', version: '1.7.0', rating: 4.5, downloads: 3800, price: 0,
    installed: false, brainProfile: 'vault', requiredProviders: ['anthropic', 'openai'], icon: '🏥', color: '#f472b6',
    tags: ['clinical', 'diagnostics', 'literature', 'HIPAA'],
  },
  {
    id: 'ma-11', name: 'DeepResearch', description: 'Academic research agent: paper discovery, methodology analysis, data synthesis, and publication-ready literature reviews.',
    category: 'research', author: 'SciBot Labs', version: '3.1.0', rating: 4.8, downloads: 11200, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google', 'anthropic'], icon: '🔬', color: '#a3e635',
    tags: ['papers', 'methodology', 'synthesis', 'reviews'],
  },
  {
    id: 'ma-12', name: 'WorkflowWeaver', description: 'Custom workflow builder with conditional logic, API orchestration, human-in-the-loop approval, and multi-agent coordination.',
    category: 'custom', author: 'AgenticOS Team', version: '1.0.0', rating: 4.2, downloads: 1500, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai'], icon: '🔧', color: '#8888aa',
    tags: ['workflow', 'automation', 'orchestration', 'custom'],
  },
  {
    id: 'ma-13', name: 'FinancePilot', description: 'Financial analysis, forecasting, budget optimization, and investment research with real-time market data integration.',
    category: 'business', author: 'QuantEdge', version: '2.3.0', rating: 4.7, downloads: 9800, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '📊', color: '#7B2CBF',
    tags: ['finance', 'forecasting', 'budget', 'investment'],
  },
  {
    id: 'ma-14', name: 'ContentEngine', description: 'SEO-optimized content creation with keyword density analysis, readability scoring, and multi-format output for blogs, docs, and social.',
    category: 'seo', author: 'ContentForge', version: '3.5.0', rating: 4.6, downloads: 13400, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '✍️', color: '#FFB627',
    tags: ['content', 'SEO', 'writing', 'optimization'],
  },
  {
    id: 'ma-15', name: 'DevOps Sentinel', description: 'CI/CD pipeline monitoring, infrastructure health checks, incident response automation, and deployment rollback orchestration.',
    category: 'programming', author: 'InfraGuard', version: '2.0.0', rating: 4.4, downloads: 7600, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['anthropic'], icon: '🚀', color: '#00ff88',
    tags: ['CI/CD', 'monitoring', 'incident', 'deployment'],
  },
  // ─── NEW FREE AGENTS ───
  {
    id: 'ma-16', name: 'DataWizard', description: 'Data pipeline builder with ETL orchestration, data quality checks, schema validation, and automated reporting with visualization generation.',
    category: 'data', author: 'DataForge Labs', version: '2.0.0', rating: 4.7, downloads: 8900, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google', 'openai'], icon: '📊', color: '#00ffff',
    tags: ['ETL', 'pipeline', 'quality', 'reporting'],
  },
  {
    id: 'ma-17', name: 'CopyCraft', description: 'Professional copywriting agent for landing pages, email campaigns, ad copy, and product descriptions with A/B testing suggestions.',
    category: 'writing', author: 'WordSmith AI', version: '3.2.0', rating: 4.8, downloads: 14200, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '✏️', color: '#c084fc',
    tags: ['copywriting', 'email', 'ads', 'landing-page'],
  },
  {
    id: 'ma-18', name: 'TaskMaster', description: 'Project management agent with sprint planning, task decomposition, priority scoring, deadline tracking, and team workload balancing.',
    category: 'productivity', author: 'AgileOps', version: '2.5.0', rating: 4.5, downloads: 10300, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '📋', color: '#FFB627',
    tags: ['project', 'sprint', 'planning', 'decomposition'],
  },
  {
    id: 'ma-19', name: 'SecurityShield', description: 'Continuous security scanning, vulnerability assessment, penetration test orchestration, and compliance monitoring with OWASP coverage.',
    category: 'devops', author: 'CyberGuard', version: '2.1.0', rating: 4.9, downloads: 7800, price: 0,
    installed: false, brainProfile: 'vault', requiredProviders: ['anthropic', 'openai'], icon: '🔐', color: '#E63946',
    tags: ['security', 'vulnerability', 'pentest', 'compliance'],
  },
  {
    id: 'ma-20', name: 'APIForge', description: 'REST and GraphQL API design, schema generation, endpoint documentation, integration testing, and mock server creation.',
    category: 'programming', author: 'APISmith', version: '1.8.0', rating: 4.6, downloads: 6500, price: 0,
    installed: false, brainProfile: 'opencode', requiredProviders: ['openai'], icon: '🔌', color: '#2E86AB',
    tags: ['API', 'REST', 'GraphQL', 'testing'],
  },
  {
    id: 'ma-21', name: 'DocuMind', description: 'Intelligent document processing agent that extracts, classifies, summarizes, and cross-references information from PDFs, DOCX, and spreadsheets.',
    category: 'data', author: 'DocuTech AI', version: '2.4.0', rating: 4.7, downloads: 9100, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '📄', color: '#a3e635',
    tags: ['document', 'extraction', 'classification', 'summarization'],
  },
  {
    id: 'ma-22', name: 'ChatBot Builder', description: 'Visual chatbot designer with intent recognition, entity extraction, dialogue flow management, multi-channel deployment, and analytics dashboard.',
    category: 'custom', author: 'ConvoAI', version: '3.0.0', rating: 4.4, downloads: 11800, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '💬', color: '#38bdf8',
    tags: ['chatbot', 'intent', 'dialogue', 'deployment'],
  },
  {
    id: 'ma-23', name: 'TestPilot', description: 'Automated testing agent: unit test generation, integration test scaffolding, coverage analysis, and regression detection across multiple frameworks.',
    category: 'programming', author: 'QA Forge', version: '2.2.0', rating: 4.5, downloads: 5600, price: 0,
    installed: false, brainProfile: 'opencode', requiredProviders: ['openai'], icon: '🧪', color: '#00ff88',
    tags: ['testing', 'unit-test', 'integration', 'coverage'],
  },
  {
    id: 'ma-24', name: 'InnovateLab', description: 'Innovation and ideation agent that generates product concepts, market analysis, competitive positioning, and go-to-market strategies.',
    category: 'business', author: 'IdeaForge', version: '1.6.0', rating: 4.3, downloads: 4200, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '💡', color: '#FFB627',
    tags: ['innovation', 'ideation', 'market', 'strategy'],
  },
  {
    id: 'ma-25', name: 'TranslatePro', description: 'Multi-language translation agent with context-aware translation, cultural adaptation, terminology management, and quality scoring.',
    category: 'writing', author: 'LinguaAI', version: '2.0.0', rating: 4.6, downloads: 7400, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🌐', color: '#4285f4',
    tags: ['translation', 'localization', 'language', 'cultural'],
  },
  {
    id: 'ma-26', name: 'ComplianceGuard', description: 'Regulatory compliance monitoring with automated policy checks, audit trail generation, risk scoring, and remediation guidance across industries.',
    category: 'legal', author: 'RegTech AI', version: '1.9.0', rating: 4.5, downloads: 3600, price: 0,
    installed: false, brainProfile: 'vault', requiredProviders: ['anthropic'], icon: '🏛️', color: '#E63946',
    tags: ['compliance', 'regulatory', 'audit', 'risk'],
  },
  {
    id: 'ma-27', name: 'CloudArchitect', description: 'Cloud infrastructure design, cost optimization, migration planning, and multi-cloud orchestration with Terraform and Kubernetes support.',
    category: 'devops', author: 'CloudNova', version: '2.3.0', rating: 4.8, downloads: 6200, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai', 'anthropic'], icon: '☁️', color: '#00ffff',
    tags: ['cloud', 'infrastructure', 'Terraform', 'Kubernetes'],
  },
  {
    id: 'ma-28', name: 'UX Design Lab', description: 'User experience design assistant with wireframe generation, usability analysis, accessibility checks, and design system management.',
    category: 'productivity', author: 'DesignForge', version: '1.4.0', rating: 4.4, downloads: 4800, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🎨', color: '#c084fc',
    tags: ['UX', 'wireframe', 'accessibility', 'design-system'],
  },
  {
    id: 'ma-29', name: 'Swarm Commander', description: 'Pre-built swarm intelligence configurations for code review, research sprint, security audit, and product launch with multi-agent orchestration.',
    category: 'custom', author: 'AgenticOS Team', version: '1.2.0', rating: 4.7, downloads: 5400, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '🐝', color: '#9d4edd',
    tags: ['swarm', 'orchestration', 'multi-agent', 'consensus'],
  },
  {
    id: 'ma-30', name: 'Analytics Guru', description: 'Business intelligence agent with KPI tracking, trend analysis, anomaly detection, and automated report generation with interactive dashboards.',
    category: 'data', author: 'InsightAI', version: '3.1.0', rating: 4.6, downloads: 8700, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google', 'openai'], icon: '📈', color: '#a3e635',
    tags: ['analytics', 'KPI', 'dashboard', 'reporting'],
  },
  // ─── NEW AGENTS ───
  {
    id: 'ma-31', name: 'FinTech Advisor', description: 'AI financial advisor with portfolio optimization, risk assessment, market sentiment analysis, and automated tax-loss harvesting strategies.',
    category: 'business', author: 'WealthAI', version: '1.2.0', rating: 4.7, downloads: 6200, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '💰', color: '#22c55e',
    tags: ['finance', 'portfolio', 'risk', 'tax'],
  },
  {
    id: 'ma-32', name: 'Legal Eagle', description: 'Contract review, case law research, compliance checking, and legal document drafting with jurisdiction-aware recommendations.',
    category: 'legal', author: 'LexAI', version: '2.0.1', rating: 4.5, downloads: 4100, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '⚖️', color: '#64748b',
    tags: ['legal', 'contracts', 'compliance', 'research'],
  },
  {
    id: 'ma-33', name: 'MediAssist', description: 'Medical diagnosis support, drug interaction checker, patient record summarization, and clinical trial matching.',
    category: 'medical', author: 'HealthAI', version: '1.8.3', rating: 4.4, downloads: 5500, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🏥', color: '#ef4444',
    tags: ['medical', 'diagnosis', 'drugs', 'clinical'],
  },
  {
    id: 'ma-34', name: 'EduTutor Pro', description: 'Personalized learning paths, quiz generation, concept explanation with adaptive difficulty, and progress tracking for any subject.',
    category: 'education', author: 'LearnAI', version: '3.2.0', rating: 4.8, downloads: 14200, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '📚', color: '#8b5cf6',
    tags: ['education', 'tutoring', 'quizzes', 'learning'],
  },
  {
    id: 'ma-35', name: 'ContentForge', description: 'Multi-format content creation: blog posts, social media, newsletters, video scripts, and podcast outlines with SEO optimization.',
    category: 'writing', author: 'WriteAI', version: '4.0.0', rating: 4.7, downloads: 18100, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '✏️', color: '#f59e0b',
    tags: ['content', 'blog', 'social', 'SEO'],
  },
  {
    id: 'ma-36', name: 'DevSecOps Agent', description: 'CI/CD pipeline automation, security scanning, vulnerability patching, container orchestration, and infrastructure-as-code generation.',
    category: 'devops', author: 'SecOpsAI', version: '2.3.1', rating: 4.6, downloads: 7800, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai', 'anthropic'], icon: '🔐', color: '#06b6d4',
    tags: ['devops', 'security', 'CI/CD', 'infrastructure'],
  },
  {
    id: 'ma-37', name: 'SEO Dominator', description: 'Advanced SEO agent: keyword clustering, content gap analysis, backlink monitoring, rank tracking, and competitor SERP analysis.',
    category: 'seo', author: 'RankAI', version: '5.1.0', rating: 4.9, downloads: 22100, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🎯', color: '#f97316',
    tags: ['SEO', 'keywords', 'backlinks', 'ranking'],
  },
  {
    id: 'ma-38', name: 'Logistics Optimizer', description: 'Supply chain optimization, route planning, inventory forecasting, warehouse management, and delivery scheduling with real-time tracking.',
    category: 'business', author: 'ShipAI', version: '2.0.0', rating: 4.5, downloads: 4900, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '🚚', color: '#3b82f6',
    tags: ['logistics', 'supply-chain', 'inventory', 'routing'],
  },
  {
    id: 'ma-39', name: 'Social Butler', description: 'Social media management across platforms: post scheduling, engagement analytics, sentiment tracking, competitor monitoring, and trend detection.',
    category: 'marketing', author: 'SocialAI', version: '3.5.0', rating: 4.4, downloads: 11200, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai'], icon: '📱', color: '#ec4899',
    tags: ['social-media', 'scheduling', 'analytics', 'engagement'],
  },
  {
    id: 'ma-40', name: 'Code Reviewer Pro', description: 'Automated code review with security analysis, performance profiling, style enforcement, test coverage suggestions, and merge conflict resolution.',
    category: 'coding', author: 'CodeAI', version: '4.2.0', rating: 4.8, downloads: 15700, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '🔍', color: '#10b981',
    tags: ['code-review', 'security', 'testing', 'profiling'],
  },
  {
    id: 'ma-41', name: 'Cloud Architect', description: 'Multi-cloud architecture design, cost optimization, migration planning, disaster recovery strategy, and compliance auditing.',
    category: 'devops', author: 'CloudAI', version: '2.1.0', rating: 4.6, downloads: 6500, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '☁️', color: '#0ea5e9',
    tags: ['cloud', 'architecture', 'migration', 'cost'],
  },
  {
    id: 'ma-42', name: 'Data Miner', description: 'Web scraping, data extraction, ETL pipeline automation, data cleaning, and structured dataset generation from unstructured sources.',
    category: 'data', author: 'ScrapeAI', version: '3.0.0', rating: 4.5, downloads: 9200, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '⛏️', color: '#a855f7',
    tags: ['scraping', 'ETL', 'data-cleaning', 'extraction'],
  },
  {
    id: 'ma-43', name: 'Video Producer', description: 'AI video scriptwriting, storyboard generation, voiceover synthesis, caption creation, and post-production editing assistance.',
    category: 'writing', author: 'VidAI', version: '1.5.0', rating: 4.3, downloads: 7200, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🎬', color: '#dc2626',
    tags: ['video', 'scripting', 'editing', 'captions'],
  },
  {
    id: 'ma-44', name: 'HR Onboarder', description: 'Employee onboarding automation: document generation, training schedule creation, policy acknowledgment tracking, and buddy system matching.',
    category: 'recruitment', author: 'HRAI', version: '2.0.0', rating: 4.7, downloads: 5800, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '👋', color: '#14b8a6',
    tags: ['HR', 'onboarding', 'documents', 'training'],
  },
  {
    id: 'ma-45', name: 'Game Dev Assistant', description: 'Game design documentation, level design scripting, asset pipeline management, playtest analysis, and balancing calculations.',
    category: 'coding', author: 'GameAI', version: '1.8.0', rating: 4.6, downloads: 4300, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🎮', color: '#d946ef',
    tags: ['gaming', 'design', 'scripting', 'assets'],
  },
  {
    id: 'ma-46', name: 'eCom Manager', description: 'E-commerce platform management: product listing optimization, inventory sync, pricing strategy, review analysis, and conversion rate optimization.',
    category: 'business', author: 'ShopAI', version: '3.3.0', rating: 4.5, downloads: 10100, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '🛒', color: '#f97316',
    tags: ['ecommerce', 'products', 'pricing', 'conversion'],
  },
  {
    id: 'ma-47', name: 'Accessibility Auditor', description: 'WCAG compliance checking, accessibility issue detection, remediation suggestions, screen reader simulation, and inclusive design recommendations.',
    category: 'devops', author: 'A11yAI', version: '1.4.0', rating: 4.8, downloads: 3900, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '♿', color: '#6366f1',
    tags: ['accessibility', 'WCAG', 'compliance', 'audit'],
  },
  {
    id: 'ma-48', name: 'API Architect', description: 'RESTful and GraphQL API design, OpenAPI spec generation, endpoint testing, rate limiting strategy, and documentation auto-generation.',
    category: 'coding', author: 'APIAI', version: '2.5.0', rating: 4.7, downloads: 8300, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai'], icon: '🔌', color: '#84cc16',
    tags: ['API', 'REST', 'GraphQL', 'documentation'],
  },
  {
    id: 'ma-49', name: 'Crypto Analyst', description: 'Blockchain transaction analysis, tokenomics evaluation, smart contract auditing, DeFi yield optimization, and portfolio tracking across chains.',
    category: 'business', author: 'ChainAI', version: '1.1.0', rating: 4.4, downloads: 3600, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '₿', color: '#f7931a',
    tags: ['crypto', 'blockchain', 'DeFi', 'auditing'],
  },
  {
    id: 'ma-50', name: 'Event Planner', description: 'End-to-end event coordination: venue sourcing, vendor management, budget tracking, guest list automation, and timeline generation.',
    category: 'productivity', author: 'PlanAI', version: '1.6.0', rating: 4.5, downloads: 5100, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '📅', color: '#ec4899',
    tags: ['events', 'planning', 'budget', 'vendors'],
  },
  {
    id: 'ma-51', name: 'Language Tutor', description: 'Multi-language learning assistant with conversation practice, grammar correction, vocabulary building, pronunciation feedback, and cultural context.',
    category: 'education', author: 'LinguaAI', version: '2.2.0', rating: 4.7, downloads: 8900, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🗣️', color: '#06b6d4',
    tags: ['language', 'learning', 'grammar', 'pronunciation'],
  },
  {
    id: 'ma-52', name: 'Sustainability Tracker', description: 'Carbon footprint calculation, ESG reporting, sustainability goal tracking, supply chain ethics analysis, and green certification assistance.',
    category: 'business', author: 'EcoAI', version: '1.0.0', rating: 4.3, downloads: 2800, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '🌱', color: '#22c55e',
    tags: ['sustainability', 'ESG', 'carbon', 'green'],
  },
  {
    id: 'ma-53', name: 'UX Researcher', description: 'User research automation: survey design, usability test analysis, heatmap interpretation, persona generation, and journey mapping.',
    category: 'data', author: 'UXAI', version: '2.0.0', rating: 4.6, downloads: 6700, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🧪', color: '#8b5cf6',
    tags: ['UX', 'research', 'usability', 'personas'],
  },
  {
    id: 'ma-54', name: 'IoT Controller', description: 'IoT device fleet management, sensor data analysis, automation rule creation, edge computing configuration, and real-time monitoring dashboards.',
    category: 'devops', author: 'IoT-AI', version: '1.3.0', rating: 4.4, downloads: 3400, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai'], icon: '📡', color: '#64748b',
    tags: ['IoT', 'sensors', 'automation', 'monitoring'],
  },
  {
    id: 'ma-55', name: 'Grant Writer', description: 'Grant proposal generation, funding opportunity matching, budget justification, impact metrics calculation, and submission deadline tracking.',
    category: 'writing', author: 'GrantAI', version: '1.0.0', rating: 4.5, downloads: 2100, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '📝', color: '#f59e0b',
    tags: ['grants', 'proposals', 'funding', 'nonprofit'],
  },
  {
    id: 'ma-56', name: 'Podcast Producer', description: 'Podcast episode planning, interview question generation, show notes writing, transcription, chapter marking, and promotional content creation.',
    category: 'writing', author: 'PodAI', version: '2.1.0', rating: 4.6, downloads: 5500, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google'], icon: '🎙️', color: '#ef4444',
    tags: ['podcast', 'transcription', 'planning', 'promotion'],
  },
  {
    id: 'ma-57', name: 'DB Optimizer', description: 'Database performance tuning, query optimization, index recommendation, schema migration planning, and backup strategy automation.',
    category: 'devops', author: 'DBAI', version: '3.0.0', rating: 4.7, downloads: 7200, price: 0,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai'], icon: '🗄️', color: '#0ea5e9',
    tags: ['database', 'SQL', 'optimization', 'backup'],
  },
  {
    id: 'ma-58', name: 'Real Estate Scout', description: 'Property valuation, market trend analysis, investment ROI calculation, neighborhood scoring, and automated comparative market analysis.',
    category: 'business', author: 'PropAI', version: '1.4.0', rating: 4.4, downloads: 4800, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai'], icon: '🏠', color: '#a855f7',
    tags: ['real-estate', 'valuation', 'investment', 'CMA'],
  },
  {
    id: 'ma-59', name: 'Mental Wellness Coach', description: 'Guided meditation scripts, mood tracking analysis, cognitive behavioral therapy exercises, journaling prompts, and stress management techniques.',
    category: 'productivity', author: 'MindAI', version: '1.2.0', rating: 4.8, downloads: 9400, price: 0,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '🧘', color: '#22c55e',
    tags: ['wellness', 'meditation', 'CBT', 'journaling'],
  },
  {
    id: 'ma-60', name: 'Swarm Commander Elite', description: 'Advanced multi-agent orchestration with hierarchical task decomposition, cross-agent memory sharing, consensus voting, and autonomous failover with self-healing capabilities.',
    category: 'custom', author: 'AgenticOS Core', version: '5.0.0', rating: 4.9, downloads: 3100, price: 0,
    installed: false, brainProfile: 'gemini', requiredProviders: ['google', 'openai', 'anthropic'], icon: '👑', color: '#f97316',
    tags: ['swarm', 'orchestration', 'multi-agent', 'autonomous'],
  },
];

/* ─── Helper: Star Rating Display ─── */
function StarRating({ rating, size = 10 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={size} className="fill-[#FFB627] text-[#FFB627]" />
      ))}
      {half && <Star key="h" size={size} className="fill-[#FFB627]/50 text-[#FFB627]" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={size} className="text-[#8888aa]/30" />
      ))}
    </div>
  );
}

/* ─── Helper: Format Number ─── */
function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ═══════════════════════════════════════════════════════
   AGENT MARKETPLACE — Main Export
   ═══════════════════════════════════════════════════════ */
export function AgentMarketplace() {
  const { marketplaceAgents, setMarketplaceAgents, providers } = useOSStore();

  const [activeCategory, setActiveCategory] = useState<MarketplaceAgent['category'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ id: string; message: string; type: 'success' | 'info' } | null>(null);

  // Initialize seed data on first render if empty
  useEffect(() => {
    if (marketplaceAgents.length === 0) {
      setMarketplaceAgents(SEED_AGENTS);
    }
  }, [marketplaceAgents.length, setMarketplaceAgents]);

  // Filter agents
  const filteredAgents = useMemo(() => {
    let agents = marketplaceAgents;
    if (activeCategory !== 'all') {
      agents = agents.filter(a => a.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        a.author.toLowerCase().includes(q)
      );
    }
    return agents;
  }, [marketplaceAgents, activeCategory, searchQuery]);

  const installedAgents = marketplaceAgents.filter(a => a.installed);

  const handleInstall = useCallback((agentId: string) => {
    const updated = marketplaceAgents.map(a =>
      a.id === agentId ? { ...a, installed: true } : a
    );
    setMarketplaceAgents(updated);
    const agent = marketplaceAgents.find(a => a.id === agentId);
    if (agent) {
      setToast({ id: `toast-${Date.now()}`, message: `${agent.name} installed successfully!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }
  }, [marketplaceAgents, setMarketplaceAgents]);

  const handleUninstall = useCallback((agentId: string) => {
    const updated = marketplaceAgents.map(a =>
      a.id === agentId ? { ...a, installed: false } : a
    );
    setMarketplaceAgents(updated);
    const agent = marketplaceAgents.find(a => a.id === agentId);
    if (agent) {
      setToast({ id: `toast-${Date.now()}`, message: `${agent.name} uninstalled.`, type: 'info' });
      setTimeout(() => setToast(null), 3000);
    }
  }, [marketplaceAgents, setMarketplaceAgents]);

  const getCategoryMeta = (cat: MarketplaceAgent['category']) =>
    CATEGORIES.find(c => c.id === cat) || CATEGORIES[CATEGORIES.length - 1];

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  return (
    <div className="space-y-4">
      {/* ─── Toast Notification ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-sm"
            style={{
              background: toast.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(123,44,191,0.1)',
              borderColor: toast.type === 'success' ? 'rgba(0,255,136,0.3)' : 'rgba(123,44,191,0.3)',
            }}>
            {toast.type === 'success' ? <Check size={14} className="text-[#00ff88]" /> : <Zap size={14} className="text-[#c084fc]" />}
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
          <Store size={16} className="text-[#FFB627]" />
          Agent Marketplace
          <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-[rgba(255,182,39,0.15)] text-[#FFB627] border border-[rgba(255,182,39,0.3)]">
            {marketplaceAgents.length}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[#00ff88] font-mono font-bold text-sm">{installedAgents.length}</div>
            <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Installed</div>
          </div>
          <div className="text-center">
            <div className="text-[#FFB627] font-mono font-bold text-sm">{marketplaceAgents.filter(a => a.price === 0).length}</div>
            <div className="text-[9px] text-[#8888aa] uppercase tracking-wider">Free</div>
          </div>
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search agents, tags, authors..."
          className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] transition-colors" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888aa] hover:text-white transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      {/* ─── Category Pills ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => setActiveCategory('all')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap border"
          style={{
            borderColor: activeCategory === 'all' ? 'rgba(255,182,39,0.3)' : 'rgba(157,78,221,0.1)',
            background: activeCategory === 'all' ? 'rgba(255,182,39,0.1)' : 'transparent',
            color: activeCategory === 'all' ? '#FFB627' : '#8888aa',
          }}>
          <Sparkles size={10} /> All
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap border"
            style={{
              borderColor: activeCategory === cat.id ? `${cat.color}35` : 'rgba(157,78,221,0.1)',
              background: activeCategory === cat.id ? `${cat.color}10` : 'transparent',
              color: activeCategory === cat.id ? cat.color : '#8888aa',
            }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* ─── Agent Cards Grid ─── */}
      {filteredAgents.length === 0 ? (
        <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-8 text-center">
          <Bot size={24} className="mx-auto text-[#8888aa] mb-2" />
          <p className="text-[#8888aa] text-xs">No agents found matching your criteria. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredAgents.map((agent, idx) => {
            const catMeta = getCategoryMeta(agent.category);
            const brainMeta = BRAIN_META[agent.brainProfile] || BRAIN_META.custom;
            return (
              <motion.div key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4 flex flex-col"
                style={{ borderColor: `${agent.color}18` }}>

                {/* Card Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}25` }}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-xs font-medium truncate">{agent.name}</span>
                      {agent.installed && (
                        <span className="flex items-center gap-0.5 text-[7px] px-1 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.25)] text-[#00ff88] font-bold uppercase">
                          <Check size={6} /> Installed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5"
                        style={{ backgroundColor: `${catMeta.color}12`, color: catMeta.color, border: `1px solid ${catMeta.color}20` }}>
                        {catMeta.icon} {agent.category}
                      </span>
                      <span className="text-[8px] text-[#8888aa]">v{agent.version}</span>
                      <span className="text-[8px] text-[#8888aa]">by {agent.author}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[#8888aa] text-[10px] leading-relaxed mb-3 flex-1 line-clamp-3">{agent.description}</p>

                {/* Rating & Downloads */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={agent.rating} size={9} />
                    <span className="text-[9px] font-mono text-[#FFB627]">{agent.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-[#8888aa]">
                    <Download size={9} /> {formatNumber(agent.downloads)}
                  </div>
                </div>

                {/* Brain Profile Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium border"
                    style={{
                      borderColor: `${brainMeta.color}25`,
                      background: `${brainMeta.color}08`,
                      color: brainMeta.color,
                    }}>
                    <span className="text-[9px]">{brainMeta.icon}</span>
                    <Brain size={8} /> {brainMeta.label}
                  </div>
                </div>

                {/* Required Providers */}
                <div className="mb-3">
                  <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Requires</div>
                  <div className="flex flex-wrap gap-1">
                    {agent.requiredProviders.map(pId => (
                      <span key={pId} className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(157,78,221,0.08)] border border-[rgba(157,78,221,0.15)] text-[#c084fc]">
                        {getProviderName(pId)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.tags.map(tag => (
                    <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(136,136,170,0.08)] border border-[rgba(136,136,170,0.12)] text-[#8888aa]">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Price & Install */}
                <div className="flex items-center justify-between pt-2 border-t border-[rgba(157,78,221,0.08)]">
                  <div className="text-xs font-bold" style={{ color: agent.price === 0 ? '#00ff88' : '#FFB627' }}>
                    {agent.price === 0 ? 'Free' : `$${agent.price}`}
                  </div>
                  {agent.installed ? (
                    <button onClick={() => handleUninstall(agent.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] hover:bg-[rgba(230,57,70,0.12)] transition-colors">
                      <X size={9} /> Uninstall
                    </button>
                  ) : (
                    <button onClick={() => handleInstall(agent.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                      style={{ background: 'linear-gradient(135deg, #7B2CBFcc, #7B2CBF88)', color: '#fff' }}>
                      <ArrowDownToLine size={9} /> Install
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Installed Agents Section ─── */}
      {installedAgents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1.5">
              <Check size={10} className="text-[#00ff88]" /> Installed Agents ({installedAgents.length})
            </h3>
          </div>
          <div className="rounded-xl border border-[rgba(0,255,136,0.12)] bg-[rgba(18,18,42,0.4)] overflow-hidden">
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {installedAgents.map((agent, i) => {
                const catMeta = getCategoryMeta(agent.category);
                const brainMeta = BRAIN_META[agent.brainProfile] || BRAIN_META.custom;
                return (
                  <motion.div key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(157,78,221,0.06)] last:border-0 hover:bg-[rgba(18,18,42,0.4)] transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: `${agent.color}12`, border: `1px solid ${agent.color}20` }}>
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-[11px] font-medium truncate">{agent.name}</span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                          style={{ backgroundColor: `${catMeta.color}10`, color: catMeta.color, border: `1px solid ${catMeta.color}20` }}>
                          {agent.category}
                        </span>
                        <span className="text-[7px] px-1 py-0.5 rounded-full"
                          style={{ backgroundColor: `${brainMeta.color}08`, color: brainMeta.color, border: `1px solid ${brainMeta.color}20` }}>
                          {brainMeta.icon} {brainMeta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[9px] text-[#8888aa]">
                        <span>v{agent.version}</span>
                        <span className="flex items-center gap-0.5"><Star size={7} className="text-[#FFB627]" /> {agent.rating}</span>
                        <span>{formatNumber(agent.downloads)} downloads</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] font-bold" style={{ color: agent.price === 0 ? '#00ff88' : '#FFB627' }}>
                        {agent.price === 0 ? 'Free' : `$${agent.price}`}
                      </span>
                      <button onClick={() => handleUninstall(agent.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] hover:bg-[rgba(230,57,70,0.12)] transition-colors">
                        <X size={8} /> Remove
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
