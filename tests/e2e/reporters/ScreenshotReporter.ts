import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

class ScreenshotReporter implements Reporter {
  private screenshots: any[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') {
      const screenshotAttachment = result.attachments.find((attachment) => attachment.name === 'screenshot');
      if (screenshotAttachment && screenshotAttachment.path) {
        this.screenshots.push({
          testTitle: test.title,
          testPath: test.location.file,
          screenshotPath: screenshotAttachment.path
        });
      }
    }
  }

  onEnd(result: FullResult) {
    const reportPath = path.join(process.cwd(), 'playwright-report', 'screenshots.json');
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(this.screenshots, null, 2));
  }
}

export default ScreenshotReporter;
