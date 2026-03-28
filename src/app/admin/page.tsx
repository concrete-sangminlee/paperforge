'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import {
  UsersIcon,
  FolderIcon,
  PlayIcon,
  HardDriveIcon,
  TrendingUpIcon,
  ActivityIcon,
  AlertTriangleIcon,
  RefreshCcwIcon,
  ArrowRightIcon,
  CircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


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

interface HealthData {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  checks: Record<string, { status: string; latency?: number }>;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, mutate } = useSWR<Stats>(
    '/api/v1/admin/stats',
    fetcher,
    { refreshInterval: 10000 },
  );

  const { data: health } = useSWR<HealthData>(
    '/api/healthz',
    fetcher,
    { refreshInterval: 15000 },
  );

  const cards = [
    {
      title: 'Total Users',
      value: stats?.userCount ?? 0,
      icon: UsersIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/admin/users',
    },
    {
      title: 'Active Projects',
      value: stats?.projectCount ?? 0,
      icon: FolderIcon,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '#',
    },
    {
      title: 'Compilations',
      value: stats?.compilationCount ?? 0,
      icon: PlayIcon,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/admin/workers',
    },
    {
      title: 'Storage Used',
      value: stats ? formatBytes(stats.storageUsedBytes) : '—',
      icon: HardDriveIcon,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '#',
    },
  ];

  const statusColor = {
    ok: 'text-green-500',
    degraded: 'text-amber-500',
    down: 'text-red-500',
  };

  const statusBg = {
    ok: 'bg-green-500/10',
    degraded: 'bg-amber-500/10',
    down: 'bg-red-500/10',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            System overview and real-time statistics
            <Badge variant="outline" className="ml-2 text-[10px]">
              <ActivityIcon className="mr-0.5 size-2.5" />
              Live
            </Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1.5">
          <RefreshCcwIcon className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ title, value, icon: Icon, color, bgColor, href }) => (
            <Link key={title} href={href}>
              <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                  <div className={`flex size-10 items-center justify-center rounded-lg ${bgColor}`}>
                    <Icon className={`size-5 ${color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUpIcon className="size-3" />
                    <span>View details</span>
                    <ArrowRightIcon className="size-3 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* System Health + Quick Links */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ActivityIcon className="size-4" />
              System Health
            </CardTitle>
            <CardDescription>Real-time service status</CardDescription>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-3">
                {/* Overall status */}
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${statusBg[health.status]}`}>
                  <div className="flex items-center gap-2">
                    {health.status === 'ok' ? (
                      <CheckCircleIcon className="size-4 text-green-500" />
                    ) : health.status === 'degraded' ? (
                      <AlertTriangleIcon className="size-4 text-amber-500" />
                    ) : (
                      <XCircleIcon className="size-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium capitalize ${statusColor[health.status]}`}>
                      {health.status === 'ok' ? 'All Systems Operational' : health.status === 'degraded' ? 'Degraded Performance' : 'System Down'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="size-3" />
                    Uptime: {formatUptime(health.uptime)}
                  </div>
                </div>

                {/* Service checks */}
                <div className="space-y-1.5">
                  {Object.entries(health.checks).map(([name, check]) => (
                    <div key={name} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CircleIcon className={`size-2.5 ${check.status === 'ok' ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                        <span className="text-sm capitalize">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.latency !== undefined && (
                          <span className="text-xs text-muted-foreground">{check.latency}ms</span>
                        )}
                        <Badge variant={check.status === 'ok' ? 'secondary' : 'destructive'} className="text-[10px]">
                          {check.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <UsersIcon className="size-4 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Manage Users</p>
                    <p className="text-[11px] text-muted-foreground">View, edit, ban users</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/templates">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <FolderIcon className="size-4 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Templates</p>
                    <p className="text-[11px] text-muted-foreground">Approve submissions</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/workers">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <PlayIcon className="size-4 text-purple-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Workers</p>
                    <p className="text-[11px] text-muted-foreground">Monitor compile queue</p>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/audit-log">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                  <ActivityIcon className="size-4 text-orange-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Audit Log</p>
                    <p className="text-[11px] text-muted-foreground">View admin actions</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
