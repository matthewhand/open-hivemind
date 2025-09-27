import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import ErrorBoundary from './ErrorBoundary';

// Create a default theme that doesn't depend on Redux state
const defaultTheme = createTheme({
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
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#6b6b6b #ffffff',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#ffffff',
            width: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#959595',
            minHeight: 24,
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#6b6b6b',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#6b6b6b',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            backgroundColor: '#ffffff',
          },
        },
      },
    },
  },
});

const ReduxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simple fallback that just renders the children with basic theming
  // This avoids any Redux dependency issues
  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default ReduxProvider;