'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchIcon, FileTextIcon, LoaderCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editor-store';

interface SearchResult {
  path: string;
  line: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

interface FindInProjectProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindInProject({ projectId, open, onOpenChange }: FindInProjectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const openFile = useEditorStore((s) => s.openFile);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up any in-flight requests when dialog closes or component unmounts
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    // Cancel any previous search
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setSearched(false);

    try {
      // Fetch all files
      const res = await fetch(`/api/v1/projects/${projectId}/files`, { signal: controller.signal });
      if (!res.ok) { setSearching(false); return; }
      const data = await res.json();
      const files: Array<{ path: string }> = data.data ?? data;

      const found: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // Search through each text file
      for (const file of files) {
        if (controller.signal.aborted) break;
        if (file.path.match(/\.(png|jpg|jpeg|gif|pdf|zip|tar)$/i)) continue;

        try {
          const fileRes = await fetch(`/api/v1/projects/${projectId}/files/${file.path}`, { signal: controller.signal });
          if (!fileRes.ok) continue;
          const fileData = await fileRes.json();
          const content = fileData.data?.content ?? fileData.content ?? '';

          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const lowerLine = lines[i].toLowerCase();
            const idx = lowerLine.indexOf(lowerQuery);
            if (idx !== -1) {
              found.push({
                path: file.path,
                line: i + 1,
                text: lines[i],
                matchStart: idx,
                matchEnd: idx + query.length,
              });
              if (found.length >= 100) break; // Limit results
            }
          }
          if (found.length >= 100) break;
        } catch (e) {
          if ((e as Error).name === 'AbortError') break;
          continue;
        }
      }

      if (!controller.signal.aborted) {
        setResults(found);
        setSearched(true);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e;
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, [query, projectId]);

  function handleResultClick(result: SearchResult) {
    // Open the file in editor and go to line
    fetch(`/api/v1/projects/${projectId}/files/${result.path}`)
      .then(r => r.json())
      .then(data => {
        const content = data.data?.content ?? data.content ?? '';
        openFile(result.path, content);
        setActiveTab(result.path);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('editor-goto-line', { detail: result.line }));
        }, 100);
        onOpenChange(false);
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SearchIcon className="size-5" />
            Find in Project
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Search across all files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={searching || !query.trim()} size="sm" className="gap-1.5">
            {searching ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <SearchIcon className="size-3.5" />}
            Search
          </Button>
        </div>

        <ScrollArea className="max-h-[45vh]">
          {searched && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <SearchIcon className="size-8 opacity-30" />
              <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
          {results.length > 0 && (
            <div className="space-y-0.5">
              <p className="mb-2 text-xs text-muted-foreground">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
              {results.map((r, i) => (
                <button
                  key={`${r.path}-${r.line}-${i}`}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                  onClick={() => handleResultClick(r)}
                >
                  <FileTextIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{r.path}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">:{r.line}</span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {r.text.slice(0, r.matchStart)}
                      <mark className="rounded bg-yellow-200/30 px-0.5 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300">
                        {r.text.slice(r.matchStart, r.matchEnd)}
                      </mark>
                      {r.text.slice(r.matchEnd)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
