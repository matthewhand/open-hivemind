/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom'; // Generic import works for both
import { configure } from '@testing-library/react';
import { vi, beforeAll, beforeEach } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Setup global mocks
const setupMocks = () => {
  if (typeof window !== 'undefined') {
    // Define mocks that toggle open attribute to simulate visibility
    const mockShow = vi.fn(function(this: HTMLElement) {
      this.setAttribute('open', '');
    });
    const mockShowModal = vi.fn(function(this: HTMLElement) {
      this.setAttribute('open', '');
    });
    const mockClose = vi.fn(function(this: HTMLElement) {
      this.removeAttribute('open');
    });

    // Unconditionally patch HTMLElement prototype to ensure these methods exist on all elements.
    // This is necessary because JSDOM might return HTMLUnknownElement for <dialog> tags,
    // or the environment might reset prototypes.
    Object.defineProperty(HTMLElement.prototype, 'show', { writable: true, configurable: true, value: mockShow });
    Object.defineProperty(HTMLElement.prototype, 'showModal', { writable: true, configurable: true, value: mockShowModal });
    Object.defineProperty(HTMLElement.prototype, 'close', { writable: true, configurable: true, value: mockClose });

    // Also patch Element.prototype just in case
    Object.defineProperty(Element.prototype, 'show', { writable: true, configurable: true, value: mockShow });
    Object.defineProperty(Element.prototype, 'showModal', { writable: true, configurable: true, value: mockShowModal });
    Object.defineProperty(Element.prototype, 'close', { writable: true, configurable: true, value: mockClose });

    // If HTMLDialogElement exists, patch it specifically
    if (window.HTMLDialogElement) {
      Object.defineProperty(window.HTMLDialogElement.prototype, 'show', { writable: true, configurable: true, value: mockShow });
      Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { writable: true, configurable: true, value: mockShowModal });
      Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { writable: true, configurable: true, value: mockClose });
    } else {
      // Polyfill the class if missing (JSDOM < 24)
      class MockHTMLDialogElement extends HTMLElement {
        open = false;
        returnValue = '';
        show = mockShow;
        showModal = mockShowModal;
        close = mockClose;
      }
      (window as any).HTMLDialogElement = MockHTMLDialogElement;
    }
  }
};

beforeAll(setupMocks);
beforeEach(setupMocks); // Re-apply before each test to ensure persistence

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
