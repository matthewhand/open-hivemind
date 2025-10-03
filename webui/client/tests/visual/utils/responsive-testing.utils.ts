import { Page, TestInfo } from '@playwright/test';
import { takeScreenshotAndCompare, DEFAULT_VISUAL_CONFIG } from './visual-testing.utils';

/**
 * Viewport configurations for different device sizes
 */
export const VIEWPORTS = {
  mobile: {
    width: 375,
    height: 667,
    name: 'mobile',
    description: 'iPhone SE',
  },
  mobileLarge: {
    width: 414,
    height: 896,
    name: 'mobile-large',
    description: 'iPhone 11',
  },
  tablet: {
    width: 768,
    height: 1024,
    name: 'tablet',
    description: 'iPad',
  },
  tabletLandscape: {
    width: 1024,
    height: 768,
    name: 'tablet-landscape',
    description: 'iPad Landscape',
  },
  desktop: {
    width: 1280,
    height: 720,
    name: 'desktop',
    description: 'Desktop',
  },
  desktopLarge: {
    width: 1920,
    height: 1080,
    name: 'desktop-large',
    description: 'Large Desktop',
  },
  ultrawide: {
    width: 2560,
    height: 1440,
    name: 'ultrawide',
    description: 'Ultrawide Monitor',
  },
} as const;

/**
 * Breakpoint configurations for responsive testing
 */
export const BREAKPOINTS = {
  xs: 0,      // Extra small devices (phones)
  sm: 640,    // Small devices (tablets in portrait)
  md: 768,    // Medium devices (tablets)
  lg: 1024,   // Large devices (desktops)
  xl: 1280,   // Extra large devices (large desktops)
  '2xl': 1536, // 2X large devices (very large desktops)
} as const;

/**
 * Tests a component across all predefined viewports
 */
export async function testComponentAcrossViewports(
  page: Page,
  testInfo: TestInfo,
  url: string,
  componentSelector?: string,
  customViewports: Partial<typeof VIEWPORTS> = VIEWPORTS
): Promise<void> {
  const viewports = Object.values(customViewports);

  for (const viewport of viewports) {
    if (!viewport) continue;

    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Wait for any layout shifts
    await page.waitForTimeout(1000);

    const screenshotName = `${testInfo.title.replace(/\s+/g, '-')}-${viewport.name}`;

    if (componentSelector) {
      // Wait for component to be visible
      await page.waitForSelector(componentSelector, { state: 'visible' });
      
      // Take screenshot of specific component
      await takeScreenshotAndCompare(
        page,
        testInfo,
        screenshotName,
        {
          ...DEFAULT_VISUAL_CONFIG,
          viewport: { width: viewport.width, height: viewport.height },
        }
      );
    } else {
      // Take full page screenshot
      await takeScreenshotAndCompare(
        page,
        testInfo,
        screenshotName,
        {
          ...DEFAULT_VISUAL_CONFIG,
          screenshotOptions: {
            ...DEFAULT_VISUAL_CONFIG.screenshotOptions,
            fullPage: true,
          },
          viewport: { width: viewport.width, height: viewport.height },
        }
      );
    }

    console.log(`📱 Tested ${viewport.description} (${viewport.width}x${viewport.height})`);
  }
}

/**
 * Tests responsive behavior at specific breakpoints
 */
export async function testBreakpoints(
  page: Page,
  testInfo: TestInfo,
  url: string,
  componentSelector?: string
): Promise<void> {
  const breakpoints = Object.entries(BREAKPOINTS);

  for (const [name, width] of breakpoints) {
    const height = Math.min(1080, width * 0.75); // Maintain aspect ratio

    await page.setViewportSize({ width, height });
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Wait for responsive layout to settle
    await page.waitForTimeout(500);

    const screenshotName = `${testInfo.title.replace(/\s+/g, '-')}-breakpoint-${name}`;

    if (componentSelector) {
      await page.waitForSelector(componentSelector, { state: 'visible' });
    }

    await takeScreenshotAndCompare(
      page,
      testInfo,
      screenshotName,
      {
        ...DEFAULT_VISUAL_CONFIG,
        viewport: { width, height },
      }
    );

    console.log(`📏 Tested breakpoint ${name} (${width}px)`);
  }
}

/**
 * Tests mobile-specific interactions and layouts
 */
