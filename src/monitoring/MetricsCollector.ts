export interface Metrics {
  messagesProcessed: number;
  activeConnections: number;
  responseTime: number[];
  errors: number;
  uptime: number;
  llmTokenUsage: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metrics = {
    messagesProcessed: 0,
    activeConnections: 0,
    responseTime: [],
    errors: 0,
    uptime: Date.now(),
    llmTokenUsage: 0,
  };

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  incrementMessages(): void {
    this.metrics.messagesProcessed++;
  }

  recordResponseTime(time: number): void {
    this.metrics.responseTime.push(time);
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift();
    }
  }

  incrementErrors(): void {
    this.metrics.errors++;
  }

  setActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  recordLlmTokenUsage(tokens: number): void {
    this.metrics.llmTokenUsage += tokens;
  }

  getMetrics(): Metrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
    };
  }

  getPrometheusFormat(): string {
    const m = this.getMetrics();
    const avgResponseTime =
      m.responseTime.length > 0
        ? m.responseTime.reduce((a, b) => a + b, 0) / m.responseTime.length
        : 0;

    return `# HELP hivemind_messages_total Total messages processed
# TYPE hivemind_messages_total counter
hivemind_messages_total ${m.messagesProcessed}

# HELP hivemind_active_connections Current active connections
# TYPE hivemind_active_connections gauge
hivemind_active_connections ${m.activeConnections}

# HELP hivemind_response_time_ms Average response time in milliseconds
# TYPE hivemind_response_time_ms gauge
hivemind_response_time_ms ${avgResponseTime}

# HELP hivemind_errors_total Total errors encountered
# TYPE hivemind_errors_total counter
hivemind_errors_total ${m.errors}

# HELP hivemind_uptime_seconds Uptime in seconds
# TYPE hivemind_uptime_seconds gauge
hivemind_uptime_seconds ${Math.floor(m.uptime / 1000)}

# HELP hivemind_llm_token_usage_total Total LLM token usage
# TYPE hivemind_llm_token_usage_total counter
hivemind_llm_token_usage_total ${m.llmTokenUsage}`;
  }
}