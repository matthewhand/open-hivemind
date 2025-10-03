import '@testing-library/jest-dom';
import { server } from './client/src/mocks/server';
import { setupMockWebSocket } from './client/src/mocks/websocketMock';

// Setup MSW server for all tests
beforeAll(() => {
  // Start the MSW server
  server.listen({
    onUnhandledRequest: 'warn'
  });

  // Setup mock WebSocket
  setupMockWebSocket();
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  
  // Reset all WebSocket instances
  const { MockWebSocket } = require('./client/src/mocks/websocketMock');
  MockWebSocket.instances.forEach((instance: any) => {
    instance.simulateDisconnect();
  });
  MockWebSocket.instances.length = 0;
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch for tests that don't use MSW
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || '',
  text: jest.fn().mockResolvedValue('mock-text'),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  stream: jest.fn().mockReturnValue(new ReadableStream()),
  slice: jest.fn().mockReturnValue(new Blob()),
}));

// Mock File
global.File = jest.fn().mockImplementation((content, name, options) => ({
  content,
  name,
  options,
  size: content ? content.length : 0,
  type: options?.type || '',
  lastModified: Date.now(),
  text: jest.fn().mockResolvedValue('mock-text'),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  stream: jest.fn().mockReturnValue(new ReadableStream()),
  slice: jest.fn().mockReturnValue(new File([], 'slice', {})),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(1)),
  },
});

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    now: jest.fn(() => Date.now()),
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock setTimeout and clearTimeout for consistent testing
global.setTimeout = jest.fn((fn, delay) => {
  return setTimeout(fn, delay);
});
global.clearTimeout = jest.fn((id) => {
  return clearTimeout(id);
});

// Mock setInterval and clearInterval
global.setInterval = jest.fn((fn, delay) => {
  return setInterval(fn, delay);
});
global.clearInterval = jest.fn((id) => {
  return clearInterval(id);
});

// Mock process.env for consistent testing
process.env = {
  ...process.env,
  NODE_ENV: 'test',
};

// Add custom matchers for better testing assertions
expect.extend({
  toBeInErrorState(received: any) {
    const pass = received && received.state && received.state.hasError === true;
    return {
      message: () =>
        pass
          ? `expected component not to be in error state`
          : `expected component to be in error state`,
      pass,
    };
  },

  toHaveErrorMessage(received: any, expectedMessage: string) {
    const actualMessage = received?.state?.error?.message;
    const pass = actualMessage && actualMessage.includes(expectedMessage);
    return {
      message: () =>
        pass
          ? `expected error message not to contain "${expectedMessage}"`
          : `expected error message to contain "${expectedMessage}" but got "${actualMessage}"`,
      pass,
    };
  },

  toBeConnected(received: any) {
    const pass = received && received.readyState === WebSocket.OPEN;
    return {
      message: () =>
        pass
          ? `expected WebSocket not to be connected`
          : `expected WebSocket to be connected`,
      pass,
    };
  },

  toHaveReceivedEvent(received: any, eventType: string) {
    const events = received?.getEventLog?.() || [];
    const pass = events.some((event: any) => event.type === eventType);
    return {
      message: () =>
        pass
          ? `expected WebSocket not to have received "${eventType}" event`
          : `expected WebSocket to have received "${eventType}" event`,
      pass,
    };
  },
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInErrorState(): R;
      toHaveErrorMessage(expectedMessage: string): R;
      toBeConnected(): R;
      toHaveReceivedEvent(eventType: string): R;
    }
  }
}