import { create } from 'zustand';
import Debug from 'debug';
const debug = Debug('app:client:store:authStore');

/** Tenant type */
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxBots: number;
  maxUsers: number;
  storageQuota: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  lastLogin: string;
}

const getStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (error) {
    debug('WARN:', 'localStorage unavailable:', error);
  }
  return undefined;
};

const storage = getStorage();

const readJSON = <T>(key: string): T | null => {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    debug('WARN:', `Failed to parse stored value for ${key}`, error);
    return null;
  }
};

const persistItem = (key: string, value: string | null) => {
  if (!storage) return;
  if (value === null) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, value);
};

const persistJSON = (key: string, value: unknown | null) => {
  if (!storage) return;
  if (value === null) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(value));
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
}

interface AuthActions {
  loginStart: () => void;
  loginSuccess: (payload: { user: User; token: string; refreshToken: string; expiresAt: number }) => void;
  loginFailure: (error: string) => void;
  logout: () => void;
  refreshTokenStart: () => void;
  refreshTokenSuccess: (payload: { token: string; refreshToken: string; expiresAt: number }) => void;
  refreshTokenFailure: () => void;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  setAvailableTenants: (tenants: Tenant[]) => void;
}

const storedToken = storage?.getItem('token') ?? null;
const storedRefreshToken = storage?.getItem('refreshToken') ?? null;
const storedExpiresAtValue = storage?.getItem('expiresAt');
const storedUser = readJSON<User>('auth_user');
const storedCurrentTenant = readJSON<Tenant>('auth_currentTenant');
const storedTenants = readJSON<Tenant[]>('auth_tenants') ?? [];

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: storedUser,
  token: storedToken,
  isAuthenticated: Boolean(storedToken && storedUser),
  isLoading: false,
  error: null,
  refreshToken: storedRefreshToken,
  expiresAt: storedExpiresAtValue ? Number.parseInt(storedExpiresAtValue, 10) : null,
  currentTenant: storedCurrentTenant ?? null,
  availableTenants: storedTenants,

  loginStart: () => set({ isLoading: true, error: null }),

  loginSuccess: ({ user, token, refreshToken, expiresAt }) => {
    set({ isLoading: false, isAuthenticated: true, user, token, refreshToken, expiresAt, error: null });
    persistItem('token', token);
    persistItem('refreshToken', refreshToken);
    persistItem('expiresAt', expiresAt.toString());
    persistJSON('auth_user', user);
  },

  loginFailure: (error) => {
    set({ isLoading: false, isAuthenticated: false, error, user: null, token: null, refreshToken: null, expiresAt: null });
    persistItem('token', null);
    persistItem('refreshToken', null);
    persistItem('expiresAt', null);
    persistJSON('auth_user', null);
  },

  logout: () => {
    set({
      user: null, token: null, isAuthenticated: false, refreshToken: null,
      expiresAt: null, error: null, currentTenant: null, availableTenants: [],
    });
    persistItem('token', null);
    persistItem('refreshToken', null);
    persistItem('expiresAt', null);
    persistJSON('auth_user', null);
    persistJSON('auth_currentTenant', null);
    persistJSON('auth_tenants', null);
  },

  refreshTokenStart: () => set({ isLoading: true }),

  refreshTokenSuccess: ({ token, refreshToken, expiresAt }) => {
    set({ isLoading: false, token, refreshToken, expiresAt });
    persistItem('token', token);
    persistItem('refreshToken', refreshToken);
    persistItem('expiresAt', expiresAt.toString());
  },

  refreshTokenFailure: () => {
    set({ isLoading: false, token: null, refreshToken: null, expiresAt: null, currentTenant: null, availableTenants: [] });
    persistItem('token', null);
    persistItem('refreshToken', null);
    persistItem('expiresAt', null);
    persistJSON('auth_tenants', null);
    persistJSON('auth_currentTenant', null);
  },

  clearError: () => set({ error: null }),

  updateUser: (updates) => {
    const user = get().user;
    if (user) {
      const updated = { ...user, ...updates };
      set({ user: updated });
      persistJSON('auth_user', updated);
    }
  },

  setCurrentTenant: (currentTenant) => {
    set({ currentTenant });
    persistJSON('auth_currentTenant', currentTenant);
  },

  setAvailableTenants: (availableTenants) => {
    set({ availableTenants });
    persistJSON('auth_tenants', availableTenants);
  },
}));

// Selector helpers
export const selectUser = (s: AuthState) => s.user;
export const selectToken = (s: AuthState) => s.token;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectAuthIsLoading = (s: AuthState) => s.isLoading;
export const selectAuthError = (s: AuthState) => s.error;
export const selectUserRole = (s: AuthState) => s.user?.role;
export const selectUserPermissions = (s: AuthState) => s.user?.permissions || [];
export const selectCurrentTenant = (s: AuthState) => s.currentTenant;
export const selectAvailableTenants = (s: AuthState) => s.availableTenants;
export const selectIsTokenExpired = (s: AuthState) => {
  if (!s.expiresAt) return true;
  return Date.now() > s.expiresAt;
};
