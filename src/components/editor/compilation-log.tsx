'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  TerminalIcon,
  CopyIcon,
  SearchIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  ArrowDownIcon,
  CheckIcon,
  XIcon,
  FileTextIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/editor-store';
import { cn } from '@/lib/utils';
import { parseLatexLog, diagnosticSummary } from '@/lib/latex-error-parser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = 'error' | 'warning' | 'info';

interface ParsedLine {
  text: string;
  level: LogLevel;
  lineNumber: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyLine(text: string): LogLevel {
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith('!') ||
    /\bError\b/i.test(text) ||
    /^l\.\d+/i.test(trimmed)
  ) {
    return 'error';
  }
  if (/\bWarning\b/i.test(text) || /\bOverfull\b/i.test(text) || /\bUnderfull\b/i.test(text)) {
    return 'warning';
  }
  return 'info';
}

function parseLog(raw: string): ParsedLine[] {
  if (!raw) return [];
  return raw.split('\n').map((text, idx) => ({
    text,
    level: classifyLine(text),
    lineNumber: idx + 1,
  }));
}

/** Escape special regex chars so user search input is treated literally. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompilationLog() {
  const compilationLog = useEditorStore((s) => s.compilationLog);
  const compilationStatus = useEditorStore((s) => s.compilationStatus);
  const setCompilationLog = useEditorStore((s) => s.setCompilationLog);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Structured diagnostics from LaTeX error parser
  const diagnostics = useMemo(() => parseLatexLog(compilationLog), [compilationLog]);
  const summary = useMemo(() => diagnosticSummary(diagnostics), [diagnostics]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------------------------
  // Parsed & filtered lines
  // -----------------------------------------------------------------------

  const parsedLines = useMemo(() => parseLog(compilationLog), [compilationLog]);

  const filteredLines = useMemo(() => {
    let lines = parsedLines.filter((l) => {
      if (l.level === 'error' && !showErrors) return false;
      if (l.level === 'warning' && !showWarnings) return false;
      if (l.level === 'info' && !showInfo) return false;
      return true;
    });

    if (searchQuery.trim()) {
      const re = new RegExp(escapeRegex(searchQuery), 'i');
      lines = lines.filter((l) => re.test(l.text));
    }

    return lines;
  }, [parsedLines, showErrors, showWarnings, showInfo, searchQuery]);

  // Counts for badges
  const errorCount = useMemo(() => parsedLines.filter((l) => l.level === 'error').length, [parsedLines]);
  const warningCount = useMemo(() => parsedLines.filter((l) => l.level === 'warning').length, [parsedLines]);

  // -----------------------------------------------------------------------
  // Auto-scroll logic
  // -----------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolledUp(false);
  }, []);

  // Detect when the user scrolls up
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 40;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setUserScrolledUp(!isAtBottom);
  }, []);

  // Auto-scroll to bottom on new content (only if user hasn't scrolled up)
  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [compilationLog, userScrolledUp]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    }
  }, [showSearch]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleCopy = useCallback(async () => {
    if (!compilationLog) return;
    try {
      await navigator.clipboard.writeText(compilationLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = compilationLog;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [compilationLog]);

  const handleClear = useCallback(() => {
    setCompilationLog('');
    setSearchQuery('');
  }, [setCompilationLog]);

  const toggleSearch = useCallback(() => {
    setShowSearch((v) => {
      if (v) setSearchQuery(''); // clear search when closing
      return !v;
    });
  }, []);

  // -----------------------------------------------------------------------
  // Highlight search matches in a line of text
  // -----------------------------------------------------------------------

  const highlightMatch = useCallback(
    (text: string) => {
      if (!searchQuery.trim()) return text;
      const re = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
      const parts = text.split(re);
      return parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="rounded-sm bg-yellow-400/30 px-0.5 text-yellow-200">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    },
    [searchQuery],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const levelStyles: Record<LogLevel, string> = {
    error: 'border-l-red-500 bg-red-950/40 text-red-300',
    warning: 'border-l-yellow-500 bg-yellow-950/30 text-yellow-300',
    info: 'border-l-transparent text-zinc-400',
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0d1117] transition-all duration-200',
        expanded ? 'h-[22rem]' : 'h-40',
      )}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center gap-1 border-t border-zinc-800 px-2 py-1">
        {/* Title + status */}
        <div className="flex items-center gap-1.5">
          <TerminalIcon className="size-3.5 text-zinc-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Log
          </span>
          {compilationStatus !== 'idle' && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                compilationStatus === 'success' && 'bg-emerald-900/60 text-emerald-400',
                compilationStatus === 'error' && 'bg-red-900/60 text-red-400',
                compilationStatus === 'compiling' && 'bg-zinc-800 text-zinc-300',
              )}
            >
              {compilationStatus === 'compiling' ? 'Compiling...' : compilationStatus}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              <AlertCircleIcon className="size-2.5" />
              {errorCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-yellow-900/40 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
              <AlertTriangleIcon className="size-2.5" />
              {warningCount}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Level filter toggles */}
        <div className="flex items-center gap-0.5">
          <Button
            size="icon-xs"
            variant={showErrors ? 'destructive' : 'ghost'}
            className={cn(
              'size-5',
              showErrors
                ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
                : 'text-zinc-600 hover:text-zinc-400',
            )}
            onClick={() => setShowErrors((v) => !v)}
            title="Toggle errors"
          >
            <AlertCircleIcon className="size-2.5" />
          </Button>
          <Button
            size="icon-xs"
            variant={showWarnings ? 'secondary' : 'ghost'}
            className={cn(
              'size-5',
              showWarnings
                ? 'bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60'
                : 'text-zinc-600 hover:text-zinc-400',
            )}
            onClick={() => setShowWarnings((v) => !v)}
            title="Toggle warnings"
          >
            <AlertTriangleIcon className="size-2.5" />
          </Button>
          <Button
            size="icon-xs"
            variant={showInfo ? 'secondary' : 'ghost'}
            className={cn(
              'size-5',
              showInfo
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'text-zinc-600 hover:text-zinc-400',
            )}
            onClick={() => setShowInfo((v) => !v)}
            title="Toggle info"
          >
            <InfoIcon className="size-2.5" />
          </Button>
        </div>

        <div className="mx-1 h-3.5 w-px bg-zinc-800" />

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-5 text-zinc-500 hover:text-zinc-300"
            onClick={toggleSearch}
            title="Search log"
          >
            <SearchIcon className="size-2.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className={cn(
              'relative size-5',
              copied ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300',
            )}
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy log to clipboard'}
            disabled={!compilationLog}
          >
            {copied ? <CheckIcon className="size-2.5" /> : <CopyIcon className="size-2.5" />}
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-5 text-zinc-500 hover:text-zinc-300"
            onClick={handleClear}
            title="Clear log"
            disabled={!compilationLog}
          >
            <TrashIcon className="size-2.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-5 text-zinc-500 hover:text-zinc-300"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse log' : 'Expand log'}
          >
            {expanded ? (
              <ChevronDownIcon className="size-2.5" />
            ) : (
              <ChevronUpIcon className="size-2.5" />
            )}
          </Button>
        </div>
      </div>

      {/* ---- Diagnostics summary ---- */}
      {diagnostics.length > 0 && compilationStatus !== 'compiling' && (
        <div className="flex items-center gap-2 border-t border-zinc-800/60 bg-zinc-900/60 px-3 py-1">
          {summary.errors > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertCircleIcon className="size-2.5" />
              {summary.errors} error{summary.errors !== 1 ? 's' : ''}
            </span>
          )}
          {summary.warnings > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-yellow-400">
              <AlertTriangleIcon className="size-2.5" />
              {summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}
            </span>
          )}
          {diagnostics.filter(d => d.line).length > 0 && (
            <span className="text-[10px] text-zinc-500">
              (click errors in log to see line numbers)
            </span>
          )}
        </div>
      )}

      {/* ---- Search bar (collapsible) ---- */}
      {showSearch && (
        <div className="flex items-center gap-1.5 border-t border-zinc-800/60 bg-zinc-900/80 px-2 py-1">
          <SearchIcon className="size-3 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Filter log output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-5 flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none"
          />
          {searchQuery && (
            <span className="text-[10px] text-zinc-500">
              {filteredLines.length} match{filteredLines.length !== 1 ? 'es' : ''}
            </span>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-4 text-zinc-500 hover:text-zinc-300"
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
            title="Close search"
          >
            <XIcon className="size-2.5" />
          </Button>
        </div>
      )}

      {/* ---- Log content ---- */}
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-auto"
            onScroll={handleScroll}
          >
            {compilationLog ? (
              <div className="p-1">
                {filteredLines.length > 0 ? (
                  filteredLines.map((line) => (
                    <div
                      key={line.lineNumber}
                      className={cn(
                        'flex border-l-2 font-mono text-[11px] leading-5',
                        levelStyles[line.level],
                      )}
                    >
                      {/* Line number gutter */}
                      <span className="w-9 shrink-0 select-none pr-2 text-right text-zinc-600">
                        {line.lineNumber}
                      </span>
                      {/* Line content */}
                      <span className="min-w-0 break-all whitespace-pre-wrap pr-2">
                        {highlightMatch(line.text)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center py-6 text-xs text-zinc-600">
                    No lines match your current filters.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            ) : (
              /* ---- Empty state ---- */
              <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                <div className="rounded-full bg-zinc-800/60 p-3">
                  <FileTextIcon className="size-5 text-zinc-600" />
                </div>
                <p className="text-xs font-medium text-zinc-500">
                  No compilation output yet
                </p>
                <p className="text-[11px] text-zinc-600">
                  Click <span className="font-semibold text-zinc-500">Compile</span> or start
                  typing to trigger auto-compile.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ---- Scroll-to-bottom FAB ---- */}
        {userScrolledUp && compilationLog && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 right-3 flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/90 px-2 py-1 text-[10px] font-medium text-zinc-300 shadow-lg backdrop-blur transition-colors hover:bg-zinc-700"
            title="Scroll to bottom"
          >
            <ArrowDownIcon className="size-2.5" />
            Latest
          </button>
        )}
      </div>
    </div>
  );
}
