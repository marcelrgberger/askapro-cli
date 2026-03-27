import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { parseDocument } from '../../documents/parser.js';
import type { ToolDefinition } from '../registry.js';

export const docReadTool: ToolDefinition = {
  name: 'doc_read',
  description: 'Reads a document of any format (PDF, DOCX, XLSX, CSV, HTML, images, emails, Apple documents, etc.) and returns the extracted text.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file (relative or absolute)',
      },
      max_chars: {
        type: 'number',
        description: 'Maximum number of characters in the output (default: 50000)',
      },
    },
    required: ['path'],
  },
  async execute(params) {
    const filePath = resolve(params.path as string);

    if (!existsSync(filePath)) {
      return `Error: File not found: ${filePath}`;
    }

    try {
      const doc = await parseDocument(filePath);
      const maxChars = (params.max_chars as number) || 50000;

      let text = doc.text;
      let truncated = false;
      if (text.length > maxChars) {
        text = text.slice(0, maxChars);
        truncated = true;
      }

      const header = [
        `File: ${doc.filename}`,
        `Format: ${doc.format}`,
        `Size: ${(doc.size / 1024).toFixed(1)} KB`,
      ];

      if (doc.metadata.pages) header.push(`Pages: ${doc.metadata.pages}`);
      if (doc.metadata.sheets) header.push(`Sheets: ${(doc.metadata.sheets as string[]).join(', ')}`);
      if (truncated) header.push(`(Text truncated to ${maxChars} characters)`);

      return header.join(' | ') + '\n---\n' + text;
    } catch (err) {
      return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
