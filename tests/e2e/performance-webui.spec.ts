import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WebUI Performance Baseline Tests
 *
 * Measures and establishes baselines for:
 * - Dashboard page load time
 * - Bots list page load time (with 100+ bots)
 * - Chat page responsiveness
 * - Settings page load time
 * - Time to Interactive (TTI)
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 *
 * Performance Budgets:
 * - Page load: < 2000ms
 * - TTI: < 3000ms
 * - LCP: < 2500ms
 * - FCP: < 1500ms
 */

interface PerformanceMetrics {
  pageLoad: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

interface PerformanceBudget {
  pageLoad: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

interface PerformanceResult {
  url: string;
  testName: string;
  runs: PerformanceMetrics[];
  average: PerformanceMetrics;
  median: PerformanceMetrics;
  p95: PerformanceMetrics;
  p99: PerformanceMetrics;
  budget: PerformanceBudget;
  violations: string[];
  timestamp: string;
}

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS: PerformanceBudget = {
  pageLoad: 2000,
  domContentLoaded: 1500,
  firstContentfulPaint: 1500,
  largestContentfulPaint: 2500,
  timeToInteractive: 3000,
  totalBlockingTime: 300,
};

// Number of test runs for statistical analysis
const TEST_RUNS = 5;

// Storage for performance results
const performanceResults: PerformanceResult[] = [];
const baselineFilePath = path.join(__dirname, '../../test-results/performance-baselines.json');

/**
 * Collect Web Vitals and performance metrics from the page
 */
async function collectPerformanceMetrics(page: any): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    return new Promise<PerformanceMetrics>((resolve) => {
      // Collect navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      let fcp = 0;
      let lcp = 0;
      let tti = 0;
      let tbt = 0;

      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        fcp = fcpEntry.startTime;
      }

      // Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        lcp = lastEntry.renderTime || lastEntry.loadTime;
      });

      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as any[];
        if (lcpEntries.length > 0) {
          const lastLCP = lcpEntries[lcpEntries.length - 1];
          lcp = lastLCP.renderTime || lastLCP.loadTime;
        }
        observer.disconnect();
      } catch (e) {
        // LCP not supported in all browsers
      }

      // Approximate TTI using domInteractive
      tti = navigation.domInteractive;

      // Approximate TBT using domContentLoadedEventEnd - domContentLoadedEventStart
      tbt = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;

      resolve({
        pageLoad: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        timeToInteractive: tti,
        totalBlockingTime: tbt,
      });
    });
  });

  return metrics;
}

/**
 * Calculate statistical measures for performance metrics
 */
function calculateStatistics(runs: PerformanceMetrics[]): {
  average: PerformanceMetrics;
  median: PerformanceMetrics;
  p95: PerformanceMetrics;
  p99: PerformanceMetrics;
} {
  const metrics = ['pageLoad', 'domContentLoaded', 'firstContentfulPaint', 'largestContentfulPaint', 'timeToInteractive', 'totalBlockingTime'] as const;

  const average: any = {};
  const median: any = {};
  const p95: any = {};
  const p99: any = {};

  for (const metric of metrics) {
    const values = runs.map(r => r[metric]).sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    average[metric] = Math.round(sum / values.length);
    median[metric] = Math.round(values[Math.floor(values.length / 2)]);
    p95[metric] = Math.round(values[Math.floor(values.length * 0.95)]);
    p99[metric] = Math.round(values[Math.floor(values.length * 0.99)]);
  }

  return { average, median, p95, p99 };
}

/**
 * Check for performance budget violations
 */
