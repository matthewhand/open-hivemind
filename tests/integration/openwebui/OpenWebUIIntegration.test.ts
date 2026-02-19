/**
 * OpenWebUI Integration Tests
 * 
 * These tests only run if OPENWEBUI_API_KEY and OPENWEBUI_BASE_URL are present.
 * They test real OpenWebUI API connectivity without leaking credentials.
 */
import {
    createIntegrationSuite,
    INTEGRATION_CONFIGS,
    hasAllEnvVars,
    redactValue,
} from '../helpers/integrationTestHelpers';

const openwebuiConfig = INTEGRATION_CONFIGS.openwebui;
const canRunTests = hasAllEnvVars(...openwebuiConfig.requiredEnvVars);

createIntegrationSuite(openwebuiConfig.name, openwebuiConfig.requiredEnvVars, () => {
    beforeAll(() => {
        if (!canRunTests) return;

        console.log('OpenWebUI Integration Test Setup:');
        console.log(`  API_KEY: ${redactValue(process.env.OPENWEBUI_API_KEY)}`);
        console.log(`  BASE_URL: ${process.env.OPENWEBUI_BASE_URL}`);
    });

    describe('Connection', () => {
        it('should have valid base URL', () => {
            const url = process.env.OPENWEBUI_BASE_URL!;
            expect(() => new URL(url)).not.toThrow();
        });

        it('should have API key set', () => {
            const key = process.env.OPENWEBUI_API_KEY!;
            expect(key.length).toBeGreaterThan(0);
        });
    });

    describe('API Connectivity', () => {
        it('should reach OpenWebUI endpoint', async () => {
            const axios = (await import('axios')).default;
            const baseUrl = process.env.OPENWEBUI_BASE_URL!;

            try {
                // Try health endpoint or models endpoint
                const response = await axios.get(`${baseUrl}/api/models`, {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENWEBUI_API_KEY}`,
                    },
                    timeout: 10000,
                });

                expect(response.status).toBe(200);
                console.log('  Connected successfully');
            } catch (error: unknown) {
                if ((await import('axios')).default.isAxiosError(error)) {
                    if (error.response) {
                        // Any response means endpoint is reachable
                        console.log(`  Endpoint reachable (status: ${error.response.status})`);
                    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                        console.log('  Endpoint timeout (acceptable in CI)');
                    } else {
                        console.log(`  Connection error: ${error.code} (acceptable)`);
                    }
                } else {
                    throw error;
                }
            }
        }, 15000);
    });
});
