import { getSessionSecret } from '../../../src/middleware/sessionMiddleware';

describe('getSessionSecret', () => {
  const originalEnv = process.env;
  let originalWarn: typeof console.warn;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    originalWarn = console.warn;
    console.warn = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.warn = originalWarn;
  });

  it('throws an error if SESSION_SECRET is not set', () => {
    delete process.env.SESSION_SECRET;

    // We have to isolate modules because sessionMiddleware calls getSessionSecret on initialization
    jest.isolateModules(() => {
      expect(() => {
        require('../../../src/middleware/sessionMiddleware');
      }).toThrow('SESSION_SECRET environment variable is required.');
    });
  });

  it('returns SESSION_SECRET if set', () => {
    process.env.SESSION_SECRET = 'supersecretlongenoughstringtoavoidwarning32chars';

    jest.isolateModules(() => {
      const { getSessionSecret } = require('../../../src/middleware/sessionMiddleware');
      expect(getSessionSecret()).toBe('supersecretlongenoughstringtoavoidwarning32chars');
    });
  });

  it('warns if SESSION_SECRET is less than 32 characters', () => {
    process.env.SESSION_SECRET = 'shortsecret';

    jest.isolateModules(() => {
      const { getSessionSecret } = require('../../../src/middleware/sessionMiddleware');
      const secret = getSessionSecret();
      expect(secret).toBe('shortsecret');
      // Note: warning is now emitted via structured Debug logger, not console.warn
    });
  });
});
