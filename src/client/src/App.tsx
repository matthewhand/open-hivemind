import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import ToastNotification from './components/DaisyUI/ToastNotification';
import { BotProvider } from './contexts/BotContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from 'react-hot-toast';
import { IntegrationProvider } from './components/IntegrationLoader';
import KeyboardShortcutsProvider from './components/KeyboardShortcutsProvider';

function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <Provider store={store}>
        <ReduxProvider>
          <ToastNotification position="top-right" maxToasts={5}>
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
          </ToastNotification>
        </ReduxProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
