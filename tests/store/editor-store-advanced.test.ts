import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '@/store/editor-store';

describe('editor store advanced', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: [],
      activeTab: null,
      compilationLog: '',
      compilationStatus: 'idle',
      compilationDuration: null,
      latestPdfUrl: null,
    });
  });

  it('reorderTab swaps tab positions', () => {
    const { openFile } = useEditorStore.getState();
    openFile('a.tex', 'a');
    openFile('b.tex', 'b');
    openFile('c.tex', 'c');

    useEditorStore.getState().reorderTab(0, 2);
    const paths = useEditorStore.getState().tabs.map(t => t.path);
    expect(paths).toEqual(['b.tex', 'c.tex', 'a.tex']);
  });

  it('markAllSaved clears all dirty flags', () => {
    const { openFile, updateContent } = useEditorStore.getState();
    openFile('a.tex', 'a');
    openFile('b.tex', 'b');
    updateContent('a.tex', 'modified-a');
    updateContent('b.tex', 'modified-b');

    expect(useEditorStore.getState().hasUnsavedChanges()).toBe(true);

    useEditorStore.getState().markAllSaved();
    expect(useEditorStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it('setFontSize updates font size', () => {
    useEditorStore.getState().setFontSize(18);
    expect(useEditorStore.getState().fontSize).toBe(18);
  });

  it('setWordWrap toggles word wrap', () => {
    useEditorStore.getState().setWordWrap(false);
    expect(useEditorStore.getState().wordWrap).toBe(false);
    useEditorStore.getState().setWordWrap(true);
    expect(useEditorStore.getState().wordWrap).toBe(true);
  });

  it('toggleLogPanel toggles state', () => {
    const initial = useEditorStore.getState().logPanelCollapsed;
    useEditorStore.getState().toggleLogPanel();
    expect(useEditorStore.getState().logPanelCollapsed).toBe(!initial);
  });

  it('setLatestPdfUrl stores URL', () => {
    useEditorStore.getState().setLatestPdfUrl('/api/v1/projects/123/compile/456/pdf');
    expect(useEditorStore.getState().latestPdfUrl).toBe('/api/v1/projects/123/compile/456/pdf');
  });

  it('setCompilationDuration stores duration', () => {
    useEditorStore.getState().setCompilationDuration(3500);
    expect(useEditorStore.getState().compilationDuration).toBe(3500);
  });

  it('detects file language from path', () => {
    useEditorStore.getState().openFile('paper.tex', '');
    const tab = useEditorStore.getState().tabs.find(t => t.path === 'paper.tex');
    expect(tab?.language).toBe('latex');
  });

  it('detects bibtex language', () => {
    useEditorStore.getState().openFile('refs.bib', '');
    const tab = useEditorStore.getState().tabs.find(t => t.path === 'refs.bib');
    expect(tab?.language).toBe('bibtex');
  });

  it('closes nearest tab on activeTab close', () => {
    const { openFile, setActiveTab, closeTab } = useEditorStore.getState();
    openFile('a.tex', 'a');
    openFile('b.tex', 'b');
    openFile('c.tex', 'c');
    setActiveTab('c.tex');
    closeTab('c.tex');
    // Should activate b.tex (the tab at the same index, clamped)
    expect(useEditorStore.getState().activeTab).not.toBeNull();
    expect(useEditorStore.getState().activeTab).not.toBe('c.tex');
  });
});
