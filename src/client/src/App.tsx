import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ToastNotification from './components/DaisyUI/ToastNotification';
import PWAProvider from './pwa/PWAProvider';
import I18nProvider from './i18n/I18nProvider';
import CacheProvider from './cache/CacheProvider';
import MultiTenantProvider from './enterprise/MultiTenantProvider';
import AuditTrailProvider from './enterprise/AuditTrailProvider';
import RBACProvider from './enterprise/RBACProvider';
import SecurityProvider from './enterprise/SecurityProvider';
import SmartNotificationSystem from './notifications/SmartNotificationSystem';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ReduxProvider>
          <PWAProvider>
            <I18nProvider>
              <CacheProvider>
                <SmartNotificationSystem>
                  <MultiTenantProvider>
                    <RBACProvider>
                      <SecurityProvider>
                        <AuditTrailProvider>
                          <ToastNotification.Provider position="top-right" maxToasts={5}>
                            <AuthProvider>
                              <WebSocketProvider>
                                <BrowserRouter>
                                  <AppRouter />
                                </BrowserRouter>
                              </WebSocketProvider>
                            </AuthProvider>
                          </ToastNotification.Provider>
                        </AuditTrailProvider>
                      </SecurityProvider>
                    </RBACProvider>
                  </MultiTenantProvider>
                </SmartNotificationSystem>
              </CacheProvider>
            </I18nProvider>
          </PWAProvider>
        </ReduxProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
