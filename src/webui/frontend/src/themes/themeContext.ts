import { createContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'high-contrast' | 'auto';

export interface ThemeEngineContextType {
  currentTheme: ThemeMode;
  setCurrentTheme: (theme: ThemeMode) => void;
  isAutoMode: boolean;
  systemPreference: 'light' | 'dark';
}

export const ThemeEngineContext = createContext<ThemeEngineContextType | undefined>(undefined);