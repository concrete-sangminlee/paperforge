import type { Metadata } from 'next';
import Link from 'next/link';
import { FlameIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'PaperForge release history — new features, improvements, and fixes.',
};

const RELEASES = [
  { version: '2.2.0', date: '2026-03-28', label: 'Latest', items: ['Pricing page', 'Privacy & Terms', 'Documentation hub', 'API reference', 'Demo seed script', '454 tests'] },
  { version: '2.0.0', date: '2026-03-28', label: '', items: ['Live Vercel deployment', 'Auth error fixes', 'Redis build fix', 'Cookie hardening'] },
  { version: '1.9.0', date: '2026-03-27', label: '', items: ['300+ tests milestone', 'BibTeX autocomplete', 'Environment auto-close'] },
  { version: '1.5.0', date: '2026-03-27', label: '', items: ['Delete line shortcut', 'Store persistence tests', '211 tests'] },
  { version: '1.3.0', date: '2026-03-27', label: '', items: ['200 tests', 'Ctrl+B/I/U/M wrapping', 'Security integration tests'] },
  { version: '1.1.0', date: '2026-03-27', label: '', items: ['Inline LaTeX linter', 'Code folding', 'Find in Project', 'Word count goal', 'Document outline'] },
  { version: '1.0.0', date: '2026-03-27', label: '', items: ['Full editor', 'Real-time collaboration', 'PDF viewer', 'Git integration', 'DOCX export', 'Admin panel'] },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center gap-2 border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <FlameIcon className="size-6 text-orange-500" />
          <span className="text-lg font-bold">PaperForge</span>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">Changelog</span>
      </nav>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight">Changelog</h1>
        <p className="mt-2 text-muted-foreground">All notable changes to PaperForge.</p>
        <div className="mt-12 space-y-8">
          {RELEASES.map((r) => (
            <div key={r.version} className="relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-px before:bg-border">
              <div className="absolute left-0 top-1 size-6 rounded-full border-2 border-orange-400 bg-background" />
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">v{r.version}</h2>
                <span className="text-sm text-muted-foreground">{r.date}</span>
                {r.label && <Badge className="bg-orange-500 text-white">{r.label}</Badge>}
              </div>
              <ul className="mt-2 space-y-1">
                {r.items.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
