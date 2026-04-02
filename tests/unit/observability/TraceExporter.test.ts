/**
 * Tests for TraceExporter — pluggable export layer for PipelineTracer.
 *
 * Covers ConsoleExporter, JsonFileExporter, OtlpExporter,
 * TraceExportManager, and the createExporters() factory.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

import {
  ConsoleExporter,
  JsonFileExporter,
  OtlpExporter,
  TraceExportManager,
  createExporters,
} from '@src/observability/TraceExporter';
import type { ITraceExporter } from '@src/observability/TraceExporter';
import type { Trace, Span } from '@src/observability/PipelineTracer';
import { PipelineTracer } from '@src/observability/PipelineTracer';
import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { IMessage } from '@message/interfaces/IMessage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpan(name: string, durationMs: number, status: 'ok' | 'error' = 'ok'): Span {
  const now = Date.now();
  return {
    id: randomUUID(),
    name,
    startTime: now - durationMs,
    endTime: now,
    durationMs,
    status,
    attributes: {},
    children: [],
  };
}

function makeTrace(overrides: Partial<Trace> = {}): Trace {
  const now = Date.now();
  const children = [
    makeSpan('receive', 2),
    makeSpan('decision', 15),
    makeSpan('enrich', 30),
    makeSpan('inference', 95),
    makeSpan('send', 8),
  ];

  const rootSpan: Span = {
    id: randomUUID(),
    name: 'pipeline',
    startTime: now - 150,
    endTime: now,
    durationMs: 150,
    status: 'ok',
    attributes: { channelId: 'ch-1', platform: 'test', botName: 'TestBot' },
    children,
  };

  return {
    traceId: randomUUID(),
    rootSpan,
    spans: [rootSpan, ...children],
    startTime: now - 150,
    endTime: now,
    totalDurationMs: 150,
    ...overrides,
  };
}

/** Minimal concrete IMessage stub for tests. */
class StubMessage extends IMessage {
  private id: string;
  private text: string;
  private timestamp: Date;

  constructor(text = 'hello', id = 'msg-1') {
    super({}, 'user');
    this.id = id;
    this.text = text;
    this.content = text;
    this.channelId = 'ch-1';
    this.platform = 'test';
    this.timestamp = new Date();
  }

  getMessageId(): string { return this.id; }
  getText(): string { return this.text; }
  getTimestamp(): Date { return this.timestamp; }
  setText(t: string): void { this.text = t; this.content = t; }
  getChannelId(): string { return this.channelId; }
  getAuthorId(): string { return 'user-1'; }
  getChannelTopic(): string | null { return null; }
  getUserMentions(): string[] { return []; }
  getChannelUsers(): string[] { return ['user-1']; }
  mentionsUsers(_userId: string): boolean { return false; }
  isFromBot(): boolean { return false; }
  getAuthorName(): string { return 'TestUser'; }
}

