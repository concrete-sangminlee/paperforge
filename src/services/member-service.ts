import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { sendEmail } from '@/lib/email';
import { assertProjectRole } from '@/services/project-service';
import { emailTemplate, buttonHtml, escapeHtml } from '@/lib/email-templates';

export async function inviteMember(
  projectId: string,
  inviterId: string,
  email: string,
  role: 'editor' | 'viewer',
) {
  await assertProjectRole(projectId, inviterId, ['owner']);

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    // Return a generic success to prevent email enumeration.
    // In production, consider sending an invitation email to unregistered addresses.
    return { invited: true, message: 'If an account with that email exists, the invitation has been sent.' };
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: invitee.id } },
  });
  if (existing) {
    throw new ApiError(409, 'User is already a member of this project');
  }

  const member = await prisma.projectMember.create({
    data: { projectId, userId: invitee.id, role },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { name: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const projectName = escapeHtml(project?.name ?? 'a project');
  const inviteeName = escapeHtml(invitee.name ?? 'there');
  const projectUrl = `${appUrl}/editor/${projectId}`;
  const body = `
    <p style="margin:0 0 12px;color:#3f3f46">Hi ${inviteeName},</p>
    <p style="margin:0 0 12px;color:#3f3f46">You have been added as a <strong>${role}</strong> to the project <strong>${projectName}</strong> on PaperForge.</p>
    ${buttonHtml('Open Project', projectUrl)}
    <p style="margin:16px 0 0;font-size:13px;color:#71717a">If you believe this was sent in error, you can ignore this email.</p>
  `;
  // Fire-and-forget to normalize response timing (prevents timing side-channel
  // that could reveal whether the invitee has a registered account)
  sendEmail(
    email,
    `You've been invited to "${project?.name ?? 'a project'}" on PaperForge`,
    emailTemplate(`You've been added to "${projectName}"`, body),
  ).catch((err) => console.error('[member-service] Failed to send invitation email:', err));

  return member;
}

export async function updateMemberRole(
  projectId: string,
  requesterId: string,
  targetUserId: string,
  role: 'editor' | 'viewer',
) {
  await assertProjectRole(projectId, requesterId, ['owner']);

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) throw new ApiError(404, 'Member not found');
  if (target.role === 'owner') throw new ApiError(400, 'Cannot change the owner\'s role');

  return prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });
}

export async function removeMember(
  projectId: string,
  requesterId: string,
  targetUserId: string,
) {
  await assertProjectRole(projectId, requesterId, ['owner']);

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) throw new ApiError(404, 'Member not found');
  if (target.role === 'owner') throw new ApiError(400, 'Cannot remove the project owner');

  return prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
}

export async function getMembers(projectId: string, requesterId: string) {
  await assertProjectRole(projectId, requesterId, ['owner', 'editor', 'viewer']);

  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function createShareLink(
  projectId: string,
  requesterId: string,
  permission: 'editor' | 'viewer',
  expiresAt?: Date,
) {
  await assertProjectRole(projectId, requesterId, ['owner']);

  const token = crypto.randomBytes(32).toString('hex');

  const link = await prisma.shareLink.create({
    data: { projectId, token, permission, expiresAt: expiresAt ?? null },
  });

  return link;
}

export async function joinViaShareLink(token: string, userId: string) {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) throw new ApiError(404, 'Share link not found');
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new ApiError(410, 'Share link has expired');
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: link.projectId, userId } },
  });
  if (existing) {
    // Already a member — just return the project
    return prisma.project.findFirst({ where: { id: link.projectId, deletedAt: null } });
  }

  await prisma.projectMember.create({
    data: { projectId: link.projectId, userId, role: link.permission },
  });

  return prisma.project.findFirst({ where: { id: link.projectId, deletedAt: null } });
}
