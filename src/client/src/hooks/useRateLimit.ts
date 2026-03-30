import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService, type RateLimitInfo } from '../services/api';

export interface RateLimitState {
  /** Maximum requests allowed in the current window */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Timestamp (ms since epoch) when the rate limit window resets */
  resetTime: number;
  /** True when remaining requests are <= 10% of the limit */
  isNearLimit: boolean;
  /** True when remaining === 0 */
  isExhausted: boolean;
}

/**
 * Hook that subscribes to rate limit header updates from the API service
 * and exposes reactive state about the current rate limit status.
 */
export function useRateLimit(): RateLimitState {
  const [state, setState] = useState<RateLimitState>({
    limit: 0,
    remaining: 0,
    resetTime: 0,
    isNearLimit: false,
    isExhausted: false,
  });

  // Track whether mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  const handleUpdate = useCallback((info: RateLimitInfo) => {
    if (!mountedRef.current) return;

    const ratio = info.limit > 0 ? info.remaining / info.limit : 1;

    setState({
      limit: info.limit,
      remaining: info.remaining,
      resetTime: info.resetTime,
      isNearLimit: ratio <= 0.1,
      isExhausted: info.remaining <= 0,
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = apiService.onRateLimitUpdate(handleUpdate);
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [handleUpdate]);

  return state;
}

export default useRateLimit;
