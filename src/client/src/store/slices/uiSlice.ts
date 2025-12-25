import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  theme: 'light' | 'dark' | 'high-contrast' | 'auto';
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
  breadcrumbs: Array<{
    label: string;
    path: string;
    icon?: string;
  }>;
  activeSection: string;
  userPreferences: Record<string, unknown>;
  keyboardShortcuts: Record<string, string>;
  featureFlags: Record<string, boolean>;
}

const initialState: UIState = {
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
    width: window.innerWidth,
    height: window.innerHeight,
  },
  modals: [],
  toasts: [],
  alerts: [],
  loadingStates: {},
  breadcrumbs: [],
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
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme management
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      document.documentElement.setAttribute('data-theme', action.payload);
    },
    
    toggleDarkMode: (state) => {
      const themes: UIState['theme'][] = ['light', 'dark', 'high-contrast', 'auto'];
      const currentIndex = themes.indexOf(state.theme);
      const nextIndex = (currentIndex + 1) % themes.length;
      state.theme = themes[nextIndex];
      localStorage.setItem('theme', state.theme);
      document.documentElement.setAttribute('data-theme', state.theme);
    },
    
    // Sidebar management
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', state.sidebarCollapsed.toString());
    },
    
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = Math.max(200, Math.min(500, action.payload));
      localStorage.setItem('sidebarWidth', state.sidebarWidth.toString());
    },
    
    // Viewport management
    setViewport: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.viewport = action.payload;
      
      // Update device type based on viewport
      const { width } = action.payload;
      state.isMobile = width < 768;
      state.isTablet = width >= 768 && width < 1024;
      state.isDesktop = width >= 1024;
    },
    
    // Modal management
    openModal: (state, action: PayloadAction<Omit<UIState['modals'][0], 'isOpen'>>) => {
      const modal = { ...action.payload, isOpen: true };
      const existingIndex = state.modals.findIndex(m => m.id === action.payload.id);
      
      if (existingIndex !== -1) {
        state.modals[existingIndex] = modal;
      } else {
        state.modals.push(modal);
      }
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(m => m.id !== action.payload);
    },
    
    closeAllModals: (state) => {
      state.modals = [];
    },
    
    // Toast management
    showToast: (state, action: PayloadAction<Omit<UIState['toasts'][0], 'id'>>) => {
      const toast = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.toasts.push(toast);
    },
    
    dismissToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    
    clearAllToasts: (state) => {
      state.toasts = [];
    },

    // Alert management
    showAlert: (state, action: PayloadAction<Omit<UIState['alerts'][0], 'id'>>) => {
      const alert = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.alerts.push(alert);
    },

    dismissAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },

    clearAllAlerts: (state) => {
      state.alerts = [];
    },

    // Loading states
    setLoading: (state, action: PayloadAction<{ key: string; isLoading: boolean }>) => {
      state.loadingStates[action.payload.key] = action.payload.isLoading;
    },
    
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loadingStates[action.payload];
    },
    
    clearAllLoading: (state) => {
      state.loadingStates = {};
    },
    
    // Breadcrumbs
    setBreadcrumbs: (state, action: PayloadAction<UIState['breadcrumbs']>) => {
      state.breadcrumbs = action.payload;
    },
    
    addBreadcrumb: (state, action: PayloadAction<UIState['breadcrumbs'][0]>) => {
      const exists = state.breadcrumbs.some(crumb => crumb.path === action.payload.path);
      if (!exists) {
        state.breadcrumbs.push(action.payload);
      }
    },
    
    removeBreadcrumb: (state, action: PayloadAction<string>) => {
      state.breadcrumbs = state.breadcrumbs.filter(crumb => crumb.path !== action.payload);
    },
    
    // Active section
    setActiveSection: (state, action: PayloadAction<string>) => {
      state.activeSection = action.payload;
    },
    
    // User preferences
    setUserPreference: (state, action: PayloadAction<{ key: string; value: unknown }>) => {
      state.userPreferences[action.payload.key] = action.payload.value;
      localStorage.setItem(`userPref_${action.payload.key}`, JSON.stringify(action.payload.value));
    },
    
    loadUserPreferences: (state) => {
      // Load from localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('userPref_'));
      keys.forEach(key => {
        const prefKey = key.replace('userPref_', '');
        try {
          const value = JSON.parse(localStorage.getItem(key) || '');
          state.userPreferences[prefKey] = value;
        } catch (e) {
          console.error(`Failed to load user preference ${prefKey}:`, e);
        }
      });
    },
    
    // Feature flags
    setFeatureFlag: (state, action: PayloadAction<{ key: string; enabled: boolean }>) => {
      state.featureFlags[action.payload.key] = action.payload.enabled;
    },
    
    toggleFeatureFlag: (state, action: PayloadAction<string>) => {
      state.featureFlags[action.payload] = !state.featureFlags[action.payload];
    },
    
    // UI preferences
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
      localStorage.setItem('notificationsEnabled', action.payload.toString());
    },
    
    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.soundEnabled = action.payload;
      localStorage.setItem('soundEnabled', action.payload.toString());
    },
    
    setAnimationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.animationsEnabled = action.payload;
      localStorage.setItem('animationsEnabled', action.payload.toString());
    },
    
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
      document.documentElement.setAttribute('lang', action.payload);
    },
    
    setTimezone: (state, action: PayloadAction<string>) => {
      state.timezone = action.payload;
      localStorage.setItem('timezone', action.payload);
    },
    
    setDensity: (state, action: PayloadAction<UIState['density']>) => {
      state.density = action.payload;
      localStorage.setItem('density', action.payload);
      document.documentElement.setAttribute('data-density', action.payload);
    },
    
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = Math.max(1000, action.payload); // Minimum 1 second
      localStorage.setItem('refreshInterval', state.refreshInterval.toString());
    },
    
    toggleAutoRefresh: (state) => {
      state.autoRefreshEnabled = !state.autoRefreshEnabled;
      localStorage.setItem('autoRefreshEnabled', state.autoRefreshEnabled.toString());
    },
    
    // Accessibility
    setShowTooltips: (state, action: PayloadAction<boolean>) => {
      state.showTooltips = action.payload;
      localStorage.setItem('showTooltips', action.payload.toString());
    },
    
    setShowKeyboardShortcuts: (state, action: PayloadAction<boolean>) => {
      state.showKeyboardShortcuts = action.payload;
      localStorage.setItem('showKeyboardShortcuts', action.payload.toString());
    },
    
    // Error reporting
    setErrorReportingEnabled: (state, action: PayloadAction<boolean>) => {
      state.errorReportingEnabled = action.payload;
      localStorage.setItem('errorReportingEnabled', action.payload.toString());
    },
    
    // Initialize from localStorage
    initializeFromLocalStorage: (state) => {
      const settings = [
        'theme',
        'sidebarCollapsed',
        'notificationsEnabled',
        'soundEnabled',
        'animationsEnabled',
        'language',
        'timezone',
        'dateFormat',
        'timeFormat',
        'density',
        'errorReportingEnabled',
        'autoRefreshEnabled',
        'refreshInterval',
        'showTooltips',
        'showKeyboardShortcuts',
        'sidebarWidth',
      ];
      
      settings.forEach(setting => {
        const value = localStorage.getItem(setting);
        if (value !== null) {
          try {
            if (setting === 'sidebarCollapsed' || 
                setting === 'notificationsEnabled' || 
                setting === 'soundEnabled' || 
                setting === 'animationsEnabled' || 
                setting === 'errorReportingEnabled' || 
                setting === 'autoRefreshEnabled' || 
                setting === 'showTooltips' || 
                setting === 'showKeyboardShortcuts') {
              (state as any)[setting] = value === 'true';
            } else if (setting === 'refreshInterval' || setting === 'sidebarWidth') {
              (state as any)[setting] = parseInt(value, 10);
            } else {
              (state as any)[setting] = value;
            }
          } catch (e) {
            console.error(`Failed to load setting ${setting}:`, e);
          }
        }
      });
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', state.theme);
      document.documentElement.setAttribute('lang', state.language);
      document.documentElement.setAttribute('data-density', state.density);
    },
    
    // Responsive behavior
    handleResize: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.viewport = action.payload;
      
      const { width } = action.payload;
      state.isMobile = width < 768;
      state.isTablet = width >= 768 && width < 1024;
      state.isDesktop = width >= 1024;
      
      // Auto-collapse sidebar on mobile
      if (state.isMobile && !state.sidebarCollapsed) {
        state.sidebarCollapsed = true;
      }
    },
  },
});

