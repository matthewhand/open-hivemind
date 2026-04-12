import { EventEmitter } from 'events';
import * as prom from 'prom-client';

/**
 * Provider types supported by the system
 */
export type ProviderType =
  | 'discord'
  | 'slack'
  | 'mattermost'
  | 'openai'
  | 'flowise'
  | 'openwebui'
  | 'openswarm'
  | 'letta';

/**
 * Monitoring configuration
 */
export interface ProviderMonitoringConfig {
  intervalMs: number;
  historySize: number;
}

export interface MessageProviderMetrics {
  provider: ProviderType;
  messagesReceived: number;
  messagesSent: number;
  messagesFailed: number;
  averageResponseTime: number;
  lastMessageTime?: number;
  lastErrorTime?: number;
  rateLimitHits: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

export interface LlmProviderMetrics {
  provider: ProviderType;
  requestsTotal: number;
  requestsSuccessful: number;
  requestsFailed: number;
  tokensPrompt: number;
  tokensCompletion: number;
  tokensUsed: number;
  totalCost: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  lastRequestTime?: number;
  lastErrorTime?: number;
  rateLimitHits: number;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  modelName?: string;
  averageCost: number;
}

/**
 * Singleton collector for provider metrics
 */
export class ProviderMetricsCollector extends EventEmitter {
  private static instance: ProviderMetricsCollector;
  private config: ProviderMonitoringConfig;
  private messageProviders = new Map<ProviderType, MessageProviderMetrics>();
  private llmProviders = new Map<ProviderType, LlmProviderMetrics>();
  private responseTimes = new Map<ProviderType, number[]>();
  private latencyHistory = new Map<ProviderType, number[]>();
  private costHistory = new Map<ProviderType, number[]>();
  private monitoringIntervals = new Map<ProviderType, NodeJS.Timeout>();
  private isMonitoring = false;

  // Prometheus metrics
  private registry: prom.Registry;
  private messageStatus: prom.Gauge<string>;
  private messagesReceived: prom.Counter<string>;
  private messagesSent: prom.Counter<string>;
  private messagesFailed: prom.Counter<string>;
  private messageLatency: prom.Gauge<string>;
  
  private llmStatus: prom.Gauge<string>;
  private llmRequests: prom.Counter<string>;
  private llmTokens: prom.Counter<string>;
  private llmLatency: prom.Gauge<string>;
  private llmLatencyP95: prom.Gauge<string>;
  private llmCost: prom.Gauge<string>;

  private constructor(config: Partial<ProviderMonitoringConfig> = {}) {
    super();
    this.config = {
      intervalMs: config.intervalMs || 60000,
      historySize: config.historySize || 100,
    };

    this.registry = prom.register;
    
    // Initialize standard metrics
    this.messageStatus = new prom.Gauge({
      name: 'hivemind_message_provider_status',
      help: 'Status of message provider (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)',
      labelNames: ['provider']
    });

    this.messagesReceived = new prom.Counter({
      name: 'hivemind_messages_received_total',
      help: 'Total messages received',
      labelNames: ['provider']
    });

    this.messagesSent = new prom.Counter({
      name: 'hivemind_messages_sent_total',
      help: 'Total messages sent',
      labelNames: ['provider']
    });

    this.messagesFailed = new prom.Counter({
      name: 'hivemind_messages_failed_total',
      help: 'Total messages failed',
      labelNames: ['provider']
    });

    this.messageLatency = new prom.Gauge({
      name: 'hivemind_message_response_time_ms',
      help: 'Average response time in ms',
      labelNames: ['provider']
    });

    this.llmStatus = new prom.Gauge({
      name: 'hivemind_llm_provider_status',
      help: 'Status of LLM provider (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)',
      labelNames: ['provider']
    });

    this.llmRequests = new prom.Counter({
      name: 'hivemind_llm_requests_total',
      help: 'Total LLM requests',
      labelNames: ['provider', 'status']
    });

    this.llmTokens = new prom.Counter({
      name: 'hivemind_llm_tokens_total',
      help: 'Total tokens used',
      labelNames: ['provider', 'type']
    });

    this.llmLatency = new prom.Gauge({
      name: 'hivemind_llm_latency_ms',
      help: 'Average latency in ms',
      labelNames: ['provider']
    });

    this.llmLatencyP95 = new prom.Gauge({
      name: 'hivemind_llm_latency_p95_ms',
      help: 'P95 latency in ms',
      labelNames: ['provider']
    });

    this.llmCost = new prom.Gauge({
      name: 'hivemind_llm_cost_total_usd',
      help: 'Total cost in USD',
      labelNames: ['provider']
    });

    this.initializeProviders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ProviderMonitoringConfig>): ProviderMetricsCollector {
    if (!ProviderMetricsCollector.instance) {
      ProviderMetricsCollector.instance = new ProviderMetricsCollector(config);
      
      // Register for graceful shutdown
      try {
        const { ShutdownCoordinator } = require('../server/ShutdownCoordinator');
        ShutdownCoordinator.getInstance().registerService(ProviderMetricsCollector.instance);
      } catch (err) {
        // Fallback
      }
    }
    return ProviderMetricsCollector.instance;
  }

