import { headers } from 'next/headers';
import { registerSchema } from '@/lib/validation';
import { createUser } from '@/services/user-service';
import { createSignedToken } from '@/lib/jwt-utils';
import { sendEmail } from '@/lib/email';
import { errorResponse } from '@/lib/errors';
import { emailTemplate, buttonHtml } from '@/lib/email-templates';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 registrations per 15 minutes per IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const rateLimit = await checkRateLimit(`rate:register:${ip}`, 5, 900);
    if (!rateLimit.allowed) {
      return apiError('Too many registration attempts. Please try again later.', 429, 'RATE_LIMITED', {
        ...rateLimitHeaders(5, rateLimit),
      });
    }

    const reqBody = await request.json();
    const { email, name, password } = registerSchema.parse(reqBody);

    let user;
    try {
      user = await createUser(email, name, password);
    } catch {
      // Always return success to prevent email enumeration
      return apiSuccess({ message: 'If this email is available, a verification link has been sent.' }, 201);
    }

    const token = createSignedToken(
      { sub: user.id, purpose: 'email-verify' },
      '24h',
    );

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/v1/auth/verify-email/${token}`;

    const body = `
      <p style="margin:0 0 12px;color:#3f3f46">Hi ${name},</p>
      <p style="margin:0 0 12px;color:#3f3f46">Thanks for signing up! Please verify your email address to get started.</p>
      ${buttonHtml('Verify Email', verifyUrl)}
      <p style="margin:16px 0 0;font-size:13px;color:#71717a">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    `;
    await sendEmail(
      email,
      'Verify your PaperForge email',
      emailTemplate('Welcome to PaperForge!', body),
    );

    return apiSuccess({ user }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
