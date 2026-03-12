import { useMemo } from 'react';

export interface PerformanceMetrics {
  /** Page load time in ms (navigation timing) */
  pageLoadMs: number | null;
  /** Time to first byte in ms */
  ttfbMs: number | null;
  /** JS heap used in MB (Chrome only) */
  heapUsedMb: number | null;
}

export const usePerformanceMetrics = (): PerformanceMetrics => {
  return useMemo(() => {
    const nav = performance?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    const mem = (performance as any)?.memory;
    return {
      pageLoadMs: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
      ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      heapUsedMb: mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null,
    };
  }, []);
};
