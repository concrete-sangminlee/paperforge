import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export type CompilerType = 'pdflatex' | 'xelatex' | 'lualatex';

export interface CompileResult {
  success: boolean;
  log: string;
  pdfPath?: string;
  synctexPath?: string;
  durationMs: number;
}

function getCompilerFlag(compiler: CompilerType): string {
  switch (compiler) {
    case 'xelatex':
      return '-xelatex';
    case 'lualatex':
      return '-lualatex';
    case 'pdflatex':
    default:
      return '-pdf';
  }
}

export async function compileLatex(
  workDir: string,
  mainFile: string,
  compiler: CompilerType,
): Promise<CompileResult> {
  const startTime = Date.now();
  const compilerFlag = getCompilerFlag(compiler);

  // Derive base name (strip .tex extension) for output file discovery
  const baseName = mainFile.replace(/\.tex$/i, '');
  const pdfPath = path.join(workDir, `${baseName}.pdf`);
  const synctexPath = path.join(workDir, `${baseName}.synctex.gz`);

  const args = [
    compilerFlag,
    '-interaction=nonstopmode',
    '-synctex=1',
    '-file-line-error',
    mainFile,
  ];

  let log = '';
  let success = false;

  try {
    const { stdout, stderr } = await execFileAsync('latexmk', args, {
      cwd: workDir,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });
    log = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
    success = true;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    log =
      (execErr.stdout ?? '') +
      (execErr.stderr ? `\nSTDERR:\n${execErr.stderr}` : '') +
      (execErr.message ? `\nERROR: ${execErr.message}` : '');
    success = false;
  }

  const durationMs = Date.now() - startTime;

  const result: CompileResult = { success, log, durationMs };

  if (success || fs.existsSync(pdfPath)) {
    if (fs.existsSync(pdfPath)) {
      result.pdfPath = pdfPath;
    }
    if (fs.existsSync(synctexPath)) {
      result.synctexPath = synctexPath;
    }
  }

  return result;
}
