import 'reflect-metadata';
import Debug from 'debug';
import type { Socket } from 'socket.io';
import { inject, injectable, singleton } from 'tsyringe';
import { AuditLogger, type AuditEvent } from '../../../common/auditLogger';
import { BotConfigurationManager } from '../../../config/BotConfigurationManager';
import { MessageBus } from '../../../events/MessageBus';
import { BotManager } from '../../../managers/BotManager';
import ApiMonitorService from '../../../services/ApiMonitorService';
import DemoModeService from '../../../services/DemoModeService';
import {
  type AckPayload,
  type DeliveryStats,
  type MessageAckConfig,
  type MessageEnvelope,
  type RequestMissedPayload,
} from '../../../types/websocket';
import { BotMetricsService } from '../BotMetricsService';
import { BroadcastDistributor } from './broadcast/BroadcastDistributor';
import { EventStore } from './broadcast/EventStore';
import { MessageTracker } from './broadcast/MessageTracker';
import { MetricCalculator } from './broadcast/MetricCalculator';
import { ConnectionManager } from './ConnectionManager';
import type { AlertEvent, MessageFlowEvent, PerformanceMetric } from './types';

const debug = Debug('app:WebSocketService:BroadcastService');

@singleton()
@injectable()
export class BroadcastService {
  private eventStore = new EventStore();
  private metricCalculator = new MetricCalculator();
  private messageTracker = new MessageTracker();
  private distributor: BroadcastDistributor;

  constructor(
    @inject(ConnectionManager) private connectionManager: ConnectionManager,
    @inject(ApiMonitorService) private apiMonitorService: ApiMonitorService,
    @inject(DemoModeService) private demoModeService: DemoModeService
  ) {
    this.distributor = new BroadcastDistributor(
      connectionManager,
      this.eventStore,
      this.metricCalculator,
      this.messageTracker
    );
    this.setupApiMonitoring();
    this.setupMessageBus();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    AuditLogger.getInstance().on('auditEvent', (event: AuditEvent) => {
      this.recordSystemEvent({
        type: event.result === 'success' ? 'info' : 'error',
        category: 'audit',
        message: `${event.action}: ${event.details}`,
        metadata: {
          user: event.user,
          resource: event.resource,
          result: event.result,
        },
      });
    });

    BotManager.getInstance().then((botManager) => {
      botManager.on('botStarted', (bot) => {
        this.recordSystemEvent({
          type: 'info',
          category: 'lifecycle',
          message: `Bot-${bot.name} Started`,
          botName: bot.name,
        });
      });

      botManager.on('botStopped', (bot) => {
        this.recordSystemEvent({
          type: 'warn',
          category: 'lifecycle',
          message: `Bot-${bot.name} Stopped`,
          botName: bot.name,
        });
      });
    });

    (BotMetricsService.getInstance() as any).on?.('thresholdExceeded', (data: any) => {
      this.recordAlert({
        level: 'warning',
        title: 'Performance Threshold Exceeded',
        message: `${data.botName}: ${data.metric} is ${data.value} (threshold: ${data.threshold})`,
        botName: data.botName,
        metadata: data,
      });
    });
  }

  private setupApiMonitoring(): void {
    this.apiMonitorService.on('endpointStatusChanged', (status) => {
      this.recordSystemEvent({
        type: status.status === 'up' ? 'info' : 'error',
        category: 'api',
        message: `API Endpoint ${status.endpoint} is ${status.status}`,
        metadata: status,
      });
      this.distributor.broadcast('api_status_change', status);
    });
  }

  private setupMessageBus(): void {
    const bus = MessageBus.getInstance();

    (bus as any).on?.('message_processed', (event: any) => {
      this.recordMessageFlow({
        botName: event.botName,
        provider: event.provider,
        llmProvider: event.llmProvider,
        channelId: event.channelId,
        userId: event.userId,
        messageType: 'outgoing',
        contentLength: event.response?.length || 0,
        processingTime: event.processingTime,
        status: 'success',
      });
    });

    (bus as any).on?.('error', (error: any) => {
      this.recordAlert({
        level: 'error',
        title: 'System Error',
        message: error.message,
        metadata: { stack: error.stack },
      });
    });
  }

