import request from 'supertest';
import express from 'express';
import healthRouter from '../../src/routes/health';

describe('Health Route', () => {
    const app = express();
    app.use('/', healthRouter);

    test('GET /health should return 200 and "OK"', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    test('POST /health should return 404 Not Found', async () => {
        const response = await request(app).post('/health');
        expect(response.status).toBe(404);
    });

    test('GET /unknown should return 404 Not Found', async () => {
        const response = await request(app).get('/unknown');
        expect(response.status).toBe(404);
    });
});