import { ProviderMetricsCollector, MetricNames } from '../../../src/monitoring/ProviderMetricsCollector';

describe('ProviderMetricsCollector - Prometheus Export', () => {
  let collector: ProviderMetricsCollector;

  beforeEach(() => {
    // Reset instance for clean state
    (ProviderMetricsCollector as any).instance = undefined;
    collector = ProviderMetricsCollector.getInstance();
    collector.resetAllMetrics();
  });

  afterEach(() => {
    collector.stopMonitoring();
  });

  it('should format message provider metrics with correct MetricNames', () => {
    collector.recordMessageReceived('discord', 120);
    const prometheusFormat = collector.getPrometheusFormat();

    // Verify all message provider metrics are present
    expect(prometheusFormat).toContain(MetricNames.MESSAGE_PROVIDER_STATUS);
    expect(prometheusFormat).toContain(MetricNames.MESSAGES_RECEIVED);
    expect(prometheusFormat).toContain(MetricNames.MESSAGES_SENT);
    expect(prometheusFormat).toContain(MetricNames.MESSAGES_FAILED);
    expect(prometheusFormat).toContain(MetricNames.MESSAGE_RESPONSE_TIME);

    // Verify correct format
    expect(prometheusFormat).toMatch(new RegExp(`^# HELP ${MetricNames.MESSAGES_RECEIVED} Total messages received$`, 'm'));
    expect(prometheusFormat).toMatch(new RegExp(`^# TYPE ${MetricNames.MESSAGES_RECEIVED} counter$`, 'm'));
    expect(prometheusFormat).toMatch(new RegExp(`^${MetricNames.MESSAGES_RECEIVED}{provider="discord"} 1 \\d+$`, 'm'));
  });

  it('should format LLM provider metrics with correct MetricNames', () => {
    collector.recordLlmRequest('openai', 250, { prompt: 10, completion: 20, total: 30 }, 0.05, true, 'gpt-4');
    const prometheusFormat = collector.getPrometheusFormat();

    // Verify all LLM provider metrics are present
    expect(prometheusFormat).toContain(MetricNames.LLM_PROVIDER_STATUS);
    expect(prometheusFormat).toContain(MetricNames.LLM_REQUESTS_TOTAL);
    expect(prometheusFormat).toContain(MetricNames.LLM_TOKENS_USED);
    expect(prometheusFormat).toContain(MetricNames.LLM_LATENCY);
    expect(prometheusFormat).toContain(MetricNames.LLM_LATENCY_P95);
    expect(prometheusFormat).toContain(MetricNames.LLM_COST_TOTAL);

    // Verify correct format
    expect(prometheusFormat).toMatch(new RegExp(`^# HELP ${MetricNames.LLM_TOKENS_USED} Total tokens used$`, 'm'));
    expect(prometheusFormat).toMatch(new RegExp(`^# TYPE ${MetricNames.LLM_TOKENS_USED} counter$`, 'm'));
    expect(prometheusFormat).toMatch(new RegExp(`^${MetricNames.LLM_TOKENS_USED}{provider="openai"} 30 \\d+$`, 'm'));
  });
});
