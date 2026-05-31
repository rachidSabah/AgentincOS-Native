'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Volume2, Settings, Play, Pause, Trash2,
  Brain, Search, Shield, Zap, Command, Globe,
  AudioWaveform, Radio, Clock, ChevronRight, AlertCircle,
  CheckCircle, Sparkles, Languages, Waves, Activity,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type RecordingState = 'idle' | 'recording' | 'processing' | 'transcribed';

interface VoiceCommand {
  trigger: string;
  agentId: string;
  agentName: string;
  color: string;
  icon: typeof Brain;
}

interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: number;
  agentRouted?: string;
  commandDetected?: string;
  duration: number;
}

interface VoiceSettings {
  language: string;
  autoDetect: boolean;
  noiseCancellation: boolean;
  voiceActivation: boolean;
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & MOCK
   ═══════════════════════════════════════════════════════════ */

const VOICE_COMMANDS: VoiceCommand[] = [
  { trigger: 'Hey Claude', agentId: 'claude', agentName: 'Claude', color: '#E63946', icon: Brain },
  { trigger: 'Hermes research', agentId: 'hermes', agentName: 'Hermes', color: '#FFB627', icon: Search },
  { trigger: 'OpenClaw route', agentId: 'openclaw', agentName: 'OpenClaw', color: '#E8751A', icon: Shield },
  { trigger: 'Vault recall', agentId: 'vault', agentName: 'Self Vault', color: '#2E86AB', icon: Zap },
];

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'ko-KR', label: 'Korean' },
];

const MOCK_HISTORY: TranscriptionEntry[] = [
  { id: 'vh-001', text: 'Hey Claude, what\'s the current status of the Agent OS deployment?', timestamp: Date.now() - 300000, agentRouted: 'claude', commandDetected: 'Hey Claude', duration: 4.2 },
  { id: 'vh-002', text: 'Hermes research the latest developments in multi-agent orchestration frameworks', timestamp: Date.now() - 900000, agentRouted: 'hermes', commandDetected: 'Hermes research', duration: 6.8 },
  { id: 'vh-003', text: 'OpenClaw route this task to the best available agent for code review', timestamp: Date.now() - 1800000, agentRouted: 'openclaw', commandDetected: 'OpenClaw route', duration: 5.1 },
  { id: 'vh-004', text: 'Vault recall my preferences for async communication and deep work blocks', timestamp: Date.now() - 3600000, agentRouted: 'vault', commandDetected: 'Vault recall', duration: 4.7 },
  { id: 'vh-005', text: 'What were the key takeaways from the MCP integration session yesterday?', timestamp: Date.now() - 7200000, duration: 5.5 },
  { id: 'vh-006', text: 'Summarize the competitor analysis that Hermes completed last week', timestamp: Date.now() - 14400000, duration: 3.9 },
];

/* ═══════════════════════════════════════════════════════════
   WAVEFORM VISUALIZATION
   ═══════════════════════════════════════════════════════════ */

