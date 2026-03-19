import { create } from 'zustand';

interface EditorTab {
  path: string;
  content: string;
  dirty: boolean;
}

interface EditorState {
  tabs: EditorTab[];
  activeTab: string | null;
  compilationLog: string;
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error';
  latestPdfUrl: string | null;
  autoCompileEnabled: boolean;

  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  setCompilationLog: (log: string) => void;
  setCompilationStatus: (status: EditorState['compilationStatus']) => void;
  setLatestPdfUrl: (url: string | null) => void;
  toggleAutoCompile: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTab: null,
  compilationLog: '',
  compilationStatus: 'idle',
  latestPdfUrl: null,
  autoCompileEnabled: true,

  openFile: (path, content) => set((state) => {
    if (state.tabs.find(t => t.path === path)) return { activeTab: path };
    return { tabs: [...state.tabs, { path, content, dirty: false }], activeTab: path };
  }),
  closeTab: (path) => set((state) => {
    const tabs = state.tabs.filter(t => t.path !== path);
    return {
      tabs,
      activeTab: state.activeTab === path ? (tabs[0]?.path || null) : state.activeTab,
    };
  }),
  setActiveTab: (path) => set({ activeTab: path }),
  updateContent: (path, content) => set((state) => ({
    tabs: state.tabs.map(t => t.path === path ? { ...t, content, dirty: true } : t),
  })),
  markSaved: (path) => set((state) => ({
    tabs: state.tabs.map(t => t.path === path ? { ...t, dirty: false } : t),
  })),
  setCompilationLog: (log) => set({ compilationLog: log }),
  setCompilationStatus: (status) => set({ compilationStatus: status }),
  setLatestPdfUrl: (url) => set({ latestPdfUrl: url }),
  toggleAutoCompile: () => set((state) => ({ autoCompileEnabled: !state.autoCompileEnabled })),
}));
