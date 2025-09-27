import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store';
import ReduxProvider from './components/ReduxProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './router/AppRouter';
import { createTheme } from '@mui/material/styles';
import Screensaver from './components/Screensaver';

function App() {
  // Create a basic theme for the application
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
  });

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ReduxProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <AppRouter />
              {/* Screensaver overlay (auto idle) */}
              <Screensaver 
                enabled={process.env.REACT_APP_SCREENSAVER_ENABLED !== 'false'} 
                timeoutMs={Number(process.env.REACT_APP_SCREENSAVER_TIMEOUT_MS) || 300000} 
              />
            </BrowserRouter>
          </ThemeProvider>
        </ReduxProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
