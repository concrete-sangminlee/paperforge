'use client';

import useSWR from 'swr';
import { FileTextIcon } from 'lucide-react';
import { ProjectCard, type ProjectData } from '@/components/dashboard/project-card';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { StorageBar } from '@/components/dashboard/storage-bar';
import { useSession } from 'next-auth/react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProjectsPage() {
  const { data: session } = useSession();
  const { data: projects, isLoading } = useSWR<ProjectData[]>(
    '/api/v1/projects',
    fetcher,
  );

  const user = session?.user as {
    storageUsedBytes?: number;
    storageQuotaBytes?: number;
  } | undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and collaborate on your LaTeX documents.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {user?.storageQuotaBytes && (
        <StorageBar
          usedBytes={user.storageUsedBytes ?? 0}
          quotaBytes={user.storageQuotaBytes}
          className="max-w-sm"
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <FileTextIcon className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to get started.
          </p>
          <div className="mt-4">
            <CreateProjectDialog />
          </div>
        </div>
      )}
    </div>
  );
}
