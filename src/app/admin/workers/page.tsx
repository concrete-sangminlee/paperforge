'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { CpuIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


interface QueueInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface Worker {
  id: string;
  status: string;
  note: string;
}

interface WorkersData {
  queue: QueueInfo;
  workers: Worker[];
}

export default function AdminWorkersPage() {
  const { data, isLoading } = useSWR<WorkersData>('/api/v1/admin/workers', fetcher, {
    refreshInterval: 5000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Worker Status</h1>
        <p className="text-sm text-muted-foreground">
          Compilation queue and worker status. Refreshes every 5 seconds.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data ? (
        <>
          <div>
            <h2 className="mb-3 text-lg font-semibold">
              Queue: {data.queue.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Waiting', value: data.queue.waiting, color: 'text-yellow-500' },
                { label: 'Active', value: data.queue.active, color: 'text-blue-500' },
                { label: 'Completed', value: data.queue.completed, color: 'text-green-500' },
                { label: 'Failed', value: data.queue.failed, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Workers</h2>
            <div className="flex flex-col gap-3">
              {data.workers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center gap-3 rounded-lg border p-4"
                >
                  <CpuIcon className="size-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{worker.id}</p>
                    <p className="text-xs text-muted-foreground">{worker.note}</p>
                  </div>
                  <Badge
                    className={
                      worker.status === 'running'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }
                    variant="outline"
                  >
                    {worker.status === 'running' ? (
                      <CheckCircleIcon className="mr-1 size-3" />
                    ) : (
                      <AlertCircleIcon className="mr-1 size-3" />
                    )}
                    {worker.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Failed to load worker status.</p>
      )}
    </div>
  );
}
