export interface MessageFlowEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider?: string;
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
  metadata?: Record<string, unknown>;
  acknowledgedAt?: string;
  resolvedAt?: string;
}
