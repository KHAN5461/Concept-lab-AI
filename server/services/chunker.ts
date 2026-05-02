// Simple chunker that attempts to split by words to roughly align with tokens
export function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  // Normalize whitespace
  const normalizedText = text.replace(/\\s+/g, ' ');
  const words = normalizedText.split(' ');
  
  const chunks: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push(chunkWords.join(' '));
    i += (chunkSize - overlap);
  }
  
  return chunks;
}
