import type { ToolDefinition } from '../registry.js';

// These will be set by the REPL when document index is available
let vectorStoreRef: any = null;
let indexStoreRef: any = null;

export function setSearchStores(vectorStore: any, indexStore: any): void {
  vectorStoreRef = vectorStore;
  indexStoreRef = indexStore;
}

export const docSearchTool: ToolDefinition = {
  name: 'doc_search',
  description: 'Searches the indexed documents semantically for relevant text passages. Use this tool before answering questions about documents.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query — what are you looking for in the documents?',
      },
      top_k: {
        type: 'number',
        description: 'Number of results (default: 5)',
      },
    },
    required: ['query'],
  },
  async execute(params) {
    const query = params.query as string;
    const topK = (params.top_k as number) || 5;

    if (!vectorStoreRef || !indexStoreRef) {
      // Fallback to text search if no embeddings available
      if (indexStoreRef) {
        const results = indexStoreRef.searchText(query, topK);
        if (results.length === 0) {
          return 'No matches found. Are documents indexed? Use /docs ingest <path>';
        }
        return results.map((r: any, i: number) =>
          `[${i + 1}] ${r.doc_name} (Chunk ${r.chunk_index}):\n${r.text.slice(0, 500)}`
        ).join('\n\n---\n\n');
      }
      return 'No documents indexed. Use /docs ingest <path> to ingest documents.';
    }

    try {
      const results = await vectorStoreRef.hybridSearch(query, topK);

      if (results.length === 0) {
        return 'No relevant text passages found.';
      }

      return results.map((r: any, i: number) =>
        `[${i + 1}] ${r.chunk.doc_name} (Relevance: ${(r.score * 100).toFixed(0)}%):\n${r.chunk.text.slice(0, 800)}`
      ).join('\n\n---\n\n');
    } catch (err) {
      return `Search error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
