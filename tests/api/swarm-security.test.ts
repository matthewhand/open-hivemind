import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import swarmRouter from '../../src/admin/swarmRoutes';
import { AuthManager } from '../../src/auth/AuthManager';
import { SwarmInstaller } from '../../src/integrations/openswarm/SwarmInstaller';
import { providerRegistry } from '../../src/registries/ProviderRegistry';
import { authenticateToken } from '../../src/server/middleware/auth';

// Mock AuthManager
jest.mock('../../src/auth/AuthManager');

// Mock SwarmInstaller
jest.mock('../../src/integrations/openswarm/SwarmInstaller', () => {
  return {
    SwarmInstaller: jest.fn().mockImplementation(() => ({
      id: 'openswarm',
      checkPrerequisites: jest.fn().mockResolvedValue(true),
      checkInstalled: jest.fn().mockResolvedValue(true),
      getWebUIUrl: jest.fn().mockReturnValue('http://localhost:8000'),
      install: jest.fn().mockResolvedValue({ success: true, message: 'Installed' }),
      start: jest.fn().mockResolvedValue({ success: true, message: 'Started' }),
    })),
  };
});

describe('Swarm API Security', () => {
  let app: express.Application;
  let mockAuthManager: any;

  // SCENARIO: Secure Configuration (Verification)
  describe('Secure Configuration (Middleware + Router)', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup mock AuthManager
      mockAuthManager = {
        verifyAccessToken: jest.fn(),
      };
      (AuthManager.getInstance as jest.Mock).mockReturnValue(mockAuthManager);

      // Register the mock installer
      providerRegistry.registerInstaller(new SwarmInstaller());

      app = express();
      app.use(express.json());
      // Secure mounting: With middleware (as it SHOULD be in src/index.ts)
      app.use('/api/swarm', authenticateToken, swarmRouter);
    });

    it('denies access to /api/swarm/check without authentication', async () => {
      const response = await request(app).get('/api/swarm/check');
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Access token required' });
    });

    it('denies access with invalid token', async () => {
      mockAuthManager.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/swarm/check')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Invalid or expired token' });
    });

    it('allows access with valid token', async () => {
      mockAuthManager.verifyAccessToken.mockReturnValue({ userId: 'test-user', role: 'admin' });

      const response = await request(app)
        .get('/api/swarm/check')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
    });
  });

  // SCENARIO: Source Code Verification
  describe('Source Code Verification', () => {
    it('src/index.ts should have authentication on /api/swarm', () => {
      const indexPath = path.join(__dirname, '../../src/index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Check for the secure line
      const hasSecureLine = content.includes(
        "app.use('/api/swarm', authenticateToken, swarmRouter);"
      );

      // Check for the vulnerable line (should be gone or commented out, but we check for replacement)
      // Actually, we just want to ensure the secure line exists.
      expect(hasSecureLine).toBe(true);
    });
  });
});
