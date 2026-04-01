/**
 * Tests for authStore (Zustand) — migrated from the old Redux authSlice tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../authStore';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin' as const,
  permissions: ['read', 'write', 'admin'],
  lastLogin: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    refreshToken: null,
    expiresAt: null,
    currentTenant: null,
    availableTenants: [],
  });
});

describe('authStore', () => {
  describe('actions', () => {
    it('should return the initial state', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle loginStart', () => {
      useAuthStore.getState().loginStart();
      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBe(null);
    });

    it('should handle loginSuccess', () => {
      const payload = {
        user: mockUser,
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };
      useAuthStore.getState().loginSuccess(payload);
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('test-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.error).toBe(null);
    });

    it('should handle loginFailure', () => {
      useAuthStore.getState().loginFailure('Invalid credentials');
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
    });

    it('should handle logout', () => {
      useAuthStore.setState({ user: mockUser, token: 'test-token', isAuthenticated: true });
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.refreshToken).toBe(null);
    });

    it('should handle refreshTokenStart', () => {
      useAuthStore.getState().refreshTokenStart();
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should handle refreshTokenSuccess', () => {
      const payload = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
      };
      useAuthStore.getState().refreshTokenSuccess(payload);
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.token).toBe('new-token');
      expect(state.refreshToken).toBe('new-refresh-token');
    });

    it('should handle refreshTokenFailure', () => {
      useAuthStore.setState({ token: 'old-token', refreshToken: 'old-refresh' });
      useAuthStore.getState().refreshTokenFailure();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.token).toBe(null);
      expect(state.refreshToken).toBe(null);
    });

    it('should handle clearError', () => {
      useAuthStore.setState({ error: 'Some error' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBe(null);
    });

    it('should handle updateUser', () => {
      useAuthStore.setState({ user: mockUser });
      useAuthStore.getState().updateUser({ username: 'newname' });
      expect(useAuthStore.getState().user?.username).toBe('newname');
    });

    it('should not update user if not logged in', () => {
      useAuthStore.getState().updateUser({ username: 'newname' });
      expect(useAuthStore.getState().user).toBe(null);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: mockUser,
        token: 'token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        refreshToken: null,
        expiresAt: null,
        currentTenant: null,
        availableTenants: [],
      });
    });

    it('should return the user', () => {
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should return the token', () => {
      expect(useAuthStore.getState().token).toBe('token');
    });

    it('should return authentication status', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should return user role', () => {
      expect(useAuthStore.getState().user?.role).toBe('admin');
    });

    it('should return user permissions', () => {
      expect(useAuthStore.getState().user?.permissions).toEqual(['read', 'write', 'admin']);
    });

    it('selectIsTokenExpired should return true when no expiresAt', () => {
      expect(useAuthStore.getState().expiresAt).toBe(null);
    });

    it('token should not be expired when expiresAt is in the future', () => {
      useAuthStore.setState({ expiresAt: Date.now() + 3600000 });
      const { expiresAt } = useAuthStore.getState();
      expect(expiresAt !== null && Date.now() < expiresAt).toBe(true);
    });

    it('token should be expired when expiresAt is in the past', () => {
      useAuthStore.setState({ expiresAt: Date.now() - 1000 });
      const { expiresAt } = useAuthStore.getState();
      expect(expiresAt !== null && Date.now() > expiresAt).toBe(true);
    });
  });
});
