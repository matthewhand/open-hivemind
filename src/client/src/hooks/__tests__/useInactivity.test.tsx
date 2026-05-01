import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { useInactivity } from '../useInactivity';

// Let's mock React.useState and React.useEffect!
// This way we test the pure logic without React 19 rendering cycle issues.

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: vi.fn(),
    useEffect: vi.fn(),
    useCallback: vi.fn((fn) => fn),
    useRef: vi.fn((initial) => ({ current: initial })),
  };
});

describe('useInactivity Hook', () => {
  let mockSetIsIdle: ReturnType<typeof vi.fn>;
  let effectCleanup: () => void;
  let effectCallback: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetIsIdle = vi.fn();

    // Mock useState to return [false, mockSetIsIdle] initially
    vi.mocked(React.useState).mockReturnValue([false, mockSetIsIdle] as any);

    // Mock useEffect to capture the callback
    vi.mocked(React.useEffect).mockImplementation((cb) => {
      effectCallback = cb as () => void;
    });
  });

  afterEach(() => {
    if (effectCleanup) effectCleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should start as not idle', () => {
    const result = useInactivity({ timeoutMs: 1000 });
    expect(result.isIdle).toBe(false);
  });

  it('should transition to idle after the specified timeout with no activity', () => {
    useInactivity({ timeoutMs: 5000 });
    effectCleanup = effectCallback() as any;

    expect(mockSetIsIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(mockSetIsIdle).toHaveBeenCalledWith(true);
  });

  it('should call onIdle callback when transitioning to idle', () => {
    const onIdle = vi.fn();
    useInactivity({ timeoutMs: 3000, onIdle });
    effectCleanup = effectCallback() as any;

    vi.advanceTimersByTime(3000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset the idle timer on user activity (mouse movement)', () => {
    useInactivity({ timeoutMs: 2000 });
    effectCleanup = effectCallback() as any;

    vi.advanceTimersByTime(1500);
    expect(mockSetIsIdle).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('mousemove'));

    vi.advanceTimersByTime(1500);
    expect(mockSetIsIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(mockSetIsIdle).toHaveBeenCalledWith(true);
  });

  it('should wake from idle state on user activity and call onWake', () => {
    const onIdle = vi.fn();
    const onWake = vi.fn();

    // First simulate being idle
    vi.mocked(React.useState).mockReturnValue([true, mockSetIsIdle] as any);

    const { reset } = useInactivity({ timeoutMs: 1000, onIdle, onWake });
    effectCleanup = effectCallback() as any;
    onWake.mockClear();

    // Simulate activity
    window.dispatchEvent(new KeyboardEvent('keydown'));

    // Should call setIsIdle(false) and onWake()
    expect(mockSetIsIdle).toHaveBeenCalledWith(false);
    expect(onWake).toHaveBeenCalledTimes(1);
  });

  it('should handle visibilitychange event when page becomes visible', () => {
    vi.mocked(React.useState).mockReturnValue([true, mockSetIsIdle] as any);
    useInactivity({ timeoutMs: 2000 });
    effectCleanup = effectCallback() as any;

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('visibilitychange'));

    expect(mockSetIsIdle).toHaveBeenCalledWith(false);
  });

  it('should NOT reset timer when visibilitychange fires with hidden state', () => {
    useInactivity({ timeoutMs: 2000 });
    effectCleanup = effectCallback() as any;

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(2000);
    expect(mockSetIsIdle).toHaveBeenCalledWith(true);
  });

  it('should clean up event listeners and timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    useInactivity({ timeoutMs: 5000 });
    effectCleanup = effectCallback() as any;

    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    effectCleanup();
    effectCleanup = null as any;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('should expose reset function to manually restart the timer', () => {
    vi.mocked(React.useState).mockReturnValue([true, mockSetIsIdle] as any);
    const { reset } = useInactivity({ timeoutMs: 1000 });
    effectCleanup = effectCallback() as any;

    reset();
    expect(mockSetIsIdle).toHaveBeenCalledWith(false);
  });

  it('should respect custom events list', () => {
    useInactivity({ timeoutMs: 1000, events: ['keydown'] });
    effectCleanup = effectCallback() as any;

    vi.advanceTimersByTime(500);
    window.dispatchEvent(new MouseEvent('mousemove'));
    vi.advanceTimersByTime(600);
    expect(mockSetIsIdle).toHaveBeenCalledWith(true);

    mockSetIsIdle.mockClear();
    effectCleanup();

    useInactivity({ timeoutMs: 1000, events: ['keydown'] });
    effectCleanup = effectCallback() as any;

    vi.advanceTimersByTime(500);
    window.dispatchEvent(new KeyboardEvent('keydown'));
    vi.advanceTimersByTime(600);
    expect(mockSetIsIdle).not.toHaveBeenCalledWith(true);
  });
});
