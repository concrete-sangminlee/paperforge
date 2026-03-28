import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ApiError } from '@/lib/errors';
import { AUTH } from '@/lib/constants';

export async function createUser(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

// Precomputed dummy hash for constant-time response when user doesn't exist
const DUMMY_HASH = '$2a$12$LJ3m4ys3Lg2JFMg.Vy1GNe8dOJGCqW2Yqz8Hb7MxFZLkXQdKLWy6';

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always perform bcrypt compare to prevent timing-based user enumeration
  if (!user || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(423, 'Account temporarily locked. Try again later or reset password.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const update: Record<string, unknown> = { failedLoginAttempts: attempts };
    if (attempts >= AUTH.MAX_FAILED_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + AUTH.LOCKOUT_DURATION_MS);
    }
    await prisma.user.update({ where: { id: user.id }, data: update });
    return null;
  }

  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
