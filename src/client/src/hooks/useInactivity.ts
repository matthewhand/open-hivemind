import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInactivityOptions {
  timeoutMs?: number; // inactivity period before idle
  events?: string[]; // DOM events considered user activity
  onIdle?: () => void;
  onWake?: () => void;
}

/**
 * useInactivity detects when the user has not interacted with the page for a specified timeout.
 * It sets isIdle=true only after initial mount + timeout of no activity.
 * Any user activity while idle will immediately wake and reset the timer.
 */
export function useInactivity({
  timeoutMs = 60_000,
  events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange'],
  onIdle,
  onWake,
}: UseInactivityOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goIdle = useCallback(() => {
    setIsIdle(true);
    onIdle?.();
  }, [onIdle]);

  const reset = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (isIdle) {
      setIsIdle(false);
      onWake?.();
    }
    clearTimer();
    timerRef.current = window.setTimeout(goIdle, timeoutMs);
  }, [goIdle, isIdle, onWake, timeoutMs]);

  useEffect(() => {
    // Initialize timer
    reset();
    const handleEvent = (e: Event) => {
      if (e.type === 'visibilitychange') {
        if (document.visibilityState === 'visible') {
          reset();
        }
        return;
      }
      reset();
    };

    events.forEach(evt => window.addEventListener(evt, handleEvent, { passive: true }));

    return () => {
      clearTimer();
      events.forEach(evt => window.removeEventListener(evt, handleEvent));
    };
  }, [events, reset]);

  return { isIdle, reset, lastActive: lastActiveRef.current };
}

export default useInactivity;
