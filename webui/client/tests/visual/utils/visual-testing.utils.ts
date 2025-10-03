import { Page, expect, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for visual regression testing
 */
export interface VisualTestConfig {
  threshold?: number; // Threshold for image comparison (0-1)
  screenshotOptions?: {
    fullPage?: boolean;
    omitBackground?: boolean;
    animations?: 'disabled' | 'allow';
  };
 viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Default configuration for visual regression testing
 */
export const DEFAULT_VISUAL_CONFIG: VisualTestConfig = {
 threshold: 0.2, // 20% threshold for image comparison
  screenshotOptions: {
    fullPage: false,
    omitBackground: false,
    animations: 'disabled',
  },
};

/**
 * Takes a screenshot and compares it against a baseline
 */
export async function takeScreenshotAndCompare(
  page: Page,
  testInfo: TestInfo,
  screenshotName: string,
  config: VisualTestConfig = DEFAULT_VISUAL_CONFIG
): Promise<void> {
  // Set viewport if specified
  if (config.viewport) {
    await page.setViewportSize({
      width: config.viewport.width,
      height: config.viewport.height,
    });
 }

  // Disable animations for consistent screenshots
  if (config.screenshotOptions?.animations === 'disabled') {
    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          transition: none !important;
          animation: none !important;
          -webkit-transition: none !important;
          -webkit-animation: none !important;
        }
      `,
    });
  }

 // Wait for network idle to ensure all resources are loaded
 await page.waitForLoadState('networkidle');

  // Take screenshot with custom options
  const screenshotOptions = {
    fullPage: config.screenshotOptions?.fullPage,
    omitBackground: config.screenshotOptions?.omitBackground,
  };

  // Create screenshot path
  const screenshotPath = path.join(
    testInfo.project.outputDir,
    'screenshots',
    testInfo.titlePath.join('/'),
    `${screenshotName}.png`
  );

  // Ensure directory exists
  const screenshotDir = path.dirname(screenshotPath);
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Take the screenshot
  await page.screenshot({
    path: screenshotPath,
    ...screenshotOptions,
  });

  // Compare with baseline
  const baselinePath = path.join(
    testInfo.project.testDir,
    'screenshots',
    'baseline',
    `${screenshotName}.png`
  );

  // If baseline doesn't exist, create it (first run)
  if (!fs.existsSync(baselinePath)) {
    // Copy current screenshot to baseline
    fs.copyFileSync(screenshotPath, baselinePath);
    console.log(`📸 Baseline created for ${screenshotName}`);
  }

  // Perform visual comparison
  await expect(page).toHaveScreenshot(`${screenshotName}.png`, {
    threshold: config.threshold,
    maxDiffPixelRatio: config.threshold,
  });
}

/**
 * Waits for a component to be visible and stable before taking a screenshot
 */
export async function waitForComponentAndScreenshot(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string,
  config: VisualTestConfig = DEFAULT_VISUAL_CONFIG
): Promise<void> {
  // Wait for the element to be visible and stable
  await page.waitForSelector(selector, { state: 'visible' });
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      
      // Check if element is rendered and not changing
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    selector,
    { timeout: 1000 }
  );

  // Take screenshot of the specific component
  await takeScreenshotAndCompare(page, testInfo, screenshotName, config);
}

/**
 * Tests responsive layouts across different viewport sizes
 */
export async function testResponsiveLayouts(
  page: Page,
  testInfo: TestInfo,
  url: string,
  componentSelector?: string
): Promise<void> {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },      // Mobile
    { width: 768, height: 1024, name: 'tablet' },     // Tablet
    { width: 1280, height: 720, name: 'desktop' },    // Desktop
    { width: 1920, height: 1080, name: 'large' },     // Large desktop
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const screenshotName = `${testInfo.title.replace(/\s+/g, '-')}-${viewport.name}`;
    
    if (componentSelector) {
      await waitForComponentAndScreenshot(
        page,
        testInfo,
        componentSelector,
        screenshotName,
        {
          ...DEFAULT_VISUAL_CONFIG,
          viewport: { width: viewport.width, height: viewport.height },
        }
      );
    } else {
      await takeScreenshotAndCompare(
        page,
        testInfo,
        screenshotName,
        {
          ...DEFAULT_VISUAL_CONFIG,
          viewport: { width: viewport.width, height: viewport.height },
        }
      );
    }
  }
}

/**
 * Tests theme switching (light/dark mode) visual differences
 */
export async function testThemeVariants(
  page: Page,
  testInfo: TestInfo,
  url: string,
  themeToggleSelector?: string
): Promise<void> {
  // Test light theme
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-light-theme`,
    DEFAULT_VISUAL_CONFIG
 );

  // Toggle to dark theme if selector provided
  if (themeToggleSelector) {
    await page.click(themeToggleSelector);
    // Wait for theme transition
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
    
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${testInfo.title.replace(/\s+/g, '-')}-dark-theme`,
      DEFAULT_VISUAL_CONFIG
    );
  }
}

/**
 * Tests interactive states (hover, focus, active)
 */
export async function testInteractiveStates(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  // Normal state
  await page.goto(`http://localhost:5173`); // or appropriate URL
  await page.waitForLoadState('networkidle');
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${screenshotName}-normal`,
    DEFAULT_VISUAL_CONFIG
  );

  // Hover state
  await page.hover(selector);
  await page.waitForTimeout(200); // Allow for any hover animations
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${screenshotName}-hover`,
    DEFAULT_VISUAL_CONFIG
  );

  // Focus state
  await page.focus(selector);
  await page.waitForTimeout(200); // Allow for any focus animations
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${screenshotName}-focus`,
    DEFAULT_VISUAL_CONFIG
  );

  // Click/Active state (if applicable)
  await page.click(selector);
  await page.waitForTimeout(200); // Allow for any click animations
  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${screenshotName}-active`,
    DEFAULT_VISUAL_CONFIG
  );
}