import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store/store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import HydrationErrorBoundary from './store/hydrationErrorBoundary';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import ToastNotification from './components/DaisyUI/ToastNotification';
import { BotProvider } from './contexts/BotContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ScrollToTop from './components/ScrollToTop';
import { IntegrationProvider } from './components/IntegrationLoader';
import KeyboardShortcutsProvider from './components/KeyboardShortcutsProvider';
import { useTheme } from './hooks/useTheme';
import SavedStampProvider from './contexts/SavedStampContext';

// Lazy-load React Query devtools so the bundle isn't shipped to production
// users. Vite tree-shakes the import out entirely when DEV is false.
const ReactQueryDevtools =
  import.meta.env.DEV && import.meta.env.VITE_SHOW_DEVTOOLS === 'true'
    ? React.lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
      )
    : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Keeps data-theme, localStorage, and system-preference listener in sync.
 * Must be rendered inside the Redux Provider so useTheme can read the store.
 */
function ThemeSync({ children }: { children: React.ReactNode }) {
  // Activating the hook is enough: it sets up the side-effects.
  useTheme();
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <HydrationErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <ReduxProvider>
              <ThemeSync>
                <ToastNotification position="bottom-right" maxToasts={5}>
                  <SavedStampProvider>
                  <AuthProvider>
                    <BotProvider>
                      <WebSocketProvider>
                        <IntegrationProvider>
                          <BrowserRouter>
                            <ScrollToTop />
                            <KeyboardShortcutsProvider />
                            <AppRouter />
                          </BrowserRouter>
                        </IntegrationProvider>
                      </WebSocketProvider>
                    </BotProvider>
                  </AuthProvider>
                </SavedStampProvider>
                </ToastNotification>
              </ThemeSync>
            </ReduxProvider>
          </Provider>
          {ReactQueryDevtools && (
            <React.Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </React.Suspense>
          )}
        </QueryClientProvider>
      </HydrationErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;
