import { test, expect } from '@playwright/test';
import { 
  comprehensiveResponsiveTest,
  comprehensiveThemeTest,
  comprehensiveInteractiveTest
} from './utils';

test.describe('Admin Panel Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin panel
    await page.goto('http://localhost:5173/admin');
    await page.waitForLoadState('networkidle');
  });

  test('Admin Panel - Responsive Design', async ({ page }, testInfo) => {
    await comprehensiveResponsiveTest(page, testInfo, 'http://localhost:5173/admin', {
      componentSelector: '.admin-panel, [data-testid="admin-panel"]',
      mobileMenuSelector: '[data-testid="admin-menu-toggle"], .admin-menu-toggle',
      sidebarSelector: '.admin-sidebar, [data-testid="admin-sidebar"]',
      hoverElements: [
        '.admin-card',
        '.config-section',
        '.action-button',
        '.nav-item'
      ]
    });
  });

  test('Admin Panel - Theme Variants', async ({ page }, testInfo) => {
    await comprehensiveThemeTest(page, testInfo, 'http://localhost:5173/admin', {
      themes: ['light', 'dark'],
      toggleSelector: '[data-testid="theme-toggle"], .theme-toggle',
      componentSelectors: [
        '.admin-panel',
        '.admin-header',
        '.admin-content',
        '.config-section',
        '.admin-form'
      ],
      testPersistence: true,
      testSystemTheme: true
    });
  });

  test('Admin Panel - Interactive Elements', async ({ page }, testInfo) => {
    await comprehensiveInteractiveTest(page, testInfo, 'http://localhost:5173/admin', {
      buttonSelectors: [
        '.save-button',
        '.reset-button',
        '.add-button',
        '.delete-button',
        '.edit-button'
      ],
      formFieldSelectors: [
        '.config-input',
        '.admin-input',
        '.config-select',
        '.config-textarea'
      ],
      dropdownSelectors: [
        '.config-dropdown',
        '.admin-dropdown',
        '.action-dropdown'
      ],
      modalTriggers: [
        {
          trigger: '.add-button, [data-testid="add-config"]',
          modal: '.config-modal, [data-testid="config-modal"]'
        },
        {
          trigger: '.delete-button, [data-testid="delete-confirm"]',
          modal: '.delete-modal, [data-testid="delete-modal"]'
        }
      ],
      customElements: [
        {
          selector: '.config-section',
          name: 'config-section',
          states: ['normal', 'hover', 'focus']
        },
        {
          selector: '.admin-card',
          name: 'admin-card',
          states: ['normal', 'hover', 'focus']
        }
      ]
    });
  });

  test('Admin Panel - Configuration Forms', async ({ page }, testInfo) => {
    // Test different configuration sections
    const configSections = [
      '.bot-config',
      '.llm-config',
      '.messenger-config',
      '.theme-config',
      '.security-config'
    ];

    for (const selector of configSections) {
      const sectionExists = await page.locator(selector).isVisible().catch(() => false);
      if (sectionExists) {
        const sectionName = selector.replace(/[^\w]/g, '-');
        
        // Test section in normal state
        await expect(page.locator(selector)).toHaveScreenshot(`admin-${sectionName}.png`, {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });

        // Test section with expanded state if applicable
        const expandButton = await page.locator(`${selector} .expand-button, ${selector} [data-testid="expand"]`).first();
        if (await expandButton.isVisible().catch(() => false)) {
          await expandButton.click();
          await page.waitForTimeout(500);
          
          await expect(page.locator(selector)).toHaveScreenshot(`admin-${sectionName}-expanded.png`, {
            threshold: 0.2,
            maxDiffPixelRatio: 0.2
          });
        }
      }
    }
  });

  test('Admin Panel - Agent Management', async ({ page }, testInfo) => {
    // Navigate to agent management section
    await page.goto('http://localhost:5173/admin/agents');
    await page.waitForLoadState('networkidle');

    // Test agent list
    const agentListExists = await page.locator('.agent-list, [data-testid="agent-list"]').isVisible().catch(() => false);
    if (agentListExists) {
      await expect(page.locator('.agent-list, [data-testid="agent-list"]')).toHaveScreenshot('admin-agent-list.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test agent cards
    const agentCards = await page.locator('.agent-card, [data-testid="agent-card"]').count();
    if (agentCards > 0) {
      // Test first few agent cards
      for (let i = 0; i < Math.min(3, agentCards); i++) {
        const cardSelector = `.agent-card:nth-child(${i + 1}), [data-testid="agent-card"]:nth-child(${i + 1})`;
        const cardExists = await page.locator(cardSelector).isVisible().catch(() => false);
        
        if (cardExists) {
          await expect(page.locator(cardSelector)).toHaveScreenshot(`admin-agent-card-${i + 1}.png`, {
            threshold: 0.2,
            maxDiffPixelRatio: 0.2
          });
        }
      }
    }
  });

  test('Admin Panel - MCP Server Management', async ({ page }, testInfo) => {
    // Navigate to MCP server management
    await page.goto('http://localhost:5173/admin/mcp');
    await page.waitForLoadState('networkidle');

    // Test MCP server list
    const mcpListExists = await page.locator('.mcp-server-list, [data-testid="mcp-server-list"]').isVisible().catch(() => false);
    if (mcpListExists) {
      await expect(page.locator('.mcp-server-list, [data-testid="mcp-server-list"]')).toHaveScreenshot('admin-mcp-server-list.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test MCP server cards
    const mcpCards = await page.locator('.mcp-server-card, [data-testid="mcp-server-card"]').count();
    if (mcpCards > 0) {
      for (let i = 0; i < Math.min(3, mcpCards); i++) {
        const cardSelector = `.mcp-server-card:nth-child(${i + 1}), [data-testid="mcp-server-card"]:nth-child(${i + 1})`;
        const cardExists = await page.locator(cardSelector).isVisible().catch(() => false);
        
        if (cardExists) {
          await expect(page.locator(cardSelector)).toHaveScreenshot(`admin-mcp-server-card-${i + 1}.png`, {
            threshold: 0.2,
            maxDiffPixelRatio: 0.2
          });
        }
      }
    }
  });

  test('Admin Panel - Persona Management', async ({ page }, testInfo) => {
    // Navigate to persona management
    await page.goto('http://localhost:5173/admin/personas');
    await page.waitForLoadState('networkidle');

    // Test persona list
    const personaListExists = await page.locator('.persona-list, [data-testid="persona-list"]').isVisible().catch(() => false);
    if (personaListExists) {
      await expect(page.locator('.persona-list, [data-testid="persona-list"]')).toHaveScreenshot('admin-persona-list.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test persona cards
    const personaCards = await page.locator('.persona-card, [data-testid="persona-card"]').count();
    if (personaCards > 0) {
      for (let i = 0; i < Math.min(3, personaCards); i++) {
        const cardSelector = `.persona-card:nth-child(${i + 1}), [data-testid="persona-card"]:nth-child(${i + 1})`;
        const cardExists = await page.locator(cardSelector).isVisible().catch(() => false);
        
        if (cardExists) {
          await expect(page.locator(cardSelector)).toHaveScreenshot(`admin-persona-card-${i + 1}.png`, {
            threshold: 0.2,
            maxDiffPixelRatio: 0.2
          });
        }
      }
    }
  });

  test('Admin Panel - Form Validation States', async ({ page }, testInfo) => {
    // Find a form to test validation
    const formSelector = '.admin-form, [data-testid="admin-form"], .config-form';
    const formExists = await page.locator(formSelector).isVisible().catch(() => false);
    
    if (formExists) {
      // Test normal state
      await expect(page.locator(formSelector)).toHaveScreenshot('admin-form-normal.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });

      // Test validation error states
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.classList.add('error', 'invalid');
          input.setAttribute('aria-invalid', 'true');
        });
      });

      await page.waitForTimeout(500);

      await expect(page.locator(formSelector)).toHaveScreenshot('admin-form-validation-errors.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });

      // Clean up validation states
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.classList.remove('error', 'invalid');
          input.removeAttribute('aria-invalid');
        });
      });
    }
  });

  test('Admin Panel - Loading and Saving States', async ({ page }, testInfo) => {
    // Test loading state
    await page.evaluate(() => {
      document.body.classList.add('loading');
      const buttons = document.querySelectorAll('.save-button, .load-button, .action-button');
      buttons.forEach(button => button.classList.add('loading'));
    });

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('admin-loading-state.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Test saving state
    await page.evaluate(() => {
      document.body.classList.remove('loading');
      const buttons = document.querySelectorAll('.save-button, .load-button, .action-button');
      buttons.forEach(button => {
        button.classList.remove('loading');
        button.classList.add('saving');
      });
    });

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('admin-saving-state.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Clean up states
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('.save-button, .load-button, .action-button');
      buttons.forEach(button => {
        button.classList.remove('loading', 'saving');
      });
    });
  });

  test('Admin Panel - Success and Error Messages', async ({ page }, testInfo) => {
    // Test success message
    await page.evaluate(() => {
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message toast notification';
      successMessage.textContent = 'Configuration saved successfully!';
      successMessage.setAttribute('data-testid', 'success-message');
      document.body.appendChild(successMessage);
    });

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('admin-success-message.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Remove success message
    await page.evaluate(() => {
      const successMessage = document.querySelector('[data-testid="success-message"]');
      if (successMessage) successMessage.remove();
    });

    // Test error message
    await page.evaluate(() => {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message toast notification';
      errorMessage.textContent = 'Failed to save configuration. Please try again.';
      errorMessage.setAttribute('data-testid', 'error-message');
      document.body.appendChild(errorMessage);
    });

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('admin-error-message.png', {
      threshold: 0.2,
      maxDiffPixelRatio: 0.2
    });

    // Remove error message
    await page.evaluate(() => {
      const errorMessage = document.querySelector('[data-testid="error-message"]');
      if (errorMessage) errorMessage.remove();
    });
  });

  test('Admin Panel - Navigation and Breadcrumbs', async ({ page }, testInfo) => {
    // Test admin navigation
    const adminNavExists = await page.locator('.admin-navigation, [data-testid="admin-navigation"]').isVisible().catch(() => false);
    if (adminNavExists) {
      await expect(page.locator('.admin-navigation, [data-testid="admin-navigation"]')).toHaveScreenshot('admin-navigation.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }

    // Test breadcrumbs
    const breadcrumbsExist = await page.locator('.breadcrumbs, [data-testid="breadcrumbs"]').isVisible().catch(() => false);
    if (breadcrumbsExist) {
      await expect(page.locator('.breadcrumbs, [data-testid="breadcrumbs"]')).toHaveScreenshot('admin-breadcrumbs.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });
    }
  });

  test('Admin Panel - Data Tables', async ({ page }, testInfo) => {
    // Look for data tables in admin panel
    const dataTables = await page.locator('.data-table, .admin-table, [data-testid="data-table"]').count();
    
    if (dataTables > 0) {
      // Test first data table
      const firstTable = page.locator('.data-table, .admin-table, [data-testid="data-table"]').first();
      await expect(firstTable).toHaveScreenshot('admin-data-table.png', {
        threshold: 0.2,
        maxDiffPixelRatio: 0.2
      });

      // Test table sorting (if sortable headers exist)
      const sortableHeaders = await firstTable.locator('.sortable-header, [data-sortable]').count();
      if (sortableHeaders > 0) {
        const firstHeader = firstTable.locator('.sortable-header, [data-sortable]').first();
        await firstHeader.click();
        await page.waitForTimeout(500);
        
        await expect(firstTable).toHaveScreenshot('admin-data-table-sorted.png', {
          threshold: 0.2,
          maxDiffPixelRatio: 0.2
        });
      }
    }
  });
});