function WaveformVisualizer({ isRecording, isActive }: { isRecording: boolean; isActive: boolean }) {
  const barCount = 32;
  const defaultBars = useMemo(() => Array(barCount).fill(4), []);
  const [bars, setBars] = useState<number[]>(defaultBars);

  useEffect(() => {
    if (!isRecording && !isActive) {
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map((_, i) => {
        const base = isRecording ? 40 : 12;
        const variance = isRecording ? 50 : 15;
        const wave = Math.sin(Date.now() / 200 + i * 0.3) * variance;
        const noise = Math.random() * variance * 0.5;
        return Math.max(3, Math.min(70, base + wave + noise));
      }));
    }, 60);

    return () => clearInterval(interval);
  }, [isRecording, isActive]);

  return (
    <div className="flex items-end justify-center gap-[2px] h-16 px-2">
      {bars.map((height, i) => {
        const hue = (i / barCount) * 60 + 180; // cyan-to-purple range
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${height}%`,
              background: `linear-gradient(180deg, hsl(${hue}, 100%, 60%), hsl(${hue}, 80%, 30%))`,
              opacity: isRecording ? 0.9 : 0.3,
              boxShadow: isRecording ? `0 0 4px hsl(${hue}, 100%, 50%)40` : 'none',
            }}
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.08, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FREQUENCY BARS
   ═══════════════════════════════════════════════════════════ */

function FrequencyBars({ isRecording }: { isRecording: boolean }) {
  const defaultFreqs = useMemo(() => Array(8).fill(20), []);
  const [freqs, setFreqs] = useState<number[]>(defaultFreqs);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      setFreqs(prev => prev.map((_, i) => {
        const base = 30 + i * 5;
        const wave = Math.sin(Date.now() / 300 + i * 0.8) * 25;
        const noise = Math.random() * 20;
        return Math.max(10, Math.min(100, base + wave + noise));
      }));
    }, 80);

    return () => clearInterval(interval);
  }, [isRecording]);

  const colors = ['#00ffff', '#00ccff', '#0099ff', '#6644ff', '#9933ff', '#cc22ff', '#ff00cc', '#ff0088'];

  return (
    <div className="flex items-end justify-center gap-1.5 h-8">
      {freqs.map((val, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-t"
          style={{
            height: `${val * 0.3}%`,
            backgroundColor: colors[i],
            opacity: isRecording ? 0.7 : 0.15,
            boxShadow: isRecording ? `0 0 6px ${colors[i]}40` : 'none',
          }}
          animate={{ height: `${val * 0.3}%` }}
          transition={{ duration: 0.1 }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VOICE INTERFACE — Main Export
   ═══════════════════════════════════════════════════════════ */

export function VoiceInterface() {
  const { agents } = useOSStore();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [history, setHistory] = useState<TranscriptionEntry[]>(MOCK_HISTORY);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'en-US',
    autoDetect: true,
    noiseCancellation: true,
    voiceActivation: false,
  });
  const [detectedCommand, setDetectedCommand] = useState<VoiceCommand | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(() => {
    setRecordingState('recording');
    setTranscription('');
    setStreamingText('');
    setDetectedCommand(null);
    setRecordingDuration(0);
    recordStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setRecordingDuration(Math.round((Date.now() - recordStartRef.current) / 100) / 10);
    }, 100);

    // Simulate transcription streaming
    setTimeout(() => {
      const phrases = ['Hey Claude, ', 'analyze the ', 'current sprint ', 'velocity and ', 'predict ', 'completion date'];
      let accumulated = '';
      phrases.forEach((phrase, i) => {
        setTimeout(() => {
          accumulated += phrase;
          setStreamingText(accumulated);
          if (i === 0) {
            // Detect command
            const cmd = VOICE_COMMANDS.find(c => accumulated.toLowerCase().startsWith(c.trigger.toLowerCase()));
            if (cmd) setDetectedCommand(cmd);
          }
        }, (i + 1) * 600);
      });

      // Finalize
      setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingState('transcribed');
        setTranscription('Hey Claude, analyze the current sprint velocity and predict completion date');
        setRecordingDuration(Math.round((Date.now() - recordStartRef.current) / 100) / 10);
      }, phrases.length * 600 + 400);
    }, 1500);
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState('idle');
    setStreamingText('');
  }, []);

  const submitTranscription = useCallback(() => {
    if (!transcription.trim()) return;

    const newEntry: TranscriptionEntry = {
      id: `vh-${Date.now()}`,
      text: transcription,
      timestamp: Date.now(),
      agentRouted: detectedCommand?.agentId,
      commandDetected: detectedCommand?.trigger,
      duration: recordingDuration,
    };

    setHistory(prev => [newEntry, ...prev]);
    setTranscription('');
    setStreamingText('');
    setDetectedCommand(null);
    setRecordingState('idle');
    setRecordingDuration(0);
  }, [transcription, detectedCommand, recordingDuration]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <Mic size={16} className="text-[#00ffff]" />
          Voice Interface
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${recordingState === 'recording' ? 'animate-pulse-glow' : ''}`}
              style={{ backgroundColor: recordingState === 'recording' ? '#ff0040' : recordingState === 'processing' ? '#FFB627' : '#00ff88' }} />
            <span className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: recordingState === 'recording' ? '#ff0040' : recordingState === 'processing' ? '#FFB627' : '#00ff88' }}>
              {recordingState === 'idle' ? 'Ready' : recordingState === 'recording' ? 'Recording' : recordingState === 'processing' ? 'Processing' : 'Transcribed'}
            </span>
          </div>
          <button onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-medium transition-all border border-[rgba(157,78,221,0.2)] bg-[rgba(157,78,221,0.08)] text-[#c084fc]">
            <Settings size={9} />
          </button>
        </div>
      </div>

      {/* ─── Settings Panel ─── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm overflow-hidden">
            <div className="p-4 space-y-3">
              <h3 className="text-white text-xs font-semibold flex items-center gap-1.5">
                <Settings size={12} className="text-[#9d4edd]" /> Voice Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Language */}
                <div>
                  <label className="text-[8px] text-[#8888aa] uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Languages size={8} /> Language
                  </label>
                  <select value={settings.language} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
                    className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-white text-[10px] font-mono focus:outline-none focus:border-[rgba(157,78,221,0.4)]">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>

                {/* Toggle options */}
                <div className="space-y-2">
                  {[
                    { key: 'autoDetect' as const, label: 'Auto-detect language', icon: Globe, color: '#00ffff' },
                    { key: 'noiseCancellation' as const, label: 'Noise cancellation', icon: Waves, color: '#00ff88' },
                    { key: 'voiceActivation' as const, label: 'Voice activation ("Hey Agent")', icon: Radio, color: '#FFB627' },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-2 rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
                      <div className="flex items-center gap-1.5">
                        <opt.icon size={9} style={{ color: opt.color }} />
                        <span className="text-[9px] text-white">{opt.label}</span>
                      </div>
                      <button onClick={() => setSettings(s => ({ ...s, [opt.key]: !s[opt.key] }))}
                        className={`w-9 h-5 rounded-full transition-all duration-200 relative ${settings[opt.key] ? 'bg-[#00ff88]' : 'bg-[rgba(136,136,170,0.3)]'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${settings[opt.key] ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Mic Button + Waveform ─── */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col items-center">
          {/* Frequency bars */}
          <FrequencyBars isRecording={recordingState === 'recording'} />

          {/* Waveform visualizer */}
          <div className="w-full max-w-md mt-3">
            <WaveformVisualizer isRecording={recordingState === 'recording'} isActive={recordingState === 'processing'} />
          </div>

          {/* Big mic button */}
          <motion.button
            onClick={recordingState === 'recording' ? stopRecording : startRecording}
            className="relative mt-6 w-20 h-20 rounded-full flex items-center justify-center transition-all"
            style={{
              background: recordingState === 'recording'
                ? 'linear-gradient(135deg, rgba(255,0,64,0.3), rgba(255,0,64,0.1))'
                : 'linear-gradient(135deg, rgba(0,255,255,0.15), rgba(157,78,221,0.15))',
              border: `2px solid ${recordingState === 'recording' ? 'rgba(255,0,64,0.5)' : 'rgba(0,255,255,0.3)'}`,
              boxShadow: recordingState === 'recording'
                ? '0 0 30px rgba(255,0,64,0.2), 0 0 60px rgba(255,0,64,0.1)'
                : '0 0 20px rgba(0,255,255,0.1), 0 0 40px rgba(157,78,221,0.05)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}>
            {/* Pulse rings */}
            {recordingState === 'recording' && (
              <>
                <motion.div className="absolute inset-0 rounded-full border-2 border-[rgba(255,0,64,0.3)]"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }} />
                <motion.div className="absolute inset-0 rounded-full border border-[rgba(255,0,64,0.2)]"
                  animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
              </>
            )}

            {recordingState === 'recording' ? (
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <MicOff size={28} className="text-[#ff0040]" />
              </motion.div>
            ) : (
              <Mic size={28} className="text-[#00ffff]" />
            )}
          </motion.button>

          {/* Duration / Status */}
          <div className="mt-3 text-center">
            {recordingState === 'recording' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#ff0040] animate-pulse" />
                <span className="text-[11px] font-mono text-[#ff0040] font-bold">{formatTime(recordingDuration)}</span>
              </motion.div>
            )}
            {recordingState === 'idle' && (
              <span className="text-[9px] text-[#8888aa]">Tap to start recording</span>
            )}
          </div>

          {/* Transcription display */}
          <AnimatePresence>
            {(streamingText || transcription) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 w-full max-w-md">
                <div className="rounded-lg border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.04)] p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AudioWaveform size={9} className="text-[#00ffff]" />
                    <span className="text-[8px] text-[#00ffff] uppercase tracking-wider font-semibold">
                      {recordingState === 'transcribed' ? 'Transcription' : 'Live Transcription'}
                    </span>
                    {detectedCommand && (
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                        style={{ backgroundColor: `${detectedCommand.color}15`, color: detectedCommand.color, border: `1px solid ${detectedCommand.color}30` }}>
                        → {detectedCommand.agentName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white leading-relaxed">
                    {transcription || streamingText}
                    {!transcription && streamingText && (
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-0.5 h-3 bg-[#00ffff] ml-0.5 align-text-bottom" />
                    )}
                  </p>
                </div>

                {recordingState === 'transcribed' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={submitTranscription}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #00ffff20, #9d4edd20)', border: '1px solid rgba(0,255,255,0.3)' }}>
                      <Zap size={10} className="text-[#00ffff]" /> Send to Agent
                    </button>
                    <button onClick={() => { setTranscription(''); setStreamingText(''); setDetectedCommand(null); setRecordingState('idle'); }}
                      className="px-3 py-2 rounded-lg text-[10px] font-medium border border-[rgba(157,78,221,0.2)] text-[#8888aa] hover:text-white transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── Voice Commands Reference ─── */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Command size={12} className="text-[#9d4edd]" /> Voice Commands
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VOICE_COMMANDS.map(cmd => (
            <motion.div key={cmd.trigger}
              whileHover={{ scale: 1.02 }}
              className="rounded-lg border p-3 text-center transition-colors cursor-default"
              style={{
                borderColor: detectedCommand?.trigger === cmd.trigger ? `${cmd.color}40` : 'rgba(157,78,221,0.1)',
                background: detectedCommand?.trigger === cmd.trigger ? `${cmd.color}08` : 'rgba(10,10,26,0.3)',
                boxShadow: detectedCommand?.trigger === cmd.trigger ? `0 0 12px ${cmd.color}15` : 'none',
              }}>
              <cmd.icon size={14} className="mx-auto mb-1.5" style={{ color: cmd.color }} />
              <div className="text-[9px] text-white font-mono font-bold">&quot;{cmd.trigger}&quot;</div>
              <div className="text-[8px] mt-0.5" style={{ color: cmd.color }}>→ {cmd.agentName}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Voice History ─── */}
      <motion.div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-white text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Clock size={12} className="text-[#2E86AB]" /> Voice History
          <span className="ml-auto text-[9px] font-mono text-[#8888aa]">{history.length} entries</span>
        </h3>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {history.map((entry, i) => {
            const cmd = VOICE_COMMANDS.find(c => c.trigger === entry.commandDetected);
            return (
              <motion.div key={entry.id}
                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-lg border border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.4)] p-2.5 hover:border-[rgba(157,78,221,0.15)] transition-colors">
                <div className="flex items-start gap-2">
                  {/* Playback button */}
                  <button className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border border-[rgba(157,78,221,0.15)] bg-[rgba(157,78,221,0.06)] text-[#8888aa] hover:text-white transition-colors">
                    <Play size={8} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white leading-relaxed line-clamp-2">{entry.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] text-[#8888aa] font-mono">{timeAgo(entry.timestamp)}</span>
                      <span className="text-[8px] text-[#8888aa] font-mono">{entry.duration}s</span>
                      {entry.commandDetected && cmd && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: `${cmd.color}12`, color: cmd.color, border: `1px solid ${cmd.color}30` }}>
                          {cmd.agentName}
                        </span>
                      )}
                      {entry.agentRouted && !entry.commandDetected && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-[rgba(136,136,170,0.1)] text-[#8888aa] border border-[rgba(136,136,170,0.2)]">
                          auto-routed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {history.length === 0 && (
            <div className="text-center py-6">
              <Mic size={20} className="mx-auto text-[#8888aa] mb-2 opacity-40" />
              <p className="text-[10px] text-[#8888aa]">No voice history yet. Start recording to begin.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
