import { getGenAI } from '../services/gemini.js';
import { Type } from '@google/genai';

export async function generateQuiz(text: string, options?: { count?: number, difficulty?: string }) {
  const ai = getGenAI();
  
  const count = options?.count || 5;
  const difficultyStr = options?.difficulty ? ` Difficulty should be ${options.difficulty}.` : '';

  const prompt = `Generate a ${count}-question multiple choice practice quiz based entirely on the provided text.${difficultyStr}
Include an explanation for why the correct answer is correct, and why each of the other options is incorrect.
Do not hallucinate external information. Focus on testing core concepts.`;

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
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correct: { type: Type.STRING, description: "The exact text of the correct option" },
            explanation: { type: Type.STRING, description: "Explanation of why the correct answer is correct" },
            incorrectExplanations: { 
               type: Type.OBJECT, 
               description: "A map where keys are the incorrect option text and values are the explanation of why it is incorrect" 
            }
          },
          required: ["question", "options", "correct", "explanation", "incorrectExplanations"]
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate quiz");
  }

  return JSON.parse(response.text);
}
