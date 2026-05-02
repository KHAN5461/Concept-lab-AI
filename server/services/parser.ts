import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
const PDFParse = pdfModule.PDFParse;

export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // Check for the class-based API (pdf-parse 2.4.x)
    if (typeof PDFParse === 'function') {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      return textResult.text || '';
    }

    // Fallback to traditional function API
    const pdf = typeof pdfModule === 'function' ? pdfModule : pdfModule.default;
    if (typeof pdf === 'function') {
      const data = await pdf(buffer);
      return data.text || '';
    }

    const keys = Object.keys(pdfModule || {});
    throw new Error(`PDF parser not found. Module type: ${typeof pdfModule}. Keys: ${keys.join(', ')}`);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to parse PDF document.');
  }
}

export function parseText(buffer: Buffer): string {
  return buffer.toString('utf-8');
}
