/**
 * Parse LaTeX compilation log output to extract structured errors and warnings.
 */

export interface LatexDiagnostic {
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  raw: string;
}

/**
 * Parse LaTeX log output into structured diagnostics.
 */
export function parseLatexLog(log: string): LatexDiagnostic[] {
  const diagnostics: LatexDiagnostic[] = [];
  const lines = log.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // LaTeX errors: lines starting with "!"
    if (line.startsWith('!')) {
      const message = line.slice(2).trim();
      // Look for line number in nearby lines (e.g., "l.42 ...")
      let fileLine: number | undefined;
      let fileName: string | undefined;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const lineMatch = lines[j].match(/^l\.(\d+)/);
        if (lineMatch) {
          fileLine = parseInt(lineMatch[1], 10);
          break;
        }
      }
      // Look for file reference in previous lines
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const fileMatch = lines[j].match(/\(\.\/([^)]+)\)/);
        if (fileMatch) {
          fileName = fileMatch[1];
          break;
        }
      }
      diagnostics.push({
        type: 'error',
        message,
        file: fileName,
        line: fileLine,
        raw: line,
      });
    }

    // LaTeX warnings
    if (line.includes('Warning:') || line.includes('Overfull') || line.includes('Underfull')) {
      const lineMatch = line.match(/line (\d+)/i) || line.match(/at line (\d+)/i);
      diagnostics.push({
        type: 'warning',
        message: line.trim(),
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        raw: line,
      });
    }

    // Package/class errors
    if (line.match(/^Package .+ Error:/i) || line.match(/^Class .+ Error:/i)) {
      diagnostics.push({
        type: 'error',
        message: line.trim(),
        raw: line,
      });
    }

    // Reference/citation warnings
    if (line.includes('Reference') && line.includes('undefined')) {
      const refMatch = line.match(/`([^']+)'/);
      diagnostics.push({
        type: 'warning',
        message: refMatch ? `Undefined reference: ${refMatch[1]}` : line.trim(),
        raw: line,
      });
    }
    if (line.includes('Citation') && (line.includes('undefined') || line.includes('not found'))) {
      const citeMatch = line.match(/`([^']+)'/);
      diagnostics.push({
        type: 'warning',
        message: citeMatch ? `Undefined citation: ${citeMatch[1]}` : line.trim(),
        raw: line,
      });
    }
    if (line.includes('Empty bibliography')) {
      diagnostics.push({ type: 'warning', message: 'Empty bibliography — no entries found', raw: line });
    }

    // Badbox details with measurements
    if (line.match(/^(Over|Under)full \\[hv]box/)) {
      const ptMatch = line.match(/([\d.]+)pt/);
      const lineMatch = line.match(/at lines? (\d+)/);
      diagnostics.push({
        type: 'warning',
        message: `${line.match(/Overfull/) ? 'Overfull' : 'Underfull'} box${ptMatch ? ` (${ptMatch[1]}pt)` : ''}`,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
        raw: line,
      });
    }

    // Runaway argument / paragraph ended
    if (line.startsWith('Runaway argument?') || line.includes('Paragraph ended before')) {
      diagnostics.push({
        type: 'error',
        message: line.trim(),
        raw: line,
      });
    }

    // Missing number / illegal unit
    if (line.includes('Missing number') || line.includes('Illegal unit')) {
      diagnostics.push({
        type: 'error',
        message: line.trim(),
        raw: line,
      });
    }
  }

  return diagnostics;
}

/**
 * Get a summary of diagnostics for display.
 */
export function diagnosticSummary(diagnostics: LatexDiagnostic[]): {
  errors: number;
  warnings: number;
} {
  return {
    errors: diagnostics.filter(d => d.type === 'error').length,
    warnings: diagnostics.filter(d => d.type === 'warning').length,
  };
}
