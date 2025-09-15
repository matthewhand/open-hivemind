import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { createTheme } from '@mui/material/styles';
import ErrorBoundary from './ErrorBoundary';

const ReduxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppSelector(state => state.ui.theme);
  
  // Create theme based on user preference
  const muiTheme = createTheme({
    palette: {
      mode: theme === 'dark' ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: theme === 'dark' ? '#6b6b6b #2b2b2b' : '#6b6b6b #ffffff',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              backgroundColor: theme === 'dark' ? '#2b2b2b' : '#ffffff',
              width: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: theme === 'dark' ? '#6b6b6b' : '#959595',
              minHeight: 24,
            },
            '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
              backgroundColor: theme === 'dark' ? '#959595' : '#6b6b6b',
            },
            '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
              backgroundColor: theme === 'dark' ? '#959595' : '#959595',
            },
            '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
              backgroundColor: theme === 'dark' ? '#959595' : '#6b6b6b',
            },
            '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
              backgroundColor: theme === 'dark' ? '#2b2b2b' : '#ffffff',
            },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default ReduxProvider;