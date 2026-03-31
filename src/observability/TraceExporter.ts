/**
 * Pluggable trace export layer for PipelineTracer.
 *
 * Subscribes to completed traces and exports them via configurable backends:
 * - **ConsoleExporter** — logs to debug('app:trace-export') in a tree format
 * - **JsonFileExporter** — appends NDJSON to a file (default: logs/traces.ndjson)
 * - **OtlpExporter** — POSTs to an OTLP HTTP endpoint (Jaeger, Grafana Tempo, etc.)
 *
 * No external dependencies — uses `debug`, `fs`, and native `fetch`.
 *
 * @module observability/TraceExporter
 */

import Debug from 'debug';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import type { Trace, Span } from './PipelineTracer';
import type { PipelineTracer } from './PipelineTracer';

const debug = Debug('app:trace-export');

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ITraceExporter {
  export(trace: Trace): Promise<void>;
  shutdown(): Promise<void>;
}

// ---------------------------------------------------------------------------
// ConsoleExporter
// ---------------------------------------------------------------------------

/**
 * Logs completed traces via debug('app:trace-export') in a human-readable
 * tree format.
 *
 * ```
 * [TRACE abc123] pipeline 150ms (5 spans)
 *   ├─ receive    2ms  ok
 *   ├─ decision  15ms  ok
 *   ├─ enrich    30ms  ok
 *   ├─ inference  95ms  ok
 *   └─ send       8ms  ok
 * ```
 */
export class ConsoleExporter implements ITraceExporter {
  async export(trace: Trace): Promise<void> {
    const children = trace.rootSpan.children;
    const spanCount = children.length;
    const totalMs = trace.totalDurationMs ?? 0;

    const lines: string[] = [];
    lines.push(`[TRACE ${trace.traceId}] pipeline ${totalMs}ms (${spanCount} spans)`);

    for (let i = 0; i < children.length; i++) {
      const span = children[i];
      const isLast = i === children.length - 1;
      const connector = isLast ? '└─' : '├─';
      const name = span.name.padEnd(10);
      const duration = `${span.durationMs ?? 0}ms`.padStart(6);
      const status = span.status;
      lines.push(`  ${connector} ${name} ${duration}  ${status}`);
    }

    debug('%s', lines.join('\n'));
  }

  async shutdown(): Promise<void> {
    // Nothing to clean up
  }
}

// ---------------------------------------------------------------------------
// JsonFileExporter
// ---------------------------------------------------------------------------

/**
 * Appends completed traces as NDJSON (one JSON object per line) to a
 * configurable file path.
 */
export class JsonFileExporter implements ITraceExporter {
  private filePath: string;

  constructor(filePath: string = 'logs/traces.ndjson') {
    this.filePath = filePath;
  }

  async export(trace: Trace): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Append trace as a single JSON line
      const line = JSON.stringify(trace) + '\n';
      await fs.appendFile(this.filePath, line, 'utf-8');
      debug('Trace %s written to %s', trace.traceId, this.filePath);
    } catch (err) {
      debug('JsonFileExporter error: %O', err);
    }
  }

  async shutdown(): Promise<void> {
    // Nothing to clean up
  }

  /** Expose file path for testing */
  getFilePath(): string {
    return this.filePath;
  }
}

// ---------------------------------------------------------------------------
// OtlpExporter
// ---------------------------------------------------------------------------

/**
 * Posts completed traces to an OTLP HTTP endpoint in OTLP JSON format.
 *
 * Configured via the `OTEL_EXPORTER_OTLP_ENDPOINT` env var. Only active
 * when the endpoint is set. Uses native `fetch` — no external deps.
 */
export class OtlpExporter implements ITraceExporter {
  private endpoint: string;

  constructor(endpoint: string) {
    // Ensure the endpoint includes the traces path
    this.endpoint = endpoint.replace(/\/+$/, '') + '/v1/traces';
  }

