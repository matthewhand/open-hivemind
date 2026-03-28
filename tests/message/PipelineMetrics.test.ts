import { PipelineMetrics, pipelineEventEmitter } from '@message/PipelineMetrics';
import { PipelineMetricsAggregator } from '@message/PipelineMetricsAggregator';

describe('PipelineMetrics', () => {
  it('should track stage start and end times', () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('receive');
    metrics.endStage('receive');

    const timings = metrics.getTimings();
    expect(timings).toHaveLength(1);
    expect(timings[0].stage).toBe('receive');
    expect(timings[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should preserve stage execution order', () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('receive');
    metrics.endStage('receive');
    metrics.startStage('validate');
    metrics.endStage('validate');
    metrics.startStage('llm_inference');
    metrics.endStage('llm_inference');

    const timings = metrics.getTimings();
    expect(timings.map((t) => t.stage)).toEqual(['receive', 'validate', 'llm_inference']);
  });

  it('should attach metadata to stages', () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('receive');
    metrics.endStage('receive', { bytes: 1024 });

    const timings = metrics.getTimings();
    expect(timings[0].metadata).toEqual({ bytes: 1024 });
  });

  it('should only include completed stages in getTimings', () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('receive');
    metrics.endStage('receive');
    metrics.startStage('validate'); // not ended

    const timings = metrics.getTimings();
    expect(timings).toHaveLength(1);
    expect(timings[0].stage).toBe('receive');
  });

  it('should identify the bottleneck stage correctly', async () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('fast');
    metrics.endStage('fast');

    metrics.startStage('slow');
    await new Promise((r) => setTimeout(r, 20));
    metrics.endStage('slow');

    metrics.startStage('medium');
    await new Promise((r) => setTimeout(r, 5));
    metrics.endStage('medium');

    const bottleneck = metrics.getBottleneck();
    expect(bottleneck.stage).toBe('slow');
    expect(bottleneck.durationMs).toBeGreaterThanOrEqual(15);
  });

  it('should return "none" bottleneck when no stages are completed', () => {
    const metrics = new PipelineMetrics();
    const bottleneck = metrics.getBottleneck();
    expect(bottleneck).toEqual({ stage: 'none', durationMs: 0 });
  });

  it('should compute total duration', async () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('a');
    await new Promise((r) => setTimeout(r, 10));
    metrics.endStage('a');

    const total = metrics.getTotalDuration();
    expect(total).toBeGreaterThanOrEqual(5);
  });

  it('should serialize to JSON', () => {
    const metrics = new PipelineMetrics();
    metrics.startStage('receive');
    metrics.endStage('receive', { ok: true });

    const json = metrics.toJSON() as any;
    expect(json).toHaveProperty('totalDurationMs');
    expect(json).toHaveProperty('bottleneck');
    expect(json).toHaveProperty('stages');
    expect(json.stages).toHaveLength(1);
    expect(json.stages[0].stage).toBe('receive');
    expect(json.bottleneck.stage).toBe('receive');
  });

  it('should handle endStage called without startStage', () => {
    const metrics = new PipelineMetrics();
    metrics.endStage('orphan', { note: 'no start' });

    const timings = metrics.getTimings();
    expect(timings).toHaveLength(1);
    expect(timings[0].stage).toBe('orphan');
    expect(timings[0].durationMs).toBe(0);
    expect(timings[0].metadata).toEqual({ note: 'no start' });
  });
});

