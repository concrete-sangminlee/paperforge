'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileIcon, GitBranchIcon, HistoryIcon, XIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, ChevronDownIcon, ChevronUpIcon, FileTextIcon, CodeIcon, WifiOff } from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { WebsocketProvider } from 'y-websocket';
import { useOnlineStatus } from '@/hooks/use-online-status';

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

const AUTO_COMPILE_DEBOUNCE_MS = 2000;

export function EditorLayout({ projectId, projectName, initialMainFile, files: initialFiles }: EditorLayoutProps) {
  const { resolvedTheme } = useTheme();
  const { tabs, activeTab, setActiveTab, closeTab, markSaved, autoCompileEnabled, sidebarCollapsed, toggleSidebar, logPanelCollapsed, toggleLogPanel } = useEditorStore();
  const [files, setFiles] = useState<FileEntry[]>(initialFiles);
  const [mainFile, setMainFile] = useState(initialMainFile ?? 'main.tex');
  const [rightPanel, setRightPanel] = useState<RightPanel>('pdf');
  const [pdfRefreshKey, setPdfRefreshKey] = useState(0);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [wsConnected, setWsConnected] = useState(true);
  const isOnline = useOnlineStatus();

  const handleConnectionChange = useCallback((connected: boolean) => {
    setWsConnected(connected);
  }, []);

  // Stable ref to the compile function registered by EditorToolbar
  const compileFnRef = useRef<(() => Promise<void>) | null>(null);

  // Debounce timer for auto-compile
  const autoCompileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          toast.success('File saved');
        } else {
          console.error('Save failed:', await res.text());
          toast.error('Save failed');
        }
      } catch (err) {
        console.error('Save error:', err);
        toast.error('Save failed');
      }
    },
    [activeTab, projectId, markSaved],
  );

  /** Auto-save the active tab and then trigger compilation. */
  const triggerAutoCompile = useCallback(async () => {
    const state = useEditorStore.getState();
    const currentTab = state.activeTab;
    if (!currentTab) return;

    const tabData = state.tabs.find((t) => t.path === currentTab);
    if (!tabData) return;

    // Auto-save
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files/${currentTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tabData.content }),
      });
      if (res.ok) {
        useEditorStore.getState().markSaved(currentTab);
      }
    } catch (err) {
      console.error('Auto-save error:', err);
    }

    // Trigger compile via the registered compile function
    if (compileFnRef.current) {
      await compileFnRef.current();
      // Increment refreshKey so the PDF viewer reloads even if the URL is unchanged
      setPdfRefreshKey((k) => k + 1);
    }
  }, [projectId]);

  /** Schedule a debounced auto-compile after the latest keystroke. */
  const scheduleAutoCompile = useCallback(() => {
    if (!autoCompileEnabled) return;
    if (autoCompileTimer.current) clearTimeout(autoCompileTimer.current);
    autoCompileTimer.current = setTimeout(() => {
      void triggerAutoCompile();
    }, AUTO_COMPILE_DEBOUNCE_MS);
  }, [autoCompileEnabled, triggerAutoCompile]);

  // Watch the Zustand tabs array for dirty content changes and schedule auto-compile
  useEffect(() => {
    // Only react when there is an active dirty tab
    const state = useEditorStore.getState();
    const currentTab = state.activeTab;
    if (!currentTab) return;
    const tabData = state.tabs.find((t) => t.path === currentTab);
    if (tabData?.dirty) {
      scheduleAutoCompile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Depend on the content of the active tab so the effect fires on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    tabs.find((t) => t.path === activeTab)?.content,
    scheduleAutoCompile,
  ]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (autoCompileTimer.current) clearTimeout(autoCompileTimer.current);
    };
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useEditorStore.getState().hasUnsavedChanges()) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Offline / disconnected banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-4 py-1.5 text-xs text-red-600">
          <WifiOff className="size-3.5" />
          You are offline. Changes will sync when your internet connection is restored.
        </div>
      )}
      {isOnline && !wsConnected && (
        <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-600">
          <WifiOff className="size-3.5" />
          Connection lost. Changes will sync when reconnected.
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-2">
        <EditorToolbar
          projectId={projectId}
          projectName={projectName}
          onCompileReady={(fn) => { compileFnRef.current = fn; }}
        />
        <div className="flex items-center gap-2 px-2">
          {isOnline && wsConnected && (
            <div className="flex items-center gap-1.5 text-xs text-green-600" title="Connected">
              <span className="size-2 rounded-full bg-green-500" />
              Connected
            </div>
          )}
          {provider && <Collaborators provider={provider} />}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar – file tree */}
        <aside className={cn(
          'shrink-0 border-r bg-background transition-all duration-200',
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[220px]'
        )}>
          <FileTree
            projectId={projectId}
            files={files}
            mainFile={mainFile}
            onRefresh={() => void handleRefresh()}
            onMainFileChange={setMainFile}
          />
        </aside>

        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="flex w-5 shrink-0 items-center justify-center border-r bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpenIcon className="size-3" /> : <PanelLeftCloseIcon className="size-3" />}
        </button>

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
                onConnectionChange={handleConnectionChange}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted/50">
                    <CodeIcon className="size-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{projectName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Select a file from the sidebar to start editing</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/70">
                    <span className="flex items-center gap-1"><FileTextIcon className="size-3" /> {files.length} files</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compilation log – bottom panel */}
          <div className={cn('shrink-0 border-t transition-all duration-200', logPanelCollapsed ? 'h-8' : 'h-44')}>
            <div className="flex h-8 items-center justify-between border-b bg-muted/30 px-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Output</span>
              <button
                onClick={toggleLogPanel}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={logPanelCollapsed ? 'Expand log' : 'Collapse log'}
              >
                {logPanelCollapsed ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
              </button>
            </div>
            {!logPanelCollapsed && <CompilationLog />}
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
            {rightPanel === 'pdf' && <PdfViewer refreshKey={pdfRefreshKey} />}
            {rightPanel === 'history' && <VersionHistory projectId={projectId} />}
            {rightPanel === 'git' && <GitPanel projectId={projectId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