  async export(trace: Trace): Promise<void> {
    const otlpPayload = this.toOtlpPayload(trace);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otlpPayload),
      });

      if (!response.ok) {
        debug(
          'OtlpExporter HTTP %d: %s',
          response.status,
          await response.text().catch(() => '(no body)'),
        );
      } else {
        debug('Trace %s exported to OTLP endpoint', trace.traceId);
      }
    } catch (err) {
      debug('OtlpExporter network error: %O', err);
    }
  }

  async shutdown(): Promise<void> {
    // Nothing to clean up
  }

  /** Expose endpoint for testing */
  getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Convert internal Trace to OTLP JSON format.
   * See: https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
   */
  private toOtlpPayload(trace: Trace): object {
    const spans = trace.spans.map((span) => this.spanToOtlp(trace.traceId, span));

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'open-hivemind' } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'pipeline-tracer' },
              spans,
            },
          ],
        },
      ],
    };
  }

  private spanToOtlp(traceId: string, span: Span): object {
    const attributes = Object.entries(span.attributes).map(([key, value]) => {
      if (typeof value === 'string') {
        return { key, value: { stringValue: value } };
      } else if (typeof value === 'number') {
        return { key, value: { intValue: String(value) } };
      } else {
        return { key, value: { boolValue: value } };
      }
    });

    return {
      traceId,
      spanId: span.id,
      name: span.name,
      kind: 1, // SPAN_KIND_INTERNAL
      startTimeUnixNano: String(span.startTime * 1_000_000),
      endTimeUnixNano: String((span.endTime ?? span.startTime) * 1_000_000),
      attributes,
      status: {
        code: span.status === 'ok' ? 1 : 2, // STATUS_CODE_OK = 1, STATUS_CODE_ERROR = 2
      },
    };
  }
}

// ---------------------------------------------------------------------------
// TraceExportManager
// ---------------------------------------------------------------------------

/**
 * Manages a set of ITraceExporter instances, routing completed traces to
 * all exporters. Errors in individual exporters are caught and logged so
 * they never block the pipeline or other exporters.
 */
export class TraceExportManager {
  constructor(private exporters: ITraceExporter[]) {}

  /**
   * Subscribe to a PipelineTracer and export completed traces automatically.
   */
  attach(tracer: PipelineTracer): void {
    tracer.onTraceCompleted((trace) => {
      // Fire and forget — don't block the tracer
      this.exportTrace(trace).catch((err) => {
        debug('TraceExportManager.exportTrace error: %O', err);
      });
    });
    debug('TraceExportManager attached to PipelineTracer (%d exporters)', this.exporters.length);
  }

  /**
   * Export a single trace to all registered exporters.
   * Errors in individual exporters are caught so they don't block others.
   */
  async exportTrace(trace: Trace): Promise<void> {
    const results = await Promise.allSettled(
      this.exporters.map((exporter) => exporter.export(trace)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        debug('Exporter failed: %O', result.reason);
      }
    }
  }

  /**
   * Shut down all exporters, giving them a chance to flush buffers.
   */
  async shutdown(): Promise<void> {
    await Promise.allSettled(
      this.exporters.map((exporter) => exporter.shutdown()),
    );
    debug('TraceExportManager shut down');
  }

  /** Expose exporters for testing */
  getExporters(): ITraceExporter[] {
    return this.exporters;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the default set of exporters based on environment variables.
 *
 * - ConsoleExporter is always enabled
 * - JsonFileExporter is enabled when `TRACE_LOG_FILE` is set
 * - OtlpExporter is enabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
 */
export function createExporters(): ITraceExporter[] {
  const exporters: ITraceExporter[] = [];

  // Console exporter is always on
  exporters.push(new ConsoleExporter());

  // JSON file exporter — opt-in via env var
  if (process.env.TRACE_LOG_FILE) {
    exporters.push(new JsonFileExporter(process.env.TRACE_LOG_FILE));
  }

  // OTLP exporter — opt-in via env var
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    exporters.push(new OtlpExporter(process.env.OTEL_EXPORTER_OTLP_ENDPOINT));
  }

  return exporters;
}
