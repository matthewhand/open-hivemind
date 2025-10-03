# Visual Regression Testing System

This directory contains a comprehensive visual regression testing system for the Open-Hivemind WebUI, built with Playwright. The system ensures UI consistency across browsers, viewports, themes, and interactive states.

## 🎯 Overview

The visual regression testing system provides:
- **Cross-browser testing**: Chrome, Firefox, Safari, Edge
- **Responsive design testing**: Mobile, Tablet, Desktop viewports
- **Theme testing**: Light, dark, and system themes
- **Interactive state testing**: Hover, focus, active, disabled states
- **Component-level testing**: Dashboard, Admin Panel, Authentication, DaisyUI components
- **Automated CI/CD integration**: GitHub Actions workflow
- **Visual diff reporting**: HTML, JSON, and Markdown reports

## 📁 Directory Structure

```
tests/visual/
├── README.md                          # This file
├── global-setup.ts                   # Global test setup
├── global-teardown.ts                # Global test teardown
├── utils/                            # Utility functions
│   ├── visual-testing.utils.ts       # Core visual testing utilities
│   ├── responsive-testing.utils.ts   # Responsive design testing
│   ├── theme-testing.utils.ts        # Theme testing utilities
│   ├── interactive-testing.utils.ts  # Interactive state testing
│   └── visual-report.utils.ts        # Visual diff reporting
├── fixtures/                         # Test fixtures and mock data
├── helpers/                          # Custom test helpers
├── screenshots/                      # Screenshot storage
│   ├── baseline/                     # Baseline screenshots
│   ├── current/                      # Current test screenshots
│   └── diff/                         # Difference screenshots
├── dashboard.visual.test.ts          # Dashboard visual tests
├── admin-panel.visual.test.ts        # Admin Panel visual tests
├── auth.visual.test.ts               # Authentication visual tests
└── daisyui-components.visual.test.ts # DaisyUI component tests
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Playwright browsers installed

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Install system dependencies (if needed):
```bash
npx playwright install-deps
```

### Running Tests

#### Basic Visual Tests
```bash
# Run all visual tests
npm run test:visual

# Run tests in headed mode (shows browser)
npm run test:visual:headed

# Run tests in debug mode
npm run test:visual:debug
```

#### Browser-Specific Tests
```bash
# Run tests only on Chromium
npm run test:visual:chromium

# Run tests only on Firefox
npm run test:visual:firefox

# Run tests only on WebKit (Safari)
npm run test:visual:webkit
```

#### Updating Screenshots
```bash
# Update baseline screenshots
npm run test:visual:update
```

#### Viewing Reports
```bash
# View HTML test report
npm run test:visual:report
```

## 📊 Test Coverage

### Major Components

1. **Dashboard**
   - Responsive layouts
   - Theme variants
   - Interactive elements
   - Loading states
   - Error states
   - Data visualization
   - Real-time updates
   - Accessibility features

2. **Admin Panel**
   - Configuration forms
   - Agent management
   - MCP server management
   - Persona management
   - Form validation
   - Loading/saving states
   - Success/error messages
   - Data tables

3. **Authentication**
   - Login/signup forms
   - Input validation states
   - Password visibility toggle
   - Loading states
   - Error messages
   - Social login options
   - Remember me functionality
   - Mobile experience

4. **DaisyUI Components**
   - All button variants and states
   - Card components
   - Form inputs (all types and states)
   - Checkboxes and radio buttons
   - Modals and dropdowns
   - Tabs and alerts
   - Badges and progress bars
   - Theme integration
   - Responsive behavior

### Testing Scenarios

#### Responsive Design
- Mobile (375x667)
- Mobile Large (414x896)
- Tablet (768x1024)
- Tablet Landscape (1024x768)
- Desktop (1280x720)
- Desktop Large (1920x1080)
- Ultrawide (2560x1440)

#### Theme Testing
- Light theme
- Dark theme
- System preference
- Theme persistence
- Theme toggle functionality

#### Interactive States
- Normal state
- Hover state
- Focus state
- Active/pressed state
- Disabled state
- Loading state

## 🔧 Configuration

### Playwright Configuration

The main configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ['junit', { outputFile: 'test-results/visual-results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Visual Testing Configuration

Default visual testing configuration in `utils/visual-testing.utils.ts`:

```typescript
export const DEFAULT_VISUAL_CONFIG: VisualTestConfig = {
  threshold: 0.2, // 20% threshold for image comparison
  screenshotOptions: {
    fullPage: false,
    omitBackground: false,
    animations: 'disabled',
  },
};
```

## 📈 CI/CD Integration

### GitHub Actions Workflow

The visual tests are integrated into GitHub Actions (`.github/workflows/visual-regression.yml`):

- **Triggers**: Push to main/develop, PRs, daily schedule, manual dispatch
- **Matrix testing**: Runs across Chrome, Firefox, Safari
- **Artifact storage**: Uploads test results and screenshots
- **Visual diff reporting**: Generates comprehensive reports
- **Baseline updates**: Manual workflow to update baselines
- **Slack notifications**: Optional failure notifications

### Workflow Features

1. **Multi-browser testing**: Chrome, Firefox, Safari
2. **Artifact storage**: 30-day retention
3. **Visual diff reports**: HTML, JSON, Markdown
4. **Baseline management**: Manual update workflow
5. **Failure notifications**: Slack integration
6. **Summary reports**: GitHub step summaries

## 📋 Writing New Visual Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { 
  comprehensiveResponsiveTest,
  comprehensiveThemeTest,
  comprehensiveInteractiveTest
} from './utils';

test.describe('Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/component-path');
    await page.waitForLoadState('networkidle');
  });

  test('Component - Responsive Design', async ({ page }, testInfo) => {
    await comprehensiveResponsiveTest(page, testInfo, 'http://localhost:5173/component-path', {
      componentSelector: '.component-selector',
      mobileMenuSelector: '.mobile-menu',
      sidebarSelector: '.sidebar',
      hoverElements: ['.interactive-element']
    });
  });

  test('Component - Theme Variants', async ({ page }, testInfo) => {
    await comprehensiveThemeTest(page, testInfo, 'http://localhost:5173/component-path', {
      themes: ['light', 'dark'],
      toggleSelector: '.theme-toggle',
      componentSelectors: ['.component', '.sub-component'],
      testPersistence: true,
      testSystemTheme: true
    });
  });

  test('Component - Interactive Elements', async ({ page }, testInfo) => {
    await comprehensiveInteractiveTest(page, testInfo, 'http://localhost:5173/component-path', {
      buttonSelectors: ['.button', '.action-button'],
      formFieldSelectors: ['.input', '.select'],
      dropdownSelectors: ['.dropdown'],
      modalTriggers: [{ trigger: '.modal-trigger', modal: '.modal' }],
      customElements: [
        {
          selector: '.custom-element',
          name: 'custom-element',
          states: ['normal', 'hover', 'focus']
        }
      ]
    });
  });
});
```

