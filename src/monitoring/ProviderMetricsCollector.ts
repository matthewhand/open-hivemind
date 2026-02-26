import { EventEmitter } from 'events';

/**
 * Provider types supported by the system
 */
export type ProviderType = 'discord' | 'slack' | 'mattermost' | 'openai' | 'flowise' | 'openwebui' | 'openswarm' | 'perplexity' | 'replicate' | 'n8n';

/**
 * Status of a provider
 */
export type ProviderStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Message provider metrics
 */
export interface MessageProviderMetrics {
  provider: ProviderType;
  status: ProviderStatus;
  messagesReceived: number;
  messagesSent: number;
  messagesFailed: number;
  averageResponseTime: number;
  lastMessageTime: number | null;
  lastErrorTime: number | null;
  errorRate: number;
  uptime: number;
  activeConnections: number;
  rateLimitHits: number;
  rateLimitRemaining: number;
}

/**
 * LLM provider metrics
 */
export interface LlmProviderMetrics {
  provider: ProviderType;
  status: ProviderStatus;
  requestsTotal: number;
  requestsSuccessful: number;
  requestsFailed: number;
  tokensUsed: number;
  tokensPrompt: number;
  tokensCompletion: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  averageCost: number;
  totalCost: number;
  lastRequestTime: number | null;
  lastErrorTime: number | null;
  errorRate: number;
  rateLimitHits: number;
  rateLimitRemaining: number;
  contextLength: number;
  modelName: string;
}

/**
 * Combined provider metrics
 */
export interface ProviderMetrics {
  type: 'message' | 'llm';
  messageProvider?: MessageProviderMetrics;
  llmProvider?: LlmProviderMetrics;
  timestamp: number;
}

/**
 * Provider health configuration
 */
export interface ProviderHealthConfig {
  provider: ProviderType;
  type: 'message' | 'llm';
  enabled: boolean;
  checkInterval: number;
  timeout: number;
  retries: number;
  consecutiveFailuresThreshold: number;
}

/**
 * Configuration for provider monitoring
 */
