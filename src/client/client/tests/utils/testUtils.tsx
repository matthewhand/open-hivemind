import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

// Mock providers for testing
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Helper function to create mock functions with proper typing
export const createMockFunction = <T extends (...args: any[]) => any>() => {
  return jest.fn<T>() as jest.MockedFunction<T>;
};

// Helper function to wait for async operations
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create mock event
export const createMockEvent = (type: string, properties: any = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  return event;
};

// Helper function to mock fetch responses
export const mockFetchResponse = (data: any, ok: boolean = true, status: number = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
};

// Helper function to mock fetch errors
export const mockFetchError = (message: string = 'Network error') => {
  return Promise.reject(new Error(message));
};

// Helper function to create mock user
export const createMockUser = (overrides: any = {}) => {
  return {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    permissions: ['read'],
    ...overrides,
  };
};

// Helper function to create mock auth tokens
export const createMockTokens = (overrides: any = {}) => {
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    ...overrides,
  };
};

// Helper function to create mock file
export const createMockFile = (name: string, content: string, type: string = 'text/plain') => {
  return new File([content], name, { type });
};

// Helper function to mock localStorage
export const createMockLocalStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
};

// Helper function to mock sessionStorage
export const createMockSessionStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
  };
};

// Helper function to mock IntersectionObserver
export const createMockIntersectionObserver = () => {
  const observers = new Set<{
    callback: IntersectionObserverCallback;
    elements: Element[];
  }>();

  return {
    observe: jest.fn((element: Element) => {
      // Simulate intersection
      setTimeout(() => {
        observers.forEach(observer => {
          observer.callback([{
            isIntersecting: true,
            target: element,
            intersectionRatio: 1,
            boundingClientRect: element.getBoundingClientRect(),
            intersectionRect: element.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now(),
          }], new IntersectionObserver(observer.callback));
        });
      }, 100);
    }),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  };
};

// Helper function to mock ResizeObserver
export const createMockResizeObserver = () => {
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
};

// Helper function to mock MutationObserver
export const createMockMutationObserver = () => {
  return {
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => []),
  };
};

// Helper function to mock URL.createObjectURL and revokeObjectURL
export const createMockURL = () => {
  const urls = new Set<string>();
  
  return {
    createObjectURL: jest.fn((object: any) => {
      const url = `mock-url-${urls.size}`;
      urls.add(url);
      return url;
    }),
    revokeObjectURL: jest.fn((url: string) => {
      urls.delete(url);
    }),
  };
};

// Helper function to mock window.matchMedia
export const createMockMatchMedia = (matches: boolean = false) => {
  return {
    matches,
    media: '',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};

// Helper function to mock window.scrollTo
export const createMockScrollTo = () => {
  return jest.fn();
};

// Helper function to mock window.alert
export const createMockAlert = () => {
  return jest.fn();
};

// Helper function to mock window.confirm
export const createMockConfirm = (returns: boolean = true) => {
  return jest.fn(() => returns);
};

// Helper function to mock window.prompt
export const createMockPrompt = (returns: string = '') => {
  return jest.fn(() => returns);
};

// Helper function to setup common mocks
export const setupCommonMocks = () => {
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: createMockLocalStorage(),
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: createMockSessionStorage(),
    writable: true,
  });

  // Mock IntersectionObserver
  Object.defineProperty(window, 'IntersectionObserver', {
    value: createMockIntersectionObserver(),
    writable: true,
  });

  // Mock ResizeObserver
  Object.defineProperty(window, 'ResizeObserver', {
    value: createMockResizeObserver(),
    writable: true,
  });

  // Mock MutationObserver
  Object.defineProperty(window, 'MutationObserver', {
    value: createMockMutationObserver(),
    writable: true,
  });

  // Mock URL
  Object.defineProperty(window, 'URL', {
    value: {
      ...window.URL,
      ...createMockURL(),
    },
    writable: true,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: createMockMatchMedia(),
    writable: true,
  });

  // Mock scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: createMockScrollTo(),
    writable: true,
  });

  // Mock alert
  Object.defineProperty(window, 'alert', {
    value: createMockAlert(),
    writable: true,
  });

  // Mock confirm
  Object.defineProperty(window, 'confirm', {
    value: createMockConfirm(),
    writable: true,
  });

  // Mock prompt
  Object.defineProperty(window, 'prompt', {
    value: createMockPrompt(),
    writable: true,
  });
};

// Helper function to cleanup common mocks
export const cleanupCommonMocks = () => {
  jest.restoreAllMocks();
};