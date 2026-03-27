import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, changePasswordSchema, createProjectSchema, filePathSchema } from '@/lib/validation';

describe('security integration', () => {
  describe('XSS prevention in all schemas', () => {
    it('register rejects script tags in name', () => {
      expect(registerSchema.safeParse({
        email: 'a@b.com', name: '<script>alert(1)</script>', password: 'Valid1Pass',
      }).success).toBe(false);
    });

    it('register rejects javascript: in name', () => {
      expect(registerSchema.safeParse({
        email: 'a@b.com', name: 'javascript:void(0)', password: 'Valid1Pass',
      }).success).toBe(false);
    });

    it('register rejects onload= in name', () => {
      expect(registerSchema.safeParse({
        email: 'a@b.com', name: 'onload=alert(1)', password: 'Valid1Pass',
      }).success).toBe(false);
    });

    it('project name rejects script tags', () => {
      expect(createProjectSchema.safeParse({
        name: '<script>document.cookie</script>',
      }).success).toBe(false);
    });
  });

  describe('path traversal prevention', () => {
    it('blocks ../ in file paths', () => {
      expect(filePathSchema.safeParse('../../etc/shadow').success).toBe(false);
    });

    it('blocks /absolute paths', () => {
      expect(filePathSchema.safeParse('/etc/passwd').success).toBe(false);
    });

    it('blocks backslash traversal', () => {
      expect(filePathSchema.safeParse('..\\windows\\system32').success).toBe(false);
    });

    it('allows nested directories', () => {
      expect(filePathSchema.safeParse('chapters/01/intro.tex').success).toBe(true);
    });
  });

  describe('password policy enforcement', () => {
    it('rejects password without uppercase', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'old', newPassword: 'nouppercase1', confirmPassword: 'nouppercase1',
      }).success).toBe(false);
    });

    it('rejects password without digit', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'old', newPassword: 'NoDigitHere', confirmPassword: 'NoDigitHere',
      }).success).toBe(false);
    });

    it('rejects mismatched confirm', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'old', newPassword: 'NewPass1', confirmPassword: 'Different1',
      }).success).toBe(false);
    });

    it('rejects same old and new', () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: 'SamePass1', newPassword: 'SamePass1', confirmPassword: 'SamePass1',
      }).success).toBe(false);
    });
  });
});
