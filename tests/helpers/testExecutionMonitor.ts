/**
 * Test Execution Monitoring and Optimization
 * Tracks test performance, detects slow tests, and provides optimization insights
 */

interface TestResult {
  testName: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  filePath: string;
  startTime: number;
  endTime: number;
}

interface TestSuiteResult {
  suiteName: string;
  tests: TestResult[];
  totalDuration: number;
  startTime: number;
  endTime: number;
}

class TestExecutionMonitor {
  private results: TestSuiteResult[] = [];
  private currentSuite: TestSuiteResult | null = null;
  private slowTestThreshold = 1000; // 1 second
  private verySlowTestThreshold = 5000; // 5 seconds

  /**
   * Start monitoring a test suite
   */
  startSuite(suiteName: string): void {
    this.currentSuite = {
      suiteName,
      tests: [],
      totalDuration: 0,
      startTime: Date.now(),
      endTime: 0,
    };
  }

  /**
   * End monitoring a test suite
   */
  endSuite(): void {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now();
      this.currentSuite.totalDuration = this.currentSuite.endTime - this.currentSuite.startTime;
      this.results.push(this.currentSuite);
      this.currentSuite = null;
    }
  }

  /**
   * Record a test result
   */
  recordTest(
    testName: string,
    duration: number,
    status: 'passed' | 'failed' | 'skipped',
    filePath: string
  ): void {
    if (!this.currentSuite) {
      console.warn('No active test suite. Call startSuite() first.');
      return;
    }

    const testResult: TestResult = {
      testName,
      duration,
      status,
      filePath,
      startTime: Date.now() - duration,
      endTime: Date.now(),
    };

    this.currentSuite.tests.push(testResult);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalSuites: number;
    totalTests: number;
    totalDuration: number;
    averageTestDuration: number;
    slowTests: TestResult[];
    verySlowTests: TestResult[];
    failedTests: TestResult[];
    skippedTests: TestResult[];
    performanceInsights: string[];
  } {
    const allTests = this.results.flatMap((suite) => suite.tests);
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.totalDuration, 0);

    const slowTests = allTests.filter((test) => test.duration > this.slowTestThreshold);
    const verySlowTests = allTests.filter((test) => test.duration > this.verySlowTestThreshold);
    const failedTests = allTests.filter((test) => test.status === 'failed');
    const skippedTests = allTests.filter((test) => test.status === 'skipped');

    const averageTestDuration =
      allTests.length > 0
        ? allTests.reduce((sum, test) => sum + test.duration, 0) / allTests.length
        : 0;

    const performanceInsights = this.generatePerformanceInsights(
      allTests,
      slowTests,
      verySlowTests,
      averageTestDuration,
      totalDuration
    );

    return {
      totalSuites: this.results.length,
      totalTests: allTests.length,
      totalDuration,
      averageTestDuration,
      slowTests,
      verySlowTests,
      failedTests,
      skippedTests,
      performanceInsights,
    };
  }

  /**
   * Generate performance insights and recommendations
   */
  private generatePerformanceInsights(
    allTests: TestResult[],
    slowTests: TestResult[],
    verySlowTests: TestResult[],
    averageDuration: number,
    totalDuration: number
  ): string[] {
    const insights: string[] = [];

    // Overall performance assessment
    if (totalDuration > 300000) {
      // 5 minutes
      insights.push(
        '⚠️  Total test execution time exceeds 5 minutes. Consider parallelization or test splitting.'
      );
    } else if (totalDuration < 60000) {
      // 1 minute
      insights.push('✅ Excellent! Test suite runs in under 1 minute.');
    }

    // Slow test analysis
    if (verySlowTests.length > 0) {
      insights.push(
        `🚨 ${verySlowTests.length} tests exceed ${this.verySlowTestThreshold}ms threshold:`
      );
      verySlowTests.slice(0, 5).forEach((test) => {
        insights.push(`   - ${test.testName} (${test.duration}ms) in ${test.filePath}`);
      });
      if (verySlowTests.length > 5) {
        insights.push(`   ... and ${verySlowTests.length - 5} more`);
      }
    }

    if (slowTests.length > allTests.length * 0.1) {
      // More than 10% slow
      insights.push(
        `⚠️  ${slowTests.length} tests (${((slowTests.length / allTests.length) * 100).toFixed(1)}%) are slower than ${this.slowTestThreshold}ms.`
      );
    }

    // Average duration analysis
    if (averageDuration > 500) {
      insights.push(
        `⚠️  Average test duration (${averageDuration.toFixed(0)}ms) is high. Consider optimizing test setup/teardown.`
      );
    } else if (averageDuration < 100) {
      insights.push('✅ Good average test duration. Tests are running efficiently.');
    }

    // Test distribution insights
    const testsPerSuite = allTests.length / Math.max(this.results.length, 1);
    if (testsPerSuite > 50) {
      insights.push(
        `📊 High test density (${testsPerSuite.toFixed(0)} tests per suite). Consider splitting large test files.`
      );
    }

    // Failure analysis
    const failureRate =
      (allTests.filter((t) => t.status === 'failed').length / allTests.length) * 100;
    if (failureRate > 5) {
      insights.push(
        `❌ High failure rate (${failureRate.toFixed(1)}%). Investigate test reliability.`
      );
    }

    return insights;
  }

  /**
   * Export results for external analysis
   */
  exportResults(): {
    summary: ReturnType<TestExecutionMonitor['getPerformanceSummary']>;
    detailed: TestSuiteResult[];
  } {
    return {
      summary: this.getPerformanceSummary(),
      detailed: this.results,
    };
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.results = [];
    this.currentSuite = null;
  }

  /**
   * Set custom thresholds
   */
  setThresholds(slowThreshold: number, verySlowThreshold: number): void {
    this.slowTestThreshold = slowThreshold;
    this.verySlowTestThreshold = verySlowThreshold;
  }
}