function makeCtx(overrides: Partial<MessageContext> = {}): MessageContext {
  return {
    message: new StubMessage(),
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'test',
    channelId: 'ch-1',
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ConsoleExporter
// ---------------------------------------------------------------------------

describe('ConsoleExporter', () => {
  // 1. ConsoleExporter logs trace summary via debug
  it('logs trace summary via debug without throwing', async () => {
    const exporter = new ConsoleExporter();
    const trace = makeTrace();

    // Should not throw
    await expect(exporter.export(trace)).resolves.toBeUndefined();
  });

  it('handles traces with zero-duration spans', async () => {
    const exporter = new ConsoleExporter();
    const trace = makeTrace();
    for (const span of trace.rootSpan.children) {
      span.durationMs = 0;
    }

    await expect(exporter.export(trace)).resolves.toBeUndefined();
  });

  it('handles traces with error spans', async () => {
    const exporter = new ConsoleExporter();
    const trace = makeTrace();
    trace.rootSpan.children[2].status = 'error';

    await expect(exporter.export(trace)).resolves.toBeUndefined();
  });

  it('shutdown resolves cleanly', async () => {
    const exporter = new ConsoleExporter();
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// JsonFileExporter
// ---------------------------------------------------------------------------

describe('JsonFileExporter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `trace-test-${randomUUID()}`);
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  // 2. JsonFileExporter appends NDJSON to file
  it('appends trace as NDJSON to file', async () => {
    const filePath = join(tmpDir, 'traces.ndjson');
    const exporter = new JsonFileExporter(filePath);
    const trace = makeTrace();

    await exporter.export(trace);

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.traceId).toBe(trace.traceId);
  });

  // 3. JsonFileExporter creates directory if missing
  it('creates directory if it does not exist', async () => {
    const filePath = join(tmpDir, 'nested', 'deep', 'traces.ndjson');
    const exporter = new JsonFileExporter(filePath);
    const trace = makeTrace();

    await exporter.export(trace);

    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.traceId).toBe(trace.traceId);
  });

  it('appends multiple traces as separate lines', async () => {
    const filePath = join(tmpDir, 'traces.ndjson');
    const exporter = new JsonFileExporter(filePath);

    const trace1 = makeTrace();
    const trace2 = makeTrace();

    await exporter.export(trace1);
    await exporter.export(trace2);

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);

    const parsed1 = JSON.parse(lines[0]);
    const parsed2 = JSON.parse(lines[1]);
    expect(parsed1.traceId).toBe(trace1.traceId);
    expect(parsed2.traceId).toBe(trace2.traceId);
  });

  it('shutdown resolves cleanly', async () => {
    const exporter = new JsonFileExporter(join(tmpDir, 'traces.ndjson'));
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });

  it('exposes file path via getFilePath()', () => {
    const filePath = '/some/path/traces.ndjson';
    const exporter = new JsonFileExporter(filePath);
    expect(exporter.getFilePath()).toBe(filePath);
  });
});

// ---------------------------------------------------------------------------
// OtlpExporter
// ---------------------------------------------------------------------------

describe('OtlpExporter', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // 4. OtlpExporter posts to endpoint
  it('posts trace to OTLP endpoint', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = jest.fn(async (url: any, init: any) => {
      capturedUrl = String(url);
      capturedBody = init.body;
      capturedHeaders = init.headers;
      return new Response('', { status: 200 });
    }) as any;

    const exporter = new OtlpExporter('http://localhost:4318');
    const trace = makeTrace();

    await exporter.export(trace);

    expect(capturedUrl).toBe('http://localhost:4318/v1/traces');
    expect(capturedHeaders['Content-Type']).toBe('application/json');

    const payload = JSON.parse(capturedBody);
    expect(payload.resourceSpans).toBeDefined();
    expect(payload.resourceSpans[0].scopeSpans[0].spans.length).toBe(trace.spans.length);
  });

  // 5. OtlpExporter handles network errors gracefully
  it('handles network errors gracefully without throwing', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('Network unreachable');
    }) as any;

    const exporter = new OtlpExporter('http://localhost:4318');
    const trace = makeTrace();

    // Should not throw
    await expect(exporter.export(trace)).resolves.toBeUndefined();
  });

  it('handles non-ok HTTP responses gracefully', async () => {
    globalThis.fetch = jest.fn(async () => {
      return new Response('Internal Server Error', { status: 500 });
    }) as any;

    const exporter = new OtlpExporter('http://localhost:4318');
    const trace = makeTrace();

    await expect(exporter.export(trace)).resolves.toBeUndefined();
  });

  it('appends /v1/traces to endpoint URL', () => {
    const exporter = new OtlpExporter('http://localhost:4318');
    expect(exporter.getEndpoint()).toBe('http://localhost:4318/v1/traces');
  });

  it('strips trailing slashes from endpoint URL', () => {
    const exporter = new OtlpExporter('http://localhost:4318/');
    expect(exporter.getEndpoint()).toBe('http://localhost:4318/v1/traces');
  });

  it('includes OTLP-format span attributes', async () => {
    let capturedBody = '';
    globalThis.fetch = jest.fn(async (_url: any, init: any) => {
      capturedBody = init.body;
      return new Response('', { status: 200 });
    }) as any;

    const trace = makeTrace();
    trace.rootSpan.attributes = {
      channelId: 'ch-1',
      platform: 'test',
      botName: 'TestBot',
    };

    const exporter = new OtlpExporter('http://localhost:4318');
    await exporter.export(trace);

    const payload = JSON.parse(capturedBody);
    const otlpSpans = payload.resourceSpans[0].scopeSpans[0].spans;
    const pipelineSpan = otlpSpans.find((s: any) => s.name === 'pipeline');

    expect(pipelineSpan.attributes).toBeDefined();
    expect(pipelineSpan.attributes.length).toBeGreaterThan(0);
  });

  it('shutdown resolves cleanly', async () => {
    const exporter = new OtlpExporter('http://localhost:4318');
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TraceExportManager
// ---------------------------------------------------------------------------

describe('TraceExportManager', () => {
  // 6. TraceExportManager routes to all exporters
  it('routes trace to all registered exporters', async () => {
    const exported: string[] = [];

    const exporter1: ITraceExporter = {
      export: jest.fn(async (trace) => { exported.push(`e1:${trace.traceId}`); }),
      shutdown: jest.fn(async () => {}),
    };
    const exporter2: ITraceExporter = {
      export: jest.fn(async (trace) => { exported.push(`e2:${trace.traceId}`); }),
      shutdown: jest.fn(async () => {}),
    };

    const manager = new TraceExportManager([exporter1, exporter2]);
    const trace = makeTrace();
    await manager.exportTrace(trace);

    expect(exported).toContain(`e1:${trace.traceId}`);
    expect(exported).toContain(`e2:${trace.traceId}`);
  });

  // 7. TraceExportManager handles exporter errors without blocking
  it('handles exporter errors without blocking other exporters', async () => {
    const exported: string[] = [];

    const failingExporter: ITraceExporter = {
      export: jest.fn(async () => { throw new Error('export failed'); }),
      shutdown: jest.fn(async () => {}),
    };
    const workingExporter: ITraceExporter = {
      export: jest.fn(async (trace) => { exported.push(trace.traceId); }),
      shutdown: jest.fn(async () => {}),
    };

    const manager = new TraceExportManager([failingExporter, workingExporter]);
    const trace = makeTrace();

    // Should not throw
    await expect(manager.exportTrace(trace)).resolves.toBeUndefined();

    // Working exporter should still have received the trace
    expect(exported).toContain(trace.traceId);
  });

  it('shutdown calls shutdown on all exporters', async () => {
    const shutdownCalls: string[] = [];

    const exporter1: ITraceExporter = {
      export: jest.fn(async () => {}),
      shutdown: jest.fn(async () => { shutdownCalls.push('e1'); }),
    };
    const exporter2: ITraceExporter = {
      export: jest.fn(async () => {}),
      shutdown: jest.fn(async () => { shutdownCalls.push('e2'); }),
    };

    const manager = new TraceExportManager([exporter1, exporter2]);
    await manager.shutdown();

    expect(shutdownCalls).toContain('e1');
    expect(shutdownCalls).toContain('e2');
  });

  it('exposes exporters via getExporters()', () => {
    const exporter: ITraceExporter = {
      export: jest.fn(async () => {}),
      shutdown: jest.fn(async () => {}),
    };

    const manager = new TraceExportManager([exporter]);
    expect(manager.getExporters()).toHaveLength(1);
    expect(manager.getExporters()[0]).toBe(exporter);
  });

  // 11. attach() subscribes to tracer completed traces
  it('attach() subscribes to tracer and exports completed traces', async () => {
    const exported: Trace[] = [];

    const mockExporter: ITraceExporter = {
      export: jest.fn(async (trace) => { exported.push(trace); }),
      shutdown: jest.fn(async () => {}),
    };

    MessageBus.getInstance().reset();
    const bus = MessageBus.getInstance();
    const tracer = new PipelineTracer(bus);
    tracer.register();

    const manager = new TraceExportManager([mockExporter]);
    manager.attach(tracer);

    // Trigger a full pipeline trace
    const ctx = makeCtx();
    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    bus.emit('message:skipped', { ...ctx, reason: 'skip' });

    // Allow async export to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(exported).toHaveLength(1);
    expect(exported[0].traceId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// createExporters() factory
// ---------------------------------------------------------------------------

describe('createExporters()', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    delete process.env.TRACE_LOG_FILE;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  // 8. createExporters() returns ConsoleExporter by default
  it('returns ConsoleExporter by default', () => {
    delete process.env.TRACE_LOG_FILE;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const exporters = createExporters();
    expect(exporters).toHaveLength(1);
    expect(exporters[0]).toBeInstanceOf(ConsoleExporter);
  });

  // 9. createExporters() adds JsonFileExporter when TRACE_LOG_FILE set
  it('adds JsonFileExporter when TRACE_LOG_FILE is set', () => {
    process.env.TRACE_LOG_FILE = '/tmp/test-traces.ndjson';
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    const exporters = createExporters();
    expect(exporters).toHaveLength(2);
    expect(exporters[0]).toBeInstanceOf(ConsoleExporter);
    expect(exporters[1]).toBeInstanceOf(JsonFileExporter);
  });

  // 10. createExporters() adds OtlpExporter when OTEL_EXPORTER_OTLP_ENDPOINT set
  it('adds OtlpExporter when OTEL_EXPORTER_OTLP_ENDPOINT is set', () => {
    delete process.env.TRACE_LOG_FILE;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    const exporters = createExporters();
    expect(exporters).toHaveLength(2);
    expect(exporters[0]).toBeInstanceOf(ConsoleExporter);
    expect(exporters[1]).toBeInstanceOf(OtlpExporter);
  });

  it('adds both JsonFileExporter and OtlpExporter when both env vars set', () => {
    process.env.TRACE_LOG_FILE = '/tmp/test-traces.ndjson';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    const exporters = createExporters();
    expect(exporters).toHaveLength(3);
    expect(exporters[0]).toBeInstanceOf(ConsoleExporter);
    expect(exporters[1]).toBeInstanceOf(JsonFileExporter);
    expect(exporters[2]).toBeInstanceOf(OtlpExporter);
  });
});
