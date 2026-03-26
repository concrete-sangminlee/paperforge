import { type Completion } from '@codemirror/autocomplete';

/**
 * LaTeX snippet templates that expand common patterns.
 * These appear in autocomplete with a "snippet" type badge.
 */
export const LATEX_SNIPPETS: Completion[] = [
  {
    label: 'fig',
    type: 'text',
    detail: 'Figure environment',
    boost: 10,
    apply: `\\begin{figure}[htbp]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{filename}
  \\caption{Caption text}
  \\label{fig:label}
\\end{figure}`,
  },
  {
    label: 'tab',
    type: 'text',
    detail: 'Table environment',
    boost: 10,
    apply: `\\begin{table}[htbp]
  \\centering
  \\caption{Caption text}
  \\label{tab:label}
  \\begin{tabular}{lcc}
    \\hline
    Column 1 & Column 2 & Column 3 \\\\
    \\hline
    Data 1 & Data 2 & Data 3 \\\\
    \\hline
  \\end{tabular}
\\end{table}`,
  },
  {
    label: 'eq',
    type: 'text',
    detail: 'Equation environment',
    boost: 10,
    apply: `\\begin{equation}

  \\label{eq:label}
\\end{equation}`,
  },
  {
    label: 'align',
    type: 'text',
    detail: 'Align environment',
    boost: 10,
    apply: `\\begin{align}
  a &= b + c \\\\
  d &= e + f
  \\label{eq:align}
\\end{align}`,
  },
  {
    label: 'enum',
    type: 'text',
    detail: 'Numbered list',
    boost: 10,
    apply: `\\begin{enumerate}
  \\item First item
  \\item Second item
  \\item Third item
\\end{enumerate}`,
  },
  {
    label: 'item',
    type: 'text',
    detail: 'Bullet list',
    boost: 10,
    apply: `\\begin{itemize}
  \\item First item
  \\item Second item
  \\item Third item
\\end{itemize}`,
  },
  {
    label: 'frame',
    type: 'text',
    detail: 'Beamer frame',
    boost: 10,
    apply: `\\begin{frame}{Frame Title}
  Content here
\\end{frame}`,
  },
  {
    label: 'lst',
    type: 'text',
    detail: 'Code listing',
    boost: 10,
    apply: `\\begin{lstlisting}[language=Python, caption=Caption]

\\end{lstlisting}`,
  },
  {
    label: 'minipage',
    type: 'text',
    detail: 'Two-column minipage',
    boost: 10,
    apply: `\\begin{minipage}[t]{0.48\\textwidth}
  Left content
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.48\\textwidth}
  Right content
\\end{minipage}`,
  },
  {
    label: 'thm',
    type: 'text',
    detail: 'Theorem environment',
    boost: 10,
    apply: `\\begin{theorem}
  Statement of the theorem.
\\end{theorem}

\\begin{proof}
  Proof goes here.
\\end{proof}`,
  },
  {
    label: 'abs',
    type: 'text',
    detail: 'Abstract',
    boost: 10,
    apply: `\\begin{abstract}
  Your abstract text here.
\\end{abstract}`,
  },
  {
    label: 'doc',
    type: 'text',
    detail: 'Document template',
    boost: 10,
    apply: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath, amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{Title}
\\author{Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}


\\section{Conclusion}


\\end{document}`,
  },
];
