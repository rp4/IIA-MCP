# IIA-MCP Server - Vercel Deployment Guide

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/iia-mcp-server)

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push this code to a GitHub repository
3. **Node.js**: Version 18+ (for local development)

## 🛠️ Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. **Connect Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Select the repository containing this code

2. **Configure Project**
   - Project Name: `iia-mcp-server`
   - Framework Preset: `Other`
   - Root Directory: `./` (default)

3. **Environment Variables** (Optional)
   ```
   IIA_REPO_PATH=./iia-resources
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Preview deployment
   npm run preview
   
   # Production deployment
   npm run deploy
   ```

## 🌐 API Endpoints

Once deployed, your IIA-MCP server will be available at:
- **Base URL**: `https://your-project-name.vercel.app`

### Available Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/` | GET | API documentation and demo interface |
| `/api/resources` | GET | List all IIA resources |
| `/api/search?q=query` | GET | Search documents |
| `/api/standards?standard=2120` | GET | Get specific standard details |
| `/api/compliance` | POST | Validate compliance scenarios |

### Example Usage

```bash
# Get all resources
curl https://your-project-name.vercel.app/api/resources

# Search for risk management
curl "https://your-project-name.vercel.app/api/search?q=risk%20management&limit=5"

# Get standard 2120 details
curl "https://your-project-name.vercel.app/api/standards?standard=2120"

# Validate compliance scenario
curl -X POST "https://your-project-name.vercel.app/api/compliance" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Our audit team reports to the CFO", "standards": ["1110"]}'
```

## 🔧 Configuration

### Vercel Configuration (`vercel.json`)

The project includes a `vercel.json` file with optimal settings:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index"
    }
  ],
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### TypeScript Configuration

The project uses TypeScript with proper Vercel integration:
- API routes in `api/` directory
- Automatic TypeScript compilation
- Node.js 18.x runtime

## 📁 Project Structure for Deployment

```
iia-mcp-server/
├── api/                     # Vercel serverless functions
│   ├── index.ts            # Main API documentation endpoint
│   ├── resources.ts        # Resources listing API
│   ├── search.ts           # Document search API
│   ├── standards.ts        # Standards details API
│   └── compliance.ts       # Compliance validation API
├── iia-resources/          # IIA content (deployed as static files)
│   ├── standards/
│   ├── guidance/
│   ├── topics/
│   └── templates/
├── public/                 # Static files
│   └── index.html         # Web interface
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## 🎯 MCP Integration

### Using with Claude Code

After deployment, integrate with Claude Code MCP:

1. **Add to MCP Configuration**
   ```json
   {
     "mcpServers": {
       "iia-resources": {
         "command": "node",
         "args": ["/path/to/mcp-client.js"],
         "env": {
           "IIA_API_BASE": "https://your-project-name.vercel.app"
         }
       }
     }
   }
   ```

2. **Use in Claude Code**
   - Search IIA standards: "Search for standard 2120"
   - Get compliance advice: "Check this scenario against IIA standards"
   - Browse resources: "Show me IIA cybersecurity guidance"

### Using as Web API

The deployed server provides a REST API that can be used by:
- **Web applications**: JavaScript/TypeScript frontends
- **Python scripts**: Using `requests` library
- **cURL commands**: Command-line integration
- **Postman/Insomnia**: API testing and development

## 🔍 Monitoring and Debugging

### Vercel Dashboard

Monitor your deployment at [vercel.com/dashboard](https://vercel.com/dashboard):
- **Functions**: Monitor API performance
- **Analytics**: Track usage and performance
- **Logs**: Debug issues and errors
- **Domains**: Configure custom domains

### Local Development

For local development and testing:

```bash
# Install dependencies
npm install

# Run locally (original MCP server)
npm run dev

# Test API endpoints locally with Vercel
vercel dev
```

## 🛡️ Security Considerations

### CORS Configuration
All API endpoints include proper CORS headers for web browser access.

### Rate Limiting
Consider adding rate limiting for production use:
- Vercel Pro plans include built-in protection
- Custom rate limiting can be added to API routes

### API Keys
For production use, consider adding API key authentication:
```typescript
// In API routes
const apiKey = req.headers['x-api-key'];
if (!apiKey || apiKey !== process.env.API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

## 📈 Performance Optimization

### Cold Start Optimization
- API routes are optimized for minimal cold start time
- Static resources are served from Vercel's CDN
- TypeScript compilation is handled at build time

### Caching Strategy
- IIA resources are cached in memory during function execution
- Consider Redis for persistent caching in high-traffic scenarios

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript compilation errors
   - Verify all dependencies are in package.json
   - Review Vercel build logs

2. **API Errors**
   - Check Vercel function logs
   - Verify file paths are correct
   - Ensure iia-resources directory is included

3. **CORS Issues**
   - Verify CORS headers in API responses
   - Check browser developer tools for errors

### Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **IIA Official Resources**: [theiia.org](https://www.theiia.org)
- **GitHub Issues**: Create issues in your repository

## 🎉 Success!

Once deployed successfully, you'll have:
- ✅ Web-accessible IIA resources API
- ✅ Interactive documentation at your domain
- ✅ MCP server capabilities for AI integration
- ✅ Automatic HTTPS and global CDN
- ✅ Serverless scaling and monitoring

Your IIA-MCP server is now ready to serve IIA standards and guidance to AI applications worldwide! 🌍