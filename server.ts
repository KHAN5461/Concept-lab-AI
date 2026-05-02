import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parsePdf, parseText } from './server/services/parser.js';
import { chunkText } from './server/services/chunker.js';
import { memoryVectorStore } from './server/services/vectorStore.js';
import { generateRagResponse } from './server/services/chatService.js';
import { generateFlashcards } from './server/tools/flashcardTool.js';
import { generateQuiz } from './server/tools/quizTool.js';
import { generateVisualization } from './server/tools/visualizationTool.js';
import * as libGemini from './server/services/libGemini.js';
import path from 'path';
import fs from 'fs';

// Error Handler Wrapper
const asyncHandler = (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// In-memory mapping of full documents to generate tools against it
let memoryDocs: Record<string, string> = {};
const DOCS_STORE_PATH = process.env.VERCEL === '1'
  ? path.join('/tmp', '.memory_docs.json')
  : path.join(process.cwd(), '.memory_docs.json');

try {
  if (fs.existsSync(DOCS_STORE_PATH)) {
    memoryDocs = JSON.parse(fs.readFileSync(DOCS_STORE_PATH, 'utf-8'));
  }
} catch (e) {
  console.error('Failed to load memoryDocs', e);
}

const saveMemoryDocs = () => {
  try {
    fs.writeFileSync(DOCS_STORE_PATH, JSON.stringify(memoryDocs));
  } catch(e) {}
};

app.use(express.json());

app.get('/api/health', (req, res) => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const keyPresent = !!key;
  const keySnippet = keyPresent ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 'missing';
  
  res.json({
    status: 'ok',
    environment: process.env.VERCEL === '1' ? 'Vercel' : 'Local/Other',
    nodeVersion: process.version,
    aiConfig: {
      keyPresent,
      keySnippet,
      model: 'gemini-3-flash-preview'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug-env', (req, res) => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  res.json({ key: key ? key.substring(0, 10) + '...' : 'undefined' });
});

// 1. Upload Source
app.post('/api/upload', upload.single('file'), asyncHandler(async (req: express.Request, res: express.Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, mimetype, buffer } = req.file;
  let text = '';

  if (mimetype === 'application/pdf') {
    text = await parsePdf(buffer);
  } else {
    // Assume text/plain or markdown
    text = parseText(buffer);
  }

  const sourceId = uuidv4();
  memoryDocs[sourceId] = text;
  saveMemoryDocs();

  // Chunk and Embed
  const chunks = chunkText(text, 600, 100);
  const chunksToInsert = chunks.map(c => ({ sourceId, text: c, metadata: { filename: originalname } }));
  await memoryVectorStore.addChunks(chunksToInsert);

  res.json({ id: sourceId, filename: originalname, message: 'Ingested successfully' });
}));

// URL Ingestion
app.post('/api/upload-url', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Simple fetch and extracting text via a heuristic
  const response = await fetch(url);
  const html = await response.text();
  // Strip obvious html to get raw text
  const text = html.replace(/<[^>]*>?/gm, ' ');

  const sourceId = uuidv4();
  memoryDocs[sourceId] = text;
  saveMemoryDocs();

  const chunks = chunkText(text, 600, 100);
  const chunksToInsert = chunks.map(c => ({ sourceId, text: c, metadata: { filename: url } }));
  await memoryVectorStore.addChunks(chunksToInsert);

  res.json({ id: sourceId, filename: url, message: 'URL Ingested successfully' });
}));

// Text Ingestion
app.post('/api/upload-text', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { text, filename } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const sourceId = uuidv4();
  memoryDocs[sourceId] = text;
  saveMemoryDocs();

  const chunks = chunkText(text, 600, 100);
  const chunksToInsert = chunks.map(c => ({ sourceId, text: c, metadata: { filename: filename || 'AI Generated Content' } }));
  await memoryVectorStore.addChunks(chunksToInsert);

  res.json({ id: sourceId, filename: filename || 'AI Generated Content', message: 'Text Ingested successfully' });
}));

// 2. Chat
app.post('/api/chat', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { query, sourceId } = req.body;
  
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const result = await generateRagResponse(query, sourceId);
  res.json(result);
}));

