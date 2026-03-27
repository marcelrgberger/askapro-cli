import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export async function parseDocx(filePath: string): Promise<{ text: string; html: string }> {
  const ext = filePath.toLowerCase();

  // .doc (legacy Word) — use textutil on macOS, fallback to error
  if (ext.endsWith('.doc') && !ext.endsWith('.docx')) {
    return parseDocWithTextutil(filePath);
  }

  // .docx — use mammoth
  const mammoth = await import('mammoth');
  const buffer = readFileSync(filePath);

  const textResult = await mammoth.extractRawText({ buffer });
  const htmlResult = await mammoth.convertToHtml({ buffer });

  return {
    text: textResult.value,
    html: htmlResult.value,
  };
}

function parseDocWithTextutil(filePath: string): { text: string; html: string } {
  const tempDir = mkdtempSync(join(tmpdir(), 'askapro-doc-'));
  const outFile = join(tempDir, 'output.txt');

  try {
    execFileSync('textutil', ['-convert', 'txt', '-output', outFile, filePath], { stdio: 'pipe' });
    if (existsSync(outFile)) {
      const text = readFileSync(outFile, 'utf-8');
      return { text, html: '' };
    }
  } catch {
    // textutil not available (non-macOS)
  }

  return { text: '(Could not parse .doc file — textutil not available)', html: '' };
}
