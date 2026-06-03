'use client';

import { useOSStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Download, Package, CheckCircle2, XCircle, RefreshCw, GitBranch, Globe, Zap, Plus, Trash2 } from 'lucide-react';
import { useState, useCallback } from 'react';

export function SkillImporter() {
  const { skills: installedSkills, setHermesSkills } = useOSStore();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ skills: any[]; errors: string[]; repo: string } | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [isInstalling, setIsInstalling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleScan = useCallback(async () => {
    if (!repoUrl.trim()) return;
    setIsScanning(true);
    setScanResult(null); setSelectedSkills(new Set());
    try {
      const res = await fetch('/api/skills/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim(), branch: branch.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data);
        setSelectedSkills(new Set(data.skills.map((s: any) => s.sourcePath)));
        showToast(`Found ${data.importCount} skills in ${data.repo}`, 'success');
      } else {
        showToast(data.error || 'Scan failed', 'error');
      }
    } catch {
      showToast('Failed to connect. Check the repo URL.', 'error');
    } finally { setIsScanning(false); }
  }, [repoUrl, branch]);

  const handleInstall = useCallback(() => {
    if (!scanResult) return;
    setIsInstalling(true);
    const toInstall = scanResult.skills.filter((s: any) => selectedSkills.has(s.sourcePath));
    const newSkills = toInstall.map((s: any, i: number) => ({
      id: s.sourcePath || `imported-${Date.now()}-${i}`,
      name: s.name, description: s.description, category: s.category,
      version: '1.0.0', enabled: true, icon: s.icon || '📦',
      color: s.color || '#9d4edd', tags: s.tags,
      systemPrompt: s.systemPrompt, source: s.source || scanResult.repo,
      sourceUrl: s.sourceUrl || repoUrl,
    }));
    setHermesSkills([...installedSkills, ...newSkills]);
    showToast(`Installed ${newSkills.length} skills! Restart recommended.`, 'success');
    setScanResult(null); setRepoUrl(''); setIsInstalling(false);
  }, [scanResult, selectedSkills, installedSkills, setHermesSkills, repoUrl]);

  const toggleSkill = (path: string) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const presetRepos = [
    { label: 'Skill Creator Examples', url: 'https://github.com/anthropics/skills/tree/main/skills' },
    { label: 'Awesome AI Skills', url: 'https://github.com/NousResearch/hermes-agent/tree/main/skills' },
    { label: 'Coding Agents', url: 'https://github.com/rachidSabah/Agentic-os/tree/main/skills' },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg border text-[10px] font-medium ${toast.type === 'success' ? 'bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.15)] text-[#00ff88]' : toast.type === 'error' ? 'bg-[rgba(255,68,68,0.05)] border-[rgba(255,68,68,0.15)] text-[#ff4444]' : 'bg-[rgba(66,133,244,0.05)] border-[rgba(66,133,244,0.15)] text-[#4285f4]'}`}>
          {toast.message}
        </motion.div>
      )}

      {/* Scan Section */}
      <div className="rounded-xl border border-[rgba(157,78,221,0.15)] bg-[rgba(18,18,42,0.6)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package size={14} style={{ color: '#9d4edd' }} />
          <span className="text-white font-bold text-xs uppercase tracking-wider">Import Skills from Repo</span>
        </div>

        <div className="flex gap-2 mb-3">
          <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/tree/main/skills"
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-3 py-2 text-[11px] text-white font-mono placeholder-[#8888aa] outline-none" />
          <input value={branch} onChange={e => setBranch(e.target.value)}
            placeholder="branch (main)"
            className="w-28 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.2)] rounded-lg px-2 py-2 text-[11px] text-white placeholder-[#8888aa] outline-none" />
          <button onClick={handleScan} disabled={isScanning || !repoUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold bg-[rgba(157,78,221,0.15)] border border-[rgba(157,78,221,0.3)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.25)] disabled:opacity-30 transition-colors">
            {isScanning ? <RefreshCw size={12} className="animate-spin" /> : <GitBranch size={12} />} Scan
          </button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[8px] text-[#8888aa] uppercase tracking-wider">Quick Scan:</span>
          {presetRepos.map((p, i) => (
            <button key={i} onClick={() => setRepoUrl(p.url)}
              className="text-[8px] px-2 py-0.5 rounded border border-[rgba(157,78,221,0.1)] text-[#8888aa] hover:text-white hover:border-[rgba(157,78,221,0.3)] transition-colors">{p.label}</button>
          ))}
        </div>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={12} style={{ color: '#00ff88' }} />
              <span className="text-[10px] text-[#00ff88] font-bold">{scanResult.repo}</span>
              <span className="text-[9px] text-[#8888aa]">{scanResult.skills.length} skills found</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedSkills(new Set(scanResult.skills.map((s: any) => s.sourcePath)))}
                className="text-[8px] text-[#8888aa] hover:text-white">Select All</button>
              <button onClick={() => setSelectedSkills(new Set())}
                className="text-[8px] text-[#8888aa] hover:text-white">Deselect</button>
              <button onClick={handleInstall} disabled={isInstalling || selectedSkills.size === 0}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-[9px] font-bold bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] disabled:opacity-30 transition-colors">
                {isInstalling ? <RefreshCw size={10} className="animate-spin" /> : <Download size={10} />}
                Install ({selectedSkills.size})
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {scanResult.skills.map((skill: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                onClick={() => toggleSkill(skill.sourcePath)}
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${selectedSkills.has(skill.sourcePath) ? 'ring-1' : ''}`}
                style={{
                  borderColor: selectedSkills.has(skill.sourcePath) ? `${skill.color}40` : 'rgba(157,78,221,0.1)',
                  background: selectedSkills.has(skill.sourcePath) ? `${skill.color}08` : 'rgba(18,18,42,0.3)',
                }}>
                <span className="text-sm mt-0.5">{skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white font-medium truncate">{skill.name}</span>
                    <span className="text-[7px] px-1 py-0.5 rounded uppercase font-mono" style={{ background: `${skill.color}10`, color: skill.color }}>{skill.category}</span>
                  </div>
                  <div className="text-[8px] text-[#8888aa] truncate mt-0.5">{skill.description.slice(0, 80)}</div>
                  {skill.systemPrompt && (
                    <div className="text-[7px] text-[#8888aa] mt-1 font-mono truncate">Prompt: {skill.systemPrompt.slice(0, 60)}...</div>
                  )}
                </div>
                {selectedSkills.has(skill.sourcePath) ? <CheckCircle2 size={14} style={{ color: '#00ff88' }} /> : <div className="w-3.5 h-3.5 rounded-full border border-[rgba(157,78,221,0.3)]" />}
              </motion.div>
            ))}
          </div>

          {scanResult.errors.length > 0 && (
            <div className="p-3 rounded-lg border border-[rgba(255,68,68,0.1)] bg-[rgba(255,68,68,0.03)]">
              <div className="flex items-center gap-1.5 mb-1.5"><XCircle size={10} style={{ color: '#ff4444' }} /><span className="text-[9px] text-[#ff4444] font-bold">Errors ({scanResult.errors.length})</span></div>
              {scanResult.errors.map((e, i) => <div key={i} className="text-[8px] text-[#ff6666] font-mono">{e}</div>)}
            </div>
          )}
        </motion.div>
      )}

      {/* Installed Skills Summary */}
      {installedSkills.length > 0 && !scanResult && (
        <div className="rounded-xl border border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.4)] p-4">
          <div className="flex items-center gap-2 mb-2"><Zap size={12} style={{ color: '#FFB627' }} /><span className="text-[10px] text-white font-bold uppercase">Installed Skills ({installedSkills.length})</span></div>
          <div className="flex flex-wrap gap-1">
            {installedSkills.map((s, i) => (
              <span key={i} className="text-[8px] px-2 py-0.5 rounded border border-[rgba(157,78,221,0.1)] text-[#ccccdd]">{s.icon} {s.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
