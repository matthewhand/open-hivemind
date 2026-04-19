import '@testing-library/jest-dom';
import 'reflect-metadata';
import { Server } from 'http';

const _polyfillUtil = require('util');
if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = _polyfillUtil.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = _polyfillUtil.TextDecoder;
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof HTMLCanvasElement !== 'undefined') {
  const _origCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (id: string, ...a: any[]) {
    if (id === '2d')
      return { measureText: () => ({ width: 0 }), fillText: () => {}, font: '' } as any;
    return _origCtx?.call(this, id, ...a) ?? null;
  } as any;
}

// Env-Var Isolation & Interceptor
const PROTECTED_PREFIXES = ['OPENAI_', 'SLACK_', 'DISCORD_', 'MATTERMOST_', 'DATABASE_'];
const originalEnv = { ...process.env };
const mockedInTest = new Set<string>();

// Use a proxy to intercept access to "secret" variables
// @ts-ignore - process.env type is strict
process.env = new Proxy(process.env, {
  get(target, prop) {
    if (typeof prop === 'string') {
      const isProtected = PROTECTED_PREFIXES.some((prefix) => prop.startsWith(prefix));
      if (isProtected && !mockedInTest.has(prop) && target[prop]) {
        // If it's the real value (from start), block it unless ALLOW_REAL_SECRETS is true.
        if (target[prop] === originalEnv[prop]) {
          if (process.env.ALLOW_REAL_SECRETS === 'true') {
            return target[prop];
          }
           console.error(
            `\x1b[31m[SECURITY WARNING]\x1b[0m Accessing protected env var "${prop}" without explicit mock in test. Set ALLOW_REAL_SECRETS=true to allow this.`
          );
          return undefined; // Block access to real secret
        }
      }
    }
    return target[prop];
  },
  set(target, prop, value) {
    if (typeof prop === 'string') {
      mockedInTest.add(prop);
    }
    target[prop] = value as string;
    return true;
  },
  deleteProperty(target, prop) {
    if (typeof prop === 'string') {
      mockedInTest.delete(prop);
    }
    delete target[prop];
    return true;
  },
  ownKeys(target) {
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
});

beforeEach(() => {
  // Clear mocked set for each test? No, that would break beforeAll.
  // We'll trust suites to manage their own mocks.
});

afterEach(() => {
  // We don't reset process.env to originalEnv here because it's a Proxy now.
});

process.env.SESSION_SECRET = 'testsecretlongenoughstringtoavoidwarning32chars';
process.env.NODE_CONFIG_DIR = 'config/test/';
process.env.ALLOW_LOCAL_NETWORK_ACCESS = 'true';

// Global mock for better-sqlite3
jest.mock('better-sqlite3', () => {
  const mockSqlite = jest.requireActual('./mocks/sqlite');
  return mockSqlite.default || mockSqlite;
}, { virtual: true });

// Set default timeout for all tests
jest.setTimeout(60000);

let server: Server;

afterAll((done) => {
  if (server) {
    server.close(() => done());
  } else {
    done();
  }
});

const allow = !!process.env.ALLOW_CONSOLE;

if (!allow) {
  const noop = () => {};
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

// Global Service Cleanup Hooks
afterEach(async () => {
  try {
    const { MessageBus } = require('../src/events/MessageBus');
    MessageBus.getInstance().reset();
  } catch (err) {}

  try {
    const { GlobalActivityTracker } = require('../src/message/helpers/processing/GlobalActivityTracker');
    GlobalActivityTracker.getInstance().reset();
  } catch (err) {}

  try {
    const { IncomingMessageDensity } = require('../src/message/helpers/processing/IncomingMessageDensity');
    IncomingMessageDensity.getInstance().clear();
  } catch (err) {}

  try {
    const { clearBotActivity } = require('../src/message/helpers/processing/ChannelActivity');
    clearBotActivity();
  } catch (err) {}

  try {
    const { SwarmCoordinator } = require('../src/services/SwarmCoordinator');
    SwarmCoordinator.getInstance().clearCache();
    SwarmCoordinator.resetInstance();
  } catch (err) {}
});

/**
 * Helper to mock crypto.randomBytes and Math.random for consistent test results
 * @param value Number between 0 and 1
 */
(global as any).mockRandom = (value: number) => {
  const crypto = require('crypto');
  const uint32 = Math.floor(value * 0x100000000);
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(uint32);
  jest.spyOn(crypto, 'randomBytes').mockReturnValue(buffer);
  jest.spyOn(Math, 'random').mockReturnValue(value);
};
