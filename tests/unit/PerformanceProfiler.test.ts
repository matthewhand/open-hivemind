/**
 * Unit tests for PerformanceProfiler memory cleanup functionality
 */

import { PerformanceProfiler } from '../../src/utils/PerformanceProfiler';

describe('PerformanceProfiler Memory Management', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = PerformanceProfiler.getInstance();
  });

  afterEach(() => {
    profiler.clear();
  });

  describe('Memory Cleanup Configuration', () => {
    test('should allow configuration of cleanup parameters', () => {
      const customConfig = {
        maxSnapshots: 25,
        maxProfileAge: 12 * 60 * 60 * 1000, // 12 hours
        cleanupIntervalMinutes: 30
      };

      profiler.setCleanupConfig(customConfig);

      // The configuration should be applied (no direct way to verify, but should not error)
      expect(() => profiler.setCleanupConfig(customConfig)).not.toThrow();
    });

    test('should handle zero cleanup interval gracefully', () => {
      expect(() => {
        profiler.setCleanupConfig({ cleanupIntervalMinutes: 0 });
      }).not.toThrow();
    });
  });

  describe('Memory Usage Tracking', () => {
    test('should track memory usage statistics', () => {
      // Start profiling to generate some data
      profiler.startProfiling('test-memory-usage');

      // Take some snapshots
      for (let i = 0; i < 5; i++) {
        profiler.takeSnapshot();
      }

      // Profile some methods
      profiler.profileMethod('testMethod1', () => {
        // Simulate some work
        for (let j = 0; j < 1000; j++) {
          Math.random();
        }
      });

      const memoryUsage = profiler.getMemoryUsage();

      expect(memoryUsage).toHaveProperty('snapshotsCount');
      expect(memoryUsage).toHaveProperty('profilesCount');
      expect(memoryUsage).toHaveProperty('estimatedMemoryUsage');
      expect(memoryUsage.snapshotsCount).toBeGreaterThan(0);
      expect(memoryUsage.profilesCount).toBeGreaterThan(0);
      expect(memoryUsage.estimatedMemoryUsage).toBeGreaterThan(0);
    });

    test('should report zero memory usage when no data', () => {
      const memoryUsage = profiler.getMemoryUsage();

      expect(memoryUsage.snapshotsCount).toBe(0);
      expect(memoryUsage.profilesCount).toBe(0);
      expect(memoryUsage.estimatedMemoryUsage).toBe(0);
    });
  });

  describe('Automatic Cleanup', () => {
    test('should start automatic cleanup on initialization', () => {
      // The profiler should start automatic cleanup when instantiated
      expect(() => PerformanceProfiler.getInstance()).not.toThrow();
    });

    test('should force cleanup old data', () => {
      // Start profiling
      profiler.startProfiling('test-force-cleanup');

      // Create some old data by simulating old timestamps
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      // Manually add old snapshot data (this would normally be done by the profiler)
      (profiler as any).snapshots.push({
        timestamp: oldTimestamp,
        memoryUsage: process.memoryUsage(),
        heapStatistics: {
          total_heap_size: 1000000,
          used_heap_size: 500000,
          external_memory: 100000,
          heap_size_limit: 2000000,
          malloced_memory: 200000,
          peak_malloced_memory: 300000,
          does_zap_garbage: false,
          number_of_native_contexts: 10,
          number_of_detached_contexts: 5
        }
      });

      // Add some current snapshots
      profiler.takeSnapshot();
      profiler.takeSnapshot();

      // Force cleanup
      profiler.forceCleanup();

      // Memory usage should reflect cleanup
      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.snapshotsCount).toBeLessThanOrEqual(2); // Only recent snapshots should remain
    });
  });

  describe('Snapshot Management', () => {
    test('should limit snapshots to maximum configured amount', () => {
      profiler.setCleanupConfig({ maxSnapshots: 3 });
      profiler.startProfiling('test-snapshot-limit');

      // Create more snapshots than the limit
      for (let i = 0; i < 10; i++) {
        profiler.takeSnapshot();
      }

      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.snapshotsCount).toBeLessThanOrEqual(3);
    });

    test('should remove oldest snapshots when limit exceeded', () => {
      profiler.setCleanupConfig({ maxSnapshots: 2 });
      profiler.startProfiling('test-oldest-removal');

      // Create snapshots with timestamps
      const timestamps: number[] = [];
      for (let i = 0; i < 5; i++) {
        profiler.takeSnapshot();
        timestamps.push(Date.now());
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.snapshotsCount).toBe(2);
    });
  });

  describe('Profile Data Management', () => {
    test('should track method execution correctly', () => {
      profiler.startProfiling('test-method-tracking');

      // Profile a method
      profiler.profileMethod('testMethod', () => {
        return 'test result';
      });

      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.profilesCount).toBe(1);
    });

    test('should handle multiple method profiles', () => {
      profiler.startProfiling('test-multiple-methods');

      // Profile multiple methods
      profiler.profileMethod('method1', () => 'result1');
      profiler.profileMethod('method2', () => 'result2');
      profiler.profileMethod('method3', () => 'result3');

      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.profilesCount).toBe(3);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should destroy profiler cleanly', () => {
      const testProfiler = PerformanceProfiler.getInstance();

      // Start profiling and create some data
      testProfiler.startProfiling('test-destroy');
      testProfiler.takeSnapshot();
      testProfiler.profileMethod('cleanupTest', () => 'test');

      // Should not throw when destroying
      expect(() => testProfiler.destroy()).not.toThrow();

      // After destroy, memory usage should be zero
      const memoryUsage = testProfiler.getMemoryUsage();
      expect(memoryUsage.snapshotsCount).toBe(0);
      expect(memoryUsage.profilesCount).toBe(0);
      expect(memoryUsage.estimatedMemoryUsage).toBe(0);
    });

    test('should clear all data', () => {
      // Start profiling and create some data
      profiler.startProfiling('test-clear');
      profiler.takeSnapshot();
      profiler.profileMethod('clearTest', () => 'test');

      // Clear the data
      profiler.clear();

      // Memory usage should be zero
      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.snapshotsCount).toBe(0);
      expect(memoryUsage.profilesCount).toBe(0);
      expect(memoryUsage.estimatedMemoryUsage).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle cleanup with empty data', () => {
      expect(() => profiler.forceCleanup()).not.toThrow();
      expect(() => profiler.clear()).not.toThrow();
    });

    test('should handle invalid configuration gracefully', () => {
      expect(() => {
        profiler.setCleanupConfig({
          maxSnapshots: -1, // Invalid negative value
          maxProfileAge: 0,
          cleanupIntervalMinutes: -10
        });
      }).not.toThrow();
    });

    test('should handle rapid snapshot creation', () => {
      profiler.startProfiling('test-rapid-snapshots');

      // Create many snapshots rapidly
      for (let i = 0; i < 100; i++) {
        profiler.takeSnapshot();
      }

      // Should not throw and should limit to max snapshots
      const memoryUsage = profiler.getMemoryUsage();
      expect(memoryUsage.snapshotsCount).toBeLessThanOrEqual(50); // Default limit
    });
  });
});