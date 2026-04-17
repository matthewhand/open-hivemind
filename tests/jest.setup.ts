import '@testing-library/jest-dom';
import 'reflect-metadata';
import { Server } from 'http';
import express from 'express';

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

process.env.SESSION_SECRET = 'testsecretlongenoughstringtoavoidwarning32chars';
process.env.NODE_CONFIG_DIR = 'config/test/';

// Env-Var Isolation & Interceptor
const PROTECTED_PREFIXES = ['OPENAI_', 'SLACK_', 'DISCORD_', 'MATTERMOST_', 'DATABASE_'];
const originalEnv = process.env;

beforeEach(() => {
  const envSnapshot = { ...originalEnv };
  const mockedInTest = new Set<string>();

  // Use a proxy to intercept access to "secret" variables
  // @ts-ignore - process.env type is strict
  process.env = new Proxy(envSnapshot, {
    get(target, prop) {
      if (typeof prop === 'string') {
        const isProtected = PROTECTED_PREFIXES.some((prefix) => prop.startsWith(prefix));
        if (isProtected && !mockedInTest.has(prop) && target[prop]) {
          console.error(
            `\x1b[31m[SECURITY WARNING]\x1b[0m Accessing protected env var "${prop}" without explicit mock in test.`
          );
          return undefined; // Block access to real secret
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
});

afterEach(() => {
  process.env = originalEnv;
});

// Set default timeout for all tests
jest.setTimeout(60000);

let server: Server;

beforeAll((done) => {
  done();
});

afterAll((done) => {
  if (server) {
    server.close(() => done());
  } else {
    done();
  }
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

