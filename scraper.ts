import * as fs from 'fs/promises';
import * as path from 'path';
import { marked } from 'marked';

interface ScrapingConfig {
  baseUrl: string;
  outputDir: string;
  rateLimit: number; // ms between requests
  maxRetries: number;
  userAgent: string;
}

interface IIAResource {
  url: string;
  title: string;
  content: string;
  category: 'standard' | 'guidance' | 'topic' | 'glossary' | 'template';
  standardNumber?: string;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

class IIAScraper {
  private config: ScrapingConfig;
  private requestQueue: string[] = [];
  private isProcessing = false;

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = {
      baseUrl: 'https://www.theiia.org',
      outputDir: './iia-resources',
      rateLimit: 2000, // 2 seconds between requests
      maxRetries: 3,
      userAgent: 'Mozilla/5.0 (compatible; IIA-Research-Bot/1.0)',
      ...config
    };
  }

  async scrape(): Promise<void> {
    console.log('Starting IIA resource scraping...');
    
    // Create output directory structure
    await this.ensureDirectories();
    
    // Scrape different resource types
    await this.scrapeStandards();
    await this.scrapeGuidance();
    await this.scrapeTopics();
    await this.scrapeGlossaryAndTemplates();
    
    console.log('Scraping completed!');
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      'standards/1000-series',
      'standards/2000-series',
      'guidance/implementation',
      'topics',
      'glossary',
      'templates',
      'updates',
      '.github/workflows'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.config.outputDir, dir), { recursive: true });
    }
  }

  private async scrapeStandards(): Promise<void> {
    console.log('Scraping standards...');
    
    // Standards pages that contain the actual content and download links
    const standardsPages = [
      { 
        url: '/en/standards/2024-standards/global-internal-audit-standards/', 
        description: 'Complete standards with all 1000 and 2000 series'
      },
      { 
        url: '/en/standards/2024-standards/topical-requirements/', 
        description: 'Specialized requirements and guidance'
      },
      { 
        url: '/en/standards/2024-standards/global-guidance/', 
        description: 'Implementation guidance and best practices'
      }
    ];

    // Scrape main standards pages
    for (const page of standardsPages) {
      await this.scrapeAndSave(page.url, 'standards');
    }

    // Create individual standard files based on known structure
    await this.createIndividualStandardFiles();
    
    // Create index.md
    await this.createStandardsIndex();
  }

  private async createIndividualStandardFiles(): Promise<void> {
    console.log('Creating individual standard files...');
    
    // Create placeholder files with standard information until we can extract from PDFs
    const standards1000 = [
      { number: '1100', title: 'Independence and Objectivity', description: 'The internal audit activity must be independent, and internal auditors must be objective in performing their work.' },
      { number: '1110', title: 'Organizational Independence', description: 'The chief audit executive must report to a level within the organization that allows the internal audit activity to fulfill its responsibilities.' },
      { number: '1120', title: 'Individual Objectivity', description: 'Internal auditors must have an impartial, unbiased attitude and avoid any conflict of interest.' },
      { number: '1130', title: 'Impairment to Independence or Objectivity', description: 'If independence or objectivity is impaired in fact or appearance, the details of the impairment must be disclosed to appropriate parties.' }
    ];

    const standards2000 = [
      { number: '2010', title: 'Planning', description: 'The chief audit executive must establish risk-based plans to determine the priorities of the internal audit activity.' },
      { number: '2020', title: 'Communication and Approval', description: 'The chief audit executive must communicate the internal audit activity\'s plans and resource requirements to senior management and the board.' },
      { number: '2030', title: 'Resource Management', description: 'The chief audit executive must ensure that internal audit resources are appropriate, sufficient, and effectively deployed.' },
      { number: '2040', title: 'Policies and Procedures', description: 'The chief audit executive must establish policies and procedures to guide the internal audit activity.' },
      { number: '2050', title: 'Coordination and Reliance', description: 'The chief audit executive should share information, coordinate activities, and consider relying upon the work of other internal and external assurance and consulting service providers.' },
      { number: '2060', title: 'Reporting to Senior Management and the Board', description: 'The chief audit executive must report periodically to senior management and the board on the internal audit activity\'s purpose, authority, responsibility, and performance.' },
      { number: '2100', title: 'Nature of Work', description: 'The internal audit activity must evaluate and contribute to the improvement of the organization\'s governance, risk management, and control processes.' },
      { number: '2110', title: 'Governance', description: 'The internal audit activity must assess and make appropriate recommendations to improve the organization\'s governance processes.' },
      { number: '2120', title: 'Risk Management', description: 'The internal audit activity must evaluate the effectiveness and contribute to the improvement of risk management processes.' },
      { number: '2130', title: 'Control', description: 'The internal audit activity must assist the organization in maintaining effective controls by evaluating their effectiveness and efficiency.' },
      { number: '2200', title: 'Engagement Planning', description: 'Internal auditors must develop and document a plan for each engagement, including the engagement\'s objectives, scope, timing, and resource allocations.' },
      { number: '2210', title: 'Engagement Objectives', description: 'Objectives must be established for each engagement.' },
      { number: '2220', title: 'Engagement Scope', description: 'The established scope must be sufficient to achieve the engagement\'s objectives.' },
      { number: '2230', title: 'Engagement Resource Allocation', description: 'Internal auditors must determine appropriate and sufficient resources to achieve engagement objectives.' },
      { number: '2240', title: 'Engagement Work Program', description: 'Internal auditors must develop and document work programs that achieve the engagement objectives.' },
      { number: '2300', title: 'Performing the Engagement', description: 'Internal auditors must identify, analyze, evaluate, and document sufficient information to achieve the engagement\'s objectives.' },
      { number: '2310', title: 'Identifying Information', description: 'Internal auditors must identify sufficient, reliable, relevant, and useful information to achieve the engagement\'s objectives.' },
      { number: '2320', title: 'Analysis and Evaluation', description: 'Internal auditors must base conclusions and engagement results on appropriate analyses and evaluations.' },
      { number: '2330', title: 'Documenting Information', description: 'Internal auditors must document sufficient, reliable, relevant, and useful information to support the engagement results and conclusions.' },
      { number: '2340', title: 'Engagement Supervision', description: 'Engagements must be properly supervised to ensure objectives are achieved, quality is assured, and staff is developed.' },
      { number: '2400', title: 'Communicating Results', description: 'Internal auditors must communicate engagement results.' },
      { number: '2410', title: 'Criteria for Communicating', description: 'Communications must include the engagement\'s objectives, scope, and results.' },
      { number: '2420', title: 'Quality of Communications', description: 'Communications must be accurate, objective, clear, concise, constructive, complete, and timely.' },
      { number: '2430', title: 'Use of "Conducted in Conformance with the Global Internal Audit Standards"', description: 'Indicating that engagements are "conducted in conformance with the Global Internal Audit Standards" is appropriate only if supported by the results of the quality assurance and improvement program.' },
      { number: '2440', title: 'Disseminating Results', description: 'The chief audit executive must communicate results to appropriate parties.' },
      { number: '2450', title: 'Overall Opinions', description: 'When an overall opinion is issued, it must take into account the strategies, objectives, and risks of the organization.' },
      { number: '2500', title: 'Monitoring Progress', description: 'The chief audit executive must establish and maintain a system to monitor the disposition of results communicated to management.' },
      { number: '2600', title: 'Communicating the Acceptance of Risks', description: 'When the chief audit executive concludes that management has accepted a level of risk that may be unacceptable to the organization, the chief audit executive must discuss the matter with senior management.' }
    ];

    // Create 1000-series files
    for (const standard of standards1000) {
      const content = this.createStandardMarkdown(standard);
      const filepath = path.join(this.config.outputDir, 'standards', '1000-series', `${standard.number}-${this.sanitizeFilename(standard.title)}.md`);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, content, 'utf8');
      console.log(`Created: ${filepath}`);
    }

    // Create 2000-series files
    for (const standard of standards2000) {
      const content = this.createStandardMarkdown(standard);
      const filepath = path.join(this.config.outputDir, 'standards', '2000-series', `${standard.number}-${this.sanitizeFilename(standard.title)}.md`);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, content, 'utf8');
      console.log(`Created: ${filepath}`);
    }
  }

  private createStandardMarkdown(standard: { number: string; title: string; description: string }): string {
    const frontmatter = [
      '---',
      `title: "Standard ${standard.number} - ${standard.title}"`,
      `url: "https://www.theiia.org/en/standards/2024-standards/global-internal-audit-standards/"`,
      `category: "standards"`,
      `standard_number: "${standard.number}"`,
      `last_updated: "${new Date().toISOString()}"`,
      `scraped_at: "${new Date().toISOString()}"`,
      '---',
      ''
    ].join('\n');

    const content = `# Standard ${standard.number} - ${standard.title}

## Description

${standard.description}

## Notes

This is a summary based on the IIA Global Internal Audit Standards. For the complete text and detailed implementation guidance, refer to the official IIA Standards documentation available at:

- [Complete Global Internal Audit Standards](https://www.theiia.org/en/standards/2024-standards/global-internal-audit-standards/)
- [Standards Knowledge Center](https://www.theiia.org/en/standards/2024-standards/standards-knowledge-center/)

## Related Standards

${this.getRelatedStandards(standard.number)}

## Implementation Guidance

For detailed implementation guidance, refer to the IIA's official guidance documents and the Standards Knowledge Center.
`;

    return frontmatter + content;
  }

  private getRelatedStandards(standardNumber: string): string {
    const series = standardNumber.startsWith('1') ? '1000' : '2000';
    if (series === '1000') {
      return `Other Independence and Objectivity standards:
- Standard 1100 - Independence and Objectivity
- Standard 1110 - Organizational Independence  
- Standard 1120 - Individual Objectivity
- Standard 1130 - Impairment to Independence or Objectivity`;
    } else {
      const category = standardNumber.substring(0, 3);
      switch (category) {
        case '201':
          return 'Other Planning standards: 2010, 2020, 2030, 2040, 2050, 2060';
        case '210':
          return 'Other Nature of Work standards: 2100, 2110, 2120, 2130';
        case '220':
          return 'Other Engagement Planning standards: 2200, 2210, 2220, 2230, 2240';
        case '230':
          return 'Other Performing the Engagement standards: 2300, 2310, 2320, 2330, 2340';
        case '240':
          return 'Other Communicating Results standards: 2400, 2410, 2420, 2430, 2440, 2450';
        case '250':
          return 'Monitoring Progress standard: 2500';
        case '260':
          return 'Communicating the Acceptance of Risks standard: 2600';
        default:
          return 'See other 2000-series Performance standards for related requirements.';
      }
    }
  }

  private async scrapeStandardWithStructure(url: string, filename: string, series: string): Promise<void> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
      console.log(`Scraping standard: ${fullUrl}`);
      
      const content = await this.fetchWithRetry(fullUrl);
      const resource = await this.parseContent(content, fullUrl, 'standards');
      
      if (resource) {
        const filepath = path.join(this.config.outputDir, 'standards', series, filename);
        await this.saveAsMarkdownWithPath(resource, filepath);
      }
      
      await this.delay(this.config.rateLimit);
      
    } catch (error) {
      console.error(`Error scraping standard ${url}:`, error);
    }
  }

  private async createStandardsIndex(): Promise<void> {
    const indexContent = `# IIA Professional Standards

## 1000 Series - Independence and Objectivity

- [1100 - Independence and Objectivity](./1000-series/1100-independence-and-objectivity.md)
- [1110 - Organizational Independence](./1000-series/1110-organizational-independence.md)
- [1120 - Individual Objectivity](./1000-series/1120-individual-objectivity.md)
- [1130 - Impairment to Independence or Objectivity](./1000-series/1130-impairment-to-independence-or-objectivity.md)

## 2000 Series - Performance Standards

### Planning (2010-2060)
- [2010 - Planning](./2000-series/2010-planning.md)
- [2020 - Communication and Approval](./2000-series/2020-communication-and-approval.md)
- [2030 - Resource Management](./2000-series/2030-resource-management.md)
- [2040 - Policies and Procedures](./2000-series/2040-policies-and-procedures.md)
- [2050 - Coordination and Reliance](./2000-series/2050-coordination-and-reliance.md)
- [2060 - Reporting to Senior Management and the Board](./2000-series/2060-reporting-to-senior-management-and-the-board.md)

### Nature of Work (2100-2130)
- [2100 - Nature of Work](./2000-series/2100-nature-of-work.md)
- [2110 - Governance](./2000-series/2110-governance.md)
- [2120 - Risk Management](./2000-series/2120-risk-management.md)
- [2130 - Control](./2000-series/2130-control.md)

### Engagement Planning (2200-2240)
- [2200 - Engagement Planning](./2000-series/2200-engagement-planning.md)
- [2210 - Engagement Objectives](./2000-series/2210-engagement-objectives.md)
- [2220 - Engagement Scope](./2000-series/2220-engagement-scope.md)
- [2230 - Engagement Resource Allocation](./2000-series/2230-engagement-resource-allocation.md)
- [2240 - Engagement Work Program](./2000-series/2240-engagement-work-program.md)

### Performing the Engagement (2300-2340)
- [2300 - Performing the Engagement](./2000-series/2300-performing-the-engagement.md)
- [2310 - Identifying Information](./2000-series/2310-identifying-information.md)
- [2320 - Analysis and Evaluation](./2000-series/2320-analysis-and-evaluation.md)
- [2330 - Documenting Information](./2000-series/2330-documenting-information.md)
- [2340 - Engagement Supervision](./2000-series/2340-engagement-supervision.md)

### Communicating Results (2400-2450)
- [2400 - Communicating Results](./2000-series/2400-communicating-results.md)
- [2410 - Criteria for Communicating](./2000-series/2410-criteria-for-communicating.md)
- [2420 - Quality of Communications](./2000-series/2420-quality-of-communications.md)
- [2430 - Use of "Conducted in Conformance with the Global Internal Audit Standards"](./2000-series/2430-use-of-conducted-in-conformance-with-the-global-internal-audit-standards.md)
- [2440 - Disseminating Results](./2000-series/2440-disseminating-results.md)
- [2450 - Overall Opinions](./2000-series/2450-overall-opinions.md)

### Monitoring and Risk Acceptance (2500-2600)
- [2500 - Monitoring Progress](./2000-series/2500-monitoring-progress.md)
- [2600 - Communicating the Acceptance of Risks](./2000-series/2600-communicating-the-acceptance-of-risks.md)

## Additional Resources

- [Global Internal Audit Standards Overview](./global-internal-audit-standards.md)
- [Topical Requirements](./topical-requirements.md)
- [Global Guidance](./global-guidance.md)

## Official IIA Resources

For the complete, authoritative text of all standards, visit:
- [IIA Standards Knowledge Center](https://www.theiia.org/en/standards/2024-standards/standards-knowledge-center/)
- [Complete Global Internal Audit Standards (PDF)](https://www.theiia.org/en/standards/2024-standards/global-internal-audit-standards/)
`;

    const indexPath = path.join(this.config.outputDir, 'standards', 'index.md');
    await fs.writeFile(indexPath, indexContent, 'utf8');
    console.log('Created standards/index.md');
  }

  private async scrapeGuidance(): Promise<void> {
    console.log('Scraping guidance documents...');
    
    const guidanceDocuments = [
      { url: '/en/standards/ippf/', file: 'ippf-framework.md' },
      { url: '/en/standards/coso/', file: 'coso-integration.md' },
      { url: '/en/standards/ethics-and-professionalism/', file: 'ethics-code.md' }
    ];

    const implementationGuidance = [
      { url: '/en/guidance/risk-assessment/', file: 'implementation/risk-assessment-guidance.md' },
      { url: '/en/guidance/reporting/', file: 'implementation/reporting-best-practices.md' }
    ];

    // Scrape main guidance documents
    for (const doc of guidanceDocuments) {
      await this.scrapeDocumentWithPath(doc.url, path.join('guidance', doc.file));
    }

    // Scrape implementation guidance
    for (const doc of implementationGuidance) {
      await this.scrapeDocumentWithPath(doc.url, path.join('guidance', doc.file));
    }
  }

  private async scrapeDocumentWithPath(url: string, relativePath: string): Promise<void> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
      console.log(`Scraping: ${fullUrl}`);
      
      const content = await this.fetchWithRetry(fullUrl);
      const resource = await this.parseContent(content, fullUrl, path.dirname(relativePath));
      
      if (resource) {
        const filepath = path.join(this.config.outputDir, relativePath);
        await this.saveAsMarkdownWithPath(resource, filepath);
      }
      
      await this.delay(this.config.rateLimit);
      
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  private async scrapeTopics(): Promise<void> {
    console.log('Scraping topic areas...');
    
    const topicDocuments = [
      { url: '/en/resources/topics/risk/', file: 'risk-assessment.md' },
      { url: '/en/resources/topics/controls/', file: 'internal-controls.md' },
      { url: '/en/resources/topics/planning/', file: 'audit-planning.md' },
      { url: '/en/resources/topics/cybersecurity/', file: 'cybersecurity-auditing.md' },
      { url: '/en/resources/topics/esg/', file: 'esg-auditing.md' }
    ];

    for (const doc of topicDocuments) {
      await this.scrapeDocumentWithPath(doc.url, path.join('topics', doc.file));
    }
  }

  private async scrapeGlossaryAndTemplates(): Promise<void> {
    console.log('Scraping glossary and templates...');
    
    const glossaryDocs = [
      { url: '/en/resources/glossary/', file: 'glossary/definitions.md' },
      { url: '/en/resources/acronyms/', file: 'glossary/acronyms.md' }
    ];

    const templateDocs = [
      { url: '/en/resources/templates/audit-program/', file: 'templates/audit-program-template.md' },
      { url: '/en/resources/templates/workpaper/', file: 'templates/workpaper-template.md' },
      { url: '/en/resources/templates/report/', file: 'templates/report-template.md' }
    ];

    for (const doc of [...glossaryDocs, ...templateDocs]) {
      await this.scrapeDocumentWithPath(doc.url, doc.file);
    }
  }

  private async scrapeAndSave(url: string, category: string): Promise<void> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
      console.log(`Scraping: ${fullUrl}`);
      
      const content = await this.fetchWithRetry(fullUrl);
      const resource = await this.parseContent(content, fullUrl, category);
      
      if (resource) {
        await this.saveAsMarkdown(resource, category);
      }
      
      // Rate limiting
      await this.delay(this.config.rateLimit);
      
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  private async fetchWithRetry(url: string, retryCount = 0): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (retryCount < this.config.maxRetries) {
        console.log(`Retrying ${url} (attempt ${retryCount + 1})`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  private async parseContent(html: string, url: string, category: string): Promise<IIAResource | null> {
    try {
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(' | The IIA', '').trim() : 'Untitled';
      
      // Extract main content (this will need refinement based on IIA's HTML structure)
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      const contentDivMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const contentMatch = mainMatch || articleMatch || contentDivMatch;
      
      if (!contentMatch) {
        console.log(`No main content found for ${url}`);
        return null;
      }
      
      // Convert HTML to clean text/markdown
      const cleanContent = this.htmlToMarkdown(contentMatch[1]);
      
      // Extract metadata
      const metadata = this.extractMetadata(html);
      
      // Detect standard numbers
      const standardNumber = this.extractStandardNumber(title, cleanContent);
      
      return {
        url,
        title,
        content: cleanContent,
        category: category as any,
        standardNumber,
        lastUpdated: new Date(),
        metadata
      };
      
    } catch (error) {
      console.error(`Error parsing content from ${url}:`, error);
      return null;
    }
  }

  private htmlToMarkdown(html: string): string {
    // Clean up HTML
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    
    // Convert common HTML elements to markdown
    content = content
      .replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>([^<]+)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>([^<]+)<\/h6>/gi, '###### $1\n\n')
      .replace(/<p[^>]*>([^<]+)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>([^<]+)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>([^<]+)<\/i>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1\n')
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1\n')
      .replace(/<li[^>]*>([^<]+)<\/li>/gi, '- $1\n');
    
    // Clean up extra whitespace and HTML tags
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    return content;
  }

  private extractMetadata(html: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Extract meta tags
    const metaTags = html.match(/<meta[^>]+>/gi) || [];
    for (const tag of metaTags) {
      const nameMatch = tag.match(/name="([^"]+)"/i);
      const contentMatch = tag.match(/content="([^"]+)"/i);
      if (nameMatch && contentMatch) {
        metadata[nameMatch[1]] = contentMatch[1];
      }
    }
    
    // Extract structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      try {
        metadata.structuredData = JSON.parse(jsonLdMatch[0].replace(/<[^>]+>/g, ''));
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    return metadata;
  }

  private extractStandardNumber(title: string, content: string): string | undefined {
    // Look for standard numbers like 1000, 2000, etc.
    const patterns = [
      /Standard\s+(\d{4})/i,
      /\b(\d{4})\s*[-–]\s*[A-Z]/i,
      /IIA\s+Standard\s+(\d+)/i,
      /(\d{4})\s*series/i
    ];
    
    const text = `${title} ${content}`;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }

  private async saveAsMarkdown(resource: IIAResource, category: string): Promise<void> {
    const filename = this.sanitizeFilename(resource.title) + '.md';
    const filepath = path.join(this.config.outputDir, category, filename);
    
    // Create frontmatter
    const frontmatter = [
      '---',
      `title: "${resource.title.replace(/"/g, '\\"')}"`,
      `url: "${resource.url}"`,
      `category: "${resource.category}"`,
      resource.standardNumber ? `standard_number: "${resource.standardNumber}"` : '',
      `last_updated: "${resource.lastUpdated.toISOString()}"`,
      `scraped_at: "${new Date().toISOString()}"`,
      '---',
      ''
    ].filter(Boolean).join('\n');
    
    const markdownContent = frontmatter + resource.content;
    
    await fs.writeFile(filepath, markdownContent, 'utf8');
    console.log(`Saved: ${filepath}`);
  }

  private async saveAsMarkdownWithPath(resource: IIAResource, filepath: string): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    // Create frontmatter
    const frontmatter = [
      '---',
      `title: "${resource.title.replace(/"/g, '\\"')}"`,
      `url: "${resource.url}"`,
      `category: "${resource.category}"`,
      resource.standardNumber ? `standard_number: "${resource.standardNumber}"` : '',
      `last_updated: "${resource.lastUpdated.toISOString()}"`,
      `scraped_at: "${new Date().toISOString()}"`,
      '---',
      ''
    ].filter(Boolean).join('\n');
    
    const markdownContent = frontmatter + resource.content;
    
    await fs.writeFile(filepath, markdownContent, 'utf8');
    console.log(`Saved: ${filepath}`);
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
if (require.main === module) {
  const scraper = new IIAScraper();
  scraper.scrape().catch(console.error);
}

export { IIAScraper };