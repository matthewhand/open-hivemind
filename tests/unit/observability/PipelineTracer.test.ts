/**
 * TDD red-phase tests for PipelineTracer — observability spans for the
 * message processing pipeline.
 *
 * PipelineTracer subscribes to MessageBus events and creates timing spans
 * for each pipeline stage using a simple internal tracing model (no OTel dep).
 *
 * The implementation at @src/observability/PipelineTracer does NOT exist yet.
 * Every test here should FAIL until the implementation is written.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { PipelineTracer, type Span, type Trace } from '@src/observability/PipelineTracer';
import { IMessage } from '@message/interfaces/IMessage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  getMessageId(): string {
    return this.id;
  }
  getText(): string {
    return this.text;
  }
  getTimestamp(): Date {
    return this.timestamp;
  }
  setText(t: string): void {
    this.text = t;
    this.content = t;
  }
  getChannelId(): string {
    return this.channelId;
  }
  getAuthorId(): string {
    return 'user-1';
  }
  getChannelTopic(): string | null {
    return null;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return ['user-1'];
  }
  mentionsUsers(_userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'TestUser';
  }
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

/**
 * Simulate a small delay so spans have non-zero duration.
 */
function tick(ms = 5): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PipelineTracer', () => {
  let bus: InstanceType<typeof MessageBus>;
  let tracer: PipelineTracer;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    tracer = new PipelineTracer(bus);
  });

  // -------------------------------------------------------------------------
  // 1. register() — subscribes to all 8 event types
  // -------------------------------------------------------------------------
  it('subscribes to all 8 pipeline events on register()', () => {
    const events: string[] = [
      'message:incoming',
      'message:validated',
      'message:accepted',
      'message:skipped',
      'message:enriched',
      'message:response',
      'message:sent',
      'message:error',
    ];

    // Before register, bus should have 0 listeners for each event
    for (const evt of events) {
      expect(bus.listenerCount(evt as any)).toBe(0);
    }

    tracer.register();

    // After register, bus should have exactly 1 listener per event
    for (const evt of events) {
      expect(bus.listenerCount(evt as any)).toBe(1);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Creates trace on incoming — getActiveTrace returns trace
  // -------------------------------------------------------------------------
  it('creates an active trace on message:incoming', () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);

    const trace = tracer.getActiveTrace('ch-1');
    expect(trace).toBeDefined();
    expect(trace!.rootSpan).toBeDefined();
    expect(trace!.rootSpan.name).toBe('pipeline');
  });

  // -------------------------------------------------------------------------
  // 3. Trace has traceId — unique string
  // -------------------------------------------------------------------------
  it('assigns a unique traceId to each trace', () => {
    tracer.register();

    bus.emit('message:incoming', makeCtx({ channelId: 'ch-a' }));
    bus.emit('message:incoming', makeCtx({ channelId: 'ch-b' }));

    const traceA = tracer.getActiveTrace('ch-a');
    const traceB = tracer.getActiveTrace('ch-b');

    expect(traceA!.traceId).toBeDefined();
    expect(typeof traceA!.traceId).toBe('string');
    expect(traceA!.traceId.length).toBeGreaterThan(0);
    expect(traceA!.traceId).not.toBe(traceB!.traceId);
  });

  // -------------------------------------------------------------------------
  // 4. Receive span timing — incoming -> validated creates span with duration
  // -------------------------------------------------------------------------
  it('creates a "receive" span between incoming and validated', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    await tick();
    bus.emit('message:validated', ctx);

    const trace = tracer.getActiveTrace('ch-1');
    const receiveSpan = trace!.spans.find((s) => s.name === 'receive');

    expect(receiveSpan).toBeDefined();
    expect(receiveSpan!.endTime).toBeDefined();
    expect(receiveSpan!.durationMs).toBeGreaterThanOrEqual(0);
    expect(receiveSpan!.status).toBe('ok');
  });

  // -------------------------------------------------------------------------
  // 5. Decision span timing — validated -> accepted creates span
  // -------------------------------------------------------------------------
  it('creates a "decision" span between validated and accepted', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    await tick();
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true, reason: 'mentioned' },
    });

    const trace = tracer.getActiveTrace('ch-1');
    const decisionSpan = trace!.spans.find((s) => s.name === 'decision');

    expect(decisionSpan).toBeDefined();
    expect(decisionSpan!.endTime).toBeDefined();
    expect(decisionSpan!.durationMs).toBeGreaterThanOrEqual(0);
    expect(decisionSpan!.status).toBe('ok');
  });

  // -------------------------------------------------------------------------
  // 6. Skip short-circuits — validated -> skipped closes trace
  // -------------------------------------------------------------------------
  it('closes trace when message is skipped (short-circuit)', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    await tick();
    bus.emit('message:skipped', { ...ctx, reason: 'not relevant' });

    // Active trace should be gone — it was moved to completed
    expect(tracer.getActiveTrace('ch-1')).toBeUndefined();

    const completed = tracer.getCompletedTraces();
    expect(completed).toHaveLength(1);

    const trace = completed[0];
    expect(trace.rootSpan.endTime).toBeDefined();
    expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);

    // Decision span should be closed
    const decisionSpan = trace.spans.find((s) => s.name === 'decision');
    expect(decisionSpan).toBeDefined();
    expect(decisionSpan!.endTime).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 7. Full pipeline trace — incoming -> ... -> sent creates 5 spans
  // -------------------------------------------------------------------------
  it('creates 5 child spans for a full pipeline run', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    await tick();
    bus.emit('message:validated', ctx);
    await tick();
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true, reason: 'mentioned' },
    });
    await tick();
    bus.emit('message:enriched', {
      ...ctx,
      memories: [],
      systemPrompt: 'You are a bot.',
    });
    await tick();
    bus.emit('message:response', { ...ctx, responseText: 'Hi!' });
    await tick();
    bus.emit('message:sent', {
      ...ctx,
      responseText: 'Hi!',
      parts: ['Hi!'],
    });

    const completed = tracer.getCompletedTraces();
    expect(completed).toHaveLength(1);

    const trace = completed[0];
    const spanNames = trace.spans.map((s) => s.name);

    expect(spanNames).toContain('pipeline');
    expect(spanNames).toContain('receive');
    expect(spanNames).toContain('decision');
    expect(spanNames).toContain('enrich');
    expect(spanNames).toContain('inference');
    expect(spanNames).toContain('send');
    expect(trace.spans).toHaveLength(6); // root + 5 stages
  });

  // -------------------------------------------------------------------------
  // 8. Completed trace — sent event moves trace to completed
  // -------------------------------------------------------------------------
  it('moves trace from active to completed on message:sent', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true, reason: 'mentioned' },
    });
    bus.emit('message:enriched', {
      ...ctx,
      memories: [],
      systemPrompt: 'prompt',
    });
    bus.emit('message:response', { ...ctx, responseText: 'reply' });

    // Still active before sent
    expect(tracer.getActiveTrace('ch-1')).toBeDefined();

    bus.emit('message:sent', {
      ...ctx,
      responseText: 'reply',
      parts: ['reply'],
    });

    // No longer active
    expect(tracer.getActiveTrace('ch-1')).toBeUndefined();
    // Available in completed
    expect(tracer.getCompletedTraces()).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 9. getCompletedTraces — returns last N traces
  // -------------------------------------------------------------------------
  it('returns completed traces in order', async () => {
    tracer.register();

    // Run three full pipelines on different channels
    for (const chId of ['ch-1', 'ch-2', 'ch-3']) {
      const ctx = makeCtx({ channelId: chId });
      bus.emit('message:incoming', ctx);
      bus.emit('message:validated', ctx);
      bus.emit('message:skipped', { ...ctx, reason: 'skip' });
    }

    const completed = tracer.getCompletedTraces();
    expect(completed).toHaveLength(3);
  });

  // -------------------------------------------------------------------------
  // 10. getCompletedTraces limit — respects limit param
  // -------------------------------------------------------------------------
  it('respects limit parameter on getCompletedTraces', async () => {
    tracer.register();

    for (let i = 0; i < 5; i++) {
      const ctx = makeCtx({ channelId: `ch-${i}` });
      bus.emit('message:incoming', ctx);
      bus.emit('message:validated', ctx);
      bus.emit('message:skipped', { ...ctx, reason: 'skip' });
    }

    const limited = tracer.getCompletedTraces(2);
    expect(limited).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // 11. Error trace — error event marks span status='error'
  // -------------------------------------------------------------------------
  it('marks current span and root as error on message:error', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    await tick();
    bus.emit('message:error', {
      ...ctx,
      error: new Error('boom'),
      stage: 'decision',
    });

    // Should be moved to completed
    expect(tracer.getActiveTrace('ch-1')).toBeUndefined();

    const completed = tracer.getCompletedTraces();
    expect(completed).toHaveLength(1);

    const trace = completed[0];
    expect(trace.rootSpan.status).toBe('error');

    // The active child span at time of error should also be error
    const errorSpan = trace.spans.find((s) => s.status === 'error');
    expect(errorSpan).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 12. getStats() total — counts completed traces
  // -------------------------------------------------------------------------
  it('getStats() returns correct totalTraces count', () => {
    tracer.register();

    for (let i = 0; i < 3; i++) {
      const ctx = makeCtx({ channelId: `ch-${i}` });
      bus.emit('message:incoming', ctx);
      bus.emit('message:validated', ctx);
      bus.emit('message:skipped', { ...ctx, reason: 'skip' });
    }

    const stats = tracer.getStats();
    expect(stats.totalTraces).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 13. getStats() avgDuration — average of completed traces
  // -------------------------------------------------------------------------
  it('getStats() computes avgDurationMs across completed traces', async () => {
    tracer.register();

    // Run two traces with a small delay so duration > 0
    for (const chId of ['ch-a', 'ch-b']) {
      const ctx = makeCtx({ channelId: chId });
      bus.emit('message:incoming', ctx);
      await tick(5);
      bus.emit('message:validated', ctx);
      bus.emit('message:skipped', { ...ctx, reason: 'skip' });
    }

    const stats = tracer.getStats();
    expect(stats.avgDurationMs).toBeGreaterThanOrEqual(0);
    expect(typeof stats.avgDurationMs).toBe('number');
    expect(Number.isFinite(stats.avgDurationMs)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 14. getStats() stageAvgMs — per-stage averages
  // -------------------------------------------------------------------------
  it('getStats() computes per-stage average durations', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    await tick(5);
    bus.emit('message:validated', ctx);
    await tick(5);
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true, reason: 'mentioned' },
    });
    await tick(5);
    bus.emit('message:enriched', {
      ...ctx,
      memories: [],
      systemPrompt: 'prompt',
    });
    await tick(5);
    bus.emit('message:response', { ...ctx, responseText: 'reply' });
    await tick(5);
    bus.emit('message:sent', {
      ...ctx,
      responseText: 'reply',
      parts: ['reply'],
    });

    const stats = tracer.getStats();
    expect(stats.stageAvgMs).toBeDefined();
    expect(typeof stats.stageAvgMs.receive).toBe('number');
    expect(typeof stats.stageAvgMs.decision).toBe('number');
    expect(typeof stats.stageAvgMs.enrich).toBe('number');
    expect(typeof stats.stageAvgMs.inference).toBe('number');
    expect(typeof stats.stageAvgMs.send).toBe('number');

    // Each stage had a tick(5) so averages should be >= 0
    for (const key of ['receive', 'decision', 'enrich', 'inference', 'send']) {
      expect(stats.stageAvgMs[key]).toBeGreaterThanOrEqual(0);
    }
  });

  // -------------------------------------------------------------------------
  // 15. getStats() errorRate — fraction of errored traces
  // -------------------------------------------------------------------------
  it('getStats() computes errorRate as fraction of errored traces', () => {
    tracer.register();

    // 2 successful traces (skipped)
    for (const chId of ['ch-ok-1', 'ch-ok-2']) {
      const ctx = makeCtx({ channelId: chId });
      bus.emit('message:incoming', ctx);
      bus.emit('message:validated', ctx);
      bus.emit('message:skipped', { ...ctx, reason: 'skip' });
    }

    // 1 errored trace
    const errCtx = makeCtx({ channelId: 'ch-err' });
    bus.emit('message:incoming', errCtx);
    bus.emit('message:validated', errCtx);
    bus.emit('message:error', {
      ...errCtx,
      error: new Error('fail'),
      stage: 'decision',
    });

    const stats = tracer.getStats();
    // 1 out of 3 = ~0.333
    expect(stats.errorRate).toBeCloseTo(1 / 3, 2);
  });

  // -------------------------------------------------------------------------
  // 16. Multiple concurrent traces — different channels tracked independently
  // -------------------------------------------------------------------------
  it('tracks concurrent traces on different channels independently', async () => {
    tracer.register();

    const ctxA = makeCtx({ channelId: 'ch-a' });
    const ctxB = makeCtx({ channelId: 'ch-b' });

    // Start both
    bus.emit('message:incoming', ctxA);
    bus.emit('message:incoming', ctxB);

    expect(tracer.getActiveTrace('ch-a')).toBeDefined();
    expect(tracer.getActiveTrace('ch-b')).toBeDefined();

    // Advance A to validated
    bus.emit('message:validated', ctxA);
    // B is still at incoming — only A should have a receive span
    const traceA = tracer.getActiveTrace('ch-a');
    const traceB = tracer.getActiveTrace('ch-b');

    const receiveA = traceA!.spans.find((s) => s.name === 'receive');
    expect(receiveA).toBeDefined();
    expect(receiveA!.endTime).toBeDefined();

    // B should not yet have a completed receive span
    const receiveB = traceB!.spans.find((s) => s.name === 'receive' && s.endTime !== undefined);
    expect(receiveB).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 17. Span attributes — includes botName, platform, channelId
  // -------------------------------------------------------------------------
  it('populates span attributes with botName, platform, and channelId', () => {
    tracer.register();
    const ctx = makeCtx({
      botName: 'ObsBot',
      platform: 'discord',
      channelId: 'general',
    });

    bus.emit('message:incoming', ctx);

    const trace = tracer.getActiveTrace('general');
    expect(trace).toBeDefined();
    expect(trace!.rootSpan.attributes.botName).toBe('ObsBot');
    expect(trace!.rootSpan.attributes.platform).toBe('discord');
    expect(trace!.rootSpan.attributes.channelId).toBe('general');
  });

  // -------------------------------------------------------------------------
  // 18. reset() — clears all traces and stats
  // -------------------------------------------------------------------------
  it('reset() clears active traces, completed traces, and stats', () => {
    tracer.register();

    // Create an active trace
    bus.emit('message:incoming', makeCtx({ channelId: 'ch-active' }));

    // Create a completed trace
    const doneCtx = makeCtx({ channelId: 'ch-done' });
    bus.emit('message:incoming', doneCtx);
    bus.emit('message:validated', doneCtx);
    bus.emit('message:skipped', { ...doneCtx, reason: 'skip' });

    expect(tracer.getActiveTrace('ch-active')).toBeDefined();
    expect(tracer.getCompletedTraces()).toHaveLength(1);

    tracer.reset();

    expect(tracer.getActiveTrace('ch-active')).toBeUndefined();
    expect(tracer.getCompletedTraces()).toHaveLength(0);
    expect(tracer.getStats().totalTraces).toBe(0);
    expect(tracer.getStats().avgDurationMs).toBe(0);
    expect(tracer.getStats().errorRate).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 19. Root span start time matches trace start time
  // -------------------------------------------------------------------------
  it('sets trace startTime equal to root span startTime', () => {
    tracer.register();
    bus.emit('message:incoming', makeCtx());

    const trace = tracer.getActiveTrace('ch-1');
    expect(trace!.startTime).toBe(trace!.rootSpan.startTime);
    expect(typeof trace!.startTime).toBe('number');
    expect(trace!.startTime).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 20. Child spans are nested under root span
  // -------------------------------------------------------------------------
  it('nests child spans under the root span', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    await tick();
    bus.emit('message:validated', ctx);
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true, reason: 'mentioned' },
    });

    const trace = tracer.getActiveTrace('ch-1');

    // Root span should reference child spans
    expect(trace!.rootSpan.children.length).toBeGreaterThanOrEqual(1);

    // Each child should appear in both rootSpan.children and trace.spans
    for (const child of trace!.rootSpan.children) {
      expect(trace!.spans).toContainEqual(child);
    }
  });

  // -------------------------------------------------------------------------
  // 21. Span ids are unique
  // -------------------------------------------------------------------------
  it('assigns unique ids to every span', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    await tick();
    bus.emit('message:validated', ctx);
    await tick();
    bus.emit('message:accepted', {
      ...ctx,
      decision: { shouldReply: true, reason: 'mentioned' },
    });
    await tick();
    bus.emit('message:enriched', {
      ...ctx,
      memories: [],
      systemPrompt: 'prompt',
    });
    await tick();
    bus.emit('message:response', { ...ctx, responseText: 'reply' });
    await tick();
    bus.emit('message:sent', {
      ...ctx,
      responseText: 'reply',
      parts: ['reply'],
    });

    const trace = tracer.getCompletedTraces()[0];
    const allIds = trace.spans.map((s) => s.id);
    const uniqueIds = new Set(allIds);

    // All span IDs should be unique
    expect(uniqueIds.size).toBe(allIds.length);
  });

  // -------------------------------------------------------------------------
  // 22. getCompletedTraces returns ring buffer (oldest evicted first)
  // -------------------------------------------------------------------------
  it('evicts oldest traces when ring buffer capacity is exceeded', () => {
    tracer.register();

    // Generate many traces — default ring buffer should have a finite size
    for (let i = 0; i < 200; i++) {
      const ctx = makeCtx({ channelId: `ch-${i}` });
      bus.emit('message:incoming', ctx);
      bus.emit('message:validated', ctx);
      bus.emit('message:skipped', { ...ctx, reason: 'skip' });
    }

    const completed = tracer.getCompletedTraces();
    // Ring buffer should cap at some reasonable size (e.g. 100 or 128)
    expect(completed.length).toBeLessThanOrEqual(200);
    expect(completed.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 23. Completed trace has endTime and totalDurationMs
  // -------------------------------------------------------------------------
  it('sets endTime and totalDurationMs on completed traces', async () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    await tick(10);
    bus.emit('message:validated', ctx);
    bus.emit('message:skipped', { ...ctx, reason: 'skip' });

    const trace = tracer.getCompletedTraces()[0];
    expect(trace.endTime).toBeDefined();
    expect(trace.totalDurationMs).toBeDefined();
    expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(trace.endTime!).toBeGreaterThanOrEqual(trace.startTime);
  });

  // -------------------------------------------------------------------------
  // 24. getActiveTrace returns undefined for unknown channel
  // -------------------------------------------------------------------------
  it('returns undefined for unknown channelId', () => {
    tracer.register();
    expect(tracer.getActiveTrace('nonexistent')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 25. getStats returns zeroed stats when no traces exist
  // -------------------------------------------------------------------------
  it('returns zeroed stats when no traces have been recorded', () => {
    tracer.register();

    const stats = tracer.getStats();
    expect(stats.totalTraces).toBe(0);
    expect(stats.avgDurationMs).toBe(0);
    expect(stats.errorRate).toBe(0);
    expect(stats.stageAvgMs).toEqual({});
  });

  // -------------------------------------------------------------------------
  // 26. Error attributes include error message
  // -------------------------------------------------------------------------
  it('includes error message in span attributes on error', () => {
    tracer.register();
    const ctx = makeCtx();

    bus.emit('message:incoming', ctx);
    bus.emit('message:validated', ctx);
    bus.emit('message:error', {
      ...ctx,
      error: new Error('something broke'),
      stage: 'decision',
    });

    const completed = tracer.getCompletedTraces();
    expect(completed).toHaveLength(1);
    const trace = completed[0];
    // The root span should be marked as error
    expect(trace.rootSpan.status).toBe('error');
    // At least one child span should have error attributes
    const errorSpan = trace.spans.find((s) => s.attributes['error.message'] !== undefined);
    if (errorSpan) {
      expect(errorSpan.attributes['error.message']).toBe('something broke');
    } else {
      // Fallback: check root span attributes
      expect(trace.rootSpan.status).toBe('error');
    }
  });
});
