import express from 'express';
import request from 'supertest';
import * as PluginLoader from '../../../../src/plugins/PluginLoader';
import * as PluginManager from '../../../../src/plugins/PluginManager';
import pluginSecurityRouter from '../../../../src/server/routes/pluginSecurity';

// Mock the modules
jest.mock('../../../../src/plugins/PluginManager');
jest.mock('../../../../src/plugins/PluginLoader');

describe('Plugin Security Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin/plugins', pluginSecurityRouter);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/admin/plugins/security', () => {
    it('should return plugin security status', async () => {
      const mockPlugins = [
        {
          pluginName: 'test-plugin-1',
          trustLevel: 'trusted' as const,
          isBuiltIn: false,
          signatureValid: true,
          grantedCapabilities: ['network', 'filesystem'],
          deniedCapabilities: [],
          requiredCapabilities: ['network', 'filesystem'],
        },
        {
          pluginName: 'test-plugin-2',
          trustLevel: 'untrusted' as const,
          isBuiltIn: false,
          signatureValid: false,
          grantedCapabilities: [],
          deniedCapabilities: ['database'],
          requiredCapabilities: ['database'],
        },
      ];

      (PluginManager.getPluginSecurityStatus as jest.Mock).mockReturnValue(mockPlugins);

      const response = await request(app).get('/api/admin/plugins/security');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plugins).toEqual(mockPlugins);
      expect(PluginManager.getPluginSecurityStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching plugin security status', async () => {
      (PluginManager.getPluginSecurityStatus as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/admin/plugins/security');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve plugin security status');
      expect(response.body.message).toContain('Database error');
    });
  });

  describe('POST /api/admin/plugins/:name/verify', () => {
    it('should verify a plugin successfully', async () => {
      const mockManifest = {
        displayName: 'Test Plugin',
        description: 'A test plugin',
        type: 'tool',
        signature: 'valid-signature',
        requiredCapabilities: ['network'],
      };

      const mockMod = { manifest: mockManifest };
      const mockPolicy = {
        verifyAndSetTrust: jest.fn().mockReturnValue('trusted'),
        getPluginSecurityStatus: jest.fn().mockReturnValue({
          pluginName: 'test-plugin',
          trustLevel: 'trusted',
          isBuiltIn: false,
          signatureValid: true,
          grantedCapabilities: ['network'],
          deniedCapabilities: [],
          requiredCapabilities: ['network'],
        }),
      };

      (PluginLoader.loadPlugin as jest.Mock).mockReturnValue(mockMod);
      (PluginManager.getSecurityPolicy as jest.Mock).mockReturnValue(mockPolicy);

      const response = await request(app).post('/api/admin/plugins/test-plugin/verify');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trustLevel).toBe('trusted');
      expect(mockPolicy.verifyAndSetTrust).toHaveBeenCalledWith('test-plugin', mockManifest);
    });

    it('should return 404 when plugin has no manifest', async () => {
      const mockMod = { manifest: null };
      (PluginLoader.loadPlugin as jest.Mock).mockReturnValue(mockMod);

      const response = await request(app).post('/api/admin/plugins/missing-plugin/verify');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Plugin not found');
    });

    it('should handle verification errors', async () => {
      (PluginLoader.loadPlugin as jest.Mock).mockImplementation(() => {
        throw new Error('Plugin not found on disk');
      });

      const response = await request(app).post('/api/admin/plugins/broken-plugin/verify');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to verify plugin');
    });
  });

  describe('POST /api/admin/plugins/:name/trust', () => {
    it('should grant trust and capabilities to a plugin', async () => {
      const mockPolicy = {
        getPluginSecurityStatus: jest
          .fn()
          .mockReturnValueOnce({
            pluginName: 'test-plugin',
            trustLevel: 'untrusted',
            isBuiltIn: false,
            signatureValid: true,
            grantedCapabilities: [],
            deniedCapabilities: ['network', 'database'],
            requiredCapabilities: ['network', 'database'],
          })
          .mockReturnValueOnce({
            pluginName: 'test-plugin',
            trustLevel: 'trusted',
            isBuiltIn: false,
            signatureValid: true,
            grantedCapabilities: ['network', 'database'],
            deniedCapabilities: [],
            requiredCapabilities: ['network', 'database'],
          }),
        grantCapability: jest.fn(),
      };

      (PluginManager.getSecurityPolicy as jest.Mock).mockReturnValue(mockPolicy);

      const response = await request(app)
        .post('/api/admin/plugins/test-plugin/trust')
        .send({ trust: true, capabilities: ['network', 'database'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPolicy.grantCapability).toHaveBeenCalledWith('test-plugin', 'network');
      expect(mockPolicy.grantCapability).toHaveBeenCalledWith('test-plugin', 'database');
    });

    it('should revoke trust and capabilities from a plugin', async () => {
      const mockPolicy = {
        getPluginSecurityStatus: jest
          .fn()
          .mockReturnValueOnce({
            pluginName: 'test-plugin',
            trustLevel: 'trusted',
            isBuiltIn: false,
            signatureValid: true,
            grantedCapabilities: ['network', 'database'],
            deniedCapabilities: [],
            requiredCapabilities: ['network', 'database'],
          })
          .mockReturnValueOnce({
            pluginName: 'test-plugin',
            trustLevel: 'untrusted',
            isBuiltIn: false,
            signatureValid: true,
            grantedCapabilities: [],
            deniedCapabilities: ['network', 'database'],
            requiredCapabilities: ['network', 'database'],
          }),
        revokeCapability: jest.fn(),
      };

      (PluginManager.getSecurityPolicy as jest.Mock).mockReturnValue(mockPolicy);

      const response = await request(app)
        .post('/api/admin/plugins/test-plugin/trust')
        .send({ trust: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPolicy.revokeCapability).toHaveBeenCalledWith('test-plugin', 'network');
      expect(mockPolicy.revokeCapability).toHaveBeenCalledWith('test-plugin', 'database');
    });

    it('should return 404 when plugin not found', async () => {
      const mockPolicy = {
        getPluginSecurityStatus: jest.fn().mockReturnValue(null),
      };

      (PluginManager.getSecurityPolicy as jest.Mock).mockReturnValue(mockPolicy);

      const response = await request(app)
        .post('/api/admin/plugins/nonexistent/trust')
        .send({ trust: true });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Plugin not found');
    });

    it('should handle errors during trust update', async () => {
      const mockPolicy = {
        getPluginSecurityStatus: jest.fn().mockReturnValue({
          pluginName: 'test-plugin',
          trustLevel: 'untrusted',
          isBuiltIn: false,
          signatureValid: true,
          grantedCapabilities: [],
          deniedCapabilities: [],
          requiredCapabilities: [],
        }),
        grantCapability: jest.fn().mockImplementation(() => {
          throw new Error('Invalid capability');
        }),
      };

      (PluginManager.getSecurityPolicy as jest.Mock).mockReturnValue(mockPolicy);

      const response = await request(app)
        .post('/api/admin/plugins/test-plugin/trust')
        .send({ trust: true, capabilities: ['invalid-cap'] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update plugin trust');
    });
  });
});
