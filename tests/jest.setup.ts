import 'reflect-metadata';
import { Server } from 'http';
import express from 'express';
import { RealTimeValidationService } from '../src/server/services/RealTimeValidationService';
import { WebSocketService } from '../src/server/services/WebSocketService';

// Set default timeout for all tests
jest.setTimeout(60000);

let server: Server;

beforeAll((done) => {
  // Mock services without starting server
  try {
    const wsService = WebSocketService.getInstance();
    wsService.initialize = jest.fn();

    const originalSetupEventHandlers = RealTimeValidationService.prototype.setupEventHandlers;
    RealTimeValidationService.prototype.setupEventHandlers = jest.fn();

    const validationService = RealTimeValidationService.getInstance();
    RealTimeValidationService.prototype.setupEventHandlers = originalSetupEventHandlers;

    console.log('Test environment initialized');
    done();
  } catch (error) {
    console.log('Services not available, proceeding with basic setup');
    done();
  }
});

afterAll((done) => {
  if (server) {
    server.close(() => {
      console.log('Test server closed');
      done();
    });
  } else {
    console.log('Test environment cleaned up');
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