// Global instance for Jest integration
export const testMonitor = new TestExecutionMonitor();

/**
 * Jest setup function to integrate monitoring
 */
export function setupTestMonitoring() {
  // Set up Jest hooks to monitor test execution
  beforeAll(() => {
    testMonitor.startSuite(expect.getState().testPath || 'unknown-suite');
  });

  afterAll(() => {
    testMonitor.endSuite();
  });

  afterEach(() => {
    const testState = expect.getState();
    const testName = testState.currentTestName;
    const status = testState.currentTestResult?.status || 'unknown';

    // Record test result (duration would need to be captured differently in Jest)
    // This is a simplified version - full implementation would require Jest reporters
    if (testName) {
      testMonitor.recordTest(
        testName,
        0, // Duration not easily accessible here
        status as any,
        testState.testPath || 'unknown'
      );
    }
  });
}

/**
 * Performance regression detection
 */
export class PerformanceRegressionDetector {
  private baselineResults: Map<string, number> = new Map();
  private regressionThreshold = 1.5; // 50% slower than baseline

  /**
   * Set baseline performance data
   */
  setBaseline(testName: string, duration: number): void {
    this.baselineResults.set(testName, duration);
  }

  /**
   * Load baseline from previous test run
   */
  loadBaseline(data: Record<string, number>): void {
    Object.entries(data).forEach(([testName, duration]) => {
      this.baselineResults.set(testName, duration);
    });
  }

  /**
   * Check for performance regression
   */
  checkRegression(
    testName: string,
    currentDuration: number
  ): {
    hasRegression: boolean;
    baselineDuration?: number;
    degradationPercent?: number;
    message?: string;
  } {
    const baselineDuration = this.baselineResults.get(testName);

    if (!baselineDuration) {
      return { hasRegression: false };
    }

    const degradationPercent = ((currentDuration - baselineDuration) / baselineDuration) * 100;

    if (currentDuration > baselineDuration * this.regressionThreshold) {
      return {
        hasRegression: true,
        baselineDuration,
        degradationPercent,
        message: `${testName} is ${degradationPercent.toFixed(1)}% slower than baseline (${baselineDuration}ms → ${currentDuration}ms)`,
      };
    }

    return { hasRegression: false, baselineDuration, degradationPercent };
  }

  /**
   * Export current results as new baseline
   */
  exportBaseline(): Record<string, number> {
    const baseline: Record<string, number> = {};
    this.baselineResults.forEach((duration, testName) => {
      baseline[testName] = duration;
    });
    return baseline;
  }
}

export const regressionDetector = new PerformanceRegressionDetector();
