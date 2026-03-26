import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifySignedToken } from '@/lib/jwt-utils';
import { prisma } from '@/lib/prisma';
import { errorResponse, ApiError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
});

export async function POST(request: Request) {
  try {
    // Rate limit: 5 per 15 minutes per IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const rateLimit = await checkRateLimit(`rate:reset-pw:${ip}`, 5, 900);
    if (!rateLimit.allowed) {
      return apiError('Too many attempts. Please try again later.', 429, 'RATE_LIMITED');
    }

    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const payload = verifySignedToken(token);

    if (payload.purpose !== 'password-reset') {
      throw new ApiError(400, 'Invalid token purpose');
    }

    const userId = payload.sub as string;
    if (!userId) {
      throw new ApiError(400, 'Invalid token');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return NextResponse.json({
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
