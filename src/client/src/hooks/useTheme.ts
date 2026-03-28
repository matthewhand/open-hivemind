import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme as setThemeAction, selectTheme } from '../store/slices/uiSlice';

const STORAGE_KEY = 'hivemind-theme';

type ThemeValue = 'light' | 'dark' | 'high-contrast' | 'auto';

function resolveEffectiveTheme(theme: ThemeValue, systemPreference: 'light' | 'dark'): string {
  if (theme === 'auto') return systemPreference;
  return theme;
}

/**
 * Central hook for dark-mode persistence with system-preference detection.
 *
 * Provides:
 *  - theme        the raw stored value ('light' | 'dark' | 'high-contrast' | 'auto')
 *  - setTheme     persist a new theme choice
 *  - isDark       whether the *effective* theme is dark (resolves 'auto')
 *  - toggleDark   quick toggle between light and dark
 */
export function useTheme() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);

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
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable (private browsing, quota)
    }
  }, [effectiveTheme, theme]);

  // When in 'auto' mode and OS preference changes, update the attribute reactively
  // (handled by the effectiveTheme dep above)

  const setTheme = useCallback(
    (next: ThemeValue) => {
      dispatch(setThemeAction(next));
    },
    [dispatch],
  );

  const isDark = effectiveTheme === 'dark';

  const toggleDark = useCallback(() => {
    // If currently auto, resolve to opposite of current effective then make it explicit
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
  }, [isDark, setTheme]);

  return { theme, setTheme, isDark, toggleDark } as const;
}

export default useTheme;
