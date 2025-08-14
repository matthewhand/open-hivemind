import Debug from 'debug';

const debug = Debug('app:utils:metrics');

type CounterMap = Record<string, number>;
type GaugeMap = Record<string, number>;

const counters: CounterMap = Object.create(null);
const gauges: GaugeMap = Object.create(null);

export function incrementCounter(name: string, value = 1): void {
  if (!name) return;
  counters[name] = (counters[name] || 0) + value;
}

export function setGauge(name: string, value: number): void {
  if (!name) return;
  gauges[name] = value;
}

export function getMetrics(): { counters: CounterMap; gauges: GaugeMap } {
  return {
    counters: { ...counters },
    gauges: { ...gauges },
  };
}

export function resetMetrics(): void {
  for (const k of Object.keys(counters)) delete counters[k];
  for (const k of Object.keys(gauges)) delete gauges[k];
}

// Optional structured debug dump for local dev
export function logMetrics(): void {
  debug('metrics', getMetrics());
}