  /**
   * Initialize default providers
   */
  private initializeProviders(): void {
    const messageTypes: ProviderType[] = ['discord', 'slack', 'mattermost'];
    const llmTypes: ProviderType[] = ['openai', 'flowise', 'openwebui', 'openswarm', 'letta'];

    for (const type of messageTypes) {
      this.messageProviders.set(type, this.createDefaultMessageMetrics(type));
      this.messageStatus.set({ provider: type }, 0);
    }

    for (const type of llmTypes) {
      this.llmProviders.set(type, this.createDefaultLlmMetrics(type));
      this.llmStatus.set({ provider: type }, 0);
    }
  }

  /**
   * Create default message metrics
   */
  private createDefaultMessageMetrics(provider: ProviderType): MessageProviderMetrics {
    return {
      provider,
      messagesReceived: 0,
      messagesSent: 0,
      messagesFailed: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      status: 'unknown',
    };
  }

  /**
   * Create default LLM metrics
   */
  private createDefaultLlmMetrics(provider: ProviderType): LlmProviderMetrics {
    return {
      provider,
      requestsTotal: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      tokensPrompt: 0,
      tokensCompletion: 0,
      tokensUsed: 0,
      totalCost: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      rateLimitHits: 0,
      errorRate: 0,
      status: 'unknown',
      averageCost: 0,
    };
  }

