import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createProjectSchema,
  updateProjectSchema,
  changePasswordSchema,
  filePathSchema,
  BLOCKED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '@/lib/validation';

describe('registerSchema', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      name: 'Test User',
      password: 'StrongPass1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password (no uppercase)', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      name: 'Test',
      password: 'weakpass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      name: 'Test',
      password: 'Sh1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      name: 'Test',
      password: 'StrongPass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects XSS in name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      name: '<script>alert("xss")</script>',
      password: 'StrongPass1',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('createProjectSchema', () => {
  it('accepts valid project', () => {
    const result = createProjectSchema.safeParse({
      name: 'My Paper',
      compiler: 'pdflatex',
    });
    expect(result.success).toBe(true);
  });

  it('rejects XSS in name', () => {
    const result = createProjectSchema.safeParse({
      name: '<script>alert(1)</script>',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name over 255 chars', () => {
    const result = createProjectSchema.safeParse({
      name: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('defaults compiler to pdflatex', () => {
    const result = createProjectSchema.parse({ name: 'Test' });
    expect(result.compiler).toBe('pdflatex');
  });

  it('rejects invalid compiler', () => {
    const result = createProjectSchema.safeParse({
      name: 'Test',
      compiler: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateProjectSchema', () => {
  it('requires .tex extension for mainFile', () => {
    const result = updateProjectSchema.safeParse({
      mainFile: 'main.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid mainFile', () => {
    const result = updateProjectSchema.safeParse({
      mainFile: 'paper.tex',
    });
    expect(result.success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('rejects mismatched passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects same old and new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'SamePass1',
      newPassword: 'SamePass1',
      confirmPassword: 'SamePass1',
    });
    expect(result.success).toBe(false);
  });
});

describe('filePathSchema', () => {
  it('rejects directory traversal', () => {
    const result = filePathSchema.safeParse('../../../etc/passwd');
    expect(result.success).toBe(false);
  });

  it('rejects absolute paths', () => {
    const result = filePathSchema.safeParse('/etc/passwd');
    expect(result.success).toBe(false);
  });

  it('accepts valid paths', () => {
    const result = filePathSchema.safeParse('images/figure1.png');
    expect(result.success).toBe(true);
  });
});

describe('security constants', () => {
  it('blocks dangerous extensions', () => {
    expect(BLOCKED_EXTENSIONS.has('.exe')).toBe(true);
    expect(BLOCKED_EXTENSIONS.has('.sh')).toBe(true);
    expect(BLOCKED_EXTENSIONS.has('.bat')).toBe(true);
    expect(BLOCKED_EXTENSIONS.has('.tex')).toBe(false);
  });

  it('has reasonable file size limit', () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
  });
});
