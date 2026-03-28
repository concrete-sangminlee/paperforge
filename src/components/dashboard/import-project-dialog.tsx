'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadIcon } from 'lucide-react';
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

export function ImportProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a ZIP file'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim() || file.name.replace(/\.zip$/i, ''));

      const res = await fetch('/api/v1/projects/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: { message?: string } }).error?.message || 'Import failed');
      }

      const result = await res.json();
      const project = result.data?.project ?? result.project;
      toast.success(`Imported ${result.data?.importedFiles ?? 0} files`);
      setOpen(false);
      router.push(`/editor/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UploadIcon data-icon="inline-start" />
        Import ZIP
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import Project</DialogTitle>
            <DialogDescription>
              Upload a ZIP file containing your LaTeX project. All text files will be imported automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="import-name">Project Name</Label>
              <Input
                id="import-name"
                placeholder="My Imported Paper"
                aria-label="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="import-file">ZIP File</Label>
              <Input
                ref={inputRef}
                id="import-file"
                type="file"
                accept=".zip"
                aria-label="ZIP file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Supports standard ZIP archives exported from Overleaf, GitHub, or any LaTeX editor.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading || !file}>
              {loading ? 'Importing...' : 'Import Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
