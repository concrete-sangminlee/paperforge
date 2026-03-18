'use client';

import Link from 'next/link';
import { FileTextIcon, ClockIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';

interface ProjectMember {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  compiler: string;
  updatedAt: string;
  members: ProjectMember[];
  _count: {
    files: number;
  };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString();
  }
  if (diffDay > 0) {
    return `${diffDay}d ago`;
  }
  if (diffHour > 0) {
    return `${diffHour}h ago`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`;
  }
  return 'just now';
}

export function ProjectCard({ project }: { project: ProjectData }) {
  const maxAvatars = 3;
  const visibleMembers = project.members.slice(0, maxAvatars);
  const remainingCount = project.members.length - maxAvatars;

  return (
    <Link href={`/editor/${project.id}`} className="group block">
      <Card className="transition-shadow hover:shadow-md hover:ring-foreground/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
              {project.compiler}
            </Badge>
          </div>
          {project.description && (
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardFooter className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileTextIcon className="size-3.5" />
              {project._count.files} {project._count.files === 1 ? 'file' : 'files'}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
          <AvatarGroup>
            {visibleMembers.map((member) => (
              <Avatar key={member.userId} size="sm">
                {member.user.avatarUrl && (
                  <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                )}
                <AvatarFallback>
                  {member.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <AvatarGroupCount>+{remainingCount}</AvatarGroupCount>
            )}
          </AvatarGroup>
        </CardFooter>
      </Card>
    </Link>
  );
}
