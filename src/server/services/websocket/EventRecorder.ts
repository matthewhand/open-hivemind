import { EventEmitter } from 'events';
import { injectable, singleton } from 'tsyringe';
import {
  type AlertEvent,
  type MessageFlowEvent,
  type PerformanceMetric,
  type SystemEvent,
} from './types';

/**
 * Manages the buffers and recording of various platform events
 */
@singleton()
@injectable()
export class EventRecorder extends EventEmitter {
  private messageFlow: MessageFlowEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private alerts: AlertEvent[] = [];
  private alertsMap: Map<string, AlertEvent> = new Map();
  private systemEvents: SystemEvent[] = [];

  private readonly MAX_BUFFER_SIZE = 100;

  constructor() {
    super();
  }

  public recordMessageFlow(event: MessageFlowEvent): void {
    this.messageFlow.unshift(event);
    if (this.messageFlow.length > this.MAX_BUFFER_SIZE) {
      this.messageFlow.pop();
    }
    this.emit('message:flow', event);
  }

  public recordPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.unshift(metric);
    if (this.performanceMetrics.length > this.MAX_BUFFER_SIZE) {
      this.performanceMetrics.pop();
    }
    this.emit('performance:metric', metric);
  }

  public recordAlert(alert: AlertEvent): void {
    // If an alert with the same ID already exists, update it
    if (alert.id) {
      this.alertsMap.set(alert.id, alert);
    }

    this.alerts.unshift(alert);
    if (this.alerts.length > this.MAX_BUFFER_SIZE) {
      this.alerts.pop();
    }
    this.emit('security:alert', alert);
  }

  public recordSystemEvent(event: SystemEvent): void {
    this.systemEvents.unshift(event);
    if (this.systemEvents.length > this.MAX_BUFFER_SIZE) {
      this.systemEvents.pop();
    }
    this.emit('system:event', event);
  }

  public getMessageFlow(): MessageFlowEvent[] {
    return this.messageFlow;
  }

  public getPerformanceMetrics(): PerformanceMetric[] {
    return this.performanceMetrics;
  }

  public getAlerts(): AlertEvent[] {
    return this.alerts;
  }

  public getSystemEvents(): SystemEvent[] {
    return this.systemEvents;
  }

  public clearAll(): void {
    this.messageFlow = [];
    this.performanceMetrics = [];
    this.alerts = [];
    this.alertsMap.clear();
    this.systemEvents = [];
  }
}
