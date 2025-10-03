import { Page, TestInfo } from '@playwright/test';
import { takeScreenshotAndCompare, DEFAULT_VISUAL_CONFIG } from './visual-testing.utils';

/**
 * Interactive states to test
 */
export const INTERACTIVE_STATES = {
  normal: 'normal',
  hover: 'hover',
  focus: 'focus',
  active: 'active',
  disabled: 'disabled',
  loading: 'loading',
} as const;

/**
 * Common interactive element selectors
 */
export const INTERACTIVE_SELECTORS = {
  buttons: 'button, [role="button"], .btn',
  links: 'a[href]',
  inputs: 'input, textarea, select',
  checkboxes: 'input[type="checkbox"], .checkbox',
  radio: 'input[type="radio"], .radio',
  dropdowns: 'select, .dropdown, [role="combobox"]',
  toggles: '.toggle, .switch, [role="switch"]',
  cards: '.card, [role="card"]',
  listItems: 'li, .list-item',
  tabs: '.tab, [role="tab"]',
  modals: '.modal, [role="dialog"]',
} as const;

/**
 * Tests hover states for an element
 */
export async function testHoverState(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    await page.hover(selector);
    await page.waitForTimeout(300); // Allow for hover animations

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-hover`,
      DEFAULT_VISUAL_CONFIG
    );
  } catch (error) {
    console.log(`⚠️ Could not test hover state for: ${selector}`);
  }
}

/**
 * Tests focus states for an element
 */
export async function testFocusState(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    await page.focus(selector);
    await page.waitForTimeout(200); // Allow for focus animations

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-focus`,
      DEFAULT_VISUAL_CONFIG
    );
  } catch (error) {
    console.log(`⚠️ Could not test focus state for: ${selector}`);
  }
}

/**
 * Tests active/pressed states for an element
 */
export async function testActiveState(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Mouse down to simulate active state
    await page.mouse.down();
    await page.hover(selector);
    await page.waitForTimeout(100);
    
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-active`,
      DEFAULT_VISUAL_CONFIG
    );
    
    // Release mouse
    await page.mouse.up();
  } catch (error) {
    console.log(`⚠️ Could not test active state for: ${selector}`);
  }
}

/**
 * Tests disabled states for form elements
 */
export async function testDisabledState(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Check if element can be disabled
    const canBeDisabled = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      return element && (
        element.tagName === 'BUTTON' ||
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT' ||
        element.hasAttribute('disabled') ||
        element.classList.contains('disabled')
      );
    }, selector);

    if (!canBeDisabled) {
      console.log(`⚠️ Element cannot be disabled: ${selector}`);
      return;
    }

    // Disable the element
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.setAttribute('disabled', 'disabled');
        element.classList.add('disabled');
      }
    }, selector);

    await page.waitForTimeout(200);

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-disabled`,
      DEFAULT_VISUAL_CONFIG
    );

    // Re-enable the element
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.removeAttribute('disabled');
        element.classList.remove('disabled');
      }
    }, selector);
  } catch (error) {
    console.log(`⚠️ Could not test disabled state for: ${selector}`);
  }
}

/**
 * Tests loading states for elements
 */
export async function testLoadingState(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Add loading class/attribute
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.classList.add('loading');
        element.setAttribute('data-loading', 'true');
      }
    }, selector);

    await page.waitForTimeout(300);

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-loading`,
      DEFAULT_VISUAL_CONFIG
    );

    // Remove loading state
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.classList.remove('loading');
        element.removeAttribute('data-loading');
      }
    }, selector);
  } catch (error) {
    console.log(`⚠️ Could not test loading state for: ${selector}`);
  }
}

/**
 * Tests all interactive states for a single element
 */
export async function testAllInteractiveStates(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string,
  states: (keyof typeof INTERACTIVE_STATES)[] = [
    'normal',
    'hover',
    'focus',
    'active',
    'disabled',
    'loading'
  ]
): Promise<void> {
  console.log(`🔄 Testing interactive states for: ${selector}`);

  // Test normal state first
  if (states.includes('normal')) {
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-normal`,
      DEFAULT_VISUAL_CONFIG
    );
  }

  // Test hover state
  if (states.includes('hover')) {
    await testHoverState(page, testInfo, selector, screenshotName);
  }

  // Test focus state
  if (states.includes('focus')) {
    await testFocusState(page, testInfo, selector, screenshotName);
  }

  // Test active state
  if (states.includes('active')) {
    await testActiveState(page, testInfo, selector, screenshotName);
  }

  // Test disabled state
  if (states.includes('disabled')) {
    await testDisabledState(page, testInfo, selector, screenshotName);
  }

  // Test loading state
  if (states.includes('loading')) {
    await testLoadingState(page, testInfo, selector, screenshotName);
  }

  console.log(`✅ Interactive states testing completed for: ${selector}`);
}

/**
 * Tests interactive states for multiple elements of the same type
 */
export async function testInteractiveStatesForElements(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  elementName: string,
  maxElements: number = 3
): Promise<void> {
  const elements = await page.$$(selector);
  const elementsToTest = elements.slice(0, maxElements);

  for (let i = 0; i < elementsToTest.length; i++) {
    const elementSelector = `${selector}:nth-child(${i + 1})`;
    const screenshotName = `${testInfo.title.replace(/\s+/g, '-')}-${elementName}-${i + 1}`;
    
    await testAllInteractiveStates(page, testInfo, elementSelector, screenshotName);
  }
}

/**
 * Tests button interactions including click states
 */
