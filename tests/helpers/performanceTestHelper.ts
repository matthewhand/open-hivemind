/**
 * Robust performance testing utilities with statistical analysis
 */

export interface PerformanceTestResult {
  operation: string;
  samples: number[];
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  percentile95: number;
  percentile99: number;
}

export interface PerformanceTestOptions {
  iterations?: number;
  warmupIterations?: number;
  timeoutMs?: number;
  acceptableAverageMs?: number;
  acceptableMaxMs?: number;
}

/**
 * Run performance tests with statistical analysis
 */
export async function runPerformanceTest(
  operationName: string,
  operation: () => void | Promise<void>,
  options: PerformanceTestOptions = {}
): Promise<PerformanceTestResult> {
  const {
    iterations = 100,
    warmupIterations = 10,
    timeoutMs = 30000,
    acceptableAverageMs = 100,
    acceptableMaxMs = 500,
  } = options;

  // Warmup phase
  for (let i = 0; i < warmupIterations; i++) {
    await operation();
  }

  // Test phase with timing
  const samples: number[] = [];
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const opStart = performance.now();
    await operation();
    const opEnd = performance.now();
    samples.push(opEnd - opStart);

    // Timeout check
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Performance test timed out after ${timeoutMs}ms`);
    }
  }

  // Calculate statistics
  const sortedSamples = [...samples].sort((a, b) => a - b);
  const average = samples.reduce((a, b) => a + b, 0) / samples.length;
  const median = sortedSamples[Math.floor(sortedSamples.length / 2)];
  const min = sortedSamples[0];
  const max = sortedSamples[sortedSamples.length - 1];

  // Standard deviation
  const variance =
    samples.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / samples.length;
  const standardDeviation = Math.sqrt(variance);

  // Percentiles
  const percentile95 = sortedSamples[Math.floor(sortedSamples.length * 0.95)];
  const percentile99 = sortedSamples[Math.floor(sortedSamples.length * 0.99)];

  const result: PerformanceTestResult = {
    operation: operationName,
    samples,
    average,
    median,
    min,
    max,
    standardDeviation,
    percentile95,
    percentile99,
  };

  // Assertions
  expect(average).toBeLessThan(acceptableAverageMs);
  expect(max).toBeLessThan(acceptableMaxMs);
  expect(standardDeviation).toBeLessThan(acceptableAverageMs * 0.5); // Std dev should be reasonable

  return result;
}

/**
 * Run multiple performance tests and compare results
 */
export async function runPerformanceComparison(
  tests: Array<{
    name: string;
    operation: () => void | Promise<void>;
    options?: PerformanceTestOptions;
  }>
): Promise<PerformanceTestResult[]> {
  const results: PerformanceTestResult[] = [];

  for (const test of tests) {
    const result = await runPerformanceTest(test.name, test.operation, test.options);
    results.push(result);
  }

  return results;
}

/**
 * Memory usage testing utility
 */
export async function runMemoryTest(
  operationName: string,
  operation: () => void | Promise<void>,
  options: { iterations?: number; checkForLeaks?: boolean } = {}
): Promise<{
  operation: string;
  initialMemory: NodeJS.MemoryUsage;
  finalMemory: NodeJS.MemoryUsage;
  memoryDelta: number;
  leaked: boolean;
}> {
  const { iterations = 100, checkForLeaks = true } = options;

  if (typeof global.gc !== 'function') {
    throw new Error('Memory testing requires --expose-gc flag');
  }

  // Force garbage collection
  global.gc();
  const initialMemory = process.memoryUsage();

  // Run operations
  for (let i = 0; i < iterations; i++) {
    await operation();
  }

  // Force garbage collection again
  global.gc();
  const finalMemory = process.memoryUsage();

  const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
  const leaked = checkForLeaks && memoryDelta > 1024 * 1024; // More than 1MB leak

  if (leaked) {
    console.warn(`${operationName} may have a memory leak. Delta: ${memoryDelta} bytes`);
  }

  return {
    operation: operationName,
    initialMemory,
    finalMemory,
    memoryDelta,
    leaked,
  };
}

/**
 * Concurrency performance testing
 */
export async function runConcurrencyTest(
  operationName: string,
  operation: () => void | Promise<void>,
  options: {
    concurrentUsers?: number;
    operationsPerUser?: number;
    timeoutMs?: number;
  } = {}
): Promise<{
  operation: string;
  concurrentUsers: number;
  totalOperations: number;
  totalTime: number;
  operationsPerSecond: number;
  averageLatency: number;
}> {
  const { concurrentUsers = 10, operationsPerUser = 100, timeoutMs = 30000 } = options;

  const startTime = Date.now();
  const promises: Promise<void>[] = [];

  // Create concurrent users
  for (let user = 0; user < concurrentUsers; user++) {
    const userPromise = (async () => {
      const latencies: number[] = [];

      for (let op = 0; op < operationsPerUser; op++) {
        const opStart = performance.now();
        await operation();
        const opEnd = performance.now();
        latencies.push(opEnd - opStart);
      }

      return latencies;
    })();

    promises.push(userPromise);
  }

  // Wait for all operations to complete
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  // Calculate metrics
  const allLatencies = results.flat();
  const totalOperations = concurrentUsers * operationsPerUser;
  const operationsPerSecond = totalOperations / (totalTime / 1000);
  const averageLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;

  // Assertions
  expect(totalTime).toBeLessThan(timeoutMs);
  expect(operationsPerSecond).toBeGreaterThan(1); // At least 1 op/sec
  expect(averageLatency).toBeLessThan(1000); // Less than 1 second average

  return {
    operation: operationName,
    concurrentUsers,
    totalOperations,
    totalTime,
    operationsPerSecond,
    averageLatency,
  };
}

/**
 * Helper to create performance test suites
 */
export function createPerformanceTestSuite(
  testName: string,
  operations: Array<{
    name: string;
    operation: () => void | Promise<void>;
    options?: PerformanceTestOptions;
  }>
) {
  describe(`Performance: ${testName}`, () => {
    operations.forEach(({ name, operation, options }) => {
      it(`should perform well for ${name}`, async () => {
        const result = await runPerformanceTest(name, operation, options);

        // Log results for monitoring
        console.log(`Performance test "${name}":`, {
          avg: `${result.average.toFixed(2)}ms`,
          median: `${result.median.toFixed(2)}ms`,
          p95: `${result.percentile95.toFixed(2)}ms`,
          p99: `${result.percentile99.toFixed(2)}ms`,
        });
      }, 60000); // 60 second timeout for performance tests
    });
  });
}
