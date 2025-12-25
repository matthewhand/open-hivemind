import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

// Custom render function that includes basic providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export * from '@testing-library/user-event';

// Override render method
export { customRender as render };

// Test utilities
export const createMockFunction = <T extends (...args: unknown[]) => unknown>(
  implementation?: T,
): jest.MockedFunction<T> => {
  return jest.fn(implementation) as any;
};

export const createMockObject = <T extends Record<string, unknown>>(
  overrides: Partial<T> = {},
): jest.Mocked<T> => {
  return overrides as jest.Mocked<T>;
};

// Mock API response helper
export const mockApiResponse = <T,>(data: T, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  status: ok ? 200 : 500,
});

// Mock WebSocket helper
export const createMockWebSocket = () => {
  const mockWS = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  return mockWS;
};

// Wait for component to finish async operations
export const waitForAsync = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Mock localStorage/sessionStorage helpers
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
};

export const mockSessionStorage = () => mockLocalStorage();

// Common test data
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
};

export const mockBot = {
  id: '1',
  name: 'Test Bot',
  status: 'active',
  config: {},
};

export const mockConfig = {
  bots: [mockBot],
  providers: {
    discord: { enabled: true },
    openai: { enabled: true },
  },
};