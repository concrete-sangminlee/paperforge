import { CompletionContext, type Completion } from '@codemirror/autocomplete';
import { LATEX_SNIPPETS } from './latex-snippets';

const LATEX_COMMANDS: Completion[] = [
  // Document structure
  { label: '\\documentclass', type: 'keyword', detail: 'Document class', apply: '\\documentclass{article}' },
  { label: '\\usepackage', type: 'keyword', detail: 'Import package', apply: '\\usepackage{$0}' },
  { label: '\\begin', type: 'keyword', detail: 'Begin environment', apply: '\\begin{$0}\n\n\\end{$0}' },
  { label: '\\end', type: 'keyword', detail: 'End environment', apply: '\\end{$0}' },
  { label: '\\title', type: 'keyword', detail: 'Document title', apply: '\\title{$0}' },
  { label: '\\author', type: 'keyword', detail: 'Author name', apply: '\\author{$0}' },
  { label: '\\date', type: 'keyword', detail: 'Date', apply: '\\date{\\today}' },
  { label: '\\maketitle', type: 'keyword', detail: 'Render title' },

  // Sections
  { label: '\\section', type: 'function', detail: 'Section heading', apply: '\\section{$0}' },
  { label: '\\subsection', type: 'function', detail: 'Subsection', apply: '\\subsection{$0}' },
  { label: '\\subsubsection', type: 'function', detail: 'Sub-subsection', apply: '\\subsubsection{$0}' },
  { label: '\\paragraph', type: 'function', detail: 'Paragraph heading', apply: '\\paragraph{$0}' },
  { label: '\\chapter', type: 'function', detail: 'Chapter heading', apply: '\\chapter{$0}' },

  // Text formatting
  { label: '\\textbf', type: 'function', detail: 'Bold text', apply: '\\textbf{$0}' },
  { label: '\\textit', type: 'function', detail: 'Italic text', apply: '\\textit{$0}' },
  { label: '\\underline', type: 'function', detail: 'Underlined text', apply: '\\underline{$0}' },
  { label: '\\emph', type: 'function', detail: 'Emphasized text', apply: '\\emph{$0}' },
  { label: '\\texttt', type: 'function', detail: 'Monospace text', apply: '\\texttt{$0}' },
  { label: '\\textsc', type: 'function', detail: 'Small caps', apply: '\\textsc{$0}' },

  // Math
  { label: '\\frac', type: 'function', detail: 'Fraction', apply: '\\frac{$0}{$1}' },
  { label: '\\sqrt', type: 'function', detail: 'Square root', apply: '\\sqrt{$0}' },
  { label: '\\sum', type: 'variable', detail: 'Summation', apply: '\\sum_{$0}^{$1}' },
  { label: '\\int', type: 'variable', detail: 'Integral', apply: '\\int_{$0}^{$1}' },
  { label: '\\lim', type: 'variable', detail: 'Limit', apply: '\\lim_{$0}' },
  { label: '\\infty', type: 'variable', detail: 'Infinity symbol' },
  { label: '\\partial', type: 'variable', detail: 'Partial derivative' },
  { label: '\\nabla', type: 'variable', detail: 'Nabla/gradient' },
  { label: '\\alpha', type: 'variable', detail: 'Greek alpha' },
  { label: '\\beta', type: 'variable', detail: 'Greek beta' },
  { label: '\\gamma', type: 'variable', detail: 'Greek gamma' },
  { label: '\\delta', type: 'variable', detail: 'Greek delta' },
  { label: '\\epsilon', type: 'variable', detail: 'Greek epsilon' },
  { label: '\\lambda', type: 'variable', detail: 'Greek lambda' },
  { label: '\\mu', type: 'variable', detail: 'Greek mu' },
  { label: '\\pi', type: 'variable', detail: 'Greek pi' },
  { label: '\\sigma', type: 'variable', detail: 'Greek sigma' },
  { label: '\\theta', type: 'variable', detail: 'Greek theta' },
  { label: '\\omega', type: 'variable', detail: 'Greek omega' },
  { label: '\\mathbb', type: 'function', detail: 'Blackboard bold', apply: '\\mathbb{$0}' },
  { label: '\\mathcal', type: 'function', detail: 'Calligraphic', apply: '\\mathcal{$0}' },

  // References
  { label: '\\label', type: 'function', detail: 'Set label', apply: '\\label{$0}' },
  { label: '\\ref', type: 'function', detail: 'Reference', apply: '\\ref{$0}' },
  { label: '\\cite', type: 'function', detail: 'Citation', apply: '\\cite{$0}' },
  { label: '\\bibliography', type: 'keyword', detail: 'Bibliography file', apply: '\\bibliography{$0}' },
  { label: '\\bibliographystyle', type: 'keyword', detail: 'Bibliography style', apply: '\\bibliographystyle{plain}' },
  { label: '\\footnote', type: 'function', detail: 'Footnote', apply: '\\footnote{$0}' },

  // Figures & Tables
  { label: '\\includegraphics', type: 'function', detail: 'Insert image', apply: '\\includegraphics[width=0.8\\textwidth]{$0}' },
  { label: '\\caption', type: 'function', detail: 'Figure/table caption', apply: '\\caption{$0}' },
  { label: '\\centering', type: 'keyword', detail: 'Center content' },

  // Lists
  { label: '\\item', type: 'keyword', detail: 'List item' },

  // Spacing
  { label: '\\hspace', type: 'function', detail: 'Horizontal space', apply: '\\hspace{$0}' },
  { label: '\\vspace', type: 'function', detail: 'Vertical space', apply: '\\vspace{$0}' },
  { label: '\\newpage', type: 'keyword', detail: 'Page break' },
  { label: '\\linebreak', type: 'keyword', detail: 'Line break' },

  // Hyperlinks
  { label: '\\href', type: 'function', detail: 'Hyperlink', apply: '\\href{$0}{$1}' },
  { label: '\\url', type: 'function', detail: 'URL', apply: '\\url{$0}' },
];

