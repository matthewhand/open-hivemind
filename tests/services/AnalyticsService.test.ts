import { AnalyticsService } from '../../src/services/AnalyticsService';
import { ActivityLogger } from '../../src/server/services/ActivityLogger';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

// Mock dependencies
jest.mock('../../src/server/services/ActivityLogger');
jest.mock('../../src/config/BotConfigurationManager');

const mockActivityLoggerInstance = {
    getEvents: jest.fn(),
};

const mockBotConfigInstance = {
    getAllBots: jest.fn(),
};

describe('AnalyticsService', () => {
    let analyticsService: AnalyticsService;

    beforeEach(() => {
        jest.resetAllMocks();

        (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockActivityLoggerInstance);
        (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockBotConfigInstance);

        // Reset singleton
        (AnalyticsService as any).instance = undefined;
        analyticsService = AnalyticsService.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getStats', () => {
        it('returns default stats when no events exist', () => {
            mockActivityLoggerInstance.getEvents.mockReturnValue([]);
            mockBotConfigInstance.getAllBots.mockReturnValue([]);

            const stats = analyticsService.getStats();

            expect(stats).toMatchObject({
                learningProgress: expect.any(Number),
                behaviorPatternsCount: expect.any(Number),
                userSegmentsCount: expect.any(Number),
                totalMessages: 0,
                totalErrors: 0,
                avgProcessingTime: 0,
                activeBots: 0,
                activeUsers: 0,
            });
        });

        it('calculates stats from events', () => {
            const now = new Date();
            const events = [
                {
                    id: '1',
                    timestamp: now.toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'user1',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                    processingTime: 500,
                },
                {
                    id: '2',
                    timestamp: now.toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'user2',
                    messageType: 'outgoing',
                    contentLength: 200,
                    status: 'error',
                    processingTime: 1500,
                },
            ];

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);
            mockBotConfigInstance.getAllBots.mockReturnValue([{ name: 'bot1' }]);

            const stats = analyticsService.getStats();

            expect(stats.totalMessages).toBe(2);
            expect(stats.totalErrors).toBe(1);
            expect(stats.avgProcessingTime).toBe(1000); // (500 + 1500) / 2
            expect(stats.activeBots).toBe(1);
            expect(stats.activeUsers).toBe(2);
        });
    });

    describe('getBehaviorPatterns', () => {
        it('returns default patterns when no events exist', () => {
            mockActivityLoggerInstance.getEvents.mockReturnValue([]);

            const patterns = analyticsService.getBehaviorPatterns();

            expect(patterns).toBeInstanceOf(Array);
            expect(patterns.length).toBeGreaterThan(0);
            expect(patterns[0]).toMatchObject({
                id: expect.any(String),
                name: expect.any(String),
                description: expect.any(String),
                frequency: expect.any(Number),
                confidence: expect.any(Number),
                trend: expect.stringMatching(/^(increasing|decreasing|stable)$/),
                segments: expect.any(Array),
                recommendedWidgets: expect.any(Array),
                priority: expect.any(Number),
            });
        });

        it('analyzes provider patterns from events', () => {
            const now = new Date();
            const events = Array(50).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                botName: 'bot1',
                provider: 'discord',
                channelId: 'ch1',
                userId: 'user1',
                messageType: 'incoming',
                contentLength: 100,
                status: 'success',
            }));

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const patterns = analyticsService.getBehaviorPatterns();

            expect(patterns.length).toBeGreaterThan(0);
            // Should include a provider pattern for discord
            const providerPattern = patterns.find(p => p.id.includes('provider'));
            expect(providerPattern).toBeDefined();
        });

        it('detects error patterns', () => {
            const now = new Date();
            const events = Array(20).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                botName: 'bot1',
                provider: 'discord',
                channelId: 'ch1',
                userId: 'user1',
                messageType: 'incoming',
                contentLength: 100,
                status: i % 3 === 0 ? 'error' : 'success', // ~33% error rate
            }));

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const patterns = analyticsService.getBehaviorPatterns();

            const errorPattern = patterns.find(p => p.id.includes('error'));
            expect(errorPattern).toBeDefined();
        });
    });

    describe('getUserSegments', () => {
        it('returns default segments when no events exist', () => {
            mockActivityLoggerInstance.getEvents.mockReturnValue([]);

            const segments = analyticsService.getUserSegments();

            expect(segments).toBeInstanceOf(Array);
            expect(segments.length).toBeGreaterThan(0);
            expect(segments[0]).toMatchObject({
                id: expect.any(String),
                name: expect.any(String),
                description: expect.any(String),
                criteria: {
                    behaviorPatterns: expect.any(Array),
                    usageFrequency: expect.stringMatching(/^(daily|weekly|monthly)$/),
                    featureUsage: expect.any(Array),
                    engagementLevel: expect.stringMatching(/^(high|medium|low)$/),
                },
                characteristics: {
                    preferredWidgets: expect.any(Array),
                    optimalLayout: expect.any(String),
                    themePreference: expect.any(String),
                    notificationFrequency: expect.any(Number),
                },
                size: expect.any(Number),
                confidence: expect.any(Number),
            });
        });

        it('segments users by activity level', () => {
            const now = new Date();
            const events = [
                // High activity user
                ...Array(50).fill(null).map((_, i) => ({
                    id: `msg-h${i}`,
                    timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'high-activity-user',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                })),
                // Medium activity user
                ...Array(10).fill(null).map((_, i) => ({
                    id: `msg-m${i}`,
                    timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'medium-activity-user',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                })),
                // Low activity user
                {
                    id: 'msg-l1',
                    timestamp: now.toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'low-activity-user',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                },
            ];

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const segments = analyticsService.getUserSegments();

            // Should have segments for different activity levels
            expect(segments.length).toBeGreaterThan(0);

            // Check that segments have different sizes
            const sizes = segments.map(s => s.size);
            expect(sizes.some(s => s > 0)).toBe(true);
        });
    });

    describe('getRecommendations', () => {
        it('returns default recommendations when no events exist', () => {
            mockActivityLoggerInstance.getEvents.mockReturnValue([]);

            const recommendations = analyticsService.getRecommendations();

            expect(recommendations).toBeInstanceOf(Array);
            expect(recommendations.length).toBeGreaterThan(0);
            expect(recommendations[0]).toMatchObject({
                id: expect.any(String),
                type: expect.stringMatching(/^(widget|layout|theme|settings)$/),
                title: expect.any(String),
                description: expect.any(String),
                confidence: expect.any(Number),
                impact: expect.stringMatching(/^(high|medium|low)$/),
                reasoning: expect.any(String),
            });
        });

        it('recommends error monitoring for high error rate', () => {
            const now = new Date();
            const events = Array(20).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                botName: 'bot1',
                provider: 'discord',
                channelId: 'ch1',
                userId: 'user1',
                messageType: 'incoming',
                contentLength: 100,
                status: i % 5 === 0 ? 'error' : 'success', // 20% error rate
            }));

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const recommendations = analyticsService.getRecommendations();

            const errorRec = recommendations.find(r => r.id.includes('error'));
            expect(errorRec).toBeDefined();
            expect(errorRec?.impact).toBe('high');
        });

        it('recommends analytics for high message volume', () => {
            const now = new Date();
            const events = Array(150).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                botName: 'bot1',
                provider: 'discord',
                channelId: 'ch1',
                userId: 'user1',
                messageType: 'incoming',
                contentLength: 100,
                status: 'success',
            }));

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const recommendations = analyticsService.getRecommendations();

            const analyticsRec = recommendations.find(r => r.id.includes('analytics'));
            expect(analyticsRec).toBeDefined();
        });

        it('recommends performance optimization for slow responses', () => {
            const now = new Date();
            const events = Array(20).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                timestamp: new Date(now.getTime() - i * 60000).toISOString(),
                botName: 'bot1',
                provider: 'discord',
                channelId: 'ch1',
                userId: 'user1',
                messageType: 'incoming',
                contentLength: 100,
                status: 'success',
                processingTime: 3000, // Slow response
            }));

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const recommendations = analyticsService.getRecommendations();

            const perfRec = recommendations.find(r => r.id.includes('performance'));
            expect(perfRec).toBeDefined();
            expect(perfRec?.impact).toBe('high');
        });
    });

    describe('getTimeSeries', () => {
        it('returns empty array when no events exist', () => {
            mockActivityLoggerInstance.getEvents.mockReturnValue([]);

            const timeSeries = analyticsService.getTimeSeries();

            expect(timeSeries).toEqual([]);
        });

        it('aggregates events into hourly buckets', () => {
            const now = new Date();
            const events = Array(24).fill(null).map((_, i) => ({
                id: `msg-${i}`,
                timestamp: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(), // 1 hour apart
                botName: 'bot1',
                provider: 'discord',
                channelId: 'ch1',
                userId: 'user1',
                messageType: 'incoming',
                contentLength: 100,
                status: i % 10 === 0 ? 'error' : 'success',
                processingTime: 500 + i * 100,
            }));

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const timeSeries = analyticsService.getTimeSeries();

            expect(timeSeries.length).toBeGreaterThan(0);
            expect(timeSeries[0]).toMatchObject({
                timestamp: expect.any(String),
                count: expect.any(Number),
                errors: expect.any(Number),
                avgProcessingTime: expect.any(Number),
            });
        });

        it('sorts time series chronologically', () => {
            const now = new Date();
            const events = [
                {
                    id: 'msg-1',
                    timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'user1',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                },
                {
                    id: 'msg-2',
                    timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'user1',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                },
                {
                    id: 'msg-3',
                    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                    botName: 'bot1',
                    provider: 'discord',
                    channelId: 'ch1',
                    userId: 'user1',
                    messageType: 'incoming',
                    contentLength: 100,
                    status: 'success',
                },
            ];

            mockActivityLoggerInstance.getEvents.mockReturnValue(events);

            const timeSeries = analyticsService.getTimeSeries();

            // Verify chronological order
            for (let i = 1; i < timeSeries.length; i++) {
                const prevTime = new Date(timeSeries[i - 1].timestamp).getTime();
                const currTime = new Date(timeSeries[i].timestamp).getTime();
                expect(currTime).toBeGreaterThanOrEqual(prevTime);
            }
        });
    });

    describe('singleton pattern', () => {
        it('returns the same instance', () => {
            const instance1 = AnalyticsService.getInstance();
            const instance2 = AnalyticsService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });
});
