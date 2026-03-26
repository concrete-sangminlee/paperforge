'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/store/editor-store';

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

export function EditorStatusBar() {
  const activeTab = useEditorStore((s) => s.activeTab);
  const tabs = useEditorStore((s) => s.tabs);
  const fontSize = useEditorStore((s) => s.fontSize);

  const tabData = tabs.find((t) => t.path === activeTab);

  const stats = useMemo(() => {
    if (!tabData) return null;
    const content = tabData.content;
    const lines = content.split('\n').length;
    const chars = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { lines, chars, words };
  }, [tabData]);

  if (!tabData || !stats) return null;

  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-3 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{getFileType(tabData.path)}</span>
        <span className="text-border">|</span>
        <span>{stats.lines} lines</span>
        <span className="text-border">|</span>
        <span>{stats.words} words</span>
        <span className="text-border">|</span>
        <span>{stats.chars.toLocaleString()} chars</span>
      </div>
      <div className="flex items-center gap-3">
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
