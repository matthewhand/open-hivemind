import type { Server as HttpServer } from 'http';
import os from 'os';
import Debug from 'debug';
import { Server as SocketIOServer } from 'socket.io';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import ApiMonitorService, { type EndpointStatus } from '../../services/ApiMonitorService';
import { ActivityLogger } from './ActivityLogger';
import { BotMetricsService } from './BotMetricsService';

const debug = Debug('app:WebSocketService');

export interface MessageFlowEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

export interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  messageRate: number;
  errorRate: number;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  title: string;
  message: string;
  botName?: string;
  channelId?: string;
  metadata?: Record<string, any>;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private connectedClients = 0;

  // Real-time monitoring data
  private messageFlow: MessageFlowEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private alerts: AlertEvent[] = [];
  private messageRateHistory: number[] = [];
  private errorRateHistory: number[] = [];
  // internal sampling state
  private lastCpuUsage = process.cpuUsage();
  private lastHrTime = process.hrtime.bigint();
  // per-bot stats
  private botErrors = new Map<string, string[]>();
  // API monitoring
  private apiMonitorService: ApiMonitorService;

  private constructor() {
    this.initializeMonitoringData();
    this.apiMonitorService = ApiMonitorService.getInstance();
    this.setupApiMonitoring();
  }

  private initializeMonitoringData(): void {
    // Initialize with empty arrays and default metrics
    this.messageFlow = [];
    this.performanceMetrics = [];
    this.alerts = [];
    this.messageRateHistory = new Array(60).fill(0); // 60 data points for 5-minute history
    this.errorRateHistory = new Array(60).fill(0);
  }

  private setupApiMonitoring(): void {
    // Listen for API monitoring events
    this.apiMonitorService.on('statusUpdate', (status: EndpointStatus) => {
      this.handleApiStatusUpdate(status);
    });

    this.apiMonitorService.on('healthCheckResult', (result) => {
      this.handleApiHealthCheckResult(result);
    });

    // Start monitoring all configured endpoints
    this.apiMonitorService.startAllMonitoring();
  }

  private handleApiStatusUpdate(status: EndpointStatus): void {
    debug(`API endpoint status update: ${status.name} - ${status.status}`);

    // Broadcast to connected clients
    if (this.io && this.connectedClients > 0) {
      this.io.emit('api_status_update', {
        endpoint: status,
        timestamp: new Date().toISOString(),
      });
    }

    // Create alert for status changes
    if (status.status === 'error' || status.status === 'offline') {
      this.recordAlert({
        level: status.status === 'error' ? 'error' : 'warning',
        title: `API Endpoint ${status.status.toUpperCase()}`,
        message: `${status.name} is ${status.status}: ${status.errorMessage || 'No response'}`,
        metadata: {
          endpointId: status.id,
          url: status.url,
          responseTime: status.responseTime,
          consecutiveFailures: status.consecutiveFailures,
        },
      });
    }
  }

  private handleApiHealthCheckResult(result: any): void {
    debug(
      `API health check result: ${result.endpointId} - ${result.success ? 'success' : 'failed'}`
    );

    // Broadcast health check results to connected clients
    if (this.io && this.connectedClients > 0) {
      this.io.emit('api_health_check_result', {
        result,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Public methods for external components to report events
  public recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): void {
    const messageEvent: MessageFlowEvent = {
      ...event,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.messageFlow.push(messageEvent);

    // Log to persistent storage
    ActivityLogger.getInstance().log(messageEvent);

    // Per-bot message count
    const key = event.botName || 'unknown';
    BotMetricsService.getInstance().incrementMessageCount(key);

    // Keep only last 1000 messages
    if (this.messageFlow.length > 1000) {
      this.messageFlow = this.messageFlow.slice(-1000);
    }

    // Update message rate
    this.updateMessageRate();

    // Broadcast to connected clients
    if (this.io && this.connectedClients > 0) {
      this.io.emit('message_flow_update', messageEvent);
    }
  }

  public recordAlert(
    alert: Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'>
  ): void {
    const alertEvent: AlertEvent = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'active',
    };

    this.alerts.push(alertEvent);

    // Per-bot error tracking (cap at 20 per bot)
    const key = alertEvent.botName || 'unknown';
    const list = this.botErrors.get(key) || [];
    list.push(`${alertEvent.level}: ${alertEvent.title}`);
    if (list.length > 20) {
      list.shift();
    }
    this.botErrors.set(key, list);

    // Keep only last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-500);
    }

    // Update error rate if this is an error
    if (alert.level === 'error' || alert.level === 'critical') {
      this.updateErrorRate();
      const key = alertEvent.botName || 'unknown';
      BotMetricsService.getInstance().incrementErrorCount(key);
    }

    // Broadcast to connected clients
    if (this.io && this.connectedClients > 0) {
      this.io.emit('alert_update', alertEvent);
    }
  }

  public getMessageFlow(limit = 100): MessageFlowEvent[] {
    return this.messageFlow.slice(-limit);
  }

  public getAlerts(limit = 50): AlertEvent[] {
    return this.alerts.slice(-limit);
  }

  public acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();

      // Broadcast to connected clients
      if (this.io && this.connectedClients > 0) {
        this.io.emit('alert_update', alert);
      }
      return true;
    }
    return false;
  }

  public resolveAlert(id: string): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();

      // Broadcast to connected clients
      if (this.io && this.connectedClients > 0) {
        this.io.emit('alert_update', alert);
      }
      return true;
    }
    return false;
  }

  public getPerformanceMetrics(limit = 60): PerformanceMetric[] {
    return this.performanceMetrics.slice(-limit);
  }

  public getMessageRateHistory(): number[] {
    return [...this.messageRateHistory];
  }

  public getErrorRateHistory(): number[] {
    return [...this.errorRateHistory];
  }

  public getBotStats(botName: string): {
    messageCount: number;
    errors: string[];
    errorCount: number;
  } {
    const metrics = BotMetricsService.getInstance().getMetrics(botName);
    return {
      messageCount: metrics.messageCount,
      errors: [...(this.botErrors.get(botName) || [])],
      errorCount: metrics.errorCount,
    };
  }

  // prettier-ignore
  public getAllBotStats(): Record<string, { messageCount: number; errors: string[]; errorCount: number }> {
    const metricsService = BotMetricsService.getInstance();
    const allMetrics = metricsService.getAllMetrics();
    const out: Record<string, { messageCount: number; errors: string[]; errorCount: number }> = {};

    // Merge in-memory errors with persistent metrics
    const botNames = new Set([...this.botErrors.keys(), ...Object.keys(allMetrics)]);

    for (const name of botNames) {
      const metrics = metricsService.getMetrics(name);
      out[name] = {
        messageCount: metrics.messageCount,
        errors: [...(this.botErrors.get(name) || [])],
        errorCount: metrics.errorCount,
      };
    }
    return out;
  }

  private updateMessageRate(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const recentMessages = this.messageFlow.filter(
      (event) => new Date(event.timestamp) > oneMinuteAgo
    );

    const currentRate = recentMessages.length;
    this.messageRateHistory.push(currentRate);
    this.messageRateHistory.shift(); // Remove oldest
  }

  private updateErrorRate(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const recentErrors = this.alerts.filter(
      (alert) =>
        (alert.level === 'error' || alert.level === 'critical') &&
        new Date(alert.timestamp) > oneMinuteAgo
    );

    const currentRate = recentErrors.length;
    this.errorRateHistory.push(currentRate);
    this.errorRateHistory.shift(); // Remove oldest
  }

  public initialize(server: HttpServer): void {
    try {
      debug('Initializing WebSocket service...');
      if (!server) {
        debug('ERROR: HTTP server is required for WebSocket initialization');
        throw new Error('HTTP server is required for WebSocket initialization');
      }

      this.io = new SocketIOServer(server, {
        path: '/webui/socket.io',
        cors: {
          origin: [
            /^https?:\/\/localhost(:\d+)?/,
            /^https?:\/\/127\.0\.0\.1(:\d+)?/,
            /^https:\/\/.*\.netlify\.app$/,
            /^https:\/\/.*\.netlify\.com$/,
            /^https:\/\/.*\.fly\.dev$/,
          ],
          methods: ['GET', 'POST'],
          credentials: true,
          allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'Cache-Control',
            'X-CSRF-Token',
          ],
        },
      });

      this.setupEventHandlers();
      this.startMetricsCollection();
      debug('WebSocket service initialized successfully with CORS enabled');
    } catch (error: any) {
      debug('CRITICAL: Failed to initialize WebSocket service:', {
        error: error.message,
        stack: error.stack,
        serverProvided: !!server,
      });
      throw new Error(`WebSocket service initialization failed: ${error.message}`);
    }
  }

  /**
   * Sets up WebSocket event handlers for client connections
   * Handles connection, disconnection, and various client requests
   */
  private setupEventHandlers(): void {
    if (!this.io) {
      return;
    }

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

      socket.on('request_message_flow', () => {
        this.sendMessageFlow(socket);
      });

      socket.on('request_alerts', () => {
        this.sendAlerts(socket);
      });

      socket.on('request_performance_metrics', () => {
        this.sendPerformanceMetrics(socket);
      });

      socket.on('request_monitoring_dashboard', () => {
        this.sendMonitoringDashboard(socket);
      });

      socket.on('request_api_status', () => {
        this.sendApiStatus(socket);
      });

      socket.on('request_api_endpoints', () => {
        this.sendApiEndpoints(socket);
      });

      socket.on('disconnect', () => {
        this.connectedClients--;
        debug(`Client disconnected. Total clients: ${this.connectedClients}`);
        // Clean up event listeners to prevent memory leaks
        socket.removeAllListeners();
      });
    });
  }

  /**
   * Starts periodic metrics collection and broadcasting
   * Sends bot status and system metrics updates every 5 seconds to connected clients
   */
  private startMetricsCollection(): void {
    // Send updates every 5 seconds to connected clients
    this.metricsInterval = setInterval(() => {
      if (this.connectedClients > 0) {
        this.broadcastBotStatus();
        this.broadcastSystemMetrics();
        this.broadcastMonitoringData();
      }
    }, 5000);
  }

  private broadcastMonitoringData(): void {
    if (!this.io) {
      return;
    }

    // Broadcast message flow updates
    if (this.messageFlow.length > 0) {
      this.io.emit('message_flow_broadcast', {
        latest: this.messageFlow.slice(-5), // Last 5 messages
        total: this.messageFlow.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Broadcast alert updates
    if (this.alerts.length > 0) {
      const recentAlerts = this.alerts.filter(
        (alert) => new Date(alert.timestamp) > new Date(Date.now() - 30000) // Last 30 seconds
      );
      if (recentAlerts.length > 0) {
        this.io.emit('alerts_broadcast', {
          alerts: recentAlerts,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Broadcast performance metrics
    this.io.emit('performance_metrics_broadcast', {
      current: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
        errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
        activeConnections: this.connectedClients,
      },
      timestamp: new Date().toISOString(),
    });

    // Broadcast compact per-bot stats (message counts and error counts)
    try {
      const statsObj = this.getAllBotStats();
      const stats = Object.entries(statsObj).map(([name, s]) => ({
        name,
        messageCount: s.messageCount,
        errorCount: s.errorCount,
      }));
      this.io.emit('bot_stats_broadcast', {
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  private sendBotStatus(socket: any): void {
    try {
      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();

      const status = bots.map((bot) => {
        const hasProviderSecret = !!(
          bot.discord?.token ||
          bot.slack?.botToken ||
          bot.mattermost?.token
        );
        const botStatus = hasProviderSecret ? 'active' : 'inactive';
        return {
          name: bot.name,
          provider: bot.messageProvider,
          llmProvider: bot.llmProvider,
          status: botStatus,
          lastSeen: new Date().toISOString(),
          capabilities: {
            voiceSupport: !!bot.discord?.voiceChannelId,
            multiChannel: bot.messageProvider === 'slack' && !!bot.slack?.joinChannels,
            hasSecrets: !!(bot.discord?.token || bot.slack?.botToken || bot.openai?.apiKey),
          },
        };
      });

      socket.emit('bot_status_update', {
        bots: status,
        timestamp: new Date().toISOString(),
        total: bots.length,
        active: status.filter((s) => s.status === 'active').length,
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
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        connectedClients: this.connectedClients,
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      };

      socket.emit('config_validation_update', validation);
    } catch (error) {
      debug('Error sending config validation:', error);
      socket.emit('error', { message: 'Failed to validate configuration' });
    }
  }

  private findMissingConfigurations(bots: any[]): string[] {
    const missing: string[] = [];

    bots.forEach((bot) => {
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

    const providers = new Set(bots.map((b) => b.messageProvider));
    if (providers.size === 1 && providers.has('discord')) {
      recommendations.push('Consider adding Slack integration for broader platform support.');
    }

    const llmProviders = new Set(bots.map((b) => b.llmProvider));
    if (llmProviders.size === 1) {
      recommendations.push('Consider configuring multiple LLM providers for redundancy.');
    }

    return recommendations;
  }

  private broadcastBotStatus(): void {
    if (!this.io) {
      return;
    }
    this.io.emit('bot_status_broadcast', { timestamp: new Date().toISOString() });
  }

  private broadcastSystemMetrics(): void {
    if (!this.io) {
      return;
    }
    this.io.sockets.sockets.forEach((socket) => {
      this.sendSystemMetrics(socket);
    });
  }

  public broadcastConfigChange(): void {
    if (!this.io) {
      return;
    }
    debug('Broadcasting configuration change');
    this.io.emit('config_changed', { timestamp: new Date().toISOString() });

    // Send updated data to all clients
    this.io.sockets.sockets.forEach((socket) => {
      this.sendBotStatus(socket);
      this.sendConfigValidation(socket);
    });
  }

  private sendMessageFlow(socket: any): void {
    try {
      const messageFlow = this.getMessageFlow(50); // Last 50 messages
      socket.emit('message_flow_update', {
        messages: messageFlow,
        total: this.messageFlow.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      debug('Error sending message flow:', error);
      socket.emit('error', { message: 'Failed to get message flow' });
    }
  }

  private sendAlerts(socket: any): void {
    try {
      const alerts = this.getAlerts(20); // Last 20 alerts
      socket.emit('alerts_update', {
        alerts,
        total: this.alerts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      debug('Error sending alerts:', error);
      socket.emit('error', { message: 'Failed to get alerts' });
    }
  }

  private sendPerformanceMetrics(socket: any): void {
    try {
      const metrics = this.getPerformanceMetrics(30); // Last 30 data points

      // Compute CPU usage percentage since last sample
      const nowHr = process.hrtime.bigint();
      const elapsedNs = Number(nowHr - this.lastHrTime);
      const elapsedMs = elapsedNs / 1_000_000;
      const currentCpu = process.cpuUsage(this.lastCpuUsage);
      const totalCpuMicros = currentCpu.user + currentCpu.system;
      const cpuCores = Math.max(1, os.cpus()?.length || 1);
      // percent of a single core, normalized by core count
      const cpuPercent =
        elapsedMs > 0
          ? Math.min(100, Math.max(0, (totalCpuMicros / (elapsedMs * 1000)) * (100 / cpuCores)))
          : 0;
      this.lastCpuUsage = process.cpuUsage();
      this.lastHrTime = nowHr;

      // Approximate response time as average processingTime of last 10 message events (if present)
      const recentWithTimes = this.messageFlow
        .slice(-20)
        .map((m) => m.processingTime)
        .filter((t): t is number => typeof t === 'number' && isFinite(t));
      const avgResponse = recentWithTimes.length
        ? Math.round(recentWithTimes.reduce((a, b) => a + b, 0) / recentWithTimes.length)
        : 0;

      const currentMetric: PerformanceMetric = {
        timestamp: new Date().toISOString(),
        responseTime: avgResponse,
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuUsage: Math.round(cpuPercent),
        activeConnections: this.connectedClients,
        messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
        errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
      };

      this.performanceMetrics.push(currentMetric);
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics = this.performanceMetrics.slice(-100);
      }

      socket.emit('performance_metrics_update', {
        metrics: [...metrics, currentMetric],
        current: currentMetric,
        history: {
          messageRate: this.getMessageRateHistory(),
          errorRate: this.getErrorRateHistory(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      debug('Error sending performance metrics:', error);
      socket.emit('error', { message: 'Failed to get performance metrics' });
    }
  }

  private sendMonitoringDashboard(socket: any): void {
    try {
      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();
      const totalBots = bots.length;
      const activeBots = totalBots; // without runtime signals, assume all configured are active
      const dashboard = {
        summary: {
          totalBots,
          activeBots,
          totalMessages: this.messageFlow.length,
          totalAlerts: this.alerts.length,
          uptime: process.uptime(),
          connectedClients: this.connectedClients,
        },
        recentActivity: {
          messages: this.getMessageFlow(10),
          alerts: this.getAlerts(5),
        },
        performance: {
          current: {
            memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
            errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
          },
          history: {
            messageRate: this.getMessageRateHistory(),
            errorRate: this.getErrorRateHistory(),
          },
        },
        timestamp: new Date().toISOString(),
      };

      socket.emit('monitoring_dashboard_update', dashboard);
    } catch (error) {
      debug('Error sending monitoring dashboard:', error);
      socket.emit('error', { message: 'Failed to get monitoring dashboard' });
    }
  }

  private sendApiStatus(socket: any): void {
    try {
      const statuses = this.apiMonitorService.getAllStatuses();
      const overallHealth = this.apiMonitorService.getOverallHealth();

      socket.emit('api_status_update', {
        endpoints: statuses,
        overall: overallHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      debug('Error sending API status:', error);
      socket.emit('error', { message: 'Failed to get API status' });
    }
  }

  private sendApiEndpoints(socket: any): void {
    try {
      const endpoints = this.apiMonitorService.getAllEndpoints();

      socket.emit('api_endpoints_update', {
        endpoints,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      debug('Error sending API endpoints:', error);
      socket.emit('error', { message: 'Failed to get API endpoints' });
    }
  }

  public shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.io) {
      try {
        // Proactively disconnect sockets without touching the underlying HTTP server
        try {
          this.io.sockets.sockets.forEach((socket) => {
            try {
              socket.disconnect(true);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
        // Remove listeners to avoid emitting errors on the shared HTTP server
        this.io.removeAllListeners();
        // Avoid calling close() to prevent 'Server is not running' errors in certain environments
      } catch (error) {
        debug('Error during WebSocket shutdown:', error);
      }
      this.io = null;
    }

    // Clean up per-bot statistics to prevent memory leaks
    this.botErrors.clear();

    debug('WebSocket service shut down');
  }
}

export default WebSocketService;
