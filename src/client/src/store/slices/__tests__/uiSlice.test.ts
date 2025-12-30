// Jest provides describe, it, expect as globals
import uiReducer, {
    setTheme,
    toggleDarkMode,
    toggleSidebar,
    setSidebarWidth,
    openModal,
    closeModal,
    closeAllModals,
    showToast,
    dismissToast,
    clearAllToasts,
    showAlert,
    dismissAlert,
    setLoading,
    clearLoading,
    setActiveSection,
    setFeatureFlag,
    toggleFeatureFlag,
    setNotificationsEnabled,
    setSoundEnabled,
    setAnimationsEnabled,
    setLanguage,
    setDensity,
} from '../uiSlice';

describe('uiSlice', () => {
    // Get initial state by passing undefined
    const getInitialState = () => uiReducer(undefined, { type: 'unknown' });

    describe('theme management', () => {
        it('should set theme', () => {
            const state = uiReducer(getInitialState(), setTheme('dark'));
            expect(state.theme).toBe('dark');
        });

        it('should toggle dark mode from light to dark', () => {
            let state = uiReducer(getInitialState(), setTheme('light'));
            state = uiReducer(state, toggleDarkMode());
            expect(state.theme).toBe('dark');
        });

        it('should toggle dark mode from dark to high-contrast', () => {
            let state = uiReducer(getInitialState(), setTheme('dark'));
            state = uiReducer(state, toggleDarkMode());
            expect(state.theme).toBe('high-contrast');
        });
    });

    describe('sidebar management', () => {
        it('should toggle sidebar', () => {
            const state = uiReducer(getInitialState(), toggleSidebar());
            expect(state.sidebarCollapsed).toBe(true);
        });

        it('should set sidebar width', () => {
            const state = uiReducer(getInitialState(), setSidebarWidth(300));
            expect(state.sidebarWidth).toBe(300);
        });
    });

    describe('modal management', () => {
        it('should open modal', () => {
            const state = uiReducer(getInitialState(), openModal({
                id: 'test-modal',
                title: 'Test Modal',
            }));
            expect(state.modals.some(m => m.id === 'test-modal')).toBe(true);
        });

        it('should close modal', () => {
            let state = uiReducer(getInitialState(), openModal({
                id: 'test-modal',
                title: 'Test Modal',
            }));
            state = uiReducer(state, closeModal('test-modal'));
            expect(state.modals.some(m => m.id === 'test-modal')).toBe(false);
        });

        it('should close all modals', () => {
            let state = uiReducer(getInitialState(), openModal({
                id: 'modal-1',
                title: 'Modal 1',
            }));
            state = uiReducer(state, openModal({
                id: 'modal-2',
                title: 'Modal 2',
            }));
            state = uiReducer(state, closeAllModals());
            expect(state.modals.length).toBe(0);
        });
    });

    describe('toast management', () => {
        it('should show toast', () => {
            const state = uiReducer(getInitialState(), showToast({
                message: 'Test toast',
                type: 'success',
            }));
            expect(state.toasts.some(t => t.message === 'Test toast')).toBe(true);
        });

        it('should dismiss toast', () => {
            let state = uiReducer(getInitialState(), showToast({
                message: 'Test toast',
                type: 'success',
            }));
            const toastId = state.toasts[0].id;
            state = uiReducer(state, dismissToast(toastId));
            expect(state.toasts.length).toBe(0);
        });

        it('should clear all toasts', () => {
            let state = uiReducer(getInitialState(), showToast({
                message: 'Toast 1',
                type: 'success',
            }));
            state = uiReducer(state, showToast({
                message: 'Toast 2',
                type: 'error',
            }));
            state = uiReducer(state, clearAllToasts());
            expect(state.toasts.length).toBe(0);
        });
    });

    describe('alert management', () => {
        it('should show alert', () => {
            const state = uiReducer(getInitialState(), showAlert({
                message: 'Test alert',
                type: 'warning',
            }));
            expect(state.alerts.some(a => a.message === 'Test alert')).toBe(true);
        });

        it('should dismiss alert', () => {
            let state = uiReducer(getInitialState(), showAlert({
                message: 'Test alert',
                type: 'warning',
            }));
            const alertId = state.alerts[0].id;
            state = uiReducer(state, dismissAlert(alertId));
            expect(state.alerts.length).toBe(0);
        });
    });

    describe('loading states', () => {
        it('should set loading state', () => {
            const state = uiReducer(getInitialState(), setLoading({ key: 'bots', isLoading: true }));
            expect(state.loadingStates.bots).toBe(true);
        });

        it('should clear loading state', () => {
            let state = uiReducer(getInitialState(), setLoading({ key: 'bots', isLoading: true }));
            state = uiReducer(state, clearLoading('bots'));
            expect(state.loadingStates.bots).toBeUndefined();
        });
    });

    describe('feature flags', () => {
        it('should set feature flag', () => {
            const state = uiReducer(getInitialState(), setFeatureFlag({ key: 'aiInsights', enabled: true }));
            expect(state.featureFlags.aiInsights).toBe(true);
        });

        it('should toggle feature flag', () => {
            let state = uiReducer(getInitialState(), setFeatureFlag({ key: 'aiInsights', enabled: false }));
            state = uiReducer(state, toggleFeatureFlag('aiInsights'));
            expect(state.featureFlags.aiInsights).toBe(true);
        });
    });

    describe('UI preferences', () => {
        it('should set notifications enabled', () => {
            const state = uiReducer(getInitialState(), setNotificationsEnabled(false));
            expect(state.notificationsEnabled).toBe(false);
        });

        it('should set sound enabled', () => {
            const state = uiReducer(getInitialState(), setSoundEnabled(true));
            expect(state.soundEnabled).toBe(true);
        });

        it('should set animations enabled', () => {
            const state = uiReducer(getInitialState(), setAnimationsEnabled(false));
            expect(state.animationsEnabled).toBe(false);
        });

        it('should set language', () => {
            const state = uiReducer(getInitialState(), setLanguage('es'));
            expect(state.language).toBe('es');
        });

        it('should set density', () => {
            const state = uiReducer(getInitialState(), setDensity('compact'));
            expect(state.density).toBe('compact');
        });
    });

    describe('active section', () => {
        it('should set active section', () => {
            const state = uiReducer(getInitialState(), setActiveSection('dashboard'));
            expect(state.activeSection).toBe('dashboard');
        });
    });
});
