export async function parseImage(filePath: string): Promise<string> {
  try {
    const Tesseract = await import('tesseract.js');
    const recognize = Tesseract.recognize || Tesseract.default?.recognize;
    if (!recognize) {
      return '(OCR not available: tesseract.js API not found)';
    }
    const { data } = await recognize(filePath, 'deu+eng', {
      logger: () => {}, // silent
    });
    return data.text || '(No text detected in image)';
  } catch (err) {
    return `(OCR failed: ${err instanceof Error ? err.message : String(err)})`;
  }
}

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.gif', '.webp'];
