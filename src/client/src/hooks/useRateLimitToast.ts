import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useRateLimit } from './useRateLimit';

/**
 * Hook that shows toast notifications when the API rate limit is exhausted.
 * Should be mounted once near the app root (e.g. in a layout component).
 */
export function useRateLimitToast(): void {
  const { isExhausted, remaining, limit, resetTime } = useRateLimit();
  const lastToastRef = useRef(0);

  useEffect(() => {
    if (!isExhausted || limit === 0) return;

    // Debounce toasts: only show once per 30 seconds
    const now = Date.now();
    if (now - lastToastRef.current < 30_000) return;
    lastToastRef.current = now;

    const retrySeconds = resetTime
      ? Math.max(1, Math.ceil((resetTime - now) / 1000))
      : 60;

    const minutes = Math.floor(retrySeconds / 60);
    const seconds = retrySeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    toast.error(
      `Rate limit reached (${remaining}/${limit}). Please wait ${timeStr} before making more requests.`,
      {
        duration: 8000,
        id: 'rate-limit-exhausted',
      }
    );
  }, [isExhausted, remaining, limit, resetTime]);
}

export default useRateLimitToast;
