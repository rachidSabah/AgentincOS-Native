'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Database, Layers, Zap, Brain, FileText, BarChart3,
  Cpu, Eye, ChevronRight, RefreshCw, Check, AlertCircle,
  ArrowRight, Sparkles, Clock, Hash, Tag, Play, Settings,
  Activity, TrendingUp, Target, Filter, Code, Box, Link2,
  Server, Gauge, PieChart, Split, Combine, CircleDot,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

/* ─── Types ─── */
interface Document {
  id: string;
  name: string;
  chunks: number;
  embeddedChunks: number;
  status: 'complete' | 'partial' | 'pending';
  size: string;
  lastUpdated: string;
  type: string;
}

interface ChunkData {
  id: string;
  docId: string;
  docName: string;
  content: string;
  tokens: number;
  metadata: Record<string, string>;
  embeddingStatus: 'embedded' | 'pending';
}

interface RetrievalResult {
  id: string;
  content: string;
  score: number;
  source: string;
  chunkIndex: number;
}

/* ─── Pipeline Steps ─── */
const PIPELINE_STEPS = [
  { id: 'query', label: 'Query', icon: Search, color: '#00ffff', description: 'User input processing' },
  { id: 'embed', label: 'Embed', icon: Cpu, color: '#9d4edd', description: 'Vector embedding generation' },
  { id: 'retrieve', label: 'Retrieve', icon: Database, color: '#00ff88', description: 'Semantic search & retrieval' },
  { id: 'rank', label: 'Rank', icon: BarChart3, color: '#FFB627', description: 'Cross-encoder reranking' },
  { id: 'generate', label: 'Generate', icon: Sparkles, color: '#E8751A', description: 'LLM context assembly' },
  { id: 'respond', label: 'Response', icon: Eye, color: '#E63946', description: 'Final answer delivery' },
];

/* ─── Mock Data ─── */
const DOCUMENTS: Document[] = [
  { id: 'doc1', name: 'API Reference v3.2', chunks: 342, embeddedChunks: 342, status: 'complete', size: '4.2 MB', lastUpdated: '1h ago', type: 'markdown' },
  { id: 'doc2', name: 'Architecture Decision Records', chunks: 128, embeddedChunks: 128, status: 'complete', size: '1.8 MB', lastUpdated: '3h ago', type: 'markdown' },
  { id: 'doc3', name: 'Hermes Skill Registry', chunks: 891, embeddedChunks: 780, status: 'partial', size: '12.4 MB', lastUpdated: '5m ago', type: 'json' },
  { id: 'doc4', name: 'Security Policies', chunks: 67, embeddedChunks: 67, status: 'complete', size: '0.9 MB', lastUpdated: '1d ago', type: 'yaml' },
  { id: 'doc5', name: 'Customer Support Transcripts', chunks: 2456, embeddedChunks: 2100, status: 'partial', size: '34.1 MB', lastUpdated: '2h ago', type: 'text' },
  { id: 'doc6', name: 'Product Roadmap Q3', chunks: 45, embeddedChunks: 0, status: 'pending', size: '0.6 MB', lastUpdated: 'Just now', type: 'pdf' },
];

const MOCK_CHUNKS: ChunkData[] = [
  { id: 'ch1', docId: 'doc1', docName: 'API Reference v3.2', content: 'The /api/v3/agents endpoint returns a paginated list of all registered agents. Supports filtering by status, layer, and capability. Rate limited to 100 req/min.', tokens: 42, metadata: { section: 'Agents API', page: '12', version: '3.2' }, embeddingStatus: 'embedded' },
  { id: 'ch2', docId: 'doc1', docName: 'API Reference v3.2', content: 'Authentication requires a valid JWT token in the Authorization header. Tokens expire after 24 hours and can be refreshed via /auth/refresh endpoint.', tokens: 31, metadata: { section: 'Authentication', page: '3', version: '3.2' }, embeddingStatus: 'embedded' },
  { id: 'ch3', docId: 'doc2', docName: 'Architecture Decision Records', content: 'ADR-007: We chose hybrid search (dense + sparse) over pure semantic search because factual queries require exact keyword matching while conceptual queries benefit from semantic similarity.', tokens: 38, metadata: { section: 'ADR-007', decision: 'approved', date: '2024-01' }, embeddingStatus: 'embedded' },
  { id: 'ch4', docId: 'doc3', docName: 'Hermes Skill Registry', content: 'skill.browser_automate: Automates web browser interactions using Browserbase cloud or local Chromium. Supports form filling, screenshot capture, and multi-step navigation sequences.', tokens: 35, metadata: { category: 'automation', mcp: 'true', version: '2.1' }, embeddingStatus: 'pending' },
];

