'use client';

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { FileIcon, GitBranchIcon, HistoryIcon, XIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, ChevronDownIcon, ChevronUpIcon, FileTextIcon, CodeIcon, WifiOff, ListTreeIcon, LoaderCircleIcon, SigmaIcon, BookOpenIcon, FunctionSquareIcon, SparklesIcon, TableIcon, BarChart3Icon, DiffIcon } from 'lucide-react';
import { FileTree } from './file-tree';
import { LaTeXEditor } from './latex-editor';
import { EditorToolbar } from './editor-toolbar';
import { CompilationLog } from './compilation-log';
import { EditorStatusBar } from './editor-status-bar';
import { FindInProject } from './find-in-project';
import { PdfViewer } from './pdf-viewer';
import { Collaborators } from './collaborators';

// Lazy-load right-panel components for code splitting
const VersionHistory = lazy(() => import('./version-history').then(m => ({ default: m.VersionHistory })));
const GitPanel = lazy(() => import('./git-panel').then(m => ({ default: m.GitPanel })));
const DocumentOutline = lazy(() => import('./document-outline').then(m => ({ default: m.DocumentOutline })));
const SymbolPicker = lazy(() => import('./symbol-picker').then(m => ({ default: m.SymbolPicker })));
const CitationPicker = lazy(() => import('./citation-picker').then(m => ({ default: m.CitationPicker })));
const MathPreview = lazy(() => import('./math-preview').then(m => ({ default: m.MathPreview })));
const AiAssistant = lazy(() => import('./ai-assistant').then(m => ({ default: m.AiAssistant })));
const OnboardingTips = lazy(() => import('./onboarding-tips').then(m => ({ default: m.OnboardingTips })));
const TableGenerator = lazy(() => import('./table-generator').then(m => ({ default: m.TableGenerator })));
const EquationBuilder = lazy(() => import('./equation-builder').then(m => ({ default: m.EquationBuilder })));
const DocumentStats = lazy(() => import('./document-stats').then(m => ({ default: m.DocumentStats })));
const ShareSnippet = lazy(() => import('./share-snippet').then(m => ({ default: m.ShareSnippet })));
import { RecoveryBanner } from './recovery-banner';
const DiffViewer = lazy(() => import('./diff-viewer').then(m => ({ default: m.DiffViewer })));
const LaTeXReference = lazy(() => import('./latex-reference').then(m => ({ default: m.LaTeXReference })));
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
  sizeBytes?: number;
}

interface EditorLayoutProps {
  projectId: string;
  projectName: string;
  initialMainFile?: string;
  files: FileEntry[];
  gitRemoteUrl?: string;
}

type RightPanel = 'pdf' | 'history' | 'git' | 'outline' | 'symbols' | 'cite' | 'math' | 'ai' | 'table' | 'equation' | 'stats' | 'diff' | 'ref';

import { EDITOR } from '@/lib/constants';
const AUTO_COMPILE_DEBOUNCE_MS = EDITOR.AUTO_COMPILE_DEBOUNCE_MS;

