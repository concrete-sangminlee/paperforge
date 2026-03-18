import { NextResponse } from 'next/server';
import { verifySignedToken } from '@/lib/jwt-utils';
import { prisma } from '@/lib/prisma';
import { errorResponse, ApiError } from '@/lib/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const payload = verifySignedToken(token);

    if (payload.purpose !== 'email-verify') {
      throw new ApiError(400, 'Invalid token purpose');
    }

    const userId = payload.sub as string;
    if (!userId) {
      throw new ApiError(400, 'Invalid token');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  } catch (error) {
    return errorResponse(error);
  }
}