describe('PipelineMetricsAggregator', () => {
  beforeEach(() => {
    PipelineMetricsAggregator.resetInstance();
  });

  it('should record pipeline data and return aggregate stats', () => {
    const agg = PipelineMetricsAggregator.getInstance();

    agg.record({
      stages: [
        { stage: 'receive', durationMs: 10 },
        { stage: 'llm_inference', durationMs: 500 },
      ],
      bottleneck: { stage: 'llm_inference', durationMs: 500 },
    });

    const stats = agg.getAggregateStats();
    expect(stats.totalPipelines).toBe(1);
    expect(stats.stages['receive'].avg).toBe(10);
    expect(stats.stages['llm_inference'].avg).toBe(500);
    expect(stats.bottleneckFrequency['llm_inference'].count).toBe(1);
    expect(stats.bottleneckFrequency['llm_inference'].percentage).toBe(100);
  });

  it('should compute correct percentiles', () => {
    const agg = new PipelineMetricsAggregator();

    // Record 100 pipelines with ascending latencies
    for (let i = 1; i <= 100; i++) {
      agg.record({
        stages: [{ stage: 'llm', durationMs: i }],
        bottleneck: { stage: 'llm', durationMs: i },
      });
    }

    const stats = agg.getAggregateStats();
    expect(stats.stages['llm'].p50).toBe(50);
    expect(stats.stages['llm'].p95).toBe(95);
    expect(stats.stages['llm'].p99).toBe(99);
    expect(stats.stages['llm'].sampleCount).toBe(100);
  });

  it('should track bottleneck frequency across multiple pipelines', () => {
    const agg = new PipelineMetricsAggregator();

    // llm is bottleneck 3 times, send is bottleneck 1 time
    for (let i = 0; i < 3; i++) {
      agg.record({
        stages: [
          { stage: 'receive', durationMs: 5 },
          { stage: 'llm', durationMs: 500 },
        ],
        bottleneck: { stage: 'llm', durationMs: 500 },
      });
    }
    agg.record({
      stages: [
        { stage: 'receive', durationMs: 5 },
        { stage: 'send', durationMs: 600 },
      ],
      bottleneck: { stage: 'send', durationMs: 600 },
    });

    const stats = agg.getAggregateStats();
    expect(stats.totalPipelines).toBe(4);
    expect(stats.bottleneckFrequency['llm'].count).toBe(3);
    expect(stats.bottleneckFrequency['llm'].percentage).toBe(75);
    expect(stats.bottleneckFrequency['send'].count).toBe(1);
    expect(stats.bottleneckFrequency['send'].percentage).toBe(25);
  });

  it('should enforce maxSamples rolling window', () => {
    const agg = new PipelineMetricsAggregator(5);

    for (let i = 1; i <= 10; i++) {
      agg.record({
        stages: [{ stage: 'x', durationMs: i }],
        bottleneck: { stage: 'x', durationMs: i },
      });
    }

    const stats = agg.getAggregateStats();
    // Only the last 5 samples should remain: 6,7,8,9,10
    expect(stats.stages['x'].sampleCount).toBe(5);
    expect(stats.stages['x'].avg).toBe(8); // (6+7+8+9+10)/5 = 8
  });

  it('should ignore "none" bottleneck', () => {
    const agg = new PipelineMetricsAggregator();
    agg.record({
      stages: [],
      bottleneck: { stage: 'none', durationMs: 0 },
    });

    const stats = agg.getAggregateStats();
    expect(Object.keys(stats.bottleneckFrequency)).toHaveLength(0);
  });

  it('should return singleton via getInstance', () => {
    const a = PipelineMetricsAggregator.getInstance();
    const b = PipelineMetricsAggregator.getInstance();
    expect(a).toBe(b);
  });
});

describe('pipelineEventEmitter', () => {
  it('should emit pipeline:complete events', (done) => {
    const handler = (data: any) => {
      expect(data).toHaveProperty('totalDurationMs');
      expect(data).toHaveProperty('stages');
      pipelineEventEmitter.removeListener('pipeline:complete', handler);
      done();
    };
    pipelineEventEmitter.on('pipeline:complete', handler);

    const metrics = new PipelineMetrics();
    metrics.startStage('test');
    metrics.endStage('test');
    pipelineEventEmitter.emit('pipeline:complete', metrics.toJSON());
  });
});
