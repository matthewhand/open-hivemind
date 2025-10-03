import { test, expect } from '@playwright/test';
import { 
  comprehensiveResponsiveTest,
  comprehensiveThemeTest,
  comprehensiveInteractiveTest
} from './utils';

test.describe('DaisyUI Components Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to DaisyUI components test page or create one
    await page.goto('http://localhost:5173/daisyui-test');
    await page.waitForLoadState('networkidle');
  });

  test('DaisyUI Buttons - All Variants', async ({ page }, testInfo) => {
    // Test different button variants
    const buttonVariants = [
      '.btn-primary',
      '.btn-secondary',
      '.btn-accent',
      '.btn-info',
      '.btn-success',
      '.btn-warning',
      '.btn-error',
      '.btn-ghost',
      '.btn-link'
    ];

    for (const selector of buttonVariants) {
      const buttonExists = await page.locator(selector).isVisible().catch(() => false);
      if (buttonExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        
        // Test normal state
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-btn-${variantName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test hover state
        await page.hover(selector);
        await page.waitForTimeout(200);
        
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-btn-${variantName}-hover.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Buttons - Sizes and States', async ({ page }, testInfo) => {
    // Test different button sizes
    const buttonSizes = [
      '.btn-xs',
      '.btn-sm',
      '.btn-md',
      '.btn-lg'
    ];

    for (const selector of buttonSizes) {
      const buttonExists = await page.locator(selector).isVisible().catch(() => false);
      if (buttonExists) {
        const sizeName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-btn-${sizeName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }

    // Test button states
    const buttonStates = [
      '.btn:disabled',
      '.btn.loading',
      '.btn.active'
    ];

    for (const selector of buttonStates) {
      const buttonExists = await page.locator(selector).isVisible().catch(() => false);
      if (buttonExists) {
        const stateName = selector.replace(/[^\w:]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-btn-${stateName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Cards - All Variants', async ({ page }, testInfo) => {
    // Test different card variants
    const cardVariants = [
      '.card',
      '.card-bordered',
      '.card-compact',
      '.card-side'
    ];

    for (const selector of cardVariants) {
      const cardExists = await page.locator(selector).isVisible().catch(() => false);
      if (cardExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-card-${variantName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test card hover state
        await page.hover(selector);
        await page.waitForTimeout(200);
        
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-card-${variantName}-hover.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Forms - Input Elements', async ({ page }, testInfo) => {
    // Test different input types
    const inputTypes = [
      '.input',
      '.input-bordered',
      '.input-primary',
      '.input-secondary',
      '.input-accent',
      '.input-info',
      '.input-success',
      '.input-warning',
      '.input-error'
    ];

    for (const selector of inputTypes) {
      const inputExists = await page.locator(selector).isVisible().catch(() => false);
      if (inputExists) {
        const typeName = selector.replace(/[^\w]/g, '-');
        
        // Test normal state
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-input-${typeName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test focus state
        await page.focus(selector);
        await page.waitForTimeout(200);
        
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-input-${typeName}-focus.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }

    // Test input sizes
    const inputSizes = [
      '.input-xs',
      '.input-sm',
      '.input-md',
      '.input-lg'
    ];

    for (const selector of inputSizes) {
      const inputExists = await page.locator(selector).isVisible().catch(() => false);
      if (inputExists) {
        const sizeName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-input-${sizeName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Forms - Checkboxes and Radio', async ({ page }, testInfo) => {
    // Test checkboxes
    const checkboxVariants = [
      '.checkbox',
      '.checkbox-primary',
      '.checkbox-secondary',
      '.checkbox-accent',
      '.checkbox-success',
      '.checkbox-warning',
      '.checkbox-info',
      '.checkbox-error'
    ];

    for (const selector of checkboxVariants) {
      const checkboxExists = await page.locator(selector).isVisible().catch(() => false);
      if (checkboxExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        
        // Test unchecked state
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}-unchecked.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test checked state
        await page.check(selector);
        await page.waitForTimeout(200);
        
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}-checked.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Uncheck for next test
        await page.uncheck(selector);
      }
    }

    // Test radio buttons
    const radioVariants = [
      '.radio',
      '.radio-primary',
      '.radio-secondary',
      '.radio-accent',
      '.radio-success',
      '.radio-warning',
      '.radio-info',
      '.radio-error'
    ];

    for (const selector of radioVariants) {
      const radioExists = await page.locator(selector).isVisible().catch(() => false);
      if (radioExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        
        // Test unchecked state
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}-unchecked.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test checked state
        await page.check(selector);
        await page.waitForTimeout(200);
        
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}-checked.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Modals - All Variants', async ({ page }, testInfo) => {
    // Test modal triggers and modals
    const modalTriggers = [
      { trigger: '.modal-trigger-default', modal: '.modal' },
      { trigger: '.modal-trigger-box', modal: '.modal-box' },
      { trigger: '.modal-trigger-bottom', modal: '.modal-bottom' },
      { trigger: '.modal-trigger-middle', modal: '.modal-middle' },
      { trigger: '.modal-responsive', modal: '.modal' }
    ];

    for (const { trigger, modal } of modalTriggers) {
      const triggerExists = await page.locator(trigger).isVisible().catch(() => false);
      if (triggerExists) {
        // Open modal
        await page.click(trigger);
        await page.waitForSelector(modal, { state: 'visible' });
        await page.waitForTimeout(300);

        const modalName = trigger.replace(/[^\w]/g, '-');
        await expect(page.locator(modal)).toHaveScreenshot(`daisyui-${modalName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  });

  test('DaisyUI Dropdowns - All Variants', async ({ page }, testInfo) => {
    // Test dropdown variants
    const dropdownVariants = [
      '.dropdown',
      '.dropdown-end',
      '.dropdown-left',
      '.dropdown-right',
      '.dropdown-top',
      '.dropdown-bottom'
    ];

    for (const selector of dropdownVariants) {
      const dropdownExists = await page.locator(selector).isVisible().catch(() => false);
      if (dropdownExists) {
        // Open dropdown
        await page.click(`${selector} .dropdown-toggle`);
        await page.waitForTimeout(300);

        const variantName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector)).toHaveScreenshot(`daisyui-${variantName}-open.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Close dropdown
        await page.click('body');
        await page.waitForTimeout(200);
      }
    }
  });

  test('DaisyUI Tabs - All Variants', async ({ page }, testInfo) => {
    // Test tab variants
    const tabVariants = [
      '.tabs',
      '.tabs-bordered',
      '.tabs-lifted',
      '.tabs-boxed',
      '.tabs-xs',
      '.tabs-sm',
      '.tabs-md',
      '.tabs-lg'
    ];

    for (const selector of tabVariants) {
      const tabsExist = await page.locator(selector).isVisible().catch(() => false);
      if (tabsExist) {
        const variantName = selector.replace(/[^\w]/g, '-');
        
        // Test tabs in default state
        await expect(page.locator(selector)).toHaveScreenshot(`daisyui-${variantName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test active tab
        const firstTab = await page.locator(`${selector} .tab`).first();
        if (await firstTab.isVisible()) {
          await firstTab.click();
          await page.waitForTimeout(300);
          
          await expect(page.locator(selector)).toHaveScreenshot(`daisyui-${variantName}-active.png`, {
            threshold: 0.2,
            maxDiffPixelRatio: 0.2
          });
        }
      }
    }
  });

  test('DaisyUI Alerts - All Variants', async ({ page }, testInfo) => {
    // Test alert variants
    const alertVariants = [
      '.alert',
      '.alert-info',
      '.alert-success',
      '.alert-warning',
      '.alert-error'
    ];

    for (const selector of alertVariants) {
      const alertExists = await page.locator(selector).isVisible().catch(() => false);
      if (alertExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Badges - All Variants', async ({ page }, testInfo) => {
    // Test badge variants
    const badgeVariants = [
      '.badge',
      '.badge-primary',
      '.badge-secondary',
      '.badge-accent',
      '.badge-info',
      '.badge-success',
      '.badge-warning',
      '.badge-error',
      '.badge-ghost',
      '.badge-outline'
    ];

    for (const selector of badgeVariants) {
      const badgeExists = await page.locator(selector).isVisible().catch(() => false);
      if (badgeExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }

    // Test badge sizes
    const badgeSizes = [
      '.badge-xs',
      '.badge-sm',
      '.badge-md',
      '.badge-lg'
    ];

    for (const selector of badgeSizes) {
      const badgeExists = await page.locator(selector).isVisible().catch(() => false);
      if (badgeExists) {
        const sizeName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-badge-${sizeName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Progress Bars - All Variants', async ({ page }, testInfo) => {
    // Test progress bar variants
    const progressVariants = [
      '.progress',
      '.progress-primary',
      '.progress-secondary',
      '.progress-accent',
      '.progress-info',
      '.progress-success',
      '.progress-warning',
      '.progress-error'
    ];

    for (const selector of progressVariants) {
      const progressExists = await page.locator(selector).isVisible().catch(() => false);
      if (progressExists) {
        const variantName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector).first()).toHaveScreenshot(`daisyui-${variantName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('DaisyUI Theme Integration', async ({ page }, testInfo) => {
    // Test components across different themes
    const themes = ['light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine'];
    
    for (const theme of themes) {
      // Set theme
      await page.evaluate((themeName) => {
        document.documentElement.setAttribute('data-theme', themeName);
      }, theme);
      
      await page.waitForTimeout(1000);

      // Test key components in this theme
      const componentsToTest = [
        '.btn-primary',
        '.card',
        '.input',
        '.alert-info'
      ];

      for (const componentSelector of componentsToTest) {
        const componentExists = await page.locator(componentSelector).isVisible().catch(() => false);
        if (componentExists) {
          const componentName = componentSelector.replace(/[^\w]/g, '-');
          await expect(page.locator(componentSelector).first()).toHaveScreenshot(
            `daisyui-theme-${theme}-${componentName}.png`, {
              threshold: 0.2,
              maxDiffPixelRatio: 0.2
            }
          );
        }
      }
    }
  });

  test('DaisyUI Responsive Components', async ({ page }, testInfo) => {
    // Test responsive behavior of key components
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      // Test responsive components
      const responsiveComponents = [
        '.card',
        '.dropdown',
        '.tabs',
        '.modal'
      ];

      for (const selector of responsiveComponents) {
        const componentExists = await page.locator(selector).isVisible().catch(() => false);
        if (componentExists) {
          const componentName = selector.replace(/[^\w]/g, '-');
          await expect(page.locator(selector).first()).toHaveScreenshot(
            `daisyui-responsive-${viewport.name}-${componentName}.png`, {
              threshold: 0.2,
              maxDiffPixelRatio: 0.2
            }
          );
        }
      }
    }
  });
});