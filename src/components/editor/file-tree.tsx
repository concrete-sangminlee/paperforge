'use client';

import { FileTextIcon, LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editor-store';
import { cn } from '@/lib/utils';

interface FileEntry {
  id: string;
  path: string;
  mimeType: string | null;
  isBinary: boolean;
}

interface FileTreeProps {
  projectId: string;
  files: FileEntry[];
}

export function FileTree({ projectId, files }: FileTreeProps) {
  const { openFile, setActiveTab, activeTab } = useEditorStore();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleFileClick(file: FileEntry) {
    if (file.isBinary) return;

    // If already open, just focus
    const store = useEditorStore.getState();
    if (store.tabs.find(t => t.path === file.path)) {
      setActiveTab(file.path);
      return;
    }

    setLoading(file.path);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files/${file.path}`);
      if (!res.ok) throw new Error('Failed to load file');
      const data = await res.json() as { content: string };
      openFile(file.path, data.content);
    } catch (err) {
      console.error('Failed to open file:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <FileTextIcon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Files
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {files.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No files</p>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => handleFileClick(file)}
                disabled={file.isBinary || loading === file.path}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  activeTab === file.path && 'bg-accent text-accent-foreground font-medium',
                  file.isBinary && 'opacity-50 cursor-not-allowed',
                )}
              >
                {loading === file.path ? (
                  <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{file.path}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
