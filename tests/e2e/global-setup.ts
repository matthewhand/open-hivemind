import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS } from './fixtures/auth-fixtures';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Playwright tests');
  
  // Create screenshots directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  
  const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  // Verify test environment
  const baseURL = config.webServer?.url || 'http://localhost:3028';
  console.log(`📡 Test base URL: ${baseURL}`);
  
  // Wait for server to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if the server is responding
    console.log('🔍 Checking server availability...');
    const response = await page.goto(baseURL, { timeout: 30000 });
    
    if (response && response.status() < 400) {
      console.log('✅ Server is ready for testing');
    } else {
      console.warn('⚠️ Server might not be fully ready');
    }
  } catch (error) {
    console.error('❌ Server is not available:', error);
    throw new Error('Server is not available for testing');
  } finally {
    await browser.close();
  }
  
  // Log test configuration
  console.log('🔧 Test Configuration:');
  console.log(`   - Test Environment: ${process.env.NODE_ENV || 'test'}`);
  console.log(`   - Base URL: ${baseURL}`);
  console.log(`   - Admin User: ${TEST_USERS.admin.username}`);
  console.log(`   - Test User: ${TEST_USERS.user.username}`);
  console.log(`   - CI Mode: ${!!process.env.CI}`);
  
  console.log('✅ Global setup completed');
}

export default globalSetup;