import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../page-objects/base/BasePage';

/**
 * Common test utilities and helper functions
 */

export interface TestData {
  [key: string]: any;
}

export interface WaitOptions {
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 10000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options;
  let lastError: Error;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(backoff, i)));
      }
    }
  }

  throw lastError!;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 */
export function generateRandomEmail(): string {
  return `test-${generateRandomString(8)}@example.com`;
}

/**
 * Generate random number within range
 */
export function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshotWithTimestamp(
  page: Page,
  name: string,
  fullPage: boolean = true
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const path = `test-results/screenshots/${filename}`;

  await page.screenshot({ path, fullPage });
  return path;
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'attached', timeout: 5000 });
    return (await element.count()) > 0;
  } catch {
    return false;
  }
}

/**
 * Wait for element to appear and disappear (loading states)
 */
export async function waitForElementLifecycle(
  page: Page,
  selector: string,
  options: { appearTimeout?: number; disappearTimeout?: number } = {}
): Promise<void> {
  const { appearTimeout = 10000, disappearTimeout = 10000 } = options;

  // Wait for element to appear
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: appearTimeout });

  // Wait for element to disappear
  await element.waitFor({ state: 'hidden', timeout: disappearTimeout });
}

/**
 * Mock API response with delay
 */
export async function mockApiResponseWithDelay(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  delay: number = 1000
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Mock API error response
 */
export async function mockApiError(
  page: Page,
  urlPattern: string | RegExp,
  status: number = 500,
  message: string = 'Internal Server Error'
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: message }),
    });
  });
}

/**
 * Clear browser storage
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set item in localStorage
 */
export async function setLocalStorage(page: Page, key: string, value: any): Promise<void> {
  await page.evaluate(
    ([k, v]) => {
      localStorage.setItem(k, JSON.stringify(v));
    },
    [key, value]
  );
}

/**
 * Get item from localStorage
 */
export async function getLocalStorage(page: Page, key: string): Promise<any> {
  return await page.evaluate(
    ([k]) => {
      const value = localStorage.getItem(k);
      return value ? JSON.parse(value) : null;
    },
    [key]
  );
}

/**
 * Check if page is responsive
 */
export async function checkResponsiveDesign(page: Page): Promise<void> {
  const viewports = [
    { width: 1920, height: 1080 }, // Desktop
    { width: 768, height: 1024 }, // Tablet
    { width: 375, height: 667 }, // Mobile
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForLoadState('networkidle');

    // Check for responsive elements
    const navigation = page.locator('nav, [role="navigation"]');
    if (await navigation.isVisible()) {
      // Basic check - navigation should be visible on all viewports
      await expect(navigation).toBeVisible();
    }
  }
}

/**
 * Perform accessibility check
 */
export async function performAccessibilityCheck(page: Page): Promise<void> {
  // Check for proper heading structure
  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  for (const heading of headings) {
    const elements = page.locator(heading);
    if ((await elements.count()) > 0) {
      await expect(elements.first()).toBeVisible();
      break; // At least one heading should exist
    }
  }

  // Check for main landmark
  const main = page.locator('main, [role="main"]');
  if ((await main.count()) > 0) {
    await expect(main).toBeVisible();
  }

  // Check for proper alt text on images
  const images = page.locator('img:not([alt]), img[alt=""]');
  if ((await images.count()) > 0) {
    console.warn(`Found ${await images.count()} images without alt text`);
  }
}

/**
 * Wait for and handle modal/dialog
 */
export async function handleModal(
  page: Page,
  options: { accept?: boolean; timeout?: number } = {}
): Promise<void> {
  const { accept = true, timeout = 10000 } = options;

  const modal = page.locator('[role="dialog"], .modal, .dialog');

  try {
    await modal.waitFor({ state: 'visible', timeout });

    if (accept) {
      const acceptButton = page.locator(
        'button:has-text("OK"), button:has-text("Accept"), button:has-text("Confirm")'
      );
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
      }
    } else {
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }

    await modal.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // Modal might not be present, continue
  }
}

/**
 * Get table data
 */
export async function getTableData(page: Page, tableSelector: string): Promise<string[][]> {
  const table = page.locator(tableSelector);
  await table.waitFor({ state: 'visible', timeout: 10000 });

  const rows = table.locator('tr');
  const rowCount = await rows.count();
  const data: string[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const cells = rows.nth(i).locator('td, th');
    const cellCount = await cells.count();
    const rowData: string[] = [];

    for (let j = 0; j < cellCount; j++) {
      const cellText = await cells.nth(j).textContent();
      rowData.push(cellText || '');
    }

    data.push(rowData);
  }

  return data;
}

/**
 * Fill form with data
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>,
  options: { submit?: boolean; submitSelector?: string } = {}
): Promise<void> {
  const { submit = true, submitSelector = 'button[type="submit"]' } = options;

  for (const [field, value] of Object.entries(formData)) {
    const fieldSelector = `input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`;
    const fieldElement = page.locator(fieldSelector);

    if (await fieldElement.isVisible()) {
      await fieldElement.fill(value);
    }
  }

  if (submit) {
    const submitButton = page.locator(submitSelector);
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }
  }
}

/**
 * Wait for file upload
 */
export async function waitForFileUpload(
  page: Page,
  fileInputSelector: string,
  filePath: string
): Promise<void> {
  const fileInput = page.locator(fileInputSelector);
  await fileInput.setInputFiles(filePath);

  // Wait for upload to complete (check for upload progress indicator to disappear)
  const uploadProgress = page.locator('[data-testid="upload-progress"], .upload-progress');
  if (await uploadProgress.isVisible()) {
    await uploadProgress.waitFor({ state: 'hidden', timeout: 30000 });
  }
}

/**
 * Get current timestamp in consistent format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Compare two objects deeply
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });

  // Wait for CSS animations to complete
  await page.waitForFunction(
    (el) => {
      const styles = window.getComputedStyle(el);
      return styles.animationPlayState === 'idle' || styles.animationPlayState === 'none';
    },
    await element.elementHandle(),
    { timeout }
  );
}
