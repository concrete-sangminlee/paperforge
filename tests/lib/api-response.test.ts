import { describe, it, expect } from 'vitest';
import { apiSuccess, apiPaginated, apiError, apiValidationError, ApiErrors } from '@/lib/api-response';
import { ZodError, ZodIssueCode } from 'zod';

describe('apiSuccess', () => {
  it('returns success response with data', async () => {
    const res = apiSuccess({ id: '1', name: 'test' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '1', name: 'test' });
  });

  it('supports custom status code', async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

describe('apiPaginated', () => {
  it('returns paginated response with metadata', async () => {
    const items = [{ id: '1' }, { id: '2' }];
    const res = apiPaginated(items, { page: 1, limit: 10, total: 25 });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      pages: 3,
      hasNext: true,
      hasPrev: false,
    });
    expect(res.headers.get('X-Total-Count')).toBe('25');
    expect(res.headers.get('X-Page-Count')).toBe('3');
  });

  it('handles last page correctly', async () => {
    const res = apiPaginated([], { page: 3, limit: 10, total: 25 });
    const body = await res.json();
    expect(body.pagination.hasNext).toBe(false);
    expect(body.pagination.hasPrev).toBe(true);
  });
});

describe('apiError', () => {
  it('returns error response', async () => {
    const res = apiError('Not found', 404, 'NOT_FOUND');
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Not found');
  });

  it('includes details when provided', async () => {
    const res = apiError('Bad', 400, 'BAD', { field: 'email' });
    const body = await res.json();
    expect(body.error.details).toEqual({ field: 'email' });
  });
});

describe('apiValidationError', () => {
  it('formats Zod errors into field map', async () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        type: 'string',
        inclusive: true,
        message: 'Required',
        path: ['name'],
      },
      {
        code: ZodIssueCode.invalid_string,
        validation: 'email',
        message: 'Invalid email',
        path: ['email'],
      },
    ]);

    const res = apiValidationError(zodError);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.fields.name).toContain('Required');
    expect(body.error.details.fields.email).toContain('Invalid email');
  });
});

describe('ApiErrors', () => {
  it('unauthorized returns 401', async () => {
    const res = ApiErrors.unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('forbidden returns 403', async () => {
    const res = ApiErrors.forbidden();
    expect(res.status).toBe(403);
  });

  it('notFound returns 404 with resource name', async () => {
    const res = ApiErrors.notFound('Project');
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error.message).toBe('Project not found');
  });

  it('rateLimited returns 429', async () => {
    const res = ApiErrors.rateLimited();
    expect(res.status).toBe(429);
  });
});
