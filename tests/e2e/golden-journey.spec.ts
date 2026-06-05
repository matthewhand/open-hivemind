import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { setupProviderMocks } from './fixtures/providers';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * Golden Journey: the canonical user-walkthrough for Open-Hivemind.
 *
 * Six steps, each ending with a screenshot that feeds
 * docs/screenshots/journey-NN-*.png and the "Golden Journey" section
 * of docs/screenshots/README.md.
 *
 * Hybrid approach:
 *   - API requests for backend setup (provider creation, bot wiring) —
 *     fast and not coupled to UI selectors that drift.
 *   - UI navigation for the user-facing surfaces that document the
 *     product (dashboard, provider lists, chat, activity log).
 *
 * Modes:
 *   - Mocked   (default): `npm run test:journey`              — sentinel keys
 *   - Integration:        `npm run test:journey:integration`  — real .env / shell
 *
 * Integration mode requires:
 *   - A reachable OpenAI-compatible endpoint (set OPENAI_BASE_URL if non-default).
 *   - The server-side /api/admin/llm-providers/providers/:type/test-stream
 *     bridge in src/server/routes/admin/llmProviders.ts (calls the real
 *     provider plugin and emits SSE chunks).
 *
 * This spec is the *definition of MVP*. If a step can't pass in mocked
 * mode, that feature is not MVP yet — see ROADMAP.md.
 *
 * Current status (2026-05-17): ALL SIX STEPS GREEN.
 *   ✅ 01-onboarding    — admin sidebar reachable via auto-bypass
 *   ✅ 02-discord-add   — API create + list-page screenshot
 *   ✅ 03-openai-add    — API create + list-page screenshot
 *   ✅ 04-bot-create    — API create + list-page screenshot
 *   ✅ 05-bot-chat      — open bot drawer, switch to Test Drive tab,
 *                         exchange a message; SSE mock returns canned reply
 *   ✅ 06-activity      — activity log page renders
 */