export function EditorLayout({ projectId, projectName, initialMainFile, files: initialFiles, gitRemoteUrl }: EditorLayoutProps) {
  const { resolvedTheme } = useTheme();
  const { tabs, activeTab, setActiveTab, closeTab, closeOtherTabs, closeAllTabs, markSaved, autoCompileEnabled, sidebarCollapsed, toggleSidebar, logPanelCollapsed, toggleLogPanel } = useEditorStore();
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>(initialFiles);
  const [mainFile, setMainFile] = useState(initialMainFile ?? 'main.tex');
  const [rightPanel, setRightPanel] = useState<RightPanel>('pdf');
  const [focusMode, setFocusMode] = useState(false);
  const focusModeRef = useRef(false);
  // Keep ref in sync so the keydown handler (registered once) reads the latest value
  useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);
  const [pdfRefreshKey, setPdfRefreshKey] = useState(0);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [wsConnected, setWsConnected] = useState(true);
  const isOnline = useOnlineStatus();

  const handleConnectionChange = useCallback((connected: boolean) => {
    setWsConnected(connected);
  }, []);

  // Track recent project access
  useEffect(() => {
    import('@/lib/recent-projects').then(({ trackProjectAccess }) => {
      trackProjectAccess(projectId, projectName);
    });
  }, [projectId, projectName]);

  // Stable ref to the compile function registered by EditorToolbar
  const compileFnRef = useRef<(() => Promise<void>) | null>(null);

  // Debounce timer for auto-compile
  const autoCompileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTabData = tabs.find((t) => t.path === activeTab);
  const openFile = useEditorStore((s) => s.openFile);

  // Auto-open the main file on first load if no tabs are open
  useEffect(() => {
    if (tabs.length === 0 && files.length > 0) {
      const main = files.find((f) => f.path === mainFile) ?? files.find((f) => f.path.endsWith('.tex')) ?? files[0];
      if (main && !main.isBinary) {
        fetch(`/api/v1/projects/${projectId}/files/${main.path}`)
          .then((r) => r.json())
          .then((data) => {
            const content = data.data?.content ?? data.content ?? '';
            openFile(main.path, content);
          })
          .catch(() => {
            openFile(main.path, '');
          });
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProviderReady = useCallback((p: WebsocketProvider) => {
    providerRef.current = p;
    setProvider(p);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files`);
      if (res.ok) {
        const result = await res.json();
        const data = (result.data ?? result) as FileEntry[];
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

  // Ctrl+Shift+F or command palette event to open Find in Project
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setFindOpen(true);
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab to cycle tabs
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const t = useEditorStore.getState().tabs;
        const active = useEditorStore.getState().activeTab;
        if (t.length < 2) return;
        const idx = t.findIndex((x) => x.path === active);
        const next = e.shiftKey
          ? (idx - 1 + t.length) % t.length
          : (idx + 1) % t.length;
        setActiveTab(t[next].path);
        return;
      }
      // Ctrl+1-9 to jump to tab by position
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        const t = useEditorStore.getState().tabs;
        const idx = parseInt(e.key, 10) - 1;
        if (idx < t.length) {
          e.preventDefault();
          setActiveTab(t[idx].path);
        }
      }
      // Escape to exit focus mode (use ref to avoid stale closure)
      if (e.key === 'Escape' && focusModeRef.current) {
        setFocusMode(false);
        return;
      }
      // F11 to toggle focus mode
      if (e.key === 'F11') {
        e.preventDefault();
        setFocusMode(f => !f);
        return;
      }
      // Ctrl+Shift+C to compile
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        if (compileFnRef.current) {
          void compileFnRef.current();
          setPdfRefreshKey((k) => k + 1);
        }
        return;
      }
      // Ctrl+J to toggle log panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        toggleLogPanel();
        return;
      }
      // Ctrl+\ to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // Ctrl+N to create new file
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('new-file'));
        return;
      }
      // Ctrl+W to close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        const active = useEditorStore.getState().activeTab;
        if (active) closeTab(active);
        return;
      }
      // Ctrl+= / Ctrl+- to zoom editor font
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const s = useEditorStore.getState();
        s.setFontSize(Math.min(32, s.fontSize + 1));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        const s = useEditorStore.getState();
        s.setFontSize(Math.max(8, s.fontSize - 1));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        useEditorStore.getState().setFontSize(14);
      }
    }
    function handleFindEvent() { setFindOpen(true); }
    function handleCompileEvent() {
      if (compileFnRef.current) {
        void compileFnRef.current();
        setPdfRefreshKey((k) => k + 1);
      }
    }
    function handleOpenFileAtLine(e: Event) {
      const { path: filePath, line } = (e as CustomEvent<{ path: string; line: number }>).detail;
      // Try to open the file from the project and jump to line
      const existingTab = useEditorStore.getState().tabs.find((t) => t.path === filePath || t.path.endsWith(filePath));
      if (existingTab) {
        setActiveTab(existingTab.path);
        setTimeout(() => window.dispatchEvent(new CustomEvent('editor-goto-line', { detail: line })), 100);
      } else {
        // Fetch file content and open it
        fetch(`/api/v1/projects/${projectId}/files/${filePath}`)
          .then((r) => r.json())
          .then((data) => {
            const content = data.data?.content ?? data.content ?? '';
            openFile(filePath, content);
            setTimeout(() => window.dispatchEvent(new CustomEvent('editor-goto-line', { detail: line })), 200);
          })
          .catch(() => {
            // File might not exist — just jump to line in current file
            window.dispatchEvent(new CustomEvent('editor-goto-line', { detail: line }));
          });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('find-in-files', handleFindEvent);
    window.addEventListener('latex-compile', handleCompileEvent);
    window.addEventListener('editor-open-file-at-line', handleOpenFileAtLine);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('find-in-files', handleFindEvent);
      window.removeEventListener('latex-compile', handleCompileEvent);
      window.removeEventListener('editor-open-file-at-line', handleOpenFileAtLine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {/* Recovery banner for crashed sessions */}
      <RecoveryBanner />
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
      <div className={cn('flex items-center justify-between border-b bg-background px-2', focusMode && 'hidden')}>
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
          (sidebarCollapsed || focusMode) ? 'w-0 overflow-hidden' : 'w-[220px]'
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
                  onMouseDown={(e) => {
                    // Middle-click to close tab
                    if (e.button === 1) { e.preventDefault(); closeTab(tab.path); }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTabContextMenu({ x: e.clientX, y: e.clientY, path: tab.path });
                  }}
                  title={tab.path}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs transition-colors',
                    activeTab === tab.path
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted',
                  )}
                >
                  <TabFileIcon path={tab.path} />
                  <span className="max-w-[140px] truncate">{tab.path.split('/').pop()}</span>
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

          {/* Tab context menu */}
          {tabContextMenu && (
            <TabContextMenu
              x={tabContextMenu.x}
              y={tabContextMenu.y}
              onClose={() => setTabContextMenu(null)}
              actions={[
                { label: 'Close', onAction: () => { closeTab(tabContextMenu.path); setTabContextMenu(null); } },
                { label: 'Close Others', onAction: () => { closeOtherTabs(tabContextMenu.path); setTabContextMenu(null); } },
                { label: 'Close All', onAction: () => { closeAllTabs(); setTabContextMenu(null); }, destructive: true },
              ]}
            />
          )}

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

          {/* Editor status bar */}
          <EditorStatusBar />

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
        <div className={cn('flex w-[45%] shrink-0 flex-col', focusMode && 'hidden')}>
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
            <Button
              size="sm"
              variant={rightPanel === 'outline' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('outline')}
              aria-pressed={rightPanel === 'outline'}
            >
              <ListTreeIcon className="size-3.5" />
              Outline
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'symbols' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('symbols')}
              aria-pressed={rightPanel === 'symbols'}
            >
              <SigmaIcon className="size-3.5" />
              Symbols
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'cite' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('cite')}
              aria-pressed={rightPanel === 'cite'}
            >
              <BookOpenIcon className="size-3.5" />
              Cite
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'math' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('math')}
              aria-pressed={rightPanel === 'math'}
            >
              <FunctionSquareIcon className="size-3.5" />
              Math
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'ai' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('ai')}
              aria-pressed={rightPanel === 'ai'}
            >
              <SparklesIcon className="size-3.5 text-orange-500" />
              AI
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'table' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('table')}
              aria-pressed={rightPanel === 'table'}
            >
              <TableIcon className="size-3.5" />
              Table
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'equation' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('equation')}
              aria-pressed={rightPanel === 'equation'}
            >
              <FunctionSquareIcon className="size-3.5" />
              Eq
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'stats' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('stats')}
              aria-pressed={rightPanel === 'stats'}
            >
              <BarChart3Icon className="size-3.5" />
              Stats
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'diff' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('diff')}
              aria-pressed={rightPanel === 'diff'}
            >
              <DiffIcon className="size-3.5" />
              Diff
            </Button>
            <Button
              size="sm"
              variant={rightPanel === 'ref' ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setRightPanel('ref')}
              aria-pressed={rightPanel === 'ref'}
            >
              <BookOpenIcon className="size-3.5" />
              Ref
            </Button>
          </div>

          {/* Panel content */}
          <div className="min-h-0 flex-1">
            {rightPanel === 'pdf' && <PdfViewer refreshKey={pdfRefreshKey} projectName={projectName} />}
            <Suspense fallback={<div className="flex h-full items-center justify-center"><LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" /></div>}>
              {rightPanel === 'history' && <VersionHistory projectId={projectId} />}
              {rightPanel === 'git' && <GitPanel projectId={projectId} remoteUrl={gitRemoteUrl} />}
              {rightPanel === 'outline' && <DocumentOutline />}
              {rightPanel === 'symbols' && <SymbolPicker />}
              {rightPanel === 'cite' && <CitationPicker />}
              {rightPanel === 'math' && <MathPreview />}
              {rightPanel === 'ai' && <AiAssistant />}
              {rightPanel === 'table' && <TableGenerator />}
              {rightPanel === 'equation' && <EquationBuilder />}
              {rightPanel === 'stats' && <DocumentStats />}
              {rightPanel === 'diff' && <DiffViewer />}
              {rightPanel === 'ref' && <LaTeXReference />}
            </Suspense>
          </div>
        </div>
      </div>

      {/* Find in Project dialog */}
      <FindInProject projectId={projectId} open={findOpen} onOpenChange={setFindOpen} />

      {/* Share snippet dialog */}
      <Suspense fallback={null}>
        <ShareSnippet />
      </Suspense>

      {/* First-time user onboarding */}
      <Suspense fallback={null}>
        <OnboardingTips />
      </Suspense>
    </div>
  );
}

function TabFileIcon({ path }: { path: string }) {
  const ext = path.split('.').pop()?.toLowerCase();
  const cls = 'size-3 shrink-0';
  switch (ext) {
    case 'tex': case 'ltx': return <FileTextIcon className={`${cls} text-blue-500`} />;
    case 'bib': case 'bst': return <BookOpenIcon className={`${cls} text-amber-500`} />;
    case 'cls': case 'sty': return <CodeIcon className={`${cls} text-purple-500`} />;
    default: return <FileIcon className={`${cls} text-muted-foreground`} />;
  }
}

/* ---------- Accessible tab context menu with keyboard navigation ---------- */
interface ContextAction {
  label: string;
  onAction: () => void;
  destructive?: boolean;
}

function TabContextMenu({ x, y, onClose, actions }: { x: number; y: number; onClose: () => void; actions: ContextAction[] }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(0);

  // Auto-focus the menu on mount and handle keyboard navigation
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusIdx((prev) => (prev + 1) % actions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIdx((prev) => (prev - 1 + actions.length) % actions.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        actions[focusIdx].onAction();
        break;
      case 'Home':
        e.preventDefault();
        setFocusIdx(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusIdx(actions.length - 1);
        break;
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-lg outline-none"
        style={{ left: x, top: y }}
      >
        {actions.map((action, i) => (
          <button
            key={action.label}
            role="menuitem"
            tabIndex={-1}
            className={cn(
              'flex w-full items-center rounded-sm px-2 py-1.5 text-xs transition-colors',
              i === focusIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent',
              action.destructive && 'text-destructive',
            )}
            onMouseEnter={() => setFocusIdx(i)}
            onClick={action.onAction}
          >
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}
