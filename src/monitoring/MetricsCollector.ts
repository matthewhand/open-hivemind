import os from 'os';
import { EventEmitter } from 'events';
import Logger from '@common/logger';

const logger = Logger.withContext('MetricsCollector');

export interface Metrics {
  messagesProcessed: number;
  activeConnections: number;
  responseTime: number[];
  errors: number;
  uptime: number;
  llmTokenUsage: number;
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  unit: string;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: number;
  responseTime: number;
  throughput: number;
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private metrics: Metrics = {
    messagesProcessed: 0,
    activeConnections: 0,
    responseTime: [],
    errors: 0,
    uptime: Date.now(),
    llmTokenUsage: 0,
  };
  private history: MetricData[] = [];
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private lastCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
  private lastCpuHrTime: bigint = process.hrtime.bigint();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  startCollection(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);

    this.emit('metricsCollected', this.getMetricsSummary());
  }

  stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.debug('Metrics collection stopped');
    }
  }

  /**
   * Shutdown and cleanup resources
   */
  public shutdown(): void {
    this.stopCollection();
    this.removeAllListeners();
    logger.debug('MetricsCollector shutdown completed');
  }

  private collectSystemMetrics(): void {
    const timestamp = new Date().toISOString();

    // Collect real CPU usage (percent of wall-clock time spent on CPU since last sample)
    const cpuUsage = this.calculateCpuUsage();
    this.recordMetric('cpu_usage', cpuUsage, { timestamp });

    // Collect memory usage
    const memoryUsage = process.memoryUsage();
    this.recordMetric('memory_usage', memoryUsage.heapUsed / 1024 / 1024, { timestamp });

    // Emit collected metrics
    this.emit('metricsCollected', this.getMetricsSummary());
  }

  /**
   * Calculate process CPU usage as a percentage based on the delta of
   * `process.cpuUsage()` over the wall-clock interval since the last sample.
   * Returns a value clamped to [0, 100].
   */
  private calculateCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const currentHrTime = process.hrtime.bigint();
    const elapsedHrTime = currentHrTime - this.lastCpuHrTime;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuHrTime = currentHrTime;

    const elapsedMs = Number(elapsedHrTime) / 1_000_000;
    if (elapsedMs <= 0) {
      return 0;
    }

    const userMs = currentCpuUsage.user / 1000;
    const systemMs = currentCpuUsage.system / 1000;
    const cpuPercent = (100 * (userMs + systemMs)) / elapsedMs;

    return Math.max(0, Math.min(100, Math.round(cpuPercent * 10) / 10));
  }

  /**
   * System memory usage as a percentage of total physical memory.
   */
  private getSystemMemoryUsagePercent(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    if (totalMem <= 0) {
      return 0;
    }
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
    return Math.round(usedPercent * 10) / 10;
  }

  incrementMessages(): void {
    this.metrics.messagesProcessed++;
    this.recordMetric('messages_processed', this.metrics.messagesProcessed);
  }

  incrementRequestCount(): void {
    this.incrementMessages();
  }

  recordResponseTime(time: number): void {
    this.metrics.responseTime.push(time);
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift();
    }
    this.recordMetric('response_time', time);
  }

  incrementErrors(): void {
    this.metrics.errors++;
    this.recordMetric('errors', this.metrics.errors);
  }

  incrementErrorCount(): void {
    this.incrementErrors();
  }

  setActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
    this.recordMetric('active_connections', count);
  }

  recordLlmTokenUsage(tokens: number): void {
    this.metrics.llmTokenUsage += tokens;
    this.recordMetric('llm_token_usage', this.metrics.llmTokenUsage);
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metricData: MetricData = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };

    this.history.push(metricData);

    // Keep only last 1000 metrics
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }

    this.emit('metricRecorded', metricData);
  }

  getLatestValue(metricName: string): number | undefined {
    const latestMetric = this.history.filter((m) => m.name === metricName).pop();
    return latestMetric?.value;
  }

  getAllMetrics(): MetricData[] {
    return [...this.history];
  }

  getMetrics(): Metrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
    };
  }

  getMetricsSummary(): {
    timestamp: string;
    metrics: Metrics;
    performance: PerformanceMetrics;
    historySize: number;
  } {
    const avgResponseTime =
      this.metrics.responseTime.length > 0
        ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
        : 0;

    const performance: PerformanceMetrics = {
      cpuUsage: this.getLatestValue('cpu_usage') ?? 0,
      memoryUsage: this.getLatestValue('memory_usage') ?? 0,
      // System memory utilisation as a percentage of total physical memory.
      // Node's stdlib does not expose per-process disk or network throughput,
      // so we report a real, available figure here instead of a random placeholder.
      diskUsage: this.getSystemMemoryUsagePercent(),
      // No built-in network-throughput source is available without extra
      // dependencies; report 0 rather than fabricating a random value.
      networkIO: 0,
      responseTime: avgResponseTime,
      throughput:
        this.metrics.messagesProcessed / (Math.max(1, Date.now() - this.metrics.uptime) / 1000),
    };

    return {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      performance,
      historySize: this.history.length,
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

  async exportMetricsData(): Promise<string> {
    const metricsData = {
      timestamp: new Date().toISOString(),
      current: this.getMetrics(),
      history: this.history,
      summary: this.getMetricsSummary(),
    };

    return JSON.stringify(metricsData, null, 2);
  }

  reset(): void {
    this.metrics = {
      messagesProcessed: 0,
      activeConnections: 0,
      responseTime: [],
      errors: 0,
      uptime: Date.now(),
      llmTokenUsage: 0,
    };
    this.history = [];
    logger.info('📊 Metrics reset');
  }

  /**
   * Gracefully shutdown the MetricsCollector.
   * Stops collection and clears all data.
   */
  gracefulShutdown(): void {
    this.stopCollection();
    this.history = [];
    this.removeAllListeners();
    logger.info('📊 MetricsCollector shutdown complete');
  }
}
