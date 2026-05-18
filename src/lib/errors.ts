import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Prisma raises typed errors with a "code" field (P-codes). We don't import
 * Prisma types here to avoid bundling the client into edge runtime; instead
 * we structurally match by name + code shape.
 */
function isPrismaError(error: unknown): error is { name: string; code: string; meta?: Record<string, unknown> } {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return (
    typeof candidate.name === 'string' &&
    candidate.name.startsWith('PrismaClient') &&
    typeof candidate.code === 'string' &&
    candidate.code.startsWith('P')
  );
}

function isPrismaValidationError(error: unknown): boolean {
  return !!error && typeof error === 'object'
    && (error as { name?: string }).name === 'PrismaClientValidationError';
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code ?? `ERR_${error.statusCode}`,
          message: error.message,
        },
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { fields: fieldErrors },
        },
      },
      { status: 400 },
    );
  }

  // Map common Prisma errors to user-meaningful HTTP responses so we
  // don't leak stack traces or surface bare 500s for things like
  // "malformed UUID in path param".
  if (isPrismaError(error)) {
    switch (error.code) {
      case 'P2023': // inconsistent column data (e.g. malformed UUID)
      case 'P2020': // value out of range
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Invalid identifier in request' } },
          { status: 400 },
        );
      case 'P2025': // record not found
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } },
          { status: 404 },
        );
      case 'P2002': // unique constraint
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Resource already exists' } },
          { status: 409 },
        );
      case 'P2003': // foreign key constraint
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Cannot complete operation due to related resources' } },
          { status: 409 },
        );
    }
  }

  if (isPrismaValidationError(error)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Invalid request data' } },
      { status: 400 },
    );
  }

  console.error('Unexpected error:', error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    { status: 500 },
  );
}