export interface ProviderMonitoringConfig {
  providers: ProviderHealthConfig[];
  historySize: number;
  aggregationInterval: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProviderMonitoringConfig = {
  providers: [
    { provider: 'discord', type: 'message', enabled: true, checkInterval: 30000, timeout: 5000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'slack', type: 'message', enabled: true, checkInterval: 30000, timeout: 5000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'mattermost', type: 'message', enabled: true, checkInterval: 30000, timeout: 5000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'openai', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'flowise', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'openwebui', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'openswarm', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'perplexity', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'replicate', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
    { provider: 'n8n', type: 'llm', enabled: true, checkInterval: 60000, timeout: 10000, retries: 3, consecutiveFailuresThreshold: 5 },
  ],
  historySize: 1000,
  aggregationInterval: 60000,
};

/**
 * ProviderMetricsCollector - Comprehensive metrics collection for all providers
 */
export class ProviderMetricsCollector extends EventEmitter {
  private static instance: ProviderMetricsCollector;
  private messageProviders: Map<ProviderType, MessageProviderMetrics> = new Map();
  private llmProviders: Map<ProviderType, LlmProviderMetrics> = new Map();
  private config: ProviderMonitoringConfig;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isMonitoring = false;
  private responseTimes: Map<ProviderType, number[]> = new Map();
  private latencyHistory: Map<ProviderType, number[]> = new Map();
  private costHistory: Map<ProviderType, number[]> = new Map();

  private constructor(config: Partial<ProviderMonitoringConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeProviders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ProviderMonitoringConfig>): ProviderMetricsCollector {
    if (!ProviderMetricsCollector.instance) {
      ProviderMetricsCollector.instance = new ProviderMetricsCollector(config);
    }
    return ProviderMetricsCollector.instance;
  }

  /**
   * Initialize all providers with default metrics
   */
  private initializeProviders(): void {
    // Initialize message providers
    const messageProviderTypes: ProviderType[] = ['discord', 'slack', 'mattermost'];
    for (const provider of messageProviderTypes) {
      this.messageProviders.set(provider, this.createDefaultMessageMetrics(provider));
    }

    // Initialize LLM providers
    const llmProviderTypes: ProviderType[] = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];
    for (const provider of llmProviderTypes) {
      this.llmProviders.set(provider, this.createDefaultLlmMetrics(provider));
    }
  }

  /**
   * Create default message provider metrics
   */
  private createDefaultMessageMetrics(provider: ProviderType): MessageProviderMetrics {
    return {
      provider,
      status: 'unknown',
      messagesReceived: 0,
      messagesSent: 0,
      messagesFailed: 0,
      averageResponseTime: 0,
      lastMessageTime: null,
      lastErrorTime: null,
      errorRate: 0,
      uptime: 0,
      activeConnections: 0,
      rateLimitHits: 0,
      rateLimitRemaining: -1,
    };
  }

  /**
   * Create default LLM provider metrics
   */
  private createDefaultLlmMetrics(provider: ProviderType): LlmProviderMetrics {
    return {
      provider,
      status: 'unknown',
      requestsTotal: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      tokensUsed: 0,
      tokensPrompt: 0,
      tokensCompletion: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      averageCost: 0,
      totalCost: 0,
      lastRequestTime: null,
      lastErrorTime: null,
      errorRate: 0,
      rateLimitHits: 0,
      rateLimitRemaining: -1,
      contextLength: 0,
      modelName: '',
    };
  }

  /**
   * Record message received
   */
  recordMessageReceived(provider: ProviderType, responseTime?: number): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.messagesReceived++;
      metrics.lastMessageTime = Date.now();
      if (responseTime !== undefined) {
        this.recordResponseTime(provider, responseTime);
      }
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
      if (responseTime !== undefined) {
        this.recordResponseTime(provider, responseTime);
      }
      this.emit('messageSent', { provider, metrics: { ...metrics } });
    }
  }

  /**
   * Record message failure
   */
  recordMessageFailed(provider: ProviderType, error?: string): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.messagesFailed++;
      metrics.lastErrorTime = Date.now();
      this.updateErrorRate(provider);
      this.emit('messageFailed', { provider, error, metrics: { ...metrics } });
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
      } else {
        metrics.requestsFailed++;
      }

      if (tokens.prompt) metrics.tokensPrompt += tokens.prompt;
      if (tokens.completion) metrics.tokensCompletion += tokens.completion;
      if (tokens.total) metrics.tokensUsed += tokens.total;
      if (cost !== undefined) {
        metrics.totalCost += cost;
        metrics.averageCost = metrics.totalCost / metrics.requestsTotal;
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

      this.emit('llmRequest', { provider, latency, tokens, cost, success, metrics: { ...metrics } });
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
   * Update error rate for message provider
   */
  private updateErrorRate(provider: ProviderType): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      const total = metrics.messagesReceived + metrics.messagesSent + metrics.messagesFailed;
      if (total > 0) {
        metrics.errorRate = (metrics.messagesFailed / total) * 100;
      }
      this.updateProviderStatus(provider);
    }
  }

  /**
   * Update error rate for LLM provider
   */
  private updateErrorRateLLM(provider: ProviderType): void {
    const metrics = this.llmProviders.get(provider);
    if (metrics && metrics.requestsTotal > 0) {
      metrics.errorRate = (metrics.requestsFailed / metrics.requestsTotal) * 100;
      this.updateProviderStatusLLM(provider);
    }
  }

  /**
   * Update message provider status based on metrics
   */
  private updateProviderStatus(provider: ProviderType): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      if (metrics.errorRate > 50 || metrics.messagesFailed > 100) {
        metrics.status = 'unhealthy';
      } else if (metrics.errorRate > 10 || metrics.messagesFailed > 10) {
        metrics.status = 'degraded';
      } else if (metrics.messagesReceived > 0 || metrics.messagesSent > 0) {
        metrics.status = 'healthy';
      } else {
        metrics.status = 'unknown';
      }
    }
  }

  /**
   * Update LLM provider status based on metrics
   */
  private updateProviderStatusLLM(provider: ProviderType): void {
    const metrics = this.llmProviders.get(provider);
    if (metrics) {
      if (metrics.errorRate > 50 || metrics.requestsFailed > 100) {
        metrics.status = 'unhealthy';
      } else if (metrics.errorRate > 10 || metrics.requestsFailed > 10) {
        metrics.status = 'degraded';
      } else if (metrics.requestsTotal > 0) {
        metrics.status = 'healthy';
      } else {
        metrics.status = 'unknown';
      }
    }
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(provider: ProviderType, type: 'message' | 'llm'): void {
    if (type === 'message') {
      const metrics = this.messageProviders.get(provider);
      if (metrics) {
        metrics.rateLimitHits++;
        this.emit('rateLimitHit', { provider, type: 'message', metrics: { ...metrics } });
      }
    } else {
      const metrics = this.llmProviders.get(provider);
      if (metrics) {
        metrics.rateLimitHits++;
        this.emit('rateLimitHit', { provider, type: 'llm', metrics: { ...metrics } });
      }
    }
  }

  /**
   * Update rate limit remaining
   */
  updateRateLimitRemaining(provider: ProviderType, remaining: number, type: 'message' | 'llm'): void {
    if (type === 'message') {
      const metrics = this.messageProviders.get(provider);
      if (metrics) {
        metrics.rateLimitRemaining = remaining;
      }
    } else {
      const metrics = this.llmProviders.get(provider);
      if (metrics) {
        metrics.rateLimitRemaining = remaining;
      }
    }
  }

  /**
   * Update active connections
   */
  updateActiveConnections(provider: ProviderType, connections: number): void {
    const metrics = this.messageProviders.get(provider);
    if (metrics) {
      metrics.activeConnections = connections;
    }
  }

  /**
   * Set provider status directly
   */
  setProviderStatus(provider: ProviderType, status: ProviderStatus, type: 'message' | 'llm'): void {
    if (type === 'message') {
      const metrics = this.messageProviders.get(provider);
      if (metrics) {
        metrics.status = status;
      }
    } else {
      const metrics = this.llmProviders.get(provider);
      if (metrics) {
        metrics.status = status;
      }
    }
    this.emit('statusChange', { provider, status, type });
  }

  /**
   * Get message provider metrics
   */
  getMessageProviderMetrics(provider: ProviderType): MessageProviderMetrics | undefined {
    return this.messageProviders.get(provider);
  }

  /**
   * Get LLM provider metrics
   */
  getLlmProviderMetrics(provider: ProviderType): LlmProviderMetrics | undefined {
    return this.llmProviders.get(provider);
  }

  /**
   * Get all message provider metrics
   */
  getAllMessageProviderMetrics(): MessageProviderMetrics[] {
    return Array.from(this.messageProviders.values());
  }

  /**
   * Get all LLM provider metrics
   */
  getAllLlmProviderMetrics(): LlmProviderMetrics[] {
    return Array.from(this.llmProviders.values());
  }

  /**
   * Get all provider metrics
   */
  getAllProviderMetrics(): ProviderMetrics[] {
    const metrics: ProviderMetrics[] = [];
    const timestamp = Date.now();

    for (const [provider, messageMetrics] of this.messageProviders) {
      metrics.push({
        type: 'message',
        messageProvider: { ...messageMetrics },
        timestamp,
      });
    }

    for (const [provider, llmMetrics] of this.llmProviders) {
      metrics.push({
        type: 'llm',
        llmProvider: { ...llmMetrics },
        timestamp,
      });
    }

    return metrics;
  }

  /**
   * Get provider summary for dashboard
   */
  getProviderSummary(): {
    messageProviders: MessageProviderMetrics[];
    llmProviders: LlmProviderMetrics[];
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    totalMessagesProcessed: number;
    totalLlmRequests: number;
  } {
    const messageProviders = this.getAllMessageProviderMetrics();
    const llmProviders = this.getAllLlmProviderMetrics();

    const totalMessagesProcessed = messageProviders.reduce((sum, p) => sum + p.messagesReceived + p.messagesSent, 0);
    const totalLlmRequests = llmProviders.reduce((sum, p) => sum + p.requestsTotal, 0);

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const allStatuses = [...messageProviders.map(p => p.status), ...llmProviders.map(p => p.status)];
    if (allStatuses.includes('unhealthy')) {
      overallHealth = 'unhealthy';
    } else if (allStatuses.includes('degraded')) {
      overallHealth = 'degraded';
    }

    return {
      messageProviders,
      llmProviders,
      overallHealth,
      totalMessagesProcessed,
      totalLlmRequests,
    };
  }

  /**
   * Start monitoring all enabled providers
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    for (const providerConfig of this.config.providers) {
      if (providerConfig.enabled) {
        this.startProviderMonitoring(providerConfig);
      }
    }

    this.emit('monitoringStarted');
  }

  /**
   * Start monitoring a specific provider
   */
  private startProviderMonitoring(config: ProviderHealthConfig): void {
    const intervalKey = `${config.provider}_${config.type}`;
    
    // Clear existing interval if any
    const existing = this.monitoringIntervals.get(intervalKey);
    if (existing) {
      clearInterval(existing);
    }

    const interval = setInterval(() => {
      this.checkProviderHealth(config);
    }, config.checkInterval);

    this.monitoringIntervals.set(intervalKey, interval);
  }

  /**
   * Check provider health
   */
  private checkProviderHealth(config: ProviderHealthConfig): void {
    if (config.type === 'message') {
      const metrics = this.messageProviders.get(config.provider);
      if (metrics) {
        this.updateProviderStatus(config.provider);
        this.emit('providerHealthCheck', {
          provider: config.provider,
          type: 'message',
          status: metrics.status,
          metrics: { ...metrics }
        });
      }
    } else {
      const metrics = this.llmProviders.get(config.provider);
      if (metrics) {
        this.updateProviderStatusLLM(config.provider);
        this.emit('providerHealthCheck', {
          provider: config.provider,
          type: 'llm',
          status: metrics.status,
          metrics: { ...metrics }
        });
      }
    }
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
  getPrometheusFormat(): string {
    let output = '';
    const timestamp = Date.now();

    // Message provider metrics
    for (const [provider, metrics] of this.messageProviders) {
      output += `# HELP hivemind_message_provider_status Status of message provider (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)\n`;
      output += `# TYPE hivemind_message_provider_status gauge\n`;
      const statusValue = metrics.status === 'healthy' ? 1 : metrics.status === 'degraded' ? 2 : metrics.status === 'unhealthy' ? 3 : 0;
      output += `hivemind_message_provider_status{provider="${provider}"} ${statusValue} ${timestamp}\n`;
      
      output += `# HELP hivemind_messages_received Total messages received\n`;
      output += `# TYPE hivemind_messages_received counter\n`;
      output += `hivemind_messages_received{provider="${provider}"} ${metrics.messagesReceived} ${timestamp}\n`;
      
      output += `# HELP hivemind_messages_sent Total messages sent\n`;
      output += `# TYPE hivemind_messages_sent counter\n`;
      output += `hivemind_messages_sent{provider="${provider}"} ${metrics.messagesSent} ${timestamp}\n`;
      
      output += `# HELP hivemind_messages_failed Total messages failed\n`;
      output += `# TYPE hivemind_messages_failed counter\n`;
      output += `hivemind_messages_failed{provider="${provider}"} ${metrics.messagesFailed} ${timestamp}\n`;
      
      output += `# HELP hivemind_message_response_time Average response time in ms\n`;
      output += `# TYPE hivemind_message_response_time gauge\n`;
      output += `hivemind_message_response_time{provider="${provider}"} ${metrics.averageResponseTime} ${timestamp}\n`;
    }

    // LLM provider metrics
    for (const [provider, metrics] of this.llmProviders) {
      output += `# HELP hivemind_llm_provider_status Status of LLM provider (0=unknown, 1=healthy, 2=degraded, 3=unhealthy)\n`;
      output += `# TYPE hivemind_llm_provider_status gauge\n`;
      const statusValue = metrics.status === 'healthy' ? 1 : metrics.status === 'degraded' ? 2 : metrics.status === 'unhealthy' ? 3 : 0;
      output += `hivemind_llm_provider_status{provider="${provider}"} ${statusValue} ${timestamp}\n`;
      
      output += `# HELP hivemind_llm_requests_total Total LLM requests\n`;
      output += `# TYPE hivemind_llm_requests_total counter\n`;
      output += `hivemind_llm_requests_total{provider="${provider}"} ${metrics.requestsTotal} ${timestamp}\n`;
      
      output += `# HELP hivemind_llm_tokens_used Total tokens used\n`;
      output += `# TYPE hivemind_llm_tokens_used counter\n`;
      output += `hemind_llm_tokens_used{provider="${provider}"} ${metrics.tokensUsed} ${timestamp}\n`;
      
      output += `# HELP hivemind_llm_latency Average latency in ms\n`;
      output += `# TYPE hivemind_llm_latency gauge\n`;
      output += `hivemind_llm_latency{provider="${provider}"} ${metrics.averageLatency} ${timestamp}\n`;
      
      output += `# HELP hivemind_llm_latency_p95 P95 latency in ms\n`;
      output += `# TYPE hivemind_llm_latency_p95 gauge\n`;
      output += `hivemind_llm_latency_p95{provider="${provider}"} ${metrics.p95Latency} ${timestamp}\n`;
      
      output += `# HELP hivemind_llm_cost_total Total cost in USD\n`;
      output += `# TYPE hivemind_llm_cost_total gauge\n`;
      output += `hivemind_llm_cost_total{provider="${provider}"} ${metrics.totalCost} ${timestamp}\n`;
    }

    return output;
  }
}

export default ProviderMetricsCollector;
