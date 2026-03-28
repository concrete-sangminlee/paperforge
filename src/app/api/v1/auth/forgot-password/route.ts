import { headers } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSignedToken } from '@/lib/jwt-utils';
import { sendEmail } from '@/lib/email';
import { errorResponse } from '@/lib/errors';
import { emailTemplate, buttonHtml } from '@/lib/email-templates';
import { checkRateLimit } from '@/lib/rate-limit';
import { apiError, apiSuccess } from '@/lib/api-response';
import { RATE_LIMITS } from '@/lib/constants';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    // Rate limit: 5 per 15 minutes per IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const rateLimit = await checkRateLimit(`rate:forgot-pw:${ip}`, RATE_LIMITS.FORGOT_PASSWORD.limit, RATE_LIMITS.FORGOT_PASSWORD.windowSeconds);
    if (!rateLimit.allowed) {
      return apiError('Too many attempts. Please try again later.', 429, 'RATE_LIMITED');
    }

    const reqBody = await request.json();
    const { email } = forgotPasswordSchema.parse(reqBody);

    // Always return 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = createSignedToken(
        { sub: user.id, purpose: 'password-reset' },
        '1h',
      );

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      const body = `
        <p style="margin:0 0 12px;color:#3f3f46">Hi ${user.name},</p>
        <p style="margin:0 0 12px;color:#3f3f46">We received a request to reset your password. Click the button below to choose a new one.</p>
        ${buttonHtml('Reset Password', resetUrl)}
        <p style="margin:16px 0 0;font-size:13px;color:#71717a">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
      `;
      await sendEmail(
        email,
        'Reset your PaperForge password',
        emailTemplate('Password Reset', body),
      );
    }

    return apiSuccess({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
