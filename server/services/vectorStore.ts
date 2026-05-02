import { getGenAI } from './gemini.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  sourceId: string;
  text: string;
  metadata?: any;
}

export interface ChunkWithEmbedding extends DocumentChunk {
  embedding: number[];
}

const STORE_PATH = process.env.VERCEL === '1' 
  ? path.join('/tmp', '.vector_store.json') 
  : path.join(process.cwd(), '.vector_store.json');

export class VectorStore {
  private chunks: ChunkWithEmbedding[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const data = fs.readFileSync(STORE_PATH, 'utf-8');
        this.chunks = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load vector store from disk', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.chunks));
    } catch (e) {
      console.error('Failed to save vector store to disk', e);
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      // Create a new instance per request to ensure key is fresh
      const ai = getGenAI();
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text
      });
      return response.embeddings[0].values as number[];
    } catch (error: any) {
      console.error('Error getting embedding:', error);
      if (error && error.message && error.message.includes('API key not valid')) {
        throw new Error('API key generated an INVALID_ARGUMENT error. Please verify your API_KEY in your environment or .env file.');
      }
      throw new Error('Failed to generate embedding');
    }
  }

  async addChunks(chunks: Omit<DocumentChunk, 'id'>[]): Promise<string[]> {
    const ids: string[] = [];
    for (const chunk of chunks) {
      const id = uuidv4();
      const embedding = await this.getEmbedding(chunk.text);
      this.chunks.push({
        ...chunk,
        id,
        embedding
      });
      ids.push(id);
    }
    this.save();
    return ids;
  }

  async similaritySearch(query: string, k: number = 5, filterSourceId?: string): Promise<DocumentChunk[]> {
    const queryEmbedding = await this.getEmbedding(query);
    
    // Filter by source if provided
    const pool = filterSourceId ? this.chunks.filter(c => c.sourceId === filterSourceId) : this.chunks;
    
    if (pool.length === 0) return [];

    // Calculate dot product (assuming normalized embeddings, dot product = cosine similarity)
    const scoredChunks = pool.map(chunk => {
      let score = 0;
      for (let i = 0; i < queryEmbedding.length; i++) {
        score += queryEmbedding[i] * chunk.embedding[i];
      }
      return { chunk, score };
    });

    // Sort by descending score
    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, k).map(sc => sc.chunk);
  }
  
  // Method to remove a source completely
  removeSource(sourceId: string) {
    this.chunks = this.chunks.filter(c => c.sourceId !== sourceId);
    this.save();
  }
}

// Singleton for our simple in-memory backend DB
export const memoryVectorStore = new VectorStore();
