import React, { createContext, useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setTheme } from '../store/slices/uiSlice';
import { selectUI } from '../store/slices/uiSlice';

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'auto';

interface ThemeEngineContextType {
  currentTheme: ThemeMode;
  setCurrentTheme: (theme: ThemeMode) => void;
  isAutoMode: boolean;
  systemPreference: 'light' | 'dark';
}

export const ThemeEngineContext = createContext<ThemeEngineContextType | undefined>(undefined);
export type { ThemeMode };

interface ThemeEngineProviderProps {
  children: React.ReactNode;
}

const createCustomTheme = (mode: 'light' | 'dark' | 'high-contrast'): Theme => {
  const basePalette = mode === 'dark' 
    ? {
        primary: { main: '#90caf9', light: '#bbdefb', dark: '#42a5f5' },
        secondary: { main: '#f48fb1', light: '#f8bbd9', dark: '#f06292' },
        background: { default: '#121212', paper: '#1e1e1e' },
        text: { primary: '#ffffff', secondary: '#b3b3b3' },
        divider: 'rgba(255, 255, 255, 0.12)',
      }
    : mode === 'high-contrast'
    ? {
        primary: { main: '#000000', light: '#333333', dark: '#000000' },
        secondary: { main: '#666666', light: '#999999', dark: '#333333' },
        background: { default: '#ffffff', paper: '#f5f5f5' },
        text: { primary: '#000000', secondary: '#333333' },
        divider: '#000000',
      }
    : {
        primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
        secondary: { main: '#dc004e', light: '#ff5983', dark: '#9a0036' },
        background: { default: '#f5f5f5', paper: '#ffffff' },
        text: { primary: '#333333', secondary: '#666666' },
        divider: 'rgba(0, 0, 0, 0.12)',
      };

  return createTheme({
    palette: {
      mode: mode === 'high-contrast' ? 'light' : mode,
      ...basePalette,
      action: {
        active: mode === 'high-contrast' ? '#000000' : 'rgba(0, 0, 0, 0.54)',
        hover: mode === 'high-contrast' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        selected: mode === 'high-contrast' ? 'rgba(0, 0, 0, 0.16)' : 'rgba(0, 0, 0, 0.08)',
        disabled: mode === 'high-contrast' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(0, 0, 0, 0.26)',
        disabledBackground: mode === 'high-contrast' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 600, letterSpacing: '-0.01em' },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.5 },
    },
    shape: {
      borderRadius: mode === 'high-contrast' ? 0 : 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: mode === 'high-contrast' ? 0 : 6,
            boxShadow: mode === 'high-contrast' ? '0 0 0 2px currentColor' : 'none',
            '&:hover': {
              boxShadow: mode === 'high-contrast' ? '0 0 0 3px currentColor' : 'none',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: mode === 'high-contrast' ? 0 : 12,
            boxShadow: mode === 'high-contrast' 
              ? '0 0 0 2px #000000' 
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: mode === 'high-contrast' ? '2px solid #000000' : 'none',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: mode === 'high-contrast' ? 0 : 6,
              '& fieldset': {
                borderWidth: mode === 'high-contrast' ? 2 : 1,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: mode === 'high-contrast' ? 0 : 16,
            fontWeight: mode === 'high-contrast' ? 700 : 500,
          },
        },
      },
    },
  });
};

export const ThemeEngineProvider: React.FC<ThemeEngineProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const uiState = useAppSelector(selectUI);
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Detect system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Determine effective theme
  const effectiveTheme = uiState.theme === 'auto' 
    ? systemPreference 
    : uiState.theme;

  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(uiState.theme);

  useEffect(() => {
    setCurrentTheme(uiState.theme);
    setIsAutoMode(uiState.theme === 'auto');
  }, [uiState.theme]);

  useEffect(() => {
    // Apply theme to document for CSS custom properties
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute('data-high-contrast', 
      effectiveTheme === 'high-contrast' ? 'true' : 'false'
    );
  }, [effectiveTheme]);

  const handleThemeChange = (theme: ThemeMode) => {
    dispatch(setTheme(theme));
  };

  const theme = createCustomTheme(effectiveTheme as 'light' | 'dark' | 'high-contrast');

  return (
    <ThemeEngineContext.Provider
      value={{
        currentTheme,
        setCurrentTheme: handleThemeChange,
        isAutoMode,
        systemPreference,
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeEngineContext.Provider>
  );
};

export default ThemeEngineProvider;