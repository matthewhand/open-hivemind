import axios from 'axios';
import { expect, test } from '@playwright/test';

test('Prometheus Metrics Format', async ({ page }) => {
  const response = await axios.get('http://localhost:3028/metrics');

  // Create an HTML file to display the text and screenshot it
  await page.setContent(`<pre>${response.data}</pre>`);
  await page.screenshot({ path: 'after-fix.png' });

  expect(response.status).toBe(200);
  expect(response.data).toContain('process_uptime_seconds');
});
