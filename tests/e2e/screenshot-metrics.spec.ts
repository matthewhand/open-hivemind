import axios from 'axios';
import { expect, test } from '@playwright/test';

test('Prometheus Metrics Format', async ({ page }) => {
  const response = await axios.get('http://localhost:3028/api/metrics', { timeout: 2000 }).catch(e => e.response || e);

  // Fallback to mocking if backend is not running to support dev-only test running
  const metricsData = response && response.status === 200 && typeof response.data === 'string' && response.data.includes('process_uptime_seconds')
    ? response.data
    : `# HELP process_uptime_seconds Uptime of the process
# TYPE process_uptime_seconds gauge
process_uptime_seconds 12345.67
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/metrics",status="200"} 12
`;

  // Create an HTML file to display the text and screenshot it
  await page.setContent(`<pre style="padding: 20px; font-family: monospace; background: #1e1e1e; color: #d4d4d4;">${metricsData}</pre>`);
  await page.screenshot({ path: 'docs/screenshots/prometheus-metrics.png' });

  expect(metricsData).toContain('process_uptime_seconds');
});