export async function testButtonInteractions(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Test normal state
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-normal`,
      DEFAULT_VISUAL_CONFIG
    );

    // Test hover state
    await testHoverState(page, testInfo, selector, screenshotName);

    // Test focus state
    await testFocusState(page, testInfo, selector, screenshotName);

    // Test click state
    await page.click(selector);
    await page.waitForTimeout(300);

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-clicked`,
      DEFAULT_VISUAL_CONFIG
    );
  } catch (error) {
    console.log(`⚠️ Could not test button interactions for: ${selector}`);
  }
}

/**
 * Tests form field interactions including validation states
 */
export async function testFormFieldInteractions(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Test normal state
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-normal`,
      DEFAULT_VISUAL_CONFIG
    );

    // Test focus state
    await testFocusState(page, testInfo, selector, screenshotName);

    // Test with content
    await page.fill(selector, 'Test content');
    await page.waitForTimeout(200);

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-with-content`,
      DEFAULT_VISUAL_CONFIG
    );

    // Test error state (if applicable)
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.classList.add('error', 'invalid');
        element.setAttribute('aria-invalid', 'true');
      }
    }, selector);

    await page.waitForTimeout(200);

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-error`,
      DEFAULT_VISUAL_CONFIG
    );

    // Clear the field
    await page.fill(selector, '');
  } catch (error) {
    console.log(`⚠️ Could not test form field interactions for: ${selector}`);
  }
}

/**
 * Tests dropdown/select interactions
 */
export async function testDropdownInteractions(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Test closed state
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-closed`,
      DEFAULT_VISUAL_CONFIG
    );

    // Test hover state
    await testHoverState(page, testInfo, selector, screenshotName);

    // Test open state
    await page.click(selector);
    await page.waitForTimeout(300);

    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-open`,
      DEFAULT_VISUAL_CONFIG
    );

    // Close dropdown (click outside)
    await page.click('body');
    await page.waitForTimeout(200);
  } catch (error) {
    console.log(`⚠️ Could not test dropdown interactions for: ${selector}`);
  }
}

/**
 * Tests modal/dialog interactions
 */
export async function testModalInteractions(
  page: Page,
  testInfo: TestInfo,
  triggerSelector: string,
  modalSelector: string,
  screenshotName: string
): Promise<void> {
  try {
    // Open modal
    await page.click(triggerSelector);
    await page.waitForSelector(modalSelector, { state: 'visible' });
    await page.waitForTimeout(300);

    // Test modal open state
    await takeScreenshotAndCompare(
      page,
      testInfo,
      `${screenshotName}-open`,
      DEFAULT_VISUAL_CONFIG
    );

    // Test modal hover state
    await testHoverState(page, testInfo, modalSelector, screenshotName);

    // Close modal (look for close button or overlay)
    const closeButton = await page.$(`${modalSelector} .close, ${modalSelector} [aria-label="Close"], ${modalSelector} button`);
    if (closeButton) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(300);
  } catch (error) {
    console.log(`⚠️ Could not test modal interactions for: ${modalSelector}`);
  }
}

/**
 * Comprehensive interactive testing suite
 */
export async function comprehensiveInteractiveTest(
  page: Page,
  testInfo: TestInfo,
  url: string,
  options: {
    buttonSelectors?: string[];
    formFieldSelectors?: string[];
    dropdownSelectors?: string[];
    modalTriggers?: Array<{ trigger: string; modal: string }>;
    customElements?: Array<{ selector: string; name: string; states?: (keyof typeof INTERACTIVE_STATES)[] }>;
  } = {}
): Promise<void> {
  console.log(`🔄 Starting comprehensive interactive test for ${testInfo.title}`);

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  const {
    buttonSelectors = [],
    formFieldSelectors = [],
    dropdownSelectors = [],
    modalTriggers = [],
    customElements = [],
  } = options;

  // Test buttons
  for (const selector of buttonSelectors) {
    const buttonName = selector.replace(/[^a-zA-Z0-9]/g, '-');
    await testButtonInteractions(
      page,
      testInfo,
      selector,
      `${testInfo.title.replace(/\s+/g, '-')}-${buttonName}`
    );
  }

  // Test form fields
  for (const selector of formFieldSelectors) {
    const fieldName = selector.replace(/[^a-zA-Z0-9]/g, '-');
    await testFormFieldInteractions(
      page,
      testInfo,
      selector,
      `${testInfo.title.replace(/\s+/g, '-')}-${fieldName}`
    );
  }

  // Test dropdowns
  for (const selector of dropdownSelectors) {
    const dropdownName = selector.replace(/[^a-zA-Z0-9]/g, '-');
    await testDropdownInteractions(
      page,
      testInfo,
      selector,
      `${testInfo.title.replace(/\s+/g, '-')}-${dropdownName}`
    );
  }

  // Test modals
  for (const { trigger, modal } of modalTriggers) {
    const modalName = modal.replace(/[^a-zA-Z0-9]/g, '-');
    await testModalInteractions(
      page,
      testInfo,
      trigger,
      modal,
      `${testInfo.title.replace(/\s+/g, '-')}-${modalName}`
    );
  }

  // Test custom elements
  for (const { selector, name, states } of customElements) {
    await testAllInteractiveStates(
      page,
      testInfo,
      selector,
      `${testInfo.title.replace(/\s+/g, '-')}-${name}`,
      states
    );
  }

  console.log(`✅ Comprehensive interactive test completed for ${testInfo.title}`);
}