const LATEX_ENVIRONMENTS: Completion[] = [
  { label: 'document', type: 'type', detail: 'Document body' },
  { label: 'figure', type: 'type', detail: 'Float figure' },
  { label: 'table', type: 'type', detail: 'Float table' },
  { label: 'tabular', type: 'type', detail: 'Table content' },
  { label: 'equation', type: 'type', detail: 'Numbered equation' },
  { label: 'equation*', type: 'type', detail: 'Unnumbered equation' },
  { label: 'align', type: 'type', detail: 'Aligned equations' },
  { label: 'align*', type: 'type', detail: 'Aligned (unnumbered)' },
  { label: 'itemize', type: 'type', detail: 'Bullet list' },
  { label: 'enumerate', type: 'type', detail: 'Numbered list' },
  { label: 'description', type: 'type', detail: 'Description list' },
  { label: 'abstract', type: 'type', detail: 'Abstract' },
  { label: 'verbatim', type: 'type', detail: 'Verbatim text' },
  { label: 'lstlisting', type: 'type', detail: 'Code listing' },
  { label: 'minipage', type: 'type', detail: 'Mini page' },
  { label: 'center', type: 'type', detail: 'Centered content' },
  { label: 'theorem', type: 'type', detail: 'Theorem' },
  { label: 'proof', type: 'type', detail: 'Proof' },
  { label: 'lemma', type: 'type', detail: 'Lemma' },
];

/**
 * LaTeX autocompletion source for CodeMirror.
 * Triggers on backslash for commands and after \\begin{ for environments.
 */
export function latexCompletionSource(context: CompletionContext) {
  // Match \command patterns
  const cmdMatch = context.matchBefore(/\\[a-zA-Z]*/);
  if (cmdMatch) {
    return {
      from: cmdMatch.from,
      options: LATEX_COMMANDS,
      validFor: /^\\[a-zA-Z]*$/,
    };
  }

  // Match environment names after \begin{ or \end{
  const envMatch = context.matchBefore(/\\(?:begin|end)\{[a-zA-Z*]*/);
  if (envMatch) {
    const bracePos = envMatch.text.indexOf('{');
    return {
      from: envMatch.from + bracePos + 1,
      options: LATEX_ENVIRONMENTS,
      validFor: /^[a-zA-Z*]*$/,
    };
  }

  // Match snippet abbreviations (plain text at start of line or after whitespace)
  const snippetMatch = context.matchBefore(/(?:^|\s)[a-z]+/);
  if (snippetMatch && !context.matchBefore(/\\[a-zA-Z]*/)) {
    const wordStart = snippetMatch.text.search(/[a-z]/);
    return {
      from: snippetMatch.from + wordStart,
      options: LATEX_SNIPPETS,
      validFor: /^[a-z]*$/,
    };
  }

  return null;
}
