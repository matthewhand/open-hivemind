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
if (typeof window !== 'undefined' && !window.HTMLDialogElement) {
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

// Mock HTMLDialogElement methods if prototype exists
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.show) HTMLDialogElement.prototype.show = jest.fn();
  if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = jest.fn();
  if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = jest.fn();
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
