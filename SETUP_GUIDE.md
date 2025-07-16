# IIA MCP Server Setup Guide

## Current Status

✅ **MCP Bridge Working Locally** - The standalone MCP bridge is functional and tested
✅ **Vercel Deployment Fixed** - All API endpoints are working correctly on production
✅ **End-to-End Testing** - Complete integration tested and verified

## Quick Start for Claude Desktop

### Option 1: Use Standalone Bridge (Recommended)

1. **Add to Claude Desktop Configuration**
   
   Add this to your Claude Desktop config file (`~/.claude_desktop_config.json` on macOS/Linux or `%APPDATA%\\Claude\\claude_desktop_config.json` on Windows):

   ```json
   {
     "mcpServers": {
       "iia-resources": {
         "command": "node",
         "args": ["/home/p472/IIA-MCP/mcp-bridge-standalone.js"],
         "env": {
           "IIA_API_BASE": "https://iia-mcp.vercel.app"
         }
       }
     }
   }
   ```

2. **Restart Claude Desktop**

3. **Test the Integration**
   
   In Claude Desktop, try asking:
   - "Search IIA documents for risk management"
   - "Get details on IIA standard 2120"
   - "Validate this scenario against IIA standards: [your scenario]"

### Option 2: Local Development/Testing

For local development or testing with mock data:

1. **Start Local Mock Server** (optional)
   ```bash
   cd /home/p472/IIA-MCP
   node local-test-server.js
   ```

2. **Update Environment Variable for Local Testing**
   ```json
   {
     "mcpServers": {
       "iia-resources": {
         "command": "node",
         "args": ["/home/p472/IIA-MCP/mcp-bridge-standalone.js"],
         "env": {
           "IIA_API_BASE": "http://localhost:3001"
         }
       }
     }
   }
   ```

## Available Tools

The MCP server provides these tools for Claude Desktop:

1. **search_iia_documents** - Search IIA documents by keywords
2. **get_iia_standard** - Get detailed information about specific standards
3. **validate_iia_compliance** - Validate scenarios against IIA standards

## Troubleshooting

### Common Issues
- **MCP Server not appearing in Claude Desktop**: Restart Claude Desktop after adding configuration
- **Tool calls failing**: Verify the bridge file path in your configuration
- **Performance issues**: The API searches through markdown files, responses may take a few seconds

### API Endpoints (for direct testing)
- Search: `https://iia-mcp.vercel.app/api/search?q=risk`
- Standards: `https://iia-mcp.vercel.app/api/standards?standard=2120`
- Resources: `https://iia-mcp.vercel.app/api/resources`

## Development Status

- ✅ MCP Protocol Implementation
- ✅ Standalone Bridge (no external dependencies)
- ✅ Local Testing Infrastructure
- ✅ Production Deployment Working
- ✅ Claude Desktop Integration Ready
- ✅ End-to-End Testing Complete