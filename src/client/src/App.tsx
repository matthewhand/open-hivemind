import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </HydrationErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;
