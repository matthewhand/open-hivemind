import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUIStore } from '../store/uiStore';

const STORAGE_KEY = 'hivemind-theme';

export type ThemeValue = string;

function resolveEffectiveTheme(theme: ThemeValue, systemPreference: 'light' | 'dark'): string {
  if (theme === 'auto') return systemPreference;
  return theme;
}

/**
 * Central hook for dark-mode persistence with system-preference detection.
 *
 * Provides:
 *  - theme        the raw stored value
 *  - setTheme     persist a new theme choice
 *  - isDark       whether the *effective* theme is dark (resolves 'auto')
 *  - toggleDark   quick toggle between light and dark
 */
export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const setThemeAction = useUIStore((s) => s.setTheme);

  // Track the OS color scheme
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  // Listen for OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPreference(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme(theme, systemPreference),
    [theme, systemPreference],
  );

  // Keep <html data-theme> and localStorage in sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute(
      'data-high-contrast',
      effectiveTheme === 'high-contrast' ? 'true' : 'false',
    );
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable (private browsing, quota)
    }
  }, [effectiveTheme, theme]);

  const setTheme = useCallback(
    (next: ThemeValue) => {
      setThemeAction(next);
    },
    [setThemeAction],
  );

  const isDark = effectiveTheme === 'dark';

  const toggleDark = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
  }, [isDark, setTheme]);

  return { theme, setTheme, isDark, toggleDark } as const;
}

export default useTheme;
