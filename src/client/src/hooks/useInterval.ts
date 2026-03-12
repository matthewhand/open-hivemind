import { useEffect, useRef } from 'react';

/**
 * Runs `callback` on a repeating interval of `delay` ms.
 * Cleans up automatically on unmount or when delay changes.
 * Pass `null` as delay to pause the interval.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => savedCallback.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
}
