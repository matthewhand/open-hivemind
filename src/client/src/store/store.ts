import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './slices/apiSlice';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import configReducer from './slices/configSlice';
import errorReducer from './slices/errorSlice';
import uiReducer from './slices/uiSlice';
import performanceReducer from './slices/performanceSlice';
import websocketReducer from './slices/websocketSlice';
import { loadState, saveState } from './stateVersioning';
import { OfflineActionQueue, createOfflineMiddleware } from './offlineQueue';

const rootReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,
  auth: authReducer,
  dashboard: dashboardReducer,
  config: configReducer,
  error: errorReducer,
  ui: uiReducer,
  performance: performanceReducer,
  websocket: websocketReducer,
});

// --- Offline queue instance (singleton) ---
export const offlineQueue = new OfflineActionQueue();

export const setupStore = (preloadedState?: Partial<RootState>) => {
  // Merge persisted state (if any) under any explicitly provided preloaded state.
  const persisted = loadState();
  const merged = persisted
    ? { ...persisted, ...preloadedState } as Partial<RootState>
    : preloadedState;

  return configureStore({
    reducer: rootReducer,
    preloadedState: merged,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      })
        .concat(apiSlice.middleware)
        .concat(createOfflineMiddleware(offlineQueue)),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export const store = setupStore();

// Persist state on every change.
store.subscribe(() => {
  saveState(store.getState() as unknown as Record<string, unknown>);
});

// Start listening for online/offline events to replay queued actions.
offlineQueue.startListening(store.dispatch);

setupListeners(store.dispatch);

// Initialize UI state from localStorage
const initializeApp = () => {
  // Load theme from the canonical 'hivemind-theme' key.
  // Fall back to 'auto' so that system preference is respected on first visit.
  const savedTheme = (localStorage.getItem('hivemind-theme') as 'light' | 'dark' | 'high-contrast' | 'auto') || 'auto';
  store.dispatch({ type: 'ui/setTheme', payload: savedTheme });

  // Load other settings
  const settings = [
    'sidebarCollapsed',
    'notificationsEnabled',
    'soundEnabled',
    'animationsEnabled',
    'showTooltips',
    'showKeyboardShortcuts',
    'errorReportingEnabled',
    'autoRefreshEnabled',
  ];

  settings.forEach(setting => {
    const value = localStorage.getItem(setting);
    if (value !== null) {
      try {
        const parsedValue = setting.includes('Enabled') || setting.includes('Collapsed')
          ? value === 'true'
          : setting === 'refreshInterval' || setting === 'sidebarWidth'
            ? parseInt(value, 10)
            : value;

        store.dispatch({
          type: `ui/set${setting.charAt(0).toUpperCase() + setting.slice(1)}`,
          payload: parsedValue,
        });
      } catch (e) {
        console.error(`Failed to load setting ${setting}:`, e);
      }
    }
  });
};

// Initialize on store creation
initializeApp();

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
