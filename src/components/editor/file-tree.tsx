'use client';

import {
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  StarIcon,
} from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditorStore } from '@/store/editor-store';
import { cn } from '@/lib/utils';
import { NewFileDialog } from './new-file-dialog';
import { UploadDialog } from './upload-dialog';

interface FileEntry {
  id: string;
  path: string;
  mimeType: string | null;
  isBinary: boolean;
}

interface FileTreeProps {
  projectId: string;
  files: FileEntry[];
  mainFile?: string;
  onRefresh: () => void;
  onMainFileChange?: (path: string) => void;
}

// ---------- folder tree helpers ----------

interface TreeFolder {
  type: 'folder';
  name: string;
  fullPath: string;
  children: TreeNode[];
}

interface TreeFile {
  type: 'file';
  entry: FileEntry;
  name: string;
}

type TreeNode = TreeFolder | TreeFile;

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let nodes = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderPath = parts.slice(0, i + 1).join('/');
      let folder = nodes.find(
        (n): n is TreeFolder => n.type === 'folder' && n.name === folderName,
      );
      if (!folder) {
        folder = { type: 'folder', name: folderName, fullPath: folderPath, children: [] };
        nodes.push(folder);
      }
      nodes = folder.children;
    }

    nodes.push({ type: 'file', entry: file, name: parts[parts.length - 1] });
  }

  return root;
}

// ---------- file node with right-click context menu ----------

interface FileNodeProps {
  file: FileEntry;
  name: string;
  depth: number;
  projectId: string;
  mainFile?: string;
  loading: string | null;
  onClick: (file: FileEntry) => void;
  onRename: (file: FileEntry) => void;
  onDelete: (file: FileEntry) => void;
  onSetMain: (file: FileEntry) => void;
  activeTab: string | null;
}

function FileNode({
  file,
  name,
  depth,
  mainFile,
  loading,
  onClick,
  onRename,
  onDelete,
  onSetMain,
  activeTab,
}: FileNodeProps) {
  const isMain = file.path === mainFile;
  const isActive = activeTab === file.path;
  const isLoading = loading === file.path;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            ref={triggerRef}
            onClick={() => onClick(file)}
            disabled={file.isBinary || isLoading}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isActive && 'bg-accent text-accent-foreground font-medium',
              file.isBinary && 'opacity-50 cursor-not-allowed',
            )}
            onContextMenu={(e) => {
              e.preventDefault();
              // Trigger dropdown by clicking the trigger element
              triggerRef.current?.click();
            }}
          />
        }
      >
        {isLoading ? (
          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate">{name}</span>
        {isMain && (
          <StarIcon
            className="size-3 shrink-0 fill-amber-400 text-amber-400"
            aria-label="Main document"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onRename(file)}>Rename</DropdownMenuItem>
        {!file.isBinary && !isMain && (
          <DropdownMenuItem onClick={() => onSetMain(file)}>
            Set as Main Document
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(file)}
          variant="destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- folder node ----------

function FolderNode({
  folder,
  depth,
  ...rest
}: {
  folder: TreeFolder;
  depth: number;
} & Omit<FileNodeProps, 'file' | 'name' | 'depth'>) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        {expanded ? (
          <FolderOpenIcon className="size-3.5 shrink-0" />
        ) : (
          <FolderIcon className="size-3.5 shrink-0" />
        )}
        <span className="truncate font-medium">{folder.name}</span>
      </button>
      {expanded &&
        folder.children.map((node) =>
          node.type === 'folder' ? (
            <FolderNode key={node.fullPath} folder={node} depth={depth + 1} {...rest} />
          ) : (
            <FileNode
              key={node.entry.id}
              file={node.entry}
              name={node.name}
              depth={depth + 1}
              {...rest}
            />
          ),
        )}
    </div>
  );
}

// ---------- main component ----------

export function FileTree({
  projectId,
  files,
  mainFile,
  onRefresh,
  onMainFileChange,
}: FileTreeProps) {
  const { openFile, setActiveTab, activeTab, closeTab, tabs } = useEditorStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<FileEntry | null>(null);
  const [renamePath, setRenamePath] = useState('');

  const tree = buildTree(files);

  async function handleFileClick(file: FileEntry) {
    if (file.isBinary) return;

    const store = useEditorStore.getState();
    if (store.tabs.find((t) => t.path === file.path)) {
      setActiveTab(file.path);
      return;
    }

    setLoading(file.path);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files/${file.path}`);
      if (!res.ok) throw new Error('Failed to load file');
      const data = (await res.json()) as { content: string };
      openFile(file.path, data.content);
    } catch (err) {
      console.error('Failed to open file:', err);
    } finally {
      setLoading(null);
    }
  }

  function handleRenameStart(file: FileEntry) {
    setRenaming(file);
    setRenamePath(file.path);
  }

  const handleRenameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!renaming) return;
      const newPath = renamePath.trim();
      if (!newPath || newPath === renaming.path) {
        setRenaming(null);
        return;
      }

      try {
        let content = '';
        if (!renaming.isBinary) {
          const tab = tabs.find((t) => t.path === renaming.path);
          if (tab) {
            content = tab.content;
          } else {
            const res = await fetch(`/api/v1/projects/${projectId}/files/${renaming.path}`);
            if (res.ok) {
              const data = (await res.json()) as { content: string };
              content = data.content;
            }
          }
        }

        // Create at new path then delete old
        await fetch(`/api/v1/projects/${projectId}/files/${newPath}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        await fetch(`/api/v1/projects/${projectId}/files/${renaming.path}`, {
          method: 'DELETE',
        });

        closeTab(renaming.path);
        setRenaming(null);
        onRefresh();
      } catch (err) {
        console.error('Rename failed:', err);
        setRenaming(null);
      }
    },
    [renaming, renamePath, projectId, tabs, closeTab, onRefresh],
  );

  async function handleDelete(file: FileEntry) {
    if (!confirm(`Delete "${file.path}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/v1/projects/${projectId}/files/${file.path}`, {
        method: 'DELETE',
      });
      closeTab(file.path);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleSetMain(file: FileEntry) {
    try {
      await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainFile: file.path }),
      });
      onMainFileChange?.(file.path);
    } catch (err) {
      console.error('Set main file failed:', err);
    }
  }

  const sharedNodeProps = {
    projectId,
    mainFile,
    loading,
    onClick: handleFileClick,
    onRename: handleRenameStart,
    onDelete: handleDelete,
    onSetMain: handleSetMain,
    activeTab,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <FileTextIcon className="size-3.5 text-muted-foreground" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Files
        </span>
        <NewFileDialog projectId={projectId} onCreated={onRefresh} />
        <UploadDialog projectId={projectId} onUploaded={onRefresh} />
      </div>

      {/* Inline rename form */}
      {renaming && (
        <form
          onSubmit={(e) => void handleRenameSubmit(e)}
          className="flex items-center gap-1 border-b px-2 py-1"
        >
          <input
            autoFocus
            value={renamePath}
            onChange={(e) => setRenamePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setRenaming(null);
            }}
            className="flex-1 rounded border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setRenaming(null)}
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </form>
      )}

      <ScrollArea className="flex-1">
        <div className="p-1">
          {files.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No files</p>
          ) : (
            tree.map((node) =>
              node.type === 'folder' ? (
                <FolderNode key={node.fullPath} folder={node} depth={0} {...sharedNodeProps} />
              ) : (
                <FileNode
                  key={node.entry.id}
                  file={node.entry}
                  name={node.name}
                  depth={0}
                  {...sharedNodeProps}
                />
              ),
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
