/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom'; // Generic import works for both
import { configure } from '@testing-library/react';
// vi is specific to Vitest, use jest global which works in both (Vitest aliases jest to vi)
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Polyfill HTMLDialogElement for JSDOM environments that don't support it
if (typeof window !== 'undefined') {
  if (!window.HTMLDialogElement) {
    class HTMLDialogElement extends HTMLElement {
      open = false;
      returnValue = '';

      show() {
        this.open = true;
        this.setAttribute('open', '');
      }

      showModal() {
        this.open = true;
        this.setAttribute('open', '');
      }

      close() {
        this.open = false;
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      }
    }
    (window as any).HTMLDialogElement = HTMLDialogElement;
  }

  // Ensure methods are mocked even if prototype exists (some JSDOM versions have it but not implemented)
  if (window.HTMLDialogElement) {
    // Use a robust mock function that works in both Jest and Vitest
    const mockFn = (typeof jest !== 'undefined' && jest.fn) ? jest.fn :
                   (typeof vi !== 'undefined' && vi.fn) ? vi.fn :
                   () => {};

    // Unconditionally mock these methods to ensure consistency in tests
    window.HTMLDialogElement.prototype.show = mockFn();
    window.HTMLDialogElement.prototype.showModal = mockFn();
    window.HTMLDialogElement.prototype.close = mockFn();
  }
}

// Mock IntersectionObserver
(global as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
(global as any).localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
(global as any).sessionStorage = sessionStorageMock;

// Mock fetch if not already available
if (!(global as any).fetch) {
  (global as any).fetch = jest.fn();
}

// Mock WebSocket
(global as any).WebSocket = jest.fn().mockImplementation(() => ({
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
}));
