import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import Debug from 'debug';

const debug = Debug('app:WebSocketService');

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private connectedClients = 0;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/webui/socket.io'
    });

    this.setupEventHandlers();
    this.startMetricsCollection();
    debug('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      this.connectedClients++;
      debug(`Client connected. Total clients: ${this.connectedClients}`);

      // Send initial data
      this.sendBotStatus(socket);
      this.sendSystemMetrics(socket);

      socket.on('request_bot_status', () => {
        this.sendBotStatus(socket);
      });

      socket.on('request_system_metrics', () => {
        this.sendSystemMetrics(socket);
      });

      socket.on('request_config_validation', () => {
        this.sendConfigValidation(socket);
      });

      socket.on('disconnect', () => {
        this.connectedClients--;
        debug(`Client disconnected. Total clients: ${this.connectedClients}`);
      });
    });
  }

  private startMetricsCollection(): void {
    // Send updates every 5 seconds to connected clients
    this.metricsInterval = setInterval(() => {
      if (this.connectedClients > 0) {
        this.broadcastBotStatus();
        this.broadcastSystemMetrics();
      }
    }, 5000);
  }

  private sendBotStatus(socket: any): void {
    try {
      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();
      
      const status = bots.map(bot => ({
        name: bot.name,
        provider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        status: 'active', // TODO: Implement real status checking
        lastSeen: new Date().toISOString(),
        capabilities: {
          voiceSupport: !!bot.discord?.voiceChannelId,
          multiChannel: bot.messageProvider === 'slack' && !!bot.slack?.joinChannels,
          hasSecrets: !!(bot.discord?.token || bot.slack?.botToken || bot.openai?.apiKey)
        }
      }));

      socket.emit('bot_status_update', {
        bots: status,
        timestamp: new Date().toISOString(),
        total: bots.length,
        active: bots.length
      });
    } catch (error) {
      debug('Error sending bot status:', error);
      socket.emit('error', { message: 'Failed to get bot status' });
    }
  }

  private sendSystemMetrics(socket: any): void {
    try {
      const memUsage = process.memoryUsage();
      const metrics = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024), // MB
          rss: Math.round(memUsage.rss / 1024 / 1024) // MB
        },
        cpu: {
          usage: process.cpuUsage()
        },
        connectedClients: this.connectedClients,
        timestamp: new Date().toISOString()
      };

      socket.emit('system_metrics_update', metrics);
    } catch (error) {
      debug('Error sending system metrics:', error);
      socket.emit('error', { message: 'Failed to get system metrics' });
    }
  }

  private sendConfigValidation(socket: any): void {
    try {
      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();
      const warnings = manager.getWarnings();
      
      const validation = {
        isValid: warnings.length === 0,
        warnings,
        botCount: bots.length,
        missingConfigs: this.findMissingConfigurations(bots),
        recommendations: this.generateRecommendations(bots),
        timestamp: new Date().toISOString()
      };

      socket.emit('config_validation_update', validation);
    } catch (error) {
      debug('Error sending config validation:', error);
      socket.emit('error', { message: 'Failed to validate configuration' });
    }
  }

  private findMissingConfigurations(bots: any[]): string[] {
    const missing: string[] = [];
    
    bots.forEach(bot => {
      if (bot.messageProvider === 'discord' && !bot.discord?.token) {
        missing.push(`${bot.name}: Missing Discord bot token`);
      }
      if (bot.messageProvider === 'slack' && !bot.slack?.botToken) {
        missing.push(`${bot.name}: Missing Slack bot token`);
      }
      if (bot.llmProvider === 'openai' && !bot.openai?.apiKey) {
        missing.push(`${bot.name}: Missing OpenAI API key`);
      }
      if (bot.llmProvider === 'flowise' && !bot.flowise?.apiKey) {
        missing.push(`${bot.name}: Missing Flowise API key`);
      }
    });

    return missing;
  }

  private generateRecommendations(bots: any[]): string[] {
    const recommendations: string[] = [];
    
    if (bots.length === 0) {
      recommendations.push('No bots configured. Add at least one bot to get started.');
    }
    
    const providers = new Set(bots.map(b => b.messageProvider));
    if (providers.size === 1 && providers.has('discord')) {
      recommendations.push('Consider adding Slack integration for broader platform support.');
    }
    
    const llmProviders = new Set(bots.map(b => b.llmProvider));
    if (llmProviders.size === 1) {
      recommendations.push('Consider configuring multiple LLM providers for redundancy.');
    }

    return recommendations;
  }

  private broadcastBotStatus(): void {
    if (!this.io) return;
    this.io.emit('bot_status_broadcast', { timestamp: new Date().toISOString() });
  }

  private broadcastSystemMetrics(): void {
    if (!this.io) return;
    this.io.sockets.sockets.forEach(socket => {
      this.sendSystemMetrics(socket);
    });
  }

  public broadcastConfigChange(): void {
    if (!this.io) return;
    debug('Broadcasting configuration change');
    this.io.emit('config_changed', { timestamp: new Date().toISOString() });
    
    // Send updated data to all clients
    this.io.sockets.sockets.forEach(socket => {
      this.sendBotStatus(socket);
      this.sendConfigValidation(socket);
    });
  }

  public shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    
    debug('WebSocket service shut down');
  }
}

export default WebSocketService;