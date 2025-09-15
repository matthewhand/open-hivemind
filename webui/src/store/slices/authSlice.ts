import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Tenant } from '../../enterprise/MultiTenantProvider';

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

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
  refreshToken: localStorage.getItem('refreshToken'),
  expiresAt: localStorage.getItem('expiresAt') ? parseInt(localStorage.getItem('expiresAt')!) : null,
  currentTenant: null,
  availableTenants: [],
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
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      localStorage.setItem('expiresAt', action.payload.expiresAt.toString());
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
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
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
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
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
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
      localStorage.setItem('expiresAt', action.payload.expiresAt.toString());
    },
    refreshTokenFailure: (state) => {
      state.isLoading = false;
      // Don't logout on refresh failure, just clear tokens
      state.token = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.currentTenant = null;
      state.availableTenants = [];
      
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setCurrentTenant: (state, action: PayloadAction<Tenant | null>) => {
      state.currentTenant = action.payload;
    },
    setAvailableTenants: (state, action: PayloadAction<Tenant[]>) => {
      state.availableTenants = action.payload;
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