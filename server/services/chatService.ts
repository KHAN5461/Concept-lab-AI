import { Type } from '@google/genai';
import { getGenAI } from './gemini.js';
import { memoryVectorStore } from './vectorStore.js';

export async function generateRagResponse(query: string, sourceId?: string): Promise<{ text: string, citations: string[] }> {
  // Retrieve top-k chunks
  const k = 5;
  const chunks = await memoryVectorStore.similaritySearch(query, k, sourceId);
  
  if (chunks.length === 0) {
    return {
      text: "Answer not in sources. No relevant documents found.",
      citations: [],
    };
  }

  // Inject into prompt
  let contextStr = chunks.map((c, i) => `[Citation ${i + 1}]: ${c.text}`).join('\\n\\n');

  const prompt = `
You are a Lab AI. Only answer from provided context.
Do not hallucinate. If the answer cannot be found in the context, explicitly state "Answer not in sources."
Use citations like [Citation 1] when referencing the context.

USER QUESTION:
${query}

CONTEXT:
${contextStr}
`;

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });

    return {
      text: response.text || "No response generated.",
      citations: chunks.map(c => c.text)
    };
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    if (error && error.message && error.message.includes('API key not valid')) {
      throw new Error('API key generated an INVALID_ARGUMENT error. Please verify your API_KEY in your environment or .env file.');
    }
    throw error;
  }
}
