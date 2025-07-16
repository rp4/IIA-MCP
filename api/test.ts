import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.json({ 
    message: 'API test endpoint working',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    env: process.env.NODE_ENV
  });
}