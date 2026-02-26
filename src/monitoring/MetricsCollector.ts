import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

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
  private registry: Registry;
  private messagesProcessed: Counter<string>;
  private activeConnections: Gauge<string>;
  private responseTime: Histogram<string>;
  private errors: Counter<string>;
  private uptime: Gauge<string>;
  private llmTokenUsage: Counter<string>;

  private constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.messagesProcessed = new Counter({
      name: 'hivemind_messages_total',
      help: 'Total messages processed',
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'hivemind_active_connections',
      help: 'Current active connections',
      registers: [this.registry],
    });

    this.responseTime = new Histogram({
      name: 'hivemind_response_time_ms',
      help: 'Response time in milliseconds',
      registers: [this.registry],
    });

    this.errors = new Counter({
      name: 'hivemind_errors_total',
      help: 'Total errors encountered',
      registers: [this.registry],
    });

    this.uptime = new Gauge({
      name: 'hivemind_uptime_seconds',
      help: 'Uptime in seconds',
      registers: [this.registry],
    });

    this.llmTokenUsage = new Counter({
      name: 'hivemind_llm_token_usage_total',
      help: 'Total LLM token usage',
      registers: [this.registry],
    });

    this.startTime = Date.now();
    this.uptime.set(0); // Will be updated on query
    this.responseTimes = [];
  }

  private startTime: number;
  private responseTimes: number[] = [];

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  incrementMessages(): void {
    this.messagesProcessed.inc();
  }

  recordResponseTime(time: number): void {
    this.responseTime.observe(time);
    this.responseTimes.push(time);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  incrementErrors(): void {
    this.errors.inc();
  }

  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  recordLlmTokenUsage(tokens: number): void {
    this.llmTokenUsage.inc(tokens);
  }

  async getMetrics(): Promise<Metrics> {
    const currentUptime = Math.floor((Date.now() - this.startTime) / 1000);
    this.uptime.set(currentUptime);

    const messagesProcessedMetric = await this.messagesProcessed.get();
    const activeConnectionsMetric = await this.activeConnections.get();
    const errorsMetric = await this.errors.get();
    const llmTokenUsageMetric = await this.llmTokenUsage.get();

    return {
      messagesProcessed: (messagesProcessedMetric.values[0]?.value) || 0,
      activeConnections: (activeConnectionsMetric.values[0]?.value) || 0,
      responseTime: [...this.responseTimes],
      errors: (errorsMetric.values[0]?.value) || 0,
      uptime: currentUptime,
      llmTokenUsage: (llmTokenUsageMetric.values[0]?.value) || 0,
    };
  }

  async getPrometheusFormat(): Promise<string> {
    return await this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }
}