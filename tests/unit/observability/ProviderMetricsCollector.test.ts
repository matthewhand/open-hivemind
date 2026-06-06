import {
  normalizeLlmProviderType,
  normalizeMessageProviderType,
  ProviderMetricsCollector,
} from '@src/monitoring/ProviderMetricsCollector';

describe('ProviderMetricsCollector', () => {
  let collector: ProviderMetricsCollector;

  beforeEach(() => {
    collector = ProviderMetricsCollector.getInstance();
    collector.resetAllMetrics();
  });

  describe('normalize helpers', () => {
    it('normalizes known message provider types case-insensitively', () => {
      expect(normalizeMessageProviderType('Discord')).toBe('discord');
      expect(normalizeMessageProviderType(' SLACK ')).toBe('slack');
      expect(normalizeMessageProviderType('mattermost')).toBe('mattermost');
    });

    it('returns undefined for untracked or invalid message providers', () => {
      expect(normalizeMessageProviderType('generic')).toBeUndefined();
      expect(normalizeMessageProviderType('openai')).toBeUndefined();
      expect(normalizeMessageProviderType(undefined)).toBeUndefined();
      expect(normalizeMessageProviderType(42)).toBeUndefined();
    });

    it('normalizes known LLM provider types', () => {
      expect(normalizeLlmProviderType('OpenAI')).toBe('openai');
      expect(normalizeLlmProviderType('flowise')).toBe('flowise');
      expect(normalizeLlmProviderType('letta')).toBe('letta');
    });

    it('returns undefined for untracked LLM providers', () => {
      expect(normalizeLlmProviderType('discord')).toBeUndefined();
      expect(normalizeLlmProviderType('nope')).toBeUndefined();
      expect(normalizeLlmProviderType(null)).toBeUndefined();
    });
  });

  describe('recordMessageReceived / Sent / Failure', () => {
    it('increments message counters and updates in-memory metrics', () => {
      collector.recordMessageReceived('discord');
      collector.recordMessageReceived('discord');
      collector.recordMessageSent('discord', 120);
      collector.recordMessageFailure('discord');

      const metrics = collector.getMessageMetrics('discord');
      expect(metrics).toBeDefined();
      expect(metrics!.messagesReceived).toBe(2);
      expect(metrics!.messagesSent).toBe(1);
      expect(metrics!.messagesFailed).toBe(1);
      expect(metrics!.averageResponseTime).toBe(120);
    });

    it('exposes message counters in Prometheus format', async () => {
      collector.recordMessageReceived('slack');
      collector.recordMessageSent('slack');

      const text = await collector.getPrometheusFormat();
      expect(text).toContain('hivemind_messages_received_total');
      expect(text).toMatch(/hivemind_messages_received_total\{provider="slack"\} 1/);
      expect(text).toMatch(/hivemind_messages_sent_total\{provider="slack"\} 1/);
    });
  });

  describe('recordLlmRequest', () => {
    it('records successful requests with tokens and latency', () => {
      collector.recordLlmRequest(
        'openai',
        250,
        { prompt: 10, completion: 20, total: 30 },
        0.01,
        true
      );

      const metrics = collector.getLlmMetrics('openai');
      expect(metrics).toBeDefined();
      expect(metrics!.requestsTotal).toBe(1);
      expect(metrics!.requestsSuccessful).toBe(1);
      expect(metrics!.requestsFailed).toBe(0);
      expect(metrics!.tokensPrompt).toBe(10);
      expect(metrics!.tokensCompletion).toBe(20);
      expect(metrics!.tokensUsed).toBe(30);
      expect(metrics!.averageLatency).toBe(250);
      expect(metrics!.totalCost).toBeCloseTo(0.01);
    });

    it('records failures and updates the error rate', () => {
      collector.recordLlmRequest('flowise', 100, {}, undefined, false);

      const metrics = collector.getLlmMetrics('flowise');
      expect(metrics!.requestsTotal).toBe(1);
      expect(metrics!.requestsFailed).toBe(1);
      expect(metrics!.errorRate).toBe(1);
    });

    it('exposes LLM counters in Prometheus format', async () => {
      collector.recordLlmRequest('openai', 250, { prompt: 5, total: 5 }, undefined, true);

      const text = await collector.getPrometheusFormat();
      expect(text).toMatch(/hivemind_llm_requests_total\{provider="openai",status="success"\} 1/);
      expect(text).toMatch(/hivemind_llm_tokens_total\{provider="openai",type="prompt"\} 5/);
    });
  });
});
