import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

export async function createProject(
  userId: string,
  data: { name: string; description?: string; compiler?: string },
) {
  const project = await prisma.project.create({
    data: {
      createdBy: userId,
      name: data.name,
      description: data.description,
      compiler: data.compiler || 'pdflatex',
      members: { create: { userId, role: 'owner' } },
    },
  });
  return project;
}

export async function listProjects(userId: string, limit = 200) {
  return prisma.project.findMany({
    where: { deletedAt: null, members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        take: 10, // Limit members per project to avoid large payloads
      },
      _count: { select: { files: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null, members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      files: { where: { deletedAt: null }, orderBy: { path: 'asc' } },
    },
  });
  if (!project) throw new ApiError(404, 'Project not found');
  return project;
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    compiler?: string;
    mainFile?: string;
    archived?: boolean;
  },
) {
  await assertProjectRole(projectId, userId, ['owner', 'editor']);
  return prisma.project.update({ where: { id: projectId }, data });
}

export async function deleteProject(projectId: string, userId: string) {
  await assertProjectRole(projectId, userId, ['owner']);
  return prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
}

export async function assertProjectRole(
  projectId: string,
  userId: string,
  roles: string[],
) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member || !roles.includes(member.role)) {
    throw new ApiError(403, 'Insufficient permissions');
  }
  return member;
}