const EMBEDDING_MODELS = [
  { id: 'text-embedding-3-large', name: 'text-embedding-3-large', provider: 'OpenAI', dims: 3072, cost: '$0.13/1M' },
  { id: 'text-embedding-3-small', name: 'text-embedding-3-small', provider: 'OpenAI', dims: 1536, cost: '$0.02/1M' },
  { id: 'cohere-embed-v3', name: 'cohere-embed-v3', provider: 'Cohere', dims: 1024, cost: '$0.10/1M' },
  { id: 'voyage-large-2', name: 'voyage-large-2', provider: 'Voyage', dims: 1536, cost: '$0.12/1M' },
];

/* ═══════════════════════════════════════════════════════════
   PIPELINE FLOW ANIMATION
   ═══════════════════════════════════════════════════════════ */
function PipelineFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % PIPELINE_STEPS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <ArrowRight size={12} className="text-[#00ffff]" /> RAG Pipeline
          </h3>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1 text-[9px] text-[#8888aa] hover:text-white transition-colors"
          >
            <Play size={9} /> {isRunning ? 'Running' : 'Paused'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-1">
          {PIPELINE_STEPS.map((step, i) => {
            const IconComp = step.icon;
            const isActive = i === activeStep;
            const isPast = i < activeStep;
            return (
              <div key={step.id} className="flex items-center gap-1 flex-1">
                <motion.div
                  className="flex flex-col items-center gap-1.5 cursor-pointer relative group"
                  onClick={() => setActiveStep(i)}
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={isActive ? { duration: 1, repeat: Infinity } : {}}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all"
                    style={{
                      background: isActive ? `${step.color}15` : isPast ? `${step.color}08` : 'rgba(10,10,26,0.4)',
                      borderColor: isActive ? `${step.color}50` : isPast ? `${step.color}25` : 'rgba(157,78,221,0.1)',
                      boxShadow: isActive ? `0 0 20px ${step.color}25` : 'none',
                    }}
                  >
                    <IconComp size={16} style={{ color: isActive || isPast ? step.color : '#8888aa' }} />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wider"
                    style={{ color: isActive || isPast ? step.color : '#8888aa' }}>
                    {step.label}
                  </span>

                  {/* Active pulse ring */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border"
                      style={{ borderColor: `${step.color}30` }}
                      animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    <div className="bg-[#1a1a3e] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-1 text-[9px] text-white shadow-lg">{step.description}</div>
                  </div>
                </motion.div>

                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center flex-1 px-0.5 relative">
                    <div className="w-full h-px"
                      style={{ backgroundColor: isPast ? `${PIPELINE_STEPS[i].color}30` : 'rgba(157,78,221,0.08)' }} />
                    {(isActive || isPast) && (
                      <motion.div
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: step.color,
                          boxShadow: `0 0 8px ${step.color}60`,
                        }}
                        animate={{ left: ['0%', '100%'] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active step detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="mt-4 p-3 rounded-lg border"
            style={{
              borderColor: `${PIPELINE_STEPS[activeStep].color}20`,
              background: `${PIPELINE_STEPS[activeStep].color}05`,
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIPELINE_STEPS[activeStep].color, boxShadow: `0 0 8px ${PIPELINE_STEPS[activeStep].color}60` }} />
              <span className="text-[10px] font-medium" style={{ color: PIPELINE_STEPS[activeStep].color }}>
                {PIPELINE_STEPS[activeStep].label} Stage
              </span>
              <span className="text-[9px] text-[#8888aa]">— {PIPELINE_STEPS[activeStep].description}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[9px] text-[#8888aa]">
              <span className="flex items-center gap-1"><Clock size={7} /> {42 + activeStep * 18}ms avg</span>
              <span className="flex items-center gap-1"><Activity size={7} /> {99.2 - activeStep * 0.3}% success</span>
              <span className="flex items-center gap-1"><Zap size={7} /> {120 + activeStep * 45} tokens/chunk</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DOCUMENT STORE
   ═══════════════════════════════════════════════════════════ */
function DocumentStore() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>('doc1');

  const totalChunks = DOCUMENTS.reduce((sum, d) => sum + d.chunks, 0);
  const totalEmbedded = DOCUMENTS.reduce((sum, d) => sum + d.embeddedChunks, 0);
  const embedProgress = Math.round((totalEmbedded / totalChunks) * 100);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Database size={12} className="text-[#00ffff]" /> Document Store
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#8888aa] font-mono">{DOCUMENTS.length} docs</span>
            <span className="text-[9px] text-[#00ff88] font-mono">{embedProgress}% embedded</span>
          </div>
        </div>
      </div>

      <div className="p-3 max-h-72 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          {DOCUMENTS.map((doc, i) => {
            const isSelected = selectedDoc === doc.id;
            const docProgress = doc.chunks > 0 ? Math.round((doc.embeddedChunks / doc.chunks) * 100) : 0;
            const statusColor = doc.status === 'complete' ? '#00ff88' : doc.status === 'partial' ? '#FFB627' : '#8888aa';

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-lg border p-2.5 cursor-pointer transition-all hover:border-[rgba(0,255,255,0.2)]"
                style={{
                  borderColor: isSelected ? 'rgba(0,255,255,0.25)' : 'rgba(157,78,221,0.06)',
                  background: isSelected ? 'rgba(0,255,255,0.04)' : 'rgba(10,10,26,0.2)',
                }}
                onClick={() => setSelectedDoc(isSelected ? null : doc.id)}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.5)]">
                    <FileText size={12} style={{ color: statusColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-white font-medium truncate">{doc.name}</span>
                      <span className="text-[7px] px-1 py-0.5 rounded border font-bold uppercase"
                        style={{ borderColor: `${statusColor}25`, color: statusColor, background: `${statusColor}08` }}>
                        {doc.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px] text-[#8888aa] mt-0.5">
                      <span>{doc.size}</span>
                      <span>·</span>
                      <span>{doc.chunks} chunks</span>
                      <span>·</span>
                      <span>{doc.lastUpdated}</span>
                    </div>
                  </div>
                </div>

                {/* Embedding progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${statusColor}88, ${statusColor})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${docProgress}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  </div>
                  <span className="text-[8px] font-mono" style={{ color: statusColor }}>{docProgress}%</span>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 pt-2 border-t border-[rgba(157,78,221,0.08)] grid grid-cols-3 gap-2">
                        <div className="text-center p-1.5 rounded-md bg-[rgba(10,10,26,0.4)]">
                          <div className="text-[7px] text-[#8888aa] uppercase">Chunks</div>
                          <div className="text-[10px] text-white font-mono font-bold">{doc.chunks}</div>
                        </div>
                        <div className="text-center p-1.5 rounded-md bg-[rgba(10,10,26,0.4)]">
                          <div className="text-[7px] text-[#8888aa] uppercase">Embedded</div>
                          <div className="text-[10px] font-mono font-bold" style={{ color: statusColor }}>{doc.embeddedChunks}</div>
                        </div>
                        <div className="text-center p-1.5 rounded-md bg-[rgba(10,10,26,0.4)]">
                          <div className="text-[7px] text-[#8888aa] uppercase">Type</div>
                          <div className="text-[10px] text-white font-mono font-bold">{doc.type}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHUNK INSPECTOR
   ═══════════════════════════════════════════════════════════ */
function ChunkInspector() {
  const [selectedChunk, setSelectedChunk] = useState<string | null>('ch1');

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Split size={12} className="text-[#00ffff]" /> Chunk Inspector
          </h3>
          <span className="text-[9px] text-[#8888aa] font-mono">{MOCK_CHUNKS.length} chunks</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-[rgba(157,78,221,0.08)]">
        {/* Chunk list */}
        <div className="p-3 max-h-64 overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            {MOCK_CHUNKS.map((chunk, i) => {
              const isSelected = selectedChunk === chunk.id;
              return (
                <motion.div
                  key={chunk.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border p-2 cursor-pointer transition-all"
                  style={{
                    borderColor: isSelected ? 'rgba(0,255,255,0.2)' : 'rgba(157,78,221,0.06)',
                    background: isSelected ? 'rgba(0,255,255,0.04)' : 'rgba(10,10,26,0.2)',
                  }}
                  onClick={() => setSelectedChunk(chunk.id)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash size={8} className="text-[#8888aa]" />
                    <span className="text-[9px] text-white font-mono truncate flex-1">{chunk.id}</span>
                    <span className="text-[7px] px-1 py-0.5 rounded border font-bold uppercase"
                      style={{
                        borderColor: chunk.embeddingStatus === 'embedded' ? 'rgba(0,255,136,0.2)' : 'rgba(255,182,39,0.2)',
                        color: chunk.embeddingStatus === 'embedded' ? '#00ff88' : '#FFB627',
                        background: chunk.embeddingStatus === 'embedded' ? 'rgba(0,255,136,0.06)' : 'rgba(255,182,39,0.06)',
                      }}>
                      {chunk.embeddingStatus}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#8888aa] line-clamp-2 leading-relaxed">{chunk.content}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Chunk detail */}
        <div className="p-3">
          {selectedChunk && (() => {
            const chunk = MOCK_CHUNKS.find(c => c.id === selectedChunk);
            if (!chunk) return null;
            return (
              <div className="space-y-3">
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Source</div>
                  <div className="text-[10px] text-white font-medium flex items-center gap-1">
                    <FileText size={9} className="text-[#00ffff]" /> {chunk.docName}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Content</div>
                  <div className="p-2.5 rounded-lg border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] text-[9px] text-[#ccccdd] leading-relaxed font-mono">
                    {chunk.content}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">Tokens</div>
                    <div className="text-[11px] text-white font-mono font-bold">{chunk.tokens}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-0.5">Status</div>
                    <div className="text-[11px] font-mono font-bold" style={{ color: chunk.embeddingStatus === 'embedded' ? '#00ff88' : '#FFB627' }}>
                      {chunk.embeddingStatus}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-[#8888aa] uppercase tracking-wider mb-1">Metadata</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(chunk.metadata).map(([key, value]) => (
                      <span key={key} className="text-[7px] px-1.5 py-0.5 rounded border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.04)] text-[#00ffff] font-mono">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RETRIEVAL TESTING
   ═══════════════════════════════════════════════════════════ */
function RetrievalTesting() {
  const [query, setQuery] = useState('How does the agent routing protocol work?');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);

  const mockResults: RetrievalResult[] = [
    { id: 'r1', content: 'OpenClaw gateway protocol v2.1 — all agent routing must go through OpenClaw. No direct agent-to-agent communication. Supports round-robin, least-connections, and capability-based routing.', score: 0.94, source: 'API Reference v3.2', chunkIndex: 47 },
    { id: 'r2', content: 'The routing table is refreshed every 30 seconds. Agents report their capabilities and load metrics. OpenClaw uses weighted scoring to determine optimal agent for each task.', score: 0.87, source: 'Architecture Decision Records', chunkIndex: 12 },
    { id: 'r3', content: 'Session management: Each user session maintains a consistent agent mapping. If an agent goes offline, OpenClaw triggers a handoff protocol with full context transfer.', score: 0.81, source: 'API Reference v3.2', chunkIndex: 89 },
    { id: 'r4', content: 'The delegation workflow pattern allows agents to request assistance from other agents through the message bus, with automatic timeout and retry mechanisms.', score: 0.73, source: 'Hermes Skill Registry', chunkIndex: 234 },
  ];

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    setTimeout(() => {
      setResults(mockResults);
      setIsSearching(false);
    }, 1200);
  }, []);

  return (
    <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Search size={12} className="text-[#00ffff]" /> Retrieval Test
          </h3>
          <span className="text-[9px] text-[#8888aa] font-mono">Live query testing</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Query input */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8888aa]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter test query..."
              className="w-full bg-[rgba(10,10,26,0.6)] border border-[rgba(157,78,221,0.15)] rounded-xl pl-9 pr-3 py-2.5 text-[11px] text-white placeholder-[#8888aa] focus:outline-none focus:border-[rgba(0,255,255,0.3)] transition-colors font-mono"
            />
          </div>
          <motion.button
            onClick={handleSearch}
            disabled={isSearching}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'rgba(0,255,255,0.1)',
              border: '1.5px solid rgba(0,255,255,0.3)',
              color: '#00ffff',
              boxShadow: '0 0 16px rgba(0,255,255,0.15)',
            }}
          >
            {isSearching ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw size={14} />
              </motion.div>
            ) : (
              <Play size={14} />
            )}
          </motion.button>
        </div>

        {/* Results */}
        <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {results.map((result, i) => {
              const scoreColor = result.score > 0.85 ? '#00ff88' : result.score > 0.7 ? '#FFB627' : '#E8751A';
              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)] p-2.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor, boxShadow: `0 0 6px ${scoreColor}60` }} />
                      <span className="text-[8px] font-mono" style={{ color: scoreColor }}>
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[8px] text-[#8888aa]">{result.source} · Chunk #{result.chunkIndex}</span>
                  </div>
                  <p className="text-[9px] text-[#ccccdd] leading-relaxed">{result.content}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {results.length === 0 && !isSearching && (
            <div className="text-center py-6 text-[10px] text-[#8888aa]">
              Enter a query and click play to test retrieval
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMBEDDING MODEL SELECTOR + STATS
   ═══════════════════════════════════════════════════════════ */
function ModelSelectorAndStats() {
  const [selectedModel, setSelectedModel] = useState('text-embedding-3-large');

  const stats = [
    { label: 'Documents', value: String(DOCUMENTS.length), icon: FileText, color: '#00ffff' },
    { label: 'Total Chunks', value: '3,929', icon: Split, color: '#9d4edd' },
    { label: 'Avg Retrieval', value: '142ms', icon: Clock, color: '#00ff88' },
    { label: 'Hit Rate', value: '94.2%', icon: Target, color: '#FFB627' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border p-3 backdrop-blur-sm"
            style={{ borderColor: `${s.color}18`, background: `${s.color}04` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={10} style={{ color: s.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Model selector */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)]">
          <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Cpu size={12} className="text-[#9d4edd]" /> Embedding Model
          </h3>
        </div>
        <div className="p-3 space-y-1.5">
          {EMBEDDING_MODELS.map((model) => {
            const isActive = selectedModel === model.id;
            return (
              <motion.div
                key={model.id}
                className="rounded-lg border p-2.5 cursor-pointer transition-all"
                style={{
                  borderColor: isActive ? 'rgba(157,78,221,0.3)' : 'rgba(157,78,221,0.06)',
                  background: isActive ? 'rgba(157,78,221,0.08)' : 'rgba(10,10,26,0.2)',
                }}
                onClick={() => setSelectedModel(model.id)}
                whileHover={{ x: 2 }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center border"
                    style={{
                      borderColor: isActive ? 'rgba(157,78,221,0.4)' : 'rgba(157,78,221,0.1)',
                      background: isActive ? 'rgba(157,78,221,0.15)' : 'transparent',
                    }}>
                    {isActive && <Check size={10} className="text-[#9d4edd]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white font-medium truncate">{model.name}</div>
                    <div className="flex items-center gap-2 text-[8px] text-[#8888aa]">
                      <span>{model.provider}</span>
                      <span>·</span>
                      <span>{model.dims} dims</span>
                      <span>·</span>
                      <span className="text-[#FFB627]">{model.cost}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RAG ENGINE — Main Export
   ═══════════════════════════════════════════════════════════ */
export function RAGEngine() {
  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Zap size={16} className="text-[#00ffff]" />
          RAG Engine
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.06)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[9px] text-[#00ff88] font-mono">Pipeline active</span>
          </div>
        </div>
      </div>

      {/* ─── Pipeline ─── */}
      <PipelineFlow />

      {/* ─── Main grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DocumentStore />
        <ModelSelectorAndStats />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChunkInspector />
        <RetrievalTesting />
      </div>
    </div>
  );
}
