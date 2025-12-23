/**
 * Slack Integration Tests
 * 
 * These tests only run if SLACK_BOT_TOKEN and SLACK_APP_TOKEN are present.
 * They test real Slack API connectivity without leaking credentials.
 */
import {
    createIntegrationSuite,
    INTEGRATION_CONFIGS,
    hasAllEnvVars,
    redactValue,
} from '../helpers/integrationTestHelpers';

// Only import Slack modules if we're going to run tests
const slackConfig = INTEGRATION_CONFIGS.slack;
const canRunTests = hasAllEnvVars(...slackConfig.requiredEnvVars);

createIntegrationSuite(slackConfig.name, slackConfig.requiredEnvVars, () => {
    // Lazy import to avoid loading Slack SDK if tests are skipped
    let SlackService: typeof import('@integrations/slack/SlackService').SlackService;

    beforeAll(async () => {
        if (!canRunTests) return;

        // Dynamic import to avoid loading if skipped
        const slackModule = await import('@integrations/slack/SlackService');
        SlackService = slackModule.SlackService;

        // Log redacted credentials for debugging (safe - only shows partial)
        console.log('Slack Integration Test Setup:');
        console.log(`  BOT_TOKEN: ${redactValue(process.env.SLACK_BOT_TOKEN)}`);
        console.log(`  APP_TOKEN: ${redactValue(process.env.SLACK_APP_TOKEN)}`);
    });

    describe('Connection', () => {
        it('should have valid bot token format', () => {
            const token = process.env.SLACK_BOT_TOKEN!;
            // Slack bot tokens start with 'xoxb-'
            expect(token.startsWith('xoxb-')).toBe(true);
        });

        it('should have valid app token format', () => {
            const token = process.env.SLACK_APP_TOKEN!;
            // Slack app tokens start with 'xapp-'
            expect(token.startsWith('xapp-')).toBe(true);
        });
    });

    describe('API Connectivity', () => {
        it('should authenticate with Slack API', async () => {
            // This test verifies the token is valid by making a simple API call
            const { WebClient } = await import('@slack/web-api');
            const client = new WebClient(process.env.SLACK_BOT_TOKEN);

            // auth.test is a simple endpoint that validates the token
            const result = await client.auth.test();

            expect(result.ok).toBe(true);
            expect(result.user_id).toBeDefined();
            console.log(`  Authenticated as: ${result.user} (${redactValue(result.user_id as string)})`);
        }, 10000);

        it('should list available channels', async () => {
            const { WebClient } = await import('@slack/web-api');
            const client = new WebClient(process.env.SLACK_BOT_TOKEN);

            const result = await client.conversations.list({
                types: 'public_channel',
                limit: 5,
            });

            expect(result.ok).toBe(true);
            expect(Array.isArray(result.channels)).toBe(true);
            console.log(`  Found ${result.channels?.length || 0} channels`);
        }, 10000);
    });
});
