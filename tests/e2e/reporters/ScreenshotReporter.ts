
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class ScreenshotReporter implements Reporter {
  onTestEnd(test, result) {}
}

export default ScreenshotReporter;
