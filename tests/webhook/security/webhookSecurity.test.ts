import { NextFunction, Request, Response } from 'express';
import { verifyIpWhitelist, verifyWebhookToken } from '@webhook/security/webhookSecurity';

// Mock webhook config
jest.mock('@config/webhookConfig', () => ({
  get: jest.fn(),
}));

const mockWebhookConfig = require('@config/webhookConfig');

describe('WebhookSecurity', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  describe('verifyWebhookToken', () => {
    it('should call next when token matches', () => {
      mockWebhookConfig.get.mockReturnValue('valid-token');
      req.headers = { 'x-webhook-token': 'valid-token' };

      verifyWebhookToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when token is missing', () => {
      mockWebhookConfig.get.mockReturnValue('valid-token');
      req.headers = {};

      verifyWebhookToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Invalid token');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when token is invalid', () => {
      mockWebhookConfig.get.mockReturnValue('valid-token');
      req.headers = { 'x-webhook-token': 'invalid-token' };

      verifyWebhookToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Invalid token');
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw error when WEBHOOK_TOKEN is not configured', () => {
      mockWebhookConfig.get.mockReturnValue('');
      req.headers = { 'x-webhook-token': 'any-token' };

      expect(() => {
        verifyWebhookToken(req as Request, res as Response, next);
      }).toThrow('WEBHOOK_TOKEN is not configured');
    });

    it('should handle case-insensitive header names', () => {
      mockWebhookConfig.get.mockReturnValue('valid-token');
      req.headers = { 'X-Webhook-Token': 'valid-token' };

      verifyWebhookToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyIpWhitelist', () => {
    it('should call next when IP whitelist is empty', () => {
      mockWebhookConfig.get.mockReturnValue('');
      req.ip = '192.168.1.100';

      verifyIpWhitelist(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next when IP is in whitelist', () => {
      mockWebhookConfig.get.mockReturnValue('127.0.0.1,192.168.1.100');
      req.ip = '127.0.0.1';

      verifyIpWhitelist(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when IP is not in whitelist', () => {
      mockWebhookConfig.get.mockReturnValue('192.168.1.100,10.0.0.1');
      req.ip = '127.0.0.1';

      verifyIpWhitelist(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Unauthorized IP address');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle IPv6 addresses', () => {
      mockWebhookConfig.get.mockReturnValue('::1,::ffff:127.0.0.1');
      req.ip = '::1';

      verifyIpWhitelist(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle whitespace in IP list', () => {
      mockWebhookConfig.get.mockReturnValue(' 127.0.0.1 , 192.168.1.100 ');
      req.ip = '127.0.0.1';

      verifyIpWhitelist(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle single IP in whitelist', () => {
      mockWebhookConfig.get.mockReturnValue('127.0.0.1');
      req.ip = '127.0.0.1';

      verifyIpWhitelist(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle both middlewares in sequence', () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'valid-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
        return '';
      });

      req.headers = { 'x-webhook-token': 'valid-token' };
      req.ip = '127.0.0.1';

      verifyWebhookToken(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      verifyIpWhitelist(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should block when token is valid but IP is not whitelisted', () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'valid-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '192.168.1.100';
        return '';
      });

      req.headers = { 'x-webhook-token': 'valid-token' };
      req.ip = '127.0.0.1';

      verifyWebhookToken(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      verifyIpWhitelist(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Unauthorized IP address');
    });
  });
});
