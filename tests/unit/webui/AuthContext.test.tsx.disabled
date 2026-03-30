import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../src/client/src/contexts/AuthContext';
import { jest } from '@jest/globals';

declare global {
  interface ImportMetaEnv {
    VITE_API_BASE_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const MockedComponent = () => {
  const { login, logout, refreshToken, isAuthenticated, isLoading } = useAuth();
  return (
    <div>
      <button onClick={() => login('test', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => refreshToken()}>Refresh</button>
      <span data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
      <span data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</span>
    </div>
  );
};

const createMockResponse = (ok: boolean, data: any, statusText = 'OK') => {
  const jsonMock = jest.fn<jest.MockedFunction<() => Promise<any>>>().mockResolvedValue(data);
  const textMock = jest.fn<jest.MockedFunction<() => Promise<string>>>().mockResolvedValue(JSON.stringify(data));
  const mockResponse = {
    ok,
    status: ok ? 200 : 404,
    statusText,
    headers: new Headers(),
    redirected: false,
    type: 'basic' as const,
    url: '',
    body: null,
    bodyUsed: false,
    json: jsonMock,
    text: textMock,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    clone: jest.fn()
  } as Response;
  return mockResponse;
};

describe('AuthContext URL Handling', () => {
  beforeEach(() => {
    jest.resetModules();
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_BASE_URL: '' } as ImportMetaEnv,
      writable: true
    });
    (global.fetch as jest.MockedFunction<typeof fetch>) = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses relative URLs for login when VITE_API_BASE_URL is empty', async () => {
    const mockData = { success: true, accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(createMockResponse(true, mockData));

    render(
      <AuthProvider>
        <MockedComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/webui/api/auth/login', expect.any(Object));
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });
  });

  it('uses absolute URLs for login when VITE_API_BASE_URL is set', async () => {
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_BASE_URL: 'https://auth.example.com' } as ImportMetaEnv,
      writable: true
    });
    jest.resetModules();

    const mockData = { success: true, accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(createMockResponse(true, mockData));

    render(
      <AuthProvider>
        <MockedComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://auth.example.com/webui/api/auth/login', expect.any(Object));
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });
  });

  it('handles URL switching for refreshToken', async () => {
    // First, login with empty base
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: '' } as ImportMetaEnv, writable: true });
    jest.resetModules();

    const loginData = { success: true, accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(createMockResponse(true, loginData));

    const { rerender } = render(
      <AuthProvider>
        <MockedComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated'));

    // Switch to absolute base for refresh
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: 'https://new.example.com' } as ImportMetaEnv, writable: true });
    jest.resetModules();

    const refreshData = { success: true, accessToken: 'newtoken', refreshToken: 'newrefresh', expiresIn: 3600 };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(createMockResponse(true, refreshData));

    rerender(
      <AuthProvider>
        <MockedComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://new.example.com/webui/api/auth/refresh', expect.any(Object));
    });
  });

  it('error recovery: login fails with invalid URL but attempts connection', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: 'invalid://url' } as ImportMetaEnv, writable: true });
    jest.resetModules();

    const errorResponse = createMockResponse(false, {}, 'Network Error');
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(errorResponse);

    render(
      <AuthProvider>
        <MockedComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('invalid://url/webui/api/auth/login', expect.any(Object));
      expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });
  });

  it('logout clears state', async () => {
    Object.defineProperty(import.meta, 'env', { value: { VITE_API_BASE_URL: '' } as ImportMetaEnv, writable: true });
    jest.resetModules();

    const loginData = { success: true, accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(createMockResponse(true, loginData));

    const { rerender } = render(
      <AuthProvider>
        <MockedComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated'));

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
      expect(localStorage.getItem('auth_tokens')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });
});