import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up visual regression testing environment...');
  
  // Ensure browsers are installed
  const browser = await chromium.launch();
  await browser.close();
  
  // Create screenshot directories if they don't exist
  const fs = require('fs');
  const path = require('path');
  
  const screenshotDirs = [
    'tests/visual/screenshots/baseline',
    'tests/visual/screenshots/current',
    'tests/visual/screenshots/diff',
  ];
  
  screenshotDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${fullPath}`);
    }
  });
  
  console.log('✅ Visual regression testing environment ready');
}

export default globalSetup;