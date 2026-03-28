import { EventEmitter } from 'events';

/**
 * Global event emitter for pipeline metric events.
 * Consumers can subscribe to 'pipeline:complete' to receive timing data.
 */
export const pipelineEventEmitter = new EventEmitter();

interface StageEntry {
  startMs: number;
  endMs?: number;
  metadata?: Record<string, unknown>;
}

interface StageTiming {
  stage: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * Tracks per-stage timing and metadata for a single message processing pipeline run.
 *
 * Usage:
 *   const metrics = new PipelineMetrics();
 *   metrics.startStage('receive');
 *   // ... do work ...
 *   metrics.endStage('receive', { bytes: 1024 });
 */
export class PipelineMetrics {
  private stages: Map<string, StageEntry> = new Map();
  private stageOrder: string[] = [];
  private pipelineStartMs: number;

  constructor() {
    this.pipelineStartMs = Date.now();
  }

  /**
   * Mark the beginning of a named stage.
   */
  startStage(name: string): void {
    this.stages.set(name, { startMs: Date.now() });
    if (!this.stageOrder.includes(name)) {
      this.stageOrder.push(name);
    }
  }

  /**
   * Mark the end of a named stage, optionally attaching metadata.
   */
  endStage(name: string, metadata?: Record<string, unknown>): void {
    const entry = this.stages.get(name);
    if (!entry) {
      // If startStage was never called, create a zero-duration entry
      this.stages.set(name, { startMs: Date.now(), endMs: Date.now(), metadata });
      if (!this.stageOrder.includes(name)) {
        this.stageOrder.push(name);
      }
      return;
    }
    entry.endMs = Date.now();
    if (metadata) {
      entry.metadata = metadata;
    }
  }

  /**
   * Return timings for all completed stages in execution order.
   */
  getTimings(): StageTiming[] {
    const timings: StageTiming[] = [];
    for (const stage of this.stageOrder) {
      const entry = this.stages.get(stage);
      if (entry && entry.endMs !== undefined) {
        const timing: StageTiming = {
          stage,
          durationMs: entry.endMs - entry.startMs,
        };
        if (entry.metadata) {
          timing.metadata = entry.metadata;
        }
        timings.push(timing);
      }
    }
    return timings;
  }

  /**
   * Total wall-clock duration from pipeline creation to now (or last stage end).
   */
  getTotalDuration(): number {
    let lastEnd = this.pipelineStartMs;
    for (const entry of this.stages.values()) {
      if (entry.endMs !== undefined && entry.endMs > lastEnd) {
        lastEnd = entry.endMs;
      }
    }
    return lastEnd - this.pipelineStartMs;
  }

  /**
   * Return the stage that took the longest.
   */
  getBottleneck(): { stage: string; durationMs: number } {
    const timings = this.getTimings();
    if (timings.length === 0) {
      return { stage: 'none', durationMs: 0 };
    }
    let worst = timings[0];
    for (let i = 1; i < timings.length; i++) {
      if (timings[i].durationMs > worst.durationMs) {
        worst = timings[i];
      }
    }
    return { stage: worst.stage, durationMs: worst.durationMs };
  }

  /**
   * Serialize the full metrics payload for logging or event emission.
   */
  toJSON(): object {
    return {
      totalDurationMs: this.getTotalDuration(),
      bottleneck: this.getBottleneck(),
      stages: this.getTimings(),
    };
  }
}
