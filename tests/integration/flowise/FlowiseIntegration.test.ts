/**
 * Flowise Integration Tests
 * 
 * These tests only run if FLOWISE_API_KEY and FLOWISE_API_ENDPOINT are present.
 * They test real Flowise API connectivity without leaking credentials.
 */
import {
    createIntegrationSuite,
    INTEGRATION_CONFIGS,
    hasAllEnvVars,
    redactValue,
} from '../helpers/integrationTestHelpers';

const flowiseConfig = INTEGRATION_CONFIGS.flowise;
const canRunTests = hasAllEnvVars(...flowiseConfig.requiredEnvVars);

createIntegrationSuite(flowiseConfig.name, flowiseConfig.requiredEnvVars, () => {
    beforeAll(() => {
        if (!canRunTests) return;

        console.log('Flowise Integration Test Setup:');
        console.log(`  API_KEY: ${redactValue(process.env.FLOWISE_API_KEY)}`);
        console.log(`  ENDPOINT: ${process.env.FLOWISE_API_ENDPOINT}`);
    });

    describe('Connection', () => {
        it('should have valid endpoint URL', () => {
            const endpoint = process.env.FLOWISE_API_ENDPOINT!;
            expect(() => new URL(endpoint)).not.toThrow();
        });

        it('should have API key set', () => {
            const key = process.env.FLOWISE_API_KEY!;
            expect(key.length).toBeGreaterThan(0);
        });
    });

    describe('API Connectivity', () => {
        it('should reach Flowise endpoint', async () => {
            const axios = (await import('axios')).default;
            const endpoint = process.env.FLOWISE_API_ENDPOINT!;

            // Try to reach the API (may return 401 if auth required, but should not timeout)
            try {
                const response = await axios.get(`${endpoint}/api/v1/chatflows`, {
                    headers: { Authorization: `Bearer ${process.env.FLOWISE_API_KEY}` },
                    timeout: 10000,
                });

                expect(response.status).toBe(200);
                console.log(`  Connected successfully`);
            } catch (error: unknown) {
                // 401/403 means auth issue but endpoint is reachable
                if (axios.isAxiosError(error) && error.response) {
                    expect([200, 401, 403]).toContain(error.response.status);
                    console.log(`  Endpoint reachable (status: ${error.response.status})`);
                } else {
                    throw error;
                }
            }
        }, 15000);
    });
});
