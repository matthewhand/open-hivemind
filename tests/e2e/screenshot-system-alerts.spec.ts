import { expect, test } from '@playwright/test';

test.describe('System Alerts Screenshots', () => {
  test('capture System Alerts documentation screenshot', async ({ page }) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alert Component Screenshot</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@4.10.1/dist/full.min.css" rel="stylesheet" type="text/css" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { padding: 20px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; }
        </style>
      </head>
      <body class="bg-base-100 flex items-center justify-center min-h-screen">
        <div class="w-full max-w-2xl bg-base-200 p-8 rounded-xl shadow-xl space-y-6" id="screenshot-target">
          <h2 class="text-2xl font-bold mb-4">System Alerts</h2>

          <div role="alert" class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <h3 class="font-bold">New software update available.</h3>
              <div class="text-xs">Version 2.0.0 is now ready for deployment.</div>
            </div>
            <button class="btn btn-sm btn-ghost">Update</button>
          </div>

          <div role="alert" class="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Configuration saved successfully!</span>
          </div>

          <div role="alert" class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>Warning: Rate limits are approaching the maximum threshold.</span>
          </div>

          <div role="alert" class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Error! Database connection failed.</span>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    const element = page.locator('#screenshot-target');
    await expect(element).toBeVisible();

    await element.screenshot({ path: 'docs/screenshots/system-alerts.png' });
  });
});
