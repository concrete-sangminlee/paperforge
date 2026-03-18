'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GitCommitHorizontal, Plus, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface VersionUser {
  id: string;
  name: string;
}

interface Version {
  id: string;
  projectId: string;
  label: string | null;
  gitHash: string;
  createdAt: string;
  user: VersionUser | null;
}

interface VersionHistoryProps {
  projectId: string;
}

export function VersionHistory({ projectId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${projectId}/versions`);
      if (!res.ok) throw new Error('Failed to load versions');
      const data: Version[] = await res.json();
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  async function handleCreateVersion() {
    try {
      setCreating(true);
      setError(null);
      const res = await fetch(`/api/v1/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelInput.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create version');
      }
      setLabelInput('');
      setDialogOpen(false);
      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!confirm('Restore this version? Current changes will be overwritten.')) return;
    try {
      setRestoring(versionId);
      setError(null);
      const res = await fetch(
        `/api/v1/projects/${projectId}/versions/${versionId}/restore`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to restore version');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <GitCommitHorizontal className="size-4" />
          Version History
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
                <Plus className="size-3.5" />
                Save
              </Button>
            }
          />

          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Version</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="version-label">Label (optional)</Label>
                <Input
                  id="version-label"
                  placeholder="e.g. Before major edits"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateVersion();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateVersion}
                disabled={creating}
                size="sm"
              >
                {creating ? 'Saving…' : 'Save Version'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error banner */}
      {error && (
        <p className="bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Version list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No versions yet. Click &quot;Save&quot; to create one.
          </p>
        ) : (
          <ul className="divide-y">
            {versions.map((v) => (
              <li key={v.id} className="group flex items-start gap-2 px-3 py-2.5">
                <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                <div className="min-w-0 flex-1 space-y-0.5">
                  {v.label ? (
                    <p className="truncate text-sm font-medium">{v.label}</p>
                  ) : (
                    <p className="truncate text-sm text-muted-foreground italic">
                      Auto-save
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(v.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {v.user && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {v.user.name}
                      </Badge>
                    )}
                    <span
                      className="font-mono text-[10px] text-muted-foreground"
                      title={v.gitHash}
                    >
                      {v.gitHash.slice(0, 7)}
                    </span>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Restore this version"
                  disabled={restoring === v.id}
                  onClick={() => handleRestore(v.id)}
                >
                  <RotateCcw className="size-3.5" />
                  <span className="sr-only">Restore</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <Separator />
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground">
        Each saved version is a git commit stored locally.
      </p>
    </div>
  );
}
