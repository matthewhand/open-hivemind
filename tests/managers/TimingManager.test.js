const TimingManager = require('../../src/managers/TimingManager');

// Use fake timers for controlled testing
jest.useFakeTimers();

/**
 * Comprehensive test suite for TimingManager, focusing on its ability to manage message timings
 * with adaptive delays based on incoming messages and processing times.
 */
describe('TimingManager', () => {
    let timingManager;
    const mockSendFunction = jest.fn();

    beforeEach(() => {
        // Initialize TimingManager with configurable parameters for testing
        timingManager = new TimingManager({
            maxDelay: 10000,
            minDelay: 1000,
            decayRate: -0.5
        });
        mockSendFunction.mockClear();
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up any pending timers
        jest.clearAllTimers();
    });

    describe('Constructor and Initialization', () => {
        it('should initialize with default parameters', () => {
            const defaultManager = new TimingManager();
            expect(defaultManager).toBeDefined();
            expect(defaultManager.minDelay).toBeGreaterThan(0);
            expect(defaultManager.maxDelay).toBeGreaterThan(defaultManager.minDelay);
        });

        it('should initialize with custom parameters', () => {
            const customManager = new TimingManager({
                maxDelay: 5000,
                minDelay: 500,
                decayRate: -0.3
            });
            expect(customManager.maxDelay).toBe(5000);
            expect(customManager.minDelay).toBe(500);
            expect(customManager.decayRate).toBe(-0.3);
        });

        it('should validate parameter constraints', () => {
            expect(() => new TimingManager({ minDelay: 5000, maxDelay: 1000 }))
                .toThrow('minDelay cannot be greater than maxDelay');
        });

        it('should handle edge case parameters', () => {
            const edgeManager = new TimingManager({
                maxDelay: 1000,
                minDelay: 1000,
                decayRate: 0
            });
            expect(edgeManager.maxDelay).toBe(edgeManager.minDelay);
        });
    });

    describe('Incoming Message Logging', () => {
        it('should log incoming message with current time', () => {
            const channelId = 'channel1';
            const beforeTime = Date.now();

            timingManager.logIncomingMessage(channelId);

            expect(timingManager.channelsTimingInfo[channelId]).toBeDefined();
            expect(timingManager.channelsTimingInfo[channelId].lastIncomingMessageTime)
                .toBeGreaterThanOrEqual(beforeTime);
            expect(timingManager.channelsTimingInfo[channelId].lastIncomingMessageTime)
                .toBeLessThanOrEqual(Date.now());
        });

        it('should update existing channel timing info', () => {
            const channelId = 'channel1';

            // Log first message
            timingManager.logIncomingMessage(channelId);
            const firstTime = timingManager.channelsTimingInfo[channelId].lastIncomingMessageTime;

            // Advance time and log second message
            jest.advanceTimersByTime(1000);
            timingManager.logIncomingMessage(channelId);
            const secondTime = timingManager.channelsTimingInfo[channelId].lastIncomingMessageTime;

            expect(secondTime).toBeGreaterThan(firstTime);
        });

        it('should handle multiple channels independently', () => {
            const channel1 = 'channel1';
            const channel2 = 'channel2';

            timingManager.logIncomingMessage(channel1);
            jest.advanceTimersByTime(500);
            timingManager.logIncomingMessage(channel2);

            expect(timingManager.channelsTimingInfo[channel1]).toBeDefined();
            expect(timingManager.channelsTimingInfo[channel2]).toBeDefined();
            expect(timingManager.channelsTimingInfo[channel2].lastIncomingMessageTime)
                .toBeGreaterThan(timingManager.channelsTimingInfo[channel1].lastIncomingMessageTime);
        });

        it('should handle null/undefined channel IDs gracefully', () => {
            expect(() => timingManager.logIncomingMessage(null)).not.toThrow();
            expect(() => timingManager.logIncomingMessage(undefined)).not.toThrow();
        });

        it('should handle empty string channel IDs', () => {
            expect(() => timingManager.logIncomingMessage('')).not.toThrow();
            expect(timingManager.channelsTimingInfo['']).toBeDefined();
        });
    });

    describe('Delay Calculation', () => {
        it('should calculate delay based on recent activity and processing time', () => {
            const channelId = 'channel2';
            // Pretend an incoming message was received "5000ms ago"
            timingManager.channelsTimingInfo[channelId] = {
                lastIncomingMessageTime: Date.now() - 5000
            };
            const processingTime = 500;

            const delay = timingManager.calculateDelay(channelId, processingTime);

            expect(delay).toBeGreaterThanOrEqual(timingManager.minDelay);
            expect(delay).toBeLessThanOrEqual(timingManager.maxDelay);
            expect(typeof delay).toBe('number');
        });

        it('should return minimum delay for very recent activity', () => {
            const channelId = 'channel3';
            timingManager.channelsTimingInfo[channelId] = {
                lastIncomingMessageTime: Date.now() - 100 // Very recent
            };

            const delay = timingManager.calculateDelay(channelId, 100);
            expect(delay).toBe(timingManager.minDelay);
        });

        it('should return maximum delay for old activity', () => {
            const channelId = 'channel4';
            timingManager.channelsTimingInfo[channelId] = {
                lastIncomingMessageTime: Date.now() - 60000 // Very old (1 minute)
            };

            const delay = timingManager.calculateDelay(channelId, 100);
            expect(delay).toBe(timingManager.maxDelay);
        });

        it('should handle channels with no previous activity', () => {
            const channelId = 'newChannel';
            const delay = timingManager.calculateDelay(channelId, 500);

            expect(delay).toBe(timingManager.maxDelay);
        });

        it('should incorporate processing time into delay calculation', () => {
            const channelId = 'channel5';
            timingManager.channelsTimingInfo[channelId] = {
                lastIncomingMessageTime: Date.now() - 3000
            };

            const shortProcessingDelay = timingManager.calculateDelay(channelId, 100);
            const longProcessingDelay = timingManager.calculateDelay(channelId, 2000);

            expect(longProcessingDelay).toBeGreaterThanOrEqual(shortProcessingDelay);
        });

        it('should handle negative processing times', () => {
            const channelId = 'channel6';
            timingManager.channelsTimingInfo[channelId] = {
                lastIncomingMessageTime: Date.now() - 3000
            };

            expect(() => timingManager.calculateDelay(channelId, -100)).not.toThrow();
            const delay = timingManager.calculateDelay(channelId, -100);
            expect(delay).toBeGreaterThanOrEqual(0);
        });

        it('should handle zero processing time', () => {
            const channelId = 'channel7';
            timingManager.channelsTimingInfo[channelId] = {
                lastIncomingMessageTime: Date.now() - 3000
            };

            const delay = timingManager.calculateDelay(channelId, 0);
            expect(delay).toBeGreaterThanOrEqual(timingManager.minDelay);
        });
    });

    describe('Message Scheduling', () => {
        it('should schedule messages with the calculated delay', () => {
            const channelId = 'channel3';
            const messageContent = 'Hello, world!';
            const processingTime = 1000;

            timingManager.scheduleMessage(channelId, messageContent, processingTime, mockSendFunction);

            // Message should not be sent immediately
            expect(mockSendFunction).not.toHaveBeenCalled();

            // Fast-forward time to simulate delay
            jest.advanceTimersByTime(timingManager.maxDelay + 1000);

            expect(mockSendFunction).toHaveBeenCalledWith(messageContent);
            expect(mockSendFunction).toHaveBeenCalledTimes(1);
        });

        it('should schedule multiple messages independently', () => {
            const channel1 = 'channel1';
            const channel2 = 'channel2';
            const message1 = 'Message 1';
            const message2 = 'Message 2';

            timingManager.scheduleMessage(channel1, message1, 500, mockSendFunction);
            timingManager.scheduleMessage(channel2, message2, 500, mockSendFunction);

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);

            expect(mockSendFunction).toHaveBeenCalledWith(message1);
            expect(mockSendFunction).toHaveBeenCalledWith(message2);
            expect(mockSendFunction).toHaveBeenCalledTimes(2);
        });

        it('should handle scheduling with different send functions', () => {
            const mockSendFunction2 = jest.fn();
            const channelId1 = 'channel4';
            const channelId2 = 'channel5';

            timingManager.scheduleMessage(channelId1, 'Message 1', 500, mockSendFunction);
            timingManager.scheduleMessage(channelId2, 'Message 2', 500, mockSendFunction2);

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);

            expect(mockSendFunction).toHaveBeenCalledWith('Message 1');
            expect(mockSendFunction2).toHaveBeenCalledWith('Message 2');
        });

        it('should handle empty message content', () => {
            const channelId = 'channel5';

            expect(() => timingManager.scheduleMessage(channelId, '', 500, mockSendFunction))
                .not.toThrow();

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);
            expect(mockSendFunction).toHaveBeenCalledWith('');
        });

        it('should handle null/undefined message content', () => {
            const channelId = 'channel6';

            expect(() => timingManager.scheduleMessage(channelId, null, 500, mockSendFunction))
                .not.toThrow();

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);
            expect(mockSendFunction).toHaveBeenCalledWith(null);
        });

        it('should handle send function errors gracefully', () => {
            const errorSendFunction = jest.fn().mockImplementation(() => {
                throw new Error('Send failed');
            });
            const channelId = 'channel7';

            expect(() => timingManager.scheduleMessage(channelId, 'test', 500, errorSendFunction))
                .not.toThrow();

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);
            expect(errorSendFunction).toHaveBeenCalled();
        });
    });

    describe('Timer Management', () => {
        it('should clear pending timers when new messages are scheduled', () => {
            const channelId = 'channel8';

            // Schedule first message
            timingManager.scheduleMessage(channelId, 'Message 1', 500, mockSendFunction);

            // Schedule second message before first is sent
            jest.advanceTimersByTime(500);
            timingManager.scheduleMessage(channelId, 'Message 2', 500, mockSendFunction);

            // Advance to when first message would have been sent
            jest.advanceTimersByTime(timingManager.maxDelay);

            // Only the second message should be sent
            expect(mockSendFunction).toHaveBeenCalledTimes(1);
            expect(mockSendFunction).toHaveBeenCalledWith('Message 2');
        });

        it('should handle rapid successive scheduling', () => {
            const channelId = 'channel9';

            for (let i = 0; i < 10; i++) {
                timingManager.scheduleMessage(channelId, `Message ${i}`, 100, mockSendFunction);
                jest.advanceTimersByTime(50);
            }

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);

            // Only the last message should be sent
            expect(mockSendFunction).toHaveBeenCalledTimes(1);
            expect(mockSendFunction).toHaveBeenCalledWith('Message 9');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle very large delay values', () => {
            const largeDelayManager = new TimingManager({
                maxDelay: Number.MAX_SAFE_INTEGER,
                minDelay: 1000,
                decayRate: -0.5
            });

            expect(() => largeDelayManager.scheduleMessage('test', 'message', 500, mockSendFunction))
                .not.toThrow();
        });

        it('should handle concurrent access to channel timing info', () => {
            const channelId = 'concurrent';

            // Simulate concurrent access
            timingManager.logIncomingMessage(channelId);
            const delay1 = timingManager.calculateDelay(channelId, 500);
            timingManager.logIncomingMessage(channelId);
            const delay2 = timingManager.calculateDelay(channelId, 500);

            expect(delay1).toBeGreaterThanOrEqual(0);
            expect(delay2).toBeGreaterThanOrEqual(0);
        });

        it('should maintain state consistency across operations', () => {
            const channelId = 'consistency';

            // Perform multiple operations
            timingManager.logIncomingMessage(channelId);
            const delay1 = timingManager.calculateDelay(channelId, 500);
            timingManager.scheduleMessage(channelId, 'test', 500, mockSendFunction);
            const delay2 = timingManager.calculateDelay(channelId, 500);

            expect(timingManager.channelsTimingInfo[channelId]).toBeDefined();
            expect(delay1).toBe(delay2); // Should be consistent for same conditions
        });
    });

    describe('Performance', () => {
        it('should handle many channels efficiently', () => {
            const startTime = Date.now();

            for (let i = 0; i < 1000; i++) {
                const channelId = `channel_${i}`;
                timingManager.logIncomingMessage(channelId);
                timingManager.calculateDelay(channelId, 500);
            }

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second
        });

        it('should not leak memory with many scheduled messages', () => {
            const initialChannels = Object.keys(timingManager.channelsTimingInfo).length;

            for (let i = 0; i < 100; i++) {
                const channelId = `temp_channel_${i}`;
                timingManager.scheduleMessage(channelId, 'test', 500, mockSendFunction);
            }

            jest.advanceTimersByTime(timingManager.maxDelay + 1000);

            // Should not accumulate excessive channel data
            const finalChannels = Object.keys(timingManager.channelsTimingInfo).length;
            expect(finalChannels - initialChannels).toBeLessThan(200);
        });
    });
});