// 3. Tools
app.post('/api/tools/flashcards', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { sourceId, selectedText, options } = req.body;
  const content = selectedText || memoryDocs[sourceId];
  
  if (!content) {
    console.warn(`[API] Flashcards failed: No content for sourceId ${sourceId}. MemoryDocs count: ${Object.keys(memoryDocs).length}`);
    return res.status(400).json({ error: 'No content available for generation. Please ensure a source document is selected and ingested correctly.' });
  }

  const flashcards = await generateFlashcards(content, options);
  res.json(flashcards);
}));

app.post('/api/tools/quiz', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { sourceId, selectedText, options } = req.body;
  const content = selectedText || memoryDocs[sourceId];
  
  if (!content) {
    console.warn(`[API] Quiz failed: No content for sourceId ${sourceId}. MemoryDocs count: ${Object.keys(memoryDocs).length}`);
    return res.status(400).json({ error: 'No content available for generation. Please ensure a source document is selected and ingested correctly.' });
  }

  const quiz = await generateQuiz(content, options);
  res.json(quiz);
}));

app.post('/api/tools/visualization', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { sourceId, selectedText } = req.body;
  const content = selectedText || memoryDocs[sourceId];
  
  if (!content) {
    console.warn(`[API] Visualization failed: No content for sourceId ${sourceId}. MemoryDocs count: ${Object.keys(memoryDocs).length}`);
    return res.status(400).json({ error: 'No content available for generation. Please ensure a source document is selected and ingested correctly.' });
  }

  const visualization = await generateVisualization(content);
  res.json(visualization);
}));

app.post('/api/lib/stream-chat', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { messages, profileContext, persona, studyMode } = req.body;
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  try {
    for await (const chunk of libGemini.streamChat(messages, profileContext, persona, studyMode)) {
      res.write(chunk);
    }
    res.end();
  } catch (error: any) {
    console.error("Stream Chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Stream error' });
    } else {
      res.end();
    }
  }
}));

app.post('/api/lib/generate-quiz', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { topic } = req.body;
  const result = await libGemini.generateQuiz(topic);
  res.json(result);
}));

app.post('/api/lib/generate-flashcards', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { topic } = req.body;
  const result = await libGemini.generateFlashcards(topic);
  res.json(result);
}));

app.post('/api/lib/generate-study-plan', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { topic } = req.body;
  const result = await libGemini.generateStudyPlan(topic);
  res.json(result);
}));

app.post('/api/lib/generate-simulation', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { topic } = req.body;
  const result = await libGemini.generateSimulation(topic);
  res.json(result);
}));

app.post('/api/lib/generate-podcast', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { topic } = req.body;
  const result = await libGemini.generatePodcastDialogue(topic);
  res.json(result);
}));

app.post('/api/lib/generate-concept-map', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { topic } = req.body;
  const result = await libGemini.generateConceptMap(topic);
  res.json({ result });
}));

// Generic Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  if (err?.message?.includes('API key not valid') || err?.status === 400 || err?.message?.includes('API key was reported as leaked') || err?.message?.includes('API_KEY environment variable is not set')) {
    const context = process.env.VERCEL === '1' ? 'Vercel Project Settings > Environment Variables' : 'Settings > Secrets or .env file';
    return res.status(400).json({ error: `API Key Error: Your AI API Key is invalid or unset. Please update it in ${context}.` });
  }
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Catch unhandled API routes before passing to Vite
app.use('/api', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'API route not found' });
});

// Setup Vite & App
async function startServer() {
  const PORT = 3000;

  // Vite & Static serving configuration
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.VERCEL !== '1') {
    // Only serve static files via Express if NOT on Vercel
    // Vercel handles static serving via its own edge network for files in /dist
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Only start a listening server if NOT on Vercel
  if (process.env.NODE_ENV !== 'production' || (process.env.VERCEL !== '1' && process.env.NODE_ENV === 'production')) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// In some environments (like Vercel functions), we might want to ensure the app is ready.
// However, Express apps for Vercel should be exported directly.
// We execute startServer but it handles its own conditional logic for dev/prod.
startServer().catch(err => console.error("Failed to start server:", err));

export default app;
