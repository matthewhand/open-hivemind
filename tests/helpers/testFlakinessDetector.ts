/**
 * Test Flakiness Detection and Monitoring
 * Identifies flaky tests and provides reliability metrics
 */

interface TestExecution {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: number;
  errorMessage?: string;
  filePath: string;
}

interface FlakinessReport {
  testName: string;
  totalRuns: number;
  passCount: number;
  failCount: number;
  skipCount: number;
  flakinessScore: number; // 0-1, higher = more flaky
  recentFailures: TestExecution[];
  averageDuration: number;
  standardDeviation: number;
  isFlaky: boolean;
  confidence: number; // 0-1, how confident we are in the flakiness assessment
}

class TestFlakinessDetector {
  private executionHistory: Map<string, TestExecution[]> = new Map();
  private maxHistorySize = 50; // Keep last 50 runs per test
  private flakinessThreshold = 0.1; // 10% failure rate considered flaky
  private minimumRunsForAnalysis = 5; // Need at least 5 runs to analyze

  /**
   * Record a test execution
   */
  recordExecution(execution: TestExecution): void {
    const history = this.executionHistory.get(execution.testName) || [];
    history.push(execution);

    // Keep only recent executions
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.executionHistory.set(execution.testName, history);
  }

  /**
   * Get flakiness report for a specific test
   */
  getFlakinessReport(testName: string): FlakinessReport | null {
    const history = this.executionHistory.get(testName);
    if (!history || history.length < this.minimumRunsForAnalysis) {
      return null;
    }

    const totalRuns = history.length;
    const passCount = history.filter((h) => h.status === 'passed').length;
    const failCount = history.filter((h) => h.status === 'failed').length;
    const skipCount = history.filter((h) => h.status === 'skipped').length;

    const failureRate = failCount / totalRuns;
    const flakinessScore = this.calculateFlakinessScore(history);

    // Recent failures (last 10 runs)
    const recentFailures = history.filter((h) => h.status === 'failed').slice(-10);

    // Duration statistics
    const durations = history.map((h) => h.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((acc, val) => acc + Math.pow(val - averageDuration, 2), 0) /
      durations.length;
    const standardDeviation = Math.sqrt(variance);

    // Determine if test is flaky
    const isFlaky = flakinessScore > this.flakinessThreshold && failCount > 0;
    const confidence = Math.min(totalRuns / 20, 1); // More confident with more runs

    return {
      testName,
      totalRuns,
      passCount,
      failCount,
      skipCount,
      flakinessScore,
      recentFailures,
      averageDuration,
      standardDeviation,
      isFlaky,
      confidence,
    };
  }

  /**
   * Calculate flakiness score based on execution patterns
   */
  private calculateFlakinessScore(history: TestExecution[]): number {
    if (history.length < this.minimumRunsForAnalysis) {
      return 0;
    }

    // Method 1: Simple failure rate
    const failureRate = history.filter((h) => h.status === 'failed').length / history.length;

    // Method 2: Alternating pass/fail patterns (high flakiness indicator)
    let alternatingScore = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].status !== history[i - 1].status) {
        alternatingScore += 0.1;
      }
    }
    alternatingScore = Math.min(alternatingScore, 1);

    // Method 3: Recent failure rate (more recent failures are more concerning)
    const recentHistory = history.slice(-10);
    const recentFailureRate =
      recentHistory.filter((h) => h.status === 'failed').length / recentHistory.length;

    // Method 4: Duration variability (inconsistent timing can indicate flakiness)
    const durations = history.map((h) => h.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const durationVariance =
      durations.reduce((acc, val) => acc + Math.pow(val - avgDuration, 2), 0) / durations.length;
    const durationVariability = Math.sqrt(durationVariance) / avgDuration; // Coefficient of variation

    // Combine scores with weights
    const combinedScore =
      failureRate * 0.4 +
      alternatingScore * 0.3 +
      recentFailureRate * 0.2 +
      Math.min(durationVariability, 1) * 0.1; // Cap duration variability contribution

    return Math.min(combinedScore, 1);
  }

  /**
   * Get all flakiness reports
   */
  getAllFlakinessReports(): FlakinessReport[] {
    const reports: FlakinessReport[] = [];

    for (const testName of this.executionHistory.keys()) {
      const report = this.getFlakinessReport(testName);
      if (report) {
        reports.push(report);
      }
    }

    // Sort by flakiness score (most flaky first)
    return reports.sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  /**
   * Get flaky tests only
   */
  getFlakyTests(): FlakinessReport[] {
    return this.getAllFlakinessReports().filter((report) => report.isFlaky);
  }

  /**
   * Get test reliability summary
   */
  getReliabilitySummary(): {
    totalTests: number;
    flakyTests: number;
    flakinessRate: number;
    averageConfidence: number;
    mostFlakyTests: FlakinessReport[];
    reliabilityScore: number; // 0-1, higher = more reliable
  } {
    const allReports = this.getAllFlakinessReports();
    const flakyTests = allReports.filter((r) => r.isFlaky);

    const flakinessRate = allReports.length > 0 ? flakyTests.length / allReports.length : 0;
    const averageConfidence =
      allReports.length > 0
        ? allReports.reduce((sum, r) => sum + r.confidence, 0) / allReports.length
        : 0;

    const reliabilityScore = Math.max(0, 1 - flakinessRate);

    return {
      totalTests: allReports.length,
      flakyTests: flakyTests.length,
      flakinessRate,
      averageConfidence,
      mostFlakyTests: flakyTests.slice(0, 10),
      reliabilityScore,
    };
  }

  /**
   * Export flakiness data for persistence
   */
  exportData(): Record<string, TestExecution[]> {
    const data: Record<string, TestExecution[]> = {};
    this.executionHistory.forEach((executions, testName) => {
      data[testName] = executions;
    });
    return data;
  }

  /**
   * Import flakiness data
   */
  importData(data: Record<string, TestExecution[]>): void {
    Object.entries(data).forEach(([testName, executions]) => {
      this.executionHistory.set(testName, executions);
    });
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.executionHistory.clear();
  }

  /**
   * Configure detection parameters
   */
  configure(options: {
    maxHistorySize?: number;
    flakinessThreshold?: number;
    minimumRunsForAnalysis?: number;
  }): void {
    if (options.maxHistorySize !== undefined) {
      this.maxHistorySize = options.maxHistorySize;
    }
    if (options.flakinessThreshold !== undefined) {
      this.flakinessThreshold = options.flakinessThreshold;
    }
    if (options.minimumRunsForAnalysis !== undefined) {
      this.minimumRunsForAnalysis = options.minimumRunsForAnalysis;
    }
  }
}

