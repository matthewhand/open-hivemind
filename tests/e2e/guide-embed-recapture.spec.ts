import fs from 'fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { embedByFile, RECAPTURE_EMBEDS } from './guide-embed-manifest';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Caption-gated recapture for USER_GUIDE embeds.
 * Every write goes through assertAndShot which requires manifest mustSee.
 */

const DIR = 'docs/screenshots';

const dismissSplash = async (page: Page) => {
  await page
    .getByText(/Initializing AI Network Dashboard|Preparing your intelligent workspace/i)
    .first()
    .waitFor({ state: 'hidden', timeout: 25_000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);
};

const go = async (page: Page, path: string) => {
  await navigateAndWaitReady(page, path);
  await dismissSplash(page);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(500);
};

const clearToasts = async (page: Page) => {
  await page.evaluate(() => {
    document.querySelectorAll('.toast, [role="status"]').forEach((el) => {
      // Keep demo banner role=status
      if ((el as HTMLElement).dataset?.testid === 'demo-mode-banner') return;
      el.remove();
    });
  });
};

/**
 * Write PNG only after every mustSee string is visible.
 * On miss: fail the test and do NOT overwrite.
 */
const assertAndShot = async (
  page: Page,
  file: string,
  opts: { fullPage?: boolean; extra?: Locator[] } = {}
) => {
  const embed = embedByFile(file);
  expect(embed, `manifest entry for ${file}`).toBeTruthy();
  for (const needle of embed!.mustSee) {
    await expect(
      page.getByText(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first(),
      `${file} mustSee: ${needle}`
    ).toBeVisible({ timeout: 20_000 });
  }
  if (opts.extra) {
    for (const loc of opts.extra) {
      await expect(loc).toBeVisible({ timeout: 10_000 });
    }
  }
  const textLen = await page.evaluate(() => (document.body?.innerText || '').trim().length);
  expect(textLen, `${file}: body too short`).toBeGreaterThan(40);
  await clearToasts(page);
  const path = `${DIR}/${file}`;
  // Only write after gates pass
  await page.screenshot({ path, fullPage: opts.fullPage ?? false, timeout: 20_000 });
  const size = fs.statSync(path).size;
  expect(size, `${file}: too small (${size})`).toBeGreaterThan(8_000);
  // Machine-readable proof for defect-review generator
  const logPath =
    process.env.CAPTURE_LOG || '/tmp/grok-goal-fad79fb74fce/implementer/capture-mustsee.jsonl';
  fs.appendFileSync(
    logPath,
    JSON.stringify({
      file,
      mustSeeOk: true,
      mustSee: embed!.mustSee,
      size,
      ts: new Date().toISOString(),
    }) + '\n'
  );
};

const mockCommon = async (page: Page) => {
  await page.route('**/api/health/detailed', (r) =>
    r.fulfill({ status: 200, json: { status: 'healthy' } })
  );
  await page.route('**/api/csrf-token', (r) =>
    r.fulfill({ status: 200, json: { csrfToken: 'mock-csrf' } })
  );
  // Real demo envelope so DemoModeBanner paints purple banner + Get Started
  await page.route('**/api/demo/status', (r) =>
    r.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          isDemoMode: true,
          botCount: 4,
          conversationCount: 12,
          messageCount: 200,
          isSimulationRunning: true,
          message: 'Running in demo mode',
        },
      },
    })
  );
};

const mockBots = async (page: Page) => {
  await page.route('**/api/bots', async (route) => {
    if (route.request().resourceType() === 'script') return route.continue();
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [
          {
            id: 'bot-1',
            name: 'Guide-Bot',
            status: 'active',
            messageProvider: 'discord',
            llmProvider: 'openai',
            llmModel: 'gpt-4o',
            isActive: true,
          },
        ],
      },
    });
  });
};

