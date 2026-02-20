# Netlify Deployment Plan for Open Hivemind

## Overview
This document outlines the plan to deploy the Open Hivemind application to Netlify. The application uses a unified server architecture where the Express backend serves the React/Vite frontend.

## Implementation Status: ✅ COMPLETED

All necessary files have been created and configured for Netlify deployment.

## Files Created/Modified

### 1. `netlify/functions/server.ts` ✅
- Created a standalone serverless function handler
- Uses `serverless-http` to wrap the Express application
- Includes basic health check and API documentation endpoints
- Handles static file serving for frontend assets
- Implements SPA fallbacks for React routing

### 2. `netlify.toml` ✅
- Configured build command: `npm run build:netlify`
- Set functions directory to `dist/netlify/functions`
- Set publish directory to `dist/client`
- Added redirects for all API routes to the serverless function
- Added SPA fallback for all other routes

### 3. `package.json` ✅
- Added `serverless-http` dependency
- Added `build:netlify` script that:
  - Builds the backend
  - Builds the frontend
  - Copies frontend assets to `dist/client`
  - Compiles the serverless function to `dist/netlify/functions`

### 4. `scripts/test-netlify-build.sh` ✅
- Created test script to verify build process
- Checks for frontend assets and serverless function
- Validates deployment readiness

## Deployment Instructions

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build for Netlify
```bash
npm run build:netlify
```

### Step 3: Deploy to Netlify
Option A: Using Netlify CLI
```bash
netlify deploy --prod --dir=dist/client/dist --functions=dist
```

Option B: Using Git (recommended)
1. Push your code to a Git repository
2. Connect your repository to Netlify
3. Netlify will automatically detect the `netlify.toml` and use the build configuration

### Step 4: Configure Environment Variables
In the Netlify dashboard, configure these environment variables:
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-domain.netlify.app`
- Any other required API keys or configuration values

## Architecture Overview

### Build Process
1. `build:backend` compiles TypeScript to `dist/src/`
2. `build:frontend` builds React app to `dist/client/dist/`
3. Serverless function compiles to `dist/netlify/functions/server.js`

### Runtime Architecture
- Static assets served directly from `dist/client/dist/`
- All API requests (`/api/*`, `/webui/*`, `/health/*`, `/dashboard/*`) routed to serverless function
- SPA fallback ensures React Router works correctly

## Important Considerations

### WebSocket Limitations
⚠️ **Important**: WebSocket functionality is not supported in Netlify Functions due to their stateless nature. The application will need to:
1. Use polling instead of WebSocket for real-time features
2. Or integrate with a third-party WebSocket service (Pusher, Ably, etc.)
3. Or disable real-time features in the Netlify deployment

### Database Considerations
- SQLite database will not work in serverless environment
- Consider using Netlify's serverless database options or external database services

### File Uploads
- File uploads may have limitations in serverless functions
- Consider using Netlify's large media handling or external storage services

## Testing the Deployment

After deployment, test these endpoints:
- `https://your-domain.netlify.app/` - Should serve the React app
- `https://your-domain.netlify.app/api/health` - Should return health status
- `https://your-domain.netlify.app/webui/` - Should serve the WebUI interface
- `https://your-domain.netlify.app/admin/` - Should serve the admin interface

## Troubleshooting

### Common Issues
1. **Function not found**: Ensure the build process completed successfully
2. **Static assets 404**: Check that the publish directory is correct
3. **API routes 404**: Verify redirects in `netlify.toml` are correct
4. **CORS errors**: Ensure `CORS_ORIGIN` is set correctly in environment variables

### Debugging
- Check Netlify function logs in the dashboard
- Use `netlify functions:serve` locally for testing
- Verify the build output structure matches expectations

## Next Steps
1. Test the deployment thoroughly
2. Implement WebSocket alternatives if needed
3. Set up monitoring and error tracking
4. Configure custom domain if needed
5. Set up automated deployments from Git