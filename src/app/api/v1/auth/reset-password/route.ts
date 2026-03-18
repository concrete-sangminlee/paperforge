import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { verifySignedToken } from '@/lib/jwt-utils';
import { prisma } from '@/lib/prisma';
import { errorResponse, ApiError } from '@/lib/errors';

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
