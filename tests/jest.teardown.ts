/**
 * Global teardown file for Jest tests
 * This ensures all resources are properly cleaned up after tests complete
 */

module.exports = async () => {
  // Give a moment for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Force close any remaining HTTP servers
  if (global && typeof global.close === 'function') {
    try {
      await global.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  
  // Force exit the process if Jest doesn't exit cleanly
  setTimeout(() => {
    process.exit(0);
  }, 2000);
};