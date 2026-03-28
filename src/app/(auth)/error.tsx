'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Auth Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangleIcon className="size-8 text-destructive" />
      </div>
      <h2 className="mt-6 text-xl font-semibold">Authentication Error</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Something went wrong with authentication. Please try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={reset}>
          <RotateCcwIcon className="mr-2 size-4" />
          Try Again
        </Button>
        <Link href="/login">
          <Button>Back to Login</Button>
        </Link>
      </div>
    </div>
  );
}
