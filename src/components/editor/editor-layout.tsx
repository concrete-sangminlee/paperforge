'use client';

import { useCallback, useRef, useState } from 'react';
import { FileIcon, GitBranchIcon, HistoryIcon, XIcon } from 'lucide-react';
import { FileTree } from './file-tree';
import { LaTeXEditor } from './latex-editor';
import { EditorToolbar } from './editor-toolbar';
import { CompilationLog } from './compilation-log';
import { PdfViewer } from './pdf-viewer';
import { VersionHistory } from './version-history';
import { GitPanel } from './git-panel';
import { Collaborators } from './collaborators';
import { useEditorStore } from '@/store/editor-store';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { WebsocketProvider } from 'y-websocket';

interface FileEntry {
  id: string;
  path: string;
  mimeType: string | null;
  isBinary: boolean;
}

interface EditorLayoutProps {
  projectId: string;
  projectName: string;
  initialMainFile?: string;
  files: FileEntry[];
}

type RightPanel = 'pdf' | 'history' | 'git';

export function EditorLayout({ projectId, projectName, initialMainFile, files: initialFiles }: EditorLayoutProps) {
  const { resolvedTheme } = useTheme();
  const { tabs, activeTab, setActiveTab, closeTab, markSaved } = useEditorStore();
  const [files, setFiles] = useState<FileEntry[]>(initialFiles);
  const [mainFile, setMainFile] = useState(initialMainFile ?? 'main.tex');
  const [rightPanel, setRightPanel] = useState<RightPanel>('pdf');
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  const activeTabData = tabs.find((t) => t.path === activeTab);

  const handleProviderReady = useCallback((p: WebsocketProvider) => {
    providerRef.current = p;
    setProvider(p);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files`);
      if (res.ok) {
        const data = await res.json() as FileEntry[];
        setFiles(data);
      }
    } catch {
      // ignore
    }
  }, [projectId]);

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
      <div className="flex items-center justify-between border-b bg-background px-2">
        <EditorToolbar projectId={projectId} />
        <div className="flex items-center gap-2 px-2">
          {provider && <Collaborators provider={provider} />}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar – file tree */}
        <aside className="w-[200px] shrink-0 border-r bg-background">
          <FileTree
            projectId={projectId}
            files={files}
            mainFile={mainFile}
            onRefresh={() => void handleRefresh()}
            onMainFileChange={setMainFile}
          />
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
                projectId={projectId}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                onSave={handleSave}
                onProviderReady={handleProviderReady}
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

        {/* Right – switchable panel */}
        <div className="flex w-[45%] shrink-0 flex-col">
          {/* Panel tabs */}
          <div className="flex shrink-0 items-center gap-1 border-b bg-muted/40 px-2 py-1">
            <Button
              size="sm"
              variant={rightPanel === 'pdf' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('pdf')}
              aria-pressed={rightPanel === 'pdf'}
            >
              <FileIcon className="size-3.5" />
              PDF
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'history' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('history')}
              aria-pressed={rightPanel === 'history'}
            >
              <HistoryIcon className="size-3.5" />
              History
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'git' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('git')}
              aria-pressed={rightPanel === 'git'}
            >
              <GitBranchIcon className="size-3.5" />
              Git
            </Button>
          </div>

          {/* Panel content */}
          <div className="min-h-0 flex-1">
            {rightPanel === 'pdf' && <PdfViewer />}
            {rightPanel === 'history' && <VersionHistory projectId={projectId} />}
            {rightPanel === 'git' && <GitPanel projectId={projectId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
