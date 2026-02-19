/**
 * OpenAI Integration Tests
 * 
 * These tests only run if OPENAI_API_KEY is present.
 * They test real OpenAI API connectivity without leaking credentials.
 */
import {
    createIntegrationSuite,
    INTEGRATION_CONFIGS,
    hasAllEnvVars,
    redactValue,
} from '../helpers/integrationTestHelpers';

const openaiConfig = INTEGRATION_CONFIGS.openai;
const canRunTests = hasAllEnvVars(...openaiConfig.requiredEnvVars);

createIntegrationSuite(openaiConfig.name, openaiConfig.requiredEnvVars, () => {
    beforeAll(() => {
        if (!canRunTests) return;

        console.log('OpenAI Integration Test Setup:');
        console.log(`  API_KEY: ${redactValue(process.env.OPENAI_API_KEY)}`);
        console.log(`  MODEL: ${process.env.OPENAI_MODEL || 'default'}`);
    });

    describe('Connection', () => {
        it('should have valid API key format', () => {
            const key = process.env.OPENAI_API_KEY!;
            // OpenAI keys typically start with 'sk-'
            expect(key.startsWith('sk-')).toBe(true);
        });
    });

    describe('API Connectivity', () => {
        it('should list available models', async () => {
            const { OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const models = await client.models.list();

            expect(models.data).toBeDefined();
            expect(Array.isArray(models.data)).toBe(true);
            console.log(`  Found ${models.data.length} models`);
        }, 15000);

        it('should generate a simple completion', async () => {
            const { OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const response = await client.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Say "test passed" and nothing else.' }],
                max_tokens: 10,
            });

            expect(response.choices).toBeDefined();
            expect(response.choices.length).toBeGreaterThan(0);
            expect(response.choices[0].message.content).toBeDefined();
            console.log(`  Response: ${response.choices[0].message.content}`);
        }, 30000);
    });
});
