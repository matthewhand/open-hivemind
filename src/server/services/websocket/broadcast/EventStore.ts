import { randomUUID } from 'crypto';
import type { AlertEvent, MessageFlowEvent, SystemEvent } from '../types';

/**
 * Manages the in-memory storage of historical events (messages, alerts, system events).
 */
export class EventStore {
  private messageFlow: MessageFlowEvent[] = [];
  private alerts: AlertEvent[] = [];
  private alertsMap: Map<string, AlertEvent> = new Map();
  private systemEvents: SystemEvent[] = [];
  private botErrors = new Map<string, string[]>();

  public recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): MessageFlowEvent {
    const fullEvent: MessageFlowEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.messageFlow.unshift(fullEvent);
    if (this.messageFlow.length > 500) {
      this.messageFlow.pop();
    }

    if (event.status === 'error' && event.errorMessage) {
      const errors = this.botErrors.get(event.botName) || [];
      errors.unshift(event.errorMessage);
      if (errors.length > 20) errors.pop();
      this.botErrors.set(event.botName, errors);
    }

    return fullEvent;
  }

  public recordAlert(
    event: Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'>
  ): AlertEvent {
    const existing = Array.from(this.alertsMap.values()).find(
      (a) => a.botName === event.botName && a.title === event.title && a.status === 'active'
    );

    if (existing) {
      existing.message = event.message;
      existing.timestamp = new Date().toISOString();
      return existing;
    }

    const fullEvent: AlertEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'active',
    };

    this.alerts.unshift(fullEvent);
    this.alertsMap.set(fullEvent.id, fullEvent);

    if (this.alerts.length > 100) {
      const popped = this.alerts.pop();
      if (popped) this.alertsMap.delete(popped.id);
    }

    return fullEvent;
  }

  public recordSystemEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>): SystemEvent {
    const fullEvent: SystemEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.systemEvents.unshift(fullEvent);
    if (this.systemEvents.length > 200) {
      this.systemEvents.pop();
    }

    return fullEvent;
  }

  public getMessageFlow(limit = 100): MessageFlowEvent[] {
    return this.messageFlow.slice(0, limit);
  }

  public getTotalMessageCount(): number {
    return this.messageFlow.length;
  }

  public getAlerts(limit = 50): AlertEvent[] {
    return this.alerts.slice(0, limit);
  }

  public getTotalAlertCount(): number {
    return this.alerts.length;
  }

  public acknowledgeAlert(id: string): boolean {
    const alert = this.alertsMap.get(id);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public resolveAlert(id: string): boolean {
    const alert = this.alertsMap.get(id);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public getBotErrors(botName: string): string[] {
    return this.botErrors.get(botName) || [];
  }

  public getAllBotErrors(): Map<string, string[]> {
    return new Map(this.botErrors);
  }

  public clear(): void {
    this.messageFlow = [];
    this.alerts = [];
    this.alertsMap.clear();
    this.systemEvents = [];
    this.botErrors.clear();
  }
}
