import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

type ComponentImporter<T extends ComponentType<unknown>> = () => Promise<{ default: T }>;

/**
 * Drop-in replacement for React.lazy that retries a failed dynamic import once.
 *
 * A navigation that starts while a lazy chunk is still being fetched aborts the
 * in-flight request; Firefox surfaces the rejection as
 * "error loading dynamically imported module: …" through the nearest
 * ErrorBoundary as a console error with an empty message. The retry re-issues
 * the fetch after a short delay — if the document is being torn down the
 * result is discarded harmlessly, and on a flaky network the second attempt
 * usually succeeds.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: ComponentImporter<T>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return importer();
    }
  });
}

export default lazyWithRetry;
