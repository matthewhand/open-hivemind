/**
 * useInactivity Hook Tests
 *
 * Tests the useInactivity hook's behavior: idle detection, wake on activity,
 * timer management, cleanup, and custom configuration.
 *
 * Uses direct hook invocation with a minimal React-like wrapper to avoid
 * the React 19 + testing-library act() compatibility issue.
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
    const { result } = renderHook(() => useInactivity({ timeoutMs }));

    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });

    expect(result.current.isIdle).toBe(true);
  });

  it('should call onIdle callback when transitioning to idle', () => {
    const onIdle = vi.fn();
    renderHook(() => useInactivity({ timeoutMs: 3000, onIdle }));

    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset the idle timer on user activity (mouse movement)', () => {
    const timeoutMs = 2000;
    const { result } = renderHook(() => useInactivity({ timeoutMs }));

    // Advance partway to idle
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isIdle).toBe(false);

    // Simulate mouse movement
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    // Timer should have reset; need another full timeout to go idle
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isIdle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isIdle).toBe(true);
  });

  it('should wake from idle state on user activity and call onWake', () => {
    const onIdle = vi.fn();
    const onWake = vi.fn();
    const { result } = renderHook(() =>
      useInactivity({ timeoutMs: 1000, onIdle, onWake })
    );

    // Go idle
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isIdle).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onWake).not.toHaveBeenCalled();

    // Simulate activity
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown'));
    });

    expect(result.current.isIdle).toBe(false);
    expect(onWake).toHaveBeenCalledTimes(1);
  });

  it('should handle visibilitychange event when page becomes visible', () => {
    const timeoutMs = 2000;
    const { result } = renderHook(() => useInactivity({ timeoutMs }));

    // Go idle
    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });
    expect(result.current.isIdle).toBe(true);

    // Page becomes visible again
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isIdle).toBe(false);
  });

  it('should NOT reset timer when visibilitychange fires with hidden state', () => {
    const timeoutMs = 2000;
    const { result } = renderHook(() => useInactivity({ timeoutMs }));

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
    expect(result.current.isIdle).toBe(true);
  });

  it('should clean up event listeners and timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { result, unmount } = renderHook(() => useInactivity({ timeoutMs: 5000 }));
    expect(result.current.isIdle).toBe(false);

    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('should expose reset function to manually restart the timer', () => {
    const { result } = renderHook(() => useInactivity({ timeoutMs: 1000 }));

    // Go idle
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isIdle).toBe(true);

    // Manually reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.isIdle).toBe(false);

    // Should go idle again after timeout
    act(() => {
      vi.advanceTimersByTime(1000);
    });
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

    // With only keydown as event, mousemove should NOT reset
    const { result } = renderHook(() =>
      useInactivity({ timeoutMs, events: ['keydown'] })
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
    expect(result.current.isIdle).toBe(true);

    // With keydown, keydown event SHOULD reset
    const { result: result2 } = renderHook(() =>
      useInactivity({ timeoutMs, events: ['keydown'] })
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
    expect(result2.current.isIdle).toBe(false);
  });
});
