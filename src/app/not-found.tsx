import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
        <FileQuestion className="size-10 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-muted-foreground/30">404</h1>
        <h2 className="mt-2 text-xl font-bold">Page Not Found</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="size-4" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
