/**
 * Tests for uiStore (Zustand) — migrated from the old Redux uiSlice tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../../uiStore';

// Reset Zustand store state between tests
beforeEach(() => {
  useUIStore.setState({
    theme: 'auto',
    sidebarCollapsed: false,
    notificationsEnabled: true,
    soundEnabled: false,
    animationsEnabled: true,
    language: 'en',
    density: 'comfortable',
    autoRefreshEnabled: true,
    refreshInterval: 5000,
    showTooltips: true,
    showKeyboardShortcuts: true,
    sidebarWidth: 280,
    modals: [],
    toasts: [],
    alerts: [],
    loadingStates: {},
    activeSection: 'dashboard',
    userPreferences: {},
    featureFlags: {
      advancedAnalytics: true,
      realTimeUpdates: true,
      exportFeatures: true,
      multiTenant: false,
      aiInsights: false,
    },
  });
});

describe('uiStore', () => {
  describe('theme management', () => {
    it('should set theme', () => {
      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should toggle dark mode from light to dark', () => {
      useUIStore.getState().setTheme('light');
      useUIStore.getState().toggleDarkMode();
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should toggle dark mode from dark to high-contrast', () => {
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().toggleDarkMode();
      expect(useUIStore.getState().theme).toBe('high-contrast');
    });
  });

  describe('sidebar management', () => {
    it('should toggle sidebar', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should set sidebar width', () => {
      useUIStore.getState().setSidebarWidth(300);
      expect(useUIStore.getState().sidebarWidth).toBe(300);
    });
  });

  describe('modal management', () => {
    it('should open modal', () => {
      useUIStore.getState().openModal({ id: 'test-modal', type: 'default' });
      expect(useUIStore.getState().modals.some((m) => m.id === 'test-modal')).toBe(true);
    });

    it('should close modal', () => {
      useUIStore.getState().openModal({ id: 'test-modal', type: 'default' });
      useUIStore.getState().closeModal('test-modal');
      expect(useUIStore.getState().modals.some((m) => m.id === 'test-modal')).toBe(false);
    });

    it('should close all modals', () => {
      useUIStore.getState().openModal({ id: 'modal-1', type: 'default' });
      useUIStore.getState().openModal({ id: 'modal-2', type: 'default' });
      useUIStore.getState().closeAllModals();
      expect(useUIStore.getState().modals.length).toBe(0);
    });
  });

  describe('toast management', () => {
    it('should show toast', () => {
      useUIStore.getState().showToast({ message: 'Test toast', type: 'success', duration: 5000, position: 'top-right' });
      expect(useUIStore.getState().toasts.some((t) => t.message === 'Test toast')).toBe(true);
    });

    it('should dismiss toast', () => {
      useUIStore.getState().showToast({ message: 'Test toast', type: 'success', duration: 5000, position: 'top-right' });
      const toastId = useUIStore.getState().toasts[0].id;
      useUIStore.getState().dismissToast(toastId);
      expect(useUIStore.getState().toasts.length).toBe(0);
    });

    it('should clear all toasts', () => {
      useUIStore.getState().showToast({ message: 'Toast 1', type: 'success', duration: 5000, position: 'top-right' });
      useUIStore.getState().showToast({ message: 'Toast 2', type: 'error', duration: 5000, position: 'top-right' });
      useUIStore.getState().clearAllToasts();
      expect(useUIStore.getState().toasts.length).toBe(0);
    });
  });

  describe('alert management', () => {
    it('should show alert', () => {
      useUIStore.getState().showAlert({ message: 'Test alert', status: 'warning' });
      expect(useUIStore.getState().alerts.some((a) => a.message === 'Test alert')).toBe(true);
    });

    it('should dismiss alert', () => {
      useUIStore.getState().showAlert({ message: 'Test alert', status: 'warning' });
      const alertId = useUIStore.getState().alerts[0].id;
      useUIStore.getState().dismissAlert(alertId);
      expect(useUIStore.getState().alerts.length).toBe(0);
    });
  });

  describe('loading states', () => {
    it('should set loading state', () => {
      useUIStore.getState().setLoading('bots', true);
      expect(useUIStore.getState().loadingStates.bots).toBe(true);
    });

    it('should clear loading state', () => {
      useUIStore.getState().setLoading('bots', true);
      useUIStore.getState().clearLoading('bots');
      expect(useUIStore.getState().loadingStates.bots).toBeUndefined();
    });
  });

  describe('feature flags', () => {
    it('should set feature flag', () => {
      useUIStore.getState().setFeatureFlag('aiInsights', true);
      expect(useUIStore.getState().featureFlags.aiInsights).toBe(true);
    });

    it('should toggle feature flag', () => {
      useUIStore.getState().setFeatureFlag('aiInsights', false);
      useUIStore.getState().toggleFeatureFlag('aiInsights');
      expect(useUIStore.getState().featureFlags.aiInsights).toBe(true);
    });
  });

  describe('UI preferences', () => {
    it('should set notifications enabled', () => {
      useUIStore.getState().setNotificationsEnabled(false);
      expect(useUIStore.getState().notificationsEnabled).toBe(false);
    });

    it('should set sound enabled', () => {
      useUIStore.getState().setSoundEnabled(true);
      expect(useUIStore.getState().soundEnabled).toBe(true);
    });

    it('should set animations enabled', () => {
      useUIStore.getState().setAnimationsEnabled(false);
      expect(useUIStore.getState().animationsEnabled).toBe(false);
    });

    it('should set language', () => {
      useUIStore.getState().setLanguage('es');
      expect(useUIStore.getState().language).toBe('es');
    });

    it('should set density', () => {
      useUIStore.getState().setDensity('compact');
      expect(useUIStore.getState().density).toBe('compact');
    });
  });

  describe('active section', () => {
    it('should set active section', () => {
      useUIStore.getState().setActiveSection('dashboard');
      expect(useUIStore.getState().activeSection).toBe('dashboard');
    });
  });
});
