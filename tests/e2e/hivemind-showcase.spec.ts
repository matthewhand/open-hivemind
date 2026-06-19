import { expect, Page, test } from '@playwright/test';
import { getApiAuthHeaders } from './helpers';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * Hivemind Showcase: captures docs/screenshots/hivemind-showcase.png — the
 * "money shot" of multiple AI personas conversing in one channel with
 * selective engagement (SupportBot answers, DevOpsBot chimes in with an ops
 * tip, every other bot stays silent).
 *
 * The conversation itself is staged by DemoActivitySimulator (demo mode
 * only) from SHOWCASE_CONVERSATION in src/services/demo/DemoConstants.ts and
 * rendered by the Activity page's Conversations view.
 *
 * Run via:
 *
 *   npm run test:journey:showcase
 *
 * which mirrors the test:journey:guide environment (PORT=3033,
 * DEMO_MODE=true, fresh DATABASE_PATH) and clears the persisted activity log
 * (config/user/activity.jsonl) first so stale events from earlier runs don't
 * pollute the transcript.
 */

const SCREENSHOT_PATH = 'docs/screenshots/hivemind-showcase.png';

/** Remove transient toast notifications so the screenshot stays clean. */
const clearToasts = (page: Page) =>
  page.evaluate(() => {
    document.querySelectorAll('.toast').forEach((el) => el.remove());
  });

test.describe('Hivemind Showcase: multi-persona conversation capture', () => {
  test.setTimeout(180_000);

  test('stage, verify and capture the multi-bot conversation', async ({ page, request }) => {
    await setupTestWithErrorDetection(page);
    const apiHeaders = await getApiAuthHeaders(request);

    // Cleanup: remove leftover bots from previous e2e runs (persisted in the
    // gitignored config/user/webui-config.json) so only demo-mode data shows.
    await test.step('cleanup-stale-bots', async () => {
      const STALE_BOT_RE =
        /^(e2e[\s-]|test bot|bot1$|messaging test|chat probe|smart-bot|golden-journey)/i;
      const listRes = await request.get('/api/bots', { headers: apiHeaders });
      expect(listRes.ok(), `bot list returned ${listRes.status()}`).toBeTruthy();
      const body = await listRes.json();
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

    // Login (test bypass) and open the Activity tab.
    await test.step('open-activity', async () => {
      await page.goto('/admin/overview?tab=activity');
      await page.waitForLoadState('networkidle');

      const adminBypassBtn = page.getByRole('button', { name: /Login as Admin/i });
      if (await adminBypassBtn.count()) {
        await adminBypassBtn.click();
        await page.waitForURL(/admin|dashboard|overview/, { timeout: 10_000 });
        await page.waitForLoadState('networkidle');
      }
      await page.waitForTimeout(2000);
    });

    // Switch to the Conversations view and find the showcase thread. The
    // thread card is the innermost .card containing the staged transcript
    // (outer wrapper cards match the text filter too, hence .last()).
    const showcaseCard = page.locator('.card').filter({ hasText: 'webhook fires twice' }).last();

    await test.step('verify-conversation', async () => {
      await page.getByRole('button', { name: /Conversations/i }).click();
      await page.waitForTimeout(500);

      await expect(showcaseCard).toBeVisible({ timeout: 15_000 });

      // One channel hosting the whole exchange...
      await expect(showcaseCard.getByText('#community-support').first()).toBeVisible();
      // ...where multiple personas responded...
      await expect(showcaseCard.getByText('SupportBot').first()).toBeVisible();
      await expect(showcaseCard.getByText('DevOpsBot').first()).toBeVisible();
      // ...to a real user...
      await expect(showcaseCard.getByText('Grace Lee').first()).toBeVisible();
      await expect(
        showcaseCard.getByText(/webhook fires twice every time a delivery fails/i)
      ).toBeVisible();
      // ...while the rest of the swarm stayed silent (selective engagement).
      await expect(showcaseCard.getByText('AnalyticsBot')).toHaveCount(0);

      // Full transcript: question → two persona replies → follow-up → answer.
      await expect(showcaseCard.getByText(/Adding to what SupportBot said/i)).toBeVisible();
      await expect(showcaseCard.getByText(/Moving the ack up fixed the duplicates/i)).toBeVisible();
      await expect(
        showcaseCard.getByText(/every delivery attempt lands in the Activity feed/i)
      ).toBeVisible();

      // Timestamps render in chronological order within the transcript.
      const times = await showcaseCard.locator('.text-xs.text-base-content\\/40').allInnerTexts();
      const clockTimes = times.map((t) => t.trim()).filter((t) => /^\d{1,2}:\d{2}:\d{2}/.test(t));
      expect(clockTimes.length).toBeGreaterThanOrEqual(5);
    });

    // Frame the capture tightly around the showcase card: full app chrome on
    // the left (sidebar), the staged conversation front and centre, and the
    // surrounding random demo threads (placeholder channel ids from
    // .env.sample bots) kept out of frame.
    await test.step('capture', async () => {
      const box = await showcaseCard.boundingBox();
      expect(box, 'showcase card should have a bounding box').toBeTruthy();

      // Cards are 16px apart (space-y-4); a 12px margin keeps a clean gap in
      // frame without slivers of the neighbouring thread cards.
      const margin = 12;
      const viewportHeight = Math.min(1600, Math.ceil(box!.height + margin * 2));
      await page.setViewportSize({ width: 1280, height: viewportHeight });
      await page.waitForTimeout(300);

      await showcaseCard.evaluate((el, m) => {
        el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
        window.scrollBy(0, -m);
      }, margin);
      await page.waitForTimeout(300);

      await clearToasts(page);
      await page.screenshot({ path: SCREENSHOT_PATH });
      console.log(`[hivemind-showcase] captured ${SCREENSHOT_PATH}`);
    });
  });
});
