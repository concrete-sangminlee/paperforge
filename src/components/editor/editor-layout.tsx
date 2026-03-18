'use client';

import { useCallback } from 'react';
import { XIcon } from 'lucide-react';
import { FileTree } from './file-tree';
import { LaTeXEditor } from './latex-editor';
import { EditorToolbar } from './editor-toolbar';
import { CompilationLog } from './compilation-log';
import { PdfViewer } from './pdf-viewer';
import { useEditorStore } from '@/store/editor-store';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface FileEntry {
  id: string;
  path: string;
  mimeType: string | null;
  isBinary: boolean;
}

interface EditorLayoutProps {
  projectId: string;
  projectName: string;
  files: FileEntry[];
}

export function EditorLayout({ projectId, projectName, files }: EditorLayoutProps) {
  const { resolvedTheme } = useTheme();
  const { tabs, activeTab, setActiveTab, closeTab, markSaved } = useEditorStore();

  const activeTabData = tabs.find((t) => t.path === activeTab);

  const handleSave = useCallback(
    async (content: string) => {
      if (!activeTab) return;
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/files/${activeTab}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        if (res.ok) {
          markSaved(activeTab);
        } else {
          console.error('Save failed:', await res.text());
        }
      } catch (err) {
        console.error('Save error:', err);
      }
    },
    [activeTab, projectId, markSaved],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top toolbar */}
      <EditorToolbar projectId={projectId} />

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar – file tree */}
        <aside className="w-[200px] shrink-0 border-r bg-background">
          <FileTree projectId={projectId} files={files} />
        </aside>

        {/* Centre – tab bar + editor */}
        <div className="flex min-w-0 flex-1 flex-col border-r">
          {/* Tab bar */}
          <div className="flex items-end gap-0.5 overflow-x-auto border-b bg-muted/40 px-1 pt-1">
            {tabs.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Open a file from the sidebar
              </div>
            ) : (
              tabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => setActiveTab(tab.path)}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs transition-colors',
                    activeTab === tab.path
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted',
                  )}
                >
                  <span className="max-w-[140px] truncate">{tab.path}</span>
                  {tab.dirty && (
                    <span
                      className="size-1.5 rounded-full bg-amber-400"
                      aria-label="unsaved"
                    />
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Close ${tab.path}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.path);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        closeTab(tab.path);
                      }
                    }}
                    className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
                  >
                    <XIcon className="size-2.5" />
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Editor area */}
          <div className="min-h-0 flex-1">
            {activeTabData ? (
              <LaTeXEditor
                key={activeTabData.path}
                initialContent={activeTabData.content}
                filePath={activeTabData.path}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                onSave={handleSave}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <p className="font-medium">{projectName}</p>
                  <p className="mt-1 text-xs">Select a file to start editing</p>
                </div>
              </div>
            )}
          </div>

          {/* Compilation log – bottom panel */}
          <div className="h-40 shrink-0 border-t">
            <CompilationLog />
          </div>
        </div>

        {/* Right – PDF viewer */}
        <div className="w-[45%] shrink-0">
          <PdfViewer />
        </div>
      </div>
    </div>
  );
}
