import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Make vi available globally as jest for compatibility
Object.assign(global, { jest: vi });

// Clean up after each test case
afterEach(() => {
  cleanup();
});