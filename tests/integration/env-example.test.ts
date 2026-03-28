import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const env = readFileSync(join(process.cwd(), '.env.example'), 'utf-8');

describe('.env.example completeness', () => {
  ['DATABASE_URL','REDIS_URL','MINIO_ENDPOINT','MINIO_PORT','MINIO_ACCESS_KEY','MINIO_SECRET_KEY','MINIO_BUCKET',
   'NEXTAUTH_SECRET','NEXTAUTH_URL','SMTP_HOST','SMTP_PORT','SMTP_FROM','ENCRYPTION_KEY',
   'NEXT_PUBLIC_WS_URL','NEXT_PUBLIC_APP_NAME'].forEach(key => {
    it(`has ${key}`, () => { expect(env).toContain(key); });
  });
  it('has OAuth placeholders', () => {
    expect(env).toContain('GOOGLE_CLIENT_ID');
    expect(env).toContain('GITHUB_CLIENT_ID');
  });
});
