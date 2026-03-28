import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProject } from '@/services/project-service';
import { listFiles, createFile } from '@/services/file-service';
import { EditorLayout } from '@/components/editor/editor-layout';
import { ErrorBoundary } from '@/components/shared/error-boundary';

interface EditorPageProps {
  params: Promise<{ projectId: string }>;
}

const MAIN_TEX_TEMPLATE = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath, amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{My Document}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Write your introduction here.

\\section{Conclusion}
Write your conclusion here.

\\end{document}
`;

export default async function EditorPage({ params }: EditorPageProps) {
  let session = null;
  try {
    session = await auth();
  } catch {
    redirect('/login');
  }
  if (!session?.user) {
    redirect('/login');
  }

  const { projectId } = await params;
  const userId = (session.user as { id: string }).id;

  let project;
  let fileEntries: Array<{ id: string; path: string; mimeType: string | null; isBinary: boolean }> = [];

  try {
    project = await getProject(projectId, userId);
    let files = await listFiles(projectId);

    if (files.length === 0) {
      await createFile(projectId, 'main.tex', MAIN_TEX_TEMPLATE);
      files = await listFiles(projectId);
    }

    fileEntries = files.map((f) => ({
      id: f.id,
      path: f.path,
      mimeType: f.mimeType,
      isBinary: f.isBinary,
    }));
  } catch {
    redirect('/projects');
  }

  return (
    <ErrorBoundary>
      <EditorLayout
        projectId={projectId}
        projectName={project.name}
        initialMainFile={project.mainFile}
        files={fileEntries}
      />
    </ErrorBoundary>
  );
}
