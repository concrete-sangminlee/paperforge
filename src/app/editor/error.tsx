'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, FolderIcon, RotateCcwIcon } from 'lucide-react';

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Editor Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangleIcon className="size-8 text-destructive" />
      </div>
      <h2 className="mt-6 text-xl font-semibold">Editor Error</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The editor encountered an unexpected error. This may be caused by a
        connection issue or an invalid project. Please try reloading.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={reset}>
          <RotateCcwIcon className="mr-2 size-4" />
          Reload Editor
        </Button>
        <Link href="/projects">
          <Button>
            <FolderIcon className="mr-2 size-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    </div>
  );
}
