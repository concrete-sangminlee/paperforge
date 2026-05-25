import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/lib/errors';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/user/account
 * Permanently destroys the user record and everything they own.
 *
 * Known gaps tracked for follow-up:
 *   - No server-side re-authentication (no password / OAuth re-confirm).
 *     A stolen session can wipe an account; UI's "type DELETE" prompt is
 *     only client-side friction.
 *   - Projects owned by the user are hard-deleted, taking every collaborator's
 *     work with them. There is no transfer-ownership flow yet, so the choice
 *     is "block deletion when shared" (UX cliff) vs "warn + proceed" (current).
 *     Revisit once an ownership-transfer endpoint exists.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;

    const limited = await enforceRateLimit(
      `rate:delete-account:${userId}`,
      RATE_LIMITS.ACCOUNT_DELETE,
      'Account deletion has been requested too many times. Please contact support if you are stuck.',
    );
    if (limited) return limited;

    // Wrap every deletion in a single transaction so a mid-way failure (timeout,
    // FK conflict, dropped connection) cannot strand the account half-deleted —
    // a state with no UI to recover from. Bumped timeout from the 5s default
    // because heavy users can own thousands of files / compilations.
    await prisma.$transaction(
      async (tx) => {
        await tx.gitCredential.deleteMany({ where: { userId } });
        await tx.projectMember.deleteMany({ where: { userId } });

        const ownedProjects = await tx.project.findMany({
          where: { createdBy: userId },
          select: { id: true },
        });
        if (ownedProjects.length > 0) {
          const projectIds = ownedProjects.map((p) => p.id);
          await tx.file.deleteMany({ where: { projectId: { in: projectIds } } });
          await tx.version.deleteMany({ where: { projectId: { in: projectIds } } });
          await tx.compilation.deleteMany({ where: { projectId: { in: projectIds } } });
          await tx.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
          await tx.project.deleteMany({ where: { createdBy: userId } });
        }

        await tx.template.deleteMany({ where: { authorId: userId } });
        await tx.auditLog.deleteMany({ where: { adminId: userId } });
        await tx.user.delete({ where: { id: userId } });
      },
      { timeout: 30_000 },
    );

    return apiSuccess({ message: 'Account deleted successfully.' });
  } catch (error) {
    return errorResponse(error);
  }
}
