import { computeScore, getBonusForChannel, getPriorityForChannel, pickBestChannel } from '@message/routing/ChannelRouter';
import messageConfig from '@config/messageConfig';

describe('[ChannelRouter] parsing and scoring', () => {
  const originalGet = messageConfig.get.bind(messageConfig);

  afterEach(() => {
    // Reset to original get behavior by mocking to default undefined for our keys
    (messageConfig.get as any) = originalGet;
    jest.restoreAllMocks();
  });

  function mockConfig(bonuses: any, priorities: any) {
    jest.spyOn(messageConfig, 'get').mockImplementation((key: any) => {
      if (key === 'CHANNEL_BONUSES') return bonuses;
      if (key === 'CHANNEL_PRIORITIES') return priorities;
      return originalGet(key);
    });
  }

  test('CSV parsing for bonuses within range and priorities as integers', () => {
    mockConfig('C1:1.2,C2:0.8, C3:2.0', 'C1:0,C2:1,C3:2');
    expect(getBonusForChannel('C1')).toBeCloseTo(1.2, 5);
    expect(getBonusForChannel('C2')).toBeCloseTo(0.8, 5);
    expect(getBonusForChannel('C3')).toBeCloseTo(2.0, 5);
    expect(getPriorityForChannel('C1')).toBe(0);
    expect(getPriorityForChannel('C2')).toBe(1);
    expect(getPriorityForChannel('C3')).toBe(2);
  });

  test('JSON object parsing for bonuses/priorities with defaults when missing', () => {
    mockConfig({ A: 1.5 }, { A: 3 });
    expect(getBonusForChannel('A')).toBeCloseTo(1.5, 5);
    expect(getPriorityForChannel('A')).toBe(3);
    // Missing channel uses defaults: bonus 1.0, priority 0
    expect(getBonusForChannel('Z')).toBeCloseTo(1.0, 5);
    expect(getPriorityForChannel('Z')).toBe(0);
  });

  test('computeScore formula: base*bonus/(1+priority)', () => {
    mockConfig({ X: 2.0, Y: 1.0 }, { X: 0, Y: 1 });
    // X: 1.0 * 2.0 / (1 + 0) = 2.0
    // Y: 1.0 * 1.0 / (1 + 1) = 0.5
    expect(computeScore('X')).toBeCloseTo(2.0, 5);
    expect(computeScore('Y')).toBeCloseTo(0.5, 5);
  });

  test('invalid out-of-range bonuses in CSV are ignored; non-integer priorities ignored', () => {
    // 3.5 is out of [0,2], "hi" not a number, priorities "p" not integer
    mockConfig('C1:1.0,C2:3.5,C3:hi', 'C1:0,C2:p,C3:2');
    // C2 bonus invalid -> defaults to 1.0
    expect(getBonusForChannel('C2')).toBeCloseTo(1.0, 5);
    // C3 bonus invalid "hi" -> defaults to 1.0
    expect(getBonusForChannel('C3')).toBeCloseTo(1.0, 5);
    // C2 priority invalid -> defaults to 0
    expect(getPriorityForChannel('C2')).toBe(0);
    // C3 priority valid integer 2
    expect(getPriorityForChannel('C3')).toBe(2);
  });

  test('pickBestChannel chooses highest score; tie-breakers: highest bonus then lexicographic id', () => {
    // Setup so that A and B have same score, but B has higher bonus
    // score = bonus/(1+priority)
    // A: bonus 1.0, priority 0 => 1.0
    // B: bonus 1.5, priority 0 => 1.5
    // C: bonus 1.5, priority 0 => 1.5 (tie with B -> tie-break by highest bonus equal, then lexicographic id => B over C because 'B' < 'C')
    mockConfig({ A: 1.0, B: 1.5, C: 1.5 }, { A: 0, B: 0, C: 0 });

    expect(pickBestChannel(['A', 'B', 'C'])).toBe('B');

    // Now create equal scores and equal bonuses for X and Y, lexicographic tiebreaker
    mockConfig({ X: 1.0, Y: 1.0 }, { X: 0, Y: 0 });
    expect(pickBestChannel(['Y', 'X'])).toBe('X');
  });

  test('empty candidates returns null', () => {
    mockConfig({}, {});
    expect(pickBestChannel([])).toBeNull();
  });
});