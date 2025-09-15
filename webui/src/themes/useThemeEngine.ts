import { useContext } from 'react';
import { ThemeEngineContext, ThemeMode } from './ThemeEngine';

export const useThemeEngine = () => {
  const context = useContext(ThemeEngineContext);
  if (!context) {
    throw new Error('useThemeEngine must be used within a ThemeEngineProvider');
  }
  return context;
};

export type { ThemeMode };