import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Docker infrastructure', () => {
  const compose = readFileSync(join(process.cwd(), 'docker-compose.yml'), 'utf-8');
  const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf-8');
  const nginx = readFileSync(join(process.cwd(), 'nginx/nginx.conf'), 'utf-8');

  it('compose has all 8 services', () => {
    ['postgres', 'redis', 'minio', 'mailhog', 'worker', 'websocket', 'app', 'nginx'].forEach(s => {
      expect(compose).toContain(`${s}:`);
    });
  });
  it('compose has resource limits', () => { expect(compose).toContain('memory:'); });
  it('compose has restart policies', () => { expect(compose).toContain('restart: unless-stopped'); });
  it('compose has healthchecks', () => { expect(compose).toContain('healthcheck:'); });
  it('Dockerfile runs as non-root', () => { expect(dockerfile).toContain('USER nextjs'); });
  it('Dockerfile has OCI labels', () => { expect(dockerfile).toContain('org.opencontainers.image'); });
  it('Dockerfile multi-stage', () => { expect(dockerfile).toContain('FROM node:20-alpine AS builder'); });
  it('nginx has gzip', () => { expect(nginx).toContain('gzip on'); });
  it('nginx has security headers', () => { expect(nginx).toContain('X-Content-Type-Options'); });
  it('nginx has rate limiting', () => { expect(nginx).toContain('limit_req_zone'); });
});
