import { useState, useEffect, useRef } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINT_VALUES: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINT_VALUES['2xl']) return '2xl';
  if (width >= BREAKPOINT_VALUES.xl) return 'xl';
  if (width >= BREAKPOINT_VALUES.lg) return 'lg';
  if (width >= BREAKPOINT_VALUES.md) return 'md';
  if (width >= BREAKPOINT_VALUES.sm) return 'sm';
  return 'xs';
}

/**
 * Returns the current Tailwind/DaisyUI breakpoint, updated on window resize
 * with a debounce to avoid excessive re-renders.
 */
export const useBreakpoint = (debounceMs = 150): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'md',
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setBreakpoint(getBreakpoint(window.innerWidth));
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);
    // Set initial value
    setBreakpoint(getBreakpoint(window.innerWidth));

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [debounceMs]);

  return breakpoint;
};

/** Returns true when the current breakpoint is below the given breakpoint. */
export const useIsBelowBreakpoint = (bp: Breakpoint, debounceMs = 150): boolean => {
  const current = useBreakpoint(debounceMs);
  const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  return order.indexOf(current) < order.indexOf(bp);
};

/** Reactive CSS media-query hook using the native matchMedia API. */
export const useMediaQuery = (query: { maxWidth?: number; minWidth?: number }): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(
      query.maxWidth
        ? `(max-width: ${query.maxWidth}px)`
        : query.minWidth
          ? `(min-width: ${query.minWidth}px)`
          : '',
    );

    setMatches(mediaQueryList.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query.maxWidth, query.minWidth]);

  return matches;
};
