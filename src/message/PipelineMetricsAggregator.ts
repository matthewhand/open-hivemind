/**
 * Aggregates pipeline metrics across multiple message processing runs.
 *
 * Tracks rolling averages, percentile latencies (P50/P95/P99), and
 * bottleneck frequency to help identify systemic performance issues.
 */
export class PipelineMetricsAggregator {
  private static instance: PipelineMetricsAggregator;

  /** Per-stage latency samples, capped at maxSamples. */
  private stageSamples: Map<string, number[]> = new Map();

  /** How often each stage was the bottleneck. */
  private bottleneckCounts: Map<string, number> = new Map();

  /** Total pipelines recorded. */
  private totalPipelines = 0;

  /** Maximum samples retained per stage (rolling window). */
  private readonly maxSamples: number;

  constructor(maxSamples = 1000) {
    this.maxSamples = maxSamples;
  }

  static getInstance(): PipelineMetricsAggregator {
    if (!PipelineMetricsAggregator.instance) {
      PipelineMetricsAggregator.instance = new PipelineMetricsAggregator();
    }
    return PipelineMetricsAggregator.instance;
  }

  /** Reset singleton — mainly for tests. */
  static resetInstance(): void {
    PipelineMetricsAggregator.instance = undefined as any;
  }

  /**
   * Record the result of a single pipeline run.
   *
   * @param pipelineJson - The output of PipelineMetrics.toJSON()
   */
  record(pipelineJson: {
    stages?: Array<{ stage: string; durationMs: number }>;
    bottleneck?: { stage: string; durationMs: number };
  }): void {
    this.totalPipelines++;

    if (pipelineJson.stages) {
      for (const { stage, durationMs } of pipelineJson.stages) {
        let samples = this.stageSamples.get(stage);
        if (!samples) {
          samples = [];
          this.stageSamples.set(stage, samples);
        }
        samples.push(durationMs);
        // Evict oldest when over limit
        if (samples.length > this.maxSamples) {
          samples.shift();
        }
      }
    }

    if (pipelineJson.bottleneck && pipelineJson.bottleneck.stage !== 'none') {
      const stage = pipelineJson.bottleneck.stage;
      this.bottleneckCounts.set(stage, (this.bottleneckCounts.get(stage) || 0) + 1);
    }
  }

  /**
   * Compute a percentile from a sorted array of numbers.
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  /**
   * Return aggregate stats suitable for a health endpoint.
   */
  getAggregateStats(): {
    totalPipelines: number;
    stages: Record<
      string,
      { avg: number; p50: number; p95: number; p99: number; sampleCount: number }
    >;
    bottleneckFrequency: Record<string, { count: number; percentage: number }>;
  } {
    const stages: Record<
      string,
      { avg: number; p50: number; p95: number; p99: number; sampleCount: number }
    > = {};

    for (const [stage, samples] of this.stageSamples.entries()) {
      const sorted = [...samples].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      stages[stage] = {
        avg: Math.round(sum / sorted.length),
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
        sampleCount: sorted.length,
      };
    }

    const bottleneckFrequency: Record<string, { count: number; percentage: number }> = {};
    for (const [stage, count] of this.bottleneckCounts.entries()) {
      bottleneckFrequency[stage] = {
        count,
        percentage:
          this.totalPipelines > 0 ? Math.round((count / this.totalPipelines) * 10000) / 100 : 0,
      };
    }

    return {
      totalPipelines: this.totalPipelines,
      stages,
      bottleneckFrequency,
    };
  }
}
