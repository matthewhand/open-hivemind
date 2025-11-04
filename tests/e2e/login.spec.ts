import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/auth/LoginPage';
import { TEST_USERS } from './fixtures/auth-fixtures';

test.describe('Login flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test('authenticates with demo credentials', async () => {
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

    expect(await loginPage.isLoggedIn()).toBe(true);
    expect(await loginPage.getCurrentUrl()).toContain('dashboard');
  });

  test('shows validation error for bad credentials', async () => {
    await loginPage.fillCredentials(TEST_USERS.invalid.username, TEST_USERS.invalid.password);
    await loginPage.submitLogin();

    const errorMessage = await loginPage.getLoginError();
    expect(errorMessage).toContain('Invalid username or password');
  });

  test('disables submit while loading', async () => {
    await loginPage.fillCredentials(TEST_USERS.admin.username, 'wrong');

    // Submit and check if button becomes disabled
    await loginPage.submitButton.click();
    await loginPage.waitForSubmitButtonDisabled();

    expect(await loginPage.isSubmitButtonEnabled()).toBe(false);
  });

  test('login form has proper accessibility', async () => {
    await loginPage.checkAccessibility();
    expect(await loginPage.isLoginFormVisible()).toBe(true);
  });

  test('can login using Enter key', async () => {
    await loginPage.fillCredentials(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.submitWithEnter();

    expect(await loginPage.isLoggedIn()).toBe(true);
  });

  test('clears form fields properly', async () => {
    await loginPage.fillCredentials(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.clearForm();

    expect(await loginPage.usernameInput.inputValue()).toBe('');
    expect(await loginPage.passwordInput.inputValue()).toBe('');
  });

  test('maintains proper focus order', async () => {
    await loginPage.navigateToLogin();

    // Check initial focus on username field
    expect(await loginPage.isUsernameFieldFocused()).toBe(true);

    // Tab to password field
    await loginPage.page.keyboard.press('Tab');
    expect(await loginPage.isPasswordFieldFocused()).toBe(true);

    // Check password field is masked
    expect(await loginPage.isPasswordMasked()).toBe(true);
  });
});