  public recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): void {
    const fullEvent = this.eventStore.recordMessageFlow(event);
    this.metricCalculator.updateRateHistory(this.eventStore.getMessageFlow(100));
    this.distributor.broadcast('message_flow', fullEvent);
  }

  public recordAlert(
    event: Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'>
  ): void {
    const alert = this.eventStore.recordAlert(event);
    this.distributor.broadcast('alert', alert);
  }

  public recordSystemEvent(event: Omit<any, 'id' | 'timestamp'>): void {
    const systemEvent = this.eventStore.recordSystemEvent(event);
    this.distributor.broadcast('system_event', systemEvent);
  }

  public getMessageFlow(limit = 100): MessageFlowEvent[] {
    return this.eventStore.getMessageFlow(limit);
  }

  public getAlerts(limit = 50): AlertEvent[] {
    return this.eventStore.getAlerts(limit);
  }

  public acknowledgeAlert(id: string): boolean {
    const success = this.eventStore.acknowledgeAlert(id);
    if (success) {
      this.distributor.broadcast('alert_acknowledged', { id, timestamp: new Date().toISOString() });
    }
    return success;
  }

  public resolveAlert(id: string): boolean {
    const success = this.eventStore.resolveAlert(id);
    if (success) {
      this.distributor.broadcast('alert_resolved', { id, timestamp: new Date().toISOString() });
    }
    return success;
  }

  public getPerformanceMetrics(limit = 60): PerformanceMetric[] {
    return this.metricCalculator.getPerformanceMetrics(limit);
  }

  public getMessageRateHistory(): number[] {
    return this.metricCalculator.getMessageRateHistory();
  }

  public getErrorRateHistory(): number[] {
    return this.metricCalculator.getErrorRateHistory();
  }

  public getBotStats(botName: string): any {
    const errors = this.eventStore.getBotErrors(botName);
    const flow = this.eventStore.getMessageFlow(50).filter((e) => e.botName === botName);

    return {
      messageCount: flow.length,
      errorCount: errors.length,
      recentErrors: errors,
      avgLatency:
        flow.length > 0
          ? flow.reduce((acc, e) => acc + (e.processingTime || 0), 0) / flow.length
          : 0,
    };
  }

  public getAllBotStats(): Record<string, any> {
    const bots = BotConfigurationManager.getInstance().getAllBots();
    const stats: Record<string, any> = {};

    bots.forEach((bot) => {
      stats[bot.name] = this.getBotStats(bot.name);
    });

    return stats;
  }

  public broadcastBotStatus(): void {
    const bots = BotConfigurationManager.getInstance().getAllBots();
    this.distributor.broadcast('bot_status_update', bots);
  }

  public broadcastSystemMetrics(connectedClients: number): void {
    this.distributor.broadcastSystemMetrics(connectedClients);
  }

  public broadcastMonitoringData(connectedClients: number): void {
    this.distributor.broadcastMonitoringData(connectedClients);
  }

  public broadcastConfigChange(detail?: any): void {
    this.distributor.broadcast('config_changed', detail || { timestamp: new Date().toISOString() });
  }

  public sendTrackedMessage(event: string, payload: unknown, channel = 'default'): MessageEnvelope {
    return this.distributor.sendTrackedMessage(event, payload, channel);
  }

  public handleAck(ack: AckPayload): boolean {
    return this.messageTracker.handleAck(ack);
  }

  public configureAck(config: Partial<MessageAckConfig>): void {
    this.messageTracker.configureAck(config);
  }

  public handleRequestMissed(request: RequestMissedPayload): MessageEnvelope[] {
    return this.messageTracker.handleRequestMissed(request);
  }

  public getDeliveryStats(): DeliveryStats {
    return this.messageTracker.getStats();
  }

  public getSequenceNumber(channel = 'default'): number {
    return this.messageTracker.getNextSequence(channel) - 1;
  }

  public shutdown(): void {
    this.eventStore.clear();
    this.messageTracker.clear();
  }

  // Socket-specific senders
  public sendBotStatus(socket: Socket): void {
    const bots = BotConfigurationManager.getInstance().getAllBots();
    this.distributor.sendToSocket(socket, 'bot_status_update', bots);
  }

  public sendSystemMetrics(socket: Socket, connectedClients: number): void {
    const metric = this.metricCalculator.calculateSystemMetric(connectedClients);
    this.distributor.sendToSocket(socket, 'system_metrics', metric);
  }

  public sendMonitoringDashboard(socket: Socket, connectedClients: number): void {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.metricCalculator.calculateSystemMetric(connectedClients),
      alerts: this.eventStore.getAlerts(10),
      recentMessages: this.eventStore.getMessageFlow(10),
      deliveryStats: this.messageTracker.getStats(),
    };
    this.distributor.sendToSocket(socket, 'monitoring_dashboard_update', data);
  }

  public sendConfigValidation(socket: Socket): void {
    const manager = BotConfigurationManager.getInstance();
    this.distributor.sendToSocket(socket, 'config_validation', {
      bots: manager.getAllBots(),
      warnings: manager.getWarnings(),
      timestamp: new Date().toISOString(),
    });
  }

  public sendMessageFlow(socket: Socket): void {
    this.distributor.sendToSocket(socket, 'message_flow_update', {
      messages: this.eventStore.getMessageFlow(50),
      total: this.eventStore.getTotalMessageCount(),
    });
  }

  public sendAlerts(socket: Socket): void {
    this.distributor.sendToSocket(socket, 'alerts_update', {
      alerts: this.eventStore.getAlerts(20),
      total: this.eventStore.getTotalAlertCount(),
    });
  }

  public sendPerformanceMetrics(socket: Socket, connectedClients: number): void {
    this.distributor.sendToSocket(socket, 'performance_metrics_update', {
      metrics: this.metricCalculator.getPerformanceMetrics(30),
      current: this.metricCalculator.calculateSystemMetric(connectedClients),
    });
  }

  public sendApiStatus(socket: Socket): void {
    this.distributor.sendToSocket(socket, 'api_status_update', {
      endpoints: this.apiMonitorService.getAllStatuses(),
      overall: this.apiMonitorService.getOverallHealth(),
      timestamp: new Date().toISOString(),
    });
  }

  public sendApiEndpoints(socket: Socket): void {
    this.distributor.sendToSocket(socket, 'api_endpoints_update', {
      endpoints: this.apiMonitorService.getAllEndpoints(),
      timestamp: new Date().toISOString(),
    });
  }

  public getApiMonitorService(): ApiMonitorService {
    return this.apiMonitorService;
  }

  public setApiMonitorService(service: ApiMonitorService): void {
    this.apiMonitorService = service;
  }
}
