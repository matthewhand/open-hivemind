import type { Page } from '@playwright/test';

/**
 * Smart provider mocks for the golden journey.
 *
 * If a provider's API key matches a sentinel pattern, we install a
 * page.route() handler so the journey can complete without real network
 * calls. If a real-looking key is present, we install nothing — the same
 * spec then runs as an integration test against the real provider.
 *
 * Sentinel pattern: ^(test|dummy|mock|fake|sk-test)- (case-insensitive)
 *
 * Today this mocks at the browser→server boundary (page.route on
 * /api/bots/.../chat). A cleaner future implementation is to give each
 * provider adapter sentinel-key detection on the SERVER side, so the
 * journey exercises the full server pipeline in mock mode too. Tracked
 * in ROADMAP.md.
 */

const SENTINEL_RE = /^(test|dummy|mock|fake|sk-test)-/i;

export type ProviderMode = 'mock' | 'real';

export interface ProviderModes {
  openai: ProviderMode;
  discord: ProviderMode;
}

const isSentinel = (k?: string): boolean => !k || SENTINEL_RE.test(k);

export function getProviderModes(): ProviderModes {
  return {
    openai: isSentinel(process.env.OPENAI_API_KEY) ? 'mock' : 'real',
    discord: isSentinel(process.env.DISCORD_BOT_TOKEN) ? 'mock' : 'real',
  };
}

export async function setupProviderMocks(page: Page): Promise<ProviderModes> {
  const modes = getProviderModes();

  if (modes.openai === 'mock') {
    // BotTestDriveTab streams from /api/admin/llm-providers/providers/:key/test-stream
    // using Server-Sent Events. Mock with the chunk/done event shape the
    // consumer expects (see BotTestDriveTab.tsx ~line 144-200).
    await page.route('**/api/admin/llm-providers/providers/**/test-stream', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const body =
        'data: {"type":"chunk","content":"Hello from the mocked LLM provider!"}\n\n' +
        'data: {"type":"done","model":"gpt-4o-mock","usage":{"prompt_tokens":5,"completion_tokens":7,"total_tokens":12}}\n\n';
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache' },
        body,
      });
    });
  }

  // Discord is not directly called from the browser in the journey.
  // SKIP_MESSENGERS=true in CI prevents the messenger adapter from
  // connecting, so the in-app chat path is sufficient for the journey.
  // When `modes.discord === 'real'`, the real Discord adapter connects
  // and the journey can be extended to exercise an outbound DM.

  return modes;
}
