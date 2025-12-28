import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    refreshTokenStart,
    refreshTokenSuccess,
    refreshTokenFailure,
    clearError,
    updateUser,
    selectAuth,
    selectUser,
    selectToken,
    selectIsAuthenticated,
    selectIsLoading,
    selectAuthError,
    selectUserRole,
    selectUserPermissions,
    selectHasPermission,
    selectIsTokenExpired,
} from '../authSlice';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('authSlice', () => {
    const initialState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        refreshToken: null,
        expiresAt: null,
        currentTenant: null,
        availableTenants: [],
    };

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
    });

    describe('reducers', () => {
        it('should return the initial state', () => {
            expect(authReducer(undefined, { type: 'unknown' })).toMatchObject({
                isLoading: false,
                error: null,
            });
        });

        it('should handle loginStart', () => {
            const state = authReducer(initialState, loginStart());
            expect(state.isLoading).toBe(true);
            expect(state.error).toBe(null);
        });

        it('should handle loginSuccess', () => {
            const payload = {
                user: mockUser,
                token: 'test-token',
                refreshToken: 'refresh-token',
                expiresAt: Date.now() + 3600000,
            };
            const state = authReducer(initialState, loginSuccess(payload));

            expect(state.isLoading).toBe(false);
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockUser);
            expect(state.token).toBe('test-token');
            expect(state.refreshToken).toBe('refresh-token');
            expect(state.error).toBe(null);
        });

        it('should handle loginFailure', () => {
            const state = authReducer(initialState, loginFailure('Invalid credentials'));

            expect(state.isLoading).toBe(false);
            expect(state.isAuthenticated).toBe(false);
            expect(state.error).toBe('Invalid credentials');
            expect(state.user).toBe(null);
            expect(state.token).toBe(null);
        });

        it('should handle logout', () => {
            const loggedInState = {
                ...initialState,
                user: mockUser,
                token: 'test-token',
                isAuthenticated: true,
            };
            const state = authReducer(loggedInState, logout());

            expect(state.user).toBe(null);
            expect(state.token).toBe(null);
            expect(state.isAuthenticated).toBe(false);
            expect(state.refreshToken).toBe(null);
        });

        it('should handle refreshTokenStart', () => {
            const state = authReducer(initialState, refreshTokenStart());
            expect(state.isLoading).toBe(true);
        });

        it('should handle refreshTokenSuccess', () => {
            const payload = {
                token: 'new-token',
                refreshToken: 'new-refresh-token',
                expiresAt: Date.now() + 3600000,
            };
            const state = authReducer(initialState, refreshTokenSuccess(payload));

            expect(state.isLoading).toBe(false);
            expect(state.token).toBe('new-token');
            expect(state.refreshToken).toBe('new-refresh-token');
        });

        it('should handle refreshTokenFailure', () => {
            const loggedInState = {
                ...initialState,
                token: 'old-token',
                refreshToken: 'old-refresh',
            };
            const state = authReducer(loggedInState, refreshTokenFailure());

            expect(state.isLoading).toBe(false);
            expect(state.token).toBe(null);
            expect(state.refreshToken).toBe(null);
        });

        it('should handle clearError', () => {
            const stateWithError = { ...initialState, error: 'Some error' };
            const state = authReducer(stateWithError, clearError());
            expect(state.error).toBe(null);
        });

        it('should handle updateUser', () => {
            const loggedInState = { ...initialState, user: mockUser };
            const state = authReducer(loggedInState, updateUser({ username: 'newname' }));
            expect(state.user?.username).toBe('newname');
        });

        it('should not update user if not logged in', () => {
            const state = authReducer(initialState, updateUser({ username: 'newname' }));
            expect(state.user).toBe(null);
        });
    });

    describe('selectors', () => {
        const rootState = { auth: { ...initialState, user: mockUser, token: 'token', isAuthenticated: true } };

        it('selectAuth should return the auth state', () => {
            expect(selectAuth(rootState)).toBe(rootState.auth);
        });

        it('selectUser should return the user', () => {
            expect(selectUser(rootState)).toEqual(mockUser);
        });

        it('selectToken should return the token', () => {
            expect(selectToken(rootState)).toBe('token');
        });

        it('selectIsAuthenticated should return authentication status', () => {
            expect(selectIsAuthenticated(rootState)).toBe(true);
        });

        it('selectIsLoading should return loading status', () => {
            expect(selectIsLoading(rootState)).toBe(false);
        });

        it('selectAuthError should return error', () => {
            expect(selectAuthError(rootState)).toBe(null);
        });

        it('selectUserRole should return user role', () => {
            expect(selectUserRole(rootState)).toBe('admin');
        });

        it('selectUserPermissions should return user permissions', () => {
            expect(selectUserPermissions(rootState)).toEqual(['read', 'write', 'admin']);
        });

        it('selectHasPermission should check permission correctly', () => {
            expect(selectHasPermission('read')(rootState)).toBe(true);
            expect(selectHasPermission('nonexistent')(rootState)).toBe(true); // has admin
        });

        it('selectIsTokenExpired should return true when no expiresAt', () => {
            expect(selectIsTokenExpired(rootState)).toBe(true);
        });

        it('selectIsTokenExpired should return false when token not expired', () => {
            const stateWithExpiry = {
                auth: { ...rootState.auth, expiresAt: Date.now() + 3600000 },
            };
            expect(selectIsTokenExpired(stateWithExpiry)).toBe(false);
        });

        it('selectIsTokenExpired should return true when token expired', () => {
            const stateWithExpiry = {
                auth: { ...rootState.auth, expiresAt: Date.now() - 1000 },
            };
            expect(selectIsTokenExpired(stateWithExpiry)).toBe(true);
        });
    });
});
