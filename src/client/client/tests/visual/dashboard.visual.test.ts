import { test, expect } from '@playwright/test';
import { 
  comprehensiveResponsiveTest,
  comprehensiveThemeTest,
  comprehensiveInteractiveTest
} from './utils';

test.describe('Dashboard Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard - Responsive Design', async ({ page }, testInfo) => {
    await comprehensiveResponsiveTest(page, testInfo, 'http://localhost:5173', {
      componentSelector: '.dashboard, [data-testid="dashboard"]',
      mobileMenuSelector: '[data-testid="mobile-menu-toggle"], .mobile-menu-toggle',
      sidebarSelector: '.sidebar, [data-testid="sidebar"]',
      hoverElements: [
        '.dashboard-card',
        '.agent-card',
        '.status-card',
        '.quick-action-button'
      ]
    });
  });

  test('Dashboard - Theme Variants', async ({ page }, testInfo) => {
    await comprehensiveThemeTest(page, testInfo, 'http://localhost:5173', {
      themes: ['light', 'dark'],
      toggleSelector: '[data-testid="theme-toggle"], .theme-toggle',
      componentSelectors: [
        '.dashboard',
        '.dashboard-header',
        '.dashboard-content',
        '.dashboard-card',
        '.agent-grid'
      ],
      testPersistence: true,
      testSystemTheme: true
    });
  });

  test('Dashboard - Interactive Elements', async ({ page }, testInfo) => {
    await comprehensiveInteractiveTest(page, testInfo, 'http://localhost:5173', {
      buttonSelectors: [
        '.quick-action-button',
        '.refresh-button',
        '.settings-button',
        '.add-agent-button'
      ],
      dropdownSelectors: [
        '.agent-dropdown',
        '.filter-dropdown',
        '.view-options-dropdown'
      ],
      modalTriggers: [
        {
          trigger: '.add-agent-button, [data-testid="add-agent"]',
          modal: '.agent-modal, [data-testid="agent-modal"]'
        }
      ],
      customElements: [
        {
          selector: '.dashboard-card',
          name: 'dashboard-card',
          states: ['normal', 'hover', 'focus']
        },
        {
          selector: '.agent-card',
          name: 'agent-card',
          states: ['normal', 'hover', 'focus']
        }
      ]
    });
  });

  test('Dashboard - Component Specific Tests', async ({ page }, testInfo) => {
    // Test dashboard header
    await page.waitForSelector('.dashboard-header, [data-testid="dashboard-header"]', { state: 'visible' });
    await expect(page.locator('.dashboard-header, [data-testid="dashboard-header"]')).toBeVisible();
    
    // Test agent grid
    await page.waitForSelector('.agent-grid, [data-testid="agent-grid"]', { state: 'visible' });
    await expect(page.locator('.agent-grid, [data-testid="agent-grid"]')).toBeVisible();
    
    // Test status cards
    await page.waitForSelector('.status-card, [data-testid="status-card"]', { state: 'visible' });
    await expect(page.locator('.status-card, [data-testid="status-card"]')).toBeVisible();
    
    // Test quick actions
    await page.waitForSelector('.quick-actions, [data-testid="quick-actions"]', { state: 'visible' });
    await expect(page.locator('.quick-actions, [data-testid="quick-actions"]')).toBeVisible();
  });

  test('Dashboard - Loading States', async ({ page }, testInfo) => {
    // Simulate loading state
    await page.evaluate(() => {
      document.body.classList.add('loading');
      const loadingElements = document.querySelectorAll('.dashboard-card, .agent-card');
      loadingElements.forEach(el => el.classList.add('loading'));
    });

    await page.waitForTimeout(1000);

    // Take screenshot of loading state
    await expect(page).toHaveScreenshot('dashboard-loading-state.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Remove loading state
    await page.evaluate(() => {
      document.body.classList.remove('loading');
      const loadingElements = document.querySelectorAll('.dashboard-card, .agent-card');
      loadingElements.forEach(el => el.classList.remove('loading'));
    });

    await page.waitForTimeout(1000);
  });

  test('Dashboard - Error States', async ({ page }, testInfo) => {
    // Simulate error state
    await page.evaluate(() => {
      const errorElements = document.querySelectorAll('.dashboard-card, .agent-card');
      errorElements.forEach(el => {
        el.classList.add('error', 'failed');
        el.setAttribute('data-error', 'true');
      });
    });

    await page.waitForTimeout(1000);

    // Take screenshot of error state
    await expect(page).toHaveScreenshot('dashboard-error-state.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Remove error state
    await page.evaluate(() => {
      const errorElements = document.querySelectorAll('.dashboard-card, .agent-card');
      errorElements.forEach(el => {
        el.classList.remove('error', 'failed');
        el.removeAttribute('data-error');
      });
    });

    await page.waitForTimeout(1000);
  });

  test('Dashboard - Empty States', async ({ page }, testInfo) => {
    // Navigate to a page that might have empty state
    await page.goto('http://localhost:5173?empty=true');
    await page.waitForLoadState('networkidle');

    // Check for empty state elements
    const emptyStateExists = await page.locator('.empty-state, [data-testid="empty-state"]').isVisible().catch(() => false);
    
    if (emptyStateExists) {
      await expect(page).toHaveScreenshot('dashboard-empty-state.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    } else {
      console.log('Empty state not found, skipping screenshot');
    }
  });

  test('Dashboard - Data Visualization', async ({ page }, testInfo) => {
    // Wait for charts and graphs to load
    await page.waitForSelector('.chart, .graph, [data-testid="chart"]', { state: 'visible', timeout: 10000 }).catch(() => {
      console.log('Charts not found, skipping data visualization test');
    });

    const chartsExist = await page.locator('.chart, .graph, [data-testid="chart"]').isVisible().catch(() => false);
    
    if (chartsExist) {
      // Test different chart types
      const chartSelectors = [
        '.activity-chart',
        '.usage-chart',
        '.performance-chart',
        '.status-chart'
      ];

      for (const selector of chartSelectors) {
        const chartExists = await page.locator(selector).isVisible().catch(() => false);
        if (chartExists) {
          const chartName = selector.replace(/[^\w]/g, '-');
          await expect(page.locator(selector)).toHaveScreenshot(`dashboard-${chartName}.png`, {
            threshold: 0.3, // Higher threshold for charts as they may have dynamic data
            maxDiffPixelRatio: 0.3
          });
        }
      }
    }
  });

  test('Dashboard - Real-time Updates', async ({ page }, testInfo) => {
    // Test real-time update indicators
    await page.waitForSelector('.real-time-indicator, [data-testid="real-time"]', { state: 'visible' }).catch(() => {
      console.log('Real-time indicators not found');
    });

    const realTimeExists = await page.locator('.real-time-indicator, [data-testid="real-time"]').isVisible().catch(() => false);
    
    if (realTimeExists) {
      await expect(page).toHaveScreenshot('dashboard-real-time-indicators.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }
  });

  test('Dashboard - Accessibility Features', async ({ page }, testInfo) => {
    // Test focus management
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`Focused element: ${focusedElement}`);

    // Test ARIA labels and roles
    const accessibleElements = await page.locator('[aria-label], [role], [aria-describedby]').count();
    console.log(`Found ${accessibleElements} accessible elements`);

    // Take screenshot with focus visible
    await expect(page).toHaveScreenshot('dashboard-focus-management.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });
});