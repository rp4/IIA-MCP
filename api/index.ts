import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      name: 'IIA MCP Server',
      version: '2.0.0',
      description: 'Model Context Protocol server for Institute of Internal Auditors resources',
      capabilities: {
        resources: true,
        tools: true
      },
      endpoints: {
        resources: '/api/resources',
        tools: '/api/tools',
        search: '/api/search',
        standards: '/api/standards',
        compliance: '/api/compliance'
      },
      documentation: 'https://github.com/your-repo/iia-mcp-server'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}