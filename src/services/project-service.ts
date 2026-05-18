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
    select: {
      id: true,
      name: true,
      description: true,
      compiler: true,
      mainFile: true,
      archived: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          projectId: true,
          userId: true,
          role: true,
          joinedAt: true,
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

/** Cap the number of files returned with a single project payload so a
 *  pathological project (10k+ files) cannot blow up the response. */
const MAX_PROJECT_FILES_IN_RESPONSE = 1000;

export async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null, members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      description: true,
      compiler: true,
      mainFile: true,
      archived: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          projectId: true,
          userId: true,
          role: true,
          joinedAt: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      files: {
        where: { deletedAt: null },
        orderBy: { path: 'asc' },
        take: MAX_PROJECT_FILES_IN_RESPONSE,
        select: {
          id: true,
          path: true,
          isBinary: true,
          sizeBytes: true,
          mimeType: true,
          updatedAt: true,
        },
      },
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
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
    select: { id: true, name: true, deletedAt: true },
  });
  // Soft-deletes are reversible by direct DB access only; an audit trail
  // makes the action recoverable and answers "who deleted X?" later.
  try {
    const { logAuditAction } = await import('@/services/audit-service');
    await logAuditAction(userId, 'project.soft_delete', 'project', projectId, {
      projectName: updated.name,
    });
  } catch (err) {
    // Never fail the user-visible delete because of a logging hiccup.
    console.error('[project-service] audit log failed for delete:', err);
  }
  return updated;
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
