'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PlayIcon,
  LoaderCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ZapIcon,
  ZapOffIcon,
  FileDownIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  SigmaIcon,
  Heading1Icon,
  Heading2Icon,
  ListIcon,
  ListOrderedIcon,
  LinkIcon,
  ImageIcon,
  KeyboardIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditorStore } from '@/store/editor-store';

interface EditorToolbarProps {
  projectId: string;
  projectName?: string;
  /** Called by the parent to imperatively trigger a compile. */
  onCompileReady?: (compileFn: () => Promise<void>) => void;
}

const STATUS_POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 120; // 2 minutes max

type CompilationResponse = {
  id: string;
  status: string;
  log: string | null;
  durationMs: number | null;
  docxMinioKey?: string | null;
};

const insertLatex = (command: string) => {
  window.dispatchEvent(new CustomEvent('latex-insert', { detail: command }));
};

const FORMATTING_BUTTONS = [
  { label: 'Bold', icon: BoldIcon, command: '\\textbf{}', shortcut: 'Ctrl+B' },
  { label: 'Italic', icon: ItalicIcon, command: '\\textit{}', shortcut: 'Ctrl+I' },
  { label: 'Underline', icon: UnderlineIcon, command: '\\underline{}', shortcut: '' },
  { label: 'Math mode', icon: SigmaIcon, command: '$$', shortcut: 'Ctrl+M' },
] as const;

const STRUCTURE_BUTTONS = [
  { label: 'Section', icon: Heading1Icon, command: '\\section{}' },
  { label: 'Subsection', icon: Heading2Icon, command: '\\subsection{}' },
  { label: 'Bullet list', icon: ListIcon, command: '\\begin{itemize}\n  \\item \n\\end{itemize}' },
  { label: 'Numbered list', icon: ListOrderedIcon, command: '\\begin{enumerate}\n  \\item \n\\end{enumerate}' },
  { label: 'Link', icon: LinkIcon, command: '\\href{}{}' },
  { label: 'Image', icon: ImageIcon, command: '\\includegraphics{}' },
] as const;

const SHORTCUTS_HELP = `Keyboard Shortcuts:
Ctrl+B  Bold
Ctrl+I  Italic
Ctrl+M  Math mode
Ctrl+S  Save
Ctrl+Enter  Compile`;

