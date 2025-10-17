import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    }

    setIsLoading(false);
  }, []);

  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(buildUrl('/webui/api/auth/login'), {
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
        const authTokens: AuthTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        };

        // Get user info from token
        const userInfo = await verifyToken(data.accessToken);

        setTokens(authTokens);
        setUser(userInfo);

        // Store in localStorage
        localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
        localStorage.setItem('auth_user', JSON.stringify(userInfo));

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

    try {
      const response = await fetch(buildUrl('/webui/api/auth/refresh'), {
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
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
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
    try {
      const response = await fetch(buildUrl('/webui/api/auth/verify'), {
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
