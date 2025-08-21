import { MessageDelayScheduler } from '@src/message/helpers/MessageDelayScheduler';

describe('MessageDelayScheduler', () => {
  let scheduler: MessageDelayScheduler;

  beforeEach(() => {
    scheduler = new MessageDelayScheduler();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should schedule message with delay', async () => {
    const mockCallback = jest.fn();
    
    scheduler.scheduleMessage('channel1', mockCallback, 1000);
    
    expect(mockCallback).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(1000);
    
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should cancel scheduled message', () => {
    const mockCallback = jest.fn();
    
    scheduler.scheduleMessage('channel1', mockCallback, 1000);
    scheduler.cancelMessage('channel1');
    
    jest.advanceTimersByTime(1000);
    
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle multiple channels', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    scheduler.scheduleMessage('channel1', callback1, 500);
    scheduler.scheduleMessage('channel2', callback2, 1000);
    
    jest.advanceTimersByTime(500);
    expect(callback1).toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(500);
    expect(callback2).toHaveBeenCalled();
  });

  it('should replace existing scheduled message', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    scheduler.scheduleMessage('channel1', callback1, 1000);
    scheduler.scheduleMessage('channel1', callback2, 500);
    
    jest.advanceTimersByTime(500);
    expect(callback2).toHaveBeenCalled();
    expect(callback1).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(500);
    expect(callback1).not.toHaveBeenCalled();
  });

  it('should handle immediate execution (0 delay)', () => {
    const mockCallback = jest.fn();
    
    scheduler.scheduleMessage('channel1', mockCallback, 0);
    
    jest.advanceTimersByTime(0);
    
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should cleanup all scheduled messages', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    scheduler.scheduleMessage('channel1', callback1, 1000);
    scheduler.scheduleMessage('channel2', callback2, 1000);
    
    scheduler.cleanup();
    
    jest.advanceTimersByTime(1000);
    
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should handle errors in callbacks gracefully', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Callback error');
    });
    
    scheduler.scheduleMessage('channel1', errorCallback, 100);
    
    expect(() => {
      jest.advanceTimersByTime(100);
    }).not.toThrow();
    
    expect(errorCallback).toHaveBeenCalled();
  });
});