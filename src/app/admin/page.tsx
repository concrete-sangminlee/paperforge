'use client';

import useSWR from 'swr';
import { UsersIcon, FolderIcon, PlayIcon, HardDriveIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBytes(bytes: string | number): string {
  const n = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface Stats {
  userCount: number;
  projectCount: number;
  compilationCount: number;
  storageUsedBytes: string;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useSWR<Stats>('/api/v1/admin/stats', fetcher);

  const cards = [
    {
      title: 'Total Users',
      value: stats?.userCount ?? 0,
      icon: UsersIcon,
      color: 'text-blue-500',
    },
    {
      title: 'Active Projects',
      value: stats?.projectCount ?? 0,
      icon: FolderIcon,
      color: 'text-green-500',
    },
    {
      title: 'Compilations',
      value: stats?.compilationCount ?? 0,
      icon: PlayIcon,
      color: 'text-purple-500',
    },
    {
      title: 'Storage Used',
      value: stats ? formatBytes(stats.storageUsedBytes) : '—',
      icon: HardDriveIcon,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and statistics.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ title, value, icon: Icon, color }) => (
            <Card key={title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`size-5 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