// Global instance
export const flakinessDetector = new TestFlakinessDetector();

/**
 * Jest reporter for automatic flakiness detection
 */
export class FlakinessReporter {
  private detector = new TestFlakinessDetector();

  onTestResult(testResult: any): void {
    const testFilePath = testResult.testFilePath;

    testResult.testResults.forEach((test: any) => {
      const execution: TestExecution = {
        testName: test.fullName || test.title,
        status: test.status,
        duration: test.duration || 0,
        timestamp: Date.now(),
        errorMessage: test.failureMessages?.join('\n'),
        filePath: testFilePath,
      };

      this.detector.recordExecution(execution);
    });
  }

  onRunComplete(): void {
    const summary = this.detector.getReliabilitySummary();

    console.log('\n📊 Test Flakiness Report');
    console.log('========================');
    console.log(`Total Tests Analyzed: ${summary.totalTests}`);
    console.log(
      `Flaky Tests: ${summary.flakyTests} (${(summary.flakinessRate * 100).toFixed(1)}%)`
    );
    console.log(`Reliability Score: ${(summary.reliabilityScore * 100).toFixed(1)}%`);
    console.log(`Average Confidence: ${(summary.averageConfidence * 100).toFixed(1)}%`);

    if (summary.mostFlakyTests.length > 0) {
      console.log('\n🚨 Most Flaky Tests:');
      summary.mostFlakyTests.slice(0, 5).forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.testName}`);
        console.log(`     Flakiness: ${(test.flakinessScore * 100).toFixed(1)}%`);
        console.log(`     Runs: ${test.totalRuns}, Failures: ${test.failCount}`);
        console.log(`     Recent failures: ${test.recentFailures.length}`);
      });
    }

    // Export data for future runs
    const dataFile = './test-flakiness-data.json';
    try {
      require('fs').writeFileSync(dataFile, JSON.stringify(this.detector.exportData(), null, 2));
      console.log(`\n💾 Flakiness data saved to ${dataFile}`);
    } catch (error) {
      console.warn('Failed to save flakiness data:', error.message);
    }
  }
}

/**
 * Helper to load historical flakiness data
 */
export function loadHistoricalFlakinessData(): void {
  try {
    const data = require('./test-flakiness-data.json');
    flakinessDetector.importData(data);
    console.log('📖 Loaded historical flakiness data');
  } catch (error) {
    console.log('ℹ️  No historical flakiness data found, starting fresh');
  }
}

/**
 * Helper to check if a test is currently flaky
 */
export function isTestFlaky(testName: string): boolean {
  const report = flakinessDetector.getFlakinessReport(testName);
  return report?.isFlaky || false;
}

/**
 * Helper to get flakiness insights for CI/CD
 */
export function getFlakinessInsights(): {
  shouldBlockCI: boolean;
  criticalIssues: string[];
  recommendations: string[];
} {
  const summary = flakinessDetector.getReliabilitySummary();
  const flakyTests = flakinessDetector.getFlakyTests();

  const shouldBlockCI = summary.flakinessRate > 0.05; // Block if >5% tests are flaky
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];

  if (summary.flakinessRate > 0.1) {
    criticalIssues.push(
      `High flakiness rate: ${(summary.flakinessRate * 100).toFixed(1)}% of tests are flaky`
    );
  }

  if (flakyTests.length > 0) {
    criticalIssues.push(`${flakyTests.length} tests identified as flaky`);
    recommendations.push('Review and fix flaky tests before merging');
    recommendations.push('Consider quarantining flaky tests');
    recommendations.push('Add retry logic for known flaky tests');
  }

  if (summary.averageConfidence < 0.7) {
    recommendations.push('Run more test iterations to improve flakiness detection confidence');
  }

  return {
    shouldBlockCI,
    criticalIssues,
    recommendations,
  };
}