function checkBudgetViolations(
  metrics: PerformanceMetrics,
  budget: PerformanceBudget
): string[] {
  const violations: string[] = [];

  if (metrics.pageLoad > budget.pageLoad) {
    violations.push(
      `Page Load: ${metrics.pageLoad}ms exceeds budget of ${budget.pageLoad}ms (+${metrics.pageLoad - budget.pageLoad}ms)`
    );
  }

  if (metrics.domContentLoaded > budget.domContentLoaded) {
    violations.push(
      `DOM Content Loaded: ${metrics.domContentLoaded}ms exceeds budget of ${budget.domContentLoaded}ms (+${metrics.domContentLoaded - budget.domContentLoaded}ms)`
    );
  }

  if (metrics.firstContentfulPaint > budget.firstContentfulPaint) {
    violations.push(
      `First Contentful Paint: ${metrics.firstContentfulPaint}ms exceeds budget of ${budget.firstContentfulPaint}ms (+${metrics.firstContentfulPaint - budget.firstContentfulPaint}ms)`
    );
  }

  if (metrics.largestContentfulPaint > budget.largestContentfulPaint) {
    violations.push(
      `Largest Contentful Paint: ${metrics.largestContentfulPaint}ms exceeds budget of ${budget.largestContentfulPaint}ms (+${metrics.largestContentfulPaint - budget.largestContentfulPaint}ms)`
    );
  }

  if (metrics.timeToInteractive > budget.timeToInteractive) {
    violations.push(
      `Time to Interactive: ${metrics.timeToInteractive}ms exceeds budget of ${budget.timeToInteractive}ms (+${metrics.timeToInteractive - budget.timeToInteractive}ms)`
    );
  }

  if (metrics.totalBlockingTime > budget.totalBlockingTime) {
    violations.push(
      `Total Blocking Time: ${metrics.totalBlockingTime}ms exceeds budget of ${budget.totalBlockingTime}ms (+${metrics.totalBlockingTime - budget.totalBlockingTime}ms)`
    );
  }

  return violations;
}

/**
 * Save performance baselines to JSON file
 */
function savePerformanceBaselines() {
  const resultsDir = path.dirname(baselineFilePath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    baselineFilePath,
    JSON.stringify(performanceResults, null, 2),
    'utf-8'
  );

  console.log(`\n📊 Performance baselines saved to: ${baselineFilePath}`);
}

/**
 * Log performance summary
 */
function logPerformanceSummary(result: PerformanceResult) {
  console.log(`\n📊 Performance Summary: ${result.testName}`);
  console.log(`URL: ${result.url}`);
  console.log(`Runs: ${result.runs.length}`);
  console.log(`\nMetrics (median):`);
  console.log(`  Page Load: ${result.median.pageLoad}ms (budget: ${result.budget.pageLoad}ms)`);
  console.log(`  DOM Content Loaded: ${result.median.domContentLoaded}ms (budget: ${result.budget.domContentLoaded}ms)`);
  console.log(`  First Contentful Paint: ${result.median.firstContentfulPaint}ms (budget: ${result.budget.firstContentfulPaint}ms)`);
  console.log(`  Largest Contentful Paint: ${result.median.largestContentfulPaint}ms (budget: ${result.budget.largestContentfulPaint}ms)`);
  console.log(`  Time to Interactive: ${result.median.timeToInteractive}ms (budget: ${result.budget.timeToInteractive}ms)`);
  console.log(`  Total Blocking Time: ${result.median.totalBlockingTime}ms (budget: ${result.budget.totalBlockingTime}ms)`);

  console.log(`\nP95 Metrics:`);
  console.log(`  Page Load: ${result.p95.pageLoad}ms`);
  console.log(`  LCP: ${result.p95.largestContentfulPaint}ms`);
  console.log(`  TTI: ${result.p95.timeToInteractive}ms`);

  console.log(`\nP99 Metrics:`);
  console.log(`  Page Load: ${result.p99.pageLoad}ms`);
  console.log(`  LCP: ${result.p99.largestContentfulPaint}ms`);
  console.log(`  TTI: ${result.p99.timeToInteractive}ms`);

  if (result.violations.length > 0) {
    console.log(`\n❌ Budget Violations (${result.violations.length}):`);
    result.violations.forEach(v => console.log(`  - ${v}`));
    console.log(`\n💡 Recommendations:`);
    if (result.violations.some(v => v.includes('Page Load'))) {
      console.log(`  - Consider code splitting and lazy loading`);
      console.log(`  - Optimize bundle size`);
    }
    if (result.violations.some(v => v.includes('LCP'))) {
      console.log(`  - Optimize images and fonts`);
      console.log(`  - Reduce render-blocking resources`);
    }
    if (result.violations.some(v => v.includes('TTI'))) {
      console.log(`  - Reduce JavaScript execution time`);
      console.log(`  - Defer non-critical scripts`);
    }
    if (result.violations.some(v => v.includes('TBT'))) {
      console.log(`  - Break up long tasks`);
      console.log(`  - Optimize third-party scripts`);
    }
  } else {
    console.log(`\n✅ All performance budgets met!`);
  }
}

