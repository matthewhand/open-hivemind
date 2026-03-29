import { renderHook, act } from '@testing-library/react';
import {
  useMediaQuery,
  useIsBelow,
  useIsAbove,
  useIsBetween,
  BREAKPOINTS,
} from '../useMediaQuery';

// Mock window.matchMedia
const createMatchMediaMock = (width: number) => {
  return (query: string) => {
    const matches = (() => {
      // Parse the query to determine if it matches
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);

      if (minWidthMatch && maxWidthMatch) {
        const min = parseInt(minWidthMatch[1], 10);
        const max = parseInt(maxWidthMatch[1], 10);
        return width >= min && width <= max;
      } else if (minWidthMatch) {
        const min = parseInt(minWidthMatch[1], 10);
        return width >= min;
      } else if (maxWidthMatch) {
        const max = parseInt(maxWidthMatch[1], 10);
        return width <= max;
      }
      return false;
    })();

    return {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  };
};

describe('useMediaQuery', () => {
  beforeEach(() => {
    // Reset window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useMediaQuery hook', () => {
    it('should return mobile true when width < 768px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

      const { result } = renderHook(() => useMediaQuery());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(375);
    });

    it('should return tablet true when width between 768px and 1023px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });

      const { result } = renderHook(() => useMediaQuery());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(800);
    });

    it('should return desktop true when width >= 1024px', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true });

      const { result } = renderHook(() => useMediaQuery());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.width).toBe(1440);
    });

    it('should update when window is resized', () => {
      jest.useFakeTimers();
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

      const { result } = renderHook(() => useMediaQuery());

      expect(result.current.isMobile).toBe(true);

      // Simulate resize to desktop
      Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true });
      act(() => {
        window.dispatchEvent(new Event('resize'));
        jest.advanceTimersByTime(150);
      });

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(true);

      jest.useRealTimers();
    });

    it('should debounce resize events', () => {
      jest.useFakeTimers();
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

      const { result } = renderHook(() => useMediaQuery());
      const initialWidth = result.current.width;

      // Fire multiple resize events quickly
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Should not update immediately
      expect(result.current.width).toBe(initialWidth);

      // Should update after debounce period
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.width).toBe(500);

      jest.useRealTimers();
    });

    it('should handle server-side rendering gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore - Simulate SSR
      delete global.window;

      const { result } = renderHook(() => useMediaQuery());

      // Should return desktop as default
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('useIsBelow hook', () => {
    it('should return true when below breakpoint', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(600),
      });

      const { result } = renderHook(() => useIsBelow('md'));
      expect(result.current).toBe(true);
    });

    it('should return false when at or above breakpoint', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(768),
      });

      const { result } = renderHook(() => useIsBelow('md'));
      expect(result.current).toBe(false);
    });

    it('should update when media query changes', () => {
      const listeners: Array<(e: MediaQueryListEvent) => void> = [];

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          addEventListener: (event: string, handler: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') listeners.push(handler);
          },
          removeEventListener: jest.fn(),
        }),
      });

      const { result } = renderHook(() => useIsBelow('md'));
      expect(result.current).toBe(false);

      // Simulate media query change
      act(() => {
        listeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useIsAbove hook', () => {
    it('should return true when at or above breakpoint', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(1024),
      });

      const { result } = renderHook(() => useIsAbove('lg'));
      expect(result.current).toBe(true);
    });

    it('should return false when below breakpoint', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(800),
      });

      const { result } = renderHook(() => useIsAbove('lg'));
      expect(result.current).toBe(false);
    });

    it('should work with different breakpoints', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(1440),
      });

      const { result: resultXl } = renderHook(() => useIsAbove('xl'));
      const { result: result2xl } = renderHook(() => useIsAbove('2xl'));

      expect(resultXl.current).toBe(true);
      expect(result2xl.current).toBe(false);
    });
  });

  describe('useIsBetween hook', () => {
    it('should return true when between breakpoints', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(900),
      });

      const { result } = renderHook(() => useIsBetween('md', 'lg'));
      expect(result.current).toBe(true);
    });

    it('should return false when below range', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(600),
      });

      const { result } = renderHook(() => useIsBetween('md', 'lg'));
      expect(result.current).toBe(false);
    });

    it('should return false when above range', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(1200),
      });

      const { result } = renderHook(() => useIsBetween('md', 'lg'));
      expect(result.current).toBe(false);
    });

    it('should handle inclusive lower bound', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(768),
      });

      const { result } = renderHook(() => useIsBetween('md', 'lg'));
      expect(result.current).toBe(true);
    });

    it('should handle exclusive upper bound', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: createMatchMediaMock(1024),
      });

      const { result } = renderHook(() => useIsBetween('md', 'lg'));
      expect(result.current).toBe(false);
    });
  });

  describe('BREAKPOINTS constant', () => {
    it('should export standard Tailwind breakpoints', () => {
      expect(BREAKPOINTS).toEqual({
        mobile: 0,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536,
      });
    });
  });
});
