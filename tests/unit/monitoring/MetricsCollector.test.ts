import { MetricsCollector } from '@src/monitoring/MetricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    // Clear singleton instance for clean tests
    (MetricsCollector as any).instance = null;
    collector = MetricsCollector.getInstance();
  });

  afterEach(() => {
    // Clean up singleton instance
    (MetricsCollector as any).instance = null;
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should provide a single, stateful instance', () => {
      const instance1 = MetricsCollector.getInstance();
      instance1.incrementMessages();

      const instance2 = MetricsCollector.getInstance();
      expect(instance1).toBe(instance2);
      expect(instance2.getMetrics().messagesProcessed).toBe(1);
    });
  });

  describe('Message Counting', () => {
    it('should increment message count accurately', () => {
      const initialCount = collector.getMetrics().messagesProcessed;
      collector.incrementMessages();
      expect(collector.getMetrics().messagesProcessed).toBe(initialCount + 1);

      collector.incrementMessages();
      collector.incrementMessages();
      expect(collector.getMetrics().messagesProcessed).toBe(initialCount + 3);
    });

    it('should handle rapid increments without race conditions', () => {
      const increments = 1000;
      const initialCount = collector.getMetrics().messagesProcessed;
      for (let i = 0; i < increments; i++) {
        collector.incrementMessages();
      }
      expect(collector.getMetrics().messagesProcessed).toBe(initialCount + increments);
    });
  });

  describe('Response Time Recording', () => {
    test.each([
      { scenario: 'single time', times: [100] },
      { scenario: 'multiple times', times: [50, 150, 200] },
      { scenario: 'zero response time', times: [0] },
      { scenario: 'large response time', times: [999999] },
    ])('should record $scenario correctly', ({ times }) => {
      times.forEach((time) => collector.recordResponseTime(time));
      const metrics = collector.getMetrics();
      times.forEach((time) => {
        expect(metrics.responseTime).toContain(time);
      });
    });

    it('should maintain a history of response times', () => {
      const responseTimes = [10, 20, 30, 40, 50, 60];
      responseTimes.forEach((time) => collector.recordResponseTime(time));
      const metrics = collector.getMetrics();
      expect(metrics.responseTime.length).toBeGreaterThanOrEqual(responseTimes.length);
    });

    it('should cap response time history at 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        collector.recordResponseTime(i);
      }
      const metrics = collector.getMetrics();
      expect(metrics.responseTime.length).toBe(100);
      expect(metrics.responseTime[0]).toBe(50);
      expect(metrics.responseTime[99]).toBe(149);
    });
  });

  describe('Collection lifecycle', () => {
    it('starts collection once and emits metrics after interval tick', () => {
      jest.useFakeTimers();
      const emitSpy = jest.spyOn(collector, 'emit');

      collector.startCollection();
      collector.startCollection(); // no-op while already collecting

      // immediate emit on start
      expect(emitSpy).toHaveBeenCalledWith('metricsCollected', expect.any(Object));

      jest.advanceTimersByTime(5000);
      expect(emitSpy).toHaveBeenCalledWith('metricsCollected', expect.any(Object));

      collector.stopCollection();
      const callCountAtStop = emitSpy.mock.calls.length;
      jest.advanceTimersByTime(10000);
      expect(emitSpy.mock.calls.length).toBe(callCountAtStop);
    });

    it('shutdown stops collection and removes listeners', () => {
      jest.useFakeTimers();
      const listener = jest.fn();
      collector.on('metricRecorded', listener);

      collector.startCollection();
      collector.shutdown();

      expect(collector.listenerCount('metricRecorded')).toBe(0);
      const emitSpy = jest.spyOn(collector, 'emit');
      jest.advanceTimersByTime(5000);
      expect(emitSpy).not.toHaveBeenCalledWith('metricsCollected', expect.anything());
    });
  });

  describe('History and export', () => {
    it('caps generic metric history at 1000 entries', () => {
      for (let i = 0; i < 1200; i++) {
        collector.recordMetric('x_metric', i);
      }

      const all = collector.getAllMetrics();
      expect(all.length).toBe(1000);
      expect(all[0].value).toBe(200);
      expect(all[999].value).toBe(1199);
    });

    it('exports metrics data as valid JSON with expected keys', async () => {
      collector.incrementMessages();
      collector.recordResponseTime(123);
      collector.incrementErrors();

      const raw = await collector.exportMetricsData();
      const parsed = JSON.parse(raw);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('current');
      expect(parsed).toHaveProperty('history');
      expect(parsed).toHaveProperty('summary');
      expect(parsed.current.messagesProcessed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Aliases and reset behavior', () => {
    it('alias methods incrementRequestCount and incrementErrorCount map correctly', () => {
      collector.incrementRequestCount();
      collector.incrementErrorCount();

      const metrics = collector.getMetrics();
      expect(metrics.messagesProcessed).toBe(1);
      expect(metrics.errors).toBe(1);
    });

    it('reset clears counters and history', () => {
      collector.incrementMessages();
      collector.incrementErrors();
      collector.recordResponseTime(5);
      collector.recordMetric('custom', 1);

      collector.reset();

      const metrics = collector.getMetrics();
      expect(metrics.messagesProcessed).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.responseTime).toEqual([]);
      expect(collector.getAllMetrics()).toEqual([]);
    });
  });

  describe('Error Tracking', () => {
    it('should handle error tracking', () => {
      const initial = collector.getMetrics().errors;
      collector.incrementErrors();
      const updatedMetrics = collector.getMetrics();
      expect(updatedMetrics.errors).toBe(initial + 1);
      expect(collector.getLatestValue('errors')).toBe(initial + 1);
      expect(
        collector.getAllMetrics().filter((entry) => entry.name === 'errors').length
      ).toBeGreaterThan(0);
      const summary = collector.getMetricsSummary();
      expect(summary.metrics.errors).toBeGreaterThanOrEqual(updatedMetrics.errors);
    });
  });

  describe('Prometheus Format', () => {
    it('should handle prometheus format', () => {
      // Generate Prometheus format
      const prometheus = collector.getPrometheusFormat();
      expect(prometheus).toContain('hivemind_messages_total');
      expect(prometheus).toContain('hivemind_uptime_seconds');

      // Include message count
      collector.incrementMessages();
      collector.incrementMessages();
      const prometheus2 = collector.getPrometheusFormat();
      expect(prometheus2).toMatch(/hivemind_messages_total\s+\d+/);

      // Include uptime
      expect(prometheus2).toMatch(/hivemind_uptime_seconds\s+\d+/);

      // Be valid Prometheus format
      const lines = prometheus2.split('\n').filter((line) => line.trim());
      lines.forEach((line) => {
        if (!line.startsWith('#')) {
          expect(line).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*(\{[^}]*\})?\s+\d+(\.\d+)?$/);
        }
      });

      // Include response time metrics if available
      collector.recordResponseTime(100);
      collector.recordResponseTime(200);
      const prometheus3 = collector.getPrometheusFormat();
      if (prometheus3.includes('response_time')) {
        expect(prometheus3).toMatch(/response_time/);
      }
    });
  });

  describe('Metrics Retrieval', () => {
    it('should handle metrics retrieval', () => {
      // Return metrics object
      const metrics = collector.getMetrics();
      expect(typeof metrics).toBe('object');
      expect(metrics).not.toBeNull();

      // Include required metrics fields
      expect(typeof metrics.messagesProcessed).toBe('number');
      expect(Array.isArray(metrics.responseTime)).toBe(true);

      // Return immutable metrics object
      const metrics1 = collector.getMetrics();
      const metrics2 = collector.getMetrics();
      expect(metrics1).not.toBe(metrics2);

      // Compare all fields except uptime (which changes between calls)
      expect(metrics1.messagesProcessed).toBe(metrics2.messagesProcessed);
      expect(metrics1.activeConnections).toBe(metrics2.activeConnections);
      expect(metrics1.errors).toBe(metrics2.errors);
      expect(metrics1.responseTime).toEqual(metrics2.responseTime);

      // Uptime should be similar but not exactly equal due to timing
      expect(Math.abs(metrics1.uptime - metrics2.uptime)).toBeLessThan(100); // Within 100ms
    });
  });

  describe('Performance and Memory', () => {
    it('should handle performance and memory', () => {
      // Handle large numbers of operations efficiently
      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        collector.incrementMessages();
        if (i % 100 === 0) {
          collector.recordResponseTime(Math.random() * 1000);
        }
      }
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000);
      expect(collector.getMetrics().messagesProcessed).toBe(10000);

      // Not leak memory with many response time recordings
      const initialMemory = process.memoryUsage().heapUsed;
      for (let i = 0; i < 1000; i++) {
        collector.recordResponseTime(Math.random() * 1000);
      }
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge cases', async () => {
      // Handle negative response times
      expect(() => collector.recordResponseTime(-100)).not.toThrow();

      // Handle very large numbers
      const largeNumber = Number.MAX_SAFE_INTEGER;
      expect(() => collector.recordResponseTime(largeNumber)).not.toThrow();

      // Handle concurrent access safely
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          collector.incrementMessages();
          collector.recordResponseTime(i);
        })
      );

      await Promise.all(promises);
      const finalMetrics = collector.getMetrics();
      expect(finalMetrics.messagesProcessed).toBeGreaterThanOrEqual(100);
      expect(finalMetrics.responseTime.length).toBeGreaterThanOrEqual(100);
    });
  });
});
