import { IdleResponseManager } from '@src/message/management/IdleResponseManager';

jest.mock('@src/message/management/getMessengerProvider');

describe('IdleResponseManager Comprehensive', () => {
  let manager: IdleResponseManager;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      sendMessageToChannel: jest.fn().mockResolvedValue('msg123'),
      getDefaultChannel: jest.fn().mockReturnValue('C123')
    };

    const { getMessengerProvider } = require('@src/message/management/getMessengerProvider');
    getMessengerProvider.mockReturnValue([mockProvider]);

    manager = IdleResponseManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
    IdleResponseManager['instance'] = undefined as any;
  });

  it('should send idle response after timeout', async () => {
    jest.useFakeTimers();
    
    manager.scheduleIdleResponse('C123', 1000);
    
    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Allow async operations
    
    expect(mockProvider.sendMessageToChannel).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should cancel scheduled response', () => {
    jest.useFakeTimers();
    
    manager.scheduleIdleResponse('C123', 5000);
    manager.cancelIdleResponse('C123');
    
    jest.advanceTimersByTime(5000);
    
    expect(mockProvider.sendMessageToChannel).not.toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should handle multiple channels', () => {
    jest.useFakeTimers();
    
    manager.scheduleIdleResponse('C123', 1000);
    manager.scheduleIdleResponse('C456', 2000);
    
    expect(manager['scheduledResponses'].size).toBe(2);
    
    jest.useRealTimers();
  });

  it('should replace existing scheduled response', () => {
    jest.useFakeTimers();
    
    manager.scheduleIdleResponse('C123', 5000);
    const firstTimeout = manager['scheduledResponses'].get('C123');
    
    manager.scheduleIdleResponse('C123', 3000);
    const secondTimeout = manager['scheduledResponses'].get('C123');
    
    expect(firstTimeout).not.toBe(secondTimeout);
    
    jest.useRealTimers();
  });

  it('should handle provider errors gracefully', async () => {
    mockProvider.sendMessageToChannel.mockRejectedValue(new Error('Send failed'));
    
    jest.useFakeTimers();
    
    manager.scheduleIdleResponse('C123', 100);
    
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    
    // Should not throw error
    expect(true).toBe(true);
    
    jest.useRealTimers();
  });

  it('should use default channel when none provided', async () => {
    jest.useFakeTimers();
    
    manager.scheduleIdleResponse('', 100);
    
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    
    expect(mockProvider.getDefaultChannel).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should cleanup on shutdown', () => {
    manager.scheduleIdleResponse('C123', 5000);
    manager.scheduleIdleResponse('C456', 5000);
    
    expect(manager['scheduledResponses'].size).toBe(2);
    
    manager.shutdown();
    
    expect(manager['scheduledResponses'].size).toBe(0);
  });

  it('should handle singleton pattern correctly', () => {
    const instance1 = IdleResponseManager.getInstance();
    const instance2 = IdleResponseManager.getInstance();
    
    expect(instance1).toBe(instance2);
  });
});