  /**
   * Record message received
   */
  recordMessageReceived(provider: ProviderType): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.messagesReceived++;
      metrics.lastMessageTime = Date.now();
      this.messagesReceived.inc({ provider });
      this.updateStatus(provider, 'message');
      this.emit('messageReceived', { provider, metrics: { ...metrics } });
    }
  }

  /**
   * Record message sent
   */
  recordMessageSent(provider: ProviderType, responseTime?: number): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.messagesSent++;
      metrics.lastMessageTime = Date.now();
      this.messagesSent.inc({ provider });
      if (responseTime !== undefined) {
        this.recordResponseTime(provider, responseTime);
      }
      this.updateStatus(provider, 'message');
      this.emit('messageSent', { provider, metrics: { ...metrics } });
    }
  }

  /**
   * Record message failure
   */
  recordMessageFailure(provider: ProviderType): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.messagesFailed++;
      metrics.lastErrorTime = Date.now();
      this.messagesFailed.inc({ provider });
      this.updateStatus(provider, 'message');
      this.emit('messageFailure', { provider, metrics: { ...metrics } });
    }
  }

  /**
   * Record LLM request
   */
  recordLlmRequest(
    provider: ProviderType,
    latency: number,
    tokens: { prompt?: number; completion?: number; total?: number },
    cost?: number,
    success: boolean = true,
    modelName?: string
  ): void {
    const metrics = this.llmProviders.get(provider);
    if (metrics) {
      metrics.requestsTotal++;
      if (success) {
        metrics.requestsSuccessful++;
        this.llmRequests.inc({ provider, status: 'success' });
      } else {
        metrics.requestsFailed++;
        this.llmRequests.inc({ provider, status: 'failure' });
      }

      if (tokens.prompt) {
        metrics.tokensPrompt += tokens.prompt;
        this.llmTokens.inc({ provider, type: 'prompt' }, tokens.prompt);
      }
      if (tokens.completion) {
        metrics.tokensCompletion += tokens.completion;
        this.llmTokens.inc({ provider, type: 'completion' }, tokens.completion);
      }
      if (tokens.total) {
        metrics.tokensUsed += tokens.total;
      }
      
      if (cost !== undefined) {
        metrics.totalCost += cost;
        metrics.averageCost = metrics.totalCost / metrics.requestsTotal;
        this.llmCost.set({ provider }, metrics.totalCost);
      }

      metrics.lastRequestTime = Date.now();
      if (!success) {
        metrics.lastErrorTime = Date.now();
      }

      this.recordLatency(provider, latency);
      this.updateErrorRateLLM(provider);

      if (modelName) {
        metrics.modelName = modelName;
      }

      this.updateStatus(provider, 'llm');

      this.emit('llmRequest', {
        provider,
        latency,
        tokens,
        cost,
        success,
        metrics: { ...metrics },
      });
    }
  }

  /**
   * Record response time for message provider
   */
  private recordResponseTime(provider: ProviderType, responseTime: number): void {
    let times = this.responseTimes.get(provider);
    if (!times) {
      times = [];
      this.responseTimes.set(provider, times);
    }
    times.push(responseTime);
    if (times.length > this.config.historySize) {
      times.shift();
    }

    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.averageResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
      this.messageLatency.set({ provider }, metrics.averageResponseTime);
    }
  }

  /**
   * Record latency for LLM provider
   */
  private recordLatency(provider: ProviderType, latency: number): void {
    let latencies = this.latencyHistory.get(provider);
    if (!latencies) {
      latencies = [];
      this.latencyHistory.set(provider, latencies);
    }
    latencies.push(latency);
    if (latencies.length > this.config.historySize) {
      latencies.shift();
    }

    const metrics = this.llmProviders.get(provider);
    if (metrics && latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      metrics.p50Latency = this.percentile(sorted, 50);
      metrics.p95Latency = this.percentile(sorted, 95);
      metrics.p99Latency = this.percentile(sorted, 99);
      
      this.llmLatency.set({ provider }, metrics.averageLatency);
      this.llmLatencyP95.set({ provider }, metrics.p95Latency);
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Update error rate for LLM provider
   */
  private updateErrorRateLLM(provider: ProviderType): void {
    const metrics = this.llmProviders.get(provider);
    if (metrics && metrics.requestsTotal > 0) {
      metrics.errorRate = metrics.requestsFailed / metrics.requestsTotal;
    }
  }

  /**
   * Update status based on error rates and last active times
   */
  private updateStatus(provider: ProviderType, type: 'message' | 'llm'): void {
    if (type === 'message') {
      const metrics = this.messageProviders.get(provider);
      if (metrics) {
        const errorRate =
          metrics.messagesSent > 0 ? metrics.messagesFailed / metrics.messagesSent : 0;
        if (errorRate > 0.5) metrics.status = 'unhealthy';
        else if (errorRate > 0.1) metrics.status = 'degraded';
        else metrics.status = 'healthy';
        
        const statusValue = metrics.status === 'healthy' ? 1 : metrics.status === 'degraded' ? 2 : 3;
        this.messageStatus.set({ provider }, statusValue);
      }
    } else {
      const metrics = this.llmProviders.get(provider);
      if (metrics) {
        if (metrics.errorRate > 0.5) metrics.status = 'unhealthy';
        else if (metrics.errorRate > 0.1) metrics.status = 'degraded';
        else metrics.status = 'healthy';
        
        const statusValue = metrics.status === 'healthy' ? 1 : metrics.status === 'degraded' ? 2 : 3;
        this.llmStatus.set({ provider }, statusValue);
      }
    }
  }

  /**
   * Get all message provider metrics
   */
  getMessageProviderMetrics(): MessageProviderMetrics[] {
    return Array.from(this.messageProviders.values());
  }

  /**
   * Get all LLM provider metrics
   */
  getLlmProviderMetrics(): LlmProviderMetrics[] {
    return Array.from(this.llmProviders.values());
  }

  /**
   * Get specific message provider metrics
   */
  getMessageMetrics(provider: ProviderType): MessageProviderMetrics | undefined {
    return this.messageProviders.get(provider);
  }

  /**
   * Get specific LLM provider metrics
   */
  getLlmMetrics(provider: ProviderType): LlmProviderMetrics | undefined {
    return this.llmProviders.get(provider);
  }

  /**
   * Start monitoring all providers
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring all providers
   */
  stopMonitoring(): void {
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
    this.isMonitoring = false;
    this.emit('monitoringStopped');
  }

  /**
   * Reset metrics for a provider
   */
  resetProviderMetrics(provider: ProviderType, type: 'message' | 'llm'): void {
    if (type === 'message') {
      this.messageProviders.set(provider, this.createDefaultMessageMetrics(provider));
      this.responseTimes.delete(provider);
    } else {
      this.llmProviders.set(provider, this.createDefaultLlmMetrics(provider));
      this.latencyHistory.delete(provider);
      this.costHistory.delete(provider);
    }
    this.emit('metricsReset', { provider, type });
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.initializeProviders();
    this.responseTimes.clear();
    this.latencyHistory.clear();
    this.costHistory.clear();
    this.emit('allMetricsReset');
  }

  /**
   * Get Prometheus format metrics
   */
  async getPrometheusFormat(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Graceful shutdown support
   */
  public async shutdown(): Promise<void> {
    this.stopMonitoring();
    this.registry.clear();
  }
}

export default ProviderMetricsCollector;
