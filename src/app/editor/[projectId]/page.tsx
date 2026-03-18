import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProject } from '@/services/project-service';
import { listFiles, createFile } from '@/services/file-service';
import { EditorLayout } from '@/components/editor/editor-layout';

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
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { projectId } = await params;
  const userId = (session.user as { id: string }).id;

  const project = await getProject(projectId, userId);
  let files = await listFiles(projectId);

  // Auto-create main.tex if there are no files
  if (files.length === 0) {
    await createFile(projectId, 'main.tex', MAIN_TEX_TEMPLATE);
    files = await listFiles(projectId);
  }

  const fileEntries = files.map((f) => ({
    id: f.id,
    path: f.path,
    mimeType: f.mimeType,
    isBinary: f.isBinary,
  }));

  return (
    <EditorLayout
      projectId={projectId}
      projectName={project.name}
      files={fileEntries}
    />
  );
}
