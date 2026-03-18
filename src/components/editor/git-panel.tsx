'use client';

import { useCallback, useEffect, useState } from 'react';
import { GitBranch, Link2, Trash2, Upload, Download } from 'lucide-react';
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

interface GitCredential {
  id: string;
  provider: string;
  sshPublicKey: string | null;
  createdAt: string;
}

interface GitPanelProps {
  projectId: string;
  /** The current remote URL stored on the project (if any). */
  remoteUrl?: string | null;
}

export function GitPanel({ projectId, remoteUrl: initialRemote }: GitPanelProps) {
  const [remoteUrl, setRemoteUrl] = useState(initialRemote ?? '');
  const [remoteInput, setRemoteInput] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pullStatus, setPullStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [credentials, setCredentials] = useState<GitCredential[]>([]);
  const [credOpen, setCredOpen] = useState(false);
  const [credProvider, setCredProvider] = useState('');
  const [credToken, setCredToken] = useState('');
  const [addingCred, setAddingCred] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/user/git-credentials');
      if (!res.ok) return;
      const data: GitCredential[] = await res.json();
      setCredentials(data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  async function handleLinkRemote() {
    if (!remoteInput.trim()) return;
    try {
      setLinking(true);
      setError(null);
      const res = await fetch(`/api/v1/projects/${projectId}/git/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remoteUrl: remoteInput.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link remote');
      }
      setRemoteUrl(remoteInput.trim());
      setRemoteInput('');
      setLinkOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLinking(false);
    }
  }

  async function handlePush() {
    try {
      setPushing(true);
      setPushStatus('idle');
      setError(null);
      const res = await fetch(`/api/v1/projects/${projectId}/git/push`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Push failed');
      }
      setPushStatus('success');
    } catch (err) {
      setPushStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPushing(false);
    }
  }

  async function handlePull() {
    try {
      setPulling(true);
      setPullStatus('idle');
      setError(null);
      const res = await fetch(`/api/v1/projects/${projectId}/git/pull`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Pull failed');
      }
      setPullStatus('success');
    } catch (err) {
      setPullStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPulling(false);
    }
  }

  async function handleAddCredential() {
    if (!credProvider.trim() || !credToken.trim()) return;
    try {
      setAddingCred(true);
      setError(null);
      const res = await fetch('/api/v1/user/git-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: credProvider.trim(),
          token: credToken.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save credential');
      }
      setCredProvider('');
      setCredToken('');
      setCredOpen(false);
      await fetchCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAddingCred(false);
    }
  }

  async function handleDeleteCredential(id: string) {
    if (!confirm('Remove this credential?')) return;
    try {
      setError(null);
      await fetch(`/api/v1/user/git-credentials/${id}`, { method: 'DELETE' });
      await fetchCredentials();
    } catch {
      setError('Failed to remove credential');
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b px-3 py-2 text-sm font-medium">
        <GitBranch className="size-4" />
        Git Integration
      </div>

      {/* Error banner */}
      {error && (
        <p className="bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Remote URL section */}
          <section>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Remote
            </p>
            <div className="rounded-md border px-3 py-2">
              {remoteUrl ? (
                <p className="break-all font-mono text-xs">{remoteUrl}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No remote repository linked
                </p>
              )}
            </div>

            <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
              <DialogTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 w-full gap-1.5 text-xs"
                  >
                    <Link2 className="size-3.5" />
                    {remoteUrl ? 'Change Remote' : 'Link Remote'}
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Link Git Remote</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="remote-url">Remote URL</Label>
                    <Input
                      id="remote-url"
                      placeholder="https://github.com/user/repo.git"
                      value={remoteInput}
                      onChange={(e) => setRemoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLinkRemote();
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleLinkRemote}
                    disabled={linking || !remoteInput.trim()}
                    size="sm"
                  >
                    {linking ? 'Linking…' : 'Link'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <Separator />

          {/* Push / Pull */}
          <section>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sync
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1.5 text-xs"
                disabled={pushing || !remoteUrl}
                onClick={handlePush}
              >
                <Upload className="size-3.5" />
                {pushing ? 'Pushing…' : 'Push'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 gap-1.5 text-xs"
                disabled={pulling || !remoteUrl}
                onClick={handlePull}
              >
                <Download className="size-3.5" />
                {pulling ? 'Pulling…' : 'Pull'}
              </Button>
            </div>
            {pushStatus === 'success' && (
              <p className="mt-1.5 text-xs text-green-600">Pushed successfully.</p>
            )}
            {pullStatus === 'success' && (
              <p className="mt-1.5 text-xs text-green-600">Pulled successfully.</p>
            )}
          </section>

          <Separator />

          {/* Credentials */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Credentials
              </p>
              <Dialog open={credOpen} onOpenChange={setCredOpen}>
                <DialogTrigger
                  render={
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                      Add
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add Git Credential</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="cred-provider">Provider</Label>
                      <Input
                        id="cred-provider"
                        placeholder="github / gitlab / bitbucket"
                        value={credProvider}
                        onChange={(e) => setCredProvider(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="cred-token">Personal Access Token</Label>
                      <Input
                        id="cred-token"
                        type="password"
                        placeholder="ghp_…"
                        value={credToken}
                        onChange={(e) => setCredToken(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddCredential}
                      disabled={addingCred || !credProvider.trim() || !credToken.trim()}
                      size="sm"
                    >
                      {addingCred ? 'Saving…' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {credentials.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No credentials saved. Add a token to enable push/pull.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {credentials.map((c) => (
                  <li
                    key={c.id}
                    className="group flex items-center justify-between rounded-md border px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {c.provider}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        token ••••••
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleDeleteCredential(c.id)}
                      title="Remove credential"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
