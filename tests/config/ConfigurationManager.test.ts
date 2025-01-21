import { ConfigurationManager } from '../../src/config/ConfigurationManager';

describe('ConfigurationManager', () => {
    test('should implement singleton pattern', () => {
        const instance1 = ConfigurationManager.getInstance();
        const instance2 = ConfigurationManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    test('should set and get session correctly', () => {
        const configManager = ConfigurationManager.getInstance();
        const integration = 'flowise';
        const channelId = 'channel-123';
        const sessionId = 'session-456';

        configManager.setSession(integration, channelId, sessionId);
        const retrievedSession = configManager.getSession(integration, channelId);
        expect(retrievedSession).toBe(`${integration}-${channelId}-${sessionId}`);
    });


    test('should return null for non-existing configuration', () => {
        const configManager = ConfigurationManager.getInstance();
        const config = configManager.getConfig('nonExistingConfig');
        expect(config).toBeNull();
    });
});