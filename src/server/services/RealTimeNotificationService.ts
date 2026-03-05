import { EventEmitter } from 'events';
import Debug from 'debug';
import { WebSocketService } from './WebSocketService';

const debug = Debug('app:RealTimeNotificationService');

export interface NotificationEvent {
  id: string;
  timestamp: string;
  type: 'agent' | 'mcp' | 'system' | 'error' | 'config';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionFilter {
  types?: string[];
  severities?: string[];
  sources?: string[];
}

export class RealTimeNotificationService extends EventEmitter {
  private static instance: RealTimeNotificationService | null = null;
  private notifications: NotificationEvent[] = [];
  private maxNotifications = 1000;
  private webSocketService: WebSocketService;

  private constructor() {
    super();
    this.webSocketService = WebSocketService.getInstance();
  }

  public static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  public notify(event: Omit<NotificationEvent, 'id' | 'timestamp'>): string {
    const notification: NotificationEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    // Add to internal storage
    this.notifications.unshift(notification);

    // Trim if too many
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Emit to local listeners
    this.emit('notification', notification);

    // Send via WebSocket to connected clients
    (this.webSocketService as any).io?.sockets?.emit('notification', notification);

    debug(
      `Notification sent: ${notification.type}/${notification.severity} - ${notification.title}`
    );

    return notification.id;
  }

  public getNotifications(limit = 50, filter?: SubscriptionFilter): NotificationEvent[] {
    let filtered = [...this.notifications];

    if (filter) {
      filtered = filtered.filter((notification) => {
        if (filter.types && !filter.types.includes(notification.type)) {
          return false;
        }
        if (filter.severities && !filter.severities.includes(notification.severity)) {
          return false;
        }
        if (
          filter.sources &&
          notification.source &&
          !filter.sources.includes(notification.source)
        ) {
          return false;
        }
        return true;
      });
    }

    return filtered.slice(0, limit);
  }

  public markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification && notification.metadata) {
      notification.metadata.read = true;
      return true;
    }
    return false;
  }

  public clearNotifications(filter?: SubscriptionFilter): number {
    const originalLength = this.notifications.length;

    if (!filter) {
      this.notifications = [];
      return originalLength;
    }

    this.notifications = this.notifications.filter((notification) => {
      // Keep notifications that don't match the filter
      if (filter.types && filter.types.includes(notification.type)) {
        return false;
      }
      if (filter.severities && filter.severities.includes(notification.severity)) {
        return false;
      }
      if (filter.sources && notification.source && filter.sources.includes(notification.source)) {
        return false;
      }
      return true;
    });

    return originalLength - this.notifications.length;
  }

  public subscribe(
    callback: (notification: NotificationEvent) => void,
    filter?: SubscriptionFilter
  ): () => void {
    const listener = (notification: NotificationEvent) => {
      if (!filter) {
        callback(notification);
        return;
      }

      // Apply filter
      if (filter.types && !filter.types.includes(notification.type)) {
        return;
      }
      if (filter.severities && !filter.severities.includes(notification.severity)) {
        return;
      }
      if (filter.sources && notification.source && !filter.sources.includes(notification.source)) {
        return;
      }

      callback(notification);
    };

    this.on('notification', listener);

    // Return unsubscribe function
    return () => {
      this.off('notification', listener);
    };
  }

  // Convenience methods for common notification types
  public notifyAgentEvent(
    agentName: string,
    event: 'started' | 'stopped' | 'error' | 'configured',
    details?: string,
    metadata?: Record<string, any>
  ): string {
    const severityMap = {
      started: 'success' as const,
      stopped: 'info' as const,
      error: 'error' as const,
      configured: 'info' as const,
    };

    return this.notify({
      type: 'agent',
      severity: severityMap[event],
      title: `Agent ${event}`,
      message: `Agent "${agentName}" ${event}${details ? `: ${details}` : ''}`,
      source: agentName,
      metadata: { agentName, event, ...metadata },
    });
  }

  public notifyMCPEvent(
    serverName: string,
    event: 'connected' | 'disconnected' | 'error' | 'tool_executed',
    details?: string,
    metadata?: Record<string, any>
  ): string {
    const severityMap = {
      connected: 'success' as const,
      disconnected: 'warning' as const,
      error: 'error' as const,
      tool_executed: 'info' as const,
    };

    return this.notify({
      type: 'mcp',
      severity: severityMap[event],
      title: `MCP Server ${event}`,
      message: `MCP server "${serverName}" ${event}${details ? `: ${details}` : ''}`,
      source: serverName,
      metadata: { serverName, event, ...metadata },
    });
  }

  public notifySystemEvent(
    event: 'startup' | 'shutdown' | 'config_reload' | 'error',
    details: string,
    metadata?: Record<string, any>
  ): string {
    const severityMap = {
      startup: 'success' as const,
      shutdown: 'info' as const,
      config_reload: 'info' as const,
      error: 'error' as const,
    };

    return this.notify({
      type: 'system',
      severity: severityMap[event],
      title: `System ${event}`,
      message: details,
      source: 'system',
      metadata: { event, ...metadata },
    });
  }

  public getStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: NotificationEvent[];
    unread: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let unread = 0;

    this.notifications.forEach((notification) => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      bySeverity[notification.severity] = (bySeverity[notification.severity] || 0) + 1;

      if (!notification.metadata?.read) {
        unread++;
      }
    });

    return {
      total: this.notifications.length,
      byType,
      bySeverity,
      recent: this.notifications.slice(0, 10),
      unread,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