export const {
  setTheme,
  toggleDarkMode,
  toggleSidebar,
  setSidebarWidth,
  setViewport,
  openModal,
  closeModal,
  closeAllModals,
  showToast,
  dismissToast,
  clearAllToasts,
  showAlert,
  dismissAlert,
  clearAllAlerts,
  setLoading,
  clearLoading,
  clearAllLoading,
  setBreadcrumbs,
  addBreadcrumb,
  removeBreadcrumb,
  setActiveSection,
  setUserPreference,
  loadUserPreferences,
  setFeatureFlag,
  toggleFeatureFlag,
  setNotificationsEnabled,
  setSoundEnabled,
  setAnimationsEnabled,
  setLanguage,
  setTimezone,
  setDensity,
  setRefreshInterval,
  toggleAutoRefresh,
  setShowTooltips,
  setShowKeyboardShortcuts,
  setErrorReportingEnabled,
  initializeFromLocalStorage,
  handleResize,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectIsDarkMode = (state: { ui: UIState }) => state.ui.theme === 'dark';
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectNotificationsEnabled = (state: { ui: UIState }) => state.ui.notificationsEnabled;
export const selectSoundEnabled = (state: { ui: UIState }) => state.ui.soundEnabled;
export const selectAnimationsEnabled = (state: { ui: UIState }) => state.ui.animationsEnabled;
export const selectLanguage = (state: { ui: UIState }) => state.ui.language;
export const selectTimezone = (state: { ui: UIState }) => state.ui.timezone;
export const selectDateFormat = (state: { ui: UIState }) => state.ui.dateFormat;
export const selectTimeFormat = (state: { ui: UIState }) => state.ui.timeFormat;
export const selectDensity = (state: { ui: UIState }) => state.ui.density;
export const selectErrorReportingEnabled = (state: { ui: UIState }) => state.ui.errorReportingEnabled;
export const selectAutoRefreshEnabled = (state: { ui: UIState }) => state.ui.autoRefreshEnabled;
export const selectRefreshInterval = (state: { ui: UIState }) => state.ui.refreshInterval;
export const selectShowTooltips = (state: { ui: UIState }) => state.ui.showTooltips;
export const selectShowKeyboardShortcuts = (state: { ui: UIState }) => state.ui.showKeyboardShortcuts;
export const selectSidebarWidth = (state: { ui: UIState }) => state.ui.sidebarWidth;
export const selectIsMobile = (state: { ui: UIState }) => state.ui.isMobile;
export const selectIsTablet = (state: { ui: UIState }) => state.ui.isTablet;
export const selectIsDesktop = (state: { ui: UIState }) => state.ui.isDesktop;
export const selectViewport = (state: { ui: UIState }) => state.ui.viewport;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectAlerts = (state: { ui: UIState }) => state.ui.alerts;
export const selectLoadingStates = (state: { ui: UIState }) => state.ui.loadingStates;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectActiveSection = (state: { ui: UIState }) => state.ui.activeSection;
export const selectUserPreferences = (state: { ui: UIState }) => state.ui.userPreferences;
export const selectKeyboardShortcuts = (state: { ui: UIState }) => state.ui.keyboardShortcuts;
export const selectFeatureFlags = (state: { ui: UIState }) => state.ui.featureFlags;

// Computed selectors
export const selectIsModalOpen = (modalId: string) => (state: { ui: UIState }) =>
  state.ui.modals.some(modal => modal.id === modalId && modal.isOpen);

export const selectOpenModals = (state: { ui: UIState }) =>
  state.ui.modals.filter(modal => modal.isOpen);

export const selectIsLoading = (key: string) => (state: { ui: UIState }) =>
  state.ui.loadingStates[key] || false;

export const selectAnyLoading = (state: { ui: UIState }) =>
  Object.values(state.ui.loadingStates).some(isLoading => isLoading);

export const selectFeatureFlag = (flag: string) => (state: { ui: UIState }) =>
  state.ui.featureFlags[flag] || false;

export const selectIsFeatureEnabled = (feature: string) => (state: { ui: UIState }) =>
  state.ui.featureFlags[feature] === true;

export const selectDeviceType = (state: { ui: UIState }) => {
  if (state.ui.isMobile) {return 'mobile';}
  if (state.ui.isTablet) {return 'tablet';}
  return 'desktop';
};

export const selectUIConfig = (state: { ui: UIState }) => ({
  theme: state.ui.theme,
  density: state.ui.density,
  animationsEnabled: state.ui.animationsEnabled,
  showTooltips: state.ui.showTooltips,
  language: state.ui.language,
  timezone: state.ui.timezone,
  dateFormat: state.ui.dateFormat,
  timeFormat: state.ui.timeFormat,
});
