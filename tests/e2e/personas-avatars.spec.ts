import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

const mockPersonas = [
  {
    id: 'default',
    name: 'Default Assistant',
    description: 'The built-in default persona for general tasks',
    systemPrompt: 'You are a helpful assistant.',
    isBuiltIn: true,
    category: 'general',
    avatarStyle: 'bottts',
  },
  {
    id: 'dev-helper',
    name: 'Dev Helper',
    description: 'Specialised in software engineering questions',
    systemPrompt: 'You are a senior software engineer.',
    isBuiltIn: false,
    category: 'development',
    avatarStyle: 'avataaars',
  },
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'Assists with creative writing and storytelling',
    systemPrompt: 'You are a creative writing assistant.',
    isBuiltIn: false,
    category: 'creative',
    avatarStyle: 'funEmoji',
  },
];

const mockBots = [
  { id: 'bot-1', name: 'Discord Bot', persona: 'dev-helper' },
  { id: 'bot-2', name: 'Slack Bot', persona: 'default' },
];

test.describe('Persona Management & Avatars', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Auth check
    await page.route('**/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Personas list
    await page.route('**/api/personas', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: mockPersonas });
      } else {
        await route.fulfill({ status: 200, json: { success: true } });
      }
    });

    // Config (contains bots list)
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: mockBots } });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.route('**/api/health/detailed', async (route) => {
      await route.fulfill({ status: 200, json: { status: 'ok' } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
      });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { active: false } });
    });

    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { data: [] } });
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/config/mcp/profiles', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
  });

  test('renders persona cards with avatar images', async ({ page }) => {
    await page.goto('/admin/personas');

    // Wait for the page header to confirm we landed on the right page
    await expect(page.getByText('Persona Management')).toBeVisible();

    // Verify all three persona cards render
    await expect(page.getByText('Default Assistant')).toBeVisible();
    await expect(page.getByText('Dev Helper')).toBeVisible();
    await expect(page.getByText('Creative Writer')).toBeVisible();

    // Verify persona descriptions render
    await expect(page.getByText('The built-in default persona for general tasks')).toBeVisible();
    await expect(page.getByText('Specialised in software engineering questions')).toBeVisible();

    // Verify avatar images are rendered (PersonaAvatar uses <img> with alt="Avatar for ...")
    const avatarImages = page.locator('img[alt^="Avatar for"]');
    await expect(avatarImages.first()).toBeVisible();
    const avatarCount = await avatarImages.count();
    expect(avatarCount).toBeGreaterThanOrEqual(3);

    // Screenshot the personas page
    await page.screenshot({ path: 'docs/screenshots/personas-page.png', fullPage: true });
  });

  test('category filter is NOT shown on the page', async ({ page }) => {
    await page.goto('/admin/personas');
    await expect(page.getByText('Persona Management')).toBeVisible();

    // The category dropdown / filter should NOT be visible
    // (it was hidden — roadmap: user-defined categories)
    await expect(page.locator('select').filter({ hasText: 'All Categories' })).not.toBeVisible();
    await expect(page.getByRole('combobox', { name: /category/i })).not.toBeVisible();
  });

  test('opens create persona modal with avatar picker', async ({ page }) => {
    await page.goto('/admin/personas');
    await expect(page.getByText('Persona Management')).toBeVisible();

    // Click the "Create Persona" button
    const createBtn = page.getByRole('button', { name: /Create Persona/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Modal should be open with the correct title
    await expect(page.getByText('Create New Persona')).toBeVisible();

    // Avatar should be visible in the modal (the clickable avatar button)
    const avatarButton = page.locator('button').filter({ has: page.locator('img[alt^="Avatar for"]') });
    await expect(avatarButton.first()).toBeVisible();

    // "click to change" hint text should be present
    await expect(page.getByText('click to change')).toBeVisible();

    // Click the avatar to open the avatar style picker
    await avatarButton.first().click();

    // The avatar picker panel should now be visible
    await expect(page.getByText('Choose an avatar style')).toBeVisible();

    // Category dropdown should NOT be shown in the modal
    // (hidden — roadmap: user-defined categories)
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });
    await expect(categorySelect).not.toBeVisible();

    // Screenshot the create modal with avatar picker open
    await page.screenshot({ path: 'docs/screenshots/personas-create-modal.png', fullPage: true });
  });

  test('persona cards show assigned bot badges', async ({ page }) => {
    await page.goto('/admin/personas');
    await expect(page.getByText('Persona Management')).toBeVisible();

    // The "Built-in" badge should appear on the default persona
    await expect(page.getByText('Built-in').first()).toBeVisible();

    // Edit buttons should be present on each card
    const editButtons = page.getByRole('button', { name: 'Edit' });
    const editCount = await editButtons.count();
    expect(editCount).toBeGreaterThanOrEqual(3);
  });

  test('search bar filters personas', async ({ page }) => {
    await page.goto('/admin/personas');
    await expect(page.getByText('Persona Management')).toBeVisible();

    // The search input should be present
    const searchInput = page.getByPlaceholder(/Search personas/i);
    await expect(searchInput).toBeVisible();

    // Type a search query that matches only one persona
    await searchInput.fill('Creative');

    // Wait for filtering
    await page.waitForTimeout(400);

    // "Creative Writer" should still be visible
    await expect(page.getByText('Creative Writer')).toBeVisible();

    // Other personas should be filtered out
    await expect(page.getByText('Dev Helper')).not.toBeVisible();
  });
});
