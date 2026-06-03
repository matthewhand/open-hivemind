import { monitorEventLoopDelay, performance, type EventLoopUtilization } from 'perf_hooks';
import type { NextFunction, Request, Response } from 'express';

/**
 * Runtime metrics shared by the JSON `/metrics` endpoint.
 *
 * Provides real (non-hardcoded) values for:
 *  - event loop delay (ms) via {@link monitorEventLoopDelay}
 *  - event loop utilization (0..1) via {@link performance.eventLoopUtilization}
 *  - total HTTP requests counted by {@link requestCounterMiddleware}
 *  - request rate (requests/second) computed since process start
 */

// Histogram resolution of 10ms is plenty for a coarse health delay metric and
// keeps overhead negligible.
const eventLoopDelayMonitor = monitorEventLoopDelay({ resolution: 10 });
eventLoopDelayMonitor.enable();

// Baseline utilization sample captured at module load so the first reading is
// relative to process start rather than undefined.
let lastEluSample: EventLoopUtilization = performance.eventLoopUtilization();

let requestCount = 0;
const startTimeMs = Date.now();

/** Express middleware that increments the total request counter. */
export function requestCounterMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  requestCount += 1;
  next();
}

export interface RuntimeMetrics {
  /** Mean event loop delay in milliseconds since the last reset. */
  eventLoopDelayMs: number;
  /** Event loop utilization in the range 0..1 since the previous read. */
  eventLoopUtilization: number;
  /** Total HTTP requests observed by the counter middleware. */
  requestsTotal: number;
  /** Average request rate in requests per second since process start. */
  requestsRate: number;
}

/**
 * Snapshot the current runtime metrics. The event loop delay histogram is
 * reset after reading so each call reports the interval since the previous one.
 */
export function getRuntimeMetrics(): RuntimeMetrics {
  // `mean` is in nanoseconds; convert to milliseconds. Guard against NaN when
  // no samples have been collected yet.
  const meanNs = eventLoopDelayMonitor.mean;
  const eventLoopDelayMs = Number.isFinite(meanNs) ? meanNs / 1e6 : 0;
  eventLoopDelayMonitor.reset();

  const current = performance.eventLoopUtilization();
  const delta = performance.eventLoopUtilization(current, lastEluSample);
  lastEluSample = current;
  const eventLoopUtilization = Number.isFinite(delta.utilization) ? delta.utilization : 0;

  const elapsedSeconds = Math.max((Date.now() - startTimeMs) / 1000, 1e-9);
  const requestsRate = requestCount / elapsedSeconds;

  return {
    eventLoopDelayMs,
    eventLoopUtilization,
    requestsTotal: requestCount,
    requestsRate,
  };
}

/** Test-only helper to reset counters and samples between cases. */
export function __resetRuntimeMetricsForTests(): void {
  requestCount = 0;
  eventLoopDelayMonitor.reset();
  lastEluSample = performance.eventLoopUtilization();
}
