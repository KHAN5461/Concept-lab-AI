import { getGenAI } from '../services/gemini.js';
import { Type } from '@google/genai';

export async function generateVisualization(text: string) {
  const ai = getGenAI();
  
  const prompt = `Suggest a relevant visualization or simulation for the core concept in the provided text.
Describe what the visualization would show (its visual elements, layout, interactions) and how it would help explain the concept.
Format the output as a structured JSON object.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt + "\n\nTEXT:\n" + text,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the visualization" },
          description: { type: Type.STRING, description: "What the visualization shows" },
          visualElements: { 
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of key visual components"
          },
          howItHelps: { type: Type.STRING, description: "How this visualization helps explain the concept" }
        },
        required: ["title", "description", "visualElements", "howItHelps"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate visualization");
  }

  return JSON.parse(response.text);
}
