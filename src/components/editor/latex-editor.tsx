'use client';

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, dropCursor } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEditorStore } from '@/store/editor-store';

interface LaTeXEditorProps {
  initialContent: string;
  filePath: string;
  theme?: 'light' | 'dark';
  onSave?: (content: string) => void;
}

const themeCompartment = new Compartment();

export function LaTeXEditor({ initialContent, filePath, theme = 'light', onSave }: LaTeXEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updateContent = useEditorStore((s) => s.updateContent);

  useEffect(() => {
    if (!editorRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: 'Ctrl-s',
        mac: 'Cmd-s',
        run(view) {
          if (onSave) onSave(view.state.doc.toString());
          return true;
        },
      },
    ]);

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        dropCursor(),
        history(),
        foldGutter(),
        bracketMatching(),
        autocompletion(),
        search({ top: true }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        saveKeymap,
        themeCompartment.of(theme === 'dark' ? oneDark : []),
        EditorView.theme({
          '&': { height: '100%', minHeight: '0' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono, monospace)' },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            updateContent(filePath, update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // Reconfigure theme when prop changes without destroying the editor
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : []),
    });
  }, [theme]);

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-hidden"
      aria-label={`LaTeX editor for ${filePath}`}
    />
  );
}
