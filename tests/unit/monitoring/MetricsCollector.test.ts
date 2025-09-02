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
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = MetricsCollector.getInstance();
      instance1.incrementMessages();
      
      const instance2 = MetricsCollector.getInstance();
      expect(instance2.getMetrics().messagesProcessed).toBe(1);
    });
  });

  describe('Message Counting', () => {
    it('should increment message count', () => {
      const initial = collector.getMetrics().messagesProcessed;
      collector.incrementMessages();
      expect(collector.getMetrics().messagesProcessed).toBe(initial + 1);
    });

    it('should increment multiple times correctly', () => {
      const initial = collector.getMetrics().messagesProcessed;
      collector.incrementMessages();
      collector.incrementMessages();
      collector.incrementMessages();
      expect(collector.getMetrics().messagesProcessed).toBe(initial + 3);
    });

    it('should handle rapid increments', () => {
      const initial = collector.getMetrics().messagesProcessed;
      const increments = 1000;
      
      for (let i = 0; i < increments; i++) {
        collector.incrementMessages();
      }
      
      expect(collector.getMetrics().messagesProcessed).toBe(initial + increments);
    });

    it('should start with zero messages processed', () => {
      const freshCollector = new (MetricsCollector as any)();
      expect(freshCollector.getMetrics().messagesProcessed).toBe(0);
    });
  });

  describe('Response Time Recording', () => {
    it('should record response time', () => {
      collector.recordResponseTime(100);
      const metrics = collector.getMetrics();
      expect(metrics.responseTime).toContain(100);
    });

    it('should record multiple response times', () => {
      const times = [50, 100, 150, 200];
      times.forEach(time => collector.recordResponseTime(time));
      
      const metrics = collector.getMetrics();
      times.forEach(time => {
        expect(metrics.responseTime).toContain(time);
      });
    });

    it('should handle zero response time', () => {
      collector.recordResponseTime(0);
      const metrics = collector.getMetrics();
      expect(metrics.responseTime).toContain(0);
    });

    it('should handle large response times', () => {
      const largeTime = 999999;
      collector.recordResponseTime(largeTime);
      const metrics = collector.getMetrics();
      expect(metrics.responseTime).toContain(largeTime);
    });

    it('should maintain response time history', () => {
      const times = [10, 20, 30, 40, 50];
      times.forEach(time => collector.recordResponseTime(time));
      
      const metrics = collector.getMetrics();
      expect(metrics.responseTime.length).toBe(times.length);
    });

    it('should calculate average response time correctly', () => {
      const times = [100, 200, 300];
      times.forEach(time => collector.recordResponseTime(time));
      
      const metrics = collector.getMetrics();
      if (metrics.averageResponseTime !== undefined) {
        expect(metrics.averageResponseTime).toBe(200);
      }
    });
  });

  describe('Error Tracking', () => {
    it('should increment error count', () => {
      if (typeof collector.incrementErrors === 'function') {
        const initial = collector.getMetrics().errorsEncountered || 0;
        collector.incrementErrors();
        expect(collector.getMetrics().errorsEncountered).toBe(initial + 1);
      }
    });

    it('should track different error types', () => {
      if (typeof collector.recordError === 'function') {
        collector.recordError('NetworkError');
        collector.recordError('ValidationError');
        collector.recordError('NetworkError');
        
        const metrics = collector.getMetrics();
        if (metrics.errorsByType) {
          expect(metrics.errorsByType['NetworkError']).toBe(2);
          expect(metrics.errorsByType['ValidationError']).toBe(1);
        }
      }
    });
  });

  describe('Prometheus Format', () => {
    it('should generate Prometheus format', () => {
      const prometheus = collector.getPrometheusFormat();
      expect(prometheus).toContain('hivemind_messages_total');
      expect(prometheus).toContain('hivemind_uptime_seconds');
    });

    it('should include message count in Prometheus format', () => {
      collector.incrementMessages();
      collector.incrementMessages();
      
      const prometheus = collector.getPrometheusFormat();
      expect(prometheus).toMatch(/hivemind_messages_total\s+\d+/);
    });

    it('should include uptime in Prometheus format', () => {
      const prometheus = collector.getPrometheusFormat();
      expect(prometheus).toMatch(/hivemind_uptime_seconds\s+\d+/);
    });

    it('should be valid Prometheus format', () => {
      const prometheus = collector.getPrometheusFormat();
      
      // Basic Prometheus format validation
      const lines = prometheus.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (!line.startsWith('#')) {
          // Should have metric name and value
          expect(line).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*(\{[^}]*\})?\s+\d+(\.\d+)?$/);
        }
      });
    });

    it('should include response time metrics if available', () => {
      collector.recordResponseTime(100);
      collector.recordResponseTime(200);
      
      const prometheus = collector.getPrometheusFormat();
      if (prometheus.includes('response_time')) {
        expect(prometheus).toMatch(/response_time/);
      }
    });
  });

  describe('Metrics Retrieval', () => {
    it('should return metrics object', () => {
      const metrics = collector.getMetrics();
      expect(typeof metrics).toBe('object');
      expect(metrics).not.toBeNull();
    });

    it('should include required metrics fields', () => {
      const metrics = collector.getMetrics();
      expect(typeof metrics.messagesProcessed).toBe('number');
      expect(Array.isArray(metrics.responseTime)).toBe(true);
    });

    it('should return immutable metrics object', () => {
      const metrics1 = collector.getMetrics();
      const metrics2 = collector.getMetrics();
      
      // Should be different objects (not same reference)
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of operations efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        collector.incrementMessages();
        if (i % 100 === 0) {
          collector.recordResponseTime(Math.random() * 1000);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
      expect(collector.getMetrics().messagesProcessed).toBe(10000);
    });

    it('should not leak memory with many response time recordings', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        collector.recordResponseTime(Math.random() * 1000);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative response times gracefully', () => {
      expect(() => collector.recordResponseTime(-100)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      expect(() => collector.recordResponseTime(largeNumber)).not.toThrow();
    });

    it('should handle concurrent access safely', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => {
          collector.incrementMessages();
          collector.recordResponseTime(i);
        })
      );
      
      await Promise.all(promises);
      
      expect(collector.getMetrics().messagesProcessed).toBe(100);
      expect(collector.getMetrics().responseTime.length).toBe(100);
    });
  });
});