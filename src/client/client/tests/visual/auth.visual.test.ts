import { test, expect } from '@playwright/test';
import { 
  comprehensiveResponsiveTest,
  comprehensiveThemeTest,
  comprehensiveInteractiveTest
} from './utils';

test.describe('Authentication Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
  });

  test('Login Page - Responsive Design', async ({ page }, testInfo) => {
    await comprehensiveResponsiveTest(page, testInfo, 'http://localhost:5173/login', {
      componentSelector: '.login-container, [data-testid="login-container"]',
      hoverElements: [
        '.login-button',
        '.input-field',
        '.forgot-password-link',
        '.signup-link'
      ]
    });
  });

  test('Login Page - Theme Variants', async ({ page }, testInfo) => {
    await comprehensiveThemeTest(page, testInfo, 'http://localhost:5173/login', {
      themes: ['light', 'dark'],
      toggleSelector: '[data-testid="theme-toggle"], .theme-toggle',
      componentSelectors: [
        '.login-container',
        '.login-form',
        '.login-header',
        '.input-group',
        '.login-button'
      ],
      testPersistence: true,
      testSystemTheme: true
    });
  });

  test('Login Page - Interactive Elements', async ({ page }, testInfo) => {
    await comprehensiveInteractiveTest(page, testInfo, 'http://localhost:5173/login', {
      buttonSelectors: [
        '.login-button',
        '.submit-button',
        '.forgot-password-button'
      ],
      formFieldSelectors: [
        '.email-input',
        '.password-input',
        '.username-input',
        '.login-input'
      ],
      customElements: [
        {
          selector: '.login-form',
          name: 'login-form',
          states: ['normal', 'hover', 'focus']
        },
        {
          selector: '.input-group',
          name: 'input-group',
          states: ['normal', 'hover', 'focus']
        }
      ]
    });
  });

  test('Login Form - Input States', async ({ page }, testInfo) => {
    // Test empty form state
    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-empty.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test filled form state
    await page.fill('.email-input, .username-input, [data-testid="email-input"]', 'test@example.com');
    await page.fill('.password-input, [data-testid="password-input"]', 'password123');
    await page.waitForTimeout(500);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-filled.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test focus states
    await page.focus('.email-input, .username-input, [data-testid="email-input"]');
    await page.waitForTimeout(200);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-email-focus.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    await page.focus('.password-input, [data-testid="password-input"]');
    await page.waitForTimeout(200);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-password-focus.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });

  test('Login Form - Validation States', async ({ page }, testInfo) => {
    // Test validation error states
    await page.evaluate(() => {
      const emailInput = document.querySelector('.email-input, .username-input, [data-testid="email-input"]');
      const passwordInput = document.querySelector('.password-input, [data-testid="password-input"]');
      
      if (emailInput) {
        emailInput.classList.add('error', 'invalid');
        emailInput.setAttribute('aria-invalid', 'true');
      }
      
      if (passwordInput) {
        passwordInput.classList.add('error', 'invalid');
        passwordInput.setAttribute('aria-invalid', 'true');
      }
    });

    await page.waitForTimeout(500);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-validation-errors.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test success state
    await page.evaluate(() => {
      const emailInput = document.querySelector('.email-input, .username-input, [data-testid="email-input"]');
      const passwordInput = document.querySelector('.password-input, [data-testid="password-input"]');
      
      if (emailInput) {
        emailInput.classList.remove('error', 'invalid');
        emailInput.classList.add('success', 'valid');
        emailInput.removeAttribute('aria-invalid');
      }
      
      if (passwordInput) {
        passwordInput.classList.remove('error', 'invalid');
        passwordInput.classList.add('success', 'valid');
        passwordInput.removeAttribute('aria-invalid');
      }
    });

    await page.waitForTimeout(500);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-validation-success.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });

  test('Login Form - Password Visibility Toggle', async ({ page }, testInfo) => {
    const passwordInput = '.password-input, [data-testid="password-input"]';
    const toggleButton = '.password-toggle, [data-testid="password-toggle"]';
    
    // Test password hidden state
    await page.fill(passwordInput, 'password123');
    await page.waitForTimeout(200);

    await expect(page.locator('.input-group:has(input[type="password"]), [data-testid="password-group"]')).toHaveScreenshot('login-password-hidden.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test password visible state
    const toggleExists = await page.locator(toggleButton).isVisible().catch(() => false);
    if (toggleExists) {
      await page.click(toggleButton);
      await page.waitForTimeout(200);

      await expect(page.locator('.input-group:has(input[type="text"]), [data-testid="password-group"]')).toHaveScreenshot('login-password-visible.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }
  });

  test('Login Form - Loading States', async ({ page }, testInfo) => {
    // Fill form
    await page.fill('.email-input, .username-input, [data-testid="email-input"]', 'test@example.com');
    await page.fill('.password-input, [data-testid="password-input"]', 'password123');

    // Simulate loading state
    await page.evaluate(() => {
      const loginButton = document.querySelector('.login-button, .submit-button, [data-testid="login-button"]');
      if (loginButton) {
        loginButton.classList.add('loading');
        loginButton.setAttribute('disabled', 'disabled');
      }
    });

    await page.waitForTimeout(1000);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-loading.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });

  test('Login Form - Error Messages', async ({ page }, testInfo) => {
    // Test general error message
    await page.evaluate(() => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message login-error';
      errorDiv.textContent = 'Invalid email or password. Please try again.';
      errorDiv.setAttribute('data-testid', 'login-error');
      
      const form = document.querySelector('.login-form, [data-testid="login-form"]');
      if (form) {
        form.appendChild(errorDiv);
      }
    });

    await page.waitForTimeout(500);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-error-message.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test field-specific error messages
    await page.evaluate(() => {
      const emailInput = document.querySelector('.email-input, .username-input, [data-testid="email-input"]');
      const passwordInput = document.querySelector('.password-input, [data-testid="password-input"]');
      
      if (emailInput) {
        const emailError = document.createElement('div');
        emailError.className = 'field-error';
        emailError.textContent = 'Please enter a valid email address';
        emailError.setAttribute('data-testid', 'email-error');
        emailInput.parentNode?.insertBefore(emailError, emailInput.nextSibling);
      }
      
      if (passwordInput) {
        const passwordError = document.createElement('div');
        passwordError.className = 'field-error';
        passwordError.textContent = 'Password must be at least 8 characters';
        passwordError.setAttribute('data-testid', 'password-error');
        passwordInput.parentNode?.insertBefore(passwordError, passwordInput.nextSibling);
      }
    });

    await page.waitForTimeout(500);

    await expect(page.locator('.login-form, [data-testid="login-form"]')).toHaveScreenshot('login-form-field-errors.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });

  test('Signup Page - Visual Tests', async ({ page }, testInfo) => {
    // Navigate to signup page
    await page.goto('http://localhost:5173/signup');
    await page.waitForLoadState('networkidle');

    // Test signup form layout
    const signupFormExists = await page.locator('.signup-form, [data-testid="signup-form"]').isVisible().catch(() => false);
    if (signupFormExists) {
      await expect(page.locator('.signup-form, [data-testid="signup-form"]')).toHaveScreenshot('signup-form-layout.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test form progress indicators
    const progressIndicatorExists = await page.locator('.progress-indicator, [data-testid="progress-indicator"]').isVisible().catch(() => false);
    if (progressIndicatorExists) {
      await expect(page.locator('.progress-indicator, [data-testid="progress-indicator"]')).toHaveScreenshot('signup-progress-indicator.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }
  });

  test('Forgot Password Page - Visual Tests', async ({ page }, testInfo) => {
    // Navigate to forgot password page
    await page.goto('http://localhost:5173/forgot-password');
    await page.waitForLoadState('networkidle');

    // Test forgot password form
    const forgotFormExists = await page.locator('.forgot-password-form, [data-testid="forgot-password-form"]').isVisible().catch(() => false);
    if (forgotFormExists) {
      await expect(page.locator('.forgot-password-form, [data-testid="forgot-password-form"]')).toHaveScreenshot('forgot-password-form.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test success state
    await page.evaluate(() => {
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.textContent = 'Password reset link has been sent to your email.';
      successMessage.setAttribute('data-testid', 'reset-success');
      
      const form = document.querySelector('.forgot-password-form, [data-testid="forgot-password-form"]');
      if (form) {
        form.appendChild(successMessage);
      }
    });

    await page.waitForTimeout(500);

    await expect(page.locator('.forgot-password-form, [data-testid="forgot-password-form"]')).toHaveScreenshot('forgot-password-success.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });

  test('Authentication - Social Login Options', async ({ page }, testInfo) => {
    // Test social login buttons if they exist
    const socialButtons = [
      '.google-login',
      '.github-login',
      '.discord-login',
      '.microsoft-login'
    ];

    for (const selector of socialButtons) {
      const buttonExists = await page.locator(selector).isVisible().catch(() => false);
      if (buttonExists) {
        const buttonName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector)).toHaveScreenshot(`auth-${buttonName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test hover state
        await page.hover(selector);
        await page.waitForTimeout(200);

        await expect(page.locator(selector)).toHaveScreenshot(`auth-${buttonName}-hover.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('Authentication - Remember Me and Additional Options', async ({ page }, testInfo) => {
    // Test remember me checkbox
    const rememberMeExists = await page.locator('.remember-me, [data-testid="remember-me"]').isVisible().catch(() => false);
    if (rememberMeExists) {
      await expect(page.locator('.remember-me, [data-testid="remember-me"]')).toHaveScreenshot('auth-remember-me.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });

      // Test checked state
      await page.check('.remember-me input, [data-testid="remember-me"] input');
      await page.waitForTimeout(200);

      await expect(page.locator('.remember-me, [data-testid="remember-me"]')).toHaveScreenshot('auth-remember-me-checked.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test additional links
    const additionalLinks = [
      '.forgot-password-link',
      '.signup-link',
      '.help-link',
      '.terms-link',
      '.privacy-link'
    ];

    for (const selector of additionalLinks) {
      const linkExists = await page.locator(selector).isVisible().catch(() => false);
      if (linkExists) {
        const linkName = selector.replace(/[^\w]/g, '-');
        await expect(page.locator(selector)).toHaveScreenshot(`auth-${linkName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });

  test('Authentication - Mobile Experience', async ({ page }, testInfo) => {
    // Test mobile viewport specifically for auth
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.login-container, [data-testid="login-container"]')).toHaveScreenshot('auth-mobile-login.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test mobile keyboard behavior
    await page.tap('.email-input, .username-input, [data-testid="email-input"]');
    await page.waitForTimeout(500);

    await expect(page.locator('.login-container, [data-testid="login-container"]')).toHaveScreenshot('auth-mobile-keyboard.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });
  });
});