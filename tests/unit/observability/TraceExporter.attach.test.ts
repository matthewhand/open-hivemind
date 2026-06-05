/**
 * Tests for the trace-export bootstrap wiring:
 *  - createExportersFromEnv() — TRACE_EXPORT env parsing (off by default)
 *  - attachTraceExporters()   — production entry point used by createPipeline
 *
 * These guard the wiring that connects the (already implemented) exporters to
 * a live PipelineTracer so that completed traces are actually exported.
 */

import {
  ConsoleExporter,
  JsonFileExporter,
  OtlpExporter,
  TraceExportManager,
  createExportersFromEnv,
  attachTraceExporters,
} from '../../../src/observability/TraceExporter';
import type { ITraceExporter } from '../../../src/observability/TraceExporter';
import { PipelineTracer } from '../../../src/observability/PipelineTracer';
import type { Trace } from '../../../src/observability/PipelineTracer';
import { MessageBus } from '../../../src/events/MessageBus';
import type { MessageContext, MessageEvents } from '../../../src/events/types';
import type { IMessage } from '@hivemind/shared-types';

function makeMessage(): IMessage {
  return {
    getText: () => 'hello',
    getMessageId: () => 'msg-1',
    getChannelId: () => 'chan-1',
    getAuthorId: () => 'user-1',
  } as unknown as IMessage;
}

function makeContext(): MessageContext {
  return {
    message: makeMessage(),
    history: [],
    botConfig: { BOT_NAME: 'TestBot' },
    botName: 'TestBot',
    platform: 'discord',
    channelId: 'chan-1',
    metadata: { receive: { receivedAt: Date.now() } },
  } as unknown as MessageContext;
}

describe('createExportersFromEnv', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('returns no exporters when TRACE_EXPORT is unset (off by default)', () => {
    delete process.env.TRACE_EXPORT;
    expect(createExportersFromEnv()).toEqual([]);
  });

  it('returns no exporters for an empty / whitespace value', () => {
    expect(createExportersFromEnv('')).toEqual([]);
    expect(createExportersFromEnv('   ')).toEqual([]);
  });

  it('selects the console backend', () => {
    const exporters = createExportersFromEnv('console');
    expect(exporters).toHaveLength(1);
    expect(exporters[0]).toBeInstanceOf(ConsoleExporter);
  });

  it('selects the file backend using TRACE_LOG_FILE', () => {
    process.env.TRACE_LOG_FILE = 'logs/custom.ndjson';
    const exporters = createExportersFromEnv('file');
    expect(exporters).toHaveLength(1);
    expect(exporters[0]).toBeInstanceOf(JsonFileExporter);
    expect((exporters[0] as JsonFileExporter).getFilePath()).toBe('logs/custom.ndjson');
  });

  it('selects the otlp backend only when the endpoint is configured', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(createExportersFromEnv('otlp')).toEqual([]);

    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    const exporters = createExportersFromEnv('otlp');
    expect(exporters).toHaveLength(1);
    expect(exporters[0]).toBeInstanceOf(OtlpExporter);
  });

  it('parses a comma-separated list and ignores unknown backends', () => {
    const exporters = createExportersFromEnv('console, bogus , file');
    expect(exporters).toHaveLength(2);
    expect(exporters[0]).toBeInstanceOf(ConsoleExporter);
    expect(exporters[1]).toBeInstanceOf(JsonFileExporter);
  });
});

describe('attachTraceExporters', () => {
  const ORIGINAL = { ...process.env };
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    bus.reset();
  });

  it('returns undefined and attaches nothing when TRACE_EXPORT is off', () => {
    delete process.env.TRACE_EXPORT;
    const tracer = new PipelineTracer(bus);
    expect(attachTraceExporters(tracer)).toBeUndefined();
  });

  it('attaches a manager that exports completed traces when enabled', async () => {
    process.env.TRACE_EXPORT = 'console';

    const exported: Trace[] = [];
    const captureExporter: ITraceExporter = {
      export: async (t) => {
        exported.push(t);
      },
      shutdown: async () => {},
    };

    const tracer = new PipelineTracer(bus);
    tracer.register();

    const manager = attachTraceExporters(tracer);
    expect(manager).toBeInstanceOf(TraceExportManager);
    // Add a capture exporter so we can assert a real trace flows through.
    manager!.getExporters().push(captureExporter);

    // Drive a full trace through the bus: incoming -> ... -> sent.
    const ctx = makeContext();
    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true },
    } as unknown as MessageEvents['message:accepted']);
    bus.emit('message:enriched', {
      ...ctx,
      memories: [],
      systemPrompt: '',
    } as MessageEvents['message:enriched']);
    bus.emit('message:response', {
      ...ctx,
      responseText: 'hi',
    } as MessageEvents['message:response']);
    bus.emit('message:sent', {
      ...ctx,
      responseText: 'hi',
      parts: ['hi'],
    } as MessageEvents['message:sent']);

    // exportTrace is fire-and-forget; let the microtask queue drain.
    await Promise.resolve();
    await Promise.resolve();

    expect(exported).toHaveLength(1);
    expect(exported[0].traceId).toBeDefined();
  });
});
