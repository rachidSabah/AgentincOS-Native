'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Zap, Globe, BarChart3, TrendingUp, ArrowRight,
  Layers, Brain, Target, FileText, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, CheckCircle2, Info, ExternalLink,
  Sparkles, Users, Shield, Lightbulb, Copy, Eye,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SEOLayerData {
  id: string;
  name: string;
  number: number;
  primaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  seoScore: number;
  lastAnalyzed: string | null;
}

interface KeywordResearch {
  primaryKeywords: string[];
  longTailKeywords: string[];
  lsiKeywords: string[];
  searchIntent: string;
  difficultyScore: number;
  estimatedVolume: string;
  contentGaps: string[];
  titleTag: string;
  metaDescription: string;
  h1Tag: string;
  schemaType: string;
}

interface GeneratedContent {
  headline: string;
  subheadline: string;
  introduction: string;
  keyPoints: Array<{ title: string; content: string }>;
  faqSection: Array<{ question: string; answer: string }>;
  cta: string;
  internalLinks: string[];
  agentIntegration: string;
}

interface CompetitorData {
  competitors: Array<{
    name: string;
    strength: string;
    weakness: string;
    rankingKeywords: string[];
  }>;
  opportunities: string[];
  threats: string[];
  recommendedStrategy: string;
}

interface SEOScoring {
  overallScore: number;
  titleScore: number;
  metaScore: number;
  keywordScore: number;
  contentScore: number;
  technicalScore: number;
  issues: Array<{
    severity: string;
    category: string;
    description: string;
    fix: string;
  }>;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HermesSEOSilo() {
  const { stackLayers, hermesConnection, setActiveView } = useOSStore();
  const [seoLayers, setSeoLayers] = useState<SEOLayerData[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keywords' | 'content' | 'competitors' | 'scoring'>('keywords');
  const [loading, setLoading] = useState<string | null>(null);
  const [hermesPowered, setHermesPowered] = useState(false);
  const [avgScore, setAvgScore] = useState(0);
  const [totalKeywords, setTotalKeywords] = useState(0);

  // Analysis results per layer
  const [keywordData, setKeywordData] = useState<Record<string, KeywordResearch>>({});
  const [contentData, setContentData] = useState<Record<string, GeneratedContent>>({});
  const [competitorData, setCompetitorData] = useState<Record<string, CompetitorData>>({});
  const [scoringData, setScoringData] = useState<Record<string, SEOScoring>({});
  const [searchInsights, setSearchInsights] = useState<Array<{ title: string; snippet: string; url?: string }>>([]);

  // Fetch initial SEO data
  const fetchSEOOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/hermes/seo');
      if (!res.ok) return;
      const data = await res.json();
      setSeoLayers(data.layers || []);
      setHermesPowered(data.hermesPowered);
      setAvgScore(data.avgScore || 0);
      setTotalKeywords(data.totalKeywords || 0);
      if (data.searchInsights?.length) {
        setSearchInsights(data.searchInsights);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSEOOverview(); }, [fetchSEOOverview]);

  // Run SEO analysis on a specific layer
  const runAnalysis = async (layerId: string, action: string) => {
    const layer = stackLayers.find(l => l.id === layerId);
    if (!layer) return;

    setLoading(`${layerId}-${action}`);
    try {
      const res = await fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          layerId,
          layerName: layer.name,
          layerDescription: layer.description,
          capabilities: layer.keyCapabilities,
          keywords: seoLayers.find(l => l.id === layerId)?.primaryKeywords || layer.keyCapabilities,
          agent: layer.agent,
          content: layer.description,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data.result) {
        switch (action) {
          case 'keyword-research':
            setKeywordData(prev => ({ ...prev, [layerId]: data.result as KeywordResearch }));
            break;
          case 'generate-content':
            setContentData(prev => ({ ...prev, [layerId]: data.result as GeneratedContent }));
            break;
          case 'competitor-analysis':
            setCompetitorData(prev => ({ ...prev, [layerId]: data.result as CompetitorData }));
            break;
          case 'seo-scoring':
            setScoringData(prev => ({ ...prev, [layerId]: data.result as SEOScoring }));
            break;
          case 'full-audit':
            if (data.result.keywords) setKeywordData(prev => ({ ...prev, [layerId]: data.result.keywords as KeywordResearch }));
            if (data.result.content) setContentData(prev => ({ ...prev, [layerId]: data.result.content as GeneratedContent }));
            if (data.result.competitors) setCompetitorData(prev => ({ ...prev, [layerId]: data.result.competitors as CompetitorData }));
            if (data.result.scoring) setScoringData(prev => ({ ...prev, [layerId]: data.result.scoring as SEOScoring }));
            break;
        }
      }
    } catch { /* silent */ }
    setLoading(null);
  };

