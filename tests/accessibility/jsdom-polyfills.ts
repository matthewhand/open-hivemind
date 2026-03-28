/**
 * Polyfills for jsdom test environment.
 *
 * TextEncoder/TextDecoder: required by react-router-dom v7.
 * HTMLElement.scrollIntoView: used by CommandPalette, not implemented in jsdom.
 * HTMLCanvasElement.getContext: used by axe-core color-contrast checks.
 */
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const util = require('util');

if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = util.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = util.TextDecoder;
}

// scrollIntoView is not implemented in jsdom
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {
    // no-op in test environment
  };
}

// HTMLCanvasElement.getContext is not implemented in jsdom; axe-core uses
// it for icon-ligature detection in color-contrast checks. Return a minimal
// mock so axe-core doesn't throw.
if (typeof HTMLCanvasElement !== 'undefined') {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: any[]) {
    if (contextId === '2d') {
      return {
        measureText: () => ({ width: 0 }),
        fillText: () => {},
        font: '',
      } as any;
    }
    return original?.call(this, contextId, ...args) ?? null;
  } as any;
}

// ResizeObserver is not implemented in jsdom; used by Pagination component.
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
