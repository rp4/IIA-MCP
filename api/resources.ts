import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs/promises';
import * as path from 'path';

interface DocumentMetadata {
  title: string;
  category: string;
  standardNumber?: string;
  lastUpdated: string;
  url: string;
  scrapedAt: string;
  tags: string[];
}

async function getDocumentIndex(): Promise<Map<string, DocumentMetadata>> {
  const documentIndex = new Map<string, DocumentMetadata>();
  const REPO_PATH = path.join(process.cwd(), 'iia-resources');
  const categories = ['standards', 'guidance', 'topics', 'glossary', 'templates', 'updates'];
  
  for (const category of categories) {
    const categoryPath = path.join(REPO_PATH, category);
    try {
      await scanDirectory(categoryPath, category, documentIndex);
    } catch (error) {
      console.error(`Failed to scan ${category}:`, error);
    }
  }
  
  return documentIndex;
}

async function scanDirectory(dirPath: string, category: string, documentIndex: Map<string, DocumentMetadata>) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, category, documentIndex);
      } else if (entry.name.endsWith('.md')) {
        await indexDocument(fullPath, category, documentIndex);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
}

async function indexDocument(filePath: string, category: string, documentIndex: Map<string, DocumentMetadata>) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = parseDocumentMetadata(content);
    
    const relativePath = path.relative('./iia-resources', filePath);
    documentIndex.set(relativePath, {
      ...metadata,
      category,
      lastUpdated: (await fs.stat(filePath)).mtime.toISOString(),
    });
  } catch (error) {
    console.error(`Error indexing document ${filePath}:`, error);
  }
}

function parseDocumentMetadata(content: string): DocumentMetadata {
  const lines = content.split('\n');
  let metadata: Partial<DocumentMetadata> = {
    tags: [],
    title: 'Untitled',
    url: '',
    lastUpdated: new Date().toISOString(),
    scrapedAt: new Date().toISOString()
  };

  // Look for YAML frontmatter
  if (lines[0] === '---') {
    let i = 1;
    while (i < lines.length && lines[i] !== '---') {
      const line = lines[i].trim();
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.toLowerCase()) {
          case 'title':
            metadata.title = value.replace(/['"]/g, '');
            break;
          case 'standard_number':
            metadata.standardNumber = value.replace(/['"]/g, '');
            break;
          case 'url':
            metadata.url = value.replace(/['"]/g, '');
            break;
          case 'last_updated':
            metadata.lastUpdated = value.replace(/['"]/g, '');
            break;
          case 'scraped_at':
            metadata.scrapedAt = value.replace(/['"]/g, '');
            break;
          case 'tags':
            metadata.tags = value.split(',').map(t => t.trim().replace(/['"]/g, ''));
            break;
        }
      }
      i++;
    }
  }

  // Fallback: extract title from first heading
  if (!metadata.title || metadata.title === 'Untitled') {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    metadata.title = titleMatch ? titleMatch[1] : 'Untitled';
  }

  return metadata as DocumentMetadata;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const documentIndex = await getDocumentIndex();
      const resources = Array.from(documentIndex.entries()).map(([filePath, metadata]) => ({
        uri: `iia://${filePath}`,
        name: metadata.title,
        description: `${metadata.category} - ${metadata.standardNumber || ''}`,
        mimeType: 'text/markdown',
        metadata
      }));

      return res.json({ resources });
    } catch (error) {
      console.error('Error getting resources:', error);
      return res.status(500).json({ error: 'Failed to load resources' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}