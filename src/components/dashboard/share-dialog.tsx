'use client';

import { useState, useEffect, useCallback } from 'react';
import { Share2Icon, CopyIcon, CheckIcon, UserMinusIcon, LoaderCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface Member {
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface ShareDialogProps {
  projectId: string;
  currentUserId: string;
  currentUserRole: string;
  /** When provided the dialog is controlled externally (no built-in trigger rendered). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShareDialog({ projectId, currentUserRole, open: openProp, onOpenChange }: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? setInternalOpen) : setInternalOpen;
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Share link
  const [shareLink, setShareLink] = useState('');
  const [shareLinkPermission, setShareLinkPermission] = useState<'editor' | 'viewer'>('viewer');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = currentUserRole === 'owner';

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/members`);
      if (res.ok) {
        const result = await res.json();
        const data = (result.data ?? result) as Member[];
        setMembers(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      void fetchMembers();
    }
  }, [open, fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed to invite');
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      await fetchMembers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      await fetch(`/api/v1/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      await fetchMembers();
    } catch {
      // ignore
    }
  }

  async function handleRemove(userId: string) {
    try {
      await fetch(`/api/v1/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      });
      await fetchMembers();
    } catch {
      // ignore
    }
  }

  async function handleGenerateLink() {
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: shareLinkPermission }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed to generate link');
      const data = (result.data ?? result) as { token?: string };
      const appUrl = window.location.origin;
      setShareLink(`${appUrl}/api/v1/join/${data.token}`);
    } catch {
      // ignore
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleCopy() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <Share2Icon data-icon="inline-start" />
          Share
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Manage collaborators and create share links.
          </DialogDescription>
        </DialogHeader>

        {/* Member list */}
        <div className="mt-2">
          <p className="mb-2 text-sm font-medium">Members</p>
          {loadingMembers ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{m.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                  </div>

                  {isOwner && m.role !== 'owner' ? (
                    <>
                      <Select
                        value={m.role}
                        onValueChange={(val) => {
                          if (val) void handleRoleChange(m.userId, val);
                        }}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => void handleRemove(m.userId)}
                        aria-label={`Remove ${m.user.name}`}
                      >
                        <UserMinusIcon className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isOwner && (
          <>
            <Separator />

            {/* Invite by email */}
            <div>
              <p className="mb-2 text-sm font-medium">Invite by email</p>
              <form onSubmit={(e) => void handleInvite(e)} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={inviteRole}
                    onValueChange={(val) => {
                      if (val === 'editor' || val === 'viewer') setInviteRole(val);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviting || !inviteEmail.trim()} size="sm">
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </Button>
                {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
                {inviteSuccess && <p className="text-xs text-green-600">{inviteSuccess}</p>}
              </form>
            </div>

            <Separator />

            {/* Share link */}
            <div>
              <p className="mb-2 text-sm font-medium">Share Link</p>
              <div className="flex gap-2">
                <Select
                  value={shareLinkPermission}
                  onValueChange={(val) => {
                    if (val === 'editor' || val === 'viewer') setShareLinkPermission(val);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleGenerateLink()}
                  disabled={generatingLink}
                  className="shrink-0"
                >
                  {generatingLink ? 'Generating…' : 'Generate'}
                </Button>
              </div>

              {shareLink && (
                <div className="mt-2 flex gap-2">
                  <Label className="sr-only" htmlFor="share-link-input">Share link</Label>
                  <Input
                    id="share-link-input"
                    readOnly
                    value={shareLink}
                    className="flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void handleCopy()}
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <CheckIcon className="size-4 text-green-600" />
                    ) : (
                      <CopyIcon className="size-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
