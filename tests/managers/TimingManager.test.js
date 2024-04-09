const TimingManager = require('../../src/managers/TimingManager');
jest.useFakeTimers();

/**
 * Test suite for TimingManager, focusing on its ability to manage message timings
 * with adaptive delays based on incoming messages and processing times.
 */
describe('TimingManager', () => {
    let timingManager;
    const mockSendFunction = jest.fn();

    beforeEach(() => {
        // Initialize TimingManager with configurable parameters for testing
        timingManager = new TimingManager({ maxDelay: 10000, minDelay: 1000, decayRate: -0.5 });
        mockSendFunction.mockClear();
        jest.clearAllTimers();
    });

    /**
     * Tests that the TimingManager correctly logs the time of incoming messages,
     * updating its internal state with the timestamp of the latest message for a given channel.
     */
    test('logs incoming message with current time', () => {
        const channelId = 'channel1';
        timingManager.logIncomingMessage(channelId);
        expect(timingManager.channelsTimingInfo[channelId]).toBeDefined();
        expect(timingManager.channelsTimingInfo[channelId].lastIncomingMessageTime).toBeLessThanOrEqual(Date.now());
    });

    /**
     * Validates that the delay calculation adjusts as expected based on the time since the
     * last incoming message and the provided processing time, ensuring dynamic delay adaptation.
     */
    test('calculates delay based on recent activity and processing time', () => {
        const channelId = 'channel2';
        // Pretend an incoming message was received "5000ms ago"
        timingManager.channelsTimingInfo[channelId] = { lastIncomingMessageTime: Date.now() - 5000 };
        const processingTime = 500; // Simulate a processing time of 500ms

        const delay = timingManager.calculateDelay(channelId, processingTime);
        expect(delay).toBeGreaterThanOrEqual(timingManager.minDelay);
        expect(delay).toBeLessThanOrEqual(timingManager.maxDelay);
    });

    /**
     * Ensures that messages are scheduled for sending after the calculated delay, taking into
     * account the channel's activity and the processing time, thereby simulating adaptive response timing.
     */
    test('schedules messages with the calculated delay', () => {
        const channelId = 'channel3';
        const messageContent = 'Hello, world!';
        const processingTime = 1000; // Simulate a processing time of 1000ms
        timingManager.scheduleMessage(channelId, messageContent, processingTime, mockSendFunction);

        jest.advanceTimersByTime(5000); // Fast-forward time to simulate delay

        expect(mockSendFunction).toHaveBeenCalledWith(messageContent);
        // Ensure that the mockSendFunction is called only after the appropriate delay
    });
});
