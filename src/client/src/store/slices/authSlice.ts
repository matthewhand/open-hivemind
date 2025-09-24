import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Tenant } from '../../enterprise/MultiTenantProvider';

const getStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (error) {
    console.warn('localStorage unavailable:', error);
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
    console.warn(`Failed to parse stored value for ${key}`, error);
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

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  lastLogin: string;
}

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

const storedToken = storage?.getItem('token') ?? null;
const storedRefreshToken = storage?.getItem('refreshToken') ?? null;
const storedExpiresAtValue = storage?.getItem('expiresAt');
const storedUser = readJSON<User>('auth_user');
const storedCurrentTenant = readJSON<Tenant>('auth_currentTenant');
const storedTenants = readJSON<Tenant[]>('auth_tenants') ?? [];

const initialState: AuthState = {
  user: storedUser,
  token: storedToken,
  isAuthenticated: Boolean(storedToken && storedUser),
  isLoading: false,
  error: null,
  refreshToken: storedRefreshToken,
  expiresAt: storedExpiresAtValue ? Number.parseInt(storedExpiresAtValue, 10) : null,
  currentTenant: storedCurrentTenant ?? null,
  availableTenants: storedTenants,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; refreshToken: string; expiresAt: number }>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt;
      state.error = null;
      
      // Persist to localStorage
      persistItem('token', action.payload.token);
      persistItem('refreshToken', action.payload.refreshToken);
      persistItem('expiresAt', action.payload.expiresAt.toString());
      persistJSON('auth_user', action.payload.user);
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.error = action.payload;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.expiresAt = null;
      
      // Clear localStorage
      persistItem('token', null);
      persistItem('refreshToken', null);
      persistItem('expiresAt', null);
      persistJSON('auth_user', null);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.refreshToken = null;
      state.expiresAt = null;
      state.error = null;
      state.currentTenant = null;
      state.availableTenants = [];
      
      // Clear localStorage
      persistItem('token', null);
      persistItem('refreshToken', null);
      persistItem('expiresAt', null);
      persistJSON('auth_user', null);
      persistJSON('auth_currentTenant', null);
      persistJSON('auth_tenants', null);
    },
    refreshTokenStart: (state) => {
      state.isLoading = true;
    },
    refreshTokenSuccess: (state, action: PayloadAction<{ token: string; refreshToken: string; expiresAt: number }>) => {
      state.isLoading = false;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt;
      
      // Update localStorage
      persistItem('token', action.payload.token);
      persistItem('refreshToken', action.payload.refreshToken);
      persistItem('expiresAt', action.payload.expiresAt.toString());
    },
    refreshTokenFailure: (state) => {
      state.isLoading = false;
      // Don't logout on refresh failure, just clear tokens
      state.token = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.currentTenant = null;
      state.availableTenants = [];
      
      persistItem('token', null);
      persistItem('refreshToken', null);
      persistItem('expiresAt', null);
      persistJSON('auth_tenants', null);
      persistJSON('auth_currentTenant', null);
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        persistJSON('auth_user', state.user);
      }
    },
    setCurrentTenant: (state, action: PayloadAction<Tenant | null>) => {
      state.currentTenant = action.payload;
      persistJSON('auth_currentTenant', action.payload);
    },
    setAvailableTenants: (state, action: PayloadAction<Tenant[]>) => {
      state.availableTenants = action.payload;
      persistJSON('auth_tenants', action.payload);
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  clearError,
  updateUser,
  setCurrentTenant,
  setAvailableTenants,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.role;
export const selectUserPermissions = (state: { auth: AuthState }) => state.auth.user?.permissions || [];
export const selectHasPermission = (permission: string) => (state: { auth: AuthState }) => {
  const permissions = state.auth.user?.permissions || [];
  return permissions.includes(permission) || permissions.includes('admin');
};
export const selectIsTokenExpired = (state: { auth: AuthState }) => {
  if (!state.auth.expiresAt) return true;
  return Date.now() > state.auth.expiresAt;
};
export const selectCurrentTenant = (state: { auth: AuthState }) => state.auth.currentTenant;
export const selectAvailableTenants = (state: { auth: AuthState }) => state.auth.availableTenants;
