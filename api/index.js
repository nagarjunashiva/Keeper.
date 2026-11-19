import app, { connectDatabase } from '../server/server.js';

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err) {
      console.error('[Vercel Serverless API] Database connection error:', err);
    }
  }
  return app(req, res);
}
