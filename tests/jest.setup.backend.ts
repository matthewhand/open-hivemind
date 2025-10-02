// Backend test setup - Node.js environment
// Only spin up the full Express server for tests that explicitly require backend integration.
// Heuristic: if TEST_BACKEND env var is set, or test filename contains ".integration".

let server: any;

// Mock vite to prevent ES module issues
jest.mock('vite', () => ({
  createServer: jest.fn(),
  build: jest.fn(),
  resolveConfig: jest.fn(),
  preview: jest.fn(),
  transformWithEsbuild: jest.fn(),
  loadEnv: jest.fn(),
  normalizePath: jest.fn(),
  searchForWorkspaceRoot: jest.fn()
}));

// Mock RealTimeValidationService to prevent setInterval during test setup
jest.mock('../src/server/services/RealTimeValidationService', () => ({
  RealTimeValidationService: {
    getInstance: jest.fn().mockReturnValue({
      cleanup: jest.fn(),
      validateConfiguration: jest.fn(),
      validateConfigurationData: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getValidationHistory: jest.fn(),
      getValidationStatistics: jest.fn(),
      addRule: jest.fn(),
      removeRule: jest.fn(),
      getRule: jest.fn(),
      getAllRules: jest.fn(),
      addProfile: jest.fn(),
      removeProfile: jest.fn(),
      getProfile: jest.fn(),
      getAllProfiles: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    }),
  },
}));

if (process.env.TEST_BACKEND) {
  // Enable localhost admin bypass for tests
  process.env.ALLOW_LOCALHOST_ADMIN = 'true';
  
  // Lazy import to avoid pulling heavy dependencies for pure frontend tests
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const app = require('../src/index').default;
  beforeAll((done) => {
    // Use a dynamic port to avoid conflicts
    const port = 0; // Let the system assign an available port
    server = app.listen(port, () => {
      // Get the actual assigned port
      const actualPort = server.address().port;
      console.log(`Test server running on port ${actualPort}`);
      done();
    });
  });

  afterAll((done) => {
    // Cleanup RealTimeValidationService to prevent open handles
    try {
      const { RealTimeValidationService } = require('../src/server/services/RealTimeValidationService');
      const service = RealTimeValidationService.getInstance();
      service.cleanup();
    } catch (error) {
      // Ignore cleanup errors
      console.log('Error during RealTimeValidationService cleanup:', error);
    }
    
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });
}