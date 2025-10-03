import * as fs from 'fs';
import * as path from 'path';
import { TestResult } from '@playwright/test/reporter';

/**
 * Visual diff reporting utilities
 */
export interface VisualDiffResult {
  testName: string;
  browser: string;
  viewport?: string;
  theme?: string;
  status: 'passed' | 'failed' | 'skipped';
  baselinePath?: string;
  currentPath?: string;
  diffPath?: string;
  diffPixels?: number;
  diffRatio?: number;
  threshold?: number;
}

export interface VisualReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: VisualDiffResult[];
  browsers: string[];
  themes: string[];
  viewports: string[];
}

/**
 * Generates a comprehensive visual diff report
 */
export class VisualDiffReporter {
  private reportData: VisualReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    results: [],
    browsers: [],
    themes: [],
    viewports: [],
  };

  private outputDir: string;
  private screenshotDir: string;

  constructor(outputDir: string = 'test-results/visual-report') {
    this.outputDir = outputDir;
    this.screenshotDir = path.join(outputDir, 'screenshots');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.outputDir,
      this.screenshotDir,
      path.join(this.screenshotDir, 'baseline'),
      path.join(this.screenshotDir, 'current'),
      path.join(this.screenshotDir, 'diff'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Add a test result to the report
   */
  addResult(result: VisualDiffResult): void {
    this.reportData.results.push(result);
    this.reportData.summary.total++;

    switch (result.status) {
      case 'passed':
        this.reportData.summary.passed++;
        break;
      case 'failed':
        this.reportData.summary.failed++;
        break;
      case 'skipped':
        this.reportData.summary.skipped++;
        break;
    }

    // Track unique browsers, themes, and viewports
    if (result.browser && !this.reportData.browsers.includes(result.browser)) {
      this.reportData.browsers.push(result.browser);
    }
    if (result.theme && !this.reportData.themes.includes(result.theme)) {
      this.reportData.themes.push(result.theme);
    }
    if (result.viewport && !this.reportData.viewports.includes(result.viewport)) {
      this.reportData.viewports.push(result.viewport);
    }
  }

  /**
   * Parse Playwright test results and extract visual diff information
   */
  async parseTestResults(resultsPath: string): Promise<void> {
    try {
      const resultsContent = fs.readFileSync(resultsPath, 'utf-8');
      const testResults = JSON.parse(resultsContent) as TestResult[];

      for (const testResult of testResults.suites || []) {
        await this.parseSuiteResults(testResult);
      }
    } catch (error) {
      console.error('Error parsing test results:', error);
    }
  }

  private async parseSuiteResults(suite: any): Promise<void> {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        await this.parseTestResult(test);
      }
    }
  }

  private async parseTestResult(test: any): Promise<void> {
    const testName = test.title || 'Unknown Test';
    const status = test.results?.[0]?.status || 'skipped';

    // Extract browser information from test title or metadata
    const browser = this.extractBrowserFromTitle(testName);
    const viewport = this.extractViewportFromTitle(testName);
    const theme = this.extractThemeFromTitle(testName);

    // Look for screenshot files
    const screenshotPaths = this.findScreenshotPaths(testName);

    const result: VisualDiffResult = {
      testName,
      browser,
      viewport,
      theme,
      status,
      ...screenshotPaths,
    };

    this.addResult(result);
  }

  private extractBrowserFromTitle(title: string): string {
    const browsers = ['chromium', 'firefox', 'webkit', 'chrome', 'safari', 'edge'];
    for (const browser of browsers) {
      if (title.toLowerCase().includes(browser)) {
        return browser;
      }
    }
    return 'unknown';
  }

  private extractViewportFromTitle(title: string): string {
    const viewports = ['mobile', 'tablet', 'desktop', 'large'];
    for (const viewport of viewports) {
      if (title.toLowerCase().includes(viewport)) {
        return viewport;
      }
    }
    return 'default';
  }

  private extractThemeFromTitle(title: string): string {
    const themes = ['light', 'dark', 'system'];
    for (const theme of themes) {
      if (title.toLowerCase().includes(theme)) {
        return theme;
      }
    }
    return 'default';
  }

  private findScreenshotPaths(testName: string): Partial<VisualDiffResult> {
    const baseName = testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const baselinePath = path.join(this.screenshotDir, 'baseline', `${baseName}.png`);
    const currentPath = path.join(this.screenshotDir, 'current', `${baseName}.png`);
    const diffPath = path.join(this.screenshotDir, 'diff', `${baseName}.png`);

    const paths: Partial<VisualDiffResult> = {};

    if (fs.existsSync(baselinePath)) {
      paths.baselinePath = baselinePath;
    }
    if (fs.existsSync(currentPath)) {
      paths.currentPath = currentPath;
    }
    if (fs.existsSync(diffPath)) {
      paths.diffPath = diffPath;
    }

    return paths;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(): string {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .number { font-size: 2em; font-weight: bold; margin: 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .filters { margin: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
        .filter { padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; }
        .filter.active { background: #007bff; color: white; border-color: #007bff; }
        .results { margin: 20px; }
        .result { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
        .result-header { padding: 15px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
        .result-title { font-weight: bold; margin: 0; }
        .result-status { padding: 4px 12px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-skipped { background: #fff3cd; color: #856404; }
        .result-content { padding: 20px; }
        .screenshot-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
        .screenshot h4 { margin: 0 0 10px 0; }
        .diff-viewer { grid-column: 1 / -1; text-align: center; }
        .metadata { display: flex; gap: 15px; margin-top: 15px; flex-wrap: wrap; }
        .metadata-item { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .no-results { text-align: center; padding: 40px; color: #6c757d; }
        @media (max-width: 768px) {
            .screenshot-comparison { grid-template-columns: 1fr; }
            .filters { flex-direction: column; }
            .metadata { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Visual Regression Test Report</h1>
            <p>Generated on ${new Date(this.reportData.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="number">${this.reportData.summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="number passed">${this.reportData.summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="number failed">${this.reportData.summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Skipped</h3>
                <div class="number skipped">${this.reportData.summary.skipped}</div>
            </div>
        </div>

        <div class="filters">
            <div class="filter active" data-filter="all">All</div>
            ${this.reportData.browsers.map(browser => 
              `<div class="filter" data-filter="browser:${browser}">${browser}</div>`
            ).join('')}
            ${this.reportData.themes.map(theme => 
              `<div class="filter" data-filter="theme:${theme}">${theme}</div>`
            ).join('')}
            ${this.reportData.viewports.map(viewport => 
              `<div class="filter" data-filter="viewport:${viewport}">${viewport}</div>`
            ).join('')}
        </div>

        <div class="results">
            ${this.reportData.results.length === 0 ? 
              '<div class="no-results">No test results found</div>' :
              this.reportData.results.map(result => this.generateResultHTML(result)).join('')
            }
        </div>
    </div>

    <script>
        // Filter functionality
        document.querySelectorAll('.filter').forEach(filter => {
            filter.addEventListener('click', function() {
                document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
                this.classList.add('active');
                
                const filterValue = this.dataset.filter;
                const results = document.querySelectorAll('.result');
                
                results.forEach(result => {
                    if (filterValue === 'all') {
                        result.style.display = 'block';
                    } else {
                        const [type, value] = filterValue.split(':');
                        const metadata = result.querySelector(\`.metadata-item[data-\${type}]\`);
                        result.style.display = metadata && metadata.dataset[type] === value ? 'block' : 'none';
                    }
                });
            });
        });
    </script>
</body>
</html>`;

    const reportPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(reportPath, htmlTemplate);
    return reportPath;
  }

  private generateResultHTML(result: VisualDiffResult): string {
    const hasScreenshots = result.baselinePath || result.currentPath;
    
    return `
    <div class="result" data-status="${result.status}">
        <div class="result-header">
            <h3 class="result-title">${result.testName}</h3>
            <span class="result-status status-${result.status}">${result.status.toUpperCase()}</span>
        </div>
        <div class="result-content">
            <div class="metadata">
                ${result.browser ? `<div class="metadata-item" data-browser="${result.browser}">Browser: ${result.browser}</div>` : ''}
                ${result.viewport ? `<div class="metadata-item" data-viewport="${result.viewport}">Viewport: ${result.viewport}</div>` : ''}
                ${result.theme ? `<div class="metadata-item" data-theme="${result.theme}">Theme: ${result.theme}</div>` : ''}
                ${result.diffRatio ? `<div class="metadata-item">Diff Ratio: ${(result.diffRatio * 100).toFixed(2)}%</div>` : ''}
                ${result.threshold ? `<div class="metadata-item">Threshold: ${(result.threshold * 100).toFixed(2)}%</div>` : ''}
            </div>
            
            ${hasScreenshots ? `
            <div class="screenshot-comparison">
                ${result.baselinePath ? `
                <div class="screenshot">
                    <h4>Baseline</h4>
                    <img src="${path.relative(this.outputDir, result.baselinePath)}" alt="Baseline" />
                </div>
                ` : ''}
                
                ${result.currentPath ? `
                <div class="screenshot">
                    <h4>Current</h4>
                    <img src="${path.relative(this.outputDir, result.currentPath)}" alt="Current" />
                </div>
                ` : ''}
                
                ${result.diffPath ? `
                <div class="diff-viewer">
                    <h4>Difference</h4>
                    <img src="${path.relative(this.outputDir, result.diffPath)}" alt="Difference" />
                </div>
                ` : ''}
            </div>
            ` : '<p>No screenshots available</p>'}
        </div>
    </div>`;
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(): string {
    const reportPath = path.join(this.outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2));
    return reportPath;
  }

  /**
   * Generate markdown report for GitHub
   */
  generateMarkdownReport(): string {
    const markdown = `
# Visual Regression Test Report

**Generated on:** ${new Date(this.reportData.timestamp).toLocaleString()}

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${this.reportData.summary.total} |
| ✅ Passed | ${this.reportData.summary.passed} |
| ❌ Failed | ${this.reportData.summary.failed} |
| ⏭️ Skipped | ${this.reportData.summary.skipped} |

## Results by Browser

${this.reportData.browsers.map(browser => {
  const browserResults = this.reportData.results.filter(r => r.browser === browser);
  const passed = browserResults.filter(r => r.status === 'passed').length;
  const failed = browserResults.filter(r => r.status === 'failed').length;
  return `**${browser}**: ${passed} passed, ${failed} failed`;
}).join('\n')}

## Failed Tests

${this.reportData.results.filter(r => r.status === 'failed').map(result => `
### ${result.testName}

- **Browser:** ${result.browser}
- **Viewport:** ${result.viewport || 'default'}
- **Theme:** ${result.theme || 'default'}
- **Diff Ratio:** ${result.diffRatio ? `${(result.diffRatio * 100).toFixed(2)}%` : 'N/A'}
${result.diffPath ? `- **Diff Image:** [View Diff](${path.relative(this.outputDir, result.diffPath)})` : ''}
`).join('\n')}

---

*This report was generated automatically by the Visual Regression Testing System.*
`;

    const reportPath = path.join(this.outputDir, 'report.md');
    fs.writeFileSync(reportPath, markdown);
    return reportPath;
  }

  /**
   * Generate all reports
   */
  generateAllReports(): { html: string; json: string; markdown: string } {
    return {
      html: this.generateHTMLReport(),
      json: this.generateJSONReport(),
      markdown: this.generateMarkdownReport(),
    };
  }
}

/**
 * Utility function to generate reports from test results
 */
export async function generateVisualReports(
  testResultsPath: string,
  outputDir: string = 'test-results/visual-report'
): Promise<{ html: string; json: string; markdown: string }> {
  const reporter = new VisualDiffReporter(outputDir);
  await reporter.parseTestResults(testResultsPath);
  return reporter.generateAllReports();
}