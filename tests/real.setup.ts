/**
 * Setup for real integration tests - no mocking, real API calls
 */

// Enable console output for real tests
process.env.ALLOW_CONSOLE = 'true';

// Set test timeout for real API calls
jest.setTimeout(30000);
