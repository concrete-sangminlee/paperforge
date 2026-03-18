import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import {
  LayoutDashboardIcon,
  UsersIcon,
  LayoutTemplateIcon,
  ClipboardListIcon,
  CpuIcon,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/templates', label: 'Templates', icon: LayoutTemplateIcon },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardListIcon },
  { href: '/admin/workers', label: 'Workers', icon: CpuIcon },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) {
    redirect('/login');
  }
  if (userRole !== 'admin') {
    redirect('/projects');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-semibold text-sm">Admin Panel</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t p-3">
          <Link
            href="/projects"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
