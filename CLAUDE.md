# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **IIA-MCP Server** - a Model Context Protocol (MCP) server that provides AI assistants access to Institute of Internal Auditors (IIA) professional standards and resources. The server implements the MCP specification to serve IIA documents, enable search capabilities, and provide compliance validation tools.

## Tech Stack & Architecture

- **TypeScript/Node.js** MCP server implementation
- **Core Dependencies**: `@modelcontextprotocol/sdk`, `marked` for markdown processing
- **Single-file architecture**: Main implementation in `iia_mcp_server.ts`

## Key Development Commands

Since this project lacks a package.json, you'll need to initialize dependencies:

```bash
# Initialize package.json and install dependencies
npm init -y
npm install @modelcontextprotocol/sdk marked
npm install -D typescript @types/node

# Compile TypeScript
npx tsc iia_mcp_server.ts --target ES2020 --module commonjs

# Run the server
node iia_mcp_server.js
```

## Server Architecture

The MCP server (`iia_mcp_server.ts`) implements:

### Resources
- Dynamic document indexing from `iia-resources/` directory
- Categorized access to Standards, Guidance, Topics, Glossary, Templates
- Markdown content serving with metadata extraction

### Tools
1. `search_documents` - Keyword and standard number search
2. `get_standard_details` - Specific standard information retrieval  
3. `get_related_documents` - Topic-based document discovery
4. `validate_compliance` - Scenario validation against IIA standards
5. `get_document_updates` - Change tracking and updates

### Expected Directory Structure

The server expects an `iia-resources/` directory with:
- `standards/` - IIA professional standards (1000/2000 series)
- `guidance/` - Implementation guidance and IPPF framework
- `topics/` - Specialized audit topics (cybersecurity, ESG, etc.)
- `glossary/` - Definitions and acronyms
- `templates/` - Audit programs, workpapers, reports

Reference `Structure.txt` for complete expected organization.

## Configuration

Environment variables:
- `IIA_REPO_PATH` - Path to IIA resources (default: `./iia-resources`)
- `IIA_GITHUB_REPO` - Repository reference (default: `organization/iia-resources`)

## Code Patterns

- **Content caching** for performance optimization
- **YAML frontmatter parsing** for document metadata
- **Relevance scoring algorithms** for search results
- **Standard number regex matching** for compliance validation
- **Async/await patterns** throughout for file operations

## Testing

No test framework is currently configured. When adding tests, examine the existing MCP server patterns and implement integration tests for the five main tools.