const SCREENSHOT_DIR = 'docs/screenshots';
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${SCREENSHOT_DIR}/journey-${name}.png`, fullPage: true });

const BOT_NAME = 'Golden-Journey-Bot';
const MSG_PROVIDER_NAME = 'Golden-Discord';
const LLM_PROVIDER_NAME = 'Golden-OpenAI';

function authHeaders(): Record<string, string> {
  const jwtSecret = process.env.JWT_SECRET || 'e2e-test-secret-mock';
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 3600,
      username: 'admin',
      userId: 'admin',
      role: 'admin',
      permissions: ['*'],
    },
    jwtSecret
  );
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test.describe.serial('Golden Journey: Discord + OpenAI', () => {
  test.setTimeout(180_000);

  test('configure providers, create bot, exchange a message', async ({ page, request }) => {
    await setupTestWithErrorDetection(page);
    const modes = await setupProviderMocks(page);
    console.log(`[golden-journey] OpenAI=${modes.openai}, Discord=${modes.discord}`);

    // 01 — Onboarding / Login: dashboard reachable (either via auto-bypass
    // or via the trusted-network "Login as Admin" button).
    await test.step('01-onboarding: reach the admin dashboard', async () => {
      await page.goto('/admin/overview');
      await page.waitForLoadState('networkidle');

      // If we landed on the login page (no bypass), click the trusted-network button.
      const adminBypassBtn = page.getByRole('button', { name: /Login as Admin/i });
      if (await adminBypassBtn.count()) {
        await adminBypassBtn.click();
        await page.waitForURL(/admin|dashboard|overview/, { timeout: 10_000 });
        await page.waitForLoadState('networkidle');
      }

      // Assert the admin sidebar is rendered — proves we're authenticated.
      await expect(
        page
          .getByRole('menuitem', { name: /^Dashboard$/i })
          .or(page.getByRole('menuitem', { name: /^Bots$/i }))
          .first()
      ).toBeVisible({ timeout: 10_000 });
      await shot(page, '01-onboarding');
    });

    // 02 — Add Discord message provider (API), then show the providers list
    await test.step('02-discord-add: create Discord message provider via API + screenshot list', async () => {
      const res = await request.post('/api/admin/messenger-providers', {
        headers: authHeaders(),
        data: {
          name: MSG_PROVIDER_NAME,
          type: 'discord',
          config: {
            token: process.env.DISCORD_BOT_TOKEN || 'test-mock-discord-token',
            clientId: '123456789012345678',
          },
        },
      });
      expect(
        res.ok(),
        `messenger create returned ${res.status()}: ${await res.text()}`
      ).toBeTruthy();

      await page.goto('/admin/providers/message');
      await page.waitForLoadState('networkidle');
      await shot(page, '02-discord-add');
    });

    // 03 — Add OpenAI LLM provider (API), then show the providers list
    await test.step('03-openai-add: create OpenAI LLM provider via API + screenshot list', async () => {
      const res = await request.post('/api/admin/llm-providers', {
        headers: authHeaders(),
        data: {
          name: LLM_PROVIDER_NAME,
          type: 'openai',
          modelType: 'chat',
          config: { apiKey: process.env.OPENAI_API_KEY || 'sk-test-mock', model: 'gpt-4o' },
        },
      });
      expect(res.ok(), `llm create returned ${res.status()}: ${await res.text()}`).toBeTruthy();

      await page.goto('/admin/providers/llm');
      await page.waitForLoadState('networkidle');
      await shot(page, '03-openai-add');
    });

    // 04 — Create bot wiring Discord + OpenAI (API), screenshot the bots list
    await test.step('04-bot-create: create bot wiring Discord + OpenAI via API + screenshot list', async () => {
      const res = await request.post('/api/bots', {
        headers: authHeaders(),
        data: {
          name: BOT_NAME,
          messageProvider: 'discord',
          llmProvider: 'openai',
          isActive: true,
        },
      });
      expect(res.ok(), `bot create returned ${res.status()}: ${await res.text()}`).toBeTruthy();

      await page.goto('/admin/bots');
      await page.waitForLoadState('networkidle');
      await shot(page, '04-bot-create');
    });

    // 05 — Open the bot detail drawer, switch to Test Drive, exchange a message
    await test.step('05-bot-chat: open the bot drawer and exchange a test message', async () => {
      // Bot may not be in the list yet if the bots-page fetch ran before API create
      // committed. Reload until the bot name appears (with a generous timeout).
      await page.goto('/admin/bots');
      const botCard = page.locator('.cursor-pointer').filter({ hasText: BOT_NAME }).first();
      await expect(botCard).toBeVisible({ timeout: 15_000 });
      await botCard.click();

      // Drawer slides in; switch to Test Drive tab (label text inside a span).
      await page
        .getByText(/^Test Drive$/i)
        .first()
        .click();

      // Chat input — accessible name "Type a message to test the bot..."
      const messageInput = page.getByPlaceholder(/Type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 10_000 });
      await messageInput.fill('Hello, bot.');

      // Send button has aria-label="Send test message"
      await page.getByRole('button', { name: /Send test message/i }).click();

      if (modes.openai === 'mock') {
        // SSE mock returns the canned reply
        await expect(page.getByText(/Hello from the mocked LLM provider!/i).first()).toBeVisible({
          timeout: 15_000,
        });
      } else {
        // Real LLM: assert the streaming indicator disappears and the send
        // button re-enables — meaning *some* assistant reply landed. Content
        // varies by model so we don't pin a specific string.
        await expect(page.getByText(/^Streaming\.\.\.$/)).toBeHidden({ timeout: 60_000 });
        await expect(page.getByRole('button', { name: /Send test message/i })).toBeEnabled({
          timeout: 60_000,
        });
      }
      await shot(page, '05-bot-chat');
    });

    // 06 — Verify the activity log surface renders without error
    await test.step('06-activity: activity log page renders', async () => {
      await page.goto('/admin/activity');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/Activity|Events/i).first()).toBeVisible();
      await shot(page, '06-activity');
    });
  });
});
