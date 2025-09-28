import { Server } from 'http';
import app from '../src/index';

let server: Server;

beforeAll((done) => {
  const port = 3028;
  server = app.listen(port, () => {
    console.log(`Test server running on port ${port}`);
    done();
  });
});

afterAll((done) => {
  server.close(() => {
    console.log('Test server closed');
    done();
  });
});

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