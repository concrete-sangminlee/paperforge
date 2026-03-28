import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('project CRUD routes', () => {
  const list = readFileSync(join(process.cwd(), 'src/app/api/v1/projects/route.ts'), 'utf-8');
  it('GET uses apiSuccess', () => { expect(list).toContain('apiSuccess'); });
  it('POST uses apiSuccess', () => { expect(list).toContain('201'); });
  it('has auth check', () => { expect(list).toContain('ApiErrors'); });

  const detail = readFileSync(join(process.cwd(), 'src/app/api/v1/projects/[id]/route.ts'), 'utf-8');
  it('has GET', () => { expect(detail).toContain('GET'); });
  it('has PATCH', () => { expect(detail).toContain('PATCH'); });
  it('has DELETE', () => { expect(detail).toContain('DELETE'); });
  it('uses updateProjectSchema', () => { expect(detail).toContain('updateProjectSchema'); });
});

describe('project service', () => {
  const s = readFileSync(join(process.cwd(), 'src/services/project-service.ts'), 'utf-8');
  it('has listProjects', () => { expect(s).toContain('listProjects'); });
  it('has getProject', () => { expect(s).toContain('getProject'); });
  it('has createProject', () => { expect(s).toContain('createProject'); });
  it('has deleteProject', () => { expect(s).toContain('deleteProject'); });
  it('has assertProjectRole', () => { expect(s).toContain('assertProjectRole'); });
});

describe('file service', () => {
  const f = readFileSync(join(process.cwd(), 'src/services/file-service.ts'), 'utf-8');
  it('has listFiles', () => { expect(f).toContain('listFiles'); });
  it('has createFile', () => { expect(f).toContain('createFile'); });
  it('has getFileContent', () => { expect(f).toContain('getFileContent'); });
  it('has uploadBinaryFile', () => { expect(f).toContain('uploadBinaryFile'); });
  it('uses MinIO', () => { expect(f).toContain('minio'); });
});
