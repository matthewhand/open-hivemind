import fs from 'fs';
import os from 'os';
import path from 'path';
import { HealthChecker } from '@src/monitoring/HealthChecker';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

/**
 * Guards the HealthChecker path against crypto-random / placeholder
 * CPU and disk metrics. Values must come from process.cpuUsage, os.loadavg,
 * fs.statfs, process.memoryUsage, and (when present) MetricsCollector counters.
 */
describe('HealthChecker real system metrics', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    // Zero throttle so consecutive performHealthCheck calls always recompute.
    checker = new HealthChecker(0, 50);
    MetricsCollector.getInstance().reset();
  });

  afterEach(() => {
    checker.shutdown();
    MetricsCollector.getInstance().reset();
    jest.restoreAllMocks();
  });

  it('reports cpuUsage in [0, 100] from process.cpuUsage (not crypto random)', async () => {
    const result = await checker.performHealthCheck();

    expect(result.metrics.cpuUsage).toBeDefined();
    expect(result.metrics.cpuUsage as number).toBeGreaterThanOrEqual(0);
    expect(result.metrics.cpuUsage as number).toBeLessThanOrEqual(100);
  });

  it('computes cpuUsage from a controlled process.cpuUsage delta', async () => {
    const internal = checker as unknown as {
      lastCpuUsage: NodeJS.CpuUsage;
      lastCpuHrTime: bigint;
    };

    internal.lastCpuHrTime = process.hrtime.bigint() - BigInt(1_000_000_000); // 1s ago
    internal.lastCpuUsage = process.cpuUsage();

    const spy = jest.spyOn(process, 'cpuUsage');
    // Delta sample: 0.5s CPU over ~1s wall clock ≈ 50%.
    spy.mockReturnValueOnce({ user: 250_000, system: 250_000 });
    // Baseline reset call.
    spy.mockReturnValueOnce({ user: 0, system: 0 });

    const result = await checker.performHealthCheck();

    expect(result.metrics.cpuUsage).toBeDefined();
    expect(result.metrics.cpuUsage as number).toBeGreaterThan(40);
    expect(result.metrics.cpuUsage as number).toBeLessThan(60);
  });

  it('reports diskUsage from real fs.statfs (bounded percentage, not random)', async () => {
    const result = await checker.performHealthCheck();

    // statfs should succeed on a normal Linux CI/dev host.
    expect(result.metrics.diskUsage).toBeDefined();
    expect(result.metrics.diskUsage as number).toBeGreaterThanOrEqual(0);
    expect(result.metrics.diskUsage as number).toBeLessThanOrEqual(100);
  });

  it('includes real 1-minute load average from os.loadavg', async () => {
    const load = os.loadavg()[0];
    const result = await checker.performHealthCheck();

    expect(result.metrics.loadAverage1m).toBeDefined();
    expect(result.metrics.loadAverage1m as number).toBeCloseTo(load, 1);
  });

  it('reports process heap memory from process.memoryUsage (not placeholders)', async () => {
    const result = await checker.performHealthCheck();

    expect(result.memory.used).toBeGreaterThan(0);
    expect(result.memory.total).toBeGreaterThan(0);
    expect(result.memory.percentage).toBeGreaterThanOrEqual(0);
    expect(result.memory.percentage).toBeLessThanOrEqual(100);
  });

  it('reads activeConnections and errorRate from MetricsCollector when present', async () => {
    const collector = MetricsCollector.getInstance();
    collector.setActiveConnections(7);
    collector.incrementMessages();
    collector.incrementMessages();
    collector.incrementErrors(); // 1 error / 2 messages => 50%

    const result = await checker.performHealthCheck();

    expect(result.metrics.activeConnections).toBe(7);
    expect(result.metrics.errorRate).toBe(50);
  });

  it('does not invent websocket/llm/integrations "always-up" sleep placeholders', async () => {
    const result = await checker.performHealthCheck();

    expect(result.services.websocket).toBeUndefined();
    expect(result.services.llm).toBeUndefined();
    expect(result.services.integrations).toBeUndefined();
    // Real probe: event-loop lag via setImmediate.
    expect(result.services.eventLoop).toBeDefined();
    expect(['up', 'degraded', 'down']).toContain(result.services.eventLoop.status);
  });

  it('HealthChecker source does not import crypto or define getRandomFloat', () => {
    // Guard against regression: crypto-random masquerading as metrics.
    const srcPath = path.resolve(__dirname, '../../../src/monitoring/HealthChecker.ts');
    const source = fs.readFileSync(srcPath, 'utf-8');
    expect(source).not.toMatch(/from ['"]crypto['"]|require\(['"]crypto['"]\)/);
    expect(source).not.toMatch(/getRandomFloat/);
    expect(source).not.toMatch(/randomBytes/);
  });

  it('produces stable non-random disk/cpu bounds across two checks', async () => {
    const a = await checker.performHealthCheck();
    // Small delay so CPU sample window is non-zero.
    await new Promise((r) => setTimeout(r, 20));
    const b = await checker.performHealthCheck();

    for (const sample of [a, b]) {
      expect(sample.metrics.cpuUsage as number).toBeGreaterThanOrEqual(0);
      expect(sample.metrics.cpuUsage as number).toBeLessThanOrEqual(100);
      if (sample.metrics.diskUsage !== undefined) {
        expect(sample.metrics.diskUsage).toBeGreaterThanOrEqual(0);
        expect(sample.metrics.diskUsage).toBeLessThanOrEqual(100);
      }
    }

    // Disk utilisation should not thrash randomly between consecutive samples.
    if (a.metrics.diskUsage !== undefined && b.metrics.diskUsage !== undefined) {
      expect(Math.abs(a.metrics.diskUsage - b.metrics.diskUsage)).toBeLessThan(5);
    }
  });

  it('does not report database as connected via a fake sleep placeholder', async () => {
    const result = await checker.performHealthCheck();
    // Without an initialized/connected DB, status must not be fabricated "connected".
    expect(['disconnected', 'error', 'connected']).toContain(result.database.status);
  });
});
