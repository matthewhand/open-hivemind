import type { PipelineTracer } from './PipelineTracer';

/**
 * Barrel export for the observability module.
 *
 * Provides a singleton accessor for the active {@link PipelineTracer}
 * so that routes and other consumers can query pipeline stats without
 * needing a direct reference to the tracer instance.
 *
 * @module observability
 */

export { PipelineTracer } from './PipelineTracer';
export type { PipelineStats, Span, Trace } from './PipelineTracer';

// ---------------------------------------------------------------------------
// Singleton holder
// ---------------------------------------------------------------------------

let activeTracer: PipelineTracer | undefined;

/**
 * Store the active tracer instance so routes can access it.
 * Call this once when the pipeline is created (e.g. in createPipeline).
 */
export function setActiveTracer(tracer: PipelineTracer): void {
  activeTracer = tracer;
}

/**
 * Return the active tracer, or `undefined` if the pipeline has not been
 * registered yet.
 */
export function getActiveTracer(): PipelineTracer | undefined {
  return activeTracer;
}
