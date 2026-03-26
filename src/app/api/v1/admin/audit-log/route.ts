import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { ApiErrors, apiSuccess } from '@/lib/api-response';
import { getAuditLog } from '@/services/audit-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || userRole !== 'admin') {
      return ApiErrors.forbidden();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const result = await getAuditLog(page, limit);
    return apiSuccess(result);
  } catch (error) {
    return errorResponse(error);
  }
}
