# Netlify Deployment Guide for Open Hivemind

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Netlify
```bash
npm run build:netlify
```

### 3. Deploy to Netlify

**Option A: Using Netlify CLI**
```bash
netlify deploy --prod --dir=dist/client --functions=dist/netlify/functions
```

**Option B: Using Git (Recommended)**
1. Push your code to a Git repository
2. Connect your repository to Netlify
3. Netlify will automatically detect the `netlify.toml` configuration

### 4. Configure Environment Variables
In the Netlify dashboard, set these environment variables:
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-domain.netlify.app`
- Any other required API keys or configuration values

## Architecture Overview

### Build Process
1. **Backend Build**: TypeScript compilation to `dist/src/`
2. **Frontend Build**: Vite builds React app to `src/client/dist/`
3. **Asset Copy**: Frontend assets copied to `dist/client/`
4. **Serverless Function**: Compiled to `dist/netlify/functions/server.js`

### Runtime Architecture
- **Static Assets**: Served directly from `dist/client/`
- **API Routes**: Routed to serverless function at `/.netlify/functions/server`
- **SPA Fallback**: All other routes serve `index.html` for React Router

## Configuration Files

### `netlify.toml`
```toml
[build]
  command = "npm run build:netlify"
  functions = "dist/netlify/functions"
  publish = "dist/client"

[dev]
  command = "npm run dev"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server"
  status = 200

[[redirects]]
  from = "/webui/*"
  to = "/.netlify/functions/server"
  status = 200

[[redirects]]
  from = "/health/*"
  to = "/.netlify/functions/server"
  status = 200

[[redirects]]
  from = "/dashboard/*"
  to = "/.netlify/functions/server"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Serverless Function (`netlify/functions/server.ts`)
- Wraps Express app with `serverless-http`
- Handles basic health checks and API documentation
- Serves static files for `/admin` and `/webui` routes
- Implements SPA fallbacks

## Important Considerations

### ⚠️ WebSocket Limitations
WebSocket functionality is **not supported** in Netlify Functions due to their stateless nature. The application will need to:
1. Use polling instead of WebSocket for real-time features
2. Integrate with a third-party WebSocket service (Pusher, Ably, etc.)
3. Disable real-time features in Netlify deployment

### Database Considerations
- SQLite database will not work in serverless environment
- Consider using Netlify's serverless database options or external database services

### File Uploads
- File uploads may have limitations in serverless functions
- Consider using Netlify's large media handling or external storage services

## Testing the Deployment

After deployment, test these endpoints:
- `https://your-domain.netlify.app/` - Should serve React app
- `https://your-domain.netlify.app/health` - Should return health status
- `https://your-domain.netlify.app/api` - Should return API documentation
- `https://your-domain.netlify.app/webui/` - Should serve WebUI interface
- `https://your-domain.netlify.app/admin/` - Should serve admin interface

## Troubleshooting

### Common Issues
1. **Function not found**: Ensure build process completed successfully
2. **Static assets 404**: Check that publish directory is correct
3. **API routes 404**: Verify redirects in `netlify.toml` are correct
4. **CORS errors**: Ensure `CORS_ORIGIN` is set correctly in environment variables

### Debugging
- Check Netlify function logs in the dashboard
- Use `netlify functions:serve` locally for testing
- Verify build output structure matches expectations

### Build Verification
Run the test script to verify your build:
```bash
./scripts/test-netlify-build.sh
```

## Next Steps
1. Test deployment thoroughly
2. Implement WebSocket alternatives if needed
3. Set up monitoring and error tracking
4. Configure custom domain if needed
5. Set up automated deployments from Git

## File Structure After Build
```
dist/
├── client/                 # Frontend assets (published)
│   ├── index.html
│   ├── assets/
│   └── vite.svg
├── netlify/
│   └── functions/
│       └── server.js     # Serverless function
└── src/                  # Compiled backend
    └── ...
```

## Environment Variables Reference
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://your-domain.netlify.app` |
| `PORT` | Server port (for local testing) | `3000` |

## Support
For issues with the Netlify deployment:
1. Check the Netlify documentation: https://docs.netlify.com/
2. Review function logs in the Netlify dashboard
3. Test locally using `netlify dev`