'use client';

import { useRef, useEffect } from 'react';
import { TerminalIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editor-store';

export function CompilationLog() {
  const compilationLog = useEditorStore((s) => s.compilationLog);
  const compilationStatus = useEditorStore((s) => s.compilationStatus);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when log updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [compilationLog]);

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <div className="flex items-center gap-1.5 border-t border-zinc-800 px-3 py-1.5">
        <TerminalIcon className="size-3.5 text-zinc-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Compilation Log
        </span>
        {compilationStatus !== 'idle' && (
          <span
            className={
              'ml-2 rounded px-1.5 py-0.5 text-xs font-medium ' +
              (compilationStatus === 'success'
                ? 'bg-green-900 text-green-300'
                : compilationStatus === 'error'
                  ? 'bg-red-900 text-red-300'
                  : 'bg-zinc-800 text-zinc-300')
            }
          >
            {compilationStatus}
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <pre className="p-3 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
          {compilationLog || (
            <span className="text-zinc-600">
              No compilation output yet. Click Compile to start.
            </span>
          )}
          <div ref={bottomRef} />
        </pre>
      </ScrollArea>
    </div>
  );
}
