import { useState, useEffect } from 'react';

/**
 * Tailwind/DaisyUI breakpoint values (in pixels)
 * These match the default Tailwind breakpoints used throughout the app.
 *
 * @see https://tailwindcss.com/docs/responsive-design
 */
export const BREAKPOINTS = {
  /** Extra small devices - phones in portrait mode (0px - 639px) */
  mobile: 0,
  /** Small devices - phones in landscape, small tablets (640px - 767px) */
  sm: 640,
  /** Medium devices - tablets (768px - 1023px) */
  md: 768,
  /** Large devices - laptops (1024px - 1279px) */
  lg: 1024,
  /** Extra large devices - desktops (1280px - 1535px) */
  xl: 1280,
  /** 2X large devices - large desktops (1536px+) */
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Hook to detect current screen size and return convenient boolean flags
 * for responsive design.
 *
 * @returns Object with isMobile, isTablet, and isDesktop boolean flags
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useMediaQuery();
 *
 * return (
 *   <div>
 *     {isMobile && <MobileNav />}
 *     {isDesktop && <DesktopNav />}
 *   </div>
 * );
 * ```
 */
export const useMediaQuery = () => {
  const [screenSize, setScreenSize] = useState<{
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    width: number;
  }>(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true, width: 1024 };
    }
    const width = window.innerWidth;
    return {
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      width,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      // Debounce resize events to avoid excessive re-renders
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setScreenSize({
          isMobile: width < BREAKPOINTS.md,
          isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
          isDesktop: width >= BREAKPOINTS.lg,
          width,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Set initial value on mount
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return screenSize;
};

/**
 * Hook to check if the current screen width is below a specific breakpoint.
 * Uses native matchMedia API for better performance.
 *
 * @param breakpoint - The breakpoint key to check against
 * @returns true if screen is below the breakpoint
 *
 * @example
 * ```tsx
 * const isBelowMd = useIsBelow('md');
 * // true when screen width < 768px
 * ```
 */
export const useIsBelow = (breakpoint: BreakpointKey): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = `(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`;
    const mediaQueryList = window.matchMedia(query);

    setMatches(mediaQueryList.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return matches;
};

/**
 * Hook to check if the current screen width is above a specific breakpoint.
 * Uses native matchMedia API for better performance.
 *
 * @param breakpoint - The breakpoint key to check against
 * @returns true if screen is at or above the breakpoint
 *
 * @example
 * ```tsx
 * const isAboveLg = useIsAbove('lg');
 * // true when screen width >= 1024px
 * ```
 */
export const useIsAbove = (breakpoint: BreakpointKey): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
    const mediaQueryList = window.matchMedia(query);

    setMatches(mediaQueryList.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return matches;
};

/**
 * Hook to check if the current screen width is between two breakpoints.
 *
 * @param min - Minimum breakpoint (inclusive)
 * @param max - Maximum breakpoint (exclusive)
 * @returns true if screen is between the breakpoints
 *
 * @example
 * ```tsx
 * const isTabletRange = useIsBetween('md', 'lg');
 * // true when 768px <= screen width < 1024px
 * ```
 */
export const useIsBetween = (min: BreakpointKey, max: BreakpointKey): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = `(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${BREAKPOINTS[max] - 1}px)`;
    const mediaQueryList = window.matchMedia(query);

    setMatches(mediaQueryList.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [min, max]);

  return matches;
};

export default useMediaQuery;
