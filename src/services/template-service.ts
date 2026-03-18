import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { createProject } from '@/services/project-service';
import { createFile } from '@/services/file-service';

const TEMPLATE_CATEGORIES = ['journal', 'thesis', 'presentation', 'letter', 'cv'] as const;

export async function listTemplates(category?: string, search?: string) {
  return prisma.template.findMany({
    where: {
      isApproved: true,
      ...(category && category !== 'all' ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { downloadCount: 'desc' },
  });
}

export async function getTemplate(id: string) {
  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      sourceProject: {
        include: { files: { where: { deletedAt: null } } },
      },
    },
  });
  if (!template) throw new ApiError(404, 'Template not found');
  return template;
}

export async function createProjectFromTemplate(
  templateId: string,
  userId: string,
  projectName: string,
) {
  const template = await getTemplate(templateId);

  // Create a new project for the user
  const project = await createProject(userId, {
    name: projectName,
    description: `Created from template: ${template.name}`,
    compiler: template.sourceProject?.compiler ?? 'pdflatex',
  });

  // Copy files from source project if it exists
  if (template.sourceProject && template.sourceProject.files.length > 0) {
    const { getFileContent } = await import('@/services/file-service');
    for (const file of template.sourceProject.files) {
      try {
        if (!file.isBinary) {
          const content = await getFileContent(template.sourceProject.id, file.path);
          await createFile(project.id, file.path, content);
        }
      } catch {
        // Skip files that can't be copied
      }
    }
  } else {
    // Provide default LaTeX content for built-in templates
    const defaultContent = getDefaultContent(template.category ?? '');
    await createFile(project.id, 'main.tex', defaultContent);
  }

  // Increment download count
  await prisma.template.update({
    where: { id: templateId },
    data: { downloadCount: { increment: 1 } },
  });

  return project;
}

function getDefaultContent(category: string): string {
  const contents: Record<string, string> = {
    journal: `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage[colorlinks=true]{hyperref}

\\title{Article Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
Your abstract here.
\\end{abstract}

\\section{Introduction}
Introduction text here.

\\section{Methods}
Methods text here.

\\section{Results}
Results text here.

\\section{Conclusion}
Conclusion text here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`,
    thesis: `\\documentclass[12pt]{report}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage[colorlinks=true]{hyperref}

\\title{Thesis Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}
\\maketitle
\\tableofcontents

\\chapter{Introduction}
Introduction text here.

\\chapter{Literature Review}
Literature review here.

\\chapter{Methodology}
Methodology text here.

\\chapter{Results}
Results text here.

\\chapter{Conclusion}
Conclusion text here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`,
    presentation: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{default}

\\title{Presentation Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Outline}
\\tableofcontents
\\end{frame}

\\section{Introduction}
\\begin{frame}{Introduction}
\\begin{itemize}
  \\item First point
  \\item Second point
  \\item Third point
\\end{itemize}
\\end{frame}

\\section{Main Content}
\\begin{frame}{Main Content}
Content goes here.
\\end{frame}

\\section{Conclusion}
\\begin{frame}{Conclusion}
Concluding remarks.
\\end{frame}

\\end{document}
`,
    letter: `\\documentclass{letter}
\\usepackage[utf8]{inputenc}

\\signature{Your Name}
\\address{Your Address \\\\ City, State, ZIP \\\\ Country}

\\begin{document}
\\begin{letter}{Recipient Name \\\\ Recipient Address \\\\ City, State, ZIP}

\\opening{Dear Sir/Madam,}

Body of the letter goes here.

\\closing{Yours sincerely,}

\\end{letter}
\\end{document}
`,
    cv: `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage[colorlinks=true]{hyperref}

\\begin{document}

\\begin{center}
  {\\LARGE \\textbf{Your Name}} \\\\[4pt]
  email@example.com $\\cdot$ +1 (555) 000-0000 \\\\
  City, Country
\\end{center}

\\hrule

\\section*{Education}
\\textbf{Degree} \\hfill Year -- Year \\\\
University Name, City, Country

\\section*{Experience}
\\textbf{Job Title} \\hfill Start -- End \\\\
Company Name \\\\
\\begin{itemize}[leftmargin=*]
  \\item Achievement or responsibility
\\end{itemize}

\\section*{Skills}
\\begin{itemize}[leftmargin=*]
  \\item Skill category: skill1, skill2
\\end{itemize}

\\end{document}
`,
  };

  return (
    contents[category] ??
    `\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\title{Document Title}
\\author{Author}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Your content here.

\\end{document}
`
  );
}

export async function submitTemplate(
  projectId: string,
  userId: string,
  name: string,
  description: string,
  category: string,
) {
  // Verify user owns the project
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member || member.role !== 'owner') {
    throw new ApiError(403, 'Only the project owner can submit templates');
  }

  // Check for existing template from this project
  const existing = await prisma.template.findUnique({
    where: { sourceProjectId: projectId },
  });
  if (existing) {
    throw new ApiError(409, 'A template already exists for this project');
  }

  if (category && !TEMPLATE_CATEGORIES.includes(category as typeof TEMPLATE_CATEGORIES[number])) {
    throw new ApiError(400, `Invalid category. Must be one of: ${TEMPLATE_CATEGORIES.join(', ')}`);
  }

  return prisma.template.create({
    data: {
      name,
      description,
      category,
      sourceProjectId: projectId,
      authorId: userId,
      isApproved: false,
    },
  });
}
