'use client';

import { useOSStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderOpen, FileCode, FileText, Image, File,
  Search, Upload, Download, Trash2, Edit3, FilePlus,
  FolderPlus, RefreshCw, ChevronDown, ChevronRight,
  Sparkles, BookOpen, Brain, Copy, Save, X,
  GitBranch, AlertCircle, CheckCircle2, Eye,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Color Constants ───
const CYBER_GREEN = '#00ff88';
const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#E63946';
const CYBER_AMBER = '#FFB627';
const CYBER_PURPLE = '#9d4edd';
const GOOGLE_BLUE = '#4285f4';

// ─── Types ───
interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
  extension?: string;
  children?: FileEntry[];
  gitStatus?: 'modified' | 'untracked' | 'clean';
}

/* ═══════════════════════════════════════════════════════════
   FILE EXPLORER — Main Export
   ═══════════════════════════════════════════════════════════ */
export function FileExplorer() {
  const { addLog } = useOSStore();
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [fileMeta, setFileMeta] = useState<{ size: number; modified: string; type: string } | null>(null);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load directory listing
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gemini/files?action=list&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        const entries: FileEntry[] = (data.entries || []).map((e: FileEntry) => ({
          ...e,
          gitStatus: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'modified' : 'untracked') : 'clean',
          children: e.type === 'directory' ? [] : undefined,
        }));
        setFiles(prev => {
          // Update the tree: if root, replace; otherwise merge into the tree
          if (path === '/') return entries;
          return mergeIntoTree(prev, path, entries);
        });
        setCurrentPath(path);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to load directory');
        // Fallback to mock data
        setFiles(getMockFiles());
        setCurrentPath(path);
      }
    } catch {
      setError('Network error loading files');
      setFiles(getMockFiles());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load file content
  const loadFile = useCallback(async (file: FileEntry) => {
    setSelectedFile(file);
    setIsLoadingFile(true);
    setIsEdit(false);
    setAiResult(null);
    try {
      const res = await fetch(`/api/gemini/files?action=read&path=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || '');
        setEditContent(data.content || '');
        setFileMeta({
          size: data.size || file.size || 0,
          modified: data.modified ? new Date(data.modified).toLocaleString() : 'Unknown',
          type: file.extension || 'unknown',
        });
      } else {
        setFileContent(`// File: ${file.path}\n// Content not available in demo mode`);
        setEditContent(`// File: ${file.path}\n// Content not available in demo mode`);
        setFileMeta({ size: file.size || 0, modified: 'Unknown', type: file.extension || 'unknown' });
      }
    } catch {
      setFileContent(`// File: ${file.path}\n// Could not load file content`);
      setEditContent(`// File: ${file.path}\n// Could not load file content`);
      setFileMeta(null);
    } finally {
      setIsLoadingFile(false);
    }
  }, []);

  // Save file
  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch('/api/gemini/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path: selectedFile.path, content: editContent, createDirs: true }),
      });
      if (res.ok) {
        setFileContent(editContent);
        setIsEdit(false);
        addLog({
          id: `file-save-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          agent: 'FileExplorer',
          layer: 3,
          level: 'success',
          message: `Saved file: ${selectedFile.path}`,
        });
      }
    } catch {
      addLog({
        id: `file-save-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        agent: 'FileExplorer',
        layer: 3,
        level: 'error',
        message: `Failed to save file: ${selectedFile.path}`,
      });
    }
  }, [selectedFile, editContent, addLog]);

  // Delete file
  const deleteFile = useCallback(async (path: string) => {
    try {
      const res = await fetch('/api/gemini/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', path }),
      });
      if (res.ok) {
        loadDirectory(currentPath);
        if (selectedFile?.path === path) {
          setSelectedFile(null);
          setFileContent('');
        }
      }
    } catch {
      // Handle error silently
    }
  }, [currentPath, selectedFile, loadDirectory]);

  // Create new file
  const createNewFile = useCallback(async () => {
    if (!newItemName.trim()) return;
    const path = currentPath === '/' ? `/${newItemName}` : `${currentPath}/${newItemName}`;
    try {
      const res = await fetch('/api/gemini/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path, content: '', createDirs: true }),
      });
      if (res.ok) {
        loadDirectory(currentPath);
        setShowNewFile(false);
        setNewItemName('');
      }
    } catch {
      // Handle error
    }
  }, [newItemName, currentPath, loadDirectory]);

  // Create new folder
  const createNewFolder = useCallback(async () => {
    if (!newItemName.trim()) return;
    const path = currentPath === '/' ? `/${newItemName}` : `${currentPath}/${newItemName}`;
    try {
      const res = await fetch('/api/gemini/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mkdir', path, recursive: true }),
      });
      if (res.ok) {
        loadDirectory(currentPath);
        setShowNewFolder(false);
        setNewItemName('');
      }
    } catch {
      // Handle error
    }
  }, [newItemName, currentPath, loadDirectory]);

  // AI: Analyze File
  const analyzeFile = useCallback(async () => {
    if (!selectedFile) return;
    setIsAiProcessing(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', message: `Analyze the file ${selectedFile.path} with content:\n\n${fileContent.slice(0, 2000)}` }),
      });
      const data = await res.json();
      setAiResult(data.response || 'Analysis not available.');
    } catch {
      setAiResult('Failed to analyze file. AI service unavailable.');
    } finally {
      setIsAiProcessing(false);
    }
  }, [selectedFile, fileContent]);

  // AI: Summarize
  const summarizeFile = useCallback(async () => {
    if (!selectedFile) return;
    setIsAiProcessing(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'research', message: `Summarize the following file ${selectedFile.path}:\n\n${fileContent.slice(0, 2000)}` }),
      });
      const data = await res.json();
      setAiResult(data.response || 'Summary not available.');
    } catch {
      setAiResult('Failed to summarize. AI service unavailable.');
    } finally {
      setIsAiProcessing(false);
    }
  }, [selectedFile, fileContent]);

  // Search content across files
  const searchContent = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsAiProcessing(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/gemini/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', path: currentPath, pattern: searchQuery, maxDepth: 5 }),
      });
      const data = await res.json();
      const results = data.results || [];
      setAiResult(results.length > 0
        ? `Found ${results.length} matches:\n${results.slice(0, 10).map((r: FileEntry) => `  ${r.path} (${(r.size / 1024).toFixed(1)}KB)`).join('\n')}`
        : 'No files found matching the search query.'
      );
    } catch {
      setAiResult('Search failed. Service unavailable.');
    } finally {
      setIsAiProcessing(false);
    }
  }, [searchQuery, currentPath]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
    if (!expandedFolders.has(path)) {
      loadDirectory(path);
    }
  };

  // Breadcrumb segments
  const breadcrumbs = currentPath.split('/').filter(Boolean);

  // Initial load
  useEffect(() => {
    loadDirectory('/');
  }, [loadDirectory]);

  // File icon by type
  const getFileIcon = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      return expandedFolders.has(entry.path) ? FolderOpen : Folder;
    }
    const ext = entry.extension || entry.name.split('.').pop() || '';
    switch (ext) {
      case 'tsx': case 'ts': case 'jsx': case 'js': return FileCode;
      case 'css': case 'scss': case 'less': return FileCode;
      case 'png': case 'jpg': case 'gif': case 'svg': case 'ico': return Image;
      case 'md': case 'txt': case 'doc': case 'docx': return FileText;
      default: return File;
    }
  };

  const getFileIconColor = (entry: FileEntry) => {
    if (entry.type === 'directory') return CYBER_AMBER;
    const ext = entry.extension || entry.name.split('.').pop() || '';
    switch (ext) {
      case 'tsx': case 'ts': case 'jsx': case 'js': return CYBER_CYAN;
      case 'css': case 'scss': return CYBER_PURPLE;
      case 'png': case 'jpg': case 'gif': case 'svg': return CYBER_GREEN;
      case 'md': case 'txt': return GOOGLE_BLUE;
      case 'json': case 'yaml': case 'yml': return CYBER_AMBER;
      default: return '#8888aa';
    }
  };

  const renderFileTree = (entries: FileEntry[], depth = 0) => (
    <div style={{ paddingLeft: depth * 12 }}>
      {entries
        .filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(entry => {
          const Icon = getFileIcon(entry);
          const isExpanded = expandedFolders.has(entry.path);
          return (
            <div key={entry.path}>
              <button
                onClick={() => entry.type === 'directory' ? toggleFolder(entry.path) : loadFile(entry)}
                onDoubleClick={() => entry.type === 'directory' ? toggleFolder(entry.path) : undefined}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] transition-colors hover:bg-[rgba(157,78,221,0.08)] ${
                  selectedFile?.path === entry.path ? 'bg-[rgba(157,78,221,0.12)] text-white' : 'text-[#ccccdd]'
                }`}
              >
                {entry.type === 'directory' ? (
                  isExpanded ? <ChevronDown size={9} style={{ color: CYBER_AMBER }} /> : <ChevronRight size={9} style={{ color: CYBER_AMBER }} />
                ) : (
                  <span className="w-[9px]" />
                )}
                <Icon size={12} style={{ color: getFileIconColor(entry) }} />
                <span style={{ color: entry.type === 'directory' ? CYBER_AMBER : '#ccccdd' }}>{entry.name}</span>
                {entry.gitStatus === 'modified' && (
                  <span className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: CYBER_AMBER }} title="Modified" />
                )}
                {entry.gitStatus === 'untracked' && (
                  <span className="ml-auto text-[7px] font-mono" style={{ color: CYBER_RED }} title="Untracked">?</span>
                )}
              </button>
              {entry.type === 'directory' && isExpanded && entry.children && entry.children.length > 0 && renderFileTree(entry.children, depth + 1)}
              {entry.type === 'directory' && isExpanded && (!entry.children || entry.children.length === 0) && isLoading && (
                <div style={{ paddingLeft: 12 }} className="text-[9px] text-[#8888aa] flex items-center gap-1 py-1">
                  <RefreshCw size={8} className="animate-spin" /> Loading...
                </div>
              )}
            </div>
          );
        })}
    </div>
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const lineCount = fileContent.split('\n').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${CYBER_PURPLE}25, ${CYBER_PURPLE}08)`, border: `1px solid ${CYBER_PURPLE}25` }}>
            <Folder size={16} style={{ color: CYBER_PURPLE }} />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">File Explorer</h2>
            <div className="text-[10px] text-[#8888aa]">Browse, edit & analyze files</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => loadDirectory(currentPath)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-medium border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)] transition-colors">
            <RefreshCw size={9} /> Refresh
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(13,13,32,0.5)] overflow-x-auto">
        <button onClick={() => { setShowNewFile(true); setNewItemName(''); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors whitespace-nowrap">
          <FilePlus size={8} /> New File
        </button>
        <button onClick={() => { setShowNewFolder(true); setNewItemName(''); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(255,182,39,0.2)] text-[#FFB627] bg-[rgba(255,182,39,0.05)] hover:bg-[rgba(255,182,39,0.1)] transition-colors whitespace-nowrap">
          <FolderPlus size={8} /> New Folder
        </button>
        <button disabled={!selectedFile}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(66,133,244,0.2)] text-[#4285f4] bg-[rgba(66,133,244,0.05)] hover:bg-[rgba(66,133,244,0.1)] transition-colors disabled:opacity-30 whitespace-nowrap">
          <Upload size={8} /> Upload
        </button>
        <button disabled={!selectedFile}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,255,0.2)] text-[#00ffff] bg-[rgba(0,255,255,0.05)] hover:bg-[rgba(0,255,255,0.1)] transition-colors disabled:opacity-30 whitespace-nowrap">
          <Download size={8} /> Download
        </button>
        <button onClick={() => selectedFile && deleteFile(selectedFile.path)} disabled={!selectedFile}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(230,57,70,0.2)] text-[#E63946] bg-[rgba(230,57,70,0.05)] hover:bg-[rgba(230,57,70,0.1)] transition-colors disabled:opacity-30 whitespace-nowrap">
          <Trash2 size={8} /> Delete
        </button>
        <button disabled={!selectedFile}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(157,78,221,0.2)] text-[#9d4edd] bg-[rgba(157,78,221,0.05)] hover:bg-[rgba(157,78,221,0.1)] transition-colors disabled:opacity-30 whitespace-nowrap">
          <Edit3 size={8} /> Rename
        </button>
        <div className="flex-1" />
        <button onClick={searchContent} disabled={!searchQuery.trim() || isAiProcessing}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.05)] hover:bg-[rgba(0,255,136,0.1)] transition-colors disabled:opacity-30 whitespace-nowrap">
          {isAiProcessing ? <RefreshCw size={8} className="animate-spin" /> : <Search size={8} />} Search Content
        </button>
      </div>

      {/* New File/Folder Input */}
      <AnimatePresence>
        {(showNewFile || showNewFolder) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[rgba(157,78,221,0.1)]">
            <div className="px-4 py-2 bg-[rgba(18,18,42,0.4)] flex items-center gap-2">
              {showNewFile ? <FilePlus size={10} style={{ color: CYBER_GREEN }} /> : <FolderPlus size={10} style={{ color: CYBER_AMBER }} />}
              <span className="text-[9px] text-[#8888aa]">{showNewFile ? 'New File:' : 'New Folder:'}</span>
              <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (showNewFile) { createNewFile(); } else { createNewFolder(); } } }}
                placeholder={showNewFile ? 'filename.tsx' : 'folder-name'}
                className="flex-1 bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded px-2 py-1 text-[10px] text-white font-mono placeholder:text-[#666688] outline-none focus:border-[rgba(0,255,136,0.3)]"
                autoFocus />
              <button onClick={showNewFile ? createNewFile : createNewFolder}
                className="px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors">
                <CheckCircle2 size={9} />
              </button>
              <button onClick={() => { setShowNewFile(false); setShowNewFolder(false); }}
                className="p-1 text-[#8888aa] hover:text-[#ff4444] transition-colors">
                <X size={9} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        <div className="w-60 border-r border-[rgba(157,78,221,0.1)] flex flex-col">
          {/* Breadcrumb */}
          <div className="px-3 py-2 border-b border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
            <div className="flex items-center gap-1 text-[9px] overflow-x-auto custom-scrollbar">
              <button onClick={() => { setCurrentPath('/'); loadDirectory('/'); }}
                className="text-[#8888aa] hover:text-white transition-colors flex-shrink-0">/</button>
              {breadcrumbs.map((segment, i) => (
                <span key={i} className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[#666688]">/</span>
                  <button onClick={() => {
                    const newPath = '/' + breadcrumbs.slice(0, i + 1).join('/');
                    loadDirectory(newPath);
                  }}
                    className="text-[#8888aa] hover:text-white transition-colors">{segment}</button>
                </span>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-[rgba(157,78,221,0.08)]">
            <div className="relative">
              <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8888aa]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchContent()}
                placeholder="Search files..."
                className="w-full bg-[rgba(10,10,26,0.5)] border border-[rgba(157,78,221,0.15)] rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-white placeholder:text-[#666688] outline-none focus:border-[rgba(157,78,221,0.3)]" />
            </div>
          </div>

          {/* Tree */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {isLoading && files.length === 0 ? (
              <div className="flex items-center gap-2 text-[#8888aa] text-[10px] p-2">
                <RefreshCw size={10} className="animate-spin" /> Loading files...
              </div>
            ) : error && files.length === 0 ? (
              <div className="p-3 text-center">
                <AlertCircle size={20} className="mx-auto mb-2" style={{ color: CYBER_RED }} />
                <div className="text-[10px]" style={{ color: CYBER_RED }}>{error}</div>
                <button onClick={() => loadDirectory(currentPath)}
                  className="mt-2 px-3 py-1 rounded text-[9px] border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)] transition-colors">
                  Retry
                </button>
              </div>
            ) : files.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-[#8888aa]">
                <Folder size={20} className="mx-auto mb-2 opacity-50" />
                Empty directory
              </div>
            ) : (
              renderFileTree(files)
            )}
          </div>

          {/* AI Actions */}
          <div className="p-2 border-t border-[rgba(157,78,221,0.1)] flex items-center gap-1 flex-wrap">
            <button onClick={analyzeFile} disabled={!selectedFile || isAiProcessing}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(66,133,244,0.2)] text-[#4285f4] hover:bg-[rgba(66,133,244,0.1)] transition-colors disabled:opacity-30">
              {isAiProcessing ? <RefreshCw size={8} className="animate-spin" /> : <Sparkles size={8} />} Analyze
            </button>
            <button onClick={summarizeFile} disabled={!selectedFile || isAiProcessing}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors disabled:opacity-30">
              <BookOpen size={8} /> Summarize
            </button>
          </div>
        </div>

        {/* File Content Viewer */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              {/* File Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(157,78,221,0.1)] bg-[rgba(18,18,42,0.3)]">
                <div className="flex items-center gap-2">
                  {(() => { const Icon = getFileIcon(selectedFile); return <Icon size={12} style={{ color: getFileIconColor(selectedFile) }} />; })()}
                  <span className="text-[10px] text-[#ccccdd] font-mono">{selectedFile.path}</span>
                  {selectedFile.gitStatus === 'modified' && (
                    <span className="text-[7px] px-1.5 py-0.5 rounded font-mono border border-[rgba(255,182,39,0.3)]" style={{ color: CYBER_AMBER, background: `${CYBER_AMBER}10` }}>M</span>
                  )}
                  {selectedFile.gitStatus === 'untracked' && (
                    <span className="text-[7px] px-1.5 py-0.5 rounded font-mono border border-[rgba(230,57,70,0.3)]" style={{ color: CYBER_RED, background: `${CYBER_RED}10` }}>??</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={analyzeFile} disabled={isAiProcessing}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(66,133,244,0.2)] text-[#4285f4] hover:bg-[rgba(66,133,244,0.1)] transition-colors disabled:opacity-30">
                    <Brain size={8} /> Analyze
                  </button>
                  <button onClick={summarizeFile} disabled={isAiProcessing}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)] transition-colors disabled:opacity-30">
                    <BookOpen size={8} /> Summarize
                  </button>
                  <button onClick={() => setIsEdit(!isEdit)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border transition-colors ${isEdit ? 'border-[rgba(0,255,136,0.3)] text-[#00ff88] bg-[rgba(0,255,136,0.08)]' : 'border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)]'}`}>
                    <Edit3 size={8} /> {isEdit ? 'View' : 'Edit'}
                  </button>
                  {isEdit && (
                    <button onClick={saveFile}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(0,255,136,0.2)] text-[#00ff88] bg-[rgba(0,255,136,0.08)] hover:bg-[rgba(0,255,136,0.15)] transition-colors">
                      <Save size={8} /> Save
                    </button>
                  )}
                  <button onClick={() => navigator.clipboard.writeText(fileContent)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-medium border border-[rgba(157,78,221,0.2)] text-[#9d4edd] hover:bg-[rgba(157,78,221,0.1)] transition-colors">
                    <Copy size={8} /> Copy
                  </button>
                </div>
              </div>

              {/* File Metadata */}
              {fileMeta && (
                <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[rgba(157,78,221,0.08)] bg-[rgba(10,10,26,0.3)]">
                  <span className="text-[8px] text-[#8888aa]">Size: <span style={{ color: CYBER_CYAN }}>{formatSize(fileMeta.size)}</span></span>
                  <span className="text-[8px] text-[#8888aa]">Modified: <span style={{ color: CYBER_CYAN }}>{fileMeta.modified}</span></span>
                  <span className="text-[8px] text-[#8888aa]">Type: <span style={{ color: CYBER_CYAN }}>{fileMeta.type}</span></span>
                  <span className="text-[8px] text-[#8888aa]">Lines: <span style={{ color: CYBER_CYAN }}>{lineCount}</span></span>
                </div>
              )}

              {/* Code Display */}
              <div className="flex-1 overflow-auto bg-[#0a0a1a]">
                {isLoadingFile ? (
                  <div className="flex items-center gap-2 text-[#8888aa] text-[10px] p-4">
                    <RefreshCw size={10} className="animate-spin" /> Loading file...
                  </div>
                ) : isEdit ? (
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full bg-transparent p-3 text-[10px] text-[#ccccdd] font-mono resize-none outline-none leading-relaxed" />
                ) : (
                  <div className="flex">
                    {/* Line numbers */}
                    <div className="flex-shrink-0 py-3 px-2 text-right select-none border-r border-[rgba(157,78,221,0.08)]" style={{ minWidth: '3em' }}>
                      {fileContent.split('\n').map((_, i) => (
                        <div key={i} className="text-[10px] font-mono leading-relaxed" style={{ color: '#444466' }}>{i + 1}</div>
                      ))}
                    </div>
                    <pre className="flex-1 p-3 text-[10px] text-[#ccccdd] font-mono whitespace-pre-wrap leading-relaxed">{fileContent}</pre>
                  </div>
                )}
              </div>

              {/* AI Result Panel */}
              <AnimatePresence>
                {aiResult && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-[rgba(66,133,244,0.15)] max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="bg-[rgba(18,18,42,0.6)] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Brain size={10} style={{ color: GOOGLE_BLUE }} />
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: GOOGLE_BLUE }}>AI Analysis</span>
                        </div>
                        <button onClick={() => setAiResult(null)} className="text-[#8888aa] hover:text-[#ff4444] transition-colors">
                          <X size={9} />
                        </button>
                      </div>
                      <pre className="text-[10px] text-[#ccccdd] font-mono whitespace-pre-wrap">{aiResult}</pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Folder size={32} className="mx-auto mb-3 text-[#8888aa] opacity-40" />
                <div className="text-white text-xs font-semibold mb-1">No File Selected</div>
                <div className="text-[10px] text-[#8888aa] mb-3">Click on any file in the tree to view its content</div>
                <div className="flex items-center gap-2 justify-center text-[9px] text-[#666688]">
                  <span className="flex items-center gap-1"><GitBranch size={8} /> Git status indicators</span>
                  <span className="flex items-center gap-1"><Sparkles size={8} /> AI-powered analysis</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───
function mergeIntoTree(tree: FileEntry[], targetPath: string, newEntries: FileEntry[]): FileEntry[] {
  return tree.map(entry => {
    if (entry.type === 'directory' && entry.path === targetPath) {
      return { ...entry, children: newEntries };
    }
    if (entry.type === 'directory' && entry.children && targetPath.startsWith(entry.path)) {
      return { ...entry, children: mergeIntoTree(entry.children, targetPath, newEntries) };
    }
    return entry;
  });
}

function getMockFiles(): FileEntry[] {
  return [
    { name: 'src', path: 'src', type: 'directory', gitStatus: 'clean', children: [
      { name: 'app', path: 'src/app', type: 'directory', gitStatus: 'clean', children: [
        { name: 'page.tsx', path: 'src/app/page.tsx', type: 'file', extension: '.tsx', size: 2048, modified: Date.now(), gitStatus: 'modified' },
        { name: 'layout.tsx', path: 'src/app/layout.tsx', type: 'file', extension: '.tsx', size: 1536, modified: Date.now(), gitStatus: 'clean' },
        { name: 'globals.css', path: 'src/app/globals.css', type: 'file', extension: '.css', size: 512, modified: Date.now(), gitStatus: 'clean' },
      ]},
      { name: 'components', path: 'src/components', type: 'directory', gitStatus: 'clean', children: [
        { name: 'dashboard.tsx', path: 'src/components/dashboard.tsx', type: 'file', extension: '.tsx', size: 4096, modified: Date.now(), gitStatus: 'untracked' },
        { name: 'file-explorer.tsx', path: 'src/components/file-explorer.tsx', type: 'file', extension: '.tsx', size: 8192, modified: Date.now(), gitStatus: 'modified' },
      ]},
      { name: 'lib', path: 'src/lib', type: 'directory', gitStatus: 'clean', children: [
        { name: 'store.ts', path: 'src/lib/store.ts', type: 'file', extension: '.ts', size: 6144, modified: Date.now(), gitStatus: 'clean' },
        { name: 'utils.ts', path: 'src/lib/utils.ts', type: 'file', extension: '.ts', size: 256, modified: Date.now(), gitStatus: 'clean' },
      ]},
    ]},
    { name: 'package.json', path: 'package.json', type: 'file', extension: '.json', size: 1024, modified: Date.now(), gitStatus: 'modified' },
    { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', extension: '.json', size: 768, modified: Date.now(), gitStatus: 'clean' },
    { name: 'next.config.ts', path: 'next.config.ts', type: 'file', extension: '.ts', size: 256, modified: Date.now(), gitStatus: 'clean' },
    { name: 'README.md', path: 'README.md', type: 'file', extension: '.md', size: 3072, modified: Date.now(), gitStatus: 'untracked' },
  ];
}
