# Playwright E2E Testing Architecture

This directory contains the enhanced Playwright testing setup for the open-hivemind project, implementing a robust page object model and improved test organization.

## 📁 Directory Structure

```
tests/e2e/
├── fixtures/           # Test fixtures and authentication helpers
│   └── auth-fixtures.ts
├── page-objects/      # Page Object Model implementation
│   ├── base/          # Base page class with common functionality
│   │   └── BasePage.ts
│   ├── auth/          # Authentication-related page objects
│   │   └── LoginPage.ts
│   ├── admin/         # Admin interface page objects
│   │   ├── DashboardPage.ts
│   │   └── GuardsPage.ts
│   ├── monitoring/    # Monitoring page objects
│   │   └── MonitoringPage.ts
│   └── index.ts       # Central exports
├── utils/             # Test utilities and helpers
│   ├── test-helpers.ts
│   └── data-generators.ts
├── data/              # Test data files (if needed)
├── global-setup.ts    # Global test setup
├── global-teardown.ts # Global test teardown
├── *.spec.ts          # Test files
└── README.md          # This file
```

## 🏗️ Architecture Components

### Page Object Model (POM)

The Page Object Model pattern provides:

- **BasePage**: Common functionality for all page objects
- **Specific Page Objects**: Dedicated classes for each major interface
- **Reusable Methods**: Common actions and assertions
- **Maintainability**: Easy updates when UI changes

### Test Fixtures

Authentication fixtures provide:

- **Pre-authenticated sessions**: Admin and user contexts
- **Login helpers**: Easy authentication methods
- **Test data management**: Consistent test credentials

### Test Utilities

Helper functions for:

- **Wait conditions**: Custom wait logic
- **Data generation**: Realistic test data
- **API mocking**: Controllable API responses
- **Accessibility testing**: Built-in a11y checks

## 🚀 Enhanced Features

### Mobile & Responsive Testing

Configuration includes:

- **Mobile devices**: Pixel 5, iPhone 12
- **Tablet devices**: iPad Pro
- **Desktop browsers**: Chrome, Firefox, Safari
- **Responsive design checks**: Automatic viewport testing

### Visual Regression Testing

Support for:

- **Screenshot comparison**: Visual diff testing
- **Cross-browser consistency**: Visual checks across browsers
- **Responsive screenshots**: Different viewport captures

### Accessibility Testing

Built-in accessibility checks:

- **Heading hierarchy**: Proper heading structure
- **Landmark regions**: Main, nav, etc.
- **Form labels**: Proper input labeling
- **ARIA attributes**: Accessibility compliance

### Enhanced Reporting

Comprehensive test reporting:

- **HTML reports**: Interactive test results
- **JSON reports**: Machine-readable results
- **JUnit reports**: CI/CD integration
- **Screenshots**: Automatic capture on failures
- **Videos**: Test execution recordings

## 📝 Usage Examples

### Basic Test with Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects';
import { TEST_USERS } from './fixtures/auth-fixtures';

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.navigateToLogin();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    
    expect(await loginPage.isLoggedIn()).toBe(true);
  });
});
```

### Using Authentication Fixtures

```typescript
import { test as authenticatedTest } from './fixtures/auth-fixtures';
import { DashboardPage } from './page-objects';

authenticatedTest.describe('Dashboard', () => {
  authenticatedTest('displays metrics', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigateToDashboard();
    
    expect(await dashboardPage.areSummaryCardsVisible()).toBe(true);
  });
});
```

### Data Generation

```typescript
import { generateUser, generateBot } from './utils/data-generators';

test('creates new bot', async ({ page }) => {
  const testBot = generateBot({
    name: 'Test Bot',
    platform: 'discord'
  });
  
  // Use testBot in test logic
});
```

## 🔧 Configuration

### Environment Variables

- `PLAYWRIGHT_BASE_URL`: Base URL for tests
- `TEST_ADMIN_USERNAME`: Admin username
- `TEST_ADMIN_PASSWORD`: Admin password
- `TEST_USER_USERNAME`: Regular user username
- `TEST_USER_PASSWORD`: Regular user password
- `CI`: CI environment flag

### Browser Configuration

The configuration supports:

- **Desktop browsers**: Chrome, Firefox, Safari
- **Mobile browsers**: Mobile Chrome, Mobile Safari
- **Tablet browsers**: iPad
- **Custom browsers**: Edge, Chrome Canary

## 🎯 Best Practices

### Test Organization

1. **Use page objects**: All UI interactions through page objects
2. **Group related tests**: Logical test suites
3. **Descriptive test names**: Clear test purpose
4. **Avoid brittle selectors**: Use stable selectors with data-testid

### Test Data

1. **Use data generators**: Dynamic test data
2. **Clean isolation**: Each test independent
3. **Realistic data**: Meaningful test scenarios
4. **Environment-specific**: Different data for different environments

### Error Handling

1. **Explicit waits**: Avoid implicit waits
2. **Clear assertions**: Descriptive error messages
3. **Screenshot on failure**: Automatic debugging
4. **Retry logic**: Handle flaky conditions

## 🚦 Running Tests

### Local Development

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright tests/e2e/login.spec.ts

# Run in headed mode
npx playwright tests/e2e/login.spec.ts --headed

# Run with specific browser
npx playwright tests/e2e/login.spec.ts --project=chromium
```

### CI/CD

```bash
# Run in CI mode
npm run test:e2e:ci

# Generate reports
npm run test:e2e:report
```

### Debug Mode

```bash
# Run with debug
npx playwright tests/e2e/login.spec.ts --debug

# Run with trace
npx playwright tests/e2e/login.spec.ts --trace on
```

## 📊 Test Reports

After test execution, find reports in:

- `playwright-report/`: HTML report
- `test-results/`: JSON results, screenshots, videos
- `test-results/junit.xml`: JUnit format for CI

## 🔍 Debugging

### Common Issues

1. **Selector not found**: Use browser dev tools to verify selectors
2. **Timing issues**: Add explicit waits for dynamic content
3. **Authentication failures**: Verify test credentials and login flow
4. **Flaky tests**: Check for race conditions and network issues

### Debug Tools

- **Playwright Inspector**: `--debug` flag
- **Trace Viewer**: `--trace on` flag
- **Code generation**: `npx playwright codegen`
- **Screenshots**: Automatic on failure

## 🚀 Future Enhancements

Planned improvements:

- **Visual regression baseline management**
- **Component testing integration**
- **Performance testing metrics**
- **API test integration**
- **Cross-browser matrix expansion**
- **Mobile app testing support**

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Pattern](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Visual Regression Testing](https://playwright.dev/docs/test-snapshots)