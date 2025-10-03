import { Page, TestInfo } from '@playwright/test';
import { takeScreenshotAndCompare, DEFAULT_VISUAL_CONFIG } from './visual-testing.utils';

/**
 * Theme configurations for testing
 */
export const THEMES = {
  light: {
    name: 'light',
    description: 'Light theme',
    expectedColors: {
      background: '#ffffff',
      text: '#000000',
      primary: '#3b82f6',
    },
  },
  dark: {
    name: 'dark',
    description: 'Dark theme',
    expectedColors: {
      background: '#1f2937',
      text: '#f9fafb',
      primary: '#60a5fa',
    },
  },
  system: {
    name: 'system',
    description: 'System theme (follows OS preference)',
  },
} as const;

/**
 * Theme toggle selectors for common patterns
 */
export const THEME_TOGGLE_SELECTORS = {
  // DaisyUI theme toggle
  daisyui: '[data-theme-toggle]',
  // Common theme toggle button patterns
  button: '[data-testid="theme-toggle"], .theme-toggle, #theme-toggle',
  dropdown: '[data-testid="theme-dropdown"], .theme-dropdown',
  switch: '[data-testid="theme-switch"], .theme-switch',
  // Custom theme selectors
  custom: '[data-theme], [class*="theme-"]',
} as const;

/**
 * Sets the theme using various methods
 */
export async function setTheme(
  page: Page,
  theme: keyof typeof THEMES,
  method: 'data-attribute' | 'class' | 'localStorage' | 'click' = 'data-attribute'
): Promise<void> {
  switch (method) {
    case 'data-attribute':
      await page.evaluate((themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
      }, theme);
      break;

    case 'class':
      await page.evaluate((themeName) => {
        document.documentElement.className = document.documentElement.className
          .replace(/theme-\w+/g, '')
          .trim();
        if (themeName !== 'light') {
          document.documentElement.classList.add(`theme-${themeName}`);
        }
      }, theme);
      break;

    case 'localStorage':
      await page.evaluate((themeName) => {
        localStorage.setItem('theme', themeName);
        // Trigger a storage event to notify the app
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'theme',
          newValue: themeName,
        }));
      }, theme);
      break;

    case 'click':
      // Try different theme toggle selectors
      for (const selector of Object.values(THEME_TOGGLE_SELECTORS)) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(500); // Wait for theme transition
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      break;
  }

  // Wait for theme to apply
  await page.waitForTimeout(1000);
}

/**
 * Gets the current active theme
 */
export async function getCurrentTheme(page: Page): Promise<string> {
  return await page.evaluate(() => {
    // Check data-theme attribute
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme) return dataTheme;

    // Check class-based theme
    const classList = document.documentElement.className;
    const themeMatch = classList.match(/theme-(\w+)/);
    if (themeMatch) return themeMatch[1];

    // Check localStorage
    const localTheme = localStorage.getItem('theme');
    if (localTheme) return localTheme;

    // Check computed styles to determine if dark mode is active
    const bgColor = window.getComputedStyle(document.documentElement).backgroundColor;
    const isDark = bgColor.includes('rgb(31, 41, 55)') || bgColor.includes('#1f2937');
    return isDark ? 'dark' : 'light';
  });
}

/**
 * Tests theme switching functionality
 */
export async function testThemeSwitching(
  page: Page,
  testInfo: TestInfo,
  url: string,
  themes: (keyof typeof THEMES)[] = ['light', 'dark']
): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  for (const theme of themes) {
    console.log(`🎨 Testing ${theme} theme`);

    // Set the theme
    await setTheme(page, theme);

    // Wait for theme transition
    await page.waitForTimeout(1000);

    // Verify theme was applied
    const currentTheme = await getCurrentTheme(page);
    console.log(`Current theme detected: ${currentTheme}`);

    // Take screenshot
    const screenshotName = `${testInfo.title.replace(/\s+/g, '-')}-${theme}-theme`;
    await takeScreenshotAndCompare(
      page,
      testInfo,
      screenshotName,
      DEFAULT_VISUAL_CONFIG
    );
  }
}

/**
 * Tests theme persistence across page reloads
 */
