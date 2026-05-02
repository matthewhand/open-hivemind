import type { Socket } from 'socket.io';
import { DeliveryStatus, type MessageEnvelope } from '../../../../types/websocket';
import { type ConnectionManager } from '../ConnectionManager';
import { type EventStore } from './EventStore';
import { type MessageTracker } from './MessageTracker';
import { type MetricCalculator } from './MetricCalculator';

/**
 * Handles the actual distribution of data to connected WebSocket clients.
 */
export class BroadcastDistributor {
  constructor(
    private connectionManager: ConnectionManager,
    private eventStore: EventStore,
    private metricCalculator: MetricCalculator,
    private messageTracker: MessageTracker
  ) {}

  public broadcast(event: string, payload: any): void {
    const io = this.connectionManager.getIo();
    if (!io) return;
    io.emit(event, payload);
  }

  public broadcastSystemMetrics(connectedClients: number): void {
    const metric = this.metricCalculator.calculateSystemMetric(connectedClients);
    this.broadcast('system_metrics', metric);
  }

  public broadcastMonitoringData(connectedClients: number): void {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.metricCalculator.calculateSystemMetric(connectedClients),
      alerts: this.eventStore.getAlerts(10),
      recentMessages: this.eventStore.getMessageFlow(10),
      deliveryStats: this.messageTracker.getStats(),
    };
    this.broadcast('monitoring_dashboard_update', data);
  }

  public sendToSocket(socket: Socket, event: string, payload: any): void {
    socket.emit(event, payload);
  }

  public sendTrackedMessage(event: string, payload: unknown, channel = 'default'): MessageEnvelope {
    const envelope: MessageEnvelope = {
      timestamp: new Date().toISOString(),
      channel,
      sequence: this.messageTracker.getNextSequence(channel),
      event,
      payload,
      retryCount: 0,
      deliveryStatus: DeliveryStatus.SENT,
    } as any;

    (envelope as any).id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.messageTracker.trackMessage(envelope);
    this.broadcast(event, envelope);
    return envelope;
  }
}