export function EditorToolbar({ projectId, projectName, onCompileReady }: EditorToolbarProps) {
  const { compilationStatus, setCompilationStatus, setCompilationLog, setLatestPdfUrl, autoCompileEnabled, toggleAutoCompile } =
    useEditorStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleCompile() {
    if (compilationStatus === 'compiling') return;
    stopPolling();

    setCompilationStatus('compiling');
    setCompilationLog('');
    setDocxUrl(null);

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/compile`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Compilation request failed' }));
        setCompilationLog((err as { error?: string }).error ?? 'Compilation request failed');
        setCompilationStatus('error');
        return;
      }

      const compilation = await res.json() as { id: string };
      const compileId = compilation.id;

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > MAX_POLL_ATTEMPTS) {
          stopPolling();
          setCompilationLog('Compilation timed out.');
          setCompilationStatus('error');
          return;
        }

        try {
          const statusRes = await fetch(
            `/api/v1/projects/${projectId}/compile/${compileId}/status`,
          );
          if (!statusRes.ok) return;

          const data = await statusRes.json() as CompilationResponse;

          if (data.status === 'success') {
            stopPolling();
            setCompilationStatus('success');
            setCompilationLog(data.log ?? '');
            setLatestPdfUrl(`/api/v1/projects/${projectId}/compile/${compileId}/pdf`);
            if (data.docxMinioKey) {
              setDocxUrl(`/api/v1/projects/${projectId}/compile/${compileId}/docx`);
            }
          } else if (data.status === 'failed' || data.status === 'error') {
            stopPolling();
            setCompilationStatus('error');
            setCompilationLog(data.log ?? 'Compilation failed.');
          }
          // still 'queued' or 'running' — keep polling
        } catch {
          // network hiccup — keep polling
        }
      }, STATUS_POLL_INTERVAL_MS);
    } catch (err) {
      setCompilationLog(err instanceof Error ? err.message : 'Unknown error');
      setCompilationStatus('error');
    }
  }

  // Keep a ref to the latest handleCompile so the parent always calls
  // the current closure (with up-to-date compilationStatus captured in it).
  const handleCompileRef = useRef(handleCompile);
  handleCompileRef.current = handleCompile;

  // Expose a stable wrapper to the parent exactly once on mount.
  useEffect(() => {
    if (onCompileReady) {
      onCompileReady(() => handleCompileRef.current());
    }
    // onCompileReady identity is stable; only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCompiling = compilationStatus === 'compiling';

  return (
    <div className="flex items-center gap-1.5 border-b bg-background px-3 py-1.5">
      {/* Project name */}
      {projectName && (
        <>
          <span className="mr-1 max-w-[160px] truncate text-sm font-semibold text-foreground" title={projectName}>
            {projectName}
          </span>
          <ToolbarSeparator />
        </>
      )}

      {/* Compile controls */}
      <Button
        size="sm"
        onClick={handleCompile}
        disabled={isCompiling}
        className="gap-1.5"
      >
        {isCompiling ? (
          <LoaderCircleIcon className="size-3.5 animate-spin" />
        ) : (
          <PlayIcon className="size-3.5" />
        )}
        {isCompiling ? 'Compiling...' : 'Compile'}
      </Button>

      {/* Download DOCX — only shown after a successful compilation with DOCX output */}
      {docxUrl && (
        <a
          href={docxUrl}
          download="output.docx"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileDownIcon className="size-3.5" />
          DOCX
        </a>
      )}

      {/* Auto-compile toggle */}
      <Button
        size="sm"
        variant={autoCompileEnabled ? 'secondary' : 'ghost'}
        onClick={toggleAutoCompile}
        className="gap-1.5 text-xs"
        title={autoCompileEnabled ? 'Auto-compile ON - click to disable' : 'Auto-compile OFF - click to enable'}
      >
        {autoCompileEnabled ? (
          <ZapIcon className="size-3.5 text-amber-500" />
        ) : (
          <ZapOffIcon className="size-3.5" />
        )}
        Auto: {autoCompileEnabled ? 'ON' : 'OFF'}
      </Button>

      <CompilationStatusBadge status={compilationStatus} />

      <ToolbarSeparator />

      {/* Formatting buttons - text formatting */}
      <div className="flex items-center gap-0.5">
        {FORMATTING_BUTTONS.map(({ label, icon: Icon, command, shortcut }) => (
          <Button
            key={label}
            size="icon-xs"
            variant="ghost"
            onClick={() => insertLatex(command)}
            title={shortcut ? `${label} (${shortcut})` : label}
          >
            <Icon className="size-3.5" />
          </Button>
        ))}
      </div>

      <ToolbarSeparator />

      {/* Formatting buttons - structure */}
      <div className="flex items-center gap-0.5">
        {STRUCTURE_BUTTONS.map(({ label, icon: Icon, command }) => (
          <Button
            key={label}
            size="icon-xs"
            variant="ghost"
            onClick={() => insertLatex(command)}
            title={label}
          >
            <Icon className="size-3.5" />
          </Button>
        ))}
      </div>

      <ToolbarSeparator />

      {/* Keyboard shortcuts help */}
      <Button
        size="icon-xs"
        variant="ghost"
        title={SHORTCUTS_HELP}
      >
        <KeyboardIcon className="size-3.5" />
      </Button>
    </div>
  );
}

/** Thin vertical separator between toolbar button groups. */
function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

function CompilationStatusBadge({
  status,
}: {
  status: 'idle' | 'compiling' | 'success' | 'error';
}) {
  if (status === 'idle') return null;

  const map = {
    compiling: { label: 'Compiling', variant: 'secondary' as const, icon: null },
    success: { label: 'Success', variant: 'default' as const, icon: CheckCircleIcon },
    error: { label: 'Error', variant: 'destructive' as const, icon: XCircleIcon },
  } as const;

  if (status === 'compiling') {
    return (
      <Badge variant="secondary" className="gap-1">
        <LoaderCircleIcon className="size-3 animate-spin" />
        Compiling
      </Badge>
    );
  }

  const { label, variant, icon: Icon } = map[status];
  return (
    <Badge variant={variant} className="gap-1">
      {Icon && <Icon className="size-3" />}
      {label}
    </Badge>
  );
}