### Utility Functions

The system provides comprehensive utility functions:

1. **`takeScreenshotAndCompare`**: Basic screenshot comparison
2. **`waitForComponentAndScreenshot`**: Wait for component before screenshot
3. **`testResponsiveLayouts`**: Test across viewports
4. **`testThemeVariants`**: Test theme switching
5. **`testInteractiveStates`**: Test interactive states
6. **`comprehensiveResponsiveTest`**: Full responsive testing suite
7. **`comprehensiveThemeTest`**: Full theme testing suite
8. **`comprehensiveInteractiveTest`**: Full interactive testing suite

### Best Practices

1. **Use semantic selectors**: Prefer `[data-testid="..."]` over CSS classes
2. **Wait for stability**: Use `waitForLoadState('networkidle')` and `waitForTimeout`
3. **Test meaningful states**: Focus on user-facing states and interactions
4. **Use appropriate thresholds**: Adjust thresholds for dynamic content
5. **Group related tests**: Use `test.describe` for logical grouping
6. **Handle missing elements**: Gracefully handle elements that might not exist
7. **Clean up state**: Reset test state between tests

## 🐛 Troubleshooting

### Common Issues

1. **Flaky tests**: Increase timeouts or add explicit waits
2. **Missing elements**: Check selectors and element visibility
3. **Theme switching issues**: Ensure theme toggle selectors are correct
4. **Screenshot failures**: Check if application is running and accessible
5. **High diff ratios**: Adjust thresholds or check for dynamic content

### Debug Mode

Run tests in debug mode to inspect issues:
```bash
npm run test:visual:debug
```

### Headed Mode

Run tests in headed mode to see the browser:
```bash
npm run test:visual:headed
```

### Updating Baselines

If tests fail due to intentional changes:
```bash
npm run test:visual:update
```

## 📊 Reports and Analytics

### Report Types

1. **HTML Report**: Interactive visual report with filtering
2. **JSON Report**: Machine-readable test results
3. **Markdown Report**: GitHub-friendly summary report

### Report Features

- **Filtering**: By browser, theme, viewport, status
- **Side-by-side comparison**: Baseline vs current vs diff
- **Metadata display**: Test context and configuration
- **Responsive design**: Mobile-friendly report layout

### Accessing Reports

```bash
# Generate and view HTML report
npm run test:visual:report

# Reports are located in:
# - test-results/playwright-report/
# - test-results/visual-report/
```

## 🔮 Future Enhancements

Planned improvements to the visual testing system:

1. **Performance testing**: Visual performance regression testing
2. **Accessibility testing**: Automated accessibility visual checks
3. **Cross-device testing**: Real device testing integration
4. **Visual AI testing**: AI-powered visual anomaly detection
5. **Component library testing**: Automated component library testing
6. **Design system validation**: Design token compliance testing
7. **Internationalization testing**: Visual testing for different locales
8. **Animation testing**: Visual testing for animations and transitions

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Visual Regression Testing Best Practices](https://playwright.dev/docs/visual-comparisons)
- [DaisyUI Documentation](https://daisyui.com/)
- [Open-Hivemind Documentation](../../README.md)

## 🤝 Contributing

When contributing to the visual testing system:

1. Follow the existing test patterns and conventions
2. Use semantic selectors and appropriate timeouts
3. Test across browsers, viewports, and themes
4. Update documentation for new features
5. Ensure tests are stable and reliable
6. Add appropriate error handling and logging

For questions or issues, please refer to the main project documentation or create an issue in the repository.