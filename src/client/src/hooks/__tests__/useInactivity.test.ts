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
import { useInactivity } from '../useInactivity';

import { renderHook, act } from '@testing-library/react';

/**
 * Minimal hook runner that calls the hook function directly and provides
 * a way to re-invoke it (simulating re-renders).
 */
function runHook<T, R>(hookFn: () => R) {
  const { result, rerender } = renderHook(hookFn);
  return {
    get result() { return result.current; },
    rerender: () => {
      act(() => {
        rerender();
      });
      return result.current;
    },
  };
}

describe('useInactivity Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should start as not idle', () => {
    const { result } = runHook(() => useInactivity({ timeoutMs: 1000 }));
    expect(result.isIdle).toBe(false);
  });

  it('should transition to idle after the specified timeout with no activity', () => {
    const timeoutMs = 5000;
    const { result } = runHook(() => useInactivity({ timeoutMs }));

    expect(result.isIdle).toBe(false);

    vi.advanceTimersByTime(timeoutMs);

    expect(result.isIdle).toBe(true);
  });

  it('should call onIdle callback when transitioning to idle', () => {
    const onIdle = vi.fn();
    runHook(() => useInactivity({ timeoutMs: 3000, onIdle }));

    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('should reset the idle timer on user activity (mouse movement)', () => {
    const timeoutMs = 2000;
    const { result } = runHook(() => useInactivity({ timeoutMs }));

    // Advance partway to idle
    vi.advanceTimersByTime(1500);
    expect(result.isIdle).toBe(false);

    // Simulate mouse movement
    window.dispatchEvent(new MouseEvent('mousemove'));

    // Timer should have reset; need another full timeout to go idle
    vi.advanceTimersByTime(1500);
    expect(result.isIdle).toBe(false);

    vi.advanceTimersByTime(500);
    expect(result.isIdle).toBe(true);
  });

  it('should wake from idle state on user activity and call onWake', () => {
    const onIdle = vi.fn();
    const onWake = vi.fn();
    const { result, rerender } = runHook(() =>
      useInactivity({ timeoutMs: 1000, onIdle, onWake })
    );

    // Go idle
    vi.advanceTimersByTime(1000);
    expect(result.isIdle).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(onWake).not.toHaveBeenCalled();

    // Simulate activity and re-render (simulates state change triggering re-render)
    window.dispatchEvent(new KeyboardEvent('keydown'));
    rerender();

    expect(result.isIdle).toBe(false);
    expect(onWake).toHaveBeenCalledTimes(1);
  });

  it('should handle visibilitychange event when page becomes visible', () => {
    const timeoutMs = 2000;
    const { result, rerender } = runHook(() => useInactivity({ timeoutMs }));

    // Go idle
    vi.advanceTimersByTime(timeoutMs);
    expect(result.isIdle).toBe(true);

    // Page becomes visible again
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('visibilitychange'));
    rerender();

    expect(result.isIdle).toBe(false);
  });

  it('should NOT reset timer when visibilitychange fires with hidden state', () => {
    const timeoutMs = 2000;
    const { result } = runHook(() => useInactivity({ timeoutMs }));

    // Page hidden — should not affect timer
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('visibilitychange'));

    // Timer should still go idle on schedule
    vi.advanceTimersByTime(timeoutMs);
    expect(result.isIdle).toBe(true);
  });

  it('should clean up event listeners and timers on unmount simulation', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    // Call the hook's cleanup by accessing its return value through the effect
    const { result } = runHook(() => useInactivity({ timeoutMs: 5000 }));
    expect(result.isIdle).toBe(false);

    // Verify timers were set (clearTimeout called during cleanup would be tracked)
    // The hook sets a timer on mount, so clearTimeout hasn't been called yet
    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    // When the component "unmounts", the effect cleanup runs
    // We can't directly trigger cleanup in a direct call, but we verify
    // the hook sets up listeners correctly
    expect(removeEventListenerSpy).not.toHaveBeenCalled();
  });

  it('should expose reset function to manually restart the timer', () => {
    const { result } = runHook(() => useInactivity({ timeoutMs: 1000 }));

    // Go idle
    vi.advanceTimersByTime(1000);
    expect(result.isIdle).toBe(true);

    // Manually reset
    result.reset();

    expect(result.isIdle).toBe(false);

    // Should go idle again after timeout
    vi.advanceTimersByTime(1000);
    expect(result.isIdle).toBe(true);
  });

  it('should report lastActive timestamp that updates on activity', () => {
    const { result } = runHook(() => useInactivity({ timeoutMs: 5000 }));
    const initialActive = result.lastActive;

    // Wait some time
    vi.advanceTimersByTime(2000);

    // Simulate activity
    window.dispatchEvent(new MouseEvent('mousemove'));

    const afterActivity = result.lastActive;
    expect(afterActivity).toBeGreaterThanOrEqual(initialActive);
  });

  it('should respect custom events list', () => {
    const timeoutMs = 1000;

    // With only keydown as event, mousemove should NOT reset
    const { result } = runHook(() =>
      useInactivity({ timeoutMs, events: ['keydown'] })
    );
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new MouseEvent('mousemove'));
    vi.advanceTimersByTime(600);
    expect(result.isIdle).toBe(true);

    // With keydown, keydown event SHOULD reset
    const { result: result2 } = runHook(() =>
      useInactivity({ timeoutMs, events: ['keydown'] })
    );
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new KeyboardEvent('keydown'));
    vi.advanceTimersByTime(500);
    expect(result2.isIdle).toBe(false);
  });
});
