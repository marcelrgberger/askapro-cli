import { resolve } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument, isSupportedFile } from '../../documents/parser.js';
import type { ToolDefinition } from '../registry.js';

export const docSummarizeTool: ToolDefinition = {
  name: 'doc_summarize',
  description: 'Reads a directory of documents and returns an overview of all found files with brief information.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory',
      },
      recursive: {
        type: 'boolean',
        description: 'Include subdirectories (default: true)',
      },
    },
    required: ['path'],
  },
  async execute(params) {
    const dirPath = resolve(params.path as string);
    const recursive = params.recursive !== false;

    if (!existsSync(dirPath)) {
      return `Error: Directory not found: ${dirPath}`;
    }

    const files = collectFiles(dirPath, recursive);
    const supported = files.filter(isSupportedFile);

    if (supported.length === 0) {
      return `No supported documents found in ${dirPath}.`;
    }

    const lines: string[] = [
      `Directory: ${dirPath}`,
      `Documents found: ${supported.length}`,
      '---',
    ];

    for (const file of supported.slice(0, 100)) {
      const stat = statSync(file);
      const sizeKb = (stat.size / 1024).toFixed(1);
      lines.push(`- ${file.replace(dirPath + '/', '')} (${sizeKb} KB)`);
    }

    if (supported.length > 100) {
      lines.push(`... and ${supported.length - 100} more files`);
    }

    return lines.join('\n');
  },
};

function collectFiles(dir: string, recursive: boolean): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isFile()) {
      files.push(full);
    } else if (stat.isDirectory() && recursive) {
      files.push(...collectFiles(full, true));
    }
  }
  return files;
}
