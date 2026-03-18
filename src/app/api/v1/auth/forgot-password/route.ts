import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSignedToken } from '@/lib/jwt-utils';
import { sendEmail } from '@/lib/email';
import { errorResponse } from '@/lib/errors';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = createSignedToken(
        { sub: user.id, purpose: 'password-reset' },
        '1h',
      );

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendEmail(
        email,
        'Reset your PaperForge password',
        `<h1>Password Reset</h1>
         <p>Hi ${user.name},</p>
         <p>You requested a password reset. Click the link below to set a new password:</p>
         <p><a href="${resetUrl}">Reset Password</a></p>
         <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>`,
      );
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
