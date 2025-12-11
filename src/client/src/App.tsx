import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import ToastNotification from './components/DaisyUI/ToastNotification';
import { BotProvider } from './contexts/BotContext';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ReduxProvider>
          <ToastNotification position="top-right" maxToasts={5}>
            <AuthProvider>
              <BotProvider>
                <BrowserRouter>
                  <AppRouter />
                </BrowserRouter>
              </BotProvider>
            </AuthProvider>
          </ToastNotification>
        </ReduxProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
