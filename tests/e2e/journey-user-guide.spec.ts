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

const shot = async (page: Page, name: string, opts: { keepScroll?: boolean } = {}) => {
  await clearToasts(page);
  // Viewport-framed (NOT fullPage): user-guide screenshots should show the
  // header + the first relevant screenful of each step, not a 10,000px dump of
  // an entire long admin page — full-page captures of dense list pages (e.g.
  // the Bots grid) are overwhelming for a first-time reader. Scroll to top so
  // the page header is in frame — unless keepScroll is set (activity feed rows
  // live below the KPI strip).
  if (!opts.keepScroll) {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
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

    // 01 — Onboarding wizard (reset so the capture shows the real wizard UI,
    // not the Overview dashboard — filename/caption are "onboarding").
    await test.step('01-onboarding', async () => {
      // Best-effort reset; demo data may auto-complete status again later.
      const resetRes = await request.post('/api/onboarding/reset', { headers: apiHeaders });
      console.log(`[journey-user-guide] onboarding reset status=${resetRes.status()}`);

      await visit(page, '/onboarding', 2000);

      const adminBypassBtn = page.getByRole('button', { name: /Login as Admin/i });
      if (await adminBypassBtn.count()) {
        // Stay on onboarding after trusted entry if possible; otherwise re-open wizard.
        await adminBypassBtn.click();
        await page.waitForLoadState('networkidle');
        await visit(page, '/onboarding', 1500);
      }

      await seeOrWarn(
        page.getByText(/onboarding|get started|welcome|step\s*1|llm provider|set up/i).first(),
        'onboarding content'
      );
      await shot(page, '01-onboarding');

      // Land in admin shell for subsequent steps.
      await visit(page, '/admin/overview');
      await expect(
        page
          .getByRole('link', { name: /^Dashboard$/i })
          .or(page.getByRole('link', { name: /^Bots$/i }))
          .first()
      ).toBeVisible({ timeout: 10_000 });
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
      const llmSearch = page.getByPlaceholder(/Search profiles/i).first();
      await expect(llmSearch).toBeVisible({ timeout: 10_000 });
      await llmSearch.click();
      await llmSearch.fill('');
      await llmSearch.fill(LLM_PROVIDER_NAME);
      await page.waitForTimeout(800);
      await expect(page.getByText(LLM_PROVIDER_NAME).first()).toBeVisible({ timeout: 15_000 });
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
          // Prefer the profile created in step 03 so Test Drive shows a real model.
          llmProfile: 'golden-openai',
          llmModel: 'gpt-4o',
          systemInstruction: 'You are a helpful support bot for the user-guide demo.',
          isActive: true,
          config: {
            openai: { apiKey: process.env.OPENAI_API_KEY || 'sk-test-mock', model: 'gpt-4o' },
          },
        },
      });
      expect(
        res.ok() || res.status() === 409, // 409 = already created on a previous run
        `bot create returned ${res.status()}: ${await res.text()}`
      ).toBeTruthy();
      // Ensure list payload includes model + active for clean screenshots even if
      // an older bot row was left from a prior run (409 path).
      const created = await res.json().catch(() => ({}));
      const botId =
        created?.data?.id ||
        created?.id ||
        (await (async () => {
          const list = await request.get('/api/bots', { headers: apiHeaders });
          const body = await list.json();
          const bots = Array.isArray(body?.data) ? body.data : body?.data?.bots || [];
          return bots.find((b: { name: string }) => b.name === BOT_NAME)?.id as string | undefined;
        })());
      if (botId) {
        await request.put(`/api/bots/${botId}`, {
          headers: apiHeaders,
          data: {
            isActive: true,
            llmModel: 'gpt-4o',
            llmProvider: 'openai',
            description: 'Answers support questions in Discord using OpenAI.',
            systemInstruction: 'You are a helpful support bot for the user-guide demo.',
          },
        });
      }

      await visit(page, '/admin/bots');
      // Filter so Golden-Journey-Bot is in the viewport (demo fleets are large).
      const search = page.getByPlaceholder(/Search agents/i).first();
      await expect(search).toBeVisible({ timeout: 10_000 });
      await search.click();
      await search.fill('');
      await search.fill(BOT_NAME);
      await page.waitForTimeout(800);
      // Hard requirement: the created bot must appear for the guide shot.
      await expect(page.getByText(BOT_NAME).first()).toBeVisible({ timeout: 15_000 });
      // Prefer Running/active badge on the Golden bot card (not other page chrome).
      const goldenCard = page
        .locator('.cursor-pointer, .card')
        .filter({ hasText: BOT_NAME })
        .first();
      await seeOrWarn(goldenCard.getByText(/Running|Active/i).first(), 'active status badge');
      await shot(page, '04-bot-create');
    });

    // 05 — Open the bot drawer and exchange a Test Drive message.
    await test.step('05-bot-chat', async () => {
      await page.goto('/admin/bots');
      const search = page.getByPlaceholder(/Search agents/i);
      if (await search.count()) {
        await search.fill(BOT_NAME);
        await page.waitForTimeout(400);
      }
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
      // Prefer a tight crop of the drawer so MODEL + conversation fit in frame.
      await page.waitForTimeout(300);
      await seeOrWarn(page.getByText(/gpt-4o|Hello from the mocked/i).first(), 'model or reply');
      const drawer = page.locator('.drawer-side, [role="dialog"], aside').last();
      if (await drawer.count()) {
        await clearToasts(page);
        await drawer.screenshot({ path: `${SCREENSHOT_DIR}/journey-05-bot-chat.png` });
      } else {
        await shot(page, '05-bot-chat', { keepScroll: true });
      }
    });

    // 06 — The activity feed shows what the swarm has been doing.
    await test.step('06-activity', async () => {
      await visit(page, '/admin/overview?tab=activity', 3000);
      await seeOrWarn(page.getByText(/Activity|Events/i).first(), 'content');
      // The event table sits below the KPI strip inside a nested scroll area.
      // Scroll the main page AND any overflow containers so rows enter the viewport.
      await page.evaluate(() => {
        const candidates = Array.from(
          document.querySelectorAll('table tbody tr, [data-testid="activity-row"], .timeline-item')
        );
        const firstRow = candidates[0] as HTMLElement | undefined;
        if (firstRow) {
          firstRow.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        } else {
          // Fallback: nudge past the KPI strip (~360px on 720p).
          window.scrollTo(0, 420);
          document.querySelectorAll('.overflow-auto, .overflow-y-auto, main').forEach((el) => {
            (el as HTMLElement).scrollTop = 280;
          });
        }
      });
      await page.waitForTimeout(600);
      await seeOrWarn(
        page.getByText(/incoming|outgoing|success|filter|discord|openai|channel/i).first(),
        'activity detail'
      );
      await shot(page, '06-activity', { keepScroll: true });
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

      await visit(page, '/admin/personas', 2000);
      const personaSearch = page.getByPlaceholder(/Search personas/i).first();
      await expect(personaSearch).toBeVisible({ timeout: 10_000 });
      await personaSearch.click();
      await personaSearch.fill('');
      await personaSearch.fill(PERSONA_NAME);
      await page.waitForTimeout(800);
      // Must show Support Concierge (filtered), not a generic unfiltered grid.
      await expect(page.getByText(PERSONA_NAME).first()).toBeVisible({ timeout: 15_000 });
      await expect(personaSearch).toHaveValue(PERSONA_NAME);
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
      const res = await request.post('/api/config/memory-profiles', {
        headers: apiHeaders,
        data: {
          key: 'golden-memory',
          name: 'Golden-Memory',
          provider: 'mem0',
          type: 'redis',
          description: 'Demo memory backend for the user-guide walkthrough.',
          config: {
            host: 'localhost',
            port: 6379,
            vectorStoreProvider: 'memory',
          },
          isDefault: false,
        },
      });
      expect(
        res.ok() || res.status() === 409,
        `memory profile create returned ${res.status()}: ${await res.text()}`
      ).toBeTruthy();

      await visit(page, '/admin/memory', 2500);
      // Product fix: MemoryProvidersPage must unwrap ApiResponse envelope so
      // seeded profiles appear. Hard-require Golden-Memory in the shot.
      await expect(page.getByText('Golden-Memory').first()).toBeVisible({ timeout: 15_000 });
      await seeOrWarn(page.getByText(/TOTAL PROFILES|1/i).first(), 'profile KPI');
      await shot(page, '09-memory');
    });

    // 10 — Monitoring tab: live health of the swarm.
    await test.step('10-monitoring', async () => {
      await visit(page, '/admin/overview?tab=monitoring', 3000);
      // Give demo metrics / health probes a beat to populate Response Time.
      await page
        .getByRole('button', { name: /Refresh/i })
        .click()
        .catch(() => undefined);
      await page.waitForTimeout(1500);
      await seeOrWarn(page.getByText(/healthy|Response Time|Active Bots/i).first(), 'monitoring');
      await shot(page, '10-monitoring');
    });

    // 11 — Export: back up the whole configuration.
    await test.step('11-export', async () => {
      // Ensure at least one backup row exists for a non-empty table body.
      const backupRes = await request
        .post('/api/import-export/backup', {
          headers: apiHeaders,
          data: { description: 'Golden journey guide backup' },
        })
        .catch(() => null);
      if (backupRes) {
        console.log(`[journey-user-guide] backup create status=${backupRes.status()}`);
      }

      await visit(page, '/admin/export', 2500);
      await seeOrWarn(page.getByText(/Export|System Backups/i).first(), 'content');
      // Scroll so backup table rows (not only KPI cards) are in the viewport.
      await page.evaluate(() => {
        const row = document.querySelector('table tbody tr, [data-testid="backup-row"]');
        if (row) {
          (row as HTMLElement).scrollIntoView({
            block: 'center',
            behavior: 'instant' as ScrollBehavior,
          });
        } else {
          window.scrollTo(0, 380);
        }
      });
      await page.waitForTimeout(500);
      await seeOrWarn(page.getByText(/backup|KB|Restore|Download/i).first(), 'backup row');
      await shot(page, '11-export', { keepScroll: true });
    });
  });
});
