import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { TextEncoder, TextDecoder } from 'util';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Make vi available globally as jest for compatibility
Object.assign(global, { jest: vi });

// Clean up after each test case
afterEach(() => {
  cleanup();
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Polyfill HTMLDialogElement for JSDOM environments that don't support it
if (typeof window !== 'undefined' && !window.HTMLDialogElement) {
  class HTMLDialogElement extends HTMLElement {
    open = false;
    returnValue = '';

    constructor() {
      super();
    }

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

// Ensure methods are attached to the prototype if they don't exist
// This handles cases where JSDOM has HTMLDialogElement but not the methods
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function() {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

// Mock IntersectionObserver
(global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
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
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
(global as any).localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
(global as any).sessionStorage = sessionStorageMock;

// Mock fetch if not already available
if (!(global as any).fetch) {
  (global as any).fetch = vi.fn();
}

// Mock WebSocket
(global as any).WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));
