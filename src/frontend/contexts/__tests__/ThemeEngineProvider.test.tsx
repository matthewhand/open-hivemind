import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeEngineProvider, useThemeContext } from '../ThemeEngine';

type MatchMediaMock = jest.Mock<any, any>;

const TestConsumer: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeContext();

  return (
    <div>
      <span data-testid="mode">{isDarkMode ? 'dark' : 'light'}</span>
      <button type="button" onClick={toggleTheme}>toggle</button>
    </div>
  );
};

describe('ThemeEngineProvider', () => {
  const matchMediaMock = window.matchMedia as unknown as MatchMediaMock;
  const originalLocalStorage = window.localStorage;
  let localStorageMock: {
    getItem: jest.Mock<string | null, [string]>;
    setItem: jest.Mock<void, [string, string]>;
    removeItem: jest.Mock;
    clear: jest.Mock;
    key: jest.Mock;
    length: number;
  };

  const renderWithProvider = () => render(
    <ThemeEngineProvider>
      <TestConsumer />
    </ThemeEngineProvider>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: localStorageMock,
    });
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: originalLocalStorage,
    });
  });

  it('initializes in dark mode when storage contains a truthy value', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    renderWithProvider();

    expect(await screen.findByTestId('mode')).toHaveTextContent('dark');
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  it('honors the prefers-color-scheme media query when storage value is auto', async () => {
    localStorageMock.getItem.mockReturnValue('auto');
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme') ? true : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithProvider();

    expect(await screen.findByTestId('mode')).toHaveTextContent('dark');
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  it('falls back to light mode when stored value is invalid', async () => {
    localStorageMock.getItem.mockReturnValue('not-json-or-mode');

    renderWithProvider();

    expect(await screen.findByTestId('mode')).toHaveTextContent('light');
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  it('persists changes when toggling theme', async () => {
    localStorageMock.getItem.mockReturnValue('light');

    renderWithProvider();

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    localStorageMock.setItem.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /toggle/i }));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });
});
