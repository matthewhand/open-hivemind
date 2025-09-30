import '@testing-library/jest-dom';
// Only spin up the full Express server for tests that explicitly require backend integration.
// Heuristic: if TEST_BACKEND env var is set, or test filename contains ".integration".
// Jest doesn't expose current test filename here, so we rely on env.
import { Server } from 'http';
let server: Server | undefined;
if (process.env.TEST_BACKEND) {
  // Lazy import to avoid pulling heavy dependencies for pure frontend tests
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const app = require('../src/index').default;
  beforeAll((done) => {
    const port = 3028;
    server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(() => {
        console.log('Test server closed');
        done();
      });
    } else {
      done();
    }
  });
}

// Mock OpenAI to prevent fetch shim requirements in component tests
jest.mock('openai', () => {
  return {
    OpenAI: class MockOpenAI {
      chat = { completions: { create: async () => ({ choices: [{ message: { content: 'mock' } }] }) } };
    }
  };
});

// Polyfill TextEncoder/TextDecoder for react-router / whatwg-encoding usage in jsdom
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  // @ts-ignore
  global.TextEncoder = TextEncoder;
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}

/**
 * Jest setup file to optionally silence console output during tests.
 *
 * Behavior:
 * - If process.env.ALLOW_CONSOLE is truthy, no stubbing is applied.
 * - Otherwise, console methods are stubbed to no-ops to keep test output quiet.
 *
 * You can enable console logs temporarily by running:
 *   ALLOW_CONSOLE=1 npm test
 *   ALLOW_CONSOLE=1 make test
 */

const allow = !!process.env.ALLOW_CONSOLE;

if (!allow) {
  // Preserve original methods in case a suite wants to restore them.
  const noop = () => {};
  // Commonly used console methods in the repo
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  global.console = {
    ...console,
    log: noop,
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    trace: noop,
  };
}