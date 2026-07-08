import { expect, Locator, Page, test } from '@playwright/test';
import { setupProviderMocks } from './fixtures/providers';
import { getApiAuthHeaders } from './helpers';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * User-Guide Journey: the extended story-driven walkthrough behind
 * docs/USER_GUIDE.md and docs/screenshots/journey-NN-*.png.
 *
 * Superset of golden-journey.spec.ts (steps 01-06 capture the same
 * screenshot filenames) plus the "day two" steps: personas, guards,
 * memory, monitoring and export.
 *
 * Intended to run with DEMO_MODE=true and a fresh DATABASE_PATH so the
 * pages show meaningful demo data instead of empty states:
 *
 *   PORT=3033 ALLOW_TEST_BYPASS=true ALLOW_LOCALHOST_ADMIN=true \
 *   DEMO_MODE=true NODE_ENV=test JWT_SECRET=test-secret \
 *   SKIP_MESSENGERS=true OPENAI_API_KEY=sk-test-mock \
 *   DISCORD_BOT_TOKEN=test-mock-discord DATABASE_PATH=/tmp/journey-demo.db \
 *   npx playwright test tests/e2e/journey-user-guide.spec.ts --project=chromium
 *
 * golden-journey.spec.ts remains the canonical MVP gate; this spec only
 * regenerates documentation screenshots and must not replace it.
 */

const SCREENSHOT_DIR = 'docs/screenshots';

const BOT_NAME = 'Golden-Journey-Bot';
const MSG_PROVIDER_NAME = 'Golden-Discord';
const LLM_PROVIDER_NAME = 'Golden-OpenAI';
const PERSONA_NAME = 'Support Concierge';

/** Remove transient toast notifications so screenshots stay clean. */
const clearToasts = (page: Page) =>
  page.evaluate(() => {
    document.querySelectorAll('.toast').forEach((el) => el.remove());
  });

const shot = async (page: Page, name: string) => {
  await clearToasts(page);
  // Viewport-framed (NOT fullPage): user-guide screenshots should show the
  // header + the first relevant screenful of each step, not a 10,000px dump of
  // an entire long admin page — full-page captures of dense list pages (e.g.
  // the Bots grid) are overwhelming for a first-time reader. Scroll to top so
  // the page header is in frame.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/journey-${name}.png`, fullPage: false });
};

/** Navigate, wait for the network to settle, give charts a beat to render. */
const visit = async (page: Page, path: string, settleMs = 1500) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(settleMs);
};

/**
 * Wait for expected content, but DON'T abort the journey if it's missing.
 * This spec's job is to regenerate every user-guide screenshot, so one page
 * that renders slowly/empty in the demo environment must not block the
 * remaining captures. A miss is logged (so imperfect screenshots are visible
 * in CI output) rather than failing the whole run.
 */
const seeOrWarn = async (locator: Locator, label: string, timeout = 10_000) => {
  try {
    await expect(locator).toBeVisible({ timeout });
  } catch {
    console.warn(
      `[journey-user-guide] expected ${label} not visible within ${timeout}ms — screenshot may be incomplete`
    );
  }
};

