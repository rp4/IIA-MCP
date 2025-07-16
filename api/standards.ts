import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs/promises';
import * as path from 'path';

interface StandardDetails {
  standardNumber: string;
  title: string;
  category: string;
  content: string;
  relatedStandards: string[];
  url?: string;
  lastUpdated?: string;
}

async function getStandardDetails(standardNumber: string): Promise<StandardDetails | null> {
  const REPO_PATH = path.join(process.cwd(), 'iia-resources');
  const standardsPath = path.join(REPO_PATH, 'standards');
  
  // Try to find the standard in both 1000 and 2000 series
  const series = standardNumber.startsWith('1') ? '1000-series' : '2000-series';
  const seriesPath = path.join(standardsPath, series);
  
  try {
    const files = await fs.readdir(seriesPath);
    const matchingFile = files.find(file => 
      file.includes(standardNumber) && file.endsWith('.md')
    );
    
    if (!matchingFile) {
      return null;
    }
    
    const filePath = path.join(seriesPath, matchingFile);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Parse metadata and content
    const metadata = parseMetadata(content);
    const cleanContent = removeMetadata(content);
    
    return {
      standardNumber,
      title: metadata.title || `Standard ${standardNumber}`,
      category: 'standards',
      content: cleanContent,
      relatedStandards: getRelatedStandards(standardNumber),
      url: metadata.url,
      lastUpdated: metadata.last_updated
    };
  } catch (error) {
    console.error(`Error getting standard ${standardNumber}:`, error);
    return null;
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
  
  return metadata;
}

function removeMetadata(content: string): string {
  const lines = content.split('\n');
  
  if (lines[0] === '---') {
    let i = 1;
    while (i < lines.length && lines[i] !== '---') {
      i++;
    }
    return lines.slice(i + 1).join('\n').trim();
  }
  
  return content;
}

function getRelatedStandards(standardNumber: string): string[] {
  const series = standardNumber.startsWith('1') ? '1000' : '2000';
  
  if (series === '1000') {
    return ['1100', '1110', '1120', '1130'].filter(s => s !== standardNumber);
  } else {
    const category = standardNumber.substring(0, 3);
    switch (category) {
      case '201':
        return ['2010', '2020', '2030', '2040', '2050', '2060'].filter(s => s !== standardNumber);
      case '210':
        return ['2100', '2110', '2120', '2130'].filter(s => s !== standardNumber);
      case '220':
        return ['2200', '2210', '2220', '2230', '2240'].filter(s => s !== standardNumber);
      case '230':
        return ['2300', '2310', '2320', '2330', '2340'].filter(s => s !== standardNumber);
      case '240':
        return ['2400', '2410', '2420', '2430', '2440', '2450'].filter(s => s !== standardNumber);
      case '250':
        return ['2500'];
      case '260':
        return ['2600'];
      default:
        return [];
    }
  }
}

async function getAllStandards(): Promise<StandardDetails[]> {
  const standards: StandardDetails[] = [];
  const REPO_PATH = './iia-resources/standards';
  
  try {
    // Scan both 1000 and 2000 series
    for (const series of ['1000-series', '2000-series']) {
      const seriesPath = path.join(REPO_PATH, series);
      try {
        const files = await fs.readdir(seriesPath);
        
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(seriesPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const metadata = parseMetadata(content);
            
            if (metadata.standard_number) {
              const standard: StandardDetails = {
                standardNumber: metadata.standard_number,
                title: metadata.title || `Standard ${metadata.standard_number}`,
                category: 'standards',
                content: removeMetadata(content),
                relatedStandards: getRelatedStandards(metadata.standard_number),
                url: metadata.url,
                lastUpdated: metadata.last_updated
              };
              standards.push(standard);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${series}:`, error);
      }
    }
  } catch (error) {
    console.error('Error getting all standards:', error);
  }
  
  return standards.sort((a, b) => a.standardNumber.localeCompare(b.standardNumber));
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
      const { standard } = req.query;
      
      if (standard && typeof standard === 'string') {
        // Get specific standard
        const standardDetails = await getStandardDetails(standard);
        
        if (!standardDetails) {
          return res.status(404).json({ error: `Standard ${standard} not found` });
        }
        
        return res.json(standardDetails);
      } else {
        // Get all standards
        const allStandards = await getAllStandards();
        return res.json({ 
          standards: allStandards,
          total: allStandards.length,
          series: {
            '1000': allStandards.filter(s => s.standardNumber.startsWith('1')).length,
            '2000': allStandards.filter(s => s.standardNumber.startsWith('2')).length
          }
        });
      }
    } catch (error) {
      console.error('Error in standards API:', error);
      return res.status(500).json({ error: 'Failed to load standards' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}