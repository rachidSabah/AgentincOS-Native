'use client';

import { useOSStore, type MarketplaceAgent, type BrainProfile } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Search, Star, Download, Tag, Check, Filter,
  Bot, Zap, Shield, Package, ArrowDownToLine, Sparkles,
  Brain, Users, FileCode, Briefcase, GraduationCap, Plane,
  Scale, Stethoscope, Microscope, Palette, Globe, Wrench,
  ChevronRight, X, TrendingUp, Award,
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

/* ─── Seed Marketplace Data ─── */
const SEED_AGENTS: MarketplaceAgent[] = [
  {
    id: 'ma-1', name: 'DealFlow Pro', description: 'Automates lead scoring, pipeline tracking, and deal analysis with real-time CRM integration and predictive insights.',
    category: 'business', author: 'AgenticOS Team', version: '2.1.0', rating: 4.8, downloads: 12450, price: 0,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '💼', color: '#7B2CBF',
    tags: ['CRM', 'pipeline', 'analytics', 'scoring'],
  },
  {
    id: 'ma-2', name: 'TalentHunter AI', description: 'End-to-end recruitment agent: candidate sourcing, resume parsing, interview scheduling, and bias-aware screening.',
    category: 'recruitment', author: 'HR Labs', version: '1.5.2', rating: 4.6, downloads: 8930, price: 29.99,
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
    category: 'seo', author: 'SearchStack', version: '4.2.0', rating: 4.7, downloads: 15600, price: 49.99,
    installed: false, brainProfile: 'hermes', requiredProviders: ['openai', 'anthropic'], icon: '🔍', color: '#FFB627',
    tags: ['keywords', 'content', 'backlinks', 'audit'],
  },
  {
    id: 'ma-5', name: 'BrandPulse', description: 'Social media marketing agent with content creation, scheduling, engagement tracking, and sentiment analysis across all platforms.',
    category: 'marketing', author: 'SocialForge', version: '2.8.0', rating: 4.5, downloads: 9200, price: 19.99,
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
    category: 'aviation', author: 'AeroLogic', version: '1.2.0', rating: 4.3, downloads: 2100, price: 99.99,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['openai', 'anthropic'], icon: '✈️', color: '#38bdf8',
    tags: ['flight', 'weather', 'compliance', 'scheduling'],
  },
  {
    id: 'ma-9', name: 'LegalEase', description: 'Contract analysis, legal research, compliance auditing, and risk assessment with jurisdiction-aware reasoning and citation tracking.',
    category: 'legal', author: 'JurisAI', version: '2.4.0', rating: 4.6, downloads: 5400, price: 79.99,
    installed: false, brainProfile: 'claude', requiredProviders: ['anthropic'], icon: '⚖️', color: '#E63946',
    tags: ['contracts', 'research', 'compliance', 'risk'],
  },
  {
    id: 'ma-10', name: 'MediAssist', description: 'Clinical decision support, literature review, diagnostic assistance, and patient data analysis with HIPAA-aware data handling.',
    category: 'medical', author: 'HealthAI', version: '1.7.0', rating: 4.5, downloads: 3800, price: 149.99,
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
    category: 'business', author: 'QuantEdge', version: '2.3.0', rating: 4.7, downloads: 9800, price: 39.99,
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
    category: 'programming', author: 'InfraGuard', version: '2.0.0', rating: 4.4, downloads: 7600, price: 29.99,
    installed: false, brainProfile: 'openclaw', requiredProviders: ['anthropic'], icon: '🚀', color: '#00ff88',
    tags: ['CI/CD', 'monitoring', 'incident', 'deployment'],
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
