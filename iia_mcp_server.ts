import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { marked } from 'marked';

// Configuration
const REPO_PATH = process.env.IIA_REPO_PATH || './iia-resources';
const GITHUB_REPO = process.env.IIA_GITHUB_REPO || 'organization/iia-resources';

interface DocumentMetadata {
  title: string;
  category: string;
  standardNumber?: string;
  lastUpdated: string;
  version: string;
  tags: string[];
}

interface SearchResult {
  file: string;
  title: string;
  category: string;
  relevance: number;
  excerpt: string;
}

class IIAResourceServer {
  private server: Server;
  private documentIndex: Map<string, DocumentMetadata> = new Map();
  private contentCache: Map<string, string> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'iia-resources',
        version: '2.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.initializeDocumentIndex();
  }

  private async initializeDocumentIndex() {
    try {
      await this.scanDocuments();
      console.error('Document index initialized with', this.documentIndex.size, 'documents');
    } catch (error) {
      console.error('Failed to initialize document index:', error);
    }
  }

  private async scanDocuments() {
    const categories = ['standards', 'guidance', 'topics', 'glossary'];
    
    for (const category of categories) {
      const categoryPath = path.join(REPO_PATH, category);
      try {
        await this.scanDirectory(categoryPath, category);
      } catch (error) {
        console.error(`Failed to scan ${category}:`, error);
      }
    }
  }

  private async scanDirectory(dirPath: string, category: string) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, category);
        } else if (entry.name.endsWith('.md')) {
          await this.indexDocument(fullPath, category);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  private async indexDocument(filePath: string, category: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const metadata = this.parseDocumentMetadata(content);
      
      const relativePath = path.relative(REPO_PATH, filePath);
      this.documentIndex.set(relativePath, {
        ...metadata,
        category,
        lastUpdated: (await fs.stat(filePath)).mtime.toISOString(),
      });
    } catch (error) {
      console.error(`Error indexing document ${filePath}:`, error);
    }
  }

  private parseDocumentMetadata(content: string): DocumentMetadata {
    const lines = content.split('\n');
    let metadata: Partial<DocumentMetadata> = {
      tags: [],
      version: '1.0.0'
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
            case 'standard':
              metadata.standardNumber = value.replace(/['"]/g, '');
              break;
            case 'version':
              metadata.version = value.replace(/['"]/g, '');
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
    if (!metadata.title) {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      metadata.title = titleMatch ? titleMatch[1] : 'Untitled';
    }

    return metadata as DocumentMetadata;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = Array.from(this.documentIndex.entries()).map(([filePath, metadata]) => ({
        uri: `iia://${filePath}`,
        name: metadata.title,
        description: `${metadata.category} - ${metadata.standardNumber || ''}`,
        mimeType: 'text/markdown',
      }));

      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const filePath = uri.replace('iia://', '');
      
      if (!this.documentIndex.has(filePath)) {
        throw new McpError(ErrorCode.InvalidRequest, `Document not found: ${filePath}`);
      }

      const content = await this.getDocumentContent(filePath);
      
      return {
        contents: [
          {
            uri: uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_documents',
            description: 'Search IIA documents by keywords, standard numbers, or topics',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (keywords, standard number, or topic)',
                },
                category: {
                  type: 'string',
                  description: 'Filter by category (standards, guidance, topics, glossary)',
                  enum: ['standards', 'guidance', 'topics', 'glossary'],
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_standard_details',
            description: 'Get detailed information about a specific IIA standard',
            inputSchema: {
              type: 'object',
              properties: {
                standardNumber: {
                  type: 'string',
                  description: 'IIA standard number (e.g., "2010", "1100")',
                },
              },
              required: ['standardNumber'],
            },
          },
          {
            name: 'get_related_documents',
            description: 'Find documents related to a specific topic or standard',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'Topic or standard to find related documents for',
                },
                includeGuidance: {
                  type: 'boolean',
                  description: 'Include implementation guidance documents',
                  default: true,
                },
              },
              required: ['topic'],
            },
          },
          {
            name: 'validate_compliance',
            description: 'Check compliance against IIA standards and provide recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  description: 'Audit scenario or situation to validate',
                },
                standardsToCheck: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific standards to check against (optional)',
                },
              },
              required: ['scenario'],
            },
          },
          {
            name: 'get_document_updates',
            description: 'Check for recent updates to IIA documents',
            inputSchema: {
              type: 'object',
              properties: {
                since: {
                  type: 'string',
                  description: 'ISO date string to check for updates since',
                },
                category: {
                  type: 'string',
                  description: 'Filter by category',
                  enum: ['standards', 'guidance', 'topics', 'glossary'],
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_documents':
          return this.searchDocuments(args.query, args.category, args.limit);
        case 'get_standard_details':
          return this.getStandardDetails(args.standardNumber);
        case 'get_related_documents':
          return this.getRelatedDocuments(args.topic, args.includeGuidance);
        case 'validate_compliance':
          return this.validateCompliance(args.scenario, args.standardsToCheck);
        case 'get_document_updates':
          return this.getDocumentUpdates(args.since, args.category);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private async getDocumentContent(filePath: string): Promise<string> {
    if (this.contentCache.has(filePath)) {
      return this.contentCache.get(filePath)!;
    }

    try {
      const fullPath = path.join(REPO_PATH, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      this.contentCache.set(filePath, content);
      return content;
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to read document: ${filePath}`);
    }
  }

  private async searchDocuments(query: string, category?: string, limit: number = 10): Promise<any> {
    const results: SearchResult[] = [];
    
    for (const [filePath, metadata] of this.documentIndex.entries()) {
      if (category && metadata.category !== category) {
        continue;
      }

      const relevance = this.calculateRelevance(query, metadata, filePath);
      if (relevance > 0) {
        const content = await this.getDocumentContent(filePath);
        const excerpt = this.extractExcerpt(content, query);
        
        results.push({
          file: filePath,
          title: metadata.title,
          category: metadata.category,
          relevance,
          excerpt,
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    const topResults = results.slice(0, limit);

    const formattedResults = topResults.map(result => 
      `**${result.title}** (${result.category})\n${result.excerpt}\n*File: ${result.file}*`
    ).join('\n\n---\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} documents matching "${query}":\n\n${formattedResults}`,
        },
      ],
    };
  }

  private calculateRelevance(query: string, metadata: DocumentMetadata, filePath: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Exact standard number match
    if (metadata.standardNumber === query) {
      score += 100;
    }

    // Title matches
    if (metadata.title.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }

    // Tag matches
    if (metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      score += 30;
    }

    // Filename matches
    if (filePath.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }

    // Partial standard number match
    if (metadata.standardNumber && metadata.standardNumber.includes(query)) {
      score += 40;
    }

    return score;
  }

  private extractExcerpt(content: string, query: string): string {
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 3);
        return lines.slice(start, end).join('\n').substring(0, 200) + '...';
      }
    }
    
    return lines.slice(0, 3).join('\n').substring(0, 200) + '...';
  }

  private async getStandardDetails(standardNumber: string): Promise<any> {
    const matchingDocs = Array.from(this.documentIndex.entries())
      .filter(([_, metadata]) => metadata.standardNumber === standardNumber);

    if (matchingDocs.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Standard ${standardNumber} not found in the repository.`,
          },
        ],
      };
    }

    const [filePath, metadata] = matchingDocs[0];
    const content = await this.getDocumentContent(filePath);

    return {
      content: [
        {
          type: 'text',
          text: `# ${metadata.title}\n**Standard:** ${standardNumber}\n**Category:** ${metadata.category}\n**Last Updated:** ${metadata.lastUpdated}\n\n${content}`,
        },
      ],
    };
  }

  private async getRelatedDocuments(topic: string, includeGuidance: boolean = true): Promise<any> {
    const results = await this.searchDocuments(topic, undefined, 20);
    
    if (!includeGuidance) {
      // Filter out guidance documents
      const filteredResults = results.content[0].text.split('\n\n---\n\n')
        .filter(section => !section.includes('(guidance)'))
        .join('\n\n---\n\n');
      
      return {
        content: [
          {
            type: 'text',
            text: filteredResults,
          },
        ],
      };
    }

    return results;
  }

  private async validateCompliance(scenario: string, standardsToCheck?: string[]): Promise<any> {
    let relevantStandards = standardsToCheck || [];
    
    if (relevantStandards.length === 0) {
      // Auto-detect relevant standards based on scenario keywords
      const keywords = scenario.toLowerCase();
      
      if (keywords.includes('independence') || keywords.includes('objective')) {
        relevantStandards.push('1100', '1110', '1120', '1130');
      }
      if (keywords.includes('plan') || keywords.includes('planning')) {
        relevantStandards.push('2010', '2200', '2201', '2210');
      }
      if (keywords.includes('report') || keywords.includes('communication')) {
        relevantStandards.push('2400', '2410', '2420', '2440');
      }
      if (keywords.includes('risk')) {
        relevantStandards.push('2010', '2120', '2201');
      }
    }

    const validationResults = [];
    
    for (const standardNumber of relevantStandards) {
      const standardDetails = await this.getStandardDetails(standardNumber);
      if (standardDetails.content[0].text.includes('not found')) {
        continue;
      }
      
      validationResults.push({
        standard: standardNumber,
        details: standardDetails.content[0].text,
      });
    }

    const formattedResults = validationResults.map(result => 
      `**Standard ${result.standard}:**\n${result.details.substring(0, 300)}...`
    ).join('\n\n---\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Compliance validation for scenario: "${scenario}"\n\nRelevant standards: ${relevantStandards.join(', ')}\n\n${formattedResults}`,
        },
      ],
    };
  }

  private async getDocumentUpdates(since?: string, category?: string): Promise<any> {
    const cutoffDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const updates = Array.from(this.documentIndex.entries())
      .filter(([_, metadata]) => {
        if (category && metadata.category !== category) return false;
        return new Date(metadata.lastUpdated) > cutoffDate;
      })
      .sort((a, b) => new Date(b[1].lastUpdated).getTime() - new Date(a[1].lastUpdated).getTime());

    const formattedUpdates = updates.map(([filePath, metadata]) => 
      `**${metadata.title}** (${metadata.category})\nUpdated: ${new Date(metadata.lastUpdated).toLocaleDateString()}\nFile: ${filePath}`
    ).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Recent updates since ${cutoffDate.toLocaleDateString()}:\n\n${formattedUpdates || 'No recent updates found.'}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('IIA Resources MCP Server v2.0 running on stdio');
  }
}

const server = new IIAResourceServer();
server.run().catch(console.error);
