import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { createMockFunction } from '@/test-utils';

// Mock localStorage
const localStorageMock = (() => {
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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Test component to use the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout, refreshToken } = useAuth();

  return (
    <div>
      <div data-testid="is-authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <button onClick={() => login('testuser', 'testpass')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => refreshToken()}>Refresh Token</button>
    </div>
  );
};

describe('AuthContext', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    permissions: ['read'],
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should provide auth context values', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should load stored auth data on mount', async () => {
    localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens));
    localStorageMock.setItem('auth_user', JSON.stringify(mockUser));

    // Mock token verification
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, user: mockUser }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
  });

  it('should handle login successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          accessToken: mockTokens.accessToken,
          refreshToken: mockTokens.refreshToken,
          expiresIn: mockTokens.expiresIn,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, user: mockUser }),
      });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_tokens', JSON.stringify(mockTokens));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
  });

  it('should handle login failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    act(() => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should handle logout', async () => {
    // Start with logged in state
    localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens));
    localStorageMock.setItem('auth_user', JSON.stringify(mockUser));

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, user: mockUser }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    const logoutButton = screen.getByText('Logout');
    act(() => {
      logoutButton.click();
    });

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
  });

  it('should handle token refresh successfully', async () => {
    localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens));
    localStorageMock.setItem('auth_user', JSON.stringify(mockUser));

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, user: mockUser }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        }),
      });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    const refreshButton = screen.getByText('Refresh Token');
    act(() => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'auth_tokens',
      JSON.stringify({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      })
    );
  });

  it('should handle token refresh failure', async () => {
    localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens));
    localStorageMock.setItem('auth_user', JSON.stringify(mockUser));

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, user: mockUser }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    const refreshButton = screen.getByText('Refresh Token');
    act(() => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should handle invalid stored auth data', async () => {
    localStorageMock.setItem('auth_tokens', 'invalid-json');
    localStorageMock.setItem('auth_user', 'invalid-json');

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse stored auth data:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});