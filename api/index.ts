import '../server/polyfills.js';
import app from '../server.ts';

export default async (req: any, res: any) => {
  try {
    return await app(req, res);
  } catch (err: any) {
    console.error('VERCEL API CRASH:', err);
    res.status(500).json({
      error: 'Vercel API Crash',
      message: err.message,
      stack: err.stack,
      environment: process.env.VERCEL === '1' ? 'Vercel' : 'Local'
    });
  }
};
