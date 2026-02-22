/**
 * Tests for DemoModeService
 */

import { DemoModeService } from '../../src/services/DemoModeService';

// Mock the BotConfigurationManager
jest.mock('../../src/config/BotConfigurationManager', () => ({
    BotConfigurationManager: {
        getInstance: jest.fn(() => ({
            getAllBots: jest.fn(() => []),
            getWarnings: jest.fn(() => ['No bot configuration found']),
            isLegacyMode: jest.fn(() => false),
        })),
    },
}));

// Mock UserConfigStore
jest.mock('../../src/config/UserConfigStore', () => ({
    UserConfigStore: {
        getInstance: jest.fn(() => ({
            getBotOverride: jest.fn(() => null),
            isBotDisabled: jest.fn(() => false),
        })),
    },
}));

describe('DemoModeService', () => {
    let demoService: DemoModeService;

    beforeEach(() => {
        // Reset singleton
        (DemoModeService as any).instance = null;
        demoService = DemoModeService.getInstance();
        // Clear environment
        delete process.env.DEMO_MODE;
        delete process.env.DISCORD_BOT_TOKEN;
        delete process.env.SLACK_BOT_TOKEN;
        delete process.env.OPENAI_API_KEY;
        delete process.env.FLOWISE_API_KEY;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should return a singleton instance', () => {
            const instance1 = DemoModeService.getInstance();
            const instance2 = DemoModeService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('detectDemoMode', () => {
        it('should return true when DEMO_MODE is set to true', () => {
            process.env.DEMO_MODE = 'true';
            expect(demoService.detectDemoMode()).toBe(true);
        });

        it('should return false when DEMO_MODE is set to false', () => {
            process.env.DEMO_MODE = 'false';
            expect(demoService.detectDemoMode()).toBe(false);
        });

        it('should return true when no credentials are configured', () => {
            // No env vars set, no bots configured
            expect(demoService.detectDemoMode()).toBe(true);
        });

        it('should return false when DISCORD_BOT_TOKEN is set', () => {
            process.env.DISCORD_BOT_TOKEN = 'valid-discord-bot-token-here';
            expect(demoService.detectDemoMode()).toBe(false);
        });

        it('should return false when OPENAI_API_KEY is set', () => {
            process.env.OPENAI_API_KEY = 'sk-valid-openai-api-key-here';
            expect(demoService.detectDemoMode()).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should create demo bots when in demo mode', () => {
            process.env.DEMO_MODE = 'true';
            demoService.initialize();

            const bots = demoService.getDemoBots();
            expect(bots.length).toBeGreaterThan(0);
            expect(bots[0].isDemo).toBe(true);
        });

        it('should not create demo bots when not in demo mode', () => {
            process.env.DEMO_MODE = 'false';
            demoService.initialize();

            const bots = demoService.getDemoBots();
            expect(bots.length).toBe(0);
        });
    });

    describe('isInDemoMode', () => {
        it('should return true after initialization in demo mode', () => {
            process.env.DEMO_MODE = 'true';
            demoService.initialize();
            expect(demoService.isInDemoMode()).toBe(true);
        });
    });

    describe('generateDemoResponse', () => {
        it('should return a response for greetings', () => {
            process.env.DEMO_MODE = 'true';
            demoService.initialize();

            const response = demoService.generateDemoResponse('Hello!', 'Demo Bot');
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should return a response for help requests', () => {
            process.env.DEMO_MODE = 'true';
            demoService.initialize();

            const response = demoService.generateDemoResponse('Help me!', 'Demo Bot');
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });

        it('should return a default response for unknown messages', () => {
            process.env.DEMO_MODE = 'true';
            demoService.initialize();

            const response = demoService.generateDemoResponse('Random message', 'Demo Bot');
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });
    });

    describe('conversation management', () => {
        it('should create a new conversation', () => {
            const conversation = demoService.getOrCreateConversation('channel-1', 'Demo Bot');
            expect(conversation.channelId).toBe('channel-1');
            expect(conversation.botName).toBe('Demo Bot');
            expect(conversation.messages).toEqual([]);
        });

        it('should add messages to conversation', () => {
            const message = demoService.addMessage(
                'channel-1',
                'Demo Bot',
                'Hello!',
                'incoming'
            );

            expect(message.content).toBe('Hello!');
            expect(message.type).toBe('incoming');
            expect(message.isDemo).toBe(true);
        });

        it('should return conversation history', () => {
            demoService.addMessage('channel-1', 'Demo Bot', 'Hello!', 'incoming');
            demoService.addMessage('channel-1', 'Demo Bot', 'Hi there!', 'outgoing');

            const history = demoService.getConversationHistory('channel-1', 'Demo Bot');
            expect(history.length).toBe(2);
        });
    });

    describe('reset', () => {
        it('should clear all conversations', () => {
            demoService.addMessage('channel-1', 'Demo Bot', 'Hello!', 'incoming');
            demoService.reset();

            const conversations = demoService.getAllConversations();
            expect(conversations.length).toBe(0);
        });
    });

    describe('getDemoStatus', () => {
        it('should return status information', () => {
            process.env.DEMO_MODE = 'true';
            demoService.initialize();

            const status = demoService.getDemoStatus();
            expect(status).toHaveProperty('isDemoMode');
            expect(status).toHaveProperty('botCount');
            expect(status).toHaveProperty('conversationCount');
            expect(status).toHaveProperty('messageCount');
        });
    });
});
