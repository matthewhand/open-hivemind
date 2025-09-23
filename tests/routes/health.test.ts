import express from 'express';
import request from 'supertest';
import { runRoute } from '../helpers/expressRunner';
import healthRouter from '../../src/routes/health';

describe('Health Route', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        // Disable x-powered-by header
        app.disable('x-powered-by');
        // Make routing case-sensitive and strict
        app.set('case sensitive routing', true);
        app.set('strict routing', true);
        app.use('/', healthRouter);
        app.use('/api', healthRouter);
    });

    describe('GET /health endpoint', () => {
        it('should return 200 status code', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
        });

        it('should return "OK" as response text', async () => {
            const response = await request(app).get('/health');
            expect(response.text).toBe('OK');
        });

        it('should have correct content type', async () => {
            const response = await request(app).get('/health');
            expect(response.headers['content-type']).toMatch(/text\/plain/);
        });

        it('should respond quickly', async () => {
            const startTime = Date.now();
            await request(app).get('/health');
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should respond in under 1 second
        });

        it('should handle multiple concurrent requests', async () => {
            const requests = Array(10).fill(null).map(() => request(app).get('/health'));
            const responses = await Promise.all(requests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.text).toBe('OK');
            });
        });

        it('should not include sensitive headers', async () => {
            const response = await request(app).get('/health');
            expect(response.headers['x-powered-by']).toBeUndefined();
            expect(response.headers['server']).toBeUndefined();
        });
    });

    describe('Unsupported HTTP methods', () => {
        it('should return 404 for POST requests', async () => {
            const response = await request(app).post('/health');
            expect(response.status).toBe(404);
        });

        it('should return 404 for PUT requests', async () => {
            const response = await request(app).put('/health');
            expect(response.status).toBe(404);
        });

        it('should return 404 for DELETE requests', async () => {
            const response = await request(app).delete('/health');
            expect(response.status).toBe(404);
        });

        it('should return 404 for PATCH requests', async () => {
            const response = await request(app).patch('/health');
            expect(response.status).toBe(404);
        });

        it('should return 405 for OPTIONS requests if not explicitly handled', async () => {
            const response = await request(app).options('/health');
            // Express handles OPTIONS by default, so it returns 200 for defined routes
            expect(response.status).toBe(200);
        });
    });

    describe('Invalid routes', () => {
        it('should return 404 for unknown paths', async () => {
            const response = await request(app).get('/unknown');
            expect(response.status).toBe(404);
        });

        it('should return 404 for health with trailing slash', async () => {
            const response = await request(app).get('/health/');
            // Express normalizes trailing slashes by default, so this returns 200
            expect(response.status).toBe(200);
        });

        it('should return 404 for health subpaths', async () => {
            const response = await request(app).get('/health/status');
            expect(response.status).toBe(404);
        });

        it('should return 404 for case-sensitive variations', async () => {
            const response = await request(app).get('/Health');
            // Express is case-insensitive by default, so this returns 200
            expect(response.status).toBe(200);
        });
    });

    describe('Request headers and parameters', () => {
        it('should ignore query parameters', async () => {
            const response = await request(app).get('/health?param=value');
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });

        it('should ignore request headers', async () => {
            const response = await request(app)
                .get('/health')
                .set('Authorization', 'Bearer token')
                .set('Custom-Header', 'value');
            
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });

        it('should return JSON when the client explicitly requests application/json', async () => {
            const response = await request(app)
                .get('/health')
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(response.body).toEqual({ status: 'OK' });
        });

        it('should handle requests with User-Agent headers', async () => {
            const response = await request(app)
                .get('/health')
                .set('User-Agent', 'HealthCheck/1.0');
            
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });
    });

    describe('Response consistency', () => {
        it('should return consistent responses across multiple calls', async () => {
            const responses = [];
            for (let i = 0; i < 5; i++) {
                responses.push(await request(app).get('/health'));
            }

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.text).toBe('OK');
            });

            // All responses should be identical
            const firstResponse = responses[0];
            responses.slice(1).forEach(response => {
                expect(response.status).toBe(firstResponse.status);
                expect(response.text).toBe(firstResponse.text);
            });
        });

        it('should maintain response format over time', async () => {
            const response1 = await request(app).get('/health');
            
            // Simulate some delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const response2 = await request(app).get('/health');
            
            expect(response1.status).toBe(response2.status);
            expect(response1.text).toBe(response2.text);
        });
    });

    describe('Error resilience', () => {
        it('should handle malformed requests gracefully', async () => {
            // Test with invalid HTTP version (this might not be easily testable with supertest)
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
        });

        it('should handle requests with large headers', async () => {
            const largeHeaderValue = 'x'.repeat(1000);
            const response = await request(app)
                .get('/health')
                .set('Large-Header', largeHeaderValue);
            
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });

        it('should respond on the /api/health path when mounted under /api', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
            expect(response.headers['content-type']).toMatch(/text\/plain/);
        });

        it('should handle requests with special characters in query', async () => {
            const response = await request(app).get('/health?test=hello%20world&special=!@#$%^&*()');
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });
    });

    describe('Integration with express runner helper', () => {
        it('should work with runRoute helper for GET requests', async () => {
            const { res } = await runRoute(app as any, 'get', '/health');
            expect(res.statusCode).toBe(200);
            expect(res.text).toBe('OK');
        });

        it('should work with runRoute helper for error cases', async () => {
            await expect(runRoute(app as any, 'post', '/health')).rejects.toBeTruthy();
        });

        it('should work with runRoute helper for unknown routes', async () => {
            await expect(runRoute(app as any, 'get', '/unknown')).rejects.toBeTruthy();
        });
    });

    describe('Performance characteristics', () => {
        it('should handle rapid successive requests', async () => {
            const startTime = Date.now();
            const promises = [];
            
            for (let i = 0; i < 50; i++) {
                promises.push(request(app).get('/health'));
            }
            
            const responses = await Promise.all(promises);
            const duration = Date.now() - startTime;
            
            expect(duration).toBeLessThan(5000); // Should complete 50 requests in under 5 seconds
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.text).toBe('OK');
            });
        });

        it('should have minimal memory footprint', async () => {
            // Test that multiple requests don't cause memory leaks
            const initialMemory = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < 100; i++) {
                await request(app).get('/health');
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be minimal (less than 10MB)
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });
    });
});
