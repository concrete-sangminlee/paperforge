import * as git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

const REPOS_BASE = process.env.GIT_REPOS_PATH || '/tmp/paperforge-repos';

function getRepoPath(projectId: string) {
  return path.join(REPOS_BASE, projectId);
}

export async function initProjectRepo(projectId: string) {
  const dir = getRepoPath(projectId);
  await fs.promises.mkdir(dir, { recursive: true });
  await git.init({ fs, dir });
  return dir;
}

export async function commitProjectFiles(
  projectId: string,
  _userId: string,
  message: string,
) {
  const dir = getRepoPath(projectId);

  // Ensure repo is initialised
  try {
    await git.resolveRef({ fs, dir, ref: 'HEAD' });
  } catch {
    await initProjectRepo(projectId);
  }

  // Get all non-deleted files from DB and stage them
  const files = await prisma.file.findMany({
    where: { projectId, deletedAt: null },
  });

  for (const file of files) {
    const filePath = path.join(dir, file.path);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    // Write placeholder content for text files; binary files are omitted from
    // the git diff view but their paths are still staged so history is accurate.
    if (!file.isBinary) {
      // In a full implementation this would fetch the actual content from MinIO.
      await fs.promises.writeFile(filePath, '');
    }
    await git.add({ fs, dir, filepath: file.path });
  }

  const sha = await git.commit({
    fs,
    dir,
    message,
    author: { name: 'PaperForge', email: 'auto@paperforge.dev' },
  });

  return sha;
}

export async function createVersion(
  projectId: string,
  userId: string,
  label?: string,
) {
  const sha = await commitProjectFiles(
    projectId,
    userId,
    label || 'Auto-save',
  );

  return prisma.version.create({
    data: { projectId, userId, label, gitHash: sha },
  });
}

export async function listVersions(projectId: string) {
  return prisma.version.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getVersionDiff(projectId: string, versionId: string) {
  const version = await prisma.version.findUnique({ where: { id: versionId } });
  if (!version) throw new ApiError(404, 'Version not found');

  const dir = getRepoPath(projectId);

  // Retrieve the commit log starting at this version's hash (depth 2 to show parent)
  const log = await git.log({ fs, dir, ref: version.gitHash, depth: 2 });

  return {
    version,
    commits: log.map((c) => ({
      oid: c.oid,
      message: c.commit.message,
      author: c.commit.author.name,
      timestamp: new Date(c.commit.author.timestamp * 1000),
    })),
  };
}

export async function restoreVersion(projectId: string, versionId: string) {
  const version = await prisma.version.findUnique({ where: { id: versionId } });
  if (!version) throw new ApiError(404, 'Version not found');

  const dir = getRepoPath(projectId);

  await git.checkout({ fs, dir, ref: version.gitHash, force: true });

  return version;
}
