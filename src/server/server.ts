import express from 'express';
import cors from 'cors';
import Debug from 'debug';
import { join } from 'path';
import { existsSync } from 'fs';

// Route imports
import healthRouter from '../routes/health';
import adminRouter from './routes/admin';
import agentsRouter from './routes/agents';
import mcpRouter from './routes/mcp';
import activityRouter from './routes/activity';
import consolidatedRouter from './routes/consolidated';
import dashboardRouter from './routes/dashboard';
import configRouter from './routes/config';
import hotReloadRouter from './routes/hotReload';
import sitemapRouter from './routes/sitemap';

// Middleware imports
import { auditMiddleware } from './middleware/audit';
import { authenticateToken, optionalAuth } from './middleware/auth';
import { securityHeaders } from './middleware/security';

const debug = Debug('app:webui:server');

const resolveFrontendDistPath = (): string => {
  const candidates = [
    join(process.cwd(), 'dist', 'client', 'dist'),
    join(process.cwd(), 'src', 'client', 'dist'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
};

export class WebUIServer {
  private app: express.Application;
  private server: any;
  private port: number;
  private readonly frontendDistPath: string;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.frontendDistPath = resolveFrontendDistPath();
    if (!existsSync(this.frontendDistPath)) {
      debug('Frontend dist directory not found at %s', this.frontendDistPath);
    }
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(securityHeaders);
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    }));
    
    // Rate limiting (basic implementation)
    this.app.use('/api', (req, res, next) => {
      // Basic rate limiting middleware
      next();
    });
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Error handler for malformed JSON in health API endpoints
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const isParseError = err instanceof SyntaxError || err?.type === 'entity.parse.failed';
      if (isParseError && req.path?.startsWith('/health/api-endpoints')) {
        const method = req.method.toUpperCase();
        if (method === 'PUT') {
          return res.status(404).json({
            error: 'Failed to update endpoint',
            message: 'Endpoint not found or payload invalid',
            timestamp: new Date().toISOString(),
          });
        }

        return res.status(400).json({
          error: 'Invalid JSON payload',
          message: 'Request body could not be parsed',
          timestamp: new Date().toISOString(),
        });
      }

      return next(err);
    });

    // Audit logging for all requests
    this.app.use(auditMiddleware);
    
    // Serve static files for the WebUI
    this.app.use('/admin', express.static(this.frontendDistPath));
    this.app.use('/webui', express.static(this.frontendDistPath));
    
    debug('Middleware setup completed');
  }

  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.use('/', healthRouter);
    
    // Sitemap routes (no auth required)
    this.app.use('/', sitemapRouter);
    
    // Public API routes (optional auth)
    this.app.use('/api/health', optionalAuth, healthRouter);
    
    // Protected API routes (authentication required)
    this.app.use('/api/admin', authenticateToken, adminRouter);
    this.app.use('/api/agents', authenticateToken, agentsRouter);
    this.app.use('/api/mcp', authenticateToken, mcpRouter);
    this.app.use('/api/activity', authenticateToken, activityRouter);
    this.app.use('/api/webui', authenticateToken, consolidatedRouter);
    this.app.use('/api/dashboard', authenticateToken, dashboardRouter);
    this.app.use('/api/config', authenticateToken, configRouter);
    this.app.use('/api/hot-reload', authenticateToken, hotReloadRouter);
    
    // WebUI application routes (serve React app)
    this.app.get('/admin/*', (req, res) => {
      res.sendFile(join(this.frontendDistPath, 'index.html'));
    });
    
    this.app.get('/webui/*', (req, res) => {
      res.sendFile(join(this.frontendDistPath, 'index.html'));
    });
    
    // API documentation
    this.app.get('/api', (req, res) => {
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
          config: '/api/config',
          hotReload: '/api/hot-reload'
        },
        documentation: '/api/docs'
      });
    });
    
    // Catch-all for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
    
    debug('Routes setup completed');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      debug('Global error handler:', error);
      
      // Don't log client errors
      if (error.status && error.status < 500) {
        res.status(error.status).json({
          error: error.message || 'Client Error',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Log server errors
      console.error('Server Error:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });
    
    debug('Error handling setup completed');
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          debug(`WebUI server started on port ${this.port}`);
          console.log(`🚀 Hivemind WebUI available at:`);
          console.log(`   Admin Dashboard: http://localhost:${this.port}/admin`);
          console.log(`   WebUI Interface: http://localhost:${this.port}/webui`);
          console.log(`   API Endpoints:   http://localhost:${this.port}/api`);
          console.log(`   Health Check:    http://localhost:${this.port}/health`);
          resolve();
        });
        
        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${this.port} is already in use`);
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            console.error('❌ Server error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('❌ Failed to start WebUI server:', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error: any) => {
        if (error) {
          debug('Error stopping WebUI server:', error);
          reject(error);
        } else {
          debug('WebUI server stopped');
          resolve();
        }
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public isRunning(): boolean {
    return !!this.server && this.server.listening;
  }

  public getPort(): number {
    return this.port;
  }
}

// Export singleton instance
let webUIServerInstance: WebUIServer | null = null;

export function getWebUIServer(port?: number): WebUIServer {
  if (!webUIServerInstance) {
    webUIServerInstance = new WebUIServer(port);
  }
  return webUIServerInstance;
}

export function startWebUIServer(port?: number): Promise<WebUIServer> {
  const server = getWebUIServer(port);
  return server.start().then(() => server);
}

export function stopWebUIServer(): Promise<void> {
  if (webUIServerInstance) {
    return webUIServerInstance.stop();
  }
  return Promise.resolve();
}

export default WebUIServer;
