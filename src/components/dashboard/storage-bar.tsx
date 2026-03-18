'use client';

import { cn } from '@/lib/utils';

interface StorageBarProps {
  usedBytes: number;
  quotaBytes: number;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[i]}`;
}

export function StorageBar({ usedBytes, quotaBytes, className }: StorageBarProps) {
  const percentage = quotaBytes > 0 ? Math.min((usedBytes / quotaBytes) * 100, 100) : 0;

  const barColor =
    percentage >= 90
      ? 'bg-red-500'
      : percentage >= 70
        ? 'bg-yellow-500'
        : 'bg-primary';

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Storage</span>
        <span>
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
