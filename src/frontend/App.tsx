import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router/AppRouter';
import { ThemeEngineProvider } from './contexts/ThemeEngine';

function App() {
  return (
    <ErrorBoundary>
      <ThemeEngineProvider>
        <Provider store={store}>
          <ReduxProvider>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </ReduxProvider>
        </Provider>
      </ThemeEngineProvider>
    </ErrorBoundary>
  );
}

export default App;