export async function testMobileSpecificFeatures(
  page: Page,
  testInfo: TestInfo,
  url: string,
  mobileMenuSelector?: string,
  mobileNavigationSelector?: string
): Promise<void> {
  // Test on mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Test mobile menu if present
  if (mobileMenuSelector) {
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${testInfo.title.replace(/\s+/g, '-')}-mobile-menu-closed`,
      DEFAULT_VISUAL_CONFIG
    );

    // Open mobile menu
    await page.click(mobileMenuSelector);
    await page.waitForTimeout(300); // Allow for menu animation

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${testInfo.title.replace(/\s+/g, '-')}-mobile-menu-open`,
      DEFAULT_VISUAL_CONFIG
    );
  }

  // Test mobile navigation if present
  if (mobileNavigationSelector) {
    await page.waitForSelector(mobileNavigationSelector, { state: 'visible' });
    
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${testInfo.title.replace(/\s+/g, '-')}-mobile-navigation`,
      DEFAULT_VISUAL_CONFIG
    );
  }

  // Test touch interactions (simulate mobile touch)
  await page.touchscreen.tap(100, 100);
  await page.waitForTimeout(200);

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-mobile-touch`,
    DEFAULT_VISUAL_CONFIG
  );
}

/**
 * Tests tablet-specific layouts and interactions
 */
export async function testTabletSpecificFeatures(
  page: Page,
  testInfo: TestInfo,
  url: string,
  sidebarSelector?: string
): Promise<void> {
  // Test tablet portrait
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-tablet-portrait`,
    DEFAULT_VISUAL_CONFIG
  );

  // Test tablet landscape
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-tablet-landscape`,
    DEFAULT_VISUAL_CONFIG
  );

  // Test sidebar behavior if present
  if (sidebarSelector) {
    await page.waitForSelector(sidebarSelector, { state: 'visible' });
    
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${testInfo.title.replace(/\s+/g, '-')}-tablet-sidebar`,
      DEFAULT_VISUAL_CONFIG
    );
  }
}

/**
 * Tests desktop-specific features and layouts
 */
export async function testDesktopSpecificFeatures(
  page: Page,
  testInfo: TestInfo,
  url: string,
  hoverElements?: string[]
): Promise<void> {
  // Test standard desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-desktop-standard`,
    DEFAULT_VISUAL_CONFIG
  );

  // Test hover states for desktop
  if (hoverElements) {
    for (const selector of hoverElements) {
      try {
        await page.hover(selector);
        await page.waitForTimeout(200);

        const elementName = selector.replace(/[^a-zA-Z0-9]/g, '-');
        await takeScreenshotAndCompare(
          page,
          testInfo,
          `${testInfo.title.replace(/\s+/g, '-')}-desktop-hover-${elementName}`,
          DEFAULT_VISUAL_CONFIG
        );
      } catch (error) {
        console.log(`⚠️ Could not test hover for selector: ${selector}`);
      }
    }
  }

  // Test large desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await takeScreenshotAndCompare(
    page,
    testInfo,
    `${testInfo.title.replace(/\s+/g, '-')}-desktop-large`,
    DEFAULT_VISUAL_CONFIG
  );
}

/**
 * Comprehensive responsive test that covers all device types
 */
export async function comprehensiveResponsiveTest(
  page: Page,
  testInfo: TestInfo,
  url: string,
  options: {
    componentSelector?: string;
    mobileMenuSelector?: string;
    sidebarSelector?: string;
    hoverElements?: string[];
    customViewports?: Partial<typeof VIEWPORTS>;
  } = {}
): Promise<void> {
  console.log(`🔄 Starting comprehensive responsive test for ${testInfo.title}`);

  // Test all viewports
  await testComponentAcrossViewports(
    page,
    testInfo,
    url,
    options.componentSelector,
    options.customViewports
  );

  // Test mobile-specific features
  await testMobileSpecificFeatures(
    page,
    testInfo,
    url,
    options.mobileMenuSelector
  );

  // Test tablet-specific features
  await testTabletSpecificFeatures(
    page,
    testInfo,
    url,
    options.sidebarSelector
  );

  // Test desktop-specific features
  await testDesktopSpecificFeatures(
    page,
    testInfo,
    url,
    options.hoverElements
  );

  console.log(`✅ Comprehensive responsive test completed for ${testInfo.title}`);
}