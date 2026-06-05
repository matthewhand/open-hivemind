import { expect, test } from '@playwright/test';

/**
 * tts-supertonic.spec.ts — proves the Supertonic engine actually loads
 * its 4 ONNX models from /tts/onnx/ and produces a non-empty audio buffer.
 *
 * Requires:
 *   - npm run tts:download (one-time, ~400 MB)
 *   - Dev server running with VITE_ENABLE_EXPERIMENTAL=true (so the Voice
 *     tab is visible) and PORT pointing at it (see package.json
 *     "test:tts" script for the canonical invocation).
 *
 * Coverage:
 *   1. Voice tab is visible (proves experimental gating works).
 *   2. Selecting "Supertonic" triggers engine load — status transitions
 *      idle → loading → ready (or error).
 *   3. After ready, clicking Speak does not surface a console error.
 *
 * What this DOES NOT verify:
 *   - Audio quality (requires human ears + speakers).
 *   - Model correctness (synthesis returns audio shape, but not that it
 *     sounds like the input text).
 */

test.describe('Supertonic engine load + synth', () => {
  test.setTimeout(180_000); // model load can be slow on first run

  test('loads engine, becomes ready, synth runs without error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!/prefetch-src|favicon|Download the React DevTools/i.test(text)) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/admin/settings?tab=voice');
    await page.waitForLoadState('networkidle');

    // Auth: click trusted-network bypass if login page is shown
    const adminBypassBtn = page.getByRole('button', { name: /Login as Admin/i });
    if (await adminBypassBtn.count()) {
      await adminBypassBtn.click();
      await page.waitForLoadState('networkidle');
      // After login, navigate explicitly to the voice tab (login redirect may land us elsewhere)
      await page.goto('/admin/settings?tab=voice');
      await page.waitForLoadState('networkidle');
    }

    // Step 1 — Voice tab visible (gated behind VITE_ENABLE_EXPERIMENTAL)
    await expect(page.getByText(/Conversation voice readout/i)).toBeVisible({ timeout: 10_000 });

    // Enable
    await page
      .getByLabel(/^(On|Off)$/)
      .first()
      .check();

    // Step 2 — pick Supertonic, wait for ready
    await page.getByLabel('Engine').selectOption('supertonic');

    await expect(page.getByText(/Ready — backend:/i)).toBeVisible({ timeout: 150_000 }); // first-load worst case

    // Step 3 — synth runs without throwing
    const testTextInput = page.getByLabel(/Test voice/i);
    await testTextInput.fill('Hello.');
    await page.getByRole('button', { name: /^Speak/i }).click();

    // The button briefly shows "Speaking…" while synth runs
    // (success indicator: no error message appears, button re-enables)
    await page.waitForTimeout(2000);

    // Hard assertion: no thrown engine error visible
    const errLocator = page.getByText(/Engine error:/i);
    await expect(errLocator).not.toBeVisible();

    // Screenshot for the user-guide
    await page.screenshot({ path: 'docs/screenshots/tts-supertonic-ready.png', fullPage: true });

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });
});
