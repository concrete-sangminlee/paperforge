import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validation';
import { createUser } from '@/services/user-service';
import { createSignedToken } from '@/lib/jwt-utils';
import { sendEmail } from '@/lib/email';
import { errorResponse } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = registerSchema.parse(body);

    const user = await createUser(email, name, password);

    const token = createSignedToken(
      { sub: user.id, purpose: 'email-verify' },
      '24h',
    );

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/v1/auth/verify-email/${token}`;

    await sendEmail(
      email,
      'Verify your PaperForge email',
      `<h1>Welcome to PaperForge!</h1>
       <p>Hi ${name},</p>
       <p>Please verify your email by clicking the link below:</p>
       <p><a href="${verifyUrl}">Verify Email</a></p>
       <p>This link expires in 24 hours.</p>`,
    );

    return NextResponse.json(
      { user },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
