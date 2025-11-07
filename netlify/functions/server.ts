import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { join } from 'path';

// Create Express app
const app = express();

// Set up middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Resolve frontend path for Netlify
const frontendDistPath = join(process.cwd(), 'dist', 'client', 'dist');

// Serve static files
app.use('/admin', express.static(frontendDistPath));
app.use('/webui', express.static(frontendDistPath));

// Health check route (must be before wildcard)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Hivemind WebUI API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      admin: '/api/admin',
      agents: '/api/agents',
      mcp: '/api/mcp',
      activity: '/api/activity',
      webui: '/api/webui',
      dashboard: '/api/dashboard',
      config: '/api/config'
    },
    documentation: '/api/docs'
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// SPA fallbacks
app.get('/admin/*', (req, res) => {
  res.sendFile(join(frontendDistPath, 'index.html'));
});

app.get('/webui/*', (req, res) => {
  res.sendFile(join(frontendDistPath, 'index.html'));
});

// API fallback - return 404 for unknown API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Root fallback
app.get('*', (req, res) => {
  res.sendFile(join(frontendDistPath, 'index.html'));
});

// Export handler for Netlify Functions
export const handler = serverless(app);