import React, { createContext, useEffect, useState } from 'react';
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

  return (
    <ThemeEngineContext.Provider
      value={{
        currentTheme,
        setCurrentTheme: handleThemeChange,
        isAutoMode,
        systemPreference,
      }}
    >
      {children}
    </ThemeEngineContext.Provider>
  );
};

export default ThemeEngineProvider;