import { Page, expect } from '@playwright/test';

/**
 * Shared test utilities for Playwright E2E tests
 * Provides error detection, auth setup, and common helpers
 */

// Store for collecting console errors during tests
const collectedErrors: string[] = [];

/**
 * Setup authentication for a page using fake tokens
 */
export async function setupAuth(page: Page) {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
    const fakeUser = JSON.stringify({
        id: 'admin',
        username: 'admin',
        email: 'admin@open-hivemind.com',
        role: 'owner',
        permissions: ['*']
    });

    await page.addInitScript(({ token, user }) => {
        localStorage.setItem('auth_tokens', JSON.stringify({
            accessToken: token,
            refreshToken: token,
            expiresIn: 3600
        }));
        localStorage.setItem('auth_user', user);
    }, { token: fakeToken, user: fakeUser });
}

/**
 * Error patterns to ignore (common benign errors)
 */
const IGNORED_ERROR_PATTERNS = [
    /favicon\.ico/i,
    /Failed to load resource.*404/i,
    /ResizeObserver loop/i,
    /Loading chunk.*failed/i,
    /Network Error/i,
    /net::ERR_/i,
    /Download the React DevTools/i,
];

/**
 * Check if an error should be ignored
 */
function shouldIgnoreError(error: string): boolean {
    return IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(error));
}

/**
 * Setup console error collection on a page
 * Collects errors and optionally fails the test
 */
export function setupErrorCollection(page: Page): string[] {
    const errors: string[] = [];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (!shouldIgnoreError(text)) {
                errors.push(`[Console Error] ${text}`);
                console.error(`🔴 Console Error: ${text}`);
            }
        }
    });

    page.on('pageerror', error => {
        const text = error.message;
        if (!shouldIgnoreError(text)) {
            errors.push(`[Page Error] ${text}`);
            console.error(`🔴 Page Error: ${text}`);
        }
    });

    return errors;
}

/**
 * Assert no errors were collected during the test
 */
export async function assertNoErrors(errors: string[], testName?: string) {
    if (errors.length > 0) {
        const errorMsg = errors.join('\n');
        throw new Error(
            `Test ${testName ? `"${testName}" ` : ''}failed due to ${errors.length} console/page error(s):\n${errorMsg}`
        );
    }
}

/**
 * Combined setup: auth + error collection
 * Returns the errors array for later assertion
 */
export async function setupTestWithErrorDetection(page: Page): Promise<string[]> {
    await setupAuth(page);
    return setupErrorCollection(page);
}

/**
 * Wait for page to be fully loaded and stable
 */
export async function waitForPageReady(page: Page, timeout = 5000) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(Math.min(timeout, 1000)); // Small stabilization delay
}

/**
 * Navigate and wait for page to be ready
 */
export async function navigateAndWaitReady(page: Page, path: string) {
    await page.goto(path);
    await waitForPageReady(page);
}

/**
 * Test fixture that wraps a test with error detection
 */
export async function withErrorDetection<T>(
    page: Page,
    testFn: (errors: string[]) => Promise<T>,
    options?: { failOnErrors?: boolean; testName?: string }
): Promise<T> {
    const errors = setupErrorCollection(page);

    try {
        const result = await testFn(errors);

        if (options?.failOnErrors !== false) {
            await assertNoErrors(errors, options?.testName);
        }

        return result;
    } catch (error) {
        // Attach collected errors to the error message
        if (errors.length > 0) {
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`${originalMessage}\n\nAdditional console errors captured:\n${errors.join('\n')}`);
        }
        throw error;
    }
}

/**
 * Common selectors used across tests
 */
export const SELECTORS = {
    // Navigation
    sidebar: '[data-testid="sidebar"], .sidebar, nav',
    mainContent: 'main, [class*="content"]',

    // Modals
    modal: '.modal, [role="dialog"], .modal-box',
    modalBackdrop: '.modal-backdrop, [class*="overlay"]',
    closeButton: 'button[class*="close"], button:has(svg[class*="x"])',

    // Forms
    input: 'input, textarea',
    select: 'select, [role="listbox"]',
    submitButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Create")',

    // States
    loading: '[class*="loading"], [class*="spinner"], .skeleton',
    error: '[class*="error"], [class*="alert-error"]',
    success: '[class*="success"], [class*="alert-success"]',
    emptyState: '[class*="empty"], :has-text("No data"), :has-text("nothing")',

    // Buttons
    createButton: 'button:has-text("Create"), button:has-text("Add"), button:has-text("New")',
    deleteButton: 'button:has-text("Delete"), button[class*="delete"]',
    editButton: 'button:has-text("Edit"), button[class*="edit"]',
};