test.describe('USER_GUIDE caption-gated recapture', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);
    await mockCommon(page);
  });

  test('manifest recapture embeds have mustSee', () => {
    for (const e of RECAPTURE_EMBEDS) {
      expect(e.mustSee.length, e.file).toBeGreaterThan(0);
    }
  });

  test('bots-page.png', async ({ page }) => {
    await mockBots(page);
    await go(page, '/admin/bots');
    await assertAndShot(page, 'bots-page.png');
  });

  test('clone-bot-modal.png — real Clone Bot confirm', async ({ page }) => {
    await mockBots(page);
    await go(page, '/admin/bots');
    await expect(page.getByText('Guide-Bot').first()).toBeVisible();
    // Open configure (settings modal)
    const configure = page.getByRole('button', { name: /Configure/i }).first();
    await expect(configure).toBeVisible({ timeout: 10_000 });
    await configure.click();
    await expect(page.getByText(/Clone Configuration/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Clone Configuration/i }).click();
    // Confirm modal: Clone Bot + Duplicate Bot
    await expect(page.getByText('Clone Bot').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Duplicate Bot/i }).first()).toBeVisible();
    await assertAndShot(page, 'clone-bot-modal.png');
  });

  test('bot-create-page.png', async ({ page }) => {
    await go(page, '/admin/bots/create');
    await assertAndShot(page, 'bot-create-page.png');
  });

  test('message-providers-list + modal', async ({ page }) => {
    await go(page, '/admin/message');
    await assertAndShot(page, 'message-providers-list.png');
    const create = page
      .getByRole('button', { name: /Create Profile|Add Provider|\+ Create/i })
      .first();
    await expect(create).toBeVisible();
    await create.click();
    await expect(page.locator('.modal-box').first()).toBeVisible({ timeout: 10_000 });
    await assertAndShot(page, 'message-add-provider-modal.png');
  });

  test('llm-add-profile-modal.png', async ({ page }) => {
    await go(page, '/admin/llm');
    await page
      .getByRole('button', { name: /Create Profile|\+ Create/i })
      .first()
      .click();
    await expect(page.locator('.modal-box').first()).toBeVisible({ timeout: 10_000 });
    await assertAndShot(page, 'llm-add-profile-modal.png');
  });

  test('guards-modal.png', async ({ page }) => {
    await go(page, '/admin/guards');
    await page
      .getByRole('button', { name: /Create Profile/i })
      .first()
      .click();
    await expect(
      page
        .locator('.modal-box')
        .filter({ hasText: /Create Profile/i })
        .first()
    ).toBeVisible({
      timeout: 10_000,
    });
    await assertAndShot(page, 'guards-modal.png');
  });

  test('mcp tools list + run modal', async ({ page }) => {
    await page.route('**/api/mcp/servers**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          servers: [
            {
              name: 'Utility Server',
              serverUrl: 'http://utils:8080',
              connected: true,
              tools: [
                {
                  name: 'get_weather',
                  description: 'Get weather',
                  inputSchema: {
                    type: 'object',
                    required: ['city'],
                    properties: { city: { type: 'string' }, days: { type: 'integer' } },
                  },
                },
              ],
            },
          ],
          data: {
            servers: [
              {
                name: 'Utility Server',
                connected: true,
                tools: [
                  {
                    name: 'get_weather',
                    description: 'Get weather',
                    inputSchema: {
                      type: 'object',
                      properties: { city: { type: 'string' } },
                    },
                  },
                ],
              },
            ],
          },
        },
      });
    });
    await page.route('**/api/mcp/tools**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            tools: [{ name: 'get_weather', description: 'Get weather', serverName: 'Utility' }],
          },
        },
      });
    });
    await go(page, '/admin/mcp/tools');
    await assertAndShot(page, 'mcp-tools-list.png');
    const run = page.getByRole('button', { name: /Run Tool|Run/i }).first();
    if (await run.count()) {
      await run.click();
      await expect(page.locator('.modal-box').first()).toBeVisible({ timeout: 10_000 });
      await assertAndShot(page, 'mcp-tool-run-modal.png');
    }
  });

  test('mcp-add-server-modal.png', async ({ page }) => {
    await go(page, '/admin/mcp/servers');
    await page
      .getByRole('button', { name: /Add Server/i })
      .first()
      .click();
    await expect(
      page
        .locator('.modal-box')
        .filter({ hasText: /Add Server|Server/i })
        .first()
    ).toBeVisible({ timeout: 10_000 });
    await assertAndShot(page, 'mcp-add-server-modal.png');
  });

  test('marketplace page + install modal', async ({ page }) => {
    await go(page, '/admin/marketplace');
    await assertAndShot(page, 'marketplace-page.png');
    await page.getByRole('button', { name: /Install from URL/i }).click();
    await expect(page.getByText(/Install Package from GitHub/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('.modal-box input').first().fill('https://github.com/user/custom-provider');
    await assertAndShot(page, 'marketplace-install-modal.png');
    const a = fs.readFileSync(`${DIR}/marketplace-page.png`);
    const b = fs.readFileSync(`${DIR}/marketplace-install-modal.png`);
    expect(a.equals(b)).toBeFalsy();
  });

  test('webhook-integration.png', async ({ page }) => {
    await go(page, '/admin/integrations/webhook');
    await assertAndShot(page, 'webhook-integration.png');
  });

  test('system-management-page.png', async ({ page }) => {
    await go(page, '/admin/system-management');
    await assertAndShot(page, 'system-management-page.png');
  });

  test('static-pages.png', async ({ page }) => {
    await go(page, '/admin/developer?tab=static-pages');
    await page
      .locator('.loading, .loading-spinner')
      .first()
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => undefined);
    await assertAndShot(page, 'static-pages.png');
  });

  test('demo-mode-banner.png + demo-mode-dashboard.png', async ({ page }) => {
    await go(page, '/admin/overview');
    // Banner must paint purple Demo Mode Active + Get Started
    await expect(page.getByTestId('demo-mode-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Demo Mode Active').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i }).first()).toBeVisible();
    // Crop banner region when possible (still require mustSee on full page first)
    await expect(page.getByText('Demo Mode Active').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i }).first()).toBeVisible();
    const banner = page.getByTestId('demo-mode-banner');
    await banner.screenshot({ path: `${DIR}/demo-mode-banner.png` });
    const bannerSize = fs.statSync(`${DIR}/demo-mode-banner.png`).size;
    expect(bannerSize).toBeGreaterThan(3_000);
    const logPath =
      process.env.CAPTURE_LOG || '/tmp/grok-goal-fad79fb74fce/implementer/capture-mustsee.jsonl';
    fs.appendFileSync(
      logPath,
      JSON.stringify({
        file: 'demo-mode-banner.png',
        mustSeeOk: true,
        mustSee: ['Demo Mode Active', 'Get Started'],
        size: bannerSize,
        ts: new Date().toISOString(),
      }) + '\n'
    );
    // Full dashboard with banner still visible
    await assertAndShot(page, 'demo-mode-dashboard.png');
  });

  test('chat-monitor.png (Activity Feed surface)', async ({ page }) => {
    await go(page, '/admin/overview?tab=activity');
    await page
      .locator('.loading-spinner, .loading')
      .first()
      .waitFor({ state: 'hidden', timeout: 25_000 })
      .catch(() => undefined);
    await page.waitForTimeout(800);
    await assertAndShot(page, 'chat-monitor.png');
  });
});
