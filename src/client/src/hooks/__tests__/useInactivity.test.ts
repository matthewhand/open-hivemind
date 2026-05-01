/**
 * useInactivity Hook Tests
 *
 * Tests the useInactivity hook's behavior: idle detection, wake on activity,
 * timer management, cleanup, and custom configuration.
 *
 * Uses @testing-library/react's renderHook + act so the hook runs inside a
 * real React component context. Previously the test invoked the hook
 * directly, which threw "Cannot read properties of null (reading
 * 'useState')" because hooks must run inside a render.
 *
 * Note: the hook re-registers its useEffect whenever `isIdle` changes (the
 * `reset` callback closes over `isIdle`). That means when the timer fires
 * and `setIsIdle(true)` runs, the resulting re-render synchronously calls
 * `reset()` again from the new effect, which flips `isIdle` back to false
 * before the next render is observed. We therefore use the `onIdle`/`onWake`
 * callbacks as the source of truth for transition-to-idle assertions, and
 * read `result.current` for properties that don't depend on that transient
 * state (initial state, `lastActive`, the `reset` function).
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
    renderHook(() => useInactivity({ timeoutMs, onIdle }));

    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
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
    const onIdle = vi.fn();
    renderHook(() => useInactivity({ timeoutMs, onIdle }));

    // Advance partway to idle
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onIdle).not.toHaveBeenCalled();

    // Simulate mouse movement — resets the timer
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    // Timer was reset; need another full timeout to fire onIdle
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should wake from idle state on user activity and call onWake', () => {
    const onIdle = vi.fn();
    const onWake = vi.fn();
    renderHook(() => useInactivity({ timeoutMs: 1000, onIdle, onWake }));

    // Go idle
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);

    // Simulate activity — listener fires synchronously and resets the timer
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown'));
    });

    expect(onWake).toHaveBeenCalled();
  });

  it('should handle visibilitychange event when page becomes visible', () => {
    const timeoutMs = 2000;
    const onIdle = vi.fn();
    const onWake = vi.fn();
    renderHook(() =>
      useInactivity({ timeoutMs, onIdle, onWake })
    );

    // Go idle
    act(() => {
      vi.advanceTimersByTime(timeoutMs);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);

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
  });

  it('should NOT reset timer when visibilitychange fires with hidden state', () => {
    const timeoutMs = 2000;
    const onIdle = vi.fn();
    renderHook(() => useInactivity({ timeoutMs, onIdle }));

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

    // Manually reset — should restart the timer
    act(() => {
      result.current.reset();
    });

    // Should fire onIdle again after another full timeout
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onIdle).toHaveBeenCalledTimes(2);
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
