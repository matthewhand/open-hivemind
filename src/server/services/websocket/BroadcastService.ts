import { randomUUID } from 'crypto';
import os from 'os';
import Debug from 'debug';
import type { Socket, Server as SocketIOServer } from 'socket.io';
import { inject, injectable, singleton } from 'tsyringe';
import { BotConfigurationManager } from '../../../config/BotConfigurationManager';
import type { EndpointStatus } from '../../../services/ApiMonitorService';
import ApiMonitorService from '../../../services/ApiMonitorService';
import type { BotConfig } from '../../../types/config';
import {
  DeliveryStatus,
  type AckPayload,
  type DeliveryStats,
  type MessageAckConfig,
  type MessageEnvelope,
  type RequestMissedPayload,
} from '../../../types/websocket';
import { ActivityLogger } from '../ActivityLogger';
import { BotMetricsService } from '../BotMetricsService';
import { ConnectionManager } from './ConnectionManager';
import type { AlertEvent, MessageFlowEvent, PerformanceMetric } from './types';

const debug = Debug('app:WebSocketService:BroadcastService');

@singleton()
@injectable()
export class BroadcastService {
  private messageFlow: MessageFlowEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private alerts: AlertEvent[] = [];
  private messageRateHistory: number[] = new Array(60).fill(0);
  private errorRateHistory: number[] = new Array(60).fill(0);

  private lastCpuUsage = process.cpuUsage();
  private lastHrTime = process.hrtime.bigint();
  private botErrors = new Map<string, string[]>();

  // Message acknowledgment & delivery tracking
  private pendingMessages = new Map<string, MessageEnvelope>();
  private sequenceNumbers = new Map<string, number>();
  private channelMessageHistory = new Map<string, MessageEnvelope[]>();
  private ackLatencies: number[] = [];
  private deliveryCounts = { sent: 0, acknowledged: 0, timedOut: 0, failed: 0 };
  private ackTimeoutTimers = new Map<string, NodeJS.Timeout>();
  private ackConfig: MessageAckConfig = {
    messageTimeoutMs: 10_000,
    maxRetries: 2,
    enabled: true,
  };

  constructor(
    @inject(ConnectionManager) private connectionManager: ConnectionManager,
    @inject(ApiMonitorService) private apiMonitorService: ApiMonitorService
  ) {
    this.setupApiMonitoring();
  }

  // Used strictly by test mocks that inject a mock ApiMonitorService
  public getApiMonitorService(): ApiMonitorService {
    return this.apiMonitorService;
  }
  public setApiMonitorService(service: ApiMonitorService): void {
    this.apiMonitorService = service;
    this.setupApiMonitoring();
  }

  private io(): SocketIOServer | null {
    return this.connectionManager.getIo();
  }

  private connectedClients(): number {
    return this.connectionManager.getConnectedClients();
  }

  private setupApiMonitoring(): void {
    this.apiMonitorService.on('statusUpdate', (status: EndpointStatus) => {
      this.handleApiStatusUpdate(status);
    });

    this.apiMonitorService.on('healthCheckResult', (result) => {
      this.handleApiHealthCheckResult(result);
    });

    // Sync LLM endpoints on startup before starting monitoring
    this.apiMonitorService.syncLlmEndpoints();

    // Start monitoring all configured endpoints
    this.apiMonitorService.startAllMonitoring();
  }

