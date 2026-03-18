import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/errors';
import { getTemplate } from '@/services/template-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const template = await getTemplate(id);
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}
