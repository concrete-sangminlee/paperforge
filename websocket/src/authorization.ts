import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getProjectRole(projectId: string, userId: string): Promise<string | null> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return member?.role || null;
}
