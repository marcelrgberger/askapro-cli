declare module 'marked-terminal' {
  import type { RendererObject } from 'marked';
  interface TerminalRendererOptions {
    tab?: number;
    [key: string]: unknown;
  }
  class TerminalRenderer implements RendererObject {
    constructor(options?: TerminalRendererOptions);
  }
  export default TerminalRenderer;
}

declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, string>;
    metadata: unknown;
    text: string;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PdfData>;
  export default pdfParse;
}
