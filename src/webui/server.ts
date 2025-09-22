import express from 'express';
import cors from 'cors';
import Debug from 'debug';
import { join } from 'path';

// Route imports
import healthRouter from '../routes/health';
import adminRouter from './routes/admin';
import agentsRouter from './routes/agents';
import mcpRouter from './routes/mcp';
import activityRouter from './routes/activity';
import consolidatedRouter from './routes/consolidated';
import dashboardRouter from './routes/dashboard';
import configRouter from './routes/config';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import fs from 'fs';
import path from 'path';
import { redactSensitiveInfo } from '../common/redactSensitiveInfo';
import hotReloadRouter from './routes/hotReload';

// Middleware imports
import { auditMiddleware } from './middleware/audit';
import { authenticateToken, optionalAuth } from './middleware/auth';
import { securityHeaders } from './middleware/security';

const debug = Debug('app:webui:server');

export class WebUIServer {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
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
    const webUIPath = join(__dirname, '../../frontend');
    this.app.use('/admin', express.static(webUIPath));
    this.app.use('/webui', express.static(webUIPath));
    
    debug('Middleware setup completed');
  }

  private setupRoutes(): void {
    // Serve dashboard at root
    this.app.get('/', (req, res) => {
      res.sendFile(join(__dirname, 'views/react-dashboard.html'));
    });

    // Health check (no auth required)
    this.app.use('/', healthRouter);
    
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
    this.app.patch('/api/config/:botName', authenticateToken, this.handleConfigUpdate.bind(this));
    this.app.use('/api/hot-reload', authenticateToken, hotReloadRouter);
    
    // WebUI application routes (serve React app)
    this.app.get('/admin/*', (req, res) => {
      res.sendFile(join(__dirname, '../../frontend/index.html'));
    });
    
    this.app.get('/webui/*', (req, res) => {
      res.sendFile(join(__dirname, '../../frontend/index.html'));
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

  private async handleConfigUpdate(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    try {
      const configManager = BotConfigurationManager.getInstance();
      const botName = req.params.botName as string;
      const currentBot = configManager.getBot(botName);

      if (!currentBot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      const updates = req.body;

      if (typeof updates !== 'object' || updates === null) {
        res.status(400).json({ error: 'Invalid updates format' });
        return;
      }

      // Deep merge for validation
      const mergedConfig = this.deepMerge(currentBot, updates);
      const validation = configManager.validateConfiguration(mergedConfig);

      if (!validation.isValid) {
        res.status(400).json({
          error: 'Invalid configuration',
          details: validation.errors
        });
        return;
      }

      // Map to flat schema keys
      const flatUpdates = this.mapToFlat(updates);

      if (Object.keys(flatUpdates).length === 0) {
        res.status(400).json({ error: 'No valid updates provided' });
        return;
      }

      // Get config path
      const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
      const botConfigPath = path.join(configDir, 'bots', `${botName}.json`);

      // Load current file
      let currentFile: Record<string, any> = {};
      let previousContent: string | null = null;

      if (fs.existsSync(botConfigPath)) {
        try {
          const fileContent = fs.readFileSync(botConfigPath, 'utf8');
          currentFile = JSON.parse(fileContent);
          previousContent = fileContent;
        } catch (parseError) {
          res.status(500).json({ error: 'Failed to read current config file' });
          return;
        }
      } else {
        previousContent = null;
      }

      // Merge updates
      const newFile = { ...currentFile, ...flatUpdates };

      // Apply changes
      try {
        fs.writeFileSync(botConfigPath, JSON.stringify(newFile, null, 2));

        // Reload configuration
        configManager.reload();

        // Verify
        const updatedBot = configManager.getBot(botName);
        if (!updatedBot) {
          throw new Error('Bot configuration not found after reload');
        }

        const postValidation = configManager.validateConfiguration(updatedBot);
        if (!postValidation.isValid) {
          throw new Error(`Post-apply validation failed: ${postValidation.errors.join(', ')}`);
        }

        // Redact and return
        const redacted = this.redactConfig(updatedBot);
        res.json({
          success: true,
          message: 'Configuration updated successfully',
          updatedConfig: redacted
        });
      } catch (applyError) {
        // Rollback
        if (previousContent !== null) {
          try {
            fs.writeFileSync(botConfigPath, previousContent);
            configManager.reload();
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }

        res.status(500).json({
          error: 'Failed to apply configuration updates',
          message: applyError instanceof Error ? applyError.message : 'Unknown error'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  private deepMerge(target: any, source: any): any {
    const output = JSON.parse(JSON.stringify(target)); // deep copy

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = this.deepMerge(output[key] || {}, value);
      } else {
        output[key] = value;
      }
    }
    return output;
  }

  private mapToFlat(updates: any): Record<string, any> {
    const flat: Record<string, any> = {};

    // Top level fields
    if (updates.messageProvider !== undefined) flat.MESSAGE_PROVIDER = updates.messageProvider;
    if (updates.llmProvider !== undefined) flat.LLM_PROVIDER = updates.llmProvider;
    if (updates.persona !== undefined) flat.PERSONA = updates.persona;
    if (updates.systemInstruction !== undefined) flat.SYSTEM_INSTRUCTION = updates.systemInstruction;
    if (updates.mcpServers !== undefined) flat.MCP_SERVERS = updates.mcpServers;
    if (updates.mcpGuard !== undefined) flat.MCP_GUARD = updates.mcpGuard;

    // Discord
    if (updates.discord) {
      if ('token' in updates.discord) flat.DISCORD_BOT_TOKEN = updates.discord.token;
      if ('clientId' in updates.discord) flat.DISCORD_CLIENT_ID = updates.discord.clientId;
      if ('guildId' in updates.discord) flat.DISCORD_GUILD_ID = updates.discord.guildId;
      if ('channelId' in updates.discord) flat.DISCORD_CHANNEL_ID = updates.discord.channelId;
      if ('voiceChannelId' in updates.discord) flat.DISCORD_VOICE_CHANNEL_ID = updates.discord.voiceChannelId;
    }

    // Slack
    if (updates.slack) {
      if ('botToken' in updates.slack) flat.SLACK_BOT_TOKEN = updates.slack.botToken;
      if ('appToken' in updates.slack) flat.SLACK_APP_TOKEN = updates.slack.appToken;
      if ('signingSecret' in updates.slack) flat.SLACK_SIGNING_SECRET = updates.slack.signingSecret;
      if ('joinChannels' in updates.slack) flat.SLACK_JOIN_CHANNELS = updates.slack.joinChannels;
      if ('defaultChannelId' in updates.slack) flat.SLACK_DEFAULT_CHANNEL_ID = updates.slack.defaultChannelId;
      if ('mode' in updates.slack) flat.SLACK_MODE = updates.slack.mode;
    }

    // Mattermost
    if (updates.mattermost) {
      if ('serverUrl' in updates.mattermost) flat.MATTERMOST_SERVER_URL = updates.mattermost.serverUrl;
      if ('token' in updates.mattermost) flat.MATTERMOST_TOKEN = updates.mattermost.token;
      if ('channel' in updates.mattermost) flat.MATTERMOST_CHANNEL = updates.mattermost.channel;
    }

    // OpenAI
    if (updates.openai) {
      if ('apiKey' in updates.openai) flat.OPENAI_API_KEY = updates.openai.apiKey;
      if ('model' in updates.openai) flat.OPENAI_MODEL = updates.openai.model;
      if ('baseUrl' in updates.openai) flat.OPENAI_BASE_URL = updates.openai.baseUrl;
    }

    // Flowise
    if (updates.flowise) {
      if ('apiKey' in updates.flowise) flat.FLOWISE_API_KEY = updates.flowise.apiKey;
      if ('apiBaseUrl' in updates.flowise) flat.FLOWISE_API_BASE_URL = updates.flowise.apiBaseUrl;
    }

    // OpenWebUI
    if (updates.openwebui) {
      if ('apiKey' in updates.openwebui) flat.OPENWEBUI_API_KEY = updates.openwebui.apiKey;
      if ('apiUrl' in updates.openwebui) flat.OPENWEBUI_API_URL = updates.openwebui.apiUrl;
    }

    // OpenSwarm
    if (updates.openswarm) {
      if ('baseUrl' in updates.openswarm) flat.OPENSWARM_BASE_URL = updates.openswarm.baseUrl;
      if ('apiKey' in updates.openswarm) flat.OPENSWARM_API_KEY = updates.openswarm.apiKey;
      if ('team' in updates.openswarm) flat.OPENSWARM_TEAM = updates.openswarm.team;
    }

    return flat;
  }

  private redactConfig(obj: any, currentKey: string = ''): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj !== 'object') {
      return redactSensitiveInfo(currentKey, obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.redactConfig(item, `${currentKey}[${index}]`));
    }

    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = currentKey ? `${currentKey}.${key}` : key;
      redacted[key] = this.redactConfig(value, newKey);
    }
    return redacted;
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
