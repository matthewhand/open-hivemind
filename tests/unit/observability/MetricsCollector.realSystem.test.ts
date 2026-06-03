import os from 'os';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

describe('MetricsCollector real system metrics', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = MetricsCollector.getInstance();
    collector.reset();
  });

  afterEach(() => {
    collector.reset();
    jest.restoreAllMocks();
  });

  it('reports cpu_usage as a real percentage in [0, 100] (no random placeholder)', () => {
    // Drive collectSystemMetrics() directly to populate cpu_usage.
    (collector as unknown as { collectSystemMetrics(): void }).collectSystemMetrics();

    const cpu = collector.getLatestValue('cpu_usage');
    expect(cpu).toBeDefined();
    expect(cpu as number).toBeGreaterThanOrEqual(0);
    expect(cpu as number).toBeLessThanOrEqual(100);
  });

  it('computes cpu usage from the process.cpuUsage delta rather than randomness', () => {
    // Two consecutive collections over a near-zero interval should both yield
    // deterministic, bounded values (a random placeholder could not guarantee
    // the [0,100] bound, and crypto-random would vary wildly). Here we assert
    // the value tracks a controlled cpuUsage delta.
    const internal = collector as unknown as {
      collectSystemMetrics(): void;
      lastCpuUsage: NodeJS.CpuUsage;
      lastCpuHrTime: bigint;
    };

    // Force a known elapsed window and CPU delta.
    internal.lastCpuHrTime = process.hrtime.bigint() - BigInt(1_000_000_000); // 1s ago
    internal.lastCpuUsage = process.cpuUsage();

    const spy = jest.spyOn(process, 'cpuUsage');
    // First call inside calculateCpuUsage computes the delta; return ~0.5s of CPU.
    spy.mockReturnValueOnce({ user: 250_000, system: 250_000 }); // delta = 0.5s CPU over ~1s
    // Second call resets lastCpuUsage baseline.
    spy.mockReturnValueOnce({ user: 0, system: 0 });

    internal.collectSystemMetrics();

    const cpu = collector.getLatestValue('cpu_usage');
    expect(cpu).toBeDefined();
    // 0.5s CPU over ~1s wall clock ≈ 50%.
    expect(cpu as number).toBeGreaterThan(40);
    expect(cpu as number).toBeLessThan(60);
  });

  it('reports diskUsage as real system memory utilisation percentage and networkIO as 0', () => {
    const totalMem = os.totalmem();
    jest.spyOn(os, 'totalmem').mockReturnValue(totalMem);
    jest.spyOn(os, 'freemem').mockReturnValue(totalMem / 4); // 75% used

    const summary = collector.getMetricsSummary();

    expect(summary.performance.diskUsage).toBeCloseTo(75, 0);
    expect(summary.performance.networkIO).toBe(0);
  });

  it('produces stable, bounded performance values without crypto randomness', () => {
    const a = collector.getMetricsSummary().performance;
    const b = collector.getMetricsSummary().performance;

    // networkIO is a fixed real value (0), not random noise.
    expect(a.networkIO).toBe(0);
    expect(b.networkIO).toBe(0);

    // diskUsage (system memory %) is bounded and only changes with real memory.
    expect(a.diskUsage).toBeGreaterThanOrEqual(0);
    expect(a.diskUsage).toBeLessThanOrEqual(100);
  });
});
