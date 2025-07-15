# IIA-MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to Institute of Internal Auditors (IIA) professional standards and resources.

## Overview

This project creates an MCP server that scrapes IIA resources and formats them as markdown files for easy consumption by AI agents. The server provides comprehensive access to:

- **IIA Professional Standards** (1000 and 2000 series)
- **Implementation Guidance** and IPPF framework
- **Specialized Topics** (cybersecurity, ESG, risk assessment, etc.)
- **Glossary and Templates**
- **Recent Updates** and changes

## Architecture

### Components

1. **Scraper** (`scraper.ts`) - Web scraping tool that downloads IIA resources
2. **MCP Server** (`iia_mcp_server.ts`) - Serves scraped content via Model Context Protocol
3. **Structured Output** - Well-organized markdown files following IIA documentation patterns

### Directory Structure

Following the structure defined in `Structure.txt`:

```
iia-resources/
├── standards/
│   ├── 1000-series/           # Independence and Objectivity
│   ├── 2000-series/           # Performance Standards
│   └── index.md               # Standards overview
├── guidance/
│   ├── ippf-framework.md
│   ├── coso-integration.md
│   ├── ethics-code.md
│   └── implementation/        # Detailed guidance
├── topics/                    # Specialized audit topics
├── glossary/                  # Definitions and acronyms
├── templates/                 # Audit templates and tools
└── updates/                   # Recent changes and updates
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- TypeScript
- npm

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Usage

#### 1. Scrape IIA Resources

```bash
# Run the scraper to download and format IIA content
npm run scrape
```

This will:
- Create the `iia-resources/` directory structure
- Download IIA content from their website
- Convert HTML to markdown with proper frontmatter
- Organize files according to the standardized structure

#### 2. Run the MCP Server

```bash
# Start the MCP server
npm start

# Or for development
npm run dev
```

### Configuration

Environment variables:
- `IIA_REPO_PATH` - Path to IIA resources directory (default: `./iia-resources`)
- `IIA_GITHUB_REPO` - Repository reference (default: `organization/iia-resources`)

## MCP Server Features

### Resources
- Dynamic document serving from markdown files
- Categorized access to all IIA content types
- Metadata-rich responses with source URLs

### Tools

1. **search_documents** - Search by keywords, standard numbers, or topics
2. **get_standard_details** - Retrieve specific standard information
3. **get_related_documents** - Find related content for topics
4. **validate_compliance** - Check scenarios against IIA standards
5. **get_document_updates** - Track recent changes and updates

### Advanced Features

- **Content Caching** for performance
- **Relevance Scoring** for search results
- **Standard Number Detection** for compliance validation
- **YAML Frontmatter Parsing** for rich metadata

## Development

### File Formats

All scraped content includes YAML frontmatter:

```yaml
---
title: "Standard Title"
url: "https://www.theiia.org/original-url"
category: "standards"
standard_number: "1100"
last_updated: "2024-01-15T10:30:00Z"
scraped_at: "2024-07-15T12:00:00Z"
---

# Content starts here...
```

### Code Standards

- TypeScript with strict type checking
- Async/await patterns throughout
- Error handling and retry logic
- Respectful scraping with rate limiting

## Usage with AI Assistants

This MCP server enables AI assistants to:

- **Reference IIA Standards** accurately in audit guidance
- **Validate Compliance** scenarios against official standards
- **Search Documentation** by topic, keyword, or standard number
- **Stay Current** with the latest IIA updates and changes
- **Access Templates** for audit programs and reports

## Research and Education

This project is designed for research and educational purposes, providing structured access to public IIA resources for academic study and professional development in internal auditing.

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Check existing GitHub issues
- Create new issues with detailed descriptions
- Include error logs and environment details