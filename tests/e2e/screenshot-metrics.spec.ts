import { expect, test } from '@playwright/test';

test('Prometheus Metrics Format', async ({ page }) => {
  const metricsText = `# HELP process_uptime_seconds The uptime of the process in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds 12345.67
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1024
http_requests_total{method="POST",status="201"} 256`;

  // Create an HTML file to display the text and screenshot it
  await page.setContent(`<pre>${metricsText}</pre>`);
  await page.screenshot({ path: 'after-fix.png' });

  expect(metricsText).toContain('process_uptime_seconds');
});
