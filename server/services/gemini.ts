import { GoogleGenAI } from '@google/genai';

export function getGenAI() {
  let apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY environment variable is not set. Please configure it in your AI Studio Settings (Secrets) or .env file.');
  }
  apiKey = apiKey.replace(/^["']|["']$/g, '').trim();
  return new GoogleGenAI({ apiKey });
}
