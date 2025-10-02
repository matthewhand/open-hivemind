// Mock React context to prevent useContext errors
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  
  return {
    ...originalReact,
    useContext: () => ({
      palette: {
        primary: {
          main: '#556cd6',
        },
        secondary: {
          main: '#19857b',
        },
      },
    }),
  };
});

// Mock OpenAI to prevent fetch shim requirements in component tests
jest.mock('openai', () => {
  return {
    OpenAI: class MockOpenAI {
      chat = { completions: { create: async () => ({ choices: [{ message: { content: 'mock' } }] }) } };
    }
  };
});

// Mock Material UI components to avoid "Invalid hook call" errors in tests
jest.mock('@mui/material', () => {
  const actualMui = jest.requireActual('@mui/material');

  // Create a simple mock theme
  const mockTheme = {
    palette: {
      primary: {
        main: '#556cd6',
      },
      secondary: {
        main: '#19857b',
      },
    },
  };

  // Mock ThemeProvider to provide a theme to components
  const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
    return <div>{children}</div>;
  };

  return {
    ...actualMui,
    Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CircularProgress: () => <div data-testid="circular-progress">CircularProgress</div>,
    Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    ThemeProvider: MockThemeProvider,
    CssBaseline: () => <div />,
    createTheme: () => mockTheme,
  };
});

jest.mock('@mui/material/styles', () => {
  // Create a simple mock theme
  const mockTheme = {
    palette: {
      primary: {
        main: '#556cd6',
      },
      secondary: {
        main: '#19857b',
      },
    },
  };

  // Mock ThemeProvider to provide a theme to components
  const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
    return <div>{children}</div>;
  };

  return {
    createTheme: () => mockTheme,
    ThemeProvider: MockThemeProvider,
  };
});

jest.mock('@mui/system', () => ({
  useTheme: () => ({
    palette: {
      primary: {
        main: '#556cd6',
      },
      secondary: {
        main: '#19857b',
      },
    },
  }),
  createBox: () => ({ children, ...props }: any) => <div data-testid="mui-box" {...props}>{children}</div>,
}));

import React from 'react';
import '@testing-library/jest-dom';
// Polyfill TextEncoder/TextDecoder for react-router / whatwg-encoding usage in jsdom
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  // @ts-ignore
  global.TextEncoder = TextEncoder;
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}



/**
 * Jest setup file to optionally silence console output during tests.
 *
 * Behavior:
 * - If process.env.ALLOW_CONSOLE is truthy, no stubbing is applied.
 * - Otherwise, console methods are stubbed to no-ops to keep test output quiet.
 *
 * You can enable console logs temporarily by running:
 *   ALLOW_CONSOLE=1 npm test
 *   ALLOW_CONSOLE=1 make test
 */

const allow = !!process.env.ALLOW_CONSOLE;

if (!allow) {
  // Preserve original methods in case a suite wants to restore them.
  const noop = () => {};
  // Commonly used console methods in the repo
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  global.console = {
    ...console,
    log: noop,
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    trace: noop,
  };
}