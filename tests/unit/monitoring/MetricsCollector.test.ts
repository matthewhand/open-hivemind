import { MetricsCollector } from '@src/monitoring/MetricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = MetricsCollector.getInstance();
  });

  test('should increment message count', () => {
    const initial = collector.getMetrics().messagesProcessed;
    collector.incrementMessages();
    expect(collector.getMetrics().messagesProcessed).toBe(initial + 1);
  });

  test('should record response time', () => {
    collector.recordResponseTime(100);
    const metrics = collector.getMetrics();
    expect(metrics.responseTime).toContain(100);
  });

  test('should generate Prometheus format', () => {
    const prometheus = collector.getPrometheusFormat();
    expect(prometheus).toContain('hivemind_messages_total');
    expect(prometheus).toContain('hivemind_uptime_seconds');
  });
});