'use client';

import { useState, useEffect, useRef } from 'react';
import { TargetIcon } from 'lucide-react';
import { useEditorStore } from '@/store/editor-store';
import { cn } from '@/lib/utils';

function getFileType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tex': return 'LaTeX';
    case 'bib': return 'BibTeX';
    case 'cls': return 'LaTeX Class';
    case 'sty': return 'LaTeX Style';
    case 'md': return 'Markdown';
    case 'json': return 'JSON';
    case 'txt': return 'Plain Text';
    default: return ext?.toUpperCase() ?? 'Text';
  }
}

interface DocStats {
  lines: number;
  words: number;
  chars: number;
}

function computeStats(content: string): DocStats {
  const lines = content.split('\n').length;
  const chars = content.length;
  // Strip LaTeX commands for more accurate word count
  const stripped = content
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ') // remove \commands{args}
    .replace(/[{}\\$%&_^~#]/g, '') // remove special chars
    .replace(/\s+/g, ' ');
  const words = stripped.trim() ? stripped.trim().split(/\s+/).length : 0;
  return { lines, chars, words };
}

export function EditorStatusBar() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const tabs = useEditorStore((s) => s.tabs);
  const fontSize = useEditorStore((s) => s.fontSize);
  const cursorLine = useEditorStore((s) => s.cursorLine);
  const cursorCol = useEditorStore((s) => s.cursorCol);
  const compilationDuration = useEditorStore((s) => s.compilationDuration);
  const compilationStatus = useEditorStore((s) => s.compilationStatus);

  const tabData = tabs.find((t) => t.path === activeTab);

  const [stats, setStats] = useState<DocStats | null>(null);
  const [wordGoal, setWordGoal] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load word goal from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('paperforge-word-goal');
    if (saved) setWordGoal(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (!tabData) { setStats(null); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStats(computeStats(tabData.content));
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [tabData?.content, tabData]);

  function handleSetGoal() {
    const num = parseInt(goalInput, 10);
    if (num > 0) {
      setWordGoal(num);
      localStorage.setItem('paperforge-word-goal', String(num));
    } else {
      setWordGoal(null);
      localStorage.removeItem('paperforge-word-goal');
    }
    setEditingGoal(false);
    setGoalInput('');
  }

  if (!tabData || !stats) return null;

  const goalProgress = wordGoal ? Math.min((stats.words / wordGoal) * 100, 100) : 0;
  const goalColor = goalProgress >= 100 ? 'bg-green-500' : goalProgress >= 75 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-3 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="font-medium">Ln {cursorLine}, Col {cursorCol}</span>
        <span className="text-border">|</span>
        <span>{getFileType(tabData.path)}</span>
        <span className="text-border">|</span>
        <span>{stats.lines} lines</span>
        <span className="text-border">|</span>
        <span>{stats.words} words</span>
        {wordGoal && (
          <span className="flex items-center gap-1">
            <span className="text-border">/</span>
            <span className={cn(
              goalProgress >= 100 ? 'text-green-500' : 'text-muted-foreground'
            )}>
              {wordGoal}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full transition-all', goalColor)} style={{ width: `${goalProgress}%` }} />
            </div>
          </span>
        )}
        <span className="text-border">|</span>
        <span>{stats.chars.toLocaleString()} chars</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Word goal toggle */}
        {editingGoal ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Goal"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSetGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
              className="h-4 w-16 rounded border bg-background px-1 text-[10px] outline-none"
              autoFocus
            />
            <button onClick={handleSetGoal} className="text-[10px] text-blue-500 hover:underline">Set</button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingGoal(true); setGoalInput(wordGoal?.toString() ?? ''); }}
            className="flex items-center gap-0.5 hover:text-foreground"
            title="Set word count goal"
          >
            <TargetIcon className="size-3" />
            Goal
          </button>
        )}
        {compilationStatus === 'success' && compilationDuration != null && (
          <>
            <span className="text-border">|</span>
            <span className="text-emerald-500">Compiled {(compilationDuration / 1000).toFixed(1)}s</span>
          </>
        )}
        <span className="text-border">|</span>
        <span>UTF-8</span>
        <span className="text-border">|</span>
        <span>{fontSize}px</span>
        {tabData.dirty && (
          <>
            <span className="text-border">|</span>
            <span className="text-amber-500">Modified</span>
          </>
        )}
      </div>
    </div>
  );
}
