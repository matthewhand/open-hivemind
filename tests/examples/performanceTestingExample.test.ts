/**
 * Example of robust performance testing with statistical analysis
 * This demonstrates the improved performance testing approach
 */

import { runPerformanceTest, runConcurrencyTest, createPerformanceTestSuite } from '../helpers/performanceTestHelper';

// Example 1: Basic performance test with statistical analysis
describe('Performance Testing Examples', () => {
  it('should demonstrate statistical performance analysis', async () => {
    const result = await runPerformanceTest(
      'Simple config access',
      () => {
        const config = require('../../src/config/discordConfig').default;
        return config.get('DISCORD_BOT_TOKEN');
      },
      {
        iterations: 100,
        acceptableAverageMs: 10,
        acceptableMaxMs: 50
      }
    );

    console.log('Performance metrics:', {
      operation: result.operation,
      average: `${result.average.toFixed(3)}ms`,
      median: `${result.median.toFixed(3)}ms`,
      min: `${result.min.toFixed(3)}ms`,
      max: `${result.max.toFixed(3)}ms`,
      p95: `${result.percentile95.toFixed(3)}ms`,
      p99: `${result.percentile99.toFixed(3)}ms`,
      stdDev: result.standardDeviation.toFixed(3)
    });

    // The runPerformanceTest function already includes assertions
    expect(result.average).toBeLessThan(10);
    expect(result.max).toBeLessThan(50);
  });

  it('should test concurrent config access patterns', async () => {
    const result = await runConcurrencyTest(
      'Concurrent config access',
      () => {
        const config = require('../../src/config/discordConfig').default;
        return config.get('DISCORD_BOT_TOKEN');
      },
      {
        concurrentUsers: 10,
        operationsPerUser: 50,
        timeoutMs: 5000
      }
    );

    console.log('Concurrency metrics:', {
      operation: result.operation,
      totalOperations: result.totalOperations,
      totalTime: `${result.totalTime}ms`,
      opsPerSecond: result.operationsPerSecond.toFixed(2),
      avgLatency: `${result.averageLatency.toFixed(3)}ms`
    });

    expect(result.operationsPerSecond).toBeGreaterThan(100);
    expect(result.averageLatency).toBeLessThan(20);
  });
});

// Example 2: Using the performance test suite helper
createPerformanceTestSuite('Config Operations Performance', [
  {
    name: 'Discord config string access',
    operation: () => {
      const config = require('../../src/config/discordConfig').default;
      return config.get('DISCORD_BOT_TOKEN');
    },
    options: {
      iterations: 200,
      acceptableAverageMs: 5,
      acceptableMaxMs: 20
    }
  },
  {
    name: 'Discord config numeric access',
    operation: () => {
      const config = require('../../src/config/discordConfig').default;
      return config.get('DISCORD_MESSAGE_HISTORY_LIMIT');
    },
    options: {
      iterations: 200,
      acceptableAverageMs: 5,
      acceptableMaxMs: 20
    }
  },
  {
    name: 'Discord config validation',
    operation: () => {
      const config = require('../../src/config/discordConfig').default;
      config.validate({ allowed: 'strict' });
    },
    options: {
      iterations: 50, // Fewer iterations for heavier operations
      acceptableAverageMs: 50,
      acceptableMaxMs: 200
    }
  }
]);

// Example 3: Memory usage testing (requires --expose-gc)
describe('Memory Usage Testing', () => {
  it.skip('should test memory usage patterns', async () => {
    // This test is skipped by default as it requires --expose-gc
    // Uncomment and run with: node --expose-gc node_modules/.bin/jest

    const { runMemoryTest } = require('../helpers/performanceTestHelper');

    const result = await runMemoryTest(
      'Config loading memory usage',
      () => {
        jest.resetModules();
        const config = require('../../src/config/discordConfig').default;
        return config.get('DISCORD_BOT_TOKEN');
      },
      {
        iterations: 100,
        checkForLeaks: true
      }
    );

    console.log('Memory metrics:', {
      operation: result.operation,
      memoryDelta: `${result.memoryDelta} bytes`,
      leaked: result.leaked
    });

    expect(result.leaked).toBe(false);
    expect(result.memoryDelta).toBeLessThan(1024 * 1024); // Less than 1MB
  });
});

// Example 4: Load testing simulation
describe('Load Testing Simulation', () => {
  it('should handle sustained load', async () => {
    const operations = [];
    const startTime = Date.now();

    // Simulate 1000 operations over 10 seconds
    for (let i = 0; i < 1000; i++) {
      operations.push(
        runPerformanceTest(
          `Load test operation ${i}`,
          () => {
            const config = require('../../src/config/discordConfig').default;
            return config.get('DISCORD_BOT_TOKEN') +
                   config.get('DISCORD_MESSAGE_HISTORY_LIMIT') +
                   config.get('DISCORD_LOGGING_ENABLED');
          },
          {
            iterations: 1, // Single iteration per test
            acceptableAverageMs: 100,
            acceptableMaxMs: 500
          }
        )
      );

      // Small delay to simulate real usage patterns
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const results = await Promise.all(operations);
    const totalTime = Date.now() - startTime;

    const avgLatency = results.reduce((sum, r) => sum + r.average, 0) / results.length;
    const maxLatency = Math.max(...results.map(r => r.max));

    console.log('Load test results:', {
      totalOperations: operations.length,
      totalTime: `${totalTime}ms`,
      avgLatency: `${avgLatency.toFixed(3)}ms`,
      maxLatency: `${maxLatency.toFixed(3)}ms`,
      opsPerSecond: (operations.length / (totalTime / 1000)).toFixed(2)
    });

    expect(avgLatency).toBeLessThan(50);
    expect(maxLatency).toBeLessThan(200);
  }, 30000); // 30 second timeout for load testing
});