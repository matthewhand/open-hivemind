import type { Server as HttpServer } from 'http';
import Debug from 'debug';
import type { Server as SocketIOServer } from 'socket.io';
import { container, injectable, singleton } from 'tsyringe';
import type ApiMonitorService from '../../../services/ApiMonitorService';
import type {
  AckPayload,
  DeliveryStats,
  MessageAckConfig,
  MessageEnvelope,
  RequestMissedPayload,
} from '../../../types/websocket';
import { type BroadcastService } from './BroadcastService';
import { type ConnectionManager } from './ConnectionManager';
import { type EventHandlers } from './EventHandlers';
import type { AlertEvent, MessageFlowEvent, PerformanceMetric } from './types';

const debug = Debug('app:WebSocketService');

export type { MessageFlowEvent, PerformanceMetric, AlertEvent };

@singleton()
@injectable()
export class WebSocketService {
  private static instance: WebSocketService;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    private connectionManager: ConnectionManager,
    private broadcastService: BroadcastService,
    private eventHandlers: EventHandlers
  ) {}

  // We explicitly declare io to allow tests to mock it via (service as any).io
  private get io(): SocketIOServer | null {
    return this.connectionManager.getIo();
  }

  private set io(value: SocketIOServer | null) {
    // Tests set (service as any).io to their mock
    // we bypass our connection manager logic to inject it
    this.connectionManager.setIo(value);
  }

  // Same for connectedClients
  private get connectedClients(): number {
    return this.connectionManager.getConnectedClients();
  }

  private set connectedClients(value: number) {
    this.connectionManager.setConnectedClients(value);
  }

  // Same for apiMonitorService
  private get apiMonitorService(): ApiMonitorService {
    return this.broadcastService.getApiMonitorService();
  }

  private set apiMonitorService(value: ApiMonitorService) {
    this.broadcastService.setApiMonitorService(value);
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = container.resolve(WebSocketService);
    }
    return WebSocketService.instance;
  }

  public initialize(server: HttpServer): void {
    debug('Initializing WebSocket service...');
    const io = this.connectionManager.initialize(server);
    this.eventHandlers.setup(io);
    this.startMetricsCollection();
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const connectedClients = this.connectionManager.getConnectedClients();
      if (connectedClients > 0) {
        this.broadcastService.broadcastBotStatus();
        this.broadcastService.broadcastSystemMetrics(connectedClients);
        this.broadcastService.broadcastMonitoringData(connectedClients);
      }
    }, 5000);
  }

  // Delegate all public methods to appropriate services

  public recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): void {
    this.broadcastService.recordMessageFlow(event);
  }

  public recordAlert(
    alert: Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'>
  ): void {
    this.broadcastService.recordAlert(alert);
  }

  public getMessageFlow(limit = 100): MessageFlowEvent[] {
    return this.broadcastService.getMessageFlow(limit);
  }

  public getAlerts(limit = 50): AlertEvent[] {
    return this.broadcastService.getAlerts(limit);
  }

  public acknowledgeAlert(id: string): boolean {
    return this.broadcastService.acknowledgeAlert(id);
  }

  public resolveAlert(id: string): boolean {
    return this.broadcastService.resolveAlert(id);
  }

  public getPerformanceMetrics(limit = 60): PerformanceMetric[] {
    return this.broadcastService.getPerformanceMetrics(limit);
  }

  public getMessageRateHistory(): number[] {
    return this.broadcastService.getMessageRateHistory();
  }

  public getErrorRateHistory(): number[] {
    return this.broadcastService.getErrorRateHistory();
  }

  public getBotStats(botName: string): {
    messageCount: number;
    errors: string[];
    errorCount: number;
  } {
    return this.broadcastService.getBotStats(botName);
  }

  public getAllBotStats(): Record<
    string,
    { messageCount: number; errors: string[]; errorCount: number }
  > {
    return this.broadcastService.getAllBotStats();
  }

  public broadcastConfigChange(detail?: { type?: string; action?: string; key?: string }): void {
    this.broadcastService.broadcastConfigChange(detail);
  }

  public configureAck(config: Partial<MessageAckConfig>): void {
    this.broadcastService.configureAck(config);
  }

  public sendTrackedMessage(event: string, payload: unknown, channel = 'default'): MessageEnvelope {
    return this.broadcastService.sendTrackedMessage(event, payload, channel);
  }

  public handleAck(ack: AckPayload): boolean {
    return this.broadcastService.handleAck(ack);
  }

  public handleRequestMissed(request: RequestMissedPayload): MessageEnvelope[] {
    return this.broadcastService.handleRequestMissed(request);
  }

  public getDeliveryStats(): DeliveryStats {
    return this.broadcastService.getDeliveryStats();
  }

  public getSequenceNumber(channel = 'default'): number {
    return this.broadcastService.getSequenceNumber(channel);
  }

  public shutdown(): void {
    if (this.metricsInterval) {
      if (typeof clearInterval === 'function') {
        clearInterval(this.metricsInterval);
      }
      this.metricsInterval = null;
    }

    this.connectionManager.shutdown();
    this.broadcastService.shutdown();
    debug('WebSocket service shut down');
  }
}

export default WebSocketService;
