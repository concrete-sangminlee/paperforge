import { z } from 'zod';

// Common validation patterns
const safeString = z.string().refine(
  (v) => !/<script|javascript:|on\w+=/i.test(v),
  'Contains invalid characters'
);

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  name: safeString.min(1, 'Name is required').max(255, 'Name too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must differ from current', path: ['newPassword'] }
);

export const createProjectSchema = z.object({
  name: safeString.min(1, 'Project name is required').max(255, 'Name too long'),
  description: safeString.max(1000, 'Description too long').optional(),
  compiler: z.enum(['pdflatex', 'xelatex', 'lualatex']).default('pdflatex'),
});

export const updateProjectSchema = z.object({
  name: safeString.min(1).max(255).optional(),
  description: safeString.max(1000).optional(),
  compiler: z.enum(['pdflatex', 'xelatex', 'lualatex']).optional(),
  mainFile: z.string().max(255).regex(/\.tex$/, 'Main file must be a .tex file').optional(),
  archived: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']),
});

export const filePathSchema = z.string()
  .min(1, 'File path required')
  .max(1024, 'Path too long')
  .refine(
    (v) => !v.includes('..') && !v.startsWith('/'),
    'Invalid file path'
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'createdAt', 'updatedAt']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  query: z.string().max(255).optional(),
  category: z.string().max(50).optional(),
});

// Allowed file upload MIME types
export const ALLOWED_UPLOAD_TYPES = new Set([
  'text/plain',
  'text/x-tex',
  'text/x-bibtex',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'application/zip',
  'application/x-tar',
  'application/gzip',
  'application/eps',
  'application/postscript',
]);

// Blocked file extensions — executables, scripts, and potentially dangerous formats
export const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.cpl',
  '.sh', '.bash', '.ps1', '.vbs', '.vbe', '.wsf', '.wsh',
  '.js', '.jse', '.jar', '.class',
  '.py', '.rb', '.pl', '.php', '.asp', '.jsp', '.cgi',
  '.dll', '.sys', '.drv', '.ocx',
]);

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PROJECT_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_USER_STORAGE = 2 * 1024 * 1024 * 1024; // 2GB