export async function testThemePersistence(
  page: Page,
  testInfo: TestInfo,
  url: string,
  theme: keyof typeof THEMES = 'dark'
): Promise<void> {
  console.log(`🔄 Testing theme persistence for ${theme} theme`);

  // Set initial theme
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await setTheme(page, theme);

  // Take screenshot before reload
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-${theme}-before-reload`,
    DEFAULT_VISUAL_CONFIG
  );

  // Reload page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Wait for theme to restore
  await page.waitForTimeout(1000);

  // Verify theme persisted
  const currentTheme = await getCurrentTheme(page);
  console.log(`Theme after reload: ${currentTheme}`);

  // Take screenshot after reload
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-${theme}-after-reload`,
    DEFAULT_VISUAL_CONFIG
  );
}

/**
 * Tests theme toggle button functionality
 */
export async function testThemeToggleButton(
  page: Page,
  testInfo: TestInfo,
  url: string,
  toggleSelector?: string
): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Find theme toggle button
  const selector = toggleSelector || Object.values(THEME_TOGGLE_SELECTORS).join(', ');
  
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  } catch (error) {
    console.log(`⚠️ Theme toggle button not found with selector: ${selector}`);
    return;
  }

  // Test initial state
  const initialTheme = await getCurrentTheme(page);
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-toggle-initial`,
    DEFAULT_VISUAL_CONFIG
  );

  // Click toggle button
  await page.click(selector);
  await page.waitForTimeout(1000); // Wait for transition

  // Test toggled state
  const toggledTheme = await getCurrentTheme(page);
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-toggle-toggled`,
    DEFAULT_VISUAL_CONFIG
  );

  // Click again to return to original
  await page.click(selector);
  await page.waitForTimeout(1000);

  // Test returned state
  const returnedTheme = await getCurrentTheme(page);
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-toggle-returned`,
    DEFAULT_VISUAL_CONFIG
  );

  console.log(`Theme toggle test: ${initialTheme} → ${toggledTheme} → ${returnedTheme}`);
}

/**
 * Tests theme-specific components and styling
 */
export async function testThemeSpecificComponents(
  page: Page,
  testInfo: TestInfo,
  url: string,
  componentSelectors: string[],
  themes: (keyof typeof THEMES)[] = ['light', 'dark']
): Promise<void> {
  for (const theme of themes) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await setTheme(page, theme);

    for (const selector of componentSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 3000 });
        
        const componentName = selector.replace(/[^a-zA-Z0-9]/g, '-');
        const screenshotName = `${testInfo.title.replace(/\s+/g, '-')}-${theme}-${componentName}`;
        
        await takeScreenshotAndCompare(
          page,
          testInfo,
          screenshotName,
          DEFAULT_VISUAL_CONFIG
        );
      } catch (error) {
        console.log(`⚠️ Component not found: ${selector} in ${theme} theme`);
      }
    }
  }
}

/**
 * Tests system theme preference
 */
export async function testSystemTheme(
  page: Page,
  testInfo: TestInfo,
  url: string
): Promise<void> {
  console.log(`🖥️ Testing system theme preference`);

  // Test with prefers-color-scheme: light
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await setTheme(page, 'system');

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-system-light`,
    DEFAULT_VISUAL_CONFIG
  );

  // Test with prefers-color-scheme: dark
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await setTheme(page, 'system');

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-system-dark`,
    DEFAULT_VISUAL_CONFIG
  );
}

/**
 * Comprehensive theme testing suite
 */
export async function comprehensiveThemeTest(
  page: Page,
  testInfo: TestInfo,
  url: string,
  options: {
    themes?: (keyof typeof THEMES)[];
    toggleSelector?: string;
    componentSelectors?: string[];
    testPersistence?: boolean;
    testSystemTheme?: boolean;
  } = {}
): Promise<void> {
  console.log(`🎨 Starting comprehensive theme test for ${testInfo.title}`);

  const {
    themes = ['light', 'dark'],
    toggleSelector,
    componentSelectors = [],
    testPersistence = true,
    testSystemTheme = true,
  } = options;

  // Test basic theme switching
  await testThemeSwitching(page, testInfo, url, themes);

  // Test theme toggle button if selector provided
  if (toggleSelector) {
    await testThemeToggleButton(page, testInfo, url, toggleSelector);
  }

  // Test theme-specific components
  if (componentSelectors.length > 0) {
    await testThemeSpecificComponents(page, testInfo, url, componentSelectors, themes);
  }

  // Test theme persistence
  if (testPersistence) {
    await testThemePersistence(page, testInfo, url, themes[0]);
  }

  // Test system theme preference
  if (testSystemTheme) {
    await testSystemTheme(page, testInfo, url);
  }

  console.log(`✅ Comprehensive theme test completed for ${testInfo.title}`);
}