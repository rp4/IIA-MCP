import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs/promises';
import * as path from 'path';

interface SearchResult {
  file: string;
  title: string;
  category: string;
  relevance: number;
  excerpt: string;
  standardNumber?: string;
  url?: string;
}

async function searchDocuments(
  query: string, 
  category?: string, 
  limit: number = 10
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const REPO_PATH = path.join(process.cwd(), 'iia-resources');
  const categories = category ? [category] : ['standards', 'guidance', 'topics', 'glossary', 'templates'];
  
  for (const cat of categories) {
    const categoryPath = path.join(REPO_PATH, cat);
    try {
      await searchInDirectory(categoryPath, cat, query, results);
    } catch (error) {
      console.error(`Failed to search in ${cat}:`, error);
    }
  }
  
  // Sort by relevance and limit results
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, limit);
}

async function searchInDirectory(
  dirPath: string, 
  category: string, 
  query: string, 
  results: SearchResult[]
) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await searchInDirectory(fullPath, category, query, results);
      } else if (entry.name.endsWith('.md')) {
        await searchInFile(fullPath, category, query, results);
      }
    }
  } catch (error) {
    console.error(`Error searching directory ${dirPath}:`, error);
  }
}

async function searchInFile(
  filePath: string, 
  category: string, 
  query: string, 
  results: SearchResult[]
) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative('./iia-resources', filePath);
    
    // Parse metadata
    const metadata = parseMetadata(content);
    
    // Calculate relevance score
    const relevance = calculateRelevance(content, query, metadata);
    
    if (relevance > 0) {
      const excerpt = extractExcerpt(content, query);
      
      results.push({
        file: relativePath,
        title: metadata.title || 'Untitled',
        category,
        relevance,
        excerpt,
        standardNumber: metadata.standardNumber,
        url: metadata.url
      });
    }
  } catch (error) {
    console.error(`Error searching file ${filePath}:`, error);
  }
}

function parseMetadata(content: string) {
  const metadata: any = {};
  const lines = content.split('\n');
  
  if (lines[0] === '---') {
    let i = 1;
    while (i < lines.length && lines[i] !== '---') {
      const line = lines[i].trim();
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim().replace(/['"]/g, '');
        metadata[key.toLowerCase()] = value;
      }
      i++;
    }
  }
  
  // Extract title from first heading if not in metadata
  if (!metadata.title) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    metadata.title = titleMatch ? titleMatch[1] : 'Untitled';
  }
  
  return metadata;
}

function calculateRelevance(content: string, query: string, metadata: any): number {
  const lowerQuery = query.toLowerCase();
  const lowerContent = content.toLowerCase();
  let score = 0;
  
  // Title match (highest weight)
  if (metadata.title && metadata.title.toLowerCase().includes(lowerQuery)) {
    score += 100;
  }
  
  // Standard number exact match
  if (metadata.standard_number && lowerQuery.includes(metadata.standard_number.toLowerCase())) {
    score += 80;
  }
  
  // Standard number pattern match (e.g., "2120" or "standard 2120")
  const standardMatch = lowerQuery.match(/(?:standard\s+)?(\d{4})/);
  if (standardMatch && metadata.standard_number === standardMatch[1]) {
    score += 80;
  }
  
  // Content matches
  const queryWords = lowerQuery.split(/\s+/);
  for (const word of queryWords) {
    if (word.length > 2) {
      const wordCount = (lowerContent.match(new RegExp(word, 'g')) || []).length;
      score += wordCount * 5;
    }
  }
  
  // Phrase match bonus
  if (lowerContent.includes(lowerQuery)) {
    score += 20;
  }
  
  return score;
}

function extractExcerpt(content: string, query: string, maxLength: number = 200): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Find the first occurrence of the query
  const index = lowerContent.indexOf(lowerQuery);
  
  if (index === -1) {
    // If query not found, return beginning of content
    return content.substring(0, maxLength) + '...';
  }
  
  // Extract context around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 150);
  
  let excerpt = content.substring(start, end);
  
  // Clean up excerpt
  excerpt = excerpt.replace(/^[^\w\s]*/, '').replace(/[^\w\s]*$/, '');
  
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
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
      const { q: query, category, limit } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      
      const limitNum = limit ? parseInt(limit as string, 10) : 10;
      const results = await searchDocuments(
        query, 
        category as string, 
        limitNum
      );
      
      return res.json({ 
        query,
        category: category || 'all',
        results,
        total: results.length
      });
    } catch (error) {
      console.error('Error searching documents:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}