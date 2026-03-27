import type { ToolDefinition } from '../registry.js';

export const webFetchTool: ToolDefinition = {
  name: 'web_fetch',
  description: 'Fetches the content of a URL and returns the text. Useful for legal texts, rulings, technical information.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch',
      },
      max_chars: {
        type: 'number',
        description: 'Maximum character count (default: 20000)',
      },
    },
    required: ['url'],
  },
  async execute(params) {
    const url = params.url as string;
    const maxChars = (params.max_chars as number) || 20000;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'askapro-cli/0.4.0',
          'Accept': 'text/html,text/plain,application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return `Error: HTTP ${response.status} ${response.statusText}`;
      }

      const contentType = response.headers.get('content-type') || '';
      let text: string;

      if (contentType.includes('json')) {
        const json = await response.json();
        text = JSON.stringify(json, null, 2);
      } else {
        text = await response.text();
        // Strip HTML tags for HTML content
        if (contentType.includes('html')) {
          text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      if (text.length > maxChars) {
        text = text.slice(0, maxChars) + '\n\n(truncated)';
      }

      return `URL: ${url}\n---\n${text}`;
    } catch (err) {
      return `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
