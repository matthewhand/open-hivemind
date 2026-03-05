import TypingActivity from '../../../../src/message/helpers/processing/TypingActivity';

describe('TypingActivity', () => {
  let activity: TypingActivity;

  beforeEach(() => {
    jest.useFakeTimers();
    activity = TypingActivity.getInstance();
    activity.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks active typists within a window', () => {
    activity.recordTyping('c1', 'u1');
    activity.recordTyping('c1', 'u2');
    expect(activity.getActiveTypistCount('c1', 8000)).toBe(2);
  });

  it('prunes typists outside the window', () => {
    activity.recordTyping('c1', 'u1');
    jest.advanceTimersByTime(9000);
    expect(activity.getActiveTypistCount('c1', 8000)).toBe(0);
  });
});