  // Run full audit for all layers in parallel
  const runFullStackAudit = async () => {
    setLoading('full-stack-audit');
    const promises = stackLayers.map(layer =>
      fetch('/api/hermes/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seo-scoring',
          layerId: layer.id,
          layerName: layer.name,
          layerDescription: layer.description,
          capabilities: layer.keyCapabilities,
          keywords: seoLayers.find(l => l.id === layer.id)?.primaryKeywords || layer.keyCapabilities,
          agent: layer.agent,
          content: layer.description,
        }),
      }).then(r => r.json()).catch(() => null)
    );

    const results = await Promise.allSettled(promises);
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value?.result) {
        setScoringData(prev => ({
          ...prev,
          [stackLayers[i].id]: res.value.result as SEOScoring,
        }));
      }
    });
    setLoading(null);
  };

  const isHermesRunning = hermesConnection.running;
  const selectedLayerData = selectedLayer ? stackLayers.find(l => l.id === selectedLayer) : null;
  const selectedSeoLayer = selectedLayer ? seoLayers.find(l => l.id === selectedLayer) : null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00ff88';
    if (score >= 60) return '#FFB627';
    if (score >= 40) return '#E8751A';
    return '#ff4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <section aria-label="Hermes-Powered SEO Content Silo" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Search size={16} className="text-[#FFB627]" /> Hermes SEO Silo
          {hermesPowered && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-[#00ff8830] text-[#00ff88] bg-[#00ff8808] font-mono animate-pulse">
              AI-POWERED
            </span>
          )}
        </h2>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] text-[#8888aa]">
          <button onClick={() => setActiveView('mission-control')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <span className="text-[#FFB627]">SEO Silo</span>
        </nav>
      </div>

      {/* Hermes Connection Status + SEO Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center col-span-1">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className={`w-2 h-2 rounded-full ${isHermesRunning ? 'animate-pulse-glow' : ''}`}
              style={{ backgroundColor: isHermesRunning ? '#00ff88' : '#ff4444' }} />
            <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Hermes</span>
          </div>
          <div className="font-mono font-bold text-sm" style={{ color: isHermesRunning ? '#00ff88' : '#ff4444' }}>
            {isHermesRunning ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="text-[7px] text-[#8888aa] mt-0.5">{isHermesRunning ? 'AI SEO Active' : 'Static Mode'}</div>
        </div>

        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Avg SEO Score</div>
          <div className="font-mono font-bold text-lg" style={{ color: getScoreColor(avgScore) }}>{avgScore}</div>
          <div className="text-[7px] text-[#8888aa]">{getScoreLabel(avgScore)}</div>
        </div>

        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Total Keywords</div>
          <div className="font-mono font-bold text-lg text-[#7B2CBF]">{totalKeywords}</div>
          <div className="text-[7px] text-[#8888aa]">across 7 layers</div>
        </div>

        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Layers Analyzed</div>
          <div className="font-mono font-bold text-lg text-[#1B998B]">
            {Object.keys(scoringData).length}/7
          </div>
          <div className="text-[7px] text-[#8888aa]">audited</div>
        </div>

        <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-3 text-center">
          <button
            onClick={runFullStackAudit}
            disabled={loading === 'full-stack-audit'}
            className="w-full h-full flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          >
            {loading === 'full-stack-audit' ? (
              <RefreshCw size={16} className="animate-spin text-[#FFB627]" />
            ) : (
              <Zap size={16} className="text-[#FFB627]" />
            )}
            <span className="text-[9px] font-medium text-[#FFB627]">
              {loading === 'full-stack-audit' ? 'Auditing...' : 'Full Stack Audit'}
            </span>
          </button>
        </div>
      </div>

      {/* Layer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {seoLayers.map((seoLayer, i) => {
          const layer = stackLayers.find(l => l.id === seoLayer.id);
          if (!layer) return null;

          const isSelected = selectedLayer === seoLayer.id;
          const score = scoringData[seoLayer.id]?.overallScore ?? seoLayer.seoScore;
          const hasKeywordData = !!keywordData[seoLayer.id];
          const hasContentData = !!contentData[seoLayer.id];
          const hasCompetitorData = !!competitorData[seoLayer.id];

          return (
            <motion.div
              key={seoLayer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl border overflow-hidden cursor-pointer group transition-all ${
                isSelected ? 'ring-1 ring-[#FFB62750]' : ''
              }`}
              style={{
                borderColor: isSelected ? `${layer.color}50` : `${layer.color}20`,
                background: `linear-gradient(135deg, ${layer.color}${isSelected ? '0c' : '06'}, ${layer.color}02)`,
              }}
              onClick={() => setSelectedLayer(isSelected ? null : seoLayer.id)}
            >
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${layer.color}, transparent)` }} />
              <div className="p-3">
                <div className="flex items-start gap-2.5">
                  {/* Score Ring */}
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke={`${layer.color}15`} strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none"
                        stroke={getScoreColor(score)} strokeWidth="3"
                        strokeDasharray={`${score} ${100 - score}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-mono font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
                    </div>
                  </div>

                  {/* Layer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="text-white font-semibold text-xs">L{layer.number}: {layer.name}</h3>
                    </div>
                    <p className="text-[#aaaacc] text-[10px] leading-relaxed line-clamp-1 mb-1.5">{seoLayer.metaDescription}</p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {seoLayer.primaryKeywords.slice(0, 3).map(kw => (
                        <span key={kw} className="text-[7px] px-1 py-0.5 rounded-full border font-medium"
                          style={{ borderColor: `${layer.color}25`, color: `${layer.color}cc`, background: `${layer.color}08` }}>
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* Analysis Status Indicators */}
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-0.5 ${hasKeywordData ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                        <Search size={8} />
                        <span className="text-[7px] font-mono">KW</span>
                      </div>
                      <div className={`flex items-center gap-0.5 ${hasContentData ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                        <FileText size={8} />
                        <span className="text-[7px] font-mono">CTR</span>
                      </div>
                      <div className={`flex items-center gap-0.5 ${hasCompetitorData ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                        <Users size={8} />
                        <span className="text-[7px] font-mono">CMP</span>
                      </div>
                      <div className={`flex items-center gap-0.5 ${scoringData[seoLayer.id] ? 'text-[#00ff88]' : 'text-[#8888aa]'}`}>
                        <BarChart3 size={8} />
                        <span className="text-[7px] font-mono">SCR</span>
                      </div>
                    </div>
                  </div>

                  {isSelected ? <ChevronUp size={12} className="text-[#8888aa]" /> : <ChevronDown size={12} className="text-[#8888aa]" />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded Layer Analysis Panel */}
      <AnimatePresence>
        {selectedLayer && selectedLayerData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden"
              style={{ borderColor: `${selectedLayerData.color}25` }}>
              
              {/* Panel Header */}
              <div className="p-4 border-b" style={{ borderColor: `${selectedLayerData.color}15` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${selectedLayerData.color}15`, border: `1px solid ${selectedLayerData.color}25` }}>
                      <Layers size={14} style={{ color: selectedLayerData.color }} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Layer {selectedLayerData.number}: {selectedLayerData.name}</h3>
                      <p className="text-[#aaaacc] text-[10px]">Hermes SEO Analysis — {isHermesRunning ? 'AI-Powered' : 'Static Mode'}</p>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => runAnalysis(selectedLayer, 'keyword-research')}
                      disabled={loading === `${selectedLayer}-keyword-research`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30 hover:bg-[rgba(157,78,221,0.1)]"
                      style={{ borderColor: '#7B2CBF35', color: '#7B2CBF' }}>
                      <Search size={10} />
                      {loading === `${selectedLayer}-keyword-research` ? '...' : 'Keywords'}
                    </button>
                    <button onClick={() => runAnalysis(selectedLayer, 'generate-content')}
                      disabled={loading === `${selectedLayer}-generate-content`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30 hover:bg-[rgba(157,78,221,0.1)]"
                      style={{ borderColor: '#1B998B35', color: '#1B998B' }}>
                      <FileText size={10} />
                      {loading === `${selectedLayer}-generate-content` ? '...' : 'Content'}
                    </button>
                    <button onClick={() => runAnalysis(selectedLayer, 'competitor-analysis')}
                      disabled={loading === `${selectedLayer}-competitor-analysis`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30 hover:bg-[rgba(157,78,221,0.1)]"
                      style={{ borderColor: '#E8751A35', color: '#E8751A' }}>
                      <Users size={10} />
                      {loading === `${selectedLayer}-competitor-analysis` ? '...' : 'Compete'}
                    </button>
                    <button onClick={() => runAnalysis(selectedLayer, 'seo-scoring')}
                      disabled={loading === `${selectedLayer}-seo-scoring`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[9px] font-medium transition-all disabled:opacity-30 hover:bg-[rgba(157,78,221,0.1)]"
                      style={{ borderColor: '#FFB62735', color: '#FFB627' }}>
                      <BarChart3 size={10} />
                      {loading === `${selectedLayer}-seo-scoring` ? '...' : 'Score'}
                    </button>
                    <button onClick={() => runAnalysis(selectedLayer, 'full-audit')}
                      disabled={loading === `${selectedLayer}-full-audit`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all disabled:opacity-30"
                      style={{ background: `${selectedLayerData.color}15`, border: `1px solid ${selectedLayerData.color}30`, color: selectedLayerData.color }}>
                      <Zap size={10} />
                      {loading === `${selectedLayer}-full-audit` ? 'Running...' : 'Full Audit'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 px-4 pt-3">
                {[
                  { id: 'keywords' as const, label: 'Keywords', icon: Search, color: '#7B2CBF' },
                  { id: 'content' as const, label: 'Content', icon: FileText, color: '#1B998B' },
                  { id: 'competitors' as const, label: 'Competitors', icon: Users, color: '#E8751A' },
                  { id: 'scoring' as const, label: 'Scoring', icon: BarChart3, color: '#FFB627' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id ? 'text-white' : 'text-[#8888aa] hover:text-white'
                    }`}
                    style={activeTab === tab.id ? { background: `${tab.color}15`, border: `1px solid ${tab.color}30` } : { border: '1px solid transparent' }}
                  >
                    <tab.icon size={12} style={{ color: activeTab === tab.id ? tab.color : '#8888aa' }} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-4">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {activeTab === 'keywords' && (
                    <KeywordsTab
                      data={keywordData[selectedLayer]}
                      layerId={selectedLayer}
                      layerColor={selectedLayerData.color}
                      defaultKeywords={selectedSeoLayer?.primaryKeywords || []}
                    />
                  )}
                  {activeTab === 'content' && (
                    <ContentTab
                      data={contentData[selectedLayer]}
                      layerId={selectedLayer}
                      layerColor={selectedLayerData.color}
                    />
                  )}
                  {activeTab === 'competitors' && (
                    <CompetitorsTab
                      data={competitorData[selectedLayer]}
                      layerId={selectedLayer}
                      layerColor={selectedLayerData.color}
                    />
                  )}
                  {activeTab === 'scoring' && (
                    <ScoringTab
                      data={scoringData[selectedLayer]}
                      layerId={selectedLayer}
                      layerColor={selectedLayerData.color}
                      defaultScore={selectedSeoLayer?.seoScore || 0}
                    />
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Insights (when Hermes is running) */}
      {searchInsights.length > 0 && (
        <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-[#1B998B]" />
            <h3 className="text-[#8888aa] text-xs font-mono uppercase tracking-wider">Hermes Web Search Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {searchInsights.map((insight, i) => (
              <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.3)] p-2.5">
                <div className="text-[10px] font-medium text-white mb-1 line-clamp-1">{insight.title}</div>
                <div className="text-[9px] text-[#8888aa] line-clamp-2">{insight.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture Overview (original SEO silo stats) */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[#FFB627]" />
          <h3 className="text-[#8888aa] text-xs font-mono uppercase tracking-wider">7-Layer SEO Architecture Map</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Total Layers</div>
            <div className="text-white font-mono text-lg font-bold">7</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Avg Score</div>
            <div className="font-mono text-lg font-bold" style={{ color: getScoreColor(avgScore) }}>{avgScore}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Total Keywords</div>
            <div className="text-[#7B2CBF] font-mono text-lg font-bold">{totalKeywords}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8888aa] uppercase tracking-wider">Hermes SEO</div>
            <div className="font-mono text-lg font-bold" style={{ color: isHermesRunning ? '#00ff88' : '#ff4444' }}>
              {isHermesRunning ? 'ACTIVE' : 'STATIC'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Keywords Tab
// ---------------------------------------------------------------------------

function KeywordsTab({ data, layerId, layerColor, defaultKeywords }: {
  data?: KeywordResearch;
  layerId: string;
  layerColor: string;
  defaultKeywords: string[];
}) {
  if (!data) {
    return (
      <div className="space-y-3">
        <div className="text-[10px] text-[#8888aa] text-center py-6">
          No keyword research yet. Click <strong className="text-[#7B2CBF]">Keywords</strong> or <strong className="text-[#FFB627]">Full Audit</strong> to analyze.
        </div>
        <div className="space-y-1.5">
          <span className="text-[9px] text-[#8888aa] uppercase tracking-wider">Default Keywords</span>
          <div className="flex flex-wrap gap-1">
            {defaultKeywords.map(kw => (
              <span key={kw} className="text-[8px] px-1.5 py-0.5 rounded-full border"
                style={{ borderColor: `${layerColor}25`, color: `${layerColor}cc`, background: `${layerColor}08` }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Keywords */}
      <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={10} style={{ color: layerColor }} />
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Primary Keywords</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.primaryKeywords.map(kw => (
            <span key={kw} className="text-[9px] px-2 py-1 rounded-lg border font-medium"
              style={{ borderColor: `${layerColor}30`, color: layerColor, background: `${layerColor}10` }}>
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Long-tail + LSI in grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
            <TrendingUp size={10} /> Long-Tail Keywords
          </span>
          <div className="space-y-1">
            {data.longTailKeywords.map(kw => (
              <div key={kw} className="text-[9px] text-[#ccccdd] flex items-center gap-1.5 py-0.5">
                <ArrowRight size={8} className="text-[#7B2CBF]" />
                {kw}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
            <Brain size={10} /> LSI / Semantic Keywords
          </span>
          <div className="flex flex-wrap gap-1">
            {data.lsiKeywords.map(kw => (
              <span key={kw} className="text-[8px] px-1.5 py-0.5 rounded-full border border-[rgba(157,78,221,0.15)] text-[#aaaacc]">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Intent</div>
          <div className="font-mono font-bold text-xs text-[#FFB627] capitalize">{data.searchIntent}</div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Difficulty</div>
          <div className="font-mono font-bold text-xs" style={{ color: data.difficultyScore > 60 ? '#ff4444' : data.difficultyScore > 30 ? '#FFB627' : '#00ff88' }}>
            {data.difficultyScore}/100
          </div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3 text-center">
          <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Volume</div>
          <div className="font-mono font-bold text-xs text-[#1B998B] capitalize">{data.estimatedVolume}</div>
        </div>
      </div>

      {/* SEO Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Title Tag</span>
          <div className="text-[10px] text-white font-mono">{data.titleTag}</div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Meta Description</span>
          <div className="text-[10px] text-[#ccccdd]">{data.metaDescription}</div>
        </div>
      </div>

      {/* Content Gaps */}
      {data.contentGaps.length > 0 && (
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
            <Lightbulb size={10} className="text-[#FFB627]" /> Content Gaps to Fill
          </span>
          <div className="space-y-1">
            {data.contentGaps.map((gap, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <div className="w-1 h-1 rounded-full bg-[#FFB627]" />
                <span className="text-[#ccccdd]">{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Tab
// ---------------------------------------------------------------------------

function ContentTab({ data, layerId, layerColor }: {
  data?: GeneratedContent;
  layerId: string;
  layerColor: string;
}) {
  const [showPreview, setShowPreview] = useState(false);

  if (!data) {
    return (
      <div className="text-[10px] text-[#8888aa] text-center py-6">
        No content generated yet. Click <strong className="text-[#1B998B]">Content</strong> or <strong className="text-[#FFB627]">Full Audit</strong> to generate.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline & Subheadline */}
      <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1">
            <FileText size={10} style={{ color: layerColor }} /> Generated Content
          </span>
          <button onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 text-[9px] text-[#8888aa] hover:text-white transition-colors">
            <Eye size={10} /> {showPreview ? 'Structure' : 'Preview'}
          </button>
        </div>
        <h3 className="text-white font-bold text-sm mb-0.5">{data.headline}</h3>
        <p className="text-[#aaaacc] text-[11px]">{data.subheadline}</p>
      </div>

      {/* Introduction */}
      <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <span className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Introduction</span>
        <p className="text-[10px] text-[#ccccdd] leading-relaxed">{data.introduction}</p>
      </div>

      {/* Key Points */}
      <div className="space-y-2">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Key Points</span>
        {data.keyPoints.map((point, i) => (
          <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <h4 className="text-white font-medium text-[11px] mb-1">{point.title}</h4>
            <p className="text-[10px] text-[#aaaacc] leading-relaxed">{point.content}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      {data.faqSection.length > 0 && (
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
            <Shield size={10} className="text-[#7B2CBF]" /> FAQ Section (Schema-Ready)
          </span>
          <div className="space-y-2">
            {data.faqSection.map((faq, i) => (
              <div key={i} className="border-l-2 pl-3" style={{ borderColor: `${layerColor}40` }}>
                <div className="text-[10px] text-white font-medium mb-0.5">Q: {faq.question}</div>
                <div className="text-[9px] text-[#aaaacc]">A: {faq.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA + Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Call to Action</span>
          <div className="text-[10px] text-[#FFB627] font-medium">{data.cta}</div>
        </div>
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[9px] text-[#8888aa] uppercase tracking-wider mb-1 block">Internal Links</span>
          <div className="space-y-0.5">
            {data.internalLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-1 text-[9px] text-[#1B998B]">
                <ExternalLink size={8} /> {link}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Competitors Tab
// ---------------------------------------------------------------------------

function CompetitorsTab({ data, layerId, layerColor }: {
  data?: CompetitorData;
  layerId: string;
  layerColor: string;
}) {
  if (!data) {
    return (
      <div className="text-[10px] text-[#8888aa] text-center py-6">
        No competitor analysis yet. Click <strong className="text-[#E8751A]">Compete</strong> or <strong className="text-[#FFB627]">Full Audit</strong> to analyze.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Competitor Cards */}
      <div className="space-y-2">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1">
          <Users size={10} className="text-[#E8751A]" /> Competitor Landscape
        </span>
        {data.competitors.map((comp, i) => (
          <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium text-[11px]">{comp.name}</h4>
              <div className="flex gap-1">
                {comp.rankingKeywords.map(kw => (
                  <span key={kw} className="text-[7px] px-1 py-0.5 rounded-full border border-[#E8751A25] text-[#E8751A]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[8px] text-[#00ff88] uppercase tracking-wider">Strength</span>
                <div className="text-[9px] text-[#ccccdd]">{comp.strength}</div>
              </div>
              <div>
                <span className="text-[8px] text-[#ff4444] uppercase tracking-wider">Weakness</span>
                <div className="text-[9px] text-[#ccccdd]">{comp.weakness}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Opportunities */}
      <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
          <TrendingUp size={10} className="text-[#00ff88]" /> Opportunities
        </span>
        <div className="space-y-1.5">
          {data.opportunities.map((opp, i) => (
            <div key={i} className="flex items-start gap-2 text-[9px]">
              <CheckCircle2 size={10} className="text-[#00ff88] flex-shrink-0 mt-0.5" />
              <span className="text-[#ccccdd]">{opp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Threats */}
      <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
          <AlertTriangle size={10} className="text-[#ff4444]" /> Threats
        </span>
        <div className="space-y-1.5">
          {data.threats.map((threat, i) => (
            <div key={i} className="flex items-start gap-2 text-[9px]">
              <AlertTriangle size={10} className="text-[#ff4444] flex-shrink-0 mt-0.5" />
              <span className="text-[#ccccdd]">{threat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy */}
      <div className="rounded-lg border p-3" style={{ borderColor: `${layerColor}20`, background: `${layerColor}06` }}>
        <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
          <Lightbulb size={10} style={{ color: layerColor }} /> Recommended Strategy
        </span>
        <p className="text-[10px] text-[#ccccdd] leading-relaxed">{data.recommendedStrategy}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scoring Tab
// ---------------------------------------------------------------------------

function ScoringTab({ data, layerId, layerColor, defaultScore }: {
  data?: SEOScoring;
  layerId: string;
  layerColor: string;
  defaultScore: number;
}) {
  const score = data?.overallScore ?? defaultScore;

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#00ff88';
    if (s >= 60) return '#FFB627';
    if (s >= 40) return '#E8751A';
    return '#ff4444';
  };

  if (!data) {
    return (
      <div className="text-[10px] text-[#8888aa] text-center py-6">
        No SEO scoring yet. Click <strong className="text-[#FFB627]">Score</strong> or <strong className="text-[#FFB627]">Full Audit</strong> to analyze.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4 p-4 rounded-lg border" style={{ borderColor: `${layerColor}20`, background: `${layerColor}06` }}>
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={`${layerColor}15`} strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none"
              stroke={getScoreColor(score)} strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-mono font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
          </div>
        </div>
        <div>
          <div className="text-white font-semibold text-sm">Overall SEO Score</div>
          <div className="text-[10px] text-[#aaaacc]">{getScoreColor(score) === '#00ff88' ? 'Excellent' : getScoreColor(score) === '#FFB627' ? 'Good' : getScoreColor(score) === '#E8751A' ? 'Needs Work' : 'Poor'} — {data.issues.length} issues found</div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Title', score: data.titleScore, color: '#7B2CBF' },
          { label: 'Meta', score: data.metaScore, color: '#E63946' },
          { label: 'Keywords', score: data.keywordScore, color: '#1B998B' },
          { label: 'Content', score: data.contentScore, color: '#2E86AB' },
          { label: 'Technical', score: data.technicalScore, color: '#E8751A' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-2 text-center">
            <div className="text-[7px] text-[#8888aa] uppercase tracking-wider mb-0.5">{s.label}</div>
            <div className="font-mono font-bold text-xs" style={{ color: getScoreColor(s.score) }}>{s.score}</div>
            <div className="w-full h-1 bg-[rgba(10,10,26,0.8)] rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Issues */}
      {data.issues.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider">Issues Found</span>
          {data.issues.map((issue, i) => {
            const SeverityIcon = issue.severity === 'critical' ? AlertTriangle : issue.severity === 'warning' ? Info : CheckCircle2;
            const severityColor = issue.severity === 'critical' ? '#ff4444' : issue.severity === 'warning' ? '#FFB627' : '#00ff88';
            return (
              <div key={i} className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-2.5">
                <div className="flex items-start gap-2">
                  <SeverityIcon size={12} className="flex-shrink-0 mt-0.5" style={{ color: severityColor }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-medium text-white">{issue.description}</span>
                      <span className="text-[7px] px-1 py-0.5 rounded-full border font-mono uppercase"
                        style={{ borderColor: `${severityColor}30`, color: severityColor }}>
                        {issue.severity}
                      </span>
                      <span className="text-[7px] px-1 py-0.5 rounded-full border border-[rgba(157,78,221,0.15)] text-[#8888aa] font-mono uppercase">
                        {issue.category}
                      </span>
                    </div>
                    <div className="text-[8px] text-[#1B998B]">Fix: {issue.fix}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="rounded-lg border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.4)] p-3">
          <span className="text-[10px] text-[#8888aa] uppercase tracking-wider flex items-center gap-1 mb-2">
            <Lightbulb size={10} className="text-[#FFB627]" /> Recommendations
          </span>
          <div className="space-y-1.5">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-[9px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFB627] flex-shrink-0 mt-1" />
                <span className="text-[#ccccdd]">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
