import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorTab {
  path: string;
  content: string;
  dirty: boolean;
  language?: string;
}

interface EditorState {
  tabs: EditorTab[];
  activeTab: string | null;
  compilationLog: string;
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error';
  compilationDuration: number | null;
  latestPdfUrl: string | null;
  autoCompileEnabled: boolean;
  sidebarCollapsed: boolean;
  logPanelCollapsed: boolean;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  wordWrap: boolean;
  showLineNumbers: boolean;
  cursorLine: number;
  cursorCol: number;
  selectionLength: number;

  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  closeOtherTabs: (path: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  markAllSaved: () => void;
  setCompilationLog: (log: string) => void;
  setCompilationStatus: (status: EditorState['compilationStatus']) => void;
  setCompilationDuration: (duration: number | null) => void;
  setLatestPdfUrl: (url: string | null) => void;
  toggleAutoCompile: () => void;
  toggleSidebar: () => void;
  toggleLogPanel: () => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setFontFamily: (family: string) => void;
  setWordWrap: (enabled: boolean) => void;
  setShowLineNumbers: (enabled: boolean) => void;
  setCursorPosition: (line: number, col: number, selLen?: number) => void;
  hasUnsavedChanges: () => boolean;
  reorderTab: (fromIndex: number, toIndex: number) => void;
}

// Detect file language from extension
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tex':
    case 'cls':
    case 'sty':
      return 'latex';
    case 'bib':
      return 'bibtex';
    case 'md':
      return 'markdown';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'txt':
      return 'text';
    default:
      return 'text';
  }
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
  tabs: [],
  activeTab: null,
  compilationLog: '',
  compilationStatus: 'idle',
  compilationDuration: null,
  latestPdfUrl: null,
  autoCompileEnabled: true,
  sidebarCollapsed: false,
  logPanelCollapsed: false,
  fontSize: 14,
  lineHeight: 1.6,
  fontFamily: 'var(--font-mono, monospace)',
  wordWrap: true,
  showLineNumbers: true,
  cursorLine: 1,
  cursorCol: 1,
  selectionLength: 0,

  openFile: (path, content) => set((state) => {
    if (state.tabs.find(t => t.path === path)) return { activeTab: path };
    return {
      tabs: [...state.tabs, { path, content, dirty: false, language: detectLanguage(path) }],
      activeTab: path,
    };
  }),

  closeTab: (path) => set((state) => {
    const idx = state.tabs.findIndex(t => t.path === path);
    const tabs = state.tabs.filter(t => t.path !== path);
    let nextActive = state.activeTab;
    if (state.activeTab === path) {
      // Activate the nearest tab (prefer the one to the left, fallback to right)
      nextActive = tabs[Math.min(idx, tabs.length - 1)]?.path || null;
    }
    return { tabs, activeTab: nextActive };
  }),

  closeOtherTabs: (path) => set((state) => ({
    tabs: state.tabs.filter(t => t.path === path),
    activeTab: path,
  })),

  closeAllTabs: () => set({ tabs: [], activeTab: null }),

  setActiveTab: (path) => set({ activeTab: path }),

  updateContent: (path, content) => set((state) => ({
    tabs: state.tabs.map(t => t.path === path ? { ...t, content, dirty: true } : t),
  })),

  markSaved: (path) => set((state) => ({
    tabs: state.tabs.map(t => t.path === path ? { ...t, dirty: false } : t),
  })),

  markAllSaved: () => set((state) => ({
    tabs: state.tabs.map(t => ({ ...t, dirty: false })),
  })),

  setCompilationLog: (log) => set({ compilationLog: log }),
  setCompilationStatus: (status) => set({ compilationStatus: status }),
  setCompilationDuration: (duration) => set({ compilationDuration: duration }),
  setLatestPdfUrl: (url) => set({ latestPdfUrl: url }),
  toggleAutoCompile: () => set((state) => ({ autoCompileEnabled: !state.autoCompileEnabled })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleLogPanel: () => set((state) => ({ logPanelCollapsed: !state.logPanelCollapsed })),
  setFontSize: (size) => set({ fontSize: size }),
  setLineHeight: (height) => set({ lineHeight: height }),
  setFontFamily: (family) => set({ fontFamily: family }),
  setWordWrap: (enabled) => set({ wordWrap: enabled }),
  setShowLineNumbers: (enabled) => set({ showLineNumbers: enabled }),
  setCursorPosition: (line, col, selLen = 0) => set({ cursorLine: line, cursorCol: col, selectionLength: selLen }),

  hasUnsavedChanges: () => get().tabs.some(t => t.dirty),

  reorderTab: (fromIndex, toIndex) => set((state) => {
    const tabs = [...state.tabs];
    const [moved] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, moved);
    return { tabs };
  }),
    }),
    {
      name: 'paperforge-editor',
      partialize: (state) => ({
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontFamily: state.fontFamily,
        wordWrap: state.wordWrap,
        showLineNumbers: state.showLineNumbers,
        autoCompileEnabled: state.autoCompileEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
        logPanelCollapsed: state.logPanelCollapsed,
        // Persist open tabs for crash recovery (max 10 tabs, 50KB each)
        tabs: state.tabs.slice(0, 10).map(t => ({
          ...t,
          content: t.content.slice(0, 50000),
        })),
        activeTab: state.activeTab,
      }),
    }
  )
);
