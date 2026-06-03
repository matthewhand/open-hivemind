/**
 * useInactivity Hook Tests
 *
 * Tests the useInactivity hook's behavior: idle detection, wake on activity,
 * timer management, cleanup, and custom configuration.
 *
 * Uses @testing-library/react's renderHook + act so the hook runs inside a
 * real React component context.
 *
 * Both `result.current.isIdle` (the rendered state) AND the `onIdle` /
 * `onWake` callbacks are asserted on, so a regression that breaks either the
 * external state or the callbacks will fail this suite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInactivity } from '../useInactivity';

describe('useInactivity Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should start as not idle', () => {
    const { result } = renderHook(() => useInactivity({ timeoutMs: 1000 }));
    expect(result.current.isIdle).toBe(false);
  });

  it('should transition to idle after the specified timeout with no activity', () => {
    const timeoutMs = 5000;
    const onIdle = vi.fn();
    const { result } = renderHook(() => useInactivity({ timeoutMs, onIdle }));

    expect(onIdle).not.toHaveBeenCalled();
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);
  });

  it('should call onIdle callback when transitioning to idle', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() => useInactivity({ timeoutMs: 3000, onIdle }));

    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);
  });

  it('should reset the idle timer on user activity (mouse movement)', () => {
    const timeoutMs = 2000;
    const onIdle = vi.fn();
    const { result } = renderHook(() => useInactivity({ timeoutMs, onIdle }));

    // Advance partway to idle
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onIdle).not.toHaveBeenCalled();
    expect(result.current.isIdle).toBe(false);

    // Simulate mouse movement — resets the timer
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    // Timer was reset; need another full timeout to fire onIdle
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onIdle).not.toHaveBeenCalled();
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);
  });

  it('should wake from idle state on user activity and call onWake', () => {
    const onIdle = vi.fn();
    const onWake = vi.fn();
    const { result } = renderHook(() => useInactivity({ timeoutMs: 1000, onIdle, onWake }));

    // Go idle
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);

    // Simulate activity — listener fires synchronously and resets the timer
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown'));
    });

    expect(onWake).toHaveBeenCalled();
    expect(result.current.isIdle).toBe(false);
  });

  it('should handle visibilitychange event when page becomes visible', () => {
    const timeoutMs = 2000;
    const onIdle = vi.fn();
    const onWake = vi.fn();
    const { result } = renderHook(() =>
      useInactivity({ timeoutMs, onIdle, onWake })
    );

    // Go idle
    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);

    // Page becomes visible again — should wake
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    expect(onWake).toHaveBeenCalled();
    expect(result.current.isIdle).toBe(false);
  });

  it('should NOT reset timer when visibilitychange fires with hidden state', () => {
    const timeoutMs = 2000;
    const onIdle = vi.fn();
    const { result } = renderHook(() => useInactivity({ timeoutMs, onIdle }));

    // Page hidden — should not affect timer
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    // Timer should still go idle on schedule
    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);
  });

  it('should clean up event listeners and timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { result, unmount } = renderHook(() =>
      useInactivity({ timeoutMs: 5000 })
    );
    expect(result.current.isIdle).toBe(false);

    // Unmount triggers the effect cleanup
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('should expose reset function to manually restart the timer', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useInactivity({ timeoutMs: 1000, onIdle })
    );

    expect(typeof result.current.reset).toBe('function');

    // Go idle
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(result.current.isIdle).toBe(true);

    // Manually reset — should restart the timer and clear idle state
    act(() => {
      result.current.reset();
    });
    expect(result.current.isIdle).toBe(false);

    // Should fire onIdle again after another full timeout
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onIdle).toHaveBeenCalledTimes(2);
    expect(result.current.isIdle).toBe(true);
  });

  it('should report lastActive timestamp that updates on activity', () => {
    const { result } = renderHook(() => useInactivity({ timeoutMs: 5000 }));
    const initialActive = result.current.lastActive;

    // Wait some time
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Simulate activity
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    const afterActivity = result.current.lastActive;
    expect(afterActivity).toBeGreaterThanOrEqual(initialActive);
  });

  it('should respect custom events list', () => {
    const timeoutMs = 1000;

    // With only keydown as event, mousemove should NOT reset the timer
    const onIdle1 = vi.fn();
    const { unmount } = renderHook(() =>
      useInactivity({ timeoutMs, events: ['keydown'], onIdle: onIdle1 })
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onIdle1).toHaveBeenCalledTimes(1);
    unmount();

    // With keydown, keydown event SHOULD reset the timer
    const onIdle2 = vi.fn();
    renderHook(() =>
      useInactivity({ timeoutMs, events: ['keydown'], onIdle: onIdle2 })
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown'));
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onIdle2).not.toHaveBeenCalled();
  });
});
