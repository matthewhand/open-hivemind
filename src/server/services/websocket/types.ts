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
  /**
   * Display-only enrichment fields. Currently populated only by demo-mode
   * seeding (DemoActivitySimulator) so the Activity page's Conversations view
   * can render a readable transcript. Real pipeline events omit them — never
   * put real message content here without an explicit privacy decision.
   */
  userName?: string;
  channelName?: string;
  content?: string;
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

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'heal';
  category: 'lifecycle' | 'audit' | 'system';
  message: string;
  botName?: string;
  metadata?: Record<string, unknown>;
}