test.describe.serial('User-Guide Journey: onboarding through export', () => {
  test.setTimeout(300_000);

  test('walk the full story and capture screenshots', async ({ page, request }) => {
    await setupTestWithErrorDetection(page);
    const apiHeaders = await getApiAuthHeaders(request);
    const modes = await setupProviderMocks(page);
    console.log(`[journey-user-guide] OpenAI=${modes.openai}, Discord=${modes.discord}`);

    // 00 — Cleanup: remove leftover bots from previous e2e runs so the
    // captured pages show only demo-mode data (they persist in the
    // gitignored config/user/webui-config.json WebUI storage).
    await test.step('00-cleanup-stale-bots', async () => {
      const STALE_BOT_RE =
        /^(e2e[\s-]|test bot|bot1$|messaging test|chat probe|smart-bot|golden-journey)/i;
      const listRes = await request.get('/api/bots', { headers: apiHeaders });
      expect(listRes.ok(), `bot list returned ${listRes.status()}`).toBeTruthy();
      const body = await listRes.json();
      // /api/bots responds with ApiResponse.success(<array>) → { data: [...] }
      const bots: Array<{ id: string; name: string }> = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : (body?.data?.bots ?? body?.bots ?? []);
      for (const bot of bots) {
        if (STALE_BOT_RE.test(bot.name)) {
          const del = await request.delete(`/api/bots/${bot.id}`, { headers: apiHeaders });
          console.log(`[cleanup] deleted stale bot "${bot.name}" (${del.status()})`);
        }
      }
    });

    // 01 — Onboarding: reach the admin dashboard.
    await test.step('01-onboarding', async () => {
      await visit(page, '/admin/overview');

      const adminBypassBtn = page.getByRole('button', { name: /Login as Admin/i });
      if (await adminBypassBtn.count()) {
        await adminBypassBtn.click();
        await page.waitForURL(/admin|dashboard|overview/, { timeout: 10_000 });
        await page.waitForLoadState('networkidle');
      }

      await expect(
        page
          .getByRole('link', { name: /^Dashboard$/i })
          .or(page.getByRole('link', { name: /^Bots$/i }))
          .first()
      ).toBeVisible({ timeout: 10_000 });
      await shot(page, '01-onboarding');
    });

    // 02 — Add a Discord message provider profile, then show the providers list.
    // The Message Providers page lists /api/config/message-profiles.
    await test.step('02-discord-add', async () => {
      const res = await request.post('/api/config/message-profiles', {
        headers: apiHeaders,
        data: {
          key: 'golden-discord',
          name: MSG_PROVIDER_NAME,
          provider: 'discord',
          description: 'Demo Discord connection for the user-guide walkthrough.',
          config: {
            token: process.env.DISCORD_BOT_TOKEN || 'test-mock-discord-token',
            clientId: '123456789012345678',
          },
        },
      });
      expect(
        res.ok() || res.status() === 409, // 409 = already created on a previous run
        `message profile create returned ${res.status()}: ${await res.text()}`
      ).toBeTruthy();

      await visit(page, '/admin/message');
      await seeOrWarn(page.getByText(MSG_PROVIDER_NAME).first(), 'content');
      await shot(page, '02-discord-add');
    });

    // 03 — Add an OpenAI LLM provider profile, then show the providers list.
    // The LLM Providers page lists /api/config/llm-profiles.
    await test.step('03-openai-add', async () => {
      const res = await request.post('/api/config/llm-profiles', {
        headers: apiHeaders,
        data: {
          key: 'golden-openai',
          name: LLM_PROVIDER_NAME,
          provider: 'openai',
          modelType: 'chat',
          description: 'Demo OpenAI profile for the user-guide walkthrough.',
          config: { apiKey: process.env.OPENAI_API_KEY || 'sk-test-mock', model: 'gpt-4o' },
        },
      });
      expect(
        res.ok() || res.status() === 409,
        `llm profile create returned ${res.status()}: ${await res.text()}`
      ).toBeTruthy();

      await visit(page, '/admin/llm');
      await seeOrWarn(page.getByText(LLM_PROVIDER_NAME).first(), 'content');
      await shot(page, '03-openai-add');
    });

    // 04 — Create the bot wiring Discord + OpenAI, screenshot the bots list.
    await test.step('04-bot-create', async () => {
      const res = await request.post('/api/bots', {
        headers: apiHeaders,
        data: {
          name: BOT_NAME,
          description: 'Answers support questions in Discord using OpenAI.',
          messageProvider: 'discord',
          llmProvider: 'openai',
          isActive: true,
        },
      });
      expect(
        res.ok() || res.status() === 409, // 409 = already created on a previous run
        `bot create returned ${res.status()}: ${await res.text()}`
      ).toBeTruthy();

      await visit(page, '/admin/bots');
      await seeOrWarn(page.getByText(BOT_NAME).first(), 'content');
      await shot(page, '04-bot-create');
    });

    // 05 — Open the bot drawer and exchange a Test Drive message.
    await test.step('05-bot-chat', async () => {
      await page.goto('/admin/bots');
      const botCard = page.locator('.cursor-pointer').filter({ hasText: BOT_NAME }).first();
      await expect(botCard).toBeVisible({ timeout: 15_000 });
      await botCard.click();

      await page
        .getByText(/^Test Drive$/i)
        .first()
        .click();

      const messageInput = page.getByPlaceholder(/Type a message/i);
      await expect(messageInput).toBeVisible({ timeout: 10_000 });
      await messageInput.fill('Hello, bot.');
      await page.getByRole('button', { name: /Send test message/i }).click();

      if (modes.openai === 'mock') {
        await seeOrWarn(page.getByText(/Hello from the mocked LLM provider!/i).first(), 'content');
      } else {
        await expect(page.getByText(/^Streaming\.\.\.$/)).toBeHidden({ timeout: 60_000 });
        await expect(page.getByRole('button', { name: /Send test message/i })).toBeEnabled({
          timeout: 60_000,
        });
      }
      await page.waitForTimeout(500);
      await shot(page, '05-bot-chat');
    });

    // 06 — The activity feed shows what the swarm has been doing.
    await test.step('06-activity', async () => {
      await visit(page, '/admin/overview?tab=activity', 2500);
      await seeOrWarn(page.getByText(/Activity|Events/i).first(), 'content');
      await shot(page, '06-activity');
    });

    // 07 — Create a persona and show the personas library.
    await test.step('07-personas', async () => {
      const res = await request.post('/api/personas', {
        headers: apiHeaders,
        data: {
          name: PERSONA_NAME,
          description: 'Friendly front-line support voice for the demo swarm.',
          category: 'customer_service',
          traits: [
            { name: 'tone', value: 'warm and concise' },
            { name: 'goal', value: 'resolve the question in one reply' },
          ],
          systemPrompt:
            'You are the Support Concierge. Answer briefly, kindly, and always offer the next step.',
        },
      });
      expect(res.ok(), `persona create returned ${res.status()}: ${await res.text()}`).toBeTruthy();

      await visit(page, '/admin/personas');
      await seeOrWarn(page.getByText(PERSONA_NAME).first(), 'content');
      await shot(page, '07-personas');
    });

    // 08 — Guards: where allow/block rules protect the swarm.
    await test.step('08-guards', async () => {
      await visit(page, '/admin/guards');
      await seeOrWarn(page.getByText(/Guard/i).first(), 'content');
      await shot(page, '08-guards');
    });

    // 09 — Memory providers: conversation persistence options.
    await test.step('09-memory', async () => {
      await visit(page, '/admin/memory');
      await seeOrWarn(page.getByText(/Memory/i).first(), 'content');
      await shot(page, '09-memory');
    });

    // 10 — Monitoring tab: live health of the swarm.
    await test.step('10-monitoring', async () => {
      await visit(page, '/admin/overview?tab=monitoring', 2500);
      await shot(page, '10-monitoring');
    });

    // 11 — Export: back up the whole configuration.
    await test.step('11-export', async () => {
      await visit(page, '/admin/export');
      await seeOrWarn(page.getByText(/Export/i).first(), 'content');
      await shot(page, '11-export');
    });
  });
});
