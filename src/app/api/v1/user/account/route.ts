import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/lib/errors';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;

    // Delete in dependency order to respect foreign keys
    // 1. Delete user's git credentials
    await prisma.gitCredential.deleteMany({ where: { userId } });

    // 2. Remove user from project memberships
    await prisma.projectMember.deleteMany({ where: { userId } });

    // 3. Delete projects created by this user (cascades to files, versions, etc.)
    const ownedProjects = await prisma.project.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });
    if (ownedProjects.length > 0) {
      const projectIds = ownedProjects.map((p) => p.id);
      await prisma.file.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.version.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.compilation.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.project.deleteMany({ where: { createdBy: userId } });
    }

    // 4. Delete templates authored by user
    await prisma.template.deleteMany({ where: { authorId: userId } });

    // 5. Delete audit log entries referencing this user (FK constraint)
    await prisma.auditLog.deleteMany({ where: { adminId: userId } });

    // 6. Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    return apiSuccess({ message: 'Account deleted successfully.' });
  } catch (error) {
    return errorResponse(error);
  }
}
