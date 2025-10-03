import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Tearing down visual regression testing environment...');
  
  // Clean up any temporary files or processes
  try {
    // Example: Stop a mock server if you started one
    // execSync('npm run stop-mock-server');
  } catch (error) {
    console.error('Error during teardown:', error);
  }
  
  console.log('✅ Visual regression testing environment torn down');
}

export default globalTeardown;