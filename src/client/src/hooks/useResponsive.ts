import { useState, useEffect } from 'react';

interface BreakpointValues {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  '2xl': boolean;
}

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useResponsive = (): BreakpointValues => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width } = windowSize;

  return {
    sm: width >= breakpoints.sm,
    md: width >= breakpoints.md,
    lg: width >= breakpoints.lg,
    xl: width >= breakpoints.xl,
    '2xl': width >= breakpoints['2xl'],
  };
};

export const useMediaQuery = (query: { maxWidth?: number; minWidth?: number }): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(
      query.maxWidth 
        ? `(max-width: ${query.maxWidth}px)`
        : query.minWidth 
          ? `(min-width: ${query.minWidth}px)`
          : ''
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