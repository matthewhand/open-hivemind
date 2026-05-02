import { MetricCalculator } from '../../../src/server/services/websocket/broadcast/MetricCalculator';
import type {
  MessageFlowEvent,
  PerformanceMetric,
} from '../../../src/server/services/websocket/types';

function makeEvent(overrides: Partial<MessageFlowEvent> = {}): MessageFlowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    botName: 'TestBot',
    provider: 'discord',
    channelId: 'channel-1',
    userId: 'user-1',
    messageType: 'outgoing',
    contentLength: 50,
    processingTime: 200,
    status: 'success',
    ...overrides,
  };
}

describe('MetricCalculator', () => {
  let calculator: MetricCalculator;

  beforeEach(() => {
    calculator = new MetricCalculator();
  });

  describe('updateRateHistory', () => {
    it('should update message rate and error rate histories', () => {
      const now = new Date();
      const events: MessageFlowEvent[] = [
        makeEvent({ timestamp: new Date(now.getTime() - 10000).toISOString(), status: 'success' }),
        makeEvent({ timestamp: new Date(now.getTime() - 5000).toISOString(), status: 'success' }),
        makeEvent({ timestamp: new Date(now.getTime() - 2000).toISOString(), status: 'error' }),
        makeEvent({ timestamp: new Date(now.getTime() - 1000).toISOString(), status: 'success' }),
        makeEvent({ timestamp: new Date(now.getTime() - 500).toISOString(), status: 'error' }),
      ];

      calculator.updateRateHistory(events);

      const msgRate = calculator.getMessageRateHistory();
      const errRate = calculator.getErrorRateHistory();
      // Should have pushed 1 entry (60 entries shifted, new entry pushed)
      expect(msgRate[msgRate.length - 1]).toBe(5);
      expect(errRate[errRate.length - 1]).toBe(2);
    });

    it('should only count events within the last 60 seconds', () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 120000).toISOString(); // 2 min ago
      const recentTime = new Date(now.getTime() - 10000).toISOString();

      const events: MessageFlowEvent[] = [
        makeEvent({ timestamp: oldTime }),
        makeEvent({ timestamp: oldTime }),
        makeEvent({ timestamp: recentTime, status: 'error' }),
      ];

      calculator.updateRateHistory(events);

      const msgRate = calculator.getMessageRateHistory();
      expect(msgRate[msgRate.length - 1]).toBe(1);
    });
  });

  describe('calculateSystemMetric', () => {
    it('should return a performance metric with expected shape', () => {
      const metric = calculator.calculateSystemMetric(5);

      expect(metric.timestamp).toBeDefined();
      expect(typeof metric.cpuUsage).toBe('number');
      expect(typeof metric.memoryUsage).toBe('number');
      expect(typeof metric.activeConnections).toBe('number');
      expect(metric.activeConnections).toBe(5);
      expect(typeof metric.messageRate).toBe('number');
      expect(typeof metric.errorRate).toBe('number');
      expect(typeof metric.responseTime).toBe('number');
    });

    it('should store metrics in performance history', () => {
      calculator.calculateSystemMetric(0);
      calculator.calculateSystemMetric(10);

      const metrics = calculator.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(2);
    });

    it('should cap performance metrics at 360 entries', () => {
      for (let i = 0; i < 400; i++) {
        calculator.calculateSystemMetric(i);
      }
      expect(calculator.getPerformanceMetrics(400).length).toBe(360);
    });
  });

  describe('calculateCpuUsage', () => {
    it('should return a number between 0 and 100', () => {
      const cpu = calculator.calculateCpuUsage();
      expect(typeof cpu).toBe('number');
      expect(cpu).toBeGreaterThanOrEqual(0);
      expect(cpu).toBeLessThanOrEqual(100);
    });

    it('should produce different values after multiple calls (or handle zero diff gracefully)', () => {
      const cpu1 = calculator.calculateCpuUsage();
      const cpu2 = calculator.calculateCpuUsage();
      // Both should be valid numbers; rapid-fire may produce near-zero diffs
      expect(typeof cpu1).toBe('number');
      expect(typeof cpu2).toBe('number');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should respect the limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        calculator.calculateSystemMetric(i);
      }

      expect(calculator.getPerformanceMetrics(5).length).toBe(5);
      expect(calculator.getPerformanceMetrics(100).length).toBe(20);
    });

    it('should return empty array when no metrics have been calculated', () => {
      expect(calculator.getPerformanceMetrics()).toEqual([]);
    });
  });

  describe('getMessageRateHistory', () => {
    it('should return a copy of the history array', () => {
      const history = calculator.getMessageRateHistory();
      const history2 = calculator.getMessageRateHistory();
      expect(history).toEqual(history2);
      // Mutating returned array should not affect internal state
      history.push(999);
      expect(calculator.getMessageRateHistory()).not.toContain(999);
    });
  });

  describe('getErrorRateHistory', () => {
    it('should return a copy of the history array', () => {
      const history = calculator.getErrorRateHistory();
      history.push(999);
      expect(calculator.getErrorRateHistory()).not.toContain(999);
    });
  });
});
