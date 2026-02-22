import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import authRouter from '../../src/server/routes/auth';
import { AuthManager } from '../../src/auth/AuthManager';

describe('Auth Security Fix Verification', () => {
    let app: express.Express;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };

        // Reset AuthManager instance to ensure fresh state
        (AuthManager as any).instance = null;

        app = express();
        app.use(bodyParser.json());

        // Mock req.ip to be localhost
        app.use((req, res, next) => {
            Object.defineProperty(req, 'ip', { value: '127.0.0.1' });
            next();
        });

        app.use('/auth', authRouter);

        // Setup clean environment for tests
        delete process.env.ADMIN_PASSWORD;
        delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        jest.restoreAllMocks();
        process.env = originalEnv;
    });

    it('should NOT allow login with invalid password even on localhost', async () => {
         const response = await request(app)
            .post('/auth/login')
            .send({
                username: 'admin',
                password: 'wrong-password-definitely'
            });

         expect(response.status).toBe(401);
         expect(response.body.bypassInfo).toBeUndefined(); // Ensure bypass info is gone
    });

    it('should allow login with valid default password', async () => {
         // In test environment, valid passwords include 'admin123!' and others defined in AuthManager
         const response = await request(app)
            .post('/auth/login')
            .send({
                username: 'admin',
                password: 'admin123!'
            });

         expect(response.status).toBe(200);
         expect(response.body.success).toBe(true);
    });
});
