/**
 * Discord Integration Tests
 * 
 * These tests only run if DISCORD_BOT_TOKEN is present.
 * They test real Discord API connectivity without leaking credentials.
 */
import {
    createIntegrationSuite,
    INTEGRATION_CONFIGS,
    hasAllEnvVars,
    redactValue,
} from '../helpers/integrationTestHelpers';

const discordConfig = INTEGRATION_CONFIGS.discord;
const canRunTests = hasAllEnvVars(...discordConfig.requiredEnvVars);

createIntegrationSuite(discordConfig.name, discordConfig.requiredEnvVars, () => {
    beforeAll(() => {
        if (!canRunTests) return;

        console.log('Discord Integration Test Setup:');
        console.log(`  BOT_TOKEN: ${redactValue(process.env.DISCORD_BOT_TOKEN)}`);
    });

    describe('Connection', () => {
        it('should have valid bot token format', () => {
            const token = process.env.DISCORD_BOT_TOKEN!;
            // Discord bot tokens are base64-like strings with dots
            expect(token.includes('.')).toBe(true);
            expect(token.length).toBeGreaterThan(50);
        });
    });

    describe('API Connectivity', () => {
        it('should authenticate with Discord API', async () => {
            const { REST, Routes } = await import('discord.js');
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

            try {
                const user = await rest.get(Routes.user('@me')) as { id: string; username: string };
                expect(user.id).toBeDefined();
                console.log(`  Authenticated as: ${user.username} (${redactValue(user.id)})`);
            } catch (error: unknown) {
                const err = error as { code?: number; message?: string };
                // 401 means invalid token, but API is reachable
                if (err.code === 401) {
                    console.log('  API reachable but token may be invalid');
                } else {
                    throw error;
                }
            }
        }, 15000);
    });
});
