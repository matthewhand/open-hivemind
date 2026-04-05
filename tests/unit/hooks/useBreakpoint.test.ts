/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useIsBelowBreakpoint, useMediaQuery } from '../../../src/client/src/hooks/useBreakpoint';

describe('useBreakpoint', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return xs for narrow screens', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('xs');
  });

  it('should return sm for small screens', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 700 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('sm');
  });

  it('should return md for medium screens', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('md');
  });

  it('should return lg for large screens', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1100 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('lg');
  });

  it('should return xl for extra large screens', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1300 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('xl');
  });

  it('should return 2xl for very large screens', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1600 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('2xl');
  });

  it('should update breakpoint on resize', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    const { result } = renderHook(() => useBreakpoint(0));
    expect(result.current).toBe('md');

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1100 });
      window.dispatchEvent(new Event('resize'));
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe('lg');
  });
});

describe('useIsBelowBreakpoint', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true when below breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 700 });
    const { result } = renderHook(() => useIsBelowBreakpoint('lg', 0));
    expect(result.current).toBe(true);
  });

  it('should return false when at or above breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1100 });
    const { result } = renderHook(() => useIsBelowBreakpoint('lg', 0));
    expect(result.current).toBe(false);
  });
});

describe('useMediaQuery', () => {
  it('should return true when maxWidth matches', () => {
    const mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes('640'),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: mockMatchMedia });

    const { result } = renderHook(() => useMediaQuery({ maxWidth: 640 }));
    expect(result.current).toBe(true);
  });

  it('should return false when maxWidth does not match', () => {
    const mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: mockMatchMedia });

    const { result } = renderHook(() => useMediaQuery({ maxWidth: 640 }));
    expect(result.current).toBe(false);
  });
});
