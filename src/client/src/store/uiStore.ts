/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import Debug from 'debug';
const debug = Debug('app:client:store:uiStore');

export interface UIState {
  theme: string;
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  density: 'compact' | 'comfortable' | 'spacious';
  errorReportingEnabled: boolean;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  showTooltips: boolean;
  showKeyboardShortcuts: boolean;
  sidebarWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  viewport: {
    width: number;
    height: number;
  };
  modals: Array<{
    id: string;
    type: string;
    props?: Record<string, unknown>;
    isOpen: boolean;
  }>;
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  }>;
  alerts: Array<{
    id: string;
    message: string;
    status: 'info' | 'success' | 'warning' | 'error';
    icon?: React.ReactNode;
  }>;
  loadingStates: Record<string, boolean>;
  activeSection: string;
  userPreferences: Record<string, unknown>;
  keyboardShortcuts: Record<string, string>;
  featureFlags: Record<string, boolean>;
}

export interface UIActions {
  setTheme: (theme: UIState['theme']) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setViewport: (viewport: { width: number; height: number }) => void;
  openModal: (modal: Omit<UIState['modals'][0], 'isOpen'>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  showToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  showAlert: (alert: Omit<UIState['alerts'][0], 'id'>) => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
  setLoading: (key: string, isLoading: boolean) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  setActiveSection: (section: string) => void;
  setUserPreference: (key: string, value: unknown) => void;
  loadUserPreferences: () => void;
  setFeatureFlag: (key: string, enabled: boolean) => void;
  toggleFeatureFlag: (key: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setLanguage: (language: string) => void;
  setTimezone: (timezone: string) => void;
  setDensity: (density: UIState['density']) => void;
  setRefreshInterval: (interval: number) => void;
  toggleAutoRefresh: () => void;
  setShowTooltips: (show: boolean) => void;
  setShowKeyboardShortcuts: (show: boolean) => void;
  setErrorReportingEnabled: (enabled: boolean) => void;
  initializeFromLocalStorage: () => void;
  handleResize: (viewport: { width: number; height: number }) => void;
}

const getInitialState = (): UIState => ({
  theme: 'auto',
  sidebarCollapsed: false,
  notificationsEnabled: true,
  soundEnabled: false,
  animationsEnabled: true,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  density: 'comfortable',
  errorReportingEnabled: true,
  autoRefreshEnabled: true,
  refreshInterval: 5000,
  showTooltips: true,
  showKeyboardShortcuts: true,
  sidebarWidth: 280,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  viewport: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  },
  modals: [],
  toasts: [],
  alerts: [],
  loadingStates: {},
  activeSection: 'dashboard',
  userPreferences: {},
  keyboardShortcuts: {
    'ctrl+k': 'Open command palette',
    'ctrl+/': 'Toggle keyboard shortcuts',
    'ctrl+r': 'Refresh data',
    'ctrl+d': 'Toggle dark mode',
    'ctrl+s': 'Save current view',
    'esc': 'Close modal or cancel action',
  },
  featureFlags: {
    advancedAnalytics: true,
    realTimeUpdates: true,
    exportFeatures: true,
    multiTenant: false,
    aiInsights: false,
  },
});

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  ...getInitialState(),

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('hivemind-theme', theme);
  },

  toggleDarkMode: () => {
    const themes: string[] = ['light', 'dark', 'high-contrast', 'auto'];
    const currentIndex = themes.indexOf(get().theme);
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % themes.length : 1;
    const newTheme = themes[nextIndex];
    set({ theme: newTheme });
    localStorage.setItem('hivemind-theme', newTheme);
  },

  toggleSidebar: () => {
    const collapsed = !get().sidebarCollapsed;
    set({ sidebarCollapsed: collapsed });
    localStorage.setItem('sidebarCollapsed', collapsed.toString());
  },

  setSidebarWidth: (width) => {
    const clamped = Math.max(200, Math.min(500, width));
    set({ sidebarWidth: clamped });
    localStorage.setItem('sidebarWidth', clamped.toString());
  },

  setViewport: (viewport) => {
    const { width } = viewport;
    set({
      viewport,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
    });
  },

  openModal: (modal) => {
    const newModal = { ...modal, isOpen: true };
    const modals = [...get().modals];
    const existingIndex = modals.findIndex((m) => m.id === modal.id);
    if (existingIndex !== -1) {
      modals[existingIndex] = newModal;
    } else {
      modals.push(newModal);
    }
    set({ modals });
  },

  closeModal: (id) => {
    set({ modals: get().modals.filter((m) => m.id !== id) });
  },

  closeAllModals: () => set({ modals: [] }),

  showToast: (toast) => {
    const newToast = { ...toast, id: Date.now().toString() };
    set({ toasts: [...get().toasts, newToast] });
  },

  dismissToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  clearAllToasts: () => set({ toasts: [] }),

  showAlert: (alert) => {
    const newAlert = { ...alert, id: Date.now().toString() };
    set({ alerts: [...get().alerts, newAlert] });
  },

  dismissAlert: (id) => {
    set({ alerts: get().alerts.filter((a) => a.id !== id) });
  },

  clearAllAlerts: () => set({ alerts: [] }),

  setLoading: (key, isLoading) => {
    set({ loadingStates: { ...get().loadingStates, [key]: isLoading } });
  },

  clearLoading: (key) => {
    const loadingStates = { ...get().loadingStates };
    delete loadingStates[key];
    set({ loadingStates });
  },

  clearAllLoading: () => set({ loadingStates: {} }),

  setActiveSection: (activeSection) => set({ activeSection }),

  setUserPreference: (key, value) => {
    const userPreferences = { ...get().userPreferences, [key]: value };
    set({ userPreferences });
    localStorage.setItem(`userPref_${key}`, JSON.stringify(value));
  },

  loadUserPreferences: () => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith('userPref_'));
    const userPreferences = { ...get().userPreferences };
    keys.forEach((key) => {
      const prefKey = key.replace('userPref_', '');
      try {
        const value = JSON.parse(localStorage.getItem(key) || '');
        userPreferences[prefKey] = value;
      } catch (e) {
        debug('ERROR:', `Failed to load user preference ${prefKey}:`, e);
      }
    });
    set({ userPreferences });
  },

  setFeatureFlag: (key, enabled) => {
    set({ featureFlags: { ...get().featureFlags, [key]: enabled } });
  },

  toggleFeatureFlag: (key) => {
    const featureFlags = { ...get().featureFlags, [key]: !get().featureFlags[key] };
    set({ featureFlags });
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
  },

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    localStorage.setItem('soundEnabled', soundEnabled.toString());
  },

  setAnimationsEnabled: (animationsEnabled) => {
    set({ animationsEnabled });
    localStorage.setItem('animationsEnabled', animationsEnabled.toString());
  },

  setLanguage: (language) => {
    set({ language });
    localStorage.setItem('language', language);
    document.documentElement.setAttribute('lang', language);
  },

  setTimezone: (timezone) => {
    set({ timezone });
    localStorage.setItem('timezone', timezone);
  },

  setDensity: (density) => {
    set({ density });
    localStorage.setItem('density', density);
    document.documentElement.setAttribute('data-density', density);
  },

  setRefreshInterval: (interval) => {
    const refreshInterval = Math.max(1000, interval);
    set({ refreshInterval });
    localStorage.setItem('refreshInterval', refreshInterval.toString());
  },

  toggleAutoRefresh: () => {
    const autoRefreshEnabled = !get().autoRefreshEnabled;
    set({ autoRefreshEnabled });
    localStorage.setItem('autoRefreshEnabled', autoRefreshEnabled.toString());
  },

  setShowTooltips: (showTooltips) => {
    set({ showTooltips });
    localStorage.setItem('showTooltips', showTooltips.toString());
  },

  setShowKeyboardShortcuts: (showKeyboardShortcuts) => {
    set({ showKeyboardShortcuts });
    localStorage.setItem('showKeyboardShortcuts', showKeyboardShortcuts.toString());
  },

  setErrorReportingEnabled: (errorReportingEnabled) => {
    set({ errorReportingEnabled });
    localStorage.setItem('errorReportingEnabled', errorReportingEnabled.toString());
  },

  initializeFromLocalStorage: () => {
    const updates: Partial<UIState> = {};

    const settings: Array<[keyof UIState, string, 'bool' | 'int' | 'str']> = [
      ['theme', 'hivemind-theme', 'str'],
      ['sidebarCollapsed', 'sidebarCollapsed', 'bool'],
      ['notificationsEnabled', 'notificationsEnabled', 'bool'],
      ['soundEnabled', 'soundEnabled', 'bool'],
      ['animationsEnabled', 'animationsEnabled', 'bool'],
      ['language', 'language', 'str'],
      ['timezone', 'timezone', 'str'],
      ['dateFormat', 'dateFormat', 'str'],
      ['timeFormat', 'timeFormat', 'str'],
      ['density', 'density', 'str'],
      ['errorReportingEnabled', 'errorReportingEnabled', 'bool'],
      ['autoRefreshEnabled', 'autoRefreshEnabled', 'bool'],
      ['refreshInterval', 'refreshInterval', 'int'],
      ['showTooltips', 'showTooltips', 'bool'],
      ['showKeyboardShortcuts', 'showKeyboardShortcuts', 'bool'],
      ['sidebarWidth', 'sidebarWidth', 'int'],
    ];

    settings.forEach(([field, storageKey, type]) => {
      const value = localStorage.getItem(storageKey);
      if (value !== null) {
        try {
          if (type === 'bool') {
            (updates as any)[field] = value === 'true';
          } else if (type === 'int') {
            (updates as any)[field] = parseInt(value, 10);
          } else {
            (updates as any)[field] = value;
          }
        } catch (e) {
          debug('ERROR:', `Failed to load setting ${field}:`, e);
        }
      }
    });

    if (Object.keys(updates).length > 0) {
      set(updates);
    }

    const state = { ...get(), ...updates };
    document.documentElement.setAttribute('data-theme', state.theme === 'auto' ? 'light' : (state.theme as string));
    document.documentElement.setAttribute('lang', state.language);
    document.documentElement.setAttribute('data-density', state.density);
  },

  handleResize: (viewport) => {
    const { width } = viewport;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const sidebarCollapsed = isMobile && !get().sidebarCollapsed ? true : get().sidebarCollapsed;
    set({ viewport, isMobile, isTablet, isDesktop, sidebarCollapsed });
  },
}));

// Initialize from localStorage on first load
if (typeof window !== 'undefined') {
  useUIStore.getState().initializeFromLocalStorage();
}

// Selector helpers (match old Redux selector API surface)
export const selectTheme = (s: UIState) => s.theme;
export const selectUI = (s: UIState) => s;
export const selectSidebarCollapsed = (s: UIState) => s.sidebarCollapsed;
export const selectIsMobile = (s: UIState) => s.isMobile;
export const selectIsTablet = (s: UIState) => s.isTablet;
export const selectIsDesktop = (s: UIState) => s.isDesktop;
export const selectModals = (s: UIState) => s.modals;
export const selectToasts = (s: UIState) => s.toasts;
export const selectAlerts = (s: UIState) => s.alerts;
export const selectLoadingStates = (s: UIState) => s.loadingStates;
export const selectFeatureFlags = (s: UIState) => s.featureFlags;
export const selectAutoRefreshEnabled = (s: UIState) => s.autoRefreshEnabled;
export const selectRefreshInterval = (s: UIState) => s.refreshInterval;