/**
 * Run performance test for a specific page
 */
async function runPerformanceTest(
  page: any,
  url: string,
  testName: string
): Promise<PerformanceResult> {
  const runs: PerformanceMetrics[] = [];

  for (let i = 0; i < TEST_RUNS; i++) {
    console.log(`  Run ${i + 1}/${TEST_RUNS}...`);

    // Clear cache and cookies between runs for consistency
    await page.context().clearCookies();

    // Navigate to the page
    await page.goto(url);
    await page.waitForLoadState('load');

    // Wait a bit for any late-loading resources
    await page.waitForTimeout(500);

    // Collect metrics
    const metrics = await collectPerformanceMetrics(page);
    runs.push(metrics);

    // Small delay between runs
    await page.waitForTimeout(100);
  }

  // Calculate statistics
  const stats = calculateStatistics(runs);

  // Check budget violations using median values
  const violations = checkBudgetViolations(stats.median, PERFORMANCE_BUDGETS);

  const result: PerformanceResult = {
    url,
    testName,
    runs,
    average: stats.average,
    median: stats.median,
    p95: stats.p95,
    p99: stats.p99,
    budget: PERFORMANCE_BUDGETS,
    violations,
    timestamp: new Date().toISOString(),
  };

  performanceResults.push(result);
  logPerformanceSummary(result);

  return result;
}

test.describe('WebUI Performance Baseline Tests', () => {
  test.setTimeout(120000); // 2 minutes for multiple runs

  test.afterAll(() => {
    // Save all performance baselines after all tests complete
    savePerformanceBaselines();
  });

  test('Dashboard page load performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    console.log(`\n🔍 Testing Dashboard Performance...`);

    const result = await runPerformanceTest(
      page,
      '/admin/overview',
      'Dashboard Page'
    );

    // Assert that critical metrics are within budget
    expect(result.median.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
    expect(result.median.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint);
    expect(result.median.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive);

    // P95 should also be reasonable (within 1.5x budget)
    expect(result.p95.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad * 1.5);
    expect(result.p95.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint * 1.5);
  });

  test('Bots list page load performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    console.log(`\n🔍 Testing Bots List Performance...`);

    const result = await runPerformanceTest(
      page,
      '/admin/bots',
      'Bots List Page'
    );

    // Bots list may have many items, so we allow slightly higher budgets
    expect(result.median.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad * 1.2);
    expect(result.median.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint * 1.2);
    expect(result.median.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive * 1.2);
  });

  test('Chat page load performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    console.log(`\n🔍 Testing Chat Page Performance...`);

    const result = await runPerformanceTest(
      page,
      '/admin/chat',
      'Chat Page'
    );

    // Chat should be very responsive
    expect(result.median.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
    expect(result.median.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint);
    expect(result.median.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive);
  });

  test('Settings page load performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    console.log(`\n🔍 Testing Settings Page Performance...`);

    const result = await runPerformanceTest(
      page,
      '/admin/settings',
      'Settings Page'
    );

    expect(result.median.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
    expect(result.median.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint);
    expect(result.median.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive);
  });

  test('Activity monitor page load performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    console.log(`\n🔍 Testing Activity Monitor Performance...`);

    const result = await runPerformanceTest(
      page,
      '/admin/activity',
      'Activity Monitor Page'
    );

    // Activity page may have charts and heavy data
    expect(result.median.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad * 1.3);
    expect(result.median.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint * 1.3);
    expect(result.median.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive * 1.3);
  });

  test('Personas page load performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    console.log(`\n🔍 Testing Personas Page Performance...`);

    const result = await runPerformanceTest(
      page,
      '/admin/personas',
      'Personas Page'
    );

    expect(result.median.pageLoad).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
    expect(result.median.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint);
    expect(result.median.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.timeToInteractive);
  });

  test('First Contentful Paint benchmark', async ({ page }) => {
    console.log(`\n🔍 Testing First Contentful Paint across all pages...`);

    const pages = [
      '/admin/overview',
      '/admin/bots',
      '/admin/chat',
      '/admin/settings',
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('load');

      const metrics = await collectPerformanceMetrics(page);
      console.log(`  ${url}: FCP = ${metrics.firstContentfulPaint}ms`);

      expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.firstContentfulPaint);
    }
  });
});