  private handleApiStatusUpdate(status: EndpointStatus): void {
    debug(`API endpoint status update: ${status.name} - ${status.status}`);

    const currentIo = this.io();
    if (currentIo && this.connectedClients() > 0) {
      currentIo.emit('api_status_update', {
        endpoint: status,
        timestamp: new Date().toISOString(),
      });
    }

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

  private handleApiHealthCheckResult(result: { endpointId: string; success: boolean }): void {
    debug(
      `API health check result: ${result.endpointId} - ${result.success ? 'success' : 'failed'}`
    );

    const currentIo = this.io();
    if (currentIo && this.connectedClients() > 0) {
      currentIo.emit('api_health_check_result', {
        result,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): void {
    const messageEvent: MessageFlowEvent = {
      ...event,
      id: `msg_${Date.now()}_${randomUUID()}`,
      timestamp: new Date().toISOString(),
    };

    this.messageFlow.push(messageEvent);
    ActivityLogger.getInstance().log(messageEvent);

    const key = event.botName || 'unknown';
    BotMetricsService.getInstance().incrementMessageCount(key);

    if (this.messageFlow.length > 1000) {
      this.messageFlow = this.messageFlow.slice(-1000);
    }

    this.updateMessageRate();

    const currentIo = this.io();
    if (currentIo && this.connectedClients() > 0) {
      currentIo.emit('message_flow_update', messageEvent);
    }
  }

  public recordAlert(
    alert: Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'>
  ): void {
    const alertEvent: AlertEvent = {
      ...alert,
      id: `alert_${Date.now()}_${randomUUID()}`,
      timestamp: new Date().toISOString(),
      status: 'active',
    };

    this.alerts.push(alertEvent);

    const key = alertEvent.botName || 'unknown';
    const list = this.botErrors.get(key) || [];
    list.push(`${alertEvent.level}: ${alertEvent.title}`);
    if (list.length > 20) {
      list.shift();
    }
    this.botErrors.set(key, list);

    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(-500);
    }

    if (alert.level === 'error' || alert.level === 'critical') {
      this.updateErrorRate();
      BotMetricsService.getInstance().incrementErrorCount(key);
    }

    const currentIo = this.io();
    if (currentIo && this.connectedClients() > 0) {
      currentIo.emit('alert_update', alertEvent);
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

      const currentIo = this.io();
      if (currentIo && this.connectedClients() > 0) {
        currentIo.emit('alert_update', alert);
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

      const currentIo = this.io();
      if (currentIo && this.connectedClients() > 0) {
        currentIo.emit('alert_update', alert);
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

  public getAllBotStats(): Record<
    string,
    { messageCount: number; errors: string[]; errorCount: number }
  > {
    const metricsService = BotMetricsService.getInstance();
    const allMetrics = metricsService.getAllMetrics();
    const out: Record<string, { messageCount: number; errors: string[]; errorCount: number }> = {};

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
    this.messageRateHistory.shift();
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
    this.errorRateHistory.shift();
  }

  public broadcastBotStatus(): void {
    const currentIo = this.io();
    if (!currentIo) return;
    currentIo.emit('bot_status_broadcast', { timestamp: new Date().toISOString() });
  }

  public broadcastSystemMetrics(connectedClients: number): void {
    const currentIo = this.io();
    if (!currentIo) return;
    currentIo.sockets.sockets.forEach((socket) => {
      this.sendSystemMetrics(socket, connectedClients);
    });
  }

  public broadcastMonitoringData(connectedClients: number): void {
    const currentIo = this.io();
    if (!currentIo) return;

    if (this.messageFlow.length > 0) {
      currentIo.emit('message_flow_broadcast', {
        latest: this.messageFlow.slice(-5),
        total: this.messageFlow.length,
        timestamp: new Date().toISOString(),
      });
    }

    if (this.alerts.length > 0) {
      const recentAlerts = this.alerts.filter(
        (alert) => new Date(alert.timestamp) > new Date(Date.now() - 30000)
      );
      if (recentAlerts.length > 0) {
        currentIo.emit('alerts_broadcast', {
          alerts: recentAlerts,
          timestamp: new Date().toISOString(),
        });
      }
    }

    currentIo.emit('performance_metrics_broadcast', {
      current: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
        errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
        activeConnections: connectedClients,
      },
      timestamp: new Date().toISOString(),
    });

    try {
      const statsObj = this.getAllBotStats();
      const stats = Object.entries(statsObj).map(([name, s]) => ({
        name,
        messageCount: s.messageCount,
        errorCount: s.errorCount,
      }));
      currentIo.emit('bot_stats_broadcast', {
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      debug('Error broadcasting bot stats:', error);
    }
  }

  public sendBotStatus(socket: Socket): void {
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

  public sendSystemMetrics(socket: Socket, connectedClients: number): void {
    try {
      const memUsage = process.memoryUsage();
      const metrics = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        connectedClients: connectedClients,
        timestamp: new Date().toISOString(),
      };

      socket.emit('system_metrics_update', metrics);
    } catch (error) {
      debug('Error sending system metrics:', error);
      socket.emit('error', { message: 'Failed to get system metrics' });
    }
  }

  public sendConfigValidation(socket: Socket): void {
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

  private findMissingConfigurations(bots: BotConfig[]): string[] {
    const missing: string[] = [];

    bots.forEach((bot) => {
      if (
        bot.messageProvider === 'discord' &&
        !(bot.discord as { token?: string } | undefined)?.token
      ) {
        missing.push(`${bot.name}: Missing Discord bot token`);
      }
      if (
        bot.messageProvider === 'slack' &&
        !(bot.slack as { botToken?: string } | undefined)?.botToken
      ) {
        missing.push(`${bot.name}: Missing Slack bot token`);
      }
      if (
        bot.llmProvider === 'openai' &&
        !(bot.openai as { apiKey?: string } | undefined)?.apiKey
      ) {
        missing.push(`${bot.name}: Missing OpenAI API key`);
      }
      if (
        bot.llmProvider === 'flowise' &&
        !(bot.flowise as { apiKey?: string } | undefined)?.apiKey
      ) {
        missing.push(`${bot.name}: Missing Flowise API key`);
      }
    });

    return missing;
  }

  private generateRecommendations(bots: BotConfig[]): string[] {
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

  public broadcastConfigChange(detail?: { type?: string; action?: string; key?: string }): void {
    const currentIo = this.io();
    if (!currentIo) return;

    debug('Broadcasting configuration change', detail);
    currentIo.emit('config_changed', {
      timestamp: new Date().toISOString(),
      ...(detail || {}),
    });

    currentIo.sockets.sockets.forEach((socket) => {
      this.sendBotStatus(socket);
      this.sendConfigValidation(socket);
    });
  }

  public sendMessageFlow(socket: Socket): void {
    try {
      const messageFlow = this.getMessageFlow(50);
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

  public sendAlerts(socket: Socket): void {
    try {
      const alerts = this.getAlerts(20);
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

  public sendPerformanceMetrics(socket: Socket, connectedClients: number): void {
    try {
      const metrics = this.getPerformanceMetrics(30);

      const nowHr = process.hrtime.bigint();
      const elapsedNs = Number(nowHr - this.lastHrTime);
      const elapsedMs = elapsedNs / 1_000_000;
      const currentCpu = process.cpuUsage(this.lastCpuUsage);
      const totalCpuMicros = currentCpu.user + currentCpu.system;
      const cpuCores = Math.max(1, os.cpus()?.length || 1);
      const cpuPercent =
        elapsedMs > 0
          ? Math.min(100, Math.max(0, (totalCpuMicros / (elapsedMs * 1000)) * (100 / cpuCores)))
          : 0;
      this.lastCpuUsage = process.cpuUsage();
      this.lastHrTime = nowHr;

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
        activeConnections: connectedClients,
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

  public sendMonitoringDashboard(socket: Socket, connectedClients: number): void {
    try {
      const manager = BotConfigurationManager.getInstance();
      const bots = manager.getAllBots();
      const totalBots = bots.length;
      const activeBots = totalBots;
      const dashboard = {
        summary: {
          totalBots,
          activeBots,
          totalMessages: this.messageFlow.length,
          totalAlerts: this.alerts.length,
          uptime: process.uptime(),
          connectedClients: connectedClients,
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

  public sendApiStatus(socket: Socket): void {
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

  public sendApiEndpoints(socket: Socket): void {
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

  // ---------------------------------------------------------------------------
  // Message acknowledgment & delivery tracking
  // ---------------------------------------------------------------------------

  public configureAck(config: Partial<MessageAckConfig>): void {
    Object.assign(this.ackConfig, config);
  }

  public sendTrackedMessage(event: string, payload: unknown, channel = 'default'): MessageEnvelope {
    const seq = (this.sequenceNumbers.get(channel) ?? 0) + 1;
    this.sequenceNumbers.set(channel, seq);

    const envelope: MessageEnvelope = {
      messageId: `ws_${Date.now()}_${randomUUID()}`,
      sequenceNumber: seq,
      event,
      payload,
      sentAt: new Date().toISOString(),
      status: DeliveryStatus.SENT,
      attempts: 1,
    };

    this.deliveryCounts.sent++;
    this.pendingMessages.set(envelope.messageId, envelope);

    const history = this.channelMessageHistory.get(channel) ?? [];
    history.push(envelope);
    if (history.length > 500) {
      history.splice(0, history.length - 500);
    }
    this.channelMessageHistory.set(channel, history);

    const currentIo = this.io();
    if (currentIo) {
      currentIo.emit('tracked_message', envelope);
    }

    if (this.ackConfig.enabled) {
      this.startAckTimeout(envelope, channel);
    }

    return envelope;
  }

  public handleAck(ack: AckPayload): boolean {
    const envelope = this.pendingMessages.get(ack.messageId);
    if (!envelope) {
      return false;
    }

    envelope.status = DeliveryStatus.ACKNOWLEDGED;
    this.pendingMessages.delete(ack.messageId);
    this.deliveryCounts.acknowledged++;

    const latency = Date.now() - new Date(envelope.sentAt).getTime();
    this.ackLatencies.push(latency);
    if (this.ackLatencies.length > 1000) {
      this.ackLatencies.shift();
    }

    const timer = this.ackTimeoutTimers.get(ack.messageId);
    if (timer) {
      clearTimeout(timer);
      this.ackTimeoutTimers.delete(ack.messageId);
    }

    return true;
  }

  public handleRequestMissed(request: RequestMissedPayload): MessageEnvelope[] {
    const history = this.channelMessageHistory.get(request.channel) ?? [];
    return history.filter((msg) => msg.sequenceNumber > request.lastSequence);
  }

  public getDeliveryStats(): DeliveryStats {
    const totalCompleted =
      this.deliveryCounts.acknowledged + this.deliveryCounts.timedOut + this.deliveryCounts.failed;
    const avgLatency =
      this.ackLatencies.length > 0
        ? Math.round(this.ackLatencies.reduce((a, b) => a + b, 0) / this.ackLatencies.length)
        : 0;
    const successRate = totalCompleted > 0 ? this.deliveryCounts.acknowledged / totalCompleted : 0;

    return {
      totalSent: this.deliveryCounts.sent,
      totalAcknowledged: this.deliveryCounts.acknowledged,
      totalTimedOut: this.deliveryCounts.timedOut,
      totalFailed: this.deliveryCounts.failed,
      pendingCount: this.pendingMessages.size,
      averageAckLatencyMs: avgLatency,
      deliverySuccessRate: successRate,
    };
  }

  public getSequenceNumber(channel = 'default'): number {
    return this.sequenceNumbers.get(channel) ?? 0;
  }

  private startAckTimeout(envelope: MessageEnvelope, channel: string): void {
    const timer = setTimeout(() => {
      this.ackTimeoutTimers.delete(envelope.messageId);

      const pending = this.pendingMessages.get(envelope.messageId);
      if (!pending) {
        return;
      }

      if (pending.attempts < this.ackConfig.maxRetries + 1) {
        pending.attempts++;
        this.deliveryCounts.sent++;
        const currentIo = this.io();
        if (currentIo) {
          currentIo.emit('tracked_message', pending);
        }
        this.startAckTimeout(pending, channel);
      } else {
        pending.status = DeliveryStatus.TIMED_OUT;
        this.pendingMessages.delete(envelope.messageId);
        this.deliveryCounts.timedOut++;
        debug(`Message ${envelope.messageId} timed out after ${pending.attempts} attempts`);
      }
    }, this.ackConfig.messageTimeoutMs);

    this.ackTimeoutTimers.set(envelope.messageId, timer);
  }

  public shutdown(): void {
    this.botErrors.clear();

    for (const timer of this.ackTimeoutTimers.values()) {
      if (typeof clearTimeout === 'function') {
        clearTimeout(timer);
      }
    }
    this.ackTimeoutTimers.clear();
    this.pendingMessages.clear();
    this.sequenceNumbers.clear();
    this.channelMessageHistory.clear();
    this.ackLatencies = [];
    this.deliveryCounts = { sent: 0, acknowledged: 0, timedOut: 0, failed: 0 };
  }
}
