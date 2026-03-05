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
