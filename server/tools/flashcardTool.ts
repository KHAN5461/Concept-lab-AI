import { getGenAI } from '../services/gemini.js';
import { Type } from '@google/genai';

export async function generateFlashcards(text: string, options?: { count?: number, difficulty?: string }) {
  const ai = getGenAI();
  
  const count = options?.count || 10;
  const difficultyStr = options?.difficulty ? ` Adjust depth of concepts to be ${options.difficulty}.` : '';

  const prompt = `Generate a set of ${count} flashcards based entirely on the provided text.${difficultyStr}
Do not hallucinate external information. Focus on key concepts and definitions.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt + "\n\nTEXT:\n" + text,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["question", "answer"]
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate flashcards");
  }

  return JSON.parse(response.text);
}
