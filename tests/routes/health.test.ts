import express from 'express';
import { runRoute } from '../helpers/expressRunner';
import healthRouter from '../../src/routes/health';

describe('Health Route', () => {
    const app = express();
    app.use('/', healthRouter);

    test('GET /health should return 200 and "OK"', async () => {
        const { res } = await runRoute(app as any, 'get', '/health');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('OK');
    });

    test('POST /health should return 404 Not Found', async () => {
        await expect(runRoute(app as any, 'post', '/health')).rejects.toBeTruthy();
    });

    test('GET /unknown should return 404 Not Found', async () => {
        await expect(runRoute(app as any, 'get', '/unknown')).rejects.toBeTruthy();
    });
});
