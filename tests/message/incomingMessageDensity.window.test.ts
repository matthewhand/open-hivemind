import { IncomingMessageDensity } from '../../src/message/helpers/processing/IncomingMessageDensity';

describe('IncomingMessageDensity sliding window', () => {
  let density: IncomingMessageDensity;

  beforeEach(() => {
    density = IncomingMessageDensity.getInstance();
    density.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    density.clear();
  });

  it('counts only messages within the requested window, split by bot/user', () => {
    const now = 1_000_000;
    jest.useFakeTimers().setSystemTime(now);

    // Two messages outside a 60s window, two inside.
    jest.setSystemTime(now - 120_000);
    density.recordMessage('chan', 'u1', false);
    jest.setSystemTime(now - 90_000);
    density.recordMessage('chan', 'b1', true);

    jest.setSystemTime(now - 30_000);
    density.recordMessage('chan', 'u2', false);
    jest.setSystemTime(now - 10_000);
    density.recordMessage('chan', 'b2', true);

    jest.setSystemTime(now);
    const { userCount, botCount, total } = density.getDensity('chan', 60_000);

    expect(userCount).toBe(1);
    expect(botCount).toBe(1);
    expect(total).toBe(2);
  });

  it('returns zeros for an unknown channel', () => {
    expect(density.getDensity('missing', 60_000)).toEqual({
      userCount: 0,
      botCount: 0,
      total: 0,
    });
  });

  it('prunes expired entries on record so history does not grow unbounded', () => {
    const base = 5_000_000;
    jest.useFakeTimers().setSystemTime(base);

    // Record a message far in the past (outside the 5-minute WINDOW_MS).
    jest.setSystemTime(base - 10 * 60_000);
    density.recordMessage('chan', 'u1', false);

    // Now record a fresh message; the stale one should be pruned during record.
    jest.setSystemTime(base);
    density.recordMessage('chan', 'u2', false);

    const { total } = density.getDensity('chan', 5 * 60_000);
    expect(total).toBe(1);
  });

  it('getDensityModifier reflects 1/N over the default window', () => {
    const now = 6_000_000;
    jest.useFakeTimers().setSystemTime(now);

    density.recordMessage('chan', 'u1', false);
    density.recordMessage('chan', 'u2', false);
    density.recordMessage('chan', 'u3', false);

    // 3 messages in the default 60s window => modifier 1/3.
    expect(density.getDensityModifier('chan')).toBeCloseTo(1 / 3, 5);
  });
});
