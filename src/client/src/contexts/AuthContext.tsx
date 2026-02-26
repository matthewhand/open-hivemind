/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isServerless: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = rawBaseUrl?.replace(/\/$/, '');

const buildUrl = (path: string): string => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    const storedUser = localStorage.getItem('auth_user');

    if (storedTokens && storedUser) {
      try {
        const parsedTokens = JSON.parse(storedTokens);
        const parsedUser = JSON.parse(storedUser);

        // Check if token is still valid before setting it
        if (!isTokenExpired(parsedTokens.accessToken)) {
          setTokens(parsedTokens);
          setUser(parsedUser);
        } else {
          // Token is expired, try to refresh it silently
          refreshToken().catch((error) => {
            console.warn('Failed to refresh expired token on load:', error);
            // Don't logout here - just don't set the user
            // The app will handle being in an unauthenticated state
          });
        }
      } catch (error) {
        console.error('Failed to parse stored auth data:', error);
        // Don't logout - just don't set the user
      }
    } else if (import.meta.env.DEV && import.meta.env.VITE_AUTO_LOGIN === 'true') {
      // Auto-login is ONLY active when explicitly enabled via VITE_AUTO_LOGIN=true
      // in a Vite development build (import.meta.env.DEV === true).
      // This prevents any unauthenticated user from being silently promoted to
      // owner in staging, preview, or production environments.
      console.info('[AuthContext] DEV + VITE_AUTO_LOGIN=true: creating development user');
      const devUser: User = {
        id: 'dev-user',
        username: 'developer',
        email: 'dev@open-hivemind.local',
        role: 'owner',
        permissions: ['*'],
      };
      const devTokens: AuthTokens = {
        accessToken: 'dev-token-auto-login',
        refreshToken: 'dev-refresh-token',
        expiresIn: 86400,
      };
      setUser(devUser);
      setTokens(devTokens);
      localStorage.setItem('auth_tokens', JSON.stringify(devTokens));
      localStorage.setItem('auth_user', JSON.stringify(devUser));
    }
    // In all other cases (production, staging, CI previews) we leave the user
    // unauthenticated.  The rest of the app already handles a null user / null
    // tokens state and will redirect to the login page as expected.

    setIsLoading(false);
  }, []);

  const isTokenExpired = (token: string): boolean => {
    // These tokens never expire (for dev/demo mode)
    if (token === 'serverless-demo-token' || token === 'dev-token-auto-login') {return false;}
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const [isServerless, setIsServerless] = useState(false);

  useEffect(() => {
    // Check for serverless mode
    fetch('/health')
      .then(res => res.json())
      .then(data => {
        if (data.platform === 'vercel-serverless' || data.platform === 'serverless') {
          setIsServerless(true);
        }
      })
      .catch(() => {
        // Assume not serverless or backend down
      });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // In serverless mode, this calls the serverless function which checks env vars
      const response = await fetch(buildUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      if (data.success) {
        const { accessToken, refreshToken, expiresIn } = data.data;
        const authTokens: AuthTokens = {
          accessToken,
          refreshToken,
          expiresIn,
        };

        // Get user info from token (or mock if serverless token)
        const userInfo = await verifyToken(accessToken);

        setTokens(authTokens);
        setUser(userInfo);

        // Store in localStorage
        localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
        localStorage.setItem('auth_user', JSON.stringify(userInfo));

        // Mark as acknowledged if successful serverless login
        if (isServerless) {
          localStorage.setItem('serverless-mode-acknowledged', 'true');
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!tokens?.refreshToken) {
      logout();
      return false;
    }

    // Handle serverless mode refresh
    if (tokens.accessToken === 'serverless-demo-token' || isServerless) {
      return true; // Token never expires in demo mode
    }

    try {
      const response = await fetch(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (data.success) {
        const newTokens: AuthTokens = {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          expiresIn: data.data.expiresIn,
        };

        setTokens(newTokens);
        localStorage.setItem('auth_tokens', JSON.stringify(newTokens));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const verifyToken = async (token: string): Promise<User | null> => {
    // Handle serverless mode verification
    if (token === 'serverless-demo-token' || isServerless) {
      return {
        id: 'serverless-admin',
        username: 'admin',
        email: 'admin@open-hivemind.com',
        role: 'owner',
        permissions: ['all'],
      };
    }

    try {
      const response = await fetch(buildUrl('/api/auth/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const data = await response.json();

      if (data.success) {
        return data.user;
      }

      return null;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user,
    isLoading,
    isServerless,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
