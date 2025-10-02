import express from 'express';
import cors from 'cors';
import Debug from 'debug';
import { join } from 'path';
import { existsSync } from 'fs';
import * as vite from 'vite';
// import * as viteExpress from 'vite-express';

// Route imports
import healthRouter from '../routes/health';
// import adminRouter from './routes/admin';
// import agentsRouter from './routes/agents';
// import mcpRouter from './routes/mcp';
// import activityRouter from './routes/activity';
// import consolidatedRouter from './routes/consolidated';
import dashboardRouter from './routes/dashboard';
// import configRouter from './routes/config';
// import hotReloadRouter from './routes/hotReload';
import sitemapRouter from './routes/sitemap';
import authRouter from './routes/auth';
import AdminAuthManager from './auth/adminAuth';

// Middleware imports
import { auditMiddleware } from './middleware/audit';
import { optionalAuth } from './middleware/auth';
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
  private viteServer?: vite.ViteDevServer;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.frontendDistPath = resolveFrontendDistPath();
    if (!existsSync(this.frontendDistPath)) {
      debug('Frontend dist directory not found at %s', this.frontendDistPath);
    }
  }

  private async initialize(): Promise<void> {
    await this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private async setupMiddleware(): Promise<void> {
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

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      debug('Using Vite dev server middleware');
      try {
        this.viteServer = await vite.createServer({
          server: { middlewareMode: true },
          appType: 'custom',
          root: join(process.cwd(), 'webui', 'client'),
        });
        debug('Vite server created successfully');
        this.app.use(this.viteServer.middlewares);
        debug('Vite middlewares added to Express app');
      } catch (error) {
        debug('Failed to create Vite server:', error);
        throw error;
      }
    } else {
      // Serve static files for the WebUI in production
      this.app.use('/admin', express.static(this.frontendDistPath));
      this.app.use('/dashboard', express.static(this.frontendDistPath));
      this.app.use('/webui', express.static(this.frontendDistPath));
      this.app.use(express.static(this.frontendDistPath));
    }
    
    debug('Middleware setup completed');
  }

  private setupRoutes(): void {
    // Initialize admin auth on startup
    AdminAuthManager.getInstance();

    // Add a route for the root path to serve the web page
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
      // In production, serve the frontend at root
      this.app.get('/', (req, res) => {
        const indexPath = join(this.frontendDistPath, 'index.html');
        if (existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).send('Frontend app build not found');
        }
      });
    }

    // Health check (no auth required) - mounted at root for health endpoints
    this.app.use('/', healthRouter);

    // Sitemap routes (no auth required)
    this.app.use('/', sitemapRouter);
    
    // Auth routes
    this.app.use('/api/auth', authRouter);

    // Public API routes (optional auth)
    // this.app.use('/api/health', optionalAuth, healthRouter);

    // Protected API routes (authentication required)
    // this.app.use('/api/admin', authenticateToken, adminRouter);
    // this.app.use('/api/agents', authenticateToken, agentsRouter);
    // this.app.use('/api/mcp', authenticateToken, mcpRouter);
    // this.app.use('/api/activity', authenticateToken, activityRouter);
    // this.app.use('/api/webui', authenticateToken, consolidatedRouter);
    this.app.use('/dashboard', optionalAuth, dashboardRouter);
    // this.app.use('/api/config', authenticateToken, configRouter);
    // this.app.use('/api/hot-reload', authenticateToken, hotReloadRouter);

    if (!isDevelopment) {
      // WebUI application routes (serve React app) - only in production
      this.app.get(['/admin', '/admin/*'], (req, res) => {
        res.sendFile(join(this.frontendDistPath, 'index.html'));
      });

      this.app.get(['/dashboard', '/dashboard/*'], (req, res) => {
        res.sendFile(join(this.frontendDistPath, 'index.html'));
      });

      this.app.get('/webui/*', (req, res) => {
        res.sendFile(join(this.frontendDistPath, 'index.html'));
      });
    }

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
          dashboard: '/dashboard',
          config: '/api/config',
          hotReload: '/api/hot-reload'
        },
        documentation: '/api/docs'
      });
    });

    // Catch-all for undefined routes - serve React app for all non-API routes
    this.app.get('*', (req, res, next) => {
      const path = req.path;
      if (path.match(/^\/(api|health|sitemap)/)) {
        res.status(404).json({
          error: 'Not Found',
          message: `Route ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        });
      } else {
        if (isDevelopment) {
          // In development, Vite middleware should handle everything.
          // If we get here, it means Vite didn't find a file.
          // This is expected for client-side routing, so we let it fall through
          // to the Vite middleware which will serve index.html.
          next();
        } else {
          // In production, serve the built index.html
          const indexPath = join(this.frontendDistPath, 'index.html');
          if (existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(500).send('React app build not found');
          }
        }
      }
    });
    
    debug('Routes setup completed');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
    await this.initialize();

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
    return new Promise(async (resolve, reject) => {
      try {
        // Close Vite server if it exists
        if (this.viteServer) {
          await this.viteServer.close();
          debug('Vite server stopped');
        }

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
      } catch (error) {
        debug('Error during server shutdown:', error);
        reject(error);
      }
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
