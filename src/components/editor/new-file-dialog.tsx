'use client';

import { useState } from 'react';
import { FilePlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface NewFileDialogProps {
  projectId: string;
  onCreated: () => void;
}

export function NewFileDialog({ projectId, onCreated }: NewFileDialogProps) {
  const [open, setOpen] = useState(false);

  // Listen for Ctrl+N event
  useState(() => {
    function handleNewFile() { setOpen(true); }
    window.addEventListener('new-file', handleNewFile);
    return () => window.removeEventListener('new-file', handleNewFile);
  });
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const path = filePath.trim();
    if (!path) {
      setError('File name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/files/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to create file');
      }

      setOpen(false);
      setFilePath('');
      onCreated();
      toast.success('File created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast.error('Failed to create file');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="size-6" aria-label="New file" />
      }>
        <FilePlusIcon className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
            <DialogDescription>
              Enter a path for the new file, e.g. <code>sections/intro.tex</code>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="new-file-path">File path</Label>
            <Input
              id="new-file-path"
              placeholder="main.tex"
              aria-label="File path"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading || !filePath.trim()}>
              {loading ? 'Creating…' : 'Create File'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
