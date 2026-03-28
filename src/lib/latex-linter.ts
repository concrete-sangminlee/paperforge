import { type Diagnostic } from '@codemirror/lint';

/**
 * Simple LaTeX linter for CodeMirror that detects common issues inline.
 * Runs on the document text and returns diagnostics for the lint gutter.
 */
export function latexLinter(doc: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = doc.split('\n');
  let pos = 0;

  // Track open environments
  const envStack: Array<{ name: string; line: number; pos: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for unmatched braces on each line
    let braceDepth = 0;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '{' && (j === 0 || line[j - 1] !== '\\')) braceDepth++;
      if (line[j] === '}' && (j === 0 || line[j - 1] !== '\\')) braceDepth--;
    }
    if (braceDepth > 0) {
      diagnostics.push({
        from: pos,
        to: pos + line.length,
        severity: 'warning',
        message: `Unclosed brace on this line (${braceDepth} unclosed)`,
      });
    }

    // Track \begin{env} and \end{env}
    const beginMatch = line.match(/\\begin\{([^}]+)\}/);
    if (beginMatch) {
      envStack.push({ name: beginMatch[1], line: i, pos });
    }

    const endMatch = line.match(/\\end\{([^}]+)\}/);
    if (endMatch) {
      if (envStack.length === 0) {
        diagnostics.push({
          from: pos,
          to: pos + line.length,
          severity: 'error',
          message: `\\end{${endMatch[1]}} without matching \\begin`,
        });
      } else {
        const last = envStack.pop()!;
        if (last.name !== endMatch[1]) {
          diagnostics.push({
            from: pos,
            to: pos + line.length,
            severity: 'error',
            message: `\\end{${endMatch[1]}} doesn't match \\begin{${last.name}} at line ${last.line + 1}`,
          });
        }
      }
    }

    // Check for common mistakes
    if (line.includes('\\being{')) {
      diagnostics.push({
        from: pos + line.indexOf('\\being{'),
        to: pos + line.indexOf('\\being{') + 7,
        severity: 'error',
        message: 'Did you mean \\begin{...}?',
      });
    }

    if (line.includes('\\ned{')) {
      diagnostics.push({
        from: pos + line.indexOf('\\ned{'),
        to: pos + line.indexOf('\\ned{') + 5,
        severity: 'error',
        message: 'Did you mean \\end{...}?',
      });
    }

    // Warn about double dollar signs (prefer equation environment)
    if (line.includes('$$')) {
      diagnostics.push({
        from: pos + line.indexOf('$$'),
        to: pos + line.indexOf('$$') + 2,
        severity: 'info',
        message: 'Consider using \\begin{equation} instead of $$ for numbered equations',
      });
    }

    // Detect \label without preceding \section, \caption, or environment
    if (line.match(/\\label\{/) && i > 0) {
      const prev = lines[i - 1];
      if (!prev.match(/\\(section|subsection|caption|begin|chapter|paragraph|subsubsection)/) && !line.match(/\\(section|caption|begin)/)) {
        diagnostics.push({
          from: pos + line.indexOf('\\label{'),
          to: pos + line.indexOf('\\label{') + 7,
          severity: 'info',
          message: 'Label without a preceding heading, caption, or environment — may produce wrong reference',
        });
      }
    }

    // Detect common typos
    if (line.includes('\\usepackge{') || line.includes('\\usepckage{')) {
      const typo = line.includes('\\usepackge{') ? '\\usepackge{' : '\\usepckage{';
      diagnostics.push({
        from: pos + line.indexOf(typo),
        to: pos + line.indexOf(typo) + typo.length,
        severity: 'error',
        message: 'Did you mean \\usepackage{...}?',
      });
    }

    // Detect \cite{} or \ref{} with empty argument
    const emptyRef = line.match(/\\(cite|ref|label|eqref|autoref|cref)\{\s*\}/);
    if (emptyRef) {
      const idx = line.indexOf(emptyRef[0]);
      diagnostics.push({
        from: pos + idx,
        to: pos + idx + emptyRef[0].length,
        severity: 'warning',
        message: `Empty \\${emptyRef[1]}{} — provide a key`,
      });
    }

    // Detect \\ at end of paragraph (common mistake)
    if (line.match(/\\\\$/) && i + 1 < lines.length && lines[i + 1].trim() === '') {
      diagnostics.push({
        from: pos + line.length - 2,
        to: pos + line.length,
        severity: 'info',
        message: 'Use a blank line for paragraph breaks instead of \\\\ followed by empty line',
      });
    }

    pos += line.length + 1; // +1 for newline
  }

  // Report unclosed environments
  for (const env of envStack) {
    diagnostics.push({
      from: env.pos,
      to: env.pos + 20,
      severity: 'error',
      message: `\\begin{${env.name}} at line ${env.line + 1} is never closed`,
    });
  }

  return diagnostics;
}
