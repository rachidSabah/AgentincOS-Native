'use client';

import { useOSStore, type Agent, type StackLayer } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Radio, Zap, Crown, Route, FlaskConical, Gem,
  MessageSquare, Target, BookOpen, Database, Mic,
  TrendingUp, Search, Sparkles, Activity, Clock,
  BarChart3, Settings, Terminal, ChevronRight, MicOff,
  Eye as EyeIcon, Users, Wrench, Lock, Lightbulb, Wifi, WifiOff,
  Paperclip, X as XIcon,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

const agentIcons: Record<string, typeof Crown> = {
  claude: Crown,
  openclaw: Route,
  hermes: FlaskConical,
  vault: Gem,
};

/* ═══════════════════════════════════════════════════════
   AGENT RAIL — Left Column
   ═══════════════════════════════════════════════════════ */
export function AgentRail() {
  const { agents, selectedAgentId, setSelectedAgentId, stackLayers, hermesConnection, agentAnalytics } = useOSStore();

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)] flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-[rgba(157,78,221,0.1)]">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[#E63946]" />
          <span className="text-[10px] text-white font-bold tracking-wider uppercase">Agents</span>
          <span className="ml-auto text-[9px] text-[#8888aa] font-mono">
            {agents.filter(a => a.status === 'live').length}/{agents.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {agents.map((agent) => {
          const primaryLayer = stackLayers.find(l => l.number === agent.layer);
          const isSelected = selectedAgentId === agent.id;
          const analytics = agentAnalytics[agent.id];
          const isHermesLive = agent.id === 'hermes' && hermesConnection.running;

          return (
            <motion.button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`w-full text-left rounded-xl p-3 transition-all duration-200 group relative ${
                isSelected
                  ? 'border bg-[rgba(18,18,42,0.8)]'
                  : 'border border-transparent hover:bg-[rgba(18,18,42,0.4)] hover:border-[rgba(157,78,221,0.1)]'
              }`}
              style={isSelected ? { borderColor: `${agent.color}30`, background: `linear-gradient(135deg, ${agent.color}08, ${agent.color}03)` } : {}}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSelected && (
                <motion.div
                  layoutId="agent-rail-active"
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                  style={{ backgroundColor: agent.color }}
                />
              )}

              <div className="flex items-start gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${agent.color}20, ${agent.color}08)`, border: `1px solid ${agent.color}25` }}>
                    <span className="text-sm">{primaryLayer?.icon}</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-[#0a0a1a] ${agent.status === 'live' ? 'animate-pulse-glow' : ''}`}
                      style={{ backgroundColor: agent.status === 'live' ? agent.color : '#8888aa' }} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-semibold truncate">{agent.name}</span>
                    <span className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{ backgroundColor: `${agent.color}20`, color: agent.color }}>
                      L{agent.layers.join(',L')}
                    </span>
                    {isHermesLive && (
                      <span className="text-[7px] px-1 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] font-bold">LIVE</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8888aa] truncate mt-0.5">{primaryLayer?.role}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="text-[8px] text-[#8888aa]">
                      <span className="text-white font-mono">{analytics?.totalSessions || 0}</span> sessions
                    </div>
                    <div className="text-[8px] text-[#8888aa]">
                      <span className="font-mono" style={{ color: agent.latency > 200 ? '#ffaa00' : '#00ff88' }}>{agent.latency}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom: 7-Layer Mini Stack */}
      <div className="p-3 border-t border-[rgba(157,78,221,0.1)]">
        <div className="text-[8px] text-[#8888aa] uppercase tracking-widest mb-2">7 Layers</div>
        <div className="space-y-0.5">
          {stackLayers.map(layer => (
            <div key={layer.id} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layer.color }} />
              <span className="text-[8px] text-[#8888aa] font-mono">L{layer.number}</span>
              <span className="text-[8px] text-[#aaaacc] truncate">{layer.flowLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   LIVE WORKSPACE — Center Column
   ═══════════════════════════════════════════════════════ */
export function LiveWorkspace() {
  const {
    agents, stackLayers, selectedAgentId, setSelectedAgentId,
    hermesConnection, geminiConnection, chatHistories, addChatMessage,
    clearChatHistory, isChatStreaming, setIsChatStreaming,
    addMemory, addLog, incrementTokens,
    sseConnectionStatus, hermesSkills, addSkillExecution, addKanbanTask,
    chatAttachments, addChatAttachment, removeChatAttachment, clearChatAttachments,
  } = useOSStore();

  const agentId = selectedAgentId || 'hermes';
  const agent = agents.find(a => a.id === agentId);
  const primaryLayer = stackLayers.find(l => l.number === agent?.layer);
  const messages = chatHistories[agentId] || [];
  const isHermesLive = agentId === 'hermes' && hermesConnection.running;
  const isGeminiLive = agentId === 'gemini' && geminiConnection.installed;

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAnyAgentLive = isHermesLive || isGeminiLive;
  const quickActions = isAnyAgentLive ? [
    { label: 'What should I automate today?', prompt: 'Based on my vault, give me some ideas on what I should automate today' },
    { label: 'Research competitors', prompt: 'Research my top 3 competitors and give me a strategic analysis' },
    { label: 'Summarize journal', prompt: 'Summarize my recent journal entries and identify key patterns' },
    { label: 'Peak productivity', prompt: 'What are my most productive hours based on the analytics data?' },
  ] : [];

  // Latency color
  const latencyColor = hermesConnection.latency
    ? hermesConnection.latency < 100 ? '#00ff88'
    : hermesConnection.latency < 500 ? '#ffaa00' : '#ff4444'
    : '#8888aa';

  // Execute a skill
  const executeSkill = async (skillName: string) => {
    const executionId = `exec-${Date.now()}`;
    addSkillExecution({
      id: executionId,
      skill: skillName,
      status: 'running',
      startedAt: Date.now(),
    });
    addLog({
      id: `skill-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      agent: 'Hermes',
      layer: 5,
      level: 'info',
      message: `Executing skill: ${skillName}`,
    });
    try {
      const res = await fetch('/api/hermes/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: skillName, stream: false }),
      });
      const data = await res.json();
      addSkillExecution({
        id: executionId,
        skill: skillName,
        status: data.success ? 'completed' : 'failed',
        result: data.result ?? data.error,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
    } catch {
      addSkillExecution({
        id: executionId,
        skill: skillName,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (agent && primaryLayer && messages.length === 0) {
      const statusMsg = isHermesLive ? 'Hermes API connected — responses are live.'
        : isGeminiLive ? 'Gemini CLI detected — responses will use Gemini.'
        : 'Ready for commands.';
      addChatMessage(agentId, {
        id: `init-${Date.now()}`,
        role: 'agent',
        content: `${agent.name} workspace initialized. Layers ${agent.layers.map(l => `L${l}`).join(', ')} — ${primaryLayer.role}. ${statusMsg} Ask me anything or use the quick actions below.`,
        timestamp: Date.now(),
        agentId,
      });
    }
  }, [agentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (!agent || !primaryLayer) return null;

  const handleHermesChat = async (userMsg: string) => {
    setIsChatStreaming(true);
    setStreamingText('');
    try {
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content }));
      apiMessages.push({ role: 'user', content: userMsg });

      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
      });

      if (!res.ok) {
        addChatMessage(agentId, {
          id: `err-${Date.now()}`, role: 'system',
          content: `Hermes API error: ${res.status}. The agent may be restarting.`,
          timestamp: Date.now(), agentId,
        });
        setIsChatStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) { fullText += delta; setStreamingText(fullText); }
              } catch {
                if (data && data !== '[DONE]') { fullText += data; setStreamingText(fullText); }
              }
            }
          }
        }
      }

      const finalText = fullText || 'No response received from Hermes.';
      addChatMessage(agentId, {
        id: `agent-${Date.now()}`, role: 'agent',
        content: finalText, timestamp: Date.now(), agentId,
      });
      incrementTokens(Math.ceil(finalText.length / 4));

      addMemory({
        id: `mem-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        content: `Chat with ${agent?.name ?? 'Hermes'}: Q="${userMsg.substring(0, 100)}" A="${finalText.substring(0, 150)}"`,
        agent: agent?.name ?? 'Hermes',
        tags: ['chat', 'auto-saved', agentId],
      });

      addLog({
        id: `hermes-chat-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Hermes', layer: 2, level: 'success',
        message: `Hermes responded to query (${finalText.length} chars) — auto-saved to memory`,
      });
    } catch (err) {
      addChatMessage(agentId, {
        id: `err-${Date.now()}`, role: 'system',
        content: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now(), agentId,
      });
    } finally {
      setStreamingText('');
      setIsChatStreaming(false);
    }
  };

  const handleGeminiChat = async (userMsg: string) => {
    setIsChatStreaming(true);
    setStreamingText('');
    try {
      const res = await fetch('/api/hermes/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: userMsg, model: 'gemini-2.5-pro' }),
      });

      if (!res.ok) {
        addChatMessage(agentId, {
          id: `err-${Date.now()}`, role: 'system',
          content: `Gemini API error: ${res.status}. The Gemini CLI may not be running.`,
          timestamp: Date.now(), agentId,
        });
        setIsChatStreaming(false);
        return;
      }

      const data = await res.json();
      const responseText = data.response ?? data.error ?? 'No response from Gemini.';

      setStreamingText(responseText);
      await new Promise(r => setTimeout(r, 300)); // brief delay for streaming feel

      addChatMessage(agentId, {
        id: `agent-${Date.now()}`, role: 'agent',
        content: responseText, timestamp: Date.now(), agentId,
      });
      incrementTokens(data.tokensUsed ?? Math.ceil(responseText.length / 4));

      addMemory({
        id: `mem-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        content: `Chat with Gemini: Q="${userMsg.substring(0, 100)}" A="${responseText.substring(0, 150)}"`,
        agent: 'Gemini',
        tags: ['chat', 'auto-saved', 'gemini'],
      });

      addLog({
        id: `gemini-chat-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'Gemini', layer: 2, level: 'success',
        message: `Gemini responded (${data.demo ? 'demo' : 'live'}) in ${data.latency ?? '?'}ms — ${responseText.length} chars`,
      });
    } catch (err) {
      addChatMessage(agentId, {
        id: `err-${Date.now()}`, role: 'system',
        content: `Gemini connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now(), agentId,
      });
    } finally {
      setStreamingText('');
      setIsChatStreaming(false);
    }
  };

  const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.csv,.pptx,.txt,.json,.xml,.yaml,.yml,.html,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.ogg,.mp4,.webm,.js,.ts,.py,.rs,.go,.java,.c,.cpp,.h,.rb,.php,.sh,.bat,.sql,.md,.css,.scss,.less,.jsx,.tsx,.vue,.svelte';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_INLINE_SIZE = 1024 * 1024; // 1MB
    const attachment: import('@/lib/store').ChatAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      processed: false,
    };
    if (file.size < MAX_INLINE_SIZE) {
      const reader = new FileReader();
      reader.onload = () => {
        attachment.dataUrl = reader.result as string;
        attachment.processed = true;
        addChatAttachment(attachment);
      };
      reader.readAsDataURL(file);
    } else {
      addChatAttachment(attachment);
    }
    e.target.value = '';
  };

  const handleSend = async (overrideInput?: string) => {
    const userMsg = (overrideInput || input).trim();
    if ((!userMsg && chatAttachments.length === 0) || isChatStreaming) return;
    setInput('');
    clearChatAttachments();

    addChatMessage(agentId, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMsg,
      timestamp: Date.now(),
      agentId,
    });

    incrementTokens(Math.ceil(userMsg.length / 4));

    // Route to the appropriate agent backend
    if (agentId === 'hermes' && isHermesLive) {
      await handleHermesChat(userMsg);
    } else if (agentId === 'gemini' && isGeminiLive) {
      await handleGeminiChat(userMsg);
    } else if (agentId === 'hermes') {
      addChatMessage(agentId, {
        id: `agent-${Date.now()}`, role: 'system',
        content: `Hermes API is offline. Your message "${userMsg}" was received but cannot be processed. Please ensure Hermes is running and connected.`,
        timestamp: Date.now(), agentId,
      });
    } else if (agentId === 'gemini') {
      addChatMessage(agentId, {
        id: `agent-${Date.now()}`, role: 'system',
        content: `Gemini CLI not detected. Your message "${userMsg}" was received but cannot be processed. Install Gemini CLI or start a Gemini server to enable chat.`,
        timestamp: Date.now(), agentId,
      });
    } else {
      addChatMessage(agentId, {
        id: `agent-${Date.now()}`, role: 'system',
        content: `${agent?.name ?? 'Agent'} is not configured for chat. Your message "${userMsg}" was received but cannot be processed.`,
        timestamp: Date.now(), agentId,
      });
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.start();
    setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${agent.color}20, ${agent.color}08)`, border: `1px solid ${agent.color}30` }}>
            <span className="text-sm">{primaryLayer.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-bold">{agent.name}</span>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${agent.color}20`, color: agent.color }}>L{agent.layers.join(',L')}</span>
              {(isHermesLive || isGeminiLive) && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] font-bold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse-glow" />
                  {isGeminiLive ? 'GEMINI CLI' : 'LIVE API'}
                </span>
              )}
              {isHermesLive && hermesConnection.latency !== undefined && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono font-bold" style={{ color: latencyColor, backgroundColor: `${latencyColor}15` }}>
                  {hermesConnection.latency}ms
                </span>
              )}
              {isHermesLive && sseConnectionStatus === 'connected' && (
                <span className="text-[7px] px-1 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] text-[#00ff88] flex items-center gap-0.5">
                  <Wifi size={7} /> SSE
                </span>
              )}
            </div>
            <p className="text-[10px]" style={{ color: `${agent.color}aa` }}>{primaryLayer.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => clearChatHistory(agentId)}
            className="text-[9px] px-2 py-1 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors">
            Clear
          </button>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${agent.status === 'live' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#8888aa]/10 text-[#8888aa]'}`}>
            {agent.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-xl text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[rgba(123,44,191,0.2)] text-white border border-[rgba(123,44,191,0.15)]'
                : msg.role === 'system'
                ? 'bg-[rgba(255,170,0,0.1)] text-[#ffaa00] border border-[rgba(255,170,0,0.15)] text-xs text-center max-w-[90%]'
                : 'bg-[rgba(18,18,42,0.8)] text-[#ccccdd] border border-[rgba(123,44,191,0.1)]'
            }`}>
              <pre className="whitespace-pre-wrap font-sans break-words">{msg.content}</pre>
            </div>
          </motion.div>
        ))}
        {streamingText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[75%] px-4 py-2.5 rounded-xl text-[13px] bg-[rgba(18,18,42,0.8)] text-[#ccccdd] border border-[rgba(0,255,136,0.2)]">
              <pre className="whitespace-pre-wrap font-sans break-words">{streamingText}</pre>
              <span className="inline-block w-2 h-4 bg-[#00ff88] animate-pulse-glow ml-1" />
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {quickActions.length > 0 && !isChatStreaming && (
        <div className="px-5 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((qa) => (
              <button key={qa.label}
                onClick={() => handleSend(qa.prompt)}
                className="text-[9px] px-2.5 py-1.5 rounded-lg border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors flex items-center gap-1">
                <Sparkles size={9} /> {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hermes Quick Skill Actions */}
      {isHermesLive && !isChatStreaming && hermesSkills.length > 0 && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={9} className="text-[#FFB627]" />
            <span className="text-[8px] text-[#8888aa] uppercase tracking-widest">Quick Skills</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {hermesSkills.slice(0, 4).map((skill) => (
              <button key={skill.id}
                onClick={() => executeSkill(skill.name)}
                className="text-[8px] px-2 py-1 rounded-md border border-[rgba(255,182,39,0.2)] text-[#FFB627] bg-[rgba(255,182,39,0.05)] hover:bg-[rgba(255,182,39,0.1)] transition-colors flex items-center gap-0.5">
                <Zap size={7} /> {skill.name}
              </button>
            ))}
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/hermes/kanban', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New research task', priority: 'medium', assignedTo: 'hermes' }),
                  });
                  const data = await res.json();
                  if (data.task) addKanbanTask(data.task);
                } catch { /* ignore */ }
              }}
              className="text-[8px] px-2 py-1 rounded-md border border-[rgba(123,44,191,0.2)] text-[#7B2CBF] bg-[rgba(123,44,191,0.05)] hover:bg-[rgba(123,44,191,0.1)] transition-colors flex items-center gap-0.5">
              <Target size={7} /> + Task
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.3)]">
        {/* Attachment chips */}
        {chatAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {chatAttachments.map(att => (
              <div key={att.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[rgba(157,78,221,0.3)] bg-[rgba(157,78,221,0.1)] text-[10px] text-[#ccccdd] group"
                title={att.name}>
                <Paperclip size={9} className="text-[#9d4edd] flex-shrink-0" />
                <span className="truncate max-w-[120px]">{att.name}</span>
                <span className="text-[#8888aa]">({formatFileSize(att.size)})</span>
                <button onClick={() => removeChatAttachment(att.id)}
                  className="text-[#8888aa] hover:text-[#ff4444] transition-colors flex-shrink-0">
                  <XIcon size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-10 h-10 rounded-lg border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)] flex items-center justify-center transition-all"
            title="Attach file">
            <Paperclip size={16} />
          </button>
          <button onClick={startVoiceInput}
            className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
              isListening
                ? 'border-[#ffaa00] bg-[rgba(255,170,0,0.15)] text-[#ffaa00]'
                : 'border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.4)]'
            }`}
            title={isListening ? 'Listening...' : 'Voice input'}>
            {isListening ? <Mic size={16} className="animate-pulse" /> : <Mic size={16} />}
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isChatStreaming}
            placeholder={isChatStreaming ? 'Hermes is thinking...' : isHermesLive ? 'Message Hermes directly (Live API)...' : `Send command to ${agent.name}...`}
            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.4)] disabled:opacity-50" />
          <button onClick={() => handleSend()} disabled={isChatStreaming || (!input.trim() && chatAttachments.length === 0)}
            className="flex-shrink-0 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}88)` }}>
            {isChatStreaming ? '...' : 'Send'}
          </button>
        </div>
        {isHermesLive && (
          <div className="mt-2 text-[9px] text-[#00ff88] flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse-glow" />
            Connected to Hermes API at {hermesConnection.apiEndpoint} — Model: {hermesConnection.model || 'default'}
            {hermesConnection.version && <> — v{hermesConnection.version}</>}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   BRAIN PANEL — Right Column
   ═══════════════════════════════════════════════════════ */
export function BrainPanel() {
  const { goals, journal, memories, selfSearchQuery, setSelfSearchQuery, setActiveView, stackLayers } = useOSStore();
  const [brainTab, setBrainTab] = useState<'goals' | 'journal' | 'memory'>('goals');

  const filteredMemories = selfSearchQuery
    ? memories.filter(m => m.content.toLowerCase().includes(selfSearchQuery.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(selfSearchQuery.toLowerCase())))
    : memories.slice(0, 5);

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)] flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-[rgba(157,78,221,0.1)]">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[#2E86AB]" />
          <span className="text-[10px] text-white font-bold tracking-wider uppercase">The Brain</span>
        </div>
        <p className="text-[8px] text-[#8888aa] mt-0.5">Goals, Journal, Memory — Layer 6</p>
      </div>

      <div className="flex border-b border-[rgba(157,78,221,0.1)]">
        {(['goals', 'journal', 'memory'] as const).map(tab => (
          <button key={tab} onClick={() => setBrainTab(tab)}
            className={`flex-1 py-2 text-[9px] font-bold tracking-wider uppercase transition-colors ${
              brainTab === tab ? 'text-white border-b-2' : 'text-[#8888aa] hover:text-white'
            }`}
            style={brainTab === tab ? { borderColor: tab === 'goals' ? '#E63946' : tab === 'journal' ? '#7B2CBF' : '#2E86AB', color: tab === 'goals' ? '#E63946' : tab === 'journal' ? '#7B2CBF' : '#2E86AB' } : {}}>
            {tab === 'goals' && <><Target size={9} className="inline mr-1" />Goals</>}
            {tab === 'journal' && <><BookOpen size={9} className="inline mr-1" />Journal</>}
            {tab === 'memory' && <><Database size={9} className="inline mr-1" />Memory</>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="wait">
          {brainTab === 'goals' && (
            <motion.div key="goals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {goals.slice(0, 4).map((goal) => (
                <div key={goal.id} className="rounded-lg border border-[rgba(230,57,70,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-[rgba(123,44,191,0.2)] text-[#7B2CBF] bg-[rgba(123,44,191,0.05)] font-medium">{goal.category}</span>
                    <span className="text-[8px] text-[#8888aa]">{goal.timeline}</span>
                  </div>
                  <p className="text-white text-[11px] font-medium mb-2 leading-tight">{goal.title}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#E6394688] to-[#E63946]" style={{ width: `${goal.progress}%` }} />
                    </div>
                    <span className="text-[#E63946] text-[10px] font-mono font-bold">{goal.progress}%</span>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveView('self-goals')}
                className="w-full text-center text-[9px] py-2 text-[#8888aa] hover:text-[#E63946] transition-colors flex items-center justify-center gap-1">
                View All Goals <ChevronRight size={10} />
              </button>
            </motion.div>
          )}

          {brainTab === 'journal' && (
            <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {journal.slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[rgba(123,44,191,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-white text-[10px] font-medium">{entry.date}</span>
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-bold ${
                      entry.type === 'voice' ? 'bg-[rgba(255,170,0,0.1)] text-[#ffaa00] border border-[rgba(255,170,0,0.2)]' : 'bg-[rgba(230,57,70,0.1)] text-[#E63946] border border-[rgba(230,57,70,0.2)]'
                    }`}>
                      {entry.type === 'voice' ? 'VOICE' : 'TEXT'}
                    </span>
                    <span className="text-[8px] text-[#8888aa]">via {entry.source}</span>
                  </div>
                  <p className="text-[#ccccdd] text-[11px] leading-relaxed line-clamp-3">{entry.content}</p>
                </div>
              ))}
              <button onClick={() => setActiveView('self-journal')}
                className="w-full text-center text-[9px] py-2 text-[#8888aa] hover:text-[#7B2CBF] transition-colors flex items-center justify-center gap-1">
                View Full Journal <ChevronRight size={10} />
              </button>
            </motion.div>
          )}

          {brainTab === 'memory' && (
            <motion.div key="memory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8888aa]" />
                <input value={selfSearchQuery} onChange={e => setSelfSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-8 pr-3 py-2 text-white text-[11px] placeholder:text-[#8888aa] focus:outline-none focus:border-[rgba(157,78,221,0.3)]" />
              </div>
              {filteredMemories.map((mem) => {
                const agentColors: Record<string, string> = { Claude: '#E63946', OpenClaw: '#E8751A', Hermes: '#FFB627', 'Self Vault': '#2E86AB' };
                return (
                  <div key={mem.id} className="rounded-lg border border-[rgba(46,134,171,0.1)] bg-[rgba(10,10,26,0.4)] p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded"
                        style={{ backgroundColor: `${agentColors[mem.agent] || '#8888aa'}20`, color: agentColors[mem.agent] || '#8888aa' }}>
                        {mem.agent}
                      </span>
                      <span className="text-[8px] text-[#8888aa]">{mem.timestamp}</span>
                    </div>
                    <p className="text-[#ccccdd] text-[10px] leading-relaxed line-clamp-2">{mem.content}</p>
                  </div>
                );
              })}
              <button onClick={() => setActiveView('self-memory')}
                className="w-full text-center text-[9px] py-2 text-[#8888aa] hover:text-[#2E86AB] transition-colors flex items-center justify-center gap-1">
                Search All Memories <ChevronRight size={10} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-[rgba(157,78,221,0.1)]">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp size={12} className="text-[#FFB627]" />
          <span className="text-[9px] text-[#FFB627] font-bold tracking-wider">COMPOUNDING</span>
          <span className="text-[9px] text-[#8888aa] font-mono ml-auto">Day 30</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[rgba(10,10,26,0.8)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#FFB627]" style={{ width: '72%' }} />
          </div>
          <span className="text-[9px] text-[#FFB627] font-mono font-bold">72%</span>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   AGENT ANALYTICS TAB
   ═══════════════════════════════════════════════════════ */
export function AgentAnalyticsPanel({ agentId }: { agentId: string }) {
  const { agentAnalytics, agents } = useOSStore();
  const analytics = agentAnalytics[agentId];
  const agent = agents.find(a => a.id === agentId);
  if (!analytics || !agent) return null;

  const maxActivity = Math.max(...analytics.activityByHour, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Sessions', value: (analytics.totalSessions ?? 0).toLocaleString('en-US'), color: '#E63946', icon: Activity },
          { label: 'Tokens', value: `${((analytics.totalTokens ?? 0) / 1000000).toFixed(1)}M`, color: '#7B2CBF', icon: Zap },
          { label: 'Tool Calls', value: (analytics.totalToolCalls ?? 0).toLocaleString('en-US'), color: '#00ff88', icon: Terminal },
          { label: 'Avg Response', value: `${((analytics.avgResponseTime ?? 0) / 1000).toFixed(1)}s`, color: '#FFB627', icon: Clock },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border bg-[rgba(10,10,26,0.5)] p-3"
            style={{ borderColor: `${stat.color}20` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={10} style={{ color: stat.color }} />
              <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-white font-mono font-bold text-lg">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <BarChart3 size={12} className="text-[#7B2CBF]" /> Activity by Hour
          </h4>
          <span className="text-[9px] text-[#8888aa]">
            Peak: <span className="text-[#00ff88] font-mono">{analytics.peakHour}:00</span>
          </span>
        </div>
        <div className="flex items-end gap-[2px] h-16">
          {analytics.activityByHour.map((val, hour) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${(val / maxActivity) * 100}%`,
                  minHeight: '2px',
                  backgroundColor: hour === analytics.peakHour ? agent.color : `${agent.color}40`,
                }} />
              {hour % 4 === 0 && (
                <span className="text-[7px] text-[#8888aa] font-mono">{hour}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.4)] p-3">
        <h4 className="text-[10px] text-[#8888aa] uppercase tracking-wider mb-2">Models Used</h4>
        <div className="flex flex-wrap gap-1.5">
          {analytics.modelsUsed.map(model => (
            <span key={model} className="text-[9px] px-2 py-0.5 rounded-full border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] font-mono">
              {model}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
