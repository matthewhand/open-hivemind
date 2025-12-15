
import MessageDelayScheduler from '../../../../src/message/helpers/handler/MessageDelayScheduler';
import messageConfig from '../../../../src/config/messageConfig';

// Mock config
jest.mock('../../../../src/config/messageConfig', () => ({
    get: jest.fn()
}));

describe('MessageDelayScheduler', () => {
    let scheduler: MessageDelayScheduler;

    beforeEach(() => {
        // Clear instance for singleton test if possible, or just re-get
        // In this simple impl, getInstance returns same object.
        scheduler = MessageDelayScheduler.getInstance();
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should be a singleton', () => {
        const s1 = MessageDelayScheduler.getInstance();
        const s2 = MessageDelayScheduler.getInstance();
        expect(s1).toBe(s2);
    });

    it('should schedule and execute message with delay', async () => {
        const sendFn = jest.fn().mockResolvedValue('sent-id');
        (messageConfig.get as jest.Mock).mockReturnValue(1000);

        const promise = scheduler.scheduleMessage('ch-1', 'msg-1', 'Hello', 'user-1', sendFn, false);

        // Should not have called yet
        expect(sendFn).not.toHaveBeenCalled();

        // Advance time
        jest.advanceTimersByTime(1000);

        await promise;

        expect(sendFn).toHaveBeenCalledWith('Hello');
    });

    it('should use default delay if config missing', async () => {
        const sendFn = jest.fn().mockResolvedValue('sent-id');
        (messageConfig.get as jest.Mock).mockReturnValue(undefined); // Simulate missing config

        const promise = scheduler.scheduleMessage('ch-1', 'msg-1', 'Hello', 'user-1', sendFn, false);

        jest.advanceTimersByTime(1000); // Default is 1000 in code
        await promise;

        expect(sendFn).toHaveBeenCalled();
    });
});
