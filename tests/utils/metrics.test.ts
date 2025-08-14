import { incrementCounter, setGauge, getMetrics, resetMetrics } from '@src/utils/metrics';

describe('metrics utilities', () => {
  beforeEach(() => resetMetrics());

  it('increments counters and sets gauges', () => {
    incrementCounter('retries', 2);
    incrementCounter('retries');
    setGauge('queue_depth', 5);
    const m = getMetrics();
    expect(m.counters.retries).toBe(3);
    expect(m.gauges.queue_depth).toBe(5);
  });
});
