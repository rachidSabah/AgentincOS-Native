'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, FolderTree, Save, History, Download, Copy, Edit3, Eye, X, ChevronRight, ChevronDown, RefreshCw, Plus, Package, FileText, Code, Image, GitBranch, ArrowLeft } from 'lucide-react';

type ArtifactFile = { path: string; content: string; language: string; version: number; history: { content: string; timestamp: number }[] };
type ArtifactProject = { id: string; name: string; type: string; files: ArtifactFile[]; createdAt: number; updatedAt: number };

interface Props {
  artifacts: { language: string; code: string; title?: string }[];
  onClear: () => void;
}

export function ArtifactPanel({ artifacts, onClear }: Props) {
  const [projects, setProjects] = useState<ArtifactProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'editor' | 'preview'>('tree');

  // Auto-convert artifacts to projects
  useEffect(() => {
    if (artifacts.length === 0) return;
    const last = artifacts[artifacts.length - 1];
    if (projects.find(p => p.id === last.title)) return;
    
    // Detect if this is a multi-file project (has file paths in content)
    const fileMatches = last.code.match(/\/{2,}\s*FILE:\s*(.+?)(?:\n|$)/g) || [];
    const phpMatches = last.code.match(/\/\/\s*FILE:\s*(.+?)(?:\n|$)/g) || [];
    const allMatches = [...fileMatches, ...phpMatches];
    
    if (allMatches.length > 1) {
      // Multi-file project
      const files: ArtifactFile[] = [];
      let currentFile = '';
      let currentContent = '';
      const lines = last.code.split('\n');
      
      for (const line of lines) {
        const fileMatch = line.match(/\/{2,}\s*FILE:\s*(.+?)$/) || line.match(/\/\/\s*FILE:\s*(.+?)$/);
        if (fileMatch) {
          if (currentFile && currentContent.trim()) {
            files.push({ path: currentFile, content: currentContent.trim(), language: detectLang(currentFile), version: 1, history: [] });
          }
          currentFile = fileMatch[1].trim();
          currentContent = '';
        } else if (currentFile) {
          currentContent += line + '\n';
        }
      }
      if (currentFile && currentContent.trim()) {
        files.push({ path: currentFile, content: currentContent.trim(), language: detectLang(currentFile), version: 1, history: [] });
      }
      
      if (files.length > 0) {
        setProjects(prev => [...prev, { id: last.title || `project-${Date.now()}`, name: last.title || 'Untitled Project', type: detectType(files), files, createdAt: Date.now(), updatedAt: Date.now() }]);
      }
    } else {
      // Single file artifact
      const file: ArtifactFile = { path: last.title || `file-${Date.now()}.${extForLang(last.language)}`, content: last.code, language: last.language, version: 1, history: [] };
      setProjects(prev => [...prev, { id: `single-${Date.now()}`, name: file.path, type: 'single', files: [file], createdAt: Date.now(), updatedAt: Date.now() }]);
    }
  }, [artifacts]);

  const project = projects.find(p => p.id === selectedProject);
  const file = selectedFile ? project?.files.find(f => f.path === selectedFile) : null;

  const handleSave = useCallback(() => {
    if (!file || !project) return;
    setProjects(prev => prev.map(p => p.id === project.id ? {
      ...p, updatedAt: Date.now(),
      files: p.files.map(f => f.path === file.path ? {
        ...f, content: editContent, version: f.version + 1,
        history: [...f.history, { content: f.content, timestamp: Date.now() }].slice(-20),
      } : f),
    } : p));
    setIsEditing(false);
  }, [file, project, editContent]);

  const handleExport = useCallback(() => {
    if (!project) return;
    let zipContent = '';
    for (const f of project.files) {
      zipContent += `// ===== ${f.path} =====\n${f.content}\n\n`;
    }
    const blob = new Blob([zipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
    a.click(); URL.revokeObjectURL(url);
  }, [project]);

  const getFolderTree = (files: ArtifactFile[]) => {
    const tree: Record<string, any> = {};
    for (const f of files) {
      const parts = f.path.split('/');
      let current = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = f;
    }
    return tree;
  };

  const renderTree = (tree: Record<string, any>, prefix: string = '') => {
    return Object.entries(tree).map(([key, value]) => {
      const fullPath = prefix ? `${prefix}/${key}` : key;
      if (value.content !== undefined) {
        return (
          <div key={fullPath} onClick={() => { setSelectedFile(fullPath); setViewMode('editor'); setEditContent(value.content); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] cursor-pointer hover:bg-[rgba(66,133,244,0.08)] ${selectedFile === fullPath ? 'bg-[rgba(66,133,244,0.1)] text-[#4285f4]' : 'text-[#ccccdd]'}`}>
            <FileIcon name={key} /> {key}
          </div>
        );
      }
      const isExpanded = expandedFolders.has(fullPath);
      return (
        <div key={fullPath}>
          <div onClick={() => setExpandedFolders(prev => { const next = new Set(prev); isExpanded ? next.delete(fullPath) : next.add(fullPath); return next; })}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] cursor-pointer hover:bg-[rgba(66,133,244,0.05)] text-[#8888aa]">
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <FolderTree size={10} style={{ color: '#FFB627' }} /> {key}
          </div>
          {isExpanded && <div className="ml-3">{renderTree(value, fullPath)}</div>}
        </div>
      );
    });
  };

  if (projects.length === 0 && artifacts.length === 0) return null;

  return (
    <div className="border-t border-[rgba(157,78,221,0.1)] bg-[rgba(10,10,26,0.3)] flex flex-col" style={{ maxHeight: '50vh' }}>
      <div className="flex items-center px-3 py-1.5 border-b border-[rgba(157,78,221,0.1)] gap-2">
        <Package size={10} style={{ color: '#9d4edd' }} />
        <span className="text-[9px] text-white font-bold uppercase tracking-wider">Artifacts</span>
        <span className="text-[8px] text-[#8888aa]">{projects.length} projects</span>
        <div className="ml-auto flex gap-1">
          {project && <button onClick={handleExport} className="text-[8px] px-2 py-0.5 rounded border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.1)]"><Download size={8} /> Export</button>}
          <button onClick={onClear} className="text-[8px] px-2 py-0.5 rounded border border-[rgba(255,68,68,0.2)] text-[#ff6666] hover:bg-[rgba(255,68,68,0.1)]"><X size={8} /> Clear</button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Project List / File Tree */}
        <div className="w-48 border-r border-[rgba(157,78,221,0.1)] overflow-y-auto custom-scrollbar p-1">
          {!selectedProject ? (
            projects.map(p => (
              <div key={p.id} onClick={() => setSelectedProject(p.id)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[9px] cursor-pointer hover:bg-[rgba(157,78,221,0.08)] text-[#ccccdd]">
                <Package size={10} style={{ color: '#9d4edd' }} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{p.name}</div>
                  <div className="text-[7px] text-[#8888aa]">{p.files.length} files · {p.type}</div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div onClick={() => { setSelectedProject(null); setSelectedFile(null); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] cursor-pointer hover:bg-[rgba(157,78,221,0.08)] text-[#9d4edd] mb-1">
                <ArrowLeft size={10} /> Back
              </div>
              <div className="text-[8px] text-[#8888aa] uppercase px-2 mb-1">{project?.name}</div>
              {project && renderTree(getFolderTree(project.files))}
            </>
          )}
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {file ? (
            <>
              <div className="flex items-center px-2 py-1 border-b border-[rgba(157,78,221,0.1)] gap-1 bg-[rgba(18,18,42,0.5)]">
                <FileIcon name={file.path} />
                <span className="text-[9px] text-[#ccccdd] font-mono truncate">{file.path}</span>
                <span className="text-[7px] text-[#8888aa]">v{file.version}</span>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => setViewMode('editor')} className={`text-[7px] px-1.5 py-0.5 rounded ${viewMode === 'editor' ? 'bg-[rgba(66,133,244,0.2)] text-[#4285f4]' : 'text-[#8888aa]'}`}><Edit3 size={8} /> Edit</button>
                  <button onClick={() => setViewMode('preview')} className={`text-[7px] px-1.5 py-0.5 rounded ${viewMode === 'preview' ? 'bg-[rgba(66,133,244,0.2)] text-[#4285f4]' : 'text-[#8888aa]'}`}><Eye size={8} /> Preview</button>
                  {isEditing && <button onClick={handleSave} className="text-[7px] px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.2)] text-[#00ff88]"><Save size={8} /> Save</button>}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {viewMode === 'editor' ? (
                  <textarea value={editContent || file.content} onChange={e => { setEditContent(e.target.value); setIsEditing(true); }}
                    className="w-full h-full bg-[rgba(10,10,26,0.8)] text-[10px] text-[#ccccdd] font-mono p-3 resize-none outline-none border-0 custom-scrollbar" spellCheck={false} />
                ) : (
                  <pre className="w-full h-full overflow-auto custom-scrollbar p-3 text-[10px] text-[#ccccdd] font-mono whitespace-pre-wrap bg-[rgba(10,10,26,0.5)]">
                    {file.content.slice(0, 10000)}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#8888aa] text-[9px]">
              Select a file to view or edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'css') return <Code size={10} style={{ color: '#38bdf8' }} />;
  if (ext === 'php') return <Code size={10} style={{ color: '#7b8cff' }} />;
  if (ext === 'js' || ext === 'ts') return <Code size={10} style={{ color: '#f7df1e' }} />;
  if (ext === 'json') return <Code size={10} style={{ color: '#f59e0b' }} />;
  if (ext === 'md') return <FileText size={10} style={{ color: '#8888aa' }} />;
  return <FileText size={10} style={{ color: '#ccccdd' }} />;
}

function detectLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = { php: 'php', css: 'css', js: 'javascript', ts: 'typescript', json: 'json', md: 'markdown', html: 'html', py: 'python' };
  return map[ext || ''] || 'text';
}

function extForLang(lang: string): string {
  const map: Record<string, string> = { php: 'php', css: 'css', javascript: 'js', typescript: 'ts', json: 'json', markdown: 'md', html: 'html', python: 'py' };
  return map[lang] || 'txt';
}

function detectType(files: ArtifactFile[]): string {
  const paths = files.map(f => f.path.toLowerCase());
  if (paths.some(p => p.includes('wp-content') || p.includes('wordpress') || p.includes('style.css'))) return 'WordPress Theme';
  if (paths.some(p => p.includes('package.json'))) return 'Node.js App';
  if (paths.some(p => p.includes('composer.json'))) return 'PHP App';
  if (paths.some(p => p.includes('.py'))) return 'Python App';
  return 'Project';
}
