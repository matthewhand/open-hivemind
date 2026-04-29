import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

class ScreenshotReporter implements Reporter {
  private failsDir: string;

  constructor(options: { failsDir?: string } = {}) {
    this.failsDir = options.failsDir || path.join(process.cwd(), 'test-results', 'failures');

    // Ensure directory exists
    if (!fs.existsSync(this.failsDir)) {
      fs.mkdirSync(this.failsDir, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'passed' && result.status !== 'skipped') {
      const attachments = result.attachments;
      const screenshot = attachments.find(a => a.name === 'screenshot');

      if (screenshot && screenshot.path) {
        // Safe filename replacing spaces and special chars
        const safeTitle = test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const destFile = path.join(this.failsDir, `${safeTitle}-${test.id}.png`);

        try {
          fs.copyFileSync(screenshot.path, destFile);
          console.log(`\n📸 Saved failure screenshot to: ${destFile}`);
        } catch (e) {
          console.error(`Failed to save screenshot: ${e}`);
        }
      }
    }
  }
}

export default ScreenshotReporter;
