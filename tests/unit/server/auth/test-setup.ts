/**
 * Test Setup for Authentication Tests
 *
 * This file provides test utilities and setup for authentication-related tests,
 * particularly for the localhost admin bypass functionality.
 */

import { Express } from 'express';
import request from 'supertest';
import { app } from '../../../../src/server';

// Mock console methods to reduce noise during tests
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up environment variables before and after each test
beforeEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;
});

// Helper function to make authenticated requests
export const makeAuthenticatedRequest = (token: string) => {
  return request(app).set('Authorization', `Bearer ${token}`);
};

// Helper function to simulate localhost requests
export const makeLocalhostRequest = () => {
  return request(app).set('X-Forwarded-For', '127.0.0.1');
};

// Helper function to simulate IPv6 localhost requests
export const makeIPv6LocalhostRequest = () => {
  return request(app).set('X-Forwarded-For', '::1');
};

// Helper function to simulate external IP requests
export const makeExternalRequest = (ip: string = '192.168.1.100') => {
  return request(app).set('X-Forwarded-For', ip);
};

// Test data factory
export const createTestLoginCredentials = (overrides = {}) => ({
  username: 'admin',
  password: 'test-password',
  ...overrides
});

export const createTestUser = (overrides = {}) => ({
  username: 'testuser',
  email: 'test@example.com',
  password: 'test-password',
  role: 'user',
  ...overrides
});

// Common test expectations
export const expectSuccessfulAuth = (response: any) => {
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toHaveProperty('user');
  expect(response.body.data).toHaveProperty('accessToken');
  expect(response.body.data).toHaveProperty('refreshToken');
};

export const expectFailedAuth = (response: any, expectedError = 'Authentication failed') => {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toContain(expectedError);
};

export const expectBypassInfo = (response: any, isLocalBypass: boolean, adminPasswordSet?: boolean) => {
  if (isLocalBypass) {
    expect(response.body.bypassInfo).toBeDefined();
    expect(response.body.bypassInfo.isLocalBypass).toBe(true);
    if (adminPasswordSet !== undefined) {
      expect(response.body.bypassInfo.adminPasswordSet).toBe(adminPasswordSet);
    }
  } else {
    expect(response.body.bypassInfo).toBeUndefined();
  }
};

// Export the app for testing
export { app };

// Export Jest utilities
export const testWithTimeout = (timeout: number = 10000) => {
  jest.setTimeout(timeout);
};