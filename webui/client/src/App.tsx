import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ReduxProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ReduxProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
