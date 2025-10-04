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

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ReduxProvider>
          <ToastNotification.Provider position="top-right" maxToasts={5}>
            <AuthProvider>
              <WebSocketProvider>
                <BrowserRouter>
                  <AppRouter />
                </BrowserRouter>
              </WebSocketProvider>
            </AuthProvider>
          </ToastNotification.Provider>
        </ReduxProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
