import { IncomingMessageDensity } from '../../../../src/message/helpers/processing/IncomingMessageDensity';

describe('IncomingMessageDensity', () => {
  let density: IncomingMessageDensity;

  beforeEach(() => {
    // Reset singleton logic if possible or just clear state
    density = IncomingMessageDensity.getInstance();
    density.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return a singleton instance', () => {
    const instance1 = IncomingMessageDensity.getInstance();
    const instance2 = IncomingMessageDensity.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should return 1.0 for the first message', () => {
    const modifier = density.recordMessageAndGetModifier('channel-1');
    expect(modifier).toBe(1.0);
  });

  it('should decay modifier as message count increases (1/N)', () => {
    // Msg 1: 1/1 = 1.0
    expect(density.recordMessageAndGetModifier('channel-1')).toBe(1.0);

    // Msg 2: 1/2 = 0.5
    expect(density.recordMessageAndGetModifier('channel-1')).toBe(0.5);

    // Msg 3-5
    density.recordMessageAndGetModifier('channel-1');
    density.recordMessageAndGetModifier('channel-1');
    const mod5 = density.recordMessageAndGetModifier('channel-1'); // Msg 5
    expect(mod5).toBe(0.2); // 1/5
  });

  it('should track channels independently', () => {
    density.recordMessageAndGetModifier('channel-A'); // Count 1
    density.recordMessageAndGetModifier('channel-A'); // Count 2 (Mod 0.5)

    // fresh channel
    const modB = density.recordMessageAndGetModifier('channel-B');
    expect(modB).toBe(1.0);
  });

  it('should prune messages older than 60 seconds', () => {
    // T=0: Msg 1
    density.recordMessageAndGetModifier('channel-1');

    // T=30s: Msg 2 (Count 2)
    jest.advanceTimersByTime(30000);
    expect(density.recordMessageAndGetModifier('channel-1')).toBe(0.5);

    // T=61s (30s + 31s): Msg 1 expires. Msg 2 (at T=30) is 31s old (valid).
    // New Msg 3. Count should be 2 (Msg 2 + Msg 3).
    jest.advanceTimersByTime(31000);

    const mod = density.recordMessageAndGetModifier('channel-1');
    // Count should be 2: The one from T=30s, and this new one.
    // The one from T=0 is gone.
    expect(mod).toBe(0.5);

    // Advance another 31s (Total T=92s).
    // Msg 2 (T=30s) is now 62s old (expired).
    // Msg 3 (T=61s) is 31s old (valid).
    // New Msg 4. Count should be 2.
    jest.advanceTimersByTime(31000);
    expect(density.recordMessageAndGetModifier('channel-1')).toBe(0.5);
  });

  it('should handle rapid bursts correctly', () => {
    // 10 messages instantly
    for (let i = 0; i < 9; i++) {
      density.recordMessageAndGetModifier('burst-channel');
    }
    const mod10 = density.recordMessageAndGetModifier('burst-channel');
    expect(mod10).toBe(0.1); // 1/10
  });

  it('should count unique participants in a window', () => {
    density.recordMessageAndGetModifier('channel-1', 'user-a');
    density.recordMessageAndGetModifier('channel-1', 'user-b');
    density.recordMessageAndGetModifier('channel-1', 'user-a'); // repeat
    expect(density.getUniqueParticipantCount('channel-1', 5 * 60 * 1000)).toBe(2);
  });

  it('should prune participants outside the window', () => {
    density.recordMessageAndGetModifier('channel-1', 'user-a');
    jest.advanceTimersByTime(60000);
    density.recordMessageAndGetModifier('channel-1', 'user-b');

    // In the last 30s, only user-b should remain.
    expect(density.getUniqueParticipantCount('channel-1', 30000)).toBe(1);
  });
});
