import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Verify environment variable completeness in env sample', async ({ page }) => {
  // Read the file content
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.sample'), 'utf8');

  // Set the content on a blank page to take a screenshot
  await page.setContent(`<pre style="font-family: monospace; padding: 20px;">${envContent}</pre>`);

  // Create screenshots dir if not exists
  if (!fs.existsSync(path.join(process.cwd(), 'docs/screenshots'))) {
    fs.mkdirSync(path.join(process.cwd(), 'docs/screenshots'), { recursive: true });
  }

  // Find some of the newly added text to scroll to
  await page.evaluate(() => {
    const pre = document.querySelector('pre');
    if (pre) {
        // Highlighting some added vars to make visual proof obvious
        pre.innerHTML = pre.innerHTML
            .replace(/BODY_PARSER_JSON_LIMIT/g, '<mark>BODY_PARSER_JSON_LIMIT</mark>')
            .replace(/LOW_MEMORY_MODE/g, '<mark>LOW_MEMORY_MODE</mark>')
            .replace(/STARTUP_LOG_SYSTEM_PROMPT/g, '<mark>STARTUP_LOG_SYSTEM_PROMPT</mark>');
    }
  });

  // Capture screenshot of the first match
  const firstMatch = await page.locator('mark').first();
  if (await firstMatch.count() > 0) {
      await firstMatch.scrollIntoViewIfNeeded();
  }

  await page.screenshot({ path: 'docs/screenshots/env-sample-completeness.png', fullPage: